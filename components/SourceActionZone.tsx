
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
        <div className={`relative rounded-xl p-6 border transition-all flex flex-col ${canAct ? 'bg-white border-indigo-200 shadow-lg' : 'bg-gray-50 border-gray-200'}`}>
            <SectionHeader
                icon={Factory}
                title="Xử lý nguồn hàng"
                isActive={canAct}
                rightElement={renderBadge()}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6 pb-4 border-b border-gray-200">
                <Warehouse className="w-4 h-4 text-indigo-500" />
                <span>Kho nhập: <strong className="text-gray-700">{sod.warehouseLocation || 'Kho Dataverse'}</strong></span>
            </div>

            {isWorkflowStoppedBySale ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {sod.saleDecision?.action === 'CANCEL_ORDER' ? 'Đơn hàng đã được Chốt.' : 'Quy trình đã kết thúc bởi Sale.'}
                    </span>
                </div>
            ) : (
                <div className="flex flex-col flex-1">
                    {/* READ ONLY VIEW */}
                    {!canAct && (sod.status === SODStatus.RESOLVED || isSourcePlanConfirmed) && sod.sourcePlan && (
                        <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <LabelText className="block mb-2 uppercase text-[9px] tracking-widest">Trạng thái</LabelText>
                                    <span className="text-indigo-600 font-bold">{sod.sourcePlan.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : sod.sourcePlan.status}</span>
                                </div>
                                <div>
                                    <LabelText className="block mb-2 uppercase text-[9px] tracking-widest">Ngày dự kiến</LabelText>
                                    <span className="text-gray-900 font-bold">{sod.sourcePlan.eta}</span>
                                </div>
                                <div className="col-span-2 p-3 bg-white rounded-lg border border-gray-200">
                                    <LabelText className="block mb-1 uppercase text-[9px] tracking-widest">Nguồn cung cấp</LabelText>
                                    <span className="text-gray-600 font-medium">{sod.sourcePlan.supplier}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ACTION VIEW */}
                    {canAct && (
                        <div className="flex flex-col flex-1">
                            <div className="space-y-6 mb-6">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 text-gray-900 text-sm rounded-xl border border-amber-200">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="block font-bold text-amber-700 uppercase tracking-tight mb-1">Thiếu hụt thực tế</span>
                                        <div className="flex items-baseline gap-2">
                                            <strong className="text-xl font-black text-gray-900">{sq}</strong>
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">{unitName}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5" /> Ngày hàng về (ETA)
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="date"
                                                className="date-input-full-trigger block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 border transition-all cursor-pointer"
                                                value={sourceEta}
                                                onChange={(e) => setSourceEta(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <Factory className="w-3.5 h-3.5" /> Nguồn cung cấp
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nhập tên nhà cung cấp..."
                                            className="w-full text-sm font-bold bg-white border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 border placeholder-gray-400 text-gray-900"
                                            value={sourceSupplier}
                                            onChange={(e) => setSourceSupplier(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleSourceSubmit}
                                disabled={!sourceEta || isSubmitting}
                                className="h-14 w-full mt-auto px-6 bg-indigo-500 text-white text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "XÁC NHẬN KẾ HOẠCH"}
                            </button>
                        </div>
                    )}

                    {!canAct && sod.status !== SODStatus.RESOLVED && !isSourcePlanConfirmed && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center py-10">
                                <Clock className="w-8 h-8 text-indigo-400 mx-auto mb-4 animate-pulse" />
                                <span>{!sod.saleDecision ? "Đang chờ Sale..." : "Đang chờ Source..."}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
