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
    const isFactory = Number(customerIndustryType) === INDUSTRY_FACTORY;

    // [UPDATED] Xác định loại sai lệch - Phân biệt rõ ràng 2 loại
    const getDiscrepancyLabel = () => {
        if (discrepancyType === 'CONVERSION_RATE') return 'Lệch quy đổi';
        if (discrepancyType === 'INVENTORY') return 'Lệch tồn kho';
        if (discrepancyType === 'SALE_REQUEST') return 'Yêu cầu sửa số';
        if (discrepancyType === 'WAREHOUSE_SPEC') return 'Quy cách kho';
        return 'Sai lệch';
    };

    // [NEW] Check nếu là Kho yêu cầu sửa số (khác với báo lệch kho)
    const isRequestCorrection = discrepancyType === 'SALE_REQUEST';

    // --- HANDLER: XÁC NHẬN (GIAO hoặc ĐỒNG Ý SỬA SỐ) ---
    const handleAccept = async () => {
        setIsSubmitting('ACCEPT');
        try {
            const rulePrefix = (sod.deliveryCount || 0) === 0 ? 'A' : 'B';

            // [UPDATED] Phân biệt rule dựa trên loại request
            // - SALE_REQUEST: Dùng A5/B5 (TRIGGER_SALE_ACCEPT_CORRECTION) -> Gửi Automate sửa số
            // - Khác: Dùng A1/B1 (TRIGGER_SALE_SHIPMENT) -> Giao hàng trực tiếp
            const ruleId = isRequestCorrection
                ? `${rulePrefix}5`  // A5 hoặc B5: Đồng ý sửa số -> Gửi Automate
                : `${rulePrefix}1`; // A1 hoặc B1: Giao hàng

            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {
                quantity: requestedQtyON,
                isFactory: isFactory
            });

            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Accept Discrepancy Error:", error);
            alert(isRequestCorrection ? "Lỗi khi xác nhận sửa số." : "Lỗi khi xác nhận giao hàng.");
        } finally {
            setIsSubmitting(null);
        }
    };

    // --- HANDLER: CHỜ HÀNG (WAIT) - Chỉ cho báo lệch kho, không áp dụng cho SALE_REQUEST ---
    const handleWait = async () => {
        setIsSubmitting('WAIT');
        try {
            const rulePrefix = (sod.deliveryCount || 0) === 0 ? 'A' : 'B';
            const ruleId = `${rulePrefix}2`; // A2 hoặc B2

            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {});

            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Wait Discrepancy Error:", error);
            alert("Lỗi khi xác nhận chờ hàng.");
        } finally {
            setIsSubmitting(null);
        }
    };

    // --- HANDLER: HỦY DÒNG (CANCEL) - Chỉ cho báo lệch kho ---
    const handleCancel = async () => {
        if (!confirm("Bạn có chắc chắn muốn HỦY hoàn toàn dòng hàng này?")) return;
        setIsSubmitting('CANCEL');
        try {
            const rulePrefix = (sod.deliveryCount || 0) === 0 ? 'A' : 'B';
            const ruleId = `${rulePrefix}3`; // A3 hoặc B3

            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {
                quantity: N_ON // Hủy toàn bộ nhu cầu còn lại
            });

            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Cancel Discrepancy Error:", error);
            alert("Lỗi khi hủy đơn hàng.");
        } finally {
            setIsSubmitting(null);
        }
    };

    // --- HANDLER: TỪ CHỐI (KIỂM LẠI hoặc TỪ CHỐI SỬA SỐ) ---
    const handleReject = async () => {
        const confirmMessage = isRequestCorrection
            ? "Bạn có chắc chắn muốn TỪ CHỐI yêu cầu sửa số? (Kho sẽ cần kiểm tra lại)"
            : "Bạn có chắc chắn muốn TỪ CHỐI báo cáo sai lệch này? (Yêu cầu Kho kiểm tra lại)";

        if (!confirm(confirmMessage)) return;
        setIsSubmitting('REJECT');
        try {
            const rulePrefix = (sod.deliveryCount || 0) === 0 ? 'A' : 'B';

            // [UPDATED] Phân biệt rule dựa trên loại request
            // - SALE_REQUEST: Dùng A6/B6 (TRIGGER_SALE_REJECT_CORRECTION)
            // - Khác: Dùng A4/B4 (TRIGGER_SALE_REJECT_REPORT)
            const ruleId = isRequestCorrection
                ? `${rulePrefix}6`  // A6 hoặc B6: Từ chối sửa số
                : `${rulePrefix}4`; // A4 hoặc B4: Từ chối báo cáo sai lệch

            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {
                quantity: N_ON // Giữ số lượng nhu cầu gốc (dùng để báo notify)
            });

            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Reject Discrepancy Error:", error);
            alert(isRequestCorrection ? "Lỗi khi từ chối yêu cầu sửa số." : "Lỗi khi từ chối báo cáo.");
        } finally {
            setIsSubmitting(null);
        }
    };

    return (
        <div className="bg-white border border-indigo-100 rounded-xl transition-all overflow-hidden hover:border-indigo-200">
            {/* Header - Chứa các nút hành động mới */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
                {/* Left: Product Info */}
                <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm leading-tight truncate">
                            {sod.detailName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 text-[10px]">
                                {sod.product.sku}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions in Header (New Design) */}
                <div className="flex items-center gap-3 shrink-0">
                    {sod.saleDecision ? (
                        <div className="flex items-center gap-2">
                            {sod.saleDecision.action === 'SHIP_PARTIAL' || sod.saleDecision.action === 'SHIP_AND_CLOSE' ? (
                                <div className="h-8 px-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    Đã giao
                                </div>
                            ) : sod.saleDecision.action === 'WAIT_ALL' ? (
                                <div className="h-8 px-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" strokeWidth={3} />
                                    Đã chờ
                                </div>
                            ) : sod.saleDecision.action === 'CANCEL_ORDER' ? (
                                <div className="h-8 px-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                                    Đã hủy
                                </div>
                            ) : sod.saleDecision.action === 'REJECT_REPORT' ? (
                                <div className="h-8 px-3 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                    <ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={3} />
                                    Kiểm lại
                                </div>
                            ) : (
                                <div className="h-8 px-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {sod.saleDecision.action}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            {/* 1. Nút Xác nhận / Giao */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleAccept(); }}
                                disabled={!!isSubmitting}
                                className={`h-8 px-3 rounded-lg text-white flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 font-bold text-[10px] uppercase tracking-wide ${isRequestCorrection
                                        ? 'bg-blue-500 hover:bg-blue-600'
                                        : 'bg-emerald-500 hover:bg-emerald-600'
                                    }`}
                                title={isRequestCorrection ? "Đồng ý sửa số lượng" : "Xác nhận giao"}
                            >
                                {isSubmitting === 'ACCEPT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                <span>{isRequestCorrection ? 'Đồng ý' : 'Giao'}</span>
                            </button>

                            {/* 2. Nút Chờ (Wait) - ẨN nếu là SALE_REQUEST */}
                            {!isRequestCorrection && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleWait(); }}
                                    disabled={!!isSubmitting}
                                    className="h-8 px-3 rounded-lg bg-amber-500 text-white flex items-center gap-1.5 hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 font-bold text-[10px] uppercase tracking-wide"
                                    title="Chờ hàng về"
                                >
                                    {isSubmitting === 'WAIT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" strokeWidth={3} />}
                                    <span>Chờ</span>
                                </button>
                            )}

                            {/* 3. Nút Từ chối / Kiểm lại */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleReject(); }}
                                disabled={!!isSubmitting}
                                className={`h-8 px-3 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 font-bold text-[10px] uppercase tracking-wide ${isRequestCorrection
                                        ? 'bg-rose-500 text-white hover:bg-rose-600'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                title={isRequestCorrection ? "Từ chối yêu cầu sửa số" : "Yêu cầu kiểm tra lại"}
                            >
                                {isSubmitting === 'REJECT' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isRequestCorrection ? <X className="w-3.5 h-3.5" strokeWidth={3} /> : <ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={3} />)}
                                <span>{isRequestCorrection ? 'Từ chối' : 'Kiểm lại'}</span>
                            </button>
                        </div>
                    )}

                    {/* Chevron for Expand/Collapse */}
                    <div className={`p-1 rounded-md transition-all ${isExpanded ? 'text-indigo-600 rotate-0' : 'text-gray-400 rotate-180'}`}>
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Expanded Content - No more action buttons here */}
            {isExpanded && (
                <div className="px-3 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <h4 className={`text-[10px] font-bold uppercase tracking-wide mb-3 flex items-center gap-1.5 ${isRequestCorrection ? 'text-blue-600' : 'text-indigo-600'}`}>
                            <Package className="w-3.5 h-3.5" />
                            {isRequestCorrection ? '📝 Kho yêu cầu sửa số lượng' : '⚠️ Kho báo lệch tồn kho'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Số lượng đơn hàng (Nhu cầu gốc) */}
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 block mb-1">Số lượng đơn hàng (Gốc)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-gray-900">{N_ON}</span>
                                    <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 uppercase">{unitOrder}</span>
                                    <span className="text-gray-300 mx-0.5">/</span>
                                    <span className="text-base font-semibold text-gray-500">{N_WH}</span>
                                    <span className="text-[9px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase">{sod.unitWarehouseName || 'WH'}</span>
                                </div>
                            </div>

                            {/* Số lượng đơn (Số lượng kho nhập) */}
                            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-600 block mb-1">Số lượng thực tế Kho nhập</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-indigo-700">{requestedQtyON}</span>
                                    <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 uppercase">{unitOrder}</span>
                                    <span className="text-indigo-300 mx-0.5">/</span>
                                    <span className="text-base font-semibold text-indigo-500">{requestedQtyWH}</span>
                                    <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 uppercase">{sod.unitWarehouseName || 'WH'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500 font-medium border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-1">
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Loại: <strong className="text-gray-700">{getDiscrepancyLabel()}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>Bộ phận: <strong className="text-gray-700">{createdByDept}</strong></span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{timestamp}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hướng dẫn - Khác nhau theo loại */}
                    <div className={`p-3 rounded-lg text-[10px] font-medium ${isRequestCorrection ? 'bg-blue-50 border border-blue-100 text-blue-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
                        {isRequestCorrection ? (
                            <><strong>📝</strong> Kho yêu cầu sửa số lượng trên đơn hàng. Click <strong>GIAO</strong> để đồng ý sửa số, hoặc <strong>KIỂM LẠI</strong> để yêu cầu Kho kiểm tra lại.</>
                        ) : (
                            <><strong>⚠️</strong> Kho báo số liệu thực tế khác hệ thống (lệch tồn kho). Click <strong>GIAO</strong> để xuất theo số Kho báo, hoặc <strong>KIỂM LẠI</strong> để yêu cầu kiểm tra.</>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
