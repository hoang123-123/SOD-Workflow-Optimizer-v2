import React, { useState } from 'react';
import { SOD } from '../../types';
import { StatusBadge } from '../Badge';
import { LabelText } from '../Typography';
import { executeBusinessRule } from '../../logic/ruleEngine';
import {
    Box,
    Zap,
    Loader2,
    Calendar,
    CheckCircle2,
    XCircle,
    Hourglass
} from 'lucide-react';

interface SaleUrgentCardProps {
    sod: SOD;
    recordId: string;
    onUpdate: (updatedSOD: SOD) => void;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
}

export const SaleUrgentCard: React.FC<SaleUrgentCardProps> = ({ sod, recordId, onUpdate, onSaveState }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const rs = sod.qtyOrdered - sod.qtyDelivered;
    const hasUrgentRequest = !!sod.urgentRequest;
    const isUrgentPending = sod.urgentRequest?.status === 'PENDING';
    const isUrgentAccepted = sod.urgentRequest?.status === 'ACCEPTED';
    const isUrgentRejected = sod.urgentRequest?.status === 'REJECTED';

    const handleUrgentSubmit = async () => {
        if (isSubmitting || hasUrgentRequest) return;
        setIsSubmitting(true);
        try {
            const updatedSOD = await executeBusinessRule('SALE_URGENT', sod, recordId, {});
            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Sale Urgent Submit Error:", error);
            alert("Lỗi gửi yêu cầu giao gấp.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xác định màu sắc dựa trên trạng thái
    const getBorderColor = () => {
        if (isUrgentAccepted) return 'border-emerald-200 hover:border-emerald-300';
        if (isUrgentRejected) return 'border-rose-200 hover:border-rose-300';
        return 'border-amber-100 hover:border-amber-200';
    };

    const getIconBgColor = () => {
        if (isUrgentAccepted) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (isUrgentRejected) return 'bg-rose-50 text-rose-600 border-rose-100';
        return 'bg-amber-50 text-amber-600 border-amber-100';
    };

    const getStatusBadge = () => {
        if (isUrgentAccepted) {
            return (
                <div className="h-8 px-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Kho chấp nhận
                </div>
            );
        }
        if (isUrgentRejected) {
            return (
                <div className="h-8 px-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Kho từ chối
                </div>
            );
        }
        if (isUrgentPending) {
            return (
                <div className="h-8 px-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                    <Hourglass className="w-3.5 h-3.5 animate-pulse" />
                    Chờ xác nhận
                </div>
            );
        }
        return (
            <button
                onClick={handleUrgentSubmit}
                disabled={isSubmitting}
                className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-wide shadow-sm transition-all active:scale-95 flex items-center gap-1.5 group"
            >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-amber-200 group-hover:fill-white" />}
                Gửi yêu cầu gấp
            </button>
        );
    };

    const getStatusMessage = () => {
        if (isUrgentAccepted) {
            return (
                <div className="px-3 py-2 bg-emerald-50/50 border-t border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-700">
                        Kho đã chấp nhận yêu cầu gấp - Đang chuẩn bị hàng
                    </span>
                </div>
            );
        }
        if (isUrgentRejected) {
            return (
                <div className="px-3 py-2 bg-rose-50/50 border-t border-rose-100 flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[10px] font-semibold text-rose-700">
                        Kho đã từ chối - Vui lòng liên hệ để biết thêm chi tiết
                    </span>
                </div>
            );
        }
        if (isUrgentPending) {
            return (
                <div className="px-3 py-2 bg-amber-50/50 border-t border-amber-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                    <span className="text-[10px] font-semibold text-amber-700">
                        Đang chờ Kho xác nhận yêu cầu giao gấp
                    </span>
                </div>
            );
        }
        return (
            <div className="px-3 py-2 bg-amber-50/50 border-t border-amber-100 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                <span className="text-[10px] font-semibold text-amber-700">
                    Đơn hàng tương lai đủ tồn kho lý thuyết - Ưu tiên xử lý giao gấp
                </span>
            </div>
        );
    };

    return (
        <div className={`bg-white border ${getBorderColor()} rounded-xl transition-all overflow-hidden`}>
            <div className="px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getIconBgColor()} shrink-0`}>
                        {isUrgentAccepted ? <CheckCircle2 className="w-4 h-4" /> :
                            isUrgentRejected ? <XCircle className="w-4 h-4" /> :
                                <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 text-sm leading-tight">{sod.detailName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold bg-amber-100/50 px-1.5 py-0.5 rounded text-amber-700 text-[10px]">{sod.product.sku}</span>
                            <div className="flex items-center gap-1 text-amber-600 font-medium">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[10px]">Giao: {sod.expectedDeliveryDate ? new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN') : '---'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-0">
                    <div className="flex flex-col items-end">
                        <LabelText className="text-[9px] uppercase tracking-wide text-amber-600">Cần giao</LabelText>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{rs}</span>
                            <span className="text-[9px] text-gray-400 font-semibold uppercase">{sod.unitOrderName || 'SP'}</span>
                            <span className="text-amber-300 mx-0.5">/</span>
                            <span className="text-base font-semibold text-amber-500">{(rs * (sod.conversionRate || 1)).toFixed(2)}</span>
                            <span className="text-[9px] text-amber-400 font-semibold uppercase">{sod.unitWarehouseName || 'SP'}</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                    {getStatusBadge()}
                </div>
            </div>

            {/* THÔNG BÁO TRẠNG THÁI */}
            {getStatusMessage()}
        </div>
    );
};
