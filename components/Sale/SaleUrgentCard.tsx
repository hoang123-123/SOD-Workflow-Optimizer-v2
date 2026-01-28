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
    CheckCircle2
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

    return (
        <div className="bg-white border-2 border-amber-100 rounded-2xl transition-all overflow-hidden shadow-sm hover:shadow-md hover:border-amber-200">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shrink-0">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-lg leading-tight mb-1">{sod.detailName}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="font-bold bg-amber-100/50 px-2 py-0.5 rounded-lg text-amber-700 border border-amber-200/50">{sod.product.sku}</span>
                            <div className="flex items-center gap-1.5 text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-lg">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Giao: {sod.expectedDeliveryDate ? new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN') : '---'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="flex flex-col items-end">
                        <LabelText className="text-[9px] uppercase tracking-widest text-amber-600 font-black mb-1">Cần giao (Đơn/Kho)</LabelText>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-gray-900">{rs}</span>
                            <span className="text-amber-200 mx-1">/</span>
                            <span className="text-lg font-bold text-amber-600/60">{rs * (sod.conversionRate || 1)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!hasUrgentRequest ? (
                            <button
                                onClick={handleUrgentSubmit}
                                disabled={isSubmitting}
                                className="h-12 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center gap-2 group"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-amber-200 group-hover:fill-white" />}
                                GỬI YÊU CẦU GẤP
                            </button>
                        ) : (
                            <div className="h-12 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                ĐÃ GỬI YÊU CẦU
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* THÔNG BÁO GẤP (Thay cho phần chi tiết) */}
            <div className="px-5 py-3 bg-amber-50/50 border-t border-amber-100 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Đơn hàng tương lai đủ tồn kho lý thuyết - Ưu tiên xử lý giao gấp
                </span>
            </div>
        </div>
    );
};
