
import React, { useState } from 'react';
import { SOD } from '../types';
import { SectionHeader } from './Typography';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
import { Warehouse, X, PackageCheck, Info, Loader2, Hourglass, CheckCircle2, ListChecks, AlertOctagon } from 'lucide-react';

interface WarehouseActionZoneProps {
    sod: SOD;
    canAct: boolean;
    recordId: string;
    onAction: (updatedSOD: SOD) => Promise<void>;
    renderBadge: () => React.ReactNode;
    isWorkflowStoppedBySale: boolean;
}

export const WarehouseActionZone: React.FC<WarehouseActionZoneProps> = ({ sod, canAct, recordId, onAction, renderBadge, isWorkflowStoppedBySale }) => {
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isWarehouseRejected = sod.warehouseConfirmation?.status === 'REJECTED';

    const handleWarehouseAction = async (action: 'CONFIRM' | 'REJECT') => {
        if (action === 'REJECT' && !rejectReason) return;
        
        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));

            let updatedSOD: SOD;

            if (action === 'CONFIRM') {
                // --- GỌI BRAIN: RULE WH_CONFIRM ---
                updatedSOD = await executeBusinessRule('WH_CONFIRM', sod, recordId, {});
            } else {
                // --- GỌI BRAIN: RULE WH_REJECT ---
                updatedSOD = await executeBusinessRule('WH_REJECT', sod, recordId, { reason: rejectReason });
            }

            await onAction(updatedSOD);
            setIsRejecting(false);

        } catch (error) {
            console.error("Warehouse Action Error:", error);
            alert("Lỗi xử lý kho.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate display values
    const qtyToShip = sod.saleDecision?.quantity || 0;
    const unitName = sod.unitOrderName || 'SP'; // Ưu tiên hiển thị đơn vị Sale chốt
    const productName = sod.product.name;

    return (
        <div className={`relative rounded-lg p-5 border transition-all flex flex-col ${canAct ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-70'}`}>
                 <SectionHeader 
                    icon={Warehouse} 
                    title="Xử lý Kho (Logistics)" 
                    isActive={canAct} 
                    rightElement={renderBadge()}
                 />

                {/* Warehouse Location Info */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
                    <Warehouse className="w-3.5 h-3.5" />
                    <span>Kho xuất: <strong className="text-gray-700">{sod.warehouseLocation || 'Kho Dataverse'}</strong></span>
                </div>

                {isWorkflowStoppedBySale ? (
                     <div className="py-8 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <span className="text-xs font-medium text-gray-400">Quy trình đã kết thúc.</span>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1">
                        {/* READ ONLY VIEW */}
                        {!canAct && sod.warehouseConfirmation && (
                            <div className={`p-3 rounded border text-sm shadow-sm opacity-80 ${isWarehouseRejected ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {isWarehouseRejected ? <X className="w-4 h-4 text-red-600" /> : <PackageCheck className="w-4 h-4 text-blue-600" />}
                                    <span className={`font-semibold ${isWarehouseRejected ? 'text-red-800' : 'text-blue-800'}`}>
                                        {isWarehouseRejected ? 'Đã TỪ CHỐI xuất hàng' : 'Đã XÁC NHẬN xuất hàng'}
                                    </span>
                                </div>
                                
                                {/* Chi tiết các Notification đã gửi (Simulation Detail) */}
                                {!isWarehouseRejected && (
                                    <div className="mt-2 space-y-1">
                                         <div className="flex items-center gap-1.5 text-xs text-blue-700">
                                            <CheckCircle2 className="w-3 h-3 text-blue-500"/>
                                            <span>Đã thông báo Sale (Kết quả xuất)</span>
                                         </div>
                                         <div className="flex items-center gap-1.5 text-xs text-blue-700">
                                            <ListChecks className="w-3 h-3 text-blue-500"/>
                                            <span>Đã gửi Lệnh soạn hàng (Picking Dept)</span>
                                         </div>
                                    </div>
                                )}

                                {isWarehouseRejected && sod.warehouseConfirmation.reason && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-100/50 p-2 rounded">
                                        <strong>Lý do:</strong> {sod.warehouseConfirmation.reason}
                                    </div>
                                )}
                                <div className="text-xs text-gray-500 mt-2 pl-6">
                                    {new Date(sod.warehouseConfirmation.timestamp).toLocaleString()}
                                </div>
                            </div>
                        )}

                        {/* ACTION VIEW */}
                        {canAct && (
                            <div className="flex flex-col gap-4 mt-2">
                                <div className="p-4 bg-blue-50 text-blue-900 text-sm rounded-lg border border-blue-200 shadow-sm flex items-start gap-3">
                                    <Info className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
                                    <div>
                                        <div className="font-bold mb-1">Sale đã chốt phương án Giao hàng</div>
                                        <div>
                                            Số lượng yêu cầu xuất: <strong>{qtyToShip} {unitName}</strong>
                                        </div>
                                        <div className="text-xs text-blue-700 mt-1">
                                            (Dựa trên số lượng thực tế Kho đã báo cáo trước đó)
                                        </div>
                                    </div>
                                </div>

                                {/* ACTION BUTTONS AREA - FIXED VISIBILITY */}
                                <div className="mt-auto">
                                    {!isRejecting ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => setIsRejecting(true)}
                                                className="px-4 py-2.5 text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 text-sm font-medium rounded-lg transition-colors"
                                            >
                                                Từ chối / Báo lỗi
                                            </button>
                                            <button 
                                                onClick={() => handleWarehouseAction('CONFIRM')}
                                                disabled={isSubmitting}
                                                className="px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận Xuất kho"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 bg-red-50/60 p-4 rounded-xl border border-red-100 shadow-sm">
                                            <label className="block text-xs font-bold text-red-900 mb-2 flex items-center gap-2">
                                                <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                                                LÝ DO TỪ CHỐI / BÁO LỖI: <span className="text-red-600">*</span>
                                            </label>
                                            <textarea
                                                className="w-full text-sm p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[90px] bg-white text-gray-900 placeholder-gray-400 shadow-inner resize-none transition-all"
                                                placeholder="Nhập chi tiết lý do (VD: Hàng thực tế bị hỏng, thất lạc, sai lệch số liệu kho...)"
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="flex items-center gap-3 mt-3">
                                                <button 
                                                    onClick={() => setIsRejecting(false)}
                                                    className="flex-1 px-3 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold rounded-lg shadow-sm transition-colors"
                                                >
                                                    Hủy bỏ
                                                </button>
                                                <button 
                                                    onClick={() => handleWarehouseAction('REJECT')}
                                                    disabled={!rejectReason || isSubmitting}
                                                    className="flex-1 px-3 py-2.5 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none flex items-center justify-center gap-2 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Gửi báo cáo từ chối"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!canAct && !sod.warehouseConfirmation && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-sm text-gray-400 italic text-center py-6">
                                    <Hourglass className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                                    <span>Đang chờ Kho xử lý...</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
};
