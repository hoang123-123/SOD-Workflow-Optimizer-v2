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
        <div className={`bg-white border-2 ${getBorderColor()} rounded-[1.5rem] transition-all overflow-hidden shadow-sm hover:shadow-md mb-6 group`}>
            <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Product Info */}
                <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-2xl ${getIconBgColor()} border shadow-sm shrink-0 flex items-center justify-center`}>
                        {isUrgentAccepted ? <CheckCircle2 className="w-5 h-5" /> :
                            isUrgentRejected ? <XCircle className="w-5 h-5" /> :
                                <Zap className="w-5 h-5 fill-amber-200" />}
                    </div>
                    <div className="min-w-0">
                        <div className="font-extrabold text-gray-900 text-base leading-tight truncate uppercase tracking-tight">
                            {sod.detailName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {isUrgentAccepted && (
                                <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-lg border border-emerald-600 shadow-sm uppercase">Đã chấp nhận</span>
                            )}
                            {isUrgentRejected && (
                                <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-lg border border-rose-600 shadow-sm uppercase">Đã từ chối</span>
                            )}
                            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg border border-gray-200 uppercase">{sod.product.sku}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Qty & Actions */}
                <div className="flex items-center gap-6 shrink-0 ml-auto md:ml-0">
                    {/* Qty Info */}
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase tracking-widest font-black text-amber-600/60 mb-0.5">Số lượng đơn/kho</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-gray-900">{rs}</span>
                            <span className="text-gray-300 mx-0.5 text-sm">/</span>
                            <span className="text-base font-bold text-amber-600/60">{rs * (sod.conversionRate || 1)}</span>
                        </div>
                    </div>

                    {/* Action Buttons - Chỉ hiển thị khi PENDING */}
                    {isUrgentPending && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => handleUrgentResponse('ACCEPTED', e)}
                                disabled={isSubmitting}
                                className="h-11 w-11 flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:bg-gray-300"
                                title="Chấp nhận"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" strokeWidth={4} />}
                            </button>

                            <button
                                onClick={(e) => handleUrgentResponse('REJECTED', e)}
                                disabled={isSubmitting}
                                className="h-11 w-11 flex items-center justify-center border-2 border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-all active:scale-95 disabled:bg-gray-50 disabled:text-gray-300"
                                title="Từ chối"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" strokeWidth={3} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
