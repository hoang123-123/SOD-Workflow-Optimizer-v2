
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
    const [saleOption, setSaleOption] = useState<'SHIP_PARTIAL' | 'SHIP_AND_CLOSE' | 'WAIT_ALL' | 'CANCEL_ORDER' | 'SALE_URGENT' | 'REJECT_REPORT' | null>(
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
    const isFactory = Number(customerIndustryType) === INDUSTRY_FACTORY;

    // [RULE] Các option chọn cho Sale:
    // - Option SHIP: Hiện khi đơn thiếu và có hàng khả dụng
    // - Option WAIT: Chỉ hiện khi Kho ĐÃ GỬI notification (xác nhận số liệu thực)
    // - Option CANCEL: Chỉ hiện nếu KHÔNG PHẢI là Factory
    const showOptionShip = isDue && !isSufficient && autoShipQty > 0;
    const showOptionWait = isDue && !isSufficient && sod.isNotificationSent === true; // Chờ hàng = chờ Source, chỉ khi Kho đã xác nhận thiếu
    const showOptionCancel = isDue && !isSufficient && !isFactory; // Factory không có option Hủy

    const renderDecisionText = (action: 'SHIP_PARTIAL' | 'SHIP_AND_CLOSE' | 'WAIT_ALL' | 'CANCEL_ORDER' | 'REJECT_REPORT') => {
        if (action === 'SHIP_PARTIAL') {
            // Factory: Chỉ giao, không chốt
            return `Đã xác nhận giao ${sod.saleDecision?.quantity || autoShipQty} ${unitOrder}`;
        }
        if (action === 'SHIP_AND_CLOSE') {
            // Non-Factory: Giao & Chốt
            return `Đã xác nhận giao ${sod.saleDecision?.quantity || autoShipQty} ${unitOrder} & Chốt dòng`;
        }
        if (action === 'CANCEL_ORDER') return `Đã Chốt đơn (Dừng giao)`;
        if (action === 'REJECT_REPORT') return `Đã từ chối báo cáo sai lệch`;
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
                    title: `Giao ${qtyToShip} ${unitOrder}`,
                    desc: qtyShortage > 0
                        ? `Giao số lượng có sẵn. Còn lại ${qtyShortage} ${unitOrder} sẽ giao sau khi có hàng.`
                        : `Giao toàn bộ ${qtyToShip} ${unitOrder} và hoàn tất đơn hàng.`
                },
                WAIT: {
                    title: "Chờ bổ sung hàng",
                    desc: `Kho báo thiếu ${qtyShortage} ${unitOrder}. Tiếp tục treo đơn để chờ hàng bổ sung.`
                },
                CANCEL: {
                    title: "Hủy đơn hàng này",
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
                    : `Giao toàn bộ số lượng yêu cầu và chốt đơn hàng.`
            },
            WAIT: {
                title: "Chờ bổ sung hàng",
                desc: `Kho báo thiếu ${qtyShortage} ${unitOrder}. Tiếp tục treo đơn để chờ hàng bổ sung từ Source.`
            },
            CANCEL: {
                title: "Hủy đơn hàng này",
                desc: "Không giao dở dang. Hủy bỏ toàn bộ đơn hàng này."
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

            if (saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') {
                ruleId = `${rulePrefix}1`; // A1 hoặc B1
                params = { quantity: autoShipQty, isFactory: isFactory }; // [NEW] Truyền isFactory
            } else if (saleOption === 'WAIT_ALL') {
                ruleId = `${rulePrefix}2`; // A2 hoặc B2
            } else if (saleOption === 'CANCEL_ORDER') {
                ruleId = `${rulePrefix}3`; // A3 hoặc B3
                params = { quantity: rs }; // Hủy phần còn lại
            } else if (saleOption === 'REJECT_REPORT') {
                ruleId = `${rulePrefix}4`; // A4 hoặc B4
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
        <div className={`relative rounded-xl p-4 border transition-all flex flex-col ${canAct ? 'bg-gray-50 border-gray-300' : 'bg-gray-50 border-gray-200 mt-2'}`}>
            {/* NHÃN TRÊN VIỀN (FLOATING LABEL) */}
            {canAct && (
                <div className="absolute -top-3 left-4 bg-gray-50 px-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Phương án xử lý</span>
                    <div className="ml-1">{renderBadge()}</div>
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
                        <div className={`p-2 rounded-lg ${(sod.saleDecision.action === 'SHIP_PARTIAL' || sod.saleDecision.action === 'SHIP_AND_CLOSE') ? 'bg-indigo-100 text-indigo-600' : (sod.saleDecision.action === 'CANCEL_ORDER' || sod.saleDecision.action === 'REJECT_REPORT') ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            {(sod.saleDecision.action === 'SHIP_PARTIAL' || sod.saleDecision.action === 'SHIP_AND_CLOSE') ? <Check className="w-4 h-4" /> : (sod.saleDecision.action === 'CANCEL_ORDER' || sod.saleDecision.action === 'REJECT_REPORT') ? <Ban className="w-4 h-4" /> : <Forward className="w-4 h-4" />}
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
                                className={`relative flex flex-col p-4 rounded-lg transition-all duration-200 group border ${(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE')
                                    ? 'border-gray-400 bg-white cursor-pointer shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                                    }`}
                            >
                                <div className="flex items-start">
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') ? 'border-gray-600 bg-gray-600' : 'border-gray-300 bg-white group-hover:border-gray-400'
                                        }`}>
                                        {(saleOption === 'SHIP_PARTIAL' || saleOption === 'SHIP_AND_CLOSE') ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <Truck className="w-3 h-3 text-gray-400" />}
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <span className="block text-sm font-bold text-gray-900">
                                            {content.SHIP.title}
                                        </span>
                                        <span className="block text-xs mt-0.5 text-gray-500 leading-relaxed">
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
                                className={`relative flex items-start p-4 rounded-lg cursor-pointer transition-all duration-200 group border ${saleOption === 'WAIT_ALL'
                                    ? 'border-gray-400 bg-white shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${saleOption === 'WAIT_ALL' ? 'border-gray-600 bg-gray-600' : 'border-gray-300 bg-white group-hover:border-gray-400'
                                    }`}>
                                    {saleOption === 'WAIT_ALL' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <Clock className="w-3 h-3 text-gray-400" />}
                                </div>

                                <div className="ml-3 flex-1">
                                    <span className="block text-sm font-bold text-gray-900">
                                        {content.WAIT.title}
                                    </span>
                                    <span className="block text-xs mt-0.5 text-gray-500 leading-relaxed">
                                        {content.WAIT.desc}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Option CANCEL */}
                        {showOptionCancel && (
                            <div
                                onClick={() => setSaleOption('CANCEL_ORDER')}
                                className={`relative flex items-start p-4 rounded-lg cursor-pointer transition-all duration-200 group border ${saleOption === 'CANCEL_ORDER'
                                    ? 'border-gray-400 bg-white shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                            >
                                <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${saleOption === 'CANCEL_ORDER' ? 'border-gray-600 bg-gray-600' : 'border-gray-300 bg-white group-hover:border-gray-400'
                                    }`}>
                                    {saleOption === 'CANCEL_ORDER' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <XCircle className="w-3 h-3 text-gray-400" />}
                                </div>

                                <div className="ml-3 flex-1">
                                    <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                        {content.CANCEL.title}
                                    </span>
                                    <span className="block text-xs mt-0.5 text-gray-500 leading-relaxed">
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
                            className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none ${saleOption ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-gray-100 text-gray-400'}`}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận phương án'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
