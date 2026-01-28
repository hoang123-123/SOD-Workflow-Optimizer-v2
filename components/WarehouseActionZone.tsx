
import React, { useState } from 'react';
import { SOD } from '../types';
import { SectionHeader } from './Typography';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
import { Warehouse, X, PackageCheck, Info, Loader2, Hourglass, CheckCircle2, ListChecks, AlertOctagon, Search, Box, FileText, AlertTriangle, Scale, BellRing, Zap, ZapOff } from 'lucide-react';

interface WarehouseActionZoneProps {
    sod: SOD;
    canAct: boolean;
    recordId: string;
    onAction: (updatedSOD: SOD) => Promise<void>;
    renderBadge: () => React.ReactNode;
    isWorkflowStoppedBySale: boolean;
    isDue: boolean; // [NEW] Kiểm tra đơn đã đến hạn chưa
}

export const WarehouseActionZone: React.FC<WarehouseActionZoneProps> = ({ sod, canAct, recordId, onAction, renderBadge, isWorkflowStoppedBySale, isDue }) => {
    const isWarehouseUser = true; // Component này chỉ hiện nếu có quyền Kho hoặc Admin
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isWarehouseRejected = sod.warehouseConfirmation?.status === 'REJECTED';

    const handleWarehouseAction = async (action: 'CONFIRM' | 'REJECT') => {
        if (action === 'REJECT' && !rejectReason) return;

        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));

            let updatedSOD: SOD;

            if (action === 'CONFIRM') {
                // --- GỌI BRAIN: RULE WH_CONFIRM ---
                updatedSOD = await executeBusinessRule('WH_CONFIRM', sod, recordId, {});
            } else {
                // --- GỌI BRAIN: RULE WH_REJECT ---
                updatedSOD = await executeBusinessRule('WH_REJECT', sod, recordId, { reason: rejectReason });
            }

            await onAction(updatedSOD);
            setIsRejecting(false);

        } catch (error) {
            console.error("Warehouse Action Error:", error);
            alert("Lỗi xử lý kho.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUrgentResponse = async (status: 'ACCEPTED' | 'REJECTED') => {
        setIsSubmitting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 600));
            const ruleId = status === 'ACCEPTED' ? 'WH_URGENT_ACCEPT' : 'WH_URGENT_REJECT';
            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {});
            await onAction(updatedSOD);
        } catch (error) {
            console.error("Urgent Response Error:", error);
            alert("Lỗi phản hồi đơn gấp.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate display values
    // [RULE CHANGE] Nếu đơn Đủ hàng đến hạn, mặc định số lượng xuất = số lượng đặt
    const qtyToShip = sod.saleDecision?.quantity || sod.qtyOrdered;
    const unitName = sod.unitOrderName || 'SP';

    return (
        <div className={`relative rounded-xl p-6 border transition-all flex flex-col ${canAct ? 'bg-white border-indigo-200 shadow-lg' : 'bg-gray-50 border-gray-200'}`}>
            <SectionHeader
                icon={Warehouse}
                title="Xử lý Kho (Logistics)"
                isActive={canAct}
                rightElement={renderBadge()}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-6 pb-4 border-b border-gray-200">
                <Warehouse className="w-4 h-4 text-indigo-500" />
                <span>Kho xuất: <strong className="text-gray-700">{sod.warehouseLocation || 'Kho Dataverse'}</strong></span>
            </div>

            {isWorkflowStoppedBySale ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Quy trình đã kết thúc.</span>
                </div>
            ) : (
                <div className="flex flex-col flex-1">
                    {/* [NEW] Urgent Request Handling */}
                    {sod.urgentRequest?.status === 'PENDING' && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <Zap className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <span className="font-bold text-amber-800 block mb-1 uppercase tracking-tight text-xs">Yêu cầu giao gấp từ Sale</span>
                                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                        Sale yêu cầu soạn hàng ngay dù chưa đến hạn giao dự kiến. Vui lòng kiểm tra tồn kho vật lý và phản hồi.
                                    </p>
                                </div>
                            </div>
                            {/* [NEW] Order Details */}
                            <div className="bg-white rounded-lg border border-amber-100 p-3">
                                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Thông tin đơn hàng</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tight">Số lượng đơn</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-gray-800">{sod.qtyOrdered - sod.qtyDelivered}</span>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">{sod.unitOrderName || 'SP'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-amber-600 uppercase font-bold tracking-tight">Số theo Kho</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-amber-700">{Math.round((sod.qtyOrdered - sod.qtyDelivered) * (sod.conversionRate || 1))}</span>
                                            <span className="text-[10px] font-bold text-amber-600 uppercase">{sod.unitWarehouseName || 'SP'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleUrgentResponse('ACCEPTED')}
                                    disabled={isSubmitting}
                                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    CHẤP NHẬN
                                </button>
                                <button
                                    onClick={() => handleUrgentResponse('REJECTED')}
                                    disabled={isSubmitting}
                                    className="py-2.5 px-4 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ZapOff className="w-4 h-4" />}
                                    TỪ CHỐI
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col flex-1">
                        {/* READ ONLY VIEW */}
                        {!canAct && sod.warehouseConfirmation && (
                            <div className={`p-4 rounded-xl border text-sm ${isWarehouseRejected ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${isWarehouseRejected ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {isWarehouseRejected ? <X className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
                                    </div>
                                    <span className={`font-bold uppercase tracking-tight ${isWarehouseRejected ? 'text-red-700' : 'text-blue-700'}`}>
                                        {isWarehouseRejected ? 'Đã TỪ CHỐI xuất hàng' : 'Đã XÁC NHẬN xuất hàng'}
                                    </span>
                                </div>

                                {!isWarehouseRejected && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Đã thông báo Sale (Kết quả xuất)</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                                            <ListChecks className="w-3.5 h-3.5" />
                                            <span>Đã gửi Lệnh soạn hàng (Picking Dept)</span>
                                        </div>
                                    </div>
                                )}

                                {isWarehouseRejected && sod.warehouseConfirmation.reason && (
                                    <div className="mt-3 text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                                        <strong className="uppercase font-bold block mb-1 tracking-tighter">Lý do từ chối:</strong> {sod.warehouseConfirmation.reason}
                                    </div>
                                )}
                                <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-4 pl-12">
                                    {new Date(sod.warehouseConfirmation.timestamp).toLocaleString()}
                                </div>
                            </div>
                        )}

                        {/* ACTION VIEW */}
                        {canAct && (
                            <div className="flex flex-col gap-6 mt-2">
                                <div className="p-5 bg-indigo-50 text-gray-900 text-sm rounded-xl border border-indigo-200 shadow-sm flex items-start gap-4">
                                    <div className="p-2.5 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                                        <Info className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold uppercase tracking-tight text-indigo-700 mb-2">
                                            {sod.saleDecision ? 'Sale đã chốt phương án Giao hàng' : 'Đơn hàng Đủ tồn kho (Auto-Approved)'}
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-gray-500 text-xs text-nowrap">Yêu cầu xuất:</span>
                                            <strong className="text-2xl font-black text-gray-900">{qtyToShip}</strong>
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 uppercase">{unitName}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-indigo-600 mt-3 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            DỰA TRÊN SỐ LIỆU KIỂM KÊ THỰC TẾ
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    {!isRejecting ? (
                                        <div className="flex flex-col gap-4">
                                            {sod.warehouseVerification && !sod.saleDecision && (
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                                    <div className="text-xs text-amber-800 font-medium">
                                                        Vui lòng chờ Sale phản hồi báo cáo sai lệch trước khi thực hiện xuất kho.
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`grid ${isDue ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                                                {isDue && (
                                                    <button
                                                        onClick={() => setIsRejecting(true)}
                                                        className="h-14 px-6 text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                                                    >
                                                        Báo tỷ lệ lệch
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleWarehouseAction('CONFIRM')}
                                                    disabled={isSubmitting || (!!sod.warehouseVerification && !sod.saleDecision)}
                                                    className="h-14 px-6 bg-indigo-500 text-white hover:bg-indigo-600 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PackageCheck className="w-5 h-5" />}
                                                    {isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN XUẤT KHO'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in zoom-in-95 duration-300 bg-red-50 p-5 rounded-xl border border-red-200 shadow-md">
                                            <label className="block text-[10px] font-bold text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <AlertOctagon className="w-4 h-4" />
                                                LÝ DO TỪ CHỐI / BÁO LỖI <span className="text-red-500 text-base">*</span>
                                            </label>
                                            <textarea
                                                className="w-full text-sm font-bold p-4 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px] bg-white text-gray-900 placeholder-gray-400 shadow-sm resize-none transition-all mb-4"
                                                placeholder="Nhập chi tiết lý do..."
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setIsRejecting(false)}
                                                    className="h-12 px-4 text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
                                                >
                                                    Hủy bỏ
                                                </button>
                                                <button
                                                    onClick={() => handleWarehouseAction('REJECT')}
                                                    disabled={!rejectReason || isSubmitting}
                                                    className="h-12 px-4 bg-red-600 text-white hover:bg-red-700 text-[10px] font-bold uppercase tracking-widest rounded-lg disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "GỬi BÁO CÁO LỖI"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!canAct && !sod.warehouseConfirmation && (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center py-10">
                                    <Hourglass className="w-8 h-8 text-indigo-400 mx-auto mb-4 animate-pulse" />
                                    <span>Đang chờ Kho xử lý...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
