
import React, { useState, useEffect } from 'react';
import { SOD, SODStatus } from '../types';
import { SectionHeader, LabelText } from './Typography';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
import { Factory, Warehouse, AlertTriangle, Calendar as CalendarIcon, Loader2, Clock } from 'lucide-react';

interface SourceActionZoneProps {
    sod: SOD;
    canAct: boolean;
    recordId: string;
    onAction: (updatedSOD: SOD) => Promise<void>;
    renderBadge: () => React.ReactNode;
    isWorkflowStoppedBySale: boolean;
}

const formatDateForInput = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.split('T')[0];
};

export const SourceActionZone: React.FC<SourceActionZoneProps> = ({ sod, canAct, recordId, onAction, renderBadge, isWorkflowStoppedBySale }) => {
    const [sourceEta, setSourceEta] = useState<string>(formatDateForInput(sod.sourcePlan?.eta));
    const [sourceSupplier, setSourceSupplier] = useState<string>(sod.sourcePlan?.supplier || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setSourceEta(formatDateForInput(sod.sourcePlan?.eta));
    }, [sod.sourcePlan?.eta]);

    useEffect(() => {
        setSourceSupplier(sod.sourcePlan?.supplier || '');
    }, [sod.sourcePlan?.supplier]);

    const rs = sod.qtyOrdered - sod.qtyDelivered; 
    const safeAvailable = sod.qtyAvailable || 0;
    const sq = Math.max(0, rs - safeAvailable);
    const isSourcePlanConfirmed = sod.sourcePlan?.status === 'CONFIRMED';
    
    // Get Unit and Product Name for Display
    const unitName = sod.unitOrderName || 'SP';
    const productName = sod.product.name;

    const handleSourceSubmit = async () => {
        if (!sourceEta) return;
        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // --- GỌI BRAIN: RULE SRC_CONFIRM ---
            const updatedSOD = await executeBusinessRule(
                'SRC_CONFIRM', 
                sod, 
                recordId, 
                {
                    eta: sourceEta,
                    supplier: sourceSupplier || 'Kho Dataverse'
                }
            );

            await onAction(updatedSOD);
        } catch (error) {
            console.error("Source Submit Error:", error);
            alert("Có lỗi xảy ra khi cập nhật kế hoạch.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`relative rounded-lg p-5 border transition-all flex flex-col ${canAct ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-70'}`}>
                 <SectionHeader 
                    icon={Factory} 
                    title="Xử lý nguồn hàng" 
                    isActive={canAct} 
                    rightElement={renderBadge()}
                 />

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100">
                    <Warehouse className="w-3.5 h-3.5" />
                    <span>Kho nhập: <strong className="text-gray-700">{sod.warehouseLocation || 'Kho Dataverse'}</strong></span>
                </div>

                {isWorkflowStoppedBySale ? (
                    <div className="py-8 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        <span className="text-xs font-medium text-gray-400">
                            {sod.saleDecision?.action === 'CANCEL_ORDER' ? 'Đơn hàng đã được Chốt.' : 'Quy trình đã kết thúc bởi Sale.'}
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1">
                        {/* READ ONLY VIEW */}
                        {!canAct && (sod.status === SODStatus.RESOLVED || isSourcePlanConfirmed) && sod.sourcePlan && (
                             <div className="p-3 bg-white rounded border border-gray-200 text-sm shadow-sm opacity-80">
                                <div className="grid grid-cols-2 gap-y-2">
                                     <div>
                                        <LabelText className="block mb-0.5">Trạng thái</LabelText>
                                        <span className="text-slate-800">{sod.sourcePlan.status === 'CONFIRMED' ? 'Đã xác nhận' : sod.sourcePlan.status}</span>
                                     </div>
                                     <div>
                                        <LabelText className="block mb-0.5">Ngày dự kiến</LabelText>
                                        <span className="text-slate-800">{sod.sourcePlan.eta}</span>
                                     </div>
                                     <div className="col-span-2">
                                        <LabelText className="block mb-0.5">Nguồn</LabelText>
                                        <span className="text-slate-800">{sod.sourcePlan.supplier}</span>
                                     </div>
                                </div>
                            </div>
                        )}

                        {/* ACTION VIEW */}
                        {canAct && (
                            <div className="flex flex-col flex-1">
                                <div className="space-y-4 mb-4">
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-900 text-sm rounded border border-amber-200">
                                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                        <span>
                                            Yêu cầu xử lý thiếu hụt: <strong>{sq} {unitName}</strong> {productName}.
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Ngày hàng về (ETA)</label>
                                            <div className="relative w-full">
                                                <input 
                                                    type="date"
                                                    className="date-input-full-trigger block w-full rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm cursor-pointer placeholder-gray-400"
                                                    value={sourceEta}
                                                    onChange={(e) => setSourceEta(e.target.value)}
                                                    style={{ colorScheme: 'light' }}
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 bg-transparent">
                                                    <CalendarIcon className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Nguồn cung cấp</label>
                                            <input 
                                                type="text" 
                                                placeholder="Nhập nguồn cung cấp..."
                                                className="w-full text-sm bg-white border-gray-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-400 text-slate-800"
                                                value={sourceSupplier}
                                                onChange={(e) => setSourceSupplier(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSourceSubmit}
                                    disabled={!sourceEta || isSubmitting}
                                    className="w-full mt-auto px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận Kế hoạch"}
                                </button>
                            </div>
                        )}
                        
                        {!canAct && sod.status !== SODStatus.RESOLVED && !isSourcePlanConfirmed && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-sm text-gray-400 italic text-center py-6">
                                    <Clock className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                                    <span>{!sod.saleDecision ? "Đang chờ Sale..." : "Đang chờ Source..."}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
};
