import React, { useState } from 'react';
import { SOD, INDUSTRY_FACTORY } from '../../types';
import {
    AlertTriangle,
    ChevronDown,
    Package,
    ArrowRightLeft,
    Clock,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { executeBusinessRule } from '../../logic/ruleEngine';

interface SaleDiscrepancyCardProps {
    sod: SOD;
    recordId: string;
    onUpdate: (updatedSOD: SOD) => void;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
    customerIndustryType?: number;
}

/**
 * [UPDATED] SALE DISCREPANCY CARD - Hiển thị request sai lệch từ Kho
 * UI rút gọn theo yêu cầu: Bỏ thực tế kho/thiếu hụt, đổi tên Đáp ứng thành Số lượng đơn
 * Thêm nút hành động: Xác nhận (Giao) & Từ chối (Hủy)
 */
export const SaleDiscrepancyCard: React.FC<SaleDiscrepancyCardProps> = ({
    sod,
    recordId,
    onUpdate,
    onSaveState,
    customerIndustryType
}) => {
    const [isExpanded, setIsExpanded] = useState(true); // Mặc định mở để thấy nút hành động
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const wv = sod.warehouseVerification;
    if (!wv) return null;

    // [FIX] Dữ liệu 100% từ báo cáo sai lệch của Kho (history)
    const requestedQtyON = wv.requestedQty || 0; // Số lượng Kho báo (Đơn vị Đơn - ON)
    const requestedQtyWH = wv.actualQty || 0;    // Số lượng Kho báo (Đơn vị Kho - WH)

    const N_ON = wv.requestedNeedON || (sod.qtyOrderRemainingON || 0); // Nhu cầu gốc ON
    const N_WH = wv.requestedNeedWH || (sod.qtyOrderRemainingWH || 0); // Nhu cầu gốc WH

    const discrepancyType = wv.discrepancyType;
    const createdByDept = wv.createdByDept || 'Kho';
    const timestamp = wv.timestamp ? new Date(wv.timestamp).toLocaleString('vi-VN') : '';

    const unitOrder = sod.unitOrderName || 'SP';
    const isFactory = customerIndustryType === INDUSTRY_FACTORY;

    // Xác định loại sai lệch
    const getDiscrepancyLabel = () => {
        if (discrepancyType === 'CONVERSION_RATE') return 'Lệch quy đổi';
        if (discrepancyType === 'INVENTORY') return 'Lệch tồn kho';
        return 'Sai lệch';
    };

    // --- HANDLER: XÁC NHẬN (GIAO) ---
    const handleAccept = async () => {
        setIsSubmitting('ACCEPT');
        try {
            const rulePrefix = (sod.deliveryCount || 0) === 0 ? 'A' : 'B';
            const ruleId = `${rulePrefix}1`; // Case 1: SHIP

            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {
                quantity: requestedQtyON,
                isFactory: isFactory
            });

            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Accept Discrepancy Error:", error);
            alert("Lỗi khi xác nhận giao hàng.");
        } finally {
            setIsSubmitting(null);
        }
    };

    // --- HANDLER: TỪ CHỐI (HỦY) ---
    const handleReject = async () => {
        if (!confirm("Bạn có chắc chắn muốn TỪ CHỐI báo cáo sai lệch này? (Yêu cầu Kho kiểm tra lại)")) return;
        setIsSubmitting('REJECT');
        try {
            const rulePrefix = (sod.deliveryCount || 0) === 0 ? 'A' : 'B';
            const ruleId = `${rulePrefix}4`; // [UPDATED] Use Rule A4/B4 for Reject Discrepancy (NOT Cancel)

            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {
                quantity: N_ON // Giữ số lượng nhu cầu gốc (dùng để báo notify)
            });

            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Reject Discrepancy Error:", error);
            alert("Lỗi khi từ chối báo cáo.");
        } finally {
            setIsSubmitting(null);
        }
    };

    return (
        <div className="bg-white border-2 border-indigo-100 rounded-[2rem] transition-all overflow-hidden shadow-sm hover:shadow-md mb-6 group">
            {/* Header - Chứa các nút hành động mới */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
            >
                {/* Left: Product Info */}
                <div className="flex items-center gap-5 flex-1">
                    <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shrink-0 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-extrabold text-gray-600 text-sm leading-tight truncate uppercase tracking-tight">
                            {sod.detailName}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg border border-gray-200 uppercase">
                                {sod.product.sku}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions in Header (New Design) */}
                <div className="flex items-center gap-4 shrink-0">
                    {sod.saleDecision ? (
                        <div className="flex items-center gap-2">
                            {sod.saleDecision.action === 'SHIP_PARTIAL' || sod.saleDecision.action === 'SHIP_AND_CLOSE' ? (
                                <div className="h-10 px-4 bg-emerald-50 text-[#00966d] border border-emerald-200 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                    <Check className="w-4 h-4" strokeWidth={4} />
                                    ĐÃ XÁC NHẬN
                                </div>
                            ) : sod.saleDecision.action === 'REJECT_REPORT' ? (
                                <div className="h-10 px-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                    <X className="w-4 h-4" strokeWidth={4} />
                                    ĐÃ TỪ CHỐI
                                </div>
                            ) : (
                                <div className="h-10 px-4 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                    <Clock className="w-4 h-4" />
                                    {sod.saleDecision.action}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* [NEW] Accept Button - Green Icon Design */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccept();
                                }}
                                disabled={!!isSubmitting}
                                className="w-12 h-12 rounded-2xl bg-[#00966d] text-white flex items-center justify-center shadow-lg shadow-emerald-100 hover:bg-[#007a58] transition-all active:scale-95 disabled:opacity-50"
                                title="Xác nhận"
                            >
                                {isSubmitting === 'ACCEPT' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" strokeWidth={4} />}
                            </button>

                            {/* [NEW] Reject Button - Pink Square Design */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleReject();
                                }}
                                disabled={!!isSubmitting}
                                className="w-12 h-12 rounded-2xl bg-rose-50 border-2 border-rose-100 text-rose-500 flex items-center justify-center transition-all hover:bg-rose-100 hover:border-rose-200 active:scale-95 disabled:opacity-50"
                                title="Từ chối"
                            >
                                {isSubmitting === 'REJECT' ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-6 h-6" strokeWidth={3} />}
                            </button>
                        </>
                    )}

                    {/* Chevron for Expand/Collapse (Keep but make it less prominent) */}
                    <div className={`ml-4 p-2.5 rounded-xl transition-all ${isExpanded ? 'bg-indigo-50 text-indigo-400' : 'bg-gray-100 text-gray-400 rotate-180'}`}>
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Expanded Content - No more action buttons here */}
            {isExpanded && (
                <div className="px-8 pb-8 border-t border-indigo-50">
                    <div className="bg-indigo-50/50 rounded-[1.5rem] p-6 mt-4">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Chi tiết báo cáo từ Kho
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Số lượng đơn hàng (Nhu cầu gốc) */}
                            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                <span className="text-[11px] uppercase tracking-widest font-black text-gray-400 block mb-2">Số lượng đơn hàng (Gốc)</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-gray-900">{N_ON}</span>
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200 uppercase">{unitOrder}</span>
                                    <span className="text-gray-300 mx-1">/</span>
                                    <span className="text-xl font-black text-gray-400">{N_WH}</span>
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 uppercase">{sod.unitWarehouseName || 'WH'}</span>
                                </div>
                            </div>

                            {/* Số lượng đơn (Số lượng kho nhập) */}
                            <div className="bg-indigo-100/50 rounded-2xl p-4 border border-indigo-200 shadow-sm group-hover:bg-indigo-100 transition-colors">
                                <span className="text-[11px] uppercase tracking-widest font-black text-indigo-600 block mb-2">Số lượng đơn (Kho nhập thực tế)</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-black text-indigo-700">{requestedQtyON}</span>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 uppercase">{unitOrder}</span>
                                    <span className="text-indigo-400 mx-1">/</span>
                                    <span className="text-xl font-black text-indigo-700">{requestedQtyWH}</span>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 uppercase">{sod.unitWarehouseName || 'WH'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-6 mt-6 text-xs text-gray-500 font-bold border-t border-indigo-100 pt-4">
                            <div className="flex items-center gap-1.5">
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Loại: <strong className="text-gray-700 underline decoration-indigo-200">{getDiscrepancyLabel()}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />
                                <span>Bộ phận: <strong className="text-gray-700">{createdByDept}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{timestamp}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hướng dẫn */}
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-700 font-medium">
                        <strong>💡 Hướng dẫn:</strong> Kho báo số liệu thực tế khác hệ thống. Click <strong>CHẤP NHẬN</strong> để giao theo số lượng Kho báo, hoặc nút <strong>X</strong> để hủy dòng hàng này.
                    </div>
                </div>
            )}
        </div>
    );
};
