import React, { useState } from 'react';
import { SOD } from '../../types';
import { StatusBadge } from '../Badge';
import { WarehouseActionZone } from '../WarehouseActionZone';
import { ChevronDown, PackageCheck } from 'lucide-react';

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
        <div className="bg-white border border-gray-200 rounded-xl transition-all overflow-hidden hover:border-emerald-200">
            {/* Header */}
            <div className="px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100">
                <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg shrink-0 bg-emerald-50 text-emerald-600">
                        <PackageCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 text-sm leading-tight">{sod.detailName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-emerald-600 text-[10px]">{sod.product.sku}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-0">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-gray-400">Số lượng Đơn/Kho</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{rs}</span>
                            <span className="text-gray-300 mx-0.5">/</span>
                            <span className="text-sm font-medium text-emerald-600">{rs * (sod.conversionRate || 1)}</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                    <div className="flex items-center gap-2">
                        <StatusBadge sod={sod} />
                        <button
                            onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}
                            className={`p-1 rounded-md transition-all duration-300 ${isWorkflowExpanded ? 'rotate-0 text-emerald-600' : 'rotate-180 text-gray-400'}`}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content: Actions Zone */}
            {isWorkflowExpanded && (
                <div className="px-3 py-3">
                    <WarehouseActionZone
                        sod={sod}
                        canAct={!sod.warehouseConfirmation}
                        recordId={recordId}
                        onAction={handleActionComplete}
                        renderBadge={renderWarehouseBadge}
                        isWorkflowStoppedBySale={sod.saleDecision?.action === 'CANCEL_ORDER'}
                        isDue={true}
                        hideHeader={true}
                    />
                </div>
            )}
        </div>
    );
};
