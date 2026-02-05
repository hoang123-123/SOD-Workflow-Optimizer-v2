import React, { useState, useRef, useEffect } from 'react';
import { SOD, SODStatus, UserRole } from '../types';
import { StatusBadge } from './Badge';
import { SectionHeader, LabelText, ValueText } from './Typography';
import { SaleActionZone } from './SaleActionZone';
import { SourceActionZone } from './SourceActionZone';
import { WarehouseActionZone } from './WarehouseActionZone';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
import { SaleShortageCard } from './Sale/SaleShortageCard';
import { SaleUrgentCard } from './Sale/SaleUrgentCard';
import { SaleDiscrepancyCard } from './Sale/SaleDiscrepancyCard'; // [NEW] Request sai lệch từ Kho
import { WarehouseRequestCard } from './Warehouse/WarehouseRequestCard';
// [DEPRECATED] import { WarehouseActionCard } from './Warehouse/WarehouseActionCard';
import { WarehouseUrgentCard } from './Warehouse/WarehouseUrgentCard'; // [NEW]
import {
    ChevronDown,
    ChevronUp,
    Box,
    UserCircle2,
    Loader2,
    BellRing,
    CheckCircle2,
    Forward,
    Ban,
    PackageCheck,
    ShieldAlert,
    Info,
    ClipboardList,
    Save,
    AlertOctagon,
    Scale,
    Search,
    Hourglass,
    FileText,
    AlertTriangle,
    Calendar,
    Zap,
    ZapOff,
    Check,
    X
} from 'lucide-react';

interface SODCardProps {
    sod: SOD;
    currentRole: UserRole;
    onUpdate: (updatedSOD: SOD) => void;
    onNotifySale?: (sod: SOD, recordId: string) => Promise<boolean>;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
    saleId?: string | null;
    customerId?: string;
    recordId: string;
    customerIndustryType?: number; // [NEW] Ngành nghề khách hàng: 191920000 = Nhà máy
    currentDepartment?: string; // [NEW] Phòng ban hiện tại
    isRequestCreator?: boolean; // [NEW] True = bộ phận này TẠO request (history null), False = XỬ LÝ request
}

