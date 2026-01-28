
import React, { useState } from 'react';
import { SOD } from '../types';
import { SectionHeader } from './Typography';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
import { UserCircle2, Check, Ban, Forward, FileCheck, Loader2, Truck, Clock, XCircle } from 'lucide-react';

interface SaleActionZoneProps {
    sod: SOD;
    canAct: boolean;
    recordId: string;
    onAction: (updatedSOD: SOD) => Promise<void>;
    renderBadge: () => React.ReactNode;
}

export const SaleActionZone: React.FC<SaleActionZoneProps> = ({ sod, canAct, recordId, onAction, renderBadge }) => {
    const [saleOption, setSaleOption] = useState<'SHIP_PARTIAL' | 'WAIT_ALL' | 'CANCEL_ORDER' | null>(sod.saleDecision?.action || null);
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

    const showOptionShip = autoShipQty > 0; 
    const showOptionWait = true;              
    const showOptionCancel = true;            

    const renderDecisionText = (action: 'SHIP_PARTIAL' | 'WAIT_ALL' | 'CANCEL_ORDER') => {
        if (action === 'SHIP_PARTIAL') return `Đã xác nhận giao ${sod.saleDecision?.quantity || autoShipQty} ${unitOrder} & Chốt dòng`;
        if (action === 'CANCEL_ORDER') return `Đã Chốt đơn (Dừng giao)`;
        return `Đã chuyển trạng thái Chờ hàng`;
    }

    // --- HELPER: NỘI DUNG HIỂN THỊ THEO CASE ---
    const getOptionContent = () => {
        return {
            SHIP: {
                // [RULE CHANGE]: Mọi hành động Giao đều là Giao & Chốt
                title: `Giao ngay ${autoShipQty} ${unitOrder} & CHỐT DÒNG`,
                desc: `Khách đồng ý nhận số lượng này. Hệ thống sẽ chốt đơn và HỦY phần thiếu ${Math.max(0, rs - autoShipQty)} ${unitOrder}.`
            },
            WAIT: {
                title: isPhase1
                    ? "Chờ gom đủ hàng (Bổ sung sau)"
                    : "Tiếp tục chờ (Chưa chốt)",
                desc: isPhase1
                    ? "Khách muốn gom đủ mới giao. Chuyển yêu cầu sang Source để xác nhận ngày hàng về (ETA)."
                    : "Vẫn chưa đủ hàng. Tiếp tục treo đơn để chờ đợt hàng tiếp theo."
            },
            CANCEL: {
                title: isPhase1
                    ? "Hủy dòng hàng này"
                    : "Dừng giao (Chốt số thực tế)",
                desc: isPhase1
                    ? "Khách không đồng ý chờ. Hủy bỏ dòng hàng này khỏi đơn hàng."
                    : `Không chờ thêm nữa. Kết thúc đơn hàng với tổng số đã giao là ${sod.qtyDelivered} ${unitOrder}.`
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
                params = { quantity: autoShipQty };
            } else if (saleOption === 'WAIT_ALL') {
                ruleId = `${rulePrefix}2`; // A2 hoặc B2
            } else if (saleOption === 'CANCEL_ORDER') {
                ruleId = `${rulePrefix}3`; // A3 hoặc B3
                params = { quantity: rs }; // Hủy phần còn lại
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
        <div className={`relative rounded-lg p-5 border transition-all flex flex-col ${canAct ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-70'}`}>
            <SectionHeader 
                icon={UserCircle2} 
                title="Quyết định của Sale" 
                isActive={canAct} 
                rightElement={renderBadge()}
            />

            {/* Warehouse Verification Context */}
            {sod.isNotificationSent && (
                <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-2 text-sm">
                    <FileCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    <div className="text-indigo-900 w-full">
                        <span className="font-bold">Request từ Kho:</span>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                             <div className="bg-white/60 p-1.5 rounded border border-indigo-100">
                                <span className="text-indigo-600 block mb-0.5">Thực tế tại Kho</span>
                                <strong className="text-base">{warehousePhysicalQty}</strong> {unitWarehouse}
                             </div>
                             <div className="bg-white p-1.5 rounded border border-indigo-200 shadow-sm">
                                <span className="text-indigo-600 block mb-0.5">Khả năng đáp ứng đơn</span>
                                <strong className="text-base text-indigo-700">{autoShipQty}</strong> {unitOrder}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* READ ONLY VIEW */}
            {!canAct && sod.saleDecision && (
                <div className="p-3 bg-white rounded border border-gray-200 text-sm shadow-sm opacity-80">
                    <div className="flex items-center gap-2 mb-1">
                            {sod.saleDecision.action === 'SHIP_PARTIAL' ? <Check className="w-4 h-4 text-blue-600" /> : (sod.saleDecision.action === 'CANCEL_ORDER' ? <Ban className="w-4 h-4 text-gray-600" /> : <Forward className="w-4 h-4 text-amber-600" />)}
                            <span className="font-semibold text-gray-800">
                            {renderDecisionText(sod.saleDecision.action)}
                            </span>
                    </div>
                    <div className="text-xs text-gray-400 pl-6">
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
                                className={`relative flex flex-col p-4 rounded-xl transition-all duration-200 group border-2 ${
                                    (saleOption === 'SHIP_PARTIAL') 
                                        ? 'border-indigo-600 bg-indigo-50/40 cursor-pointer shadow-sm' 
                                        : 'border-gray-100 bg-white hover:border-indigo-300 hover:bg-gray-50/80 cursor-pointer hover:shadow-sm'
                                }`}
                            >
                                <div className="flex items-start">
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${
                                        saleOption === 'SHIP_PARTIAL' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white group-hover:border-indigo-400'
                                    }`}>
                                        {saleOption === 'SHIP_PARTIAL' ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <Truck className="w-3 h-3 text-gray-400" />}
                                    </div>
                                    <div className="ml-3.5 flex-1">
                                        <span className={`block text-sm font-bold ${saleOption === 'SHIP_PARTIAL' ? 'text-indigo-900' : 'text-slate-800'}`}>
                                            {content.SHIP.title}
                                        </span>
                                        <span className={`block text-xs mt-1 leading-relaxed ${saleOption === 'SHIP_PARTIAL' ? 'text-indigo-700' : 'text-gray-500'}`}>
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
                                className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 group border-2 ${
                                    saleOption === 'WAIT_ALL' 
                                    ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                                    : 'border-gray-100 bg-white hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-sm'
                                }`}
                            >
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${
                                    saleOption === 'WAIT_ALL' ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white group-hover:border-amber-400'
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
                                className={`relative flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 group border-2 ${
                                    saleOption === 'CANCEL_ORDER' 
                                    ? 'border-red-600 bg-red-50/40 shadow-sm' 
                                    : 'border-gray-100 bg-white hover:border-red-200 hover:bg-red-50/30 hover:shadow-sm'
                                }`}
                            >
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 shrink-0 ${
                                    saleOption === 'CANCEL_ORDER' ? 'border-red-600 bg-red-600' : 'border-gray-300 bg-white group-hover:border-red-400'
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

                        <button 
                        onClick={handleSaleSubmit}
                        disabled={!saleOption || isSubmitting}
                        className={`w-full mt-auto px-4 py-2.5 text-white text-sm font-medium rounded-lg disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2 shadow-sm ${
                            saleOption === 'CANCEL_ORDER' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                        >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận Phương án"}
                        </button>
                    </div>
            )}
        </div>
    );
};
