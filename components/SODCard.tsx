
import React, { useState, useRef, useEffect } from 'react';
import { SOD, SODStatus, UserRole } from '../types';
import { StatusBadge } from './Badge';
import { SectionHeader, LabelText, ValueText } from './Typography';
import { SaleActionZone } from './SaleActionZone';
import { SourceActionZone } from './SourceActionZone';
import { WarehouseActionZone } from './WarehouseActionZone';
import { executeBusinessRule } from '../logic/ruleEngine'; // Import Brain
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
  Calendar
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
}

export const SODCard: React.FC<SODCardProps> = ({ sod, currentRole, onUpdate, onNotifySale, onSaveState, saleId, recordId }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Notification Loading State for Warehouse
  const [isNotifying, setIsNotifying] = useState(false);
  
  // --- STATE CHO WAREHOUSE DISCOVERY (KIỂM ĐẾM) ---
  const [inputWarehouseQty, setInputWarehouseQty] = useState<string>('0');
  const [inputOrderQty, setInputOrderQty] = useState<string>('0');
  const [discrepancyType, setDiscrepancyType] = useState<'INVENTORY' | 'CONVERSION_RATE'>('INVENTORY');

  const rs = sod.qtyOrdered - sod.qtyDelivered; 
  const safeAvailable = sod.qtyAvailable || 0;
  const sq = Math.max(0, rs - safeAvailable);
  
  // Logic Sufficient: Đủ hàng VÀ chưa có báo cáo sự cố từ kho
  const isSufficient = sq === 0;
  
  const deliveryCount = sod.deliveryCount || 0;
  const isSourcePlanConfirmed = sod.sourcePlan?.status === 'CONFIRMED';
  const isWarehouseConfirmed = sod.warehouseConfirmation?.status === 'CONFIRMED';
  const isWarehouseRejected = sod.warehouseConfirmation?.status === 'REJECTED';

  const handleToggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && cardRef.current) {
        setTimeout(() => {
            cardRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }, 300);
    }
  };

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

          // GỌI BRAIN: Rule WH_REPORT
          const updatedSod = await executeBusinessRule(
              'WH_REPORT',
              sod,
              recordId,
              {
                  actualQty: qtyAvailReal,
                  requestedQty: qtyOrdReal,
                  discrepancyType: discrepancyType // [NEW] Pass discrepancy type
              }
          );
          
          onUpdate(updatedSod); 
          if(onSaveState) await onSaveState(updatedSod);

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
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                        {uWarehouse}
                      </span>
                  </div>
              </div>
              <div className="text-[10px] text-gray-400 font-medium mt-1.5">
                 Số lượng: Đơn hàng / Kho
              </div>
          </div>
      );
  };

  // --- LOGIC CHECK DATE ---
  const isDateDue = () => {
    // Nếu không có ngày, coi như là đã đến hạn (xử lý ngay)
    if (!sod.expectedDeliveryDate) return true;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(sod.expectedDeliveryDate);
    target.setHours(0,0,0,0);
    
    return target <= today;
  };

  // --- LOGIC PHÂN QUYỀN (ROLE BASED LOGIC) ---
  const isAdmin = currentRole === UserRole.ADMIN;
  
  const isWarehouseUser = currentRole === UserRole.WAREHOUSE || isAdmin;
  const isSaleUser = currentRole === UserRole.SALE || isAdmin;
  const isSourceUser = currentRole === UserRole.SOURCE || isAdmin;

  // 1. Vùng Nhập liệu của Kho (Warehouse Discovery)
  // Chỉ hiện khi: User Kho + Chưa Sale chốt + Chưa gửi báo cáo + [NEW] Ngày <= Hiện tại
  const isWarehouseDiscoveryPhase = isWarehouseUser && !sod.saleDecision && !sod.isNotificationSent && isDateDue();
  
  // 2. Quyền Sale Action
  const canSaleAct = isSaleUser && !sod.saleDecision; 

  const canSourceAct = isSourceUser && sod.status === SODStatus.SHORTAGE_PENDING_SOURCE;
  const canWarehouseAct = isWarehouseUser && sod.saleDecision?.action === 'SHIP_PARTIAL' && !sod.warehouseConfirmation;

  const isWorkflowStoppedBySale = sod.saleDecision?.action === 'CANCEL_ORDER'; 
  const shouldShowSourceBlock = sod.saleDecision?.action === 'WAIT_ALL';
  const shouldShowWarehouseBlock = sod.saleDecision?.action === 'SHIP_PARTIAL';

  // --- BADGE RENDERERS ---
  const renderSaleBadge = () => {
      if (!sod.saleDecision) return null;
      if (sod.saleDecision.action === 'SHIP_PARTIAL') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm select-none"><CheckCircle2 className="w-3 h-3" /> SALE CHỐT GIAO</span>;
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

  // --- LOGIC HIỂN THỊ ACTION ZONES ---
  // Hiển thị nếu:
  // 1. Dòng hàng bị Thiếu (!isSufficient)
  // 2. HOẶC Dòng hàng Đủ nhưng Kho đã báo cáo sai lệch (sod.isNotificationSent)
  // 3. HOẶC Sale đã có quyết định (để hiện Read-only view)
  const shouldShowActionZones = !isSufficient || sod.isNotificationSent || sod.saleDecision;

  return (
    <div 
      ref={cardRef}
      className={`
        bg-white border rounded-lg transition-all duration-200 overflow-hidden
        ${isExpanded ? 'border-indigo-200 ring-1 ring-indigo-50 shadow-md my-4' : 'border-gray-200 shadow-sm hover:border-gray-300'}
      `}
    >
      <style>{`
        .date-input-full-trigger { position: relative; }
        .date-input-full-trigger::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        
        /* HIDE SPINNERS FOR NUMBER INPUT */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* --- SUMMARY ROW --- */}
      <div 
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group hover:bg-gray-50/50 transition-colors"
        onClick={handleToggleExpand}
      >
        <div className="flex items-start gap-4 flex-1 overflow-hidden">
          <div className="mt-0.5 p-2 rounded-md bg-gray-50 text-gray-500 border border-gray-100 shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-800 text-sm mb-1 break-words leading-snug">
                {sod.detailName}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                    {sod.product.sku}
                </span>
                <span className="truncate">{sod.product.name}</span>
            </div>
            {!isExpanded && sod.saleDecision && (
               <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-600">
                  <UserCircle2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">Sale: { sod.saleDecision.action === 'SHIP_PARTIAL' ? 'Giao hàng' : (sod.saleDecision.action === 'WAIT_ALL' ? 'Chờ hàng' : 'Hủy đơn') }</span>
               </div>
            )}
            {/* Show Date in Summary if Due */}
            {!isExpanded && sod.expectedDeliveryDate && (
                 <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                     <Calendar className="w-3 h-3" />
                     <span>Ngày giao: {new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN')}</span>
                 </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
            <div className="flex flex-col items-end">
                <LabelText className="mb-0.5 text-gray-400">Số lần giao</LabelText>
                <ValueText>{deliveryCount}</ValueText>
            </div>
            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
            <div className="flex flex-col items-end">
                <LabelText className="mb-0.5 text-gray-400">Cần giao</LabelText>
                <ValueText>{rs}</ValueText>
            </div>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-4 min-w-[180px] shrink-0">
          <StatusBadge sod={sod} />
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />}
        </div>
      </div>

      {/* --- EXPANDED DETAIL --- */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-5 bg-white animate-in slide-in-from-top-1 fade-in duration-200">
          
          {/* 1. GENERAL INFORMATION */}
          <div className={`relative rounded-lg p-5 border mb-6 transition-all ${isWarehouseDiscoveryPhase || sod.isNotificationSent ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gray-100'}`}>
            <SectionHeader 
                icon={Info} 
                title="Thông tin chung" 
                isActive={false} 
                rightElement={sod.isNotificationSent && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm select-none">
                        <CheckCircle2 className="w-3 h-3" />
                        ĐÃ REQUEST SALE
                    </span>
                )}
            />
            
            <div className={`grid grid-cols-2 ${sod.isNotificationSent ? 'md:grid-cols-4' : 'md:grid-cols-4'} gap-4 mb-2`}>
                <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <LabelText className="block mb-1">Số lượng cần giao</LabelText>
                    {formatDualQty(rs)}
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors opacity-70">
                    <LabelText className="block mb-1">Tồn kho Hệ thống</LabelText>
                    {formatDualQty(sod.qtyAvailable || 0)}
                </div>
                 <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <LabelText className="block mb-1">Thiếu hụt (Dự kiến)</LabelText>
                    {formatDualQty(sq, true)}
                </div>
                {/* DATE DISPLAY */}
                <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <LabelText className="block mb-1">Ngày giao hàng (Dự kiến)</LabelText>
                    <div className="flex items-center gap-2 mt-1.5">
                         <Calendar className="w-5 h-5 text-gray-500" />
                         <span className={`text-base font-bold ${isDateDue() ? 'text-gray-900' : 'text-gray-400'}`}>
                             {sod.expectedDeliveryDate ? new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN') : 'Không xác định'}
                         </span>
                    </div>
                </div>

                {sod.isNotificationSent && sod.warehouseVerification && (
                    <div className="col-span-2 md:col-span-4 p-3 bg-teal-50 rounded-lg border border-teal-200 hover:border-teal-300 transition-colors shadow-sm mt-2">
                        <div className="flex items-center gap-1.5 mb-1">
                             <LabelText className="text-teal-700">Báo cáo kiểm đếm</LabelText>
                             <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        </div>
                        <div className="flex flex-col items-start">
                           <div className="flex items-center gap-3">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold text-teal-800">
                                      {sod.warehouseVerification.requestedQty}
                                    </span>
                                    <span className="text-[10px] font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                                      {sod.unitOrderName || 'SP'}
                                    </span>
                                </div>
                                <div className="h-5 w-px bg-teal-200"></div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold text-teal-800">
                                      {sod.warehouseVerification.actualQty}
                                    </span>
                                    <span className="text-[10px] font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                                      {sod.unitWarehouseName || 'SP'}
                                    </span>
                                </div>
                           </div>
                           <div className="text-[10px] text-teal-600 font-medium mt-1.5">
                               Lý do: {sod.warehouseVerification.discrepancyType === 'CONVERSION_RATE' ? 'Lệch tỷ lệ quy đổi' : 'Lệch tồn kho'}
                           </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- WAREHOUSE DISCOVERY ZONE --- */}
            {isWarehouseDiscoveryPhase && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                     <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-white rounded-lg text-amber-600 border border-amber-200 shadow-sm shrink-0">
                                <Search className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Kiểm đếm thực tế (Dành cho Kho)</h4>
                                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                                    Sử dụng chức năng này nếu bạn phát hiện số liệu tồn kho hệ thống không khớp với thực tế hoặc có vấn đề về quy đổi đơn vị.
                                </p>
                                
                                <div className="flex flex-col sm:flex-row gap-4 items-end mb-4">
                                    {/* INPUT 1: SỐ LƯỢNG KHO */}
                                    <div className="w-full sm:w-48">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <Box className="w-3 h-3" /> Số lượng Kho
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="number" 
                                                step="any"
                                                min={0}
                                                className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:text-sm pl-3 pr-12 py-2.5 border transition-all"
                                                placeholder="0"
                                                value={inputWarehouseQty}
                                                onChange={(e) => setInputWarehouseQty(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-gray-400 text-xs font-bold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {sod.unitOrderName || 'SP'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* INPUT 2: SỐ LƯỢNG ĐƠN */}
                                    <div className="w-full sm:w-48">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> Số lượng Đơn
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="number"
                                                step="any" 
                                                min={0}
                                                className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:text-sm pl-3 pr-12 py-2.5 border transition-all"
                                                placeholder="0"
                                                value={inputOrderQty}
                                                onChange={(e) => setInputOrderQty(e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <span className="text-gray-400 text-xs font-bold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {sod.unitOrderName || 'SP'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* INPUT 3: LOẠI SAI LỆCH [NEW] */}
                                    <div className="w-full sm:w-48">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Loại sai lệch
                                        </label>
                                        <div className="relative group">
                                            <select 
                                                className="block w-full rounded-lg border-gray-300 bg-white text-gray-900 font-bold shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 sm:text-sm px-3 py-2.5 border transition-all cursor-pointer"
                                                value={discrepancyType}
                                                onChange={(e) => setDiscrepancyType(e.target.value as any)}
                                            >
                                                <option value="INVENTORY">Lệch tồn kho</option>
                                                <option value="CONVERSION_RATE">Lệch tỷ lệ chuyển đổi</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1"></div>

                                    <button 
                                        onClick={handleWarehouseDiscoverySubmit}
                                        disabled={isNotifying}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:transform-none"
                                    >
                                        {isNotifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                                        {isNotifying ? 'Đang gửi...' : 'Request Sale'}
                                    </button>
                                </div>

                                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-white border border-amber-100 text-gray-600 text-xs shadow-sm">
                                    <Scale className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                    <div>
                                        <span className="font-bold text-amber-700">Lưu ý:</span> Bạn đang gửi request:
                                        <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                            <li>Tồn kho thực tế: <strong>{inputWarehouseQty}</strong> {sod.unitOrderName}</li>
                                            <li>Số lượng đơn hàng: <strong>{inputOrderQty}</strong> {sod.unitOrderName}</li>
                                            <li>Nguyên nhân: <strong>{discrepancyType === 'CONVERSION_RATE' ? 'Sai lệch tỷ lệ quy đổi' : 'Sai lệch tồn kho vật lý'}</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            )}
          </div>
          
          {/* 2. Workflow Actions (Sale/Source/Warehouse) */}
          {/* UPDATED: Hiện Action Zone nếu Thiếu HOẶC Đã có Notification (dù đủ hay thiếu) */}
          {shouldShowActionZones && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
              <SaleActionZone 
                  sod={sod}
                  canAct={canSaleAct}
                  recordId={recordId}
                  onAction={handleActionComplete}
                  renderBadge={renderSaleBadge}
              />
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
                  />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
