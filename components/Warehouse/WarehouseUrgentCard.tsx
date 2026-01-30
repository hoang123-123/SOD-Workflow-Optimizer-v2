import React, { useState } from 'react';
import { SOD } from '../../types';
import { executeBusinessRule } from '../../logic/ruleEngine';
import {
    Zap,
    Loader2,
    Check,
    X,
    CheckCircle2,
    XCircle
} from 'lucide-react';

interface WarehouseUrgentCardProps {
    sod: SOD;
    recordId: string;
    onUpdate: (updatedSOD: SOD) => void;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
}

/**
 * [NEW] BENTO URGENT CARD - CHUYÊN CHO KHO PHÊ DUYỆT ĐƠN GẤP
 * Matching Ảnh 3: Header gọn gàng, nút Chấp nhận/Từ chối trực tiếp, không có chi tiết.
 */
export const WarehouseUrgentCard: React.FC<WarehouseUrgentCardProps> = ({
    sod,
    recordId,
    onUpdate,
    onSaveState
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const rs = sod.qtyOrdered - sod.qtyDelivered;
    const isUrgentPending = sod.urgentRequest?.status === 'PENDING';
    const isUrgentAccepted = sod.urgentRequest?.status === 'ACCEPTED';
    const isUrgentRejected = sod.urgentRequest?.status === 'REJECTED';

    const handleUrgentResponse = async (status: 'ACCEPTED' | 'REJECTED', e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const ruleId = status === 'ACCEPTED' ? 'WH_URGENT_ACCEPT' : 'WH_URGENT_REJECT';
            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {});

            // Xử lý state cục bộ
            onUpdate(updatedSOD);

            // Lưu xuống Dataverse
            if (onSaveState) await onSaveState(updatedSOD);

        } catch (error) {
            console.error("Urgent Response Error:", error);
            alert("Lỗi phản hồi đơn gấp.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xác định màu sắc dựa trên trạng thái
    const getBorderColor = () => {
        if (isUrgentAccepted) return 'border-emerald-100';
        if (isUrgentRejected) return 'border-rose-100';
        return 'border-amber-50 hover:border-amber-100';
    };

    const getIconBgColor = () => {
        if (isUrgentAccepted) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (isUrgentRejected) return 'bg-rose-50 text-rose-600 border-rose-100';
        return 'bg-amber-50 text-amber-600 border-amber-100';
    };

    return (
        <div className={`bg-white border ${getBorderColor()} rounded-xl transition-all overflow-hidden hover:border-amber-200`}>
            <div className="px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Product Info */}
                <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getIconBgColor()} shrink-0`}>
                        {isUrgentAccepted ? <CheckCircle2 className="w-4 h-4" /> :
                            isUrgentRejected ? <XCircle className="w-4 h-4" /> :
                                <Zap className="w-4 h-4 fill-amber-200" />}
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm leading-tight truncate">
                            {sod.detailName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            {isUrgentAccepted && (
                                <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase">Đã chấp nhận</span>
                            )}
                            {isUrgentRejected && (
                                <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">Đã từ chối</span>
                            )}
                            <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 text-[10px]">{sod.product.sku}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Qty & Actions */}
                <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-0">
                    {/* Qty Info */}
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-wide text-amber-600">Số lượng</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{rs}</span>
                            <span className="text-[9px] text-gray-400 font-semibold uppercase">{sod.unitOrderName || 'SP'}</span>
                            <span className="text-gray-300 mx-0.5">/</span>
                            <span className="text-base font-semibold text-amber-500">{Math.round(rs * (sod.conversionRate || 1))}</span>
                            <span className="text-[9px] text-amber-400 font-semibold uppercase">{sod.unitWarehouseName || 'SP'}</span>
                        </div>
                    </div>

                    {/* Action Buttons - Chỉ hiển thị khi PENDING */}
                    {isUrgentPending && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={(e) => handleUrgentResponse('ACCEPTED', e)}
                                disabled={isSubmitting}
                                className="h-8 w-8 flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg shadow-sm transition-all active:scale-95 disabled:bg-gray-300"
                                title="Chấp nhận"
                            >
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                            </button>

                            <button
                                onClick={(e) => handleUrgentResponse('REJECTED', e)}
                                disabled={isSubmitting}
                                className="h-8 w-8 flex items-center justify-center border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg transition-all active:scale-95 disabled:bg-gray-50"
                                title="Từ chối"
                            >
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" strokeWidth={3} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
