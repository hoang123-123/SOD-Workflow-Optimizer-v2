import React, { useState } from 'react';
import { SOD } from '../../types';
import { StatusBadge } from '../Badge';
import { LabelText } from '../Typography';
import { executeBusinessRule } from '../../logic/ruleEngine';
import { WarehouseActionZone } from '../WarehouseActionZone';
import {
    ChevronDown,
    Zap,
    Loader2,
    Check,
    X,
    PackageCheck,
    ClipboardList
} from 'lucide-react';

interface WarehouseActionCardProps {
    sod: SOD;
    recordId: string;
    onUpdate: (updatedSOD: SOD) => void;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
}

/**
 * COMPONENT CHUYÊN CHO XÁC NHẬN XUẤT KHO VÀ ĐƠN GẤP
 * Màu chủ đạo: Emerald (Xanh lá)
 */
export const WarehouseActionCard: React.FC<WarehouseActionCardProps> = ({
    sod,
    recordId,
    onUpdate,
    onSaveState
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(true);

    const rs = sod.qtyOrdered - sod.qtyDelivered;
    const isWarehouseConfirmed = sod.warehouseConfirmation?.status === 'CONFIRMED';

    const handleActionComplete = async (updatedSOD: SOD) => {
        onUpdate(updatedSOD);
        if (onSaveState) await onSaveState(updatedSOD);
    }

    const renderWarehouseBadge = () => {
        if (isWarehouseConfirmed) return <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wide shadow-sm"><PackageCheck className="w-3 h-3" /> KHO ĐÃ XUẤT</span>;
        return null;
    }

    return (
        <div className="bg-white border-2 rounded-[2rem] transition-all overflow-hidden shadow-sm hover:shadow-md mb-6 border-emerald-100">
            {/* Header */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-emerald-50">
                <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl border shadow-sm shrink-0 bg-emerald-50 text-emerald-600 border-emerald-100">
                        <PackageCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="font-black text-gray-900 text-lg leading-tight mb-1 uppercase tracking-tighter">{sod.detailName}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="font-bold bg-gray-100 px-2 py-0.5 rounded-lg text-gray-700 border border-gray-200">{sod.product.sku}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="flex flex-col items-end">
                        <LabelText className="text-[9px] uppercase tracking-widest font-black mb-1 text-emerald-600">Số lượng Đơn/Kho</LabelText>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-gray-900">{rs}</span>
                            <span className="text-gray-200 mx-1">/</span>
                            <span className="text-lg font-bold text-emerald-600/60">{rs * (sod.conversionRate || 1)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <StatusBadge sod={sod} />
                        <button
                            onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}
                            className={`p-2 rounded-xl transition-all ${isWorkflowExpanded ? 'bg-gray-100 text-indigo-600' : 'bg-gray-50 text-gray-400 rotate-180'}`}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content: Actions Zone */}
            {isWorkflowExpanded && (
                <div className="p-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-emerald-50/30 rounded-3xl border-2 border-emerald-100 p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600 border border-emerald-100">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Xác nhận xuất kho</h4>
                        </div>
                        <WarehouseActionZone
                            sod={sod}
                            canAct={!sod.warehouseConfirmation}
                            recordId={recordId}
                            onAction={handleActionComplete}
                            renderBadge={renderWarehouseBadge}
                            isWorkflowStoppedBySale={sod.saleDecision?.action === 'CANCEL_ORDER'}
                            isDue={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