export const SODCard: React.FC<SODCardProps> = ({ sod, currentRole, onUpdate, onNotifySale, onSaveState, saleId, recordId, customerIndustryType, currentDepartment, isRequestCreator }) => {
    const [isUrgentSubmitting, setIsUrgentSubmitting] = useState<boolean>(false);
    const [isWarehouseSubmitting, setIsWarehouseSubmitting] = useState<boolean>(false); // [NEW] For Accept/Reject on Header
    const cardRef = useRef<HTMLDivElement>(null);

    // Notification Loading State for Warehouse
    const [isNotifying, setIsNotifying] = useState(false);

    // --- LOGIC CHECK TRẠNG THÁI HÀNG ---
    const rs = sod.qtyOrdered - sod.qtyDelivered;
    const safeAvailable = sod.qtyAvailable || 0;
    const sq = Math.max(0, rs - safeAvailable);
    const isSufficient = sq === 0;

    // --- STATE CHO COLLAPSIBLE SECTIONS ---
    // [RULE CHANGE] Mặc định mở nếu Đủ hàng, đóng nếu Thiếu hàng
    const [isGeneralExpanded, setIsGeneralExpanded] = useState<boolean>(isSufficient);
    const [isDiscoveryExpanded, setIsDiscoveryExpanded] = useState<boolean>(isSufficient);
    const [isWorkflowExpanded, setIsWorkflowExpanded] = useState<boolean>(isSufficient);

    // --- STATE CHO WAREHOUSE DISCOVERY (KIỂM ĐẾM) ---
    const [inputWarehouseQty, setInputWarehouseQty] = useState<string>('0');
    const [inputOrderQty, setInputOrderQty] = useState<string>('0');
    const [discrepancyType, setDiscrepancyType] = useState<'INVENTORY' | 'CONVERSION_RATE'>('INVENTORY');

    // --- LOGIC GỬI YÊU CẦU GẤP TỪ HEADER (SALE) ---
    const handleUrgentSubmit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isUrgentSubmitting) return;

        setIsUrgentSubmitting(true);
        try {
            const updatedSOD = await executeBusinessRule('SALE_URGENT', sod, recordId, {});
            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Urgent Header Submit Error:", error);
            alert("Lỗi gửi yêu cầu giao gấp.");
        } finally {
            setIsUrgentSubmitting(false);
        }
    };

    // --- LOGIC PHẢN HỒI ĐƠN GẤP TỪ HEADER (KHO) ---
    const handleUrgentResponse = async (status: 'ACCEPTED' | 'REJECTED', e: React.MouseEvent) => {
        e.stopPropagation();
        setIsWarehouseSubmitting(true);
        try {
            const ruleId = status === 'ACCEPTED' ? 'WH_URGENT_ACCEPT' : 'WH_URGENT_REJECT';
            const updatedSOD = await executeBusinessRule(ruleId, sod, recordId, {});
            onUpdate(updatedSOD);
            if (onSaveState) await onSaveState(updatedSOD);
        } catch (error) {
            console.error("Urgent Header Response Error:", error);
            alert("Lỗi phản hồi đơn gấp.");
        } finally {
            setIsWarehouseSubmitting(false);
        }
    };

    const deliveryCount = sod.deliveryCount || 0;
    const isSourcePlanConfirmed = sod.sourcePlan?.status === 'CONFIRMED';
    const isWarehouseConfirmed = sod.warehouseConfirmation?.status === 'CONFIRMED';
    const isWarehouseRejected = sod.warehouseConfirmation?.status === 'REJECTED';

    const handleActionComplete = async (updatedSOD: SOD) => {
        onUpdate(updatedSOD);
        if (onSaveState) await onSaveState(updatedSOD);
    }

    // --- WAREHOUSE DISCOVERY HANDLER VIA BRAIN ---
    const handleWarehouseDiscoverySubmit = async () => {
        setIsNotifying(true);
        try {
            const qtyAvailReal = parseFloat(inputWarehouseQty.replace(',', '.')) || 0;
            const qtyOrdReal = parseFloat(inputOrderQty.replace(',', '.')) || 0;

            const updatedSod = await executeBusinessRule(
                'WH_REPORT',
                sod,
                recordId,
                {
                    actualQty: qtyAvailReal,
                    requestedQty: qtyOrdReal,
                    discrepancyType: discrepancyType,
                    dept: currentDepartment,
                    actor: currentRole
                }
            );

            onUpdate(updatedSod);
            if (onSaveState) await onSaveState(updatedSod);

        } catch (error) {
            console.error("Warehouse submit error", error);
        } finally {
            setIsNotifying(false);
        }
    }

    // Helper to format Quantity
    const formatDualQty = (valueOrder: number, isHighlighted: boolean = false, overrideColorClass?: string) => {
        const rate = sod.conversionRate && sod.conversionRate > 0 ? sod.conversionRate : 1;
        const valueWarehouse = parseFloat((valueOrder * rate).toFixed(2));
        const uOrder = sod.unitOrderName || 'Đơn vị';
        const uWarehouse = sod.unitWarehouseName || 'Đơn vị';

        const textColor = overrideColorClass ? overrideColorClass : (isHighlighted ? 'text-rose-600' : 'text-slate-800');

        return (
            <div className="flex flex-col items-start">
                <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-bold ${textColor}`}>
                            {valueOrder}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            {uOrder}
                        </span>
                    </div>
                    <div className="h-5 w-px bg-gray-300"></div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-bold ${textColor}`}>
                            {valueWarehouse}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                            {uWarehouse}
                        </span>
                    </div>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1.5 uppercase tracking-wider">
                    Số lượng: Đơn hàng / Kho
                </div>
            </div>
        );
    };

    // --- LOGIC CHECK DATE ---
    const isDateDue = () => {
        if (!sod.expectedDeliveryDate) return true;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        return sod.expectedDeliveryDate <= todayStr;
    };

    // --- LOGIC ĐƠN GẤP ---
    const isUrgentPotential = (sod.theoreticalStock || 0) >= (sod.requiredProductQty || 0) * (sod.conversionRate || 1);
    const isFutureOrder = !isDateDue();
    const isUrgentPhase = isUrgentPotential && isFutureOrder;
    const hasUrgentRequest = !!sod.urgentRequest;
    const isUrgentPending = sod.urgentRequest?.status === 'PENDING';

    // --- LOGIC PHÂN QUYỀN (ROLE BASED LOGIC) ---
    const isAdmin = currentRole === UserRole.ADMIN;
    const isWarehouseUser = currentRole === UserRole.WAREHOUSE || isAdmin;
    const isSaleUser = currentRole === UserRole.SALE || isAdmin;
    const isSourceUser = currentRole === UserRole.SOURCE || isAdmin;

    // [NEW] RENDER CHO SALE ROLE
    if (isSaleUser && !isAdmin) {
        if (isUrgentPhase || hasUrgentRequest) {
            return (
                <SaleUrgentCard
                    sod={sod}
                    recordId={recordId}
                    onUpdate={onUpdate}
                    onSaveState={onSaveState}
                />
            );
        }

        // [NEW] Kho đã báo sai lệch → CHỈ hiện card "Request từ Kho", KHÔNG hiện SaleShortageCard
        // Vì: "Request sai lệch" ≠ "Thiếu hàng" (đây là 2 loại request khác nhau)
        const hasWarehouseDiscrepancy = !!sod.warehouseVerification;

        if (hasWarehouseDiscrepancy) {
            // [FIX] Kho tạo request sai lệch → Sale CHỈ thấy card này để xử lý
            return (
                <SaleDiscrepancyCard
                    sod={sod}
                    recordId={recordId}
                    onUpdate={onUpdate}
                    onSaveState={onSaveState}
                    customerIndustryType={customerIndustryType}
                />
            );
        }

        // Đơn thiếu hàng thông thường (hệ thống báo thiếu từ đầu)
        return (
            <SaleShortageCard
                sod={sod}
                recordId={recordId}
                onUpdate={onUpdate}
                onSaveState={onSaveState}
                customerIndustryType={customerIndustryType}
            />
        );
    }

    // [NEW] RENDER CHO WAREHOUSE ROLE
    if (isWarehouseUser && !isAdmin) {
        // Card Đơn gấp: Hiển thị khi có urgentRequest (cả PENDING lẫn đã xử lý)
        if (hasUrgentRequest) {
            // [NEW] Card gấp chuyên biệt (Ảnh 3)
            return (
                <WarehouseUrgentCard
                    sod={sod}
                    recordId={recordId}
                    onUpdate={onUpdate}
                    onSaveState={onSaveState}
                />
            );
        }

        // [FIX] Logic mới: Xét theo nguồn tạo request
        // - Kho + history null (isRequestCreator) = Kho TẠO request sai lệch -> hiện card "Báo cáo sai lệch"
        // - Kho + history có data = Kho XỬ LÝ request từ Sale -> hiện card "Yêu cầu xuất kho"

        const hasDiscrepancyReport = !!sod.warehouseVerification;
        console.log('[DEBUG] SOD warehouseVerification:', sod.id, sod.warehouseVerification, 'hasDiscrepancyReport:', hasDiscrepancyReport, 'isRequestCreator:', isRequestCreator);
        // [DEPRECATED - 2026-01-29] Các biến dưới đây không còn dùng vì WarehouseActionCard đã bị ẩn
        // const hasSaleShipDecision = sod.saleDecision?.action === 'SHIP_PARTIAL' || sod.saleDecision?.action === 'SHIP_AND_CLOSE';

        // Kho vào app + history null = Kho đang TẠO request sai lệch -> hiện card "Báo cáo sai lệch"
        // Kho vào app + history có data = Kho đang XỬ LÝ request từ Sale -> hiện card "Yêu cầu xuất kho"
        const isWarehouseCreatingRequest = isRequestCreator && isWarehouseUser;

        // [DEPRECATED] Card Xuất kho đã bị ẩn - Kho không còn submit request giao hàng
        // const shouldShowExportCard = !isWarehouseCreatingRequest && !hasDiscrepancyReport && (
        //     (sod.statusFromPlan === 'Đủ' && isDateDue()) ||
        //     hasSaleShipDecision ||
        //     !!sod.warehouseConfirmation
        // );

        // Card Báo cáo sai lệch: Hiện khi Kho TẠO request (history null) HOẶC đã có warehouseVerification
        const shouldShowRequestCard = isWarehouseCreatingRequest || hasDiscrepancyReport;

        return (
            <div className="space-y-6">
                {/* 
                    [DEPRECATED - 2026-01-29] WarehouseActionCard đã bị ẩn
                    Lý do: Kho không còn submit request giao hàng nữa, chỉ còn xử lý đơn gấp.
                    Code giữ lại để có thể bật lại sau này nếu cần.
                    
                    {shouldShowExportCard && (
                        <WarehouseActionCard
                            sod={sod}
                            recordId={recordId}
                            onUpdate={onUpdate}
                            onSaveState={onSaveState}
                        />
                    )}
                */}

                {/* Card Báo cáo sai lệch - Hiện độc lập khi có warehouseVerification */}
                {shouldShowRequestCard && (
                    <WarehouseRequestCard
                        sod={sod}
                        recordId={recordId}
                        onUpdate={onUpdate}
                        onSaveState={onSaveState}
                        currentDepartment={currentDepartment}
                        currentRole={currentRole}
                    />
                )}
            </div>
        );
    }

    const isWarehouseDiscoveryPhase = isWarehouseUser && !sod.saleDecision && !sod.isNotificationSent && (isDateDue() || isAdmin);

    const canSaleAct = isSaleUser && !sod.saleDecision && !sod.urgentRequest && (
        !isSufficient
    );

    const canSourceAct = isSourceUser && sod.status === SODStatus.SHORTAGE_PENDING_SOURCE;

    const canWarehouseAct = isWarehouseUser && !sod.warehouseConfirmation && (
        sod.saleDecision?.action === 'SHIP_PARTIAL' ||
        sod.saleDecision?.action === 'SHIP_AND_CLOSE' || // [NEW] Hỗ trợ SHIP_AND_CLOSE
        (isSufficient && isDateDue()) ||
        sod.urgentRequest?.status === 'ACCEPTED'
    );

    const isWorkflowStoppedBySale = sod.saleDecision?.action === 'CANCEL_ORDER';
    const shouldShowSourceBlock = sod.saleDecision?.action === 'WAIT_ALL';
    const shouldShowWarehouseBlock = sod.saleDecision?.action === 'SHIP_PARTIAL' || sod.saleDecision?.action === 'SHIP_AND_CLOSE' || !!sod.urgentRequest;

    const renderSaleBadge = () => {
        if (!sod.saleDecision) return null;
        if (sod.saleDecision.action === 'SHIP_PARTIAL' || sod.saleDecision.action === 'SHIP_AND_CLOSE')
            return <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm select-none"><CheckCircle2 className="w-3 h-3" /> SALE CHỐT GIAO</span>;
        if (sod.saleDecision.action === 'CANCEL_ORDER') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 uppercase tracking-wide shadow-sm select-none"><Ban className="w-3 h-3" /> SALE CHỐT HỦY</span>;
        if (sod.saleDecision.action === 'WAIT_ALL') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm select-none"><Forward className="w-3 h-3" /> SALE CHỜ HÀNG</span>;
        return null;
    };

    const renderSourceBadge = () => {
        if (isSourcePlanConfirmed && sod.status !== SODStatus.SHORTAGE_PENDING_SOURCE) return <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm select-none"><CheckCircle2 className="w-3 h-3" /> ĐÃ LÊN KẾ HOẠCH</span>;
        return null;
    };
    const renderWarehouseBadge = () => {
        if (isWarehouseConfirmed) return <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wide shadow-sm select-none"><PackageCheck className="w-3 h-3" /> KHO ĐÃ XUẤT</span>;
        if (isWarehouseRejected) return <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 uppercase tracking-wide shadow-sm select-none"><ShieldAlert className="w-3 h-3" /> KHO TỪ CHỐI</span>;
        return null;
    }

    const shouldShowActionZones = canSaleAct || sod.isNotificationSent || !!sod.saleDecision || canWarehouseAct || (sod.urgentRequest?.status === 'PENDING');

    return (
        <div ref={cardRef} className="bg-white border border-gray-200 rounded-2xl transition-all duration-300 overflow-hidden shadow-sm hover:border-gray-300 hover:shadow-md">
            <style>{`
                .date-input-full-trigger { position: relative; }
                .date-input-full-trigger::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>

            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-colors">
                <div className="flex items-start gap-4 flex-1 overflow-hidden">
                    <div className="mt-0.5 p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                        <Box className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900 text-base mb-1 break-words leading-tight">{sod.detailName}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-bold bg-gray-100 px-2 py-0.5 rounded-lg text-indigo-600 border border-gray-200 uppercase tracking-tighter">{sod.product.sku}</span>
                            <span className="truncate">{sod.product.name}</span>
                        </div>
                        {sod.saleDecision && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-600">
                                <UserCircle2 className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-medium">Sale: {
                                    (sod.saleDecision.action === 'SHIP_PARTIAL' || sod.saleDecision.action === 'SHIP_AND_CLOSE') ? 'Giao hàng' :
                                        (sod.saleDecision.action === 'WAIT_ALL') ? 'Chờ hàng' :
                                            (sod.saleDecision.action === 'CANCEL_ORDER') ? 'Hủy đơn' :
                                                'Từ chối báo cáo'
                                }</span>
                            </div>
                        )}
                        {isUrgentPending && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                <Zap className="w-3.5 h-3.5 animate-pulse" />
                                <span className="font-bold uppercase tracking-tight text-[10px]">Đang yêu cầu giao gấp</span>
                            </div>
                        )}
                        {sod.expectedDeliveryDate && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>Ngày giao: {new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-8 shrink-0">
                    <div className="flex flex-col items-end">
                        <LabelText className="mb-0.5 text-gray-500 uppercase tracking-widest text-[9px]">Lần giao</LabelText>
                        <div className="text-xl font-black text-gray-800">{deliveryCount}</div>
                    </div>
                    <div className="h-10 w-px bg-gray-200 hidden md:block"></div>
                    <div className="flex flex-col items-end">
                        <LabelText className="mb-0.5 text-gray-500 uppercase tracking-widest text-[9px]">Cần giao</LabelText>
                        <div className="text-xl font-black text-indigo-600">{rs}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 min-w-[200px] shrink-0">
                    {/* [SALE] Nút gửi yêu cầu gấp */}
                    {isSaleUser && isUrgentPhase && !hasUrgentRequest && (
                        <button
                            onClick={handleUrgentSubmit}
                            disabled={isUrgentSubmitting}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95 group/btn ${isUrgentSubmitting ? 'cursor-wait' : ''}`}
                        >
                            {isUrgentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-600 group-hover/btn:text-white transition-colors" />}
                            <span className="text-[10px] font-black uppercase tracking-tight">Yêu cầu gấp</span>
                        </button>
                    )}

                    {/* [WAREHOUSE] Thao tác trực tiếp đơn gấp trên Header */}
                    {isWarehouseUser && isUrgentPending && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => handleUrgentResponse('ACCEPTED', e)}
                                disabled={isWarehouseSubmitting}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:bg-gray-300"
                            >
                                {isWarehouseSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span className="text-[10px] font-black uppercase">Chấp nhận</span>
                            </button>
                            <button
                                onClick={(e) => handleUrgentResponse('REJECTED', e)}
                                disabled={isWarehouseSubmitting}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all active:scale-95 disabled:bg-gray-100"
                            >
                                {isWarehouseSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                <span className="text-[10px] font-black uppercase">Từ chối</span>
                            </button>
                        </div>
                    )}

                    <StatusBadge sod={sod} />
                </div>
            </div>

            {/* --- DETAIL SECTION (Ẩn hoàn toàn nếu là đơn gấp) --- */}
            {!(isUrgentPhase || hasUrgentRequest) && (
                <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                    {/* 1. GENERAL INFORMATION */}
                    <div className={`relative rounded-xl p-6 border mb-8 transition-all duration-500 ${isWarehouseDiscoveryPhase || sod.isNotificationSent ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <button onClick={() => setIsGeneralExpanded(!isGeneralExpanded)} className="w-full flex items-center justify-between mb-4 group/header">
                            <SectionHeader
                                icon={Info}
                                title="Thông tin chi tiết"
                                isActive={false}
                                rightElement={sod.isNotificationSent && (
                                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest shadow-sm">
                                        <CheckCircle2 className="w-3 h-3" /> ĐÃ REQUEST SALE
                                    </span>
                                )}
                            />
                            <div className={`p-1.5 rounded-lg transition-all ${isGeneralExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 rotate-180'}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </button>

                        {isGeneralExpanded && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                                    <div className="col-span-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100 hover:border-indigo-300 transition-all group">
                                        <LabelText className="block mb-2 group-hover:text-indigo-600 transition-colors">Số lượng cần giao</LabelText>
                                        {formatDualQty(rs)}
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
                                        <LabelText className="block mb-2">Tồn kho Hệ thống</LabelText>
                                        {formatDualQty(sod.qtyAvailable || 0)}
                                    </div>
                                    <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 hover:border-rose-300 transition-all group">
                                        <LabelText className="block mb-2 group-hover:text-rose-600">Thiếu hụt (Dự tính)</LabelText>
                                        {formatDualQty(sq, true)}
                                    </div>
                                    <div className="col-span-2 md:col-span-1 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all group">
                                        <LabelText className="block mb-2 group-hover:text-indigo-600">Ngày giao hàng (Dự kiến)</LabelText>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Calendar className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                            <span className={`text-base font-bold ${isDateDue() ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {sod.expectedDeliveryDate ? new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN') : 'K/X'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {sod.isNotificationSent && sod.warehouseVerification && (
                                    <div className="col-span-2 md:col-span-4 p-5 bg-emerald-50 rounded-xl border border-emerald-200 hover:border-emerald-300 transition-all mt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <LabelText className="text-emerald-600">Báo cáo kiểm đếm thực tế</LabelText>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest mb-1">Số lượng Đơn</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-2xl font-black text-emerald-700">{sod.warehouseVerification.requestedQty}</span>
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">{sod.unitOrderName || 'SP'}</span>
                                                    </div>
                                                </div>
                                                <div className="h-10 w-px bg-emerald-200"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest mb-1">Thực tế Kho</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-2xl font-black text-emerald-700">{sod.warehouseVerification.actualQty}</span>
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">{sod.unitWarehouseName || 'SP'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hidden sm:block h-10 w-px bg-gray-200 mx-2"></div>
                                            <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Nguyên nhân sai lệch</div>
                                                <div className="text-sm font-bold text-indigo-600">
                                                    {sod.warehouseVerification.discrepancyType === 'CONVERSION_RATE' ? '⚠️ Lệch tỷ lệ quy đổi' : sod.warehouseVerification.discrepancyType === 'SALE_REQUEST' ? '📝 Yêu cầu sửa số' : sod.warehouseVerification.discrepancyType === 'WAREHOUSE_SPEC' ? '📦 Quy cách kho' : '⚠️ Lệch tồn kho vật lý'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isWarehouseDiscoveryPhase && (
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 shadow-md">
                                <button onClick={() => setIsDiscoveryExpanded(!isDiscoveryExpanded)} className="w-full flex items-center justify-between mb-6 group/header">
                                    <div className="flex items-start gap-6">
                                        <div className="p-3 bg-amber-100 rounded-xl text-amber-600 border border-amber-200 shadow-sm shrink-0">
                                            <Search className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h4 className="text-lg font-black text-gray-900 mb-1 uppercase tracking-tight">Kiểm đếm thực tế</h4>
                                            <p className="text-sm text-gray-600 leading-relaxed">Bạn phát hiện sai lệch? Hãy nhập số liệu thực tế để thông báo cho Sale xử lý.</p>
                                        </div>
                                    </div>
                                    <div className={`p-1.5 rounded-lg transition-all ${isDiscoveryExpanded ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500 rotate-180'}`}>
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </button>

                                {isDiscoveryExpanded && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                                            <div>
                                                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Box className="w-3.5 h-3.5" /> Thực tế tại Kho</label>
                                                <div className="relative group">
                                                    <input type="number" step="any" min={0} className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:text-base pl-4 pr-12 py-3 border transition-all" value={inputWarehouseQty} onChange={(e) => setInputWarehouseQty(e.target.value)} onFocus={(e) => e.target.select()} />
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><span className="text-amber-600 text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">{sod.unitOrderName || 'SP'}</span></div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Có thể đáp ứng</label>
                                                <div className="relative group">
                                                    <input type="number" step="any" min={0} className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:text-base pl-4 pr-12 py-3 border transition-all" value={inputOrderQty} onChange={(e) => setInputOrderQty(e.target.value)} onFocus={(e) => e.target.select()} />
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><span className="text-amber-600 text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">{sod.unitOrderName || 'SP'}</span></div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Nguyên nhân</label>
                                                <div className="relative group">
                                                    <select className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:text-sm px-4 py-3 border transition-all cursor-pointer appearance-none" value={discrepancyType} onChange={(e) => setDiscrepancyType(e.target.value as any)}>
                                                        <option value="INVENTORY">⚠️ Lệch tồn kho</option>
                                                        <option value="CONVERSION_RATE">⚠️ Lệch tỷ lệ quy đổi</option>
                                                        <option value="SALE_REQUEST">📝 Yêu cầu Sale sửa số</option>
                                                        <option value="WAREHOUSE_SPEC">📦 Soạn theo quy cách kho</option>
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-amber-600"><ChevronDown className="w-4 h-4" /></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
                                            <div className="flex-1 flex items-center gap-3 p-4 rounded-lg bg-white border border-amber-200 text-gray-600 text-xs shadow-sm">
                                                <Scale className="w-5 h-5 shrink-0 text-amber-600" />
                                                <div>Gửi thông báo yêu cầu Sale xác nhận thực tế.</div>
                                            </div>
                                            <button onClick={handleWarehouseDiscoverySubmit} disabled={isNotifying} className="w-full sm:w-64 h-full py-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition-all">
                                                {isNotifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-5 h-5" />}
                                                {isNotifying ? 'ĐANG GỬI...' : 'REQUEST SALE XỬ LÝ'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {shouldShowActionZones && (
                        <div className="mt-8 pt-8 border-t border-gray-200">
                            <button onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)} className="w-full flex items-center justify-between mb-8 group/header">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl shadow-md transition-all ${isWorkflowExpanded ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        <ClipboardList className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Quy trình xử lý</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mt-1">Các bước hành động tiếp theo</p>
                                    </div>
                                </div>
                                <div className={`p-1.5 rounded-lg transition-all ${isWorkflowExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 rotate-180'}`}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            {isWorkflowExpanded && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-300">
                                    {(canSaleAct || !!sod.saleDecision) && (
                                        <SaleActionZone
                                            sod={sod}
                                            canAct={canSaleAct}
                                            recordId={recordId}
                                            onAction={handleActionComplete}
                                            renderBadge={renderSaleBadge}
                                            customerIndustryType={customerIndustryType}
                                            isDue={isDateDue()}
                                            isSufficient={isSufficient}
                                        />
                                    )}
                                    {shouldShowSourceBlock && (
                                        <SourceActionZone
                                            sod={sod}
                                            canAct={canSourceAct}
                                            recordId={recordId}
                                            onAction={handleActionComplete}
                                            renderBadge={renderSourceBadge}
                                            isWorkflowStoppedBySale={isWorkflowStoppedBySale}
                                        />
                                    )}
                                    {shouldShowWarehouseBlock && (
                                        <WarehouseActionZone
                                            sod={sod}
                                            canAct={canWarehouseAct}
                                            recordId={recordId}
                                            onAction={handleActionComplete}
                                            renderBadge={renderWarehouseBadge}
                                            isWorkflowStoppedBySale={isWorkflowStoppedBySale}
                                            isDue={isDateDue()}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
