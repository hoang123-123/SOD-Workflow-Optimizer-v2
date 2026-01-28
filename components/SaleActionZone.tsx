
import React, { useState } from 'react';
import { SOD, INDUSTRY_FACTORY } from '../types';
import { SectionHeader } from './Typography';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
import { UserCircle2, Check, Ban, Forward, FileCheck, Loader2, Truck, Clock, XCircle, Zap } from 'lucide-react';

interface SaleActionZoneProps {
    sod: SOD;
    canAct: boolean;
    recordId: string;
    onAction: (updatedSOD: SOD) => Promise<void>;
    renderBadge: () => React.ReactNode;
    customerIndustryType?: number; // [NEW] Để xác định logic Factory
    isDue: boolean; // [NEW] Kiểm tra đơn đã đến hạn chưa
    isSufficient: boolean; // [NEW] Kiểm tra trạng thái đủ hàng
}

export const SaleActionZone: React.FC<SaleActionZoneProps> = ({ sod, canAct, recordId, onAction, renderBadge, customerIndustryType, isDue, isSufficient }) => {
    // [UPDATED] Thêm SHIP_AND_CLOSE vào type
    const [saleOption, setSaleOption] = useState<'SHIP_PARTIAL' | 'SHIP_AND_CLOSE' | 'WAIT_ALL' | 'CANCEL_ORDER' | 'SALE_URGENT' | null>(
        sod.saleDecision?.action || (sod.urgentRequest?.status === 'PENDING' ? 'SALE_URGENT' : null)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- LOGIC TÍNH TOÁN UI ---
    const rs = sod.qtyOrdered - sod.qtyDelivered;

    // Auto ship quantity Logic
    const autoShipQty = sod.warehouseVerification
        ? sod.warehouseVerification.requestedQty
        : (sod.qtyAvailable || 0);

    const warehousePhysicalQty = sod.warehouseVerification
        ? sod.warehouseVerification.actualQty
        : (sod.qtyAvailable || 0);

    const deliveryCount = sod.deliveryCount || 0;
    const currentK = deliveryCount + 1;
    const isPhase1 = currentK === 1; // True = Case A, False = Case B

    // Determine Rule Group based on Phase (K)
    const rulePrefix = isPhase1 ? 'A' : 'B';

    const unitOrder = sod.unitOrderName || 'SP';
    const unitWarehouse = sod.unitWarehouseName || 'SP';

    // [NEW] Kiểm tra xem khách hàng có phải là Nhà máy (Factory) không
    const isFactory = customerIndustryType === INDUSTRY_FACTORY;

    // [RULE CHANGE] Các option chọn (Ship/Wait/Cancel) CHỈ xuất hiện nếu:
    // - Đơn ĐÃ ĐẾN HẠN (isDue)
    // - VÀ ĐANG THIẾU (!isSufficient)
    const showOptionShip = isDue && !isSufficient && autoShipQty > 0;
    const showOptionWait = isDue && !isSufficient && sod.isNotificationSent === true;
    const showOptionCancel = isDue && !isSufficient; // [FIX] Cả Factory và không Factory đều có option Hủy

    const renderDecisionText = (action: 'SHIP_PARTIAL' | 'SHIP_AND_CLOSE' | 'WAIT_ALL' | 'CANCEL_ORDER') => {
        if (action === 'SHIP_PARTIAL') {
            // Factory: Chỉ giao, không chốt
            return `Đã xác nhận giao ${sod.saleDecision?.quantity || autoShipQty} ${unitOrder} (Đợt ${currentK})`;
        }
        if (action === 'SHIP_AND_CLOSE') {
            // Non-Factory: Giao & Chốt
            return `Đã xác nhận giao ${sod.saleDecision?.quantity || autoShipQty} ${unitOrder} & Chốt dòng`;
        }
        if (action === 'CANCEL_ORDER') return `Đã Chốt đơn (Dừng giao)`;
        return `Đã chuyển trạng thái Chờ hàng`;
    }

    // --- HELPER: NỘI DUNG HIỂN THỊ THEO CASE ---
    const getOptionContent = () => {
        const qtyToShip = autoShipQty;
        const qtyShortage = Math.max(0, rs - autoShipQty);

        // [FACTORY LOGIC] Nhà máy: Cho phép giao nhiều lần, không bắt buộc chốt
        if (isFactory) {
            return {
                SHIP: {
                    title: `Giao ${qtyToShip} ${unitOrder} (Đợt ${currentK})`,
                    desc: qtyShortage > 0
                        ? `Giao số lượng có sẵn. Còn lại ${qtyShortage} ${unitOrder} sẽ giao sau khi có hàng.`
                        : `Giao toàn bộ ${qtyToShip} ${unitOrder} và hoàn tất dòng hàng.`
                },
                WAIT: {
                    title: "Chờ bổ sung hàng",
                    desc: `Kho báo thiếu ${qtyShortage} ${unitOrder}. Tiếp tục treo đơn để chờ hàng bổ sung.`
                },
                CANCEL: {
                    title: "Hủy dòng hàng này",
                    desc: "" // Factory không có option này
                }
            };
        }

        // [STANDARD LOGIC] Các ngành khác: Giao & Chốt hoặc Hủy hoàn toàn
        return {
            SHIP: {
                title: `Giao ${qtyToShip} ${unitOrder} & CHỐT DÒNG`,
                desc: qtyShortage > 0
                    ? `Giao số lượng có sẵn. Hệ thống sẽ chốt đơn và HỦY phần thiếu ${qtyShortage} ${unitOrder}.`
                    : `Giao toàn bộ số lượng yêu cầu và chốt dòng hàng.`
            },
            WAIT: {
                title: "Chờ bổ sung hàng",
                desc: `Kho báo thiếu ${qtyShortage} ${unitOrder}. Tiếp tục treo đơn để chờ hàng bổ sung từ Source.`
            },
            CANCEL: {
                title: "Hủy dòng hàng này",
                desc: "Không giao dở dang. Hủy bỏ toàn bộ dòng hàng này khỏi đơn hàng."
            }
        };
    };

    const content = getOptionContent();

    const handleSaleSubmit = async () => {
        if (!saleOption) return;
        setIsSubmitting(true);
        try {
            // --- XÁC ĐỊNH RULE ID TỪ LỰA CHỌN CỦA USER ---
            let ruleId = '';
            let params = {};

            if (saleOption === 'SHIP_PARTIAL') {
                ruleId = `${rulePrefix}1`; // A1 hoặc B1
                params = { quantity: autoShipQty, isFactory: isFactory }; // [NEW] Truyền isFactory
            } else if (saleOption === 'WAIT_ALL') {
                ruleId = `${rulePrefix}2`; // A2 hoặc B2
            } else if (saleOption === 'CANCEL_ORDER') {
                ruleId = `${rulePrefix}3`; // A3 hoặc B3
                params = { quantity: rs }; // Hủy phần còn lại
            } else if (saleOption === 'SALE_URGENT') {
                ruleId = 'SALE_URGENT';
            }

            // --- GỌI BRAIN ĐỂ THỰC THI ---
            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, params);

            await onAction(updatedSOD);

        } catch (error) {
            console.error("Sale Submit Error:", error);
            alert("Có lỗi xảy ra khi xử lý quy tắc.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`relative rounded-2xl p-6 border-2 transition-all flex flex-col ${canAct ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-100/50 mt-4' : 'bg-gray-50 border-gray-200 mt-2'}`}>
            {/* NHÃN TRÊN VIỀN (FLOATING LABEL) */}
            {canAct && (
                <div className="absolute -top-3.5 left-6 bg-white px-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">PHƯƠNG ÁN XỬ LÝ</span>
                    <div className="ml-2">{renderBadge()}</div>
                </div>
            )}

            {!canAct && (
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        QUYẾT ĐỊNH ĐÃ CHỐT
                    </span>
                    {renderBadge()}
                </div>
            )}

            {/* Warehouse Verification Context */}
            {sod.isNotificationSent && (
                <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-sm">
                    <FileCheck className="w-5 h-5 text-indigo-600 mt-1 shrink-0" />
                    <div className="text-gray-700 w-full">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs uppercase tracking-widest text-indigo-600">Request từ Kho:</span>
                            {sod.warehouseVerification?.createdByDept && (
                                <span className="text-[10px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                    <UserCircle2 className="w-3 h-3" /> {sod.warehouseVerification.createdByDept}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <span className="text-gray-500 block mb-1 uppercase text-[9px] font-bold tracking-tighter">Thực tế tại Kho</span>
                                <strong className="text-xl font-black text-gray-800">{warehousePhysicalQty}</strong> <span className="text-[10px] text-gray-500 uppercase">{unitOrder}</span>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                                <span className="text-indigo-600 block mb-1 uppercase text-[9px] font-bold tracking-tighter">Khả năng đáp ứng</span>
                                <strong className="text-xl font-black text-indigo-700">{autoShipQty}</strong> <span className="text-[10px] text-indigo-600 uppercase">{unitOrder}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* READ ONLY VIEW */}
            {!canAct && sod.saleDecision && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${sod.saleDecision.action === 'SHIP_PARTIAL' ? 'bg-indigo-100 text-indigo-600' : (sod.saleDecision.action === 'CANCEL_ORDER' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600')}`}>
                            {sod.saleDecision.action === 'SHIP_PARTIAL' ? <Check className="w-4 h-4" /> : (sod.saleDecision.action === 'CANCEL_ORDER' ? <Ban className="w-4 h-4" /> : <Forward className="w-4 h-4" />)}
                        </div>
                        <span className="font-bold text-gray-900 uppercase tracking-tight">
                            {renderDecisionText(sod.saleDecision.action)}
                        </span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 pl-12 uppercase tracking-widest">
                        {new Date(sod.saleDecision.timestamp).toLocaleString()}
                    </div>
                </div>
            )}

            {/* ACTION VIEW */}
            {canAct && (
                <div className="flex flex-col flex-1">


                    <div className="space-y-3 mb-5">
                        {/* Option SHIP */}
                        {showOptionShip && (
                            <div
                                onClick={() => setSaleOption('SHIP_PARTIAL')}
                                className={`relative flex flex-col p-5 rounded-xl transition-all duration-300 group border-2 ${(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE')
                                    ? 'border-indigo-500 bg-indigo-50 cursor-pointer shadow-md'
                                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer'
                                    }`}
                            >
                                <div className="flex items-start">
                                    <div className={`mt-0.5 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300 shrink-0 ${(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white group-hover:border-indigo-400'
                                        }`}>
                                        {(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') ? <Check className="w-4 h-4 text-white" strokeWidth={4} /> : <Truck className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" />}
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <span className={`block text-sm font-bold uppercase tracking-tight ${(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') ? 'text-indigo-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                            {content.SHIP.title}
                                        </span>
                                        <span className={`block text-xs mt-1 leading-relaxed ${(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') ? 'text-indigo-600' : 'text-gray-500'}`}>
                                            {content.SHIP.desc}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Option WAIT */}
                        {showOptionWait && (
                            <div
                                onClick={() => setSaleOption('WAIT_ALL')}
                                className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 group border-2 ${saleOption === 'WAIT_ALL'
                                    ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                                    : 'border-gray-100 bg-white hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-sm'
                                    }`}
                            >
                                <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${saleOption === 'WAIT_ALL' ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white group-hover:border-amber-400'
                                    }`}>
                                    {saleOption === 'WAIT_ALL' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <Clock className="w-3 h-3 text-gray-400" />}
                                </div>

                                <div className="ml-3.5 flex-1">
                                    <span className={`block text-sm font-bold ${saleOption === 'WAIT_ALL' ? 'text-amber-900' : 'text-slate-800'}`}>
                                        {content.WAIT.title}
                                    </span>
                                    <span className={`block text-xs mt-1 leading-relaxed ${saleOption === 'WAIT_ALL' ? 'text-amber-800' : 'text-gray-500'}`}>
                                        {content.WAIT.desc}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Option CANCEL */}
                        {showOptionCancel && (
                            <div
                                onClick={() => setSaleOption('CANCEL_ORDER')}
                                className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 group border-2 ${saleOption === 'CANCEL_ORDER'
                                    ? 'border-red-600 bg-red-50/40 shadow-sm'
                                    : 'border-gray-100 bg-white hover:border-red-200 hover:bg-red-50/30 hover:shadow-sm'
                                    }`}
                            >
                                <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${saleOption === 'CANCEL_ORDER' ? 'border-red-600 bg-red-600' : 'border-gray-300 bg-white group-hover:border-red-400'
                                    }`}>
                                    {saleOption === 'CANCEL_ORDER' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <XCircle className="w-3 h-3 text-gray-400" />}
                                </div>

                                <div className="ml-3.5 flex-1">
                                    <span className={`flex items-center gap-2 text-sm font-bold ${saleOption === 'CANCEL_ORDER' ? 'text-red-900' : 'text-slate-800'}`}>
                                        {content.CANCEL.title}
                                    </span>
                                    <span className={`block text-xs mt-1 leading-relaxed ${saleOption === 'CANCEL_ORDER' ? 'text-red-800' : 'text-gray-500'}`}>
                                        {content.CANCEL.desc}
                                    </span>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Chỉ hiện nút Xác nhận nếu có ít nhất 1 option THÔNG THƯỜNG khả dụng (không tính Urgent vì đã submit trực tiếp) */}
                    {(showOptionShip || showOptionWait || showOptionCancel) && (
                        <button
                            onClick={handleSaleSubmit}
                            disabled={!saleOption || isSubmitting}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:transform-none ${saleOption ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-100 text-gray-400'}`}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
                            {isSubmitting ? 'ĐANG XỬ LÝ...' : 'Xác nhận phương án'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
