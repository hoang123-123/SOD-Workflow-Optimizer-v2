import React, { useState } from 'react';
import { SOD } from '../../types';
import { StatusBadge } from '../Badge';
import { executeBusinessRule } from '../../logic/ruleEngine';
import {
    ChevronDown,
    Box,
    Search,
    Loader2,
    BellRing,
    Scale,
    AlertTriangle,
    FileText,
    CheckCircle2,
    Hourglass,
    XCircle,
    AlertCircle
} from 'lucide-react';

interface WarehouseRequestCardProps {
    sod: SOD;
    recordId: string;
    onUpdate: (updatedSOD: SOD) => void;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
    currentDepartment?: string;
    currentRole: any;
}

/**
 * [NEW STYLE] BENTO CARD - CHUYÊN CHO BÁO CÁO SAI LỆCH
 * Phù hợp khi Kho kiểm đếm thực tế phát hiện tồn kho hệ thống hoặc đơn vị quy đổi có vấn đề.
 */
export const WarehouseRequestCard: React.FC<WarehouseRequestCardProps> = ({
    sod,
    recordId,
    onUpdate,
    onSaveState,
    currentDepartment,
    currentRole
}) => {
    const [isDiscoveryExpanded, setIsDiscoveryExpanded] = useState<boolean>(false); // [FIX] Mặc định đóng
    const [isNotifying, setIsNotifying] = useState(false);

    // --- STATE CHO WAREHOUSE DISCOVERY (KIỂM ĐẾM) ---
    const [inputWarehouseQty, setInputWarehouseQty] = useState<string>('0');
    // [NEW] Patch giá trị từ qtyOrderRemainingON của SOD
    const [inputOrderQty, setInputOrderQty] = useState<string>(String(sod.qtyOrderRemainingON || 0));
    // [NEW] State cho Số lượng thực soạn
    const [inputActualPickedQty, setInputActualPickedQty] = useState<string>('0');
    const [discrepancyType, setDiscrepancyType] = useState<'INVENTORY' | 'CONVERSION_RATE' | 'SALE_REQUEST' | 'WAREHOUSE_SPEC'>('INVENTORY');

    const handleWarehouseDiscoverySubmit = async () => {
        setIsNotifying(true);
        try {
            const qtyAvailReal = parseFloat(inputWarehouseQty.replace(',', '.')) || 0;
            const qtyOrdReal = parseFloat(inputOrderQty.replace(',', '.')) || 0;
            // [NEW] Số lượng thực soạn
            const actualPickedQty = parseFloat(inputActualPickedQty.replace(',', '.')) || 0;

            const updatedSod = await executeBusinessRule(
                'WH_REPORT',
                sod,
                recordId,
                {
                    actualQty: qtyAvailReal,
                    requestedQty: qtyOrdReal,
                    actualPickedQty: actualPickedQty, // [NEW] Số lượng thực soạn
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
    };

    const isSubmitted = !!sod.warehouseVerification;
    const isSaleResponded = !!sod.saleDecision && isSubmitted;

    const renderSubmittedView = () => {
        if (!sod.warehouseVerification) return null;
        const v = sod.warehouseVerification;
        const isRejection = sod.saleDecision?.action === 'REJECT_REPORT';

        return (
            <div className="bg-white border-2 border-indigo-100 rounded-[1.5rem] p-8 shadow-sm">
                <div className="flex items-start gap-6 mb-8">
                    <div className={`p-4 rounded-2xl shadow-sm shrink-0 border-2 ${isRejection
                        ? 'bg-rose-50 border-rose-100 text-rose-500'
                        : isSaleResponded
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-500'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-500'
                        }`}>
                        {isRejection ? <XCircle className="w-6 h-6" /> : isSaleResponded ? <CheckCircle2 className="w-6 h-6" /> : <Hourglass className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                        <h4 className={`text-xl font-black mb-1 uppercase tracking-tighter ${isRejection
                            ? 'text-rose-800'
                            : isSaleResponded
                                ? 'text-emerald-800'
                                : 'text-indigo-800'
                            }`}>
                            {isRejection ? 'Sale yêu cầu kiểm đếm lại' : isSaleResponded ? 'Sale đã xử lý báo cáo' : 'Đang chờ Sale phản hồi'}
                        </h4>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                            {isRejection
                                ? 'Sale không đồng ý với báo cáo sai lệch và yêu cầu bạn kiểm tra lại kho thực tế.'
                                : isSaleResponded
                                    ? 'Bộ phận Sale đã ghi nhận sai lệch và đưa ra phương án xử lý mới.'
                                    : 'Yêu cầu của bạn đã được gửi tới Sale. Vui lòng chờ phản hồi để tiếp tục quy trình.'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số lượng kho</div>
                        <div className="text-xl font-black text-gray-900">{v.actualQty} <span className="text-xs text-gray-400 font-bold uppercase">{sod.unitWarehouseName}</span></div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số lượng đơn</div>
                        <div className="text-xl font-black text-gray-900">{v.requestedQty} <span className="text-xs text-gray-400 font-bold uppercase">{sod.unitOrderName}</span></div>
                    </div>
                    {/* [NEW] Cột Số lượng thực soạn */}
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">SL Thực soạn</div>
                        <div className="text-xl font-black text-emerald-700">{v.actualPickedQty ?? '-'} <span className="text-xs text-emerald-500 font-bold uppercase">{sod.unitOrderName}</span></div>
                    </div>
                    <div className="p-4 bg-gray-100 rounded-2xl border border-gray-200">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Loại sai lệch</div>
                        <div className="text-sm font-black text-gray-900 uppercase">
                            {v.discrepancyType === 'INVENTORY' ? '⚠️ Lệch tồn kho vật lý' : v.discrepancyType === 'CONVERSION_RATE' ? '⚠️ Lệch tỷ lệ quy đổi' : v.discrepancyType === 'SALE_REQUEST' ? '📝 Yêu cầu sửa số' : '📦 Quy cách bán của kho'}
                        </div>
                    </div>
                </div>

                {isSaleResponded && (
                    <div className={`p-5 rounded-2xl border-2 ${isRejection ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <div className={`flex items-center gap-3 font-black text-xs uppercase tracking-tight ${isRejection ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {isRejection ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            Phương án của Sale: {
                                sod.saleDecision?.action === 'CANCEL_ORDER' ? 'Hủy đơn' :
                                    sod.saleDecision?.action === 'REJECT_REPORT' ? 'Kiểm tra lại thực tồn' :
                                        'Giao hàng đợt này'
                            }
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`bg-white border rounded-xl transition-all overflow-hidden hover:border-amber-200 ${isSubmitted ? 'border-indigo-100' : 'border-amber-100'}`}>
            {/* Header: Basic Info - Click vào đây để mở/đóng */}
            <button
                onClick={() => setIsDiscoveryExpanded(!isDiscoveryExpanded)}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors group`}
            >
                <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg transition-all ${isDiscoveryExpanded
                        ? (isSubmitted ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white')
                        : (isSubmitted ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600')}`}>
                        <Scale className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 text-sm leading-tight truncate">{sod.detailName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 text-[10px]">{sod.product.sku}</span>
                            {isSubmitted && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-indigo-600 text-white">
                                    Đã gửi
                                </span>
                            )}
                        </div>
                        {/* [NEW] Hiển thị tên sản phẩm */}
                        <div className="text-xs text-gray-600 mt-1 truncate font-medium">{sod.product.name}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge sod={sod} />
                    <div className={`p-1 rounded-md transition-all duration-300 ${isDiscoveryExpanded ? 'text-indigo-600 rotate-0' : 'text-gray-400 rotate-180'}`}>
                        <ChevronDown className="w-5 h-5" />
                    </div>
                </div>
            </button>

            {/* Content: The Bento Discovery Box (Matching Mockup) */}
            {isDiscoveryExpanded && (
                <div className={`p-8 ${isSubmitted ? 'bg-indigo-50/20' : 'bg-amber-50/20'}`}>
                    {isSubmitted ? renderSubmittedView() : (
                        <div className="bg-[#FFF9EA] border-2 border-[#FFE8B3] rounded-[1.5rem] p-8 shadow-sm">
                            <div className="flex items-start gap-6 mb-8">
                                <div className="p-4 bg-white border-2 border-amber-100 rounded-2xl shadow-sm shrink-0">
                                    <Search className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-black text-[#855D00] mb-1 uppercase tracking-tighter">Báo cáo kiểm đếm thực tế</h4>
                                    <p className="text-sm text-[#855D00]/70 font-medium leading-relaxed">Sử dụng chức năng này nếu bạn phát hiện số liệu tồn kho hệ thống không khớp với thực tế hoặc có vấn đề về quy đổi đơn vị.</p>
                                </div>
                            </div>

                            <div className="flex flex-col xl:flex-row items-end gap-6 mb-8">
                                {/* Input 1 */}
                                <div className="flex-1 w-full space-y-2.5">
                                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Box className="w-3 h-3" /> SỐ LƯỢNG KHO
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="number" step="any"
                                            className="w-full h-14 rounded-2xl border-2 border-amber-200 bg-white px-5 text-xl font-black text-gray-900 focus:border-amber-500 transition-all outline-none"
                                            value={inputWarehouseQty}
                                            onChange={(e) => setInputWarehouseQty(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <div className="absolute right-3 top-3 bottom-3 flex items-center">
                                            <div className="h-full px-3 flex items-center bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {sod.unitWarehouseName || 'SP'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Input 2 */}
                                <div className="flex-1 w-full space-y-2.5">
                                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <FileText className="w-3 h-3" /> SỐ LƯỢNG ĐƠN
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="number" step="any"
                                            className="w-full h-14 rounded-2xl border-2 border-amber-200 bg-white px-5 text-xl font-black text-gray-900 focus:border-amber-500 transition-all outline-none"
                                            value={inputOrderQty}
                                            onChange={(e) => setInputOrderQty(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <div className="absolute right-3 top-3 bottom-3 flex items-center">
                                            <div className="h-full px-3 flex items-center bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {sod.unitOrderName || 'SP'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* [NEW] Input Số lượng thực soạn */}
                                <div className="flex-1 w-full space-y-2.5">
                                    <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <CheckCircle2 className="w-3 h-3" /> SỐ LƯỢNG THỰC SOẠN
                                    </div>
                                    <div className="relative group">
                                        <input
                                            type="number" step="any"
                                            className="w-full h-14 rounded-2xl border-2 border-emerald-200 bg-white px-5 text-xl font-black text-gray-900 focus:border-emerald-500 transition-all outline-none"
                                            value={inputActualPickedQty}
                                            onChange={(e) => setInputActualPickedQty(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <div className="absolute right-3 top-3 bottom-3 flex items-center">
                                            <div className="h-full px-3 flex items-center bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                {sod.unitOrderName || 'SP'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Select */}
                                <div className="flex-1 w-full space-y-2.5">
                                    <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <AlertTriangle className="w-3 h-3" /> LOẠI SAI LỆCH
                                    </div>
                                    <div className="relative">
                                        <select
                                            className="w-full h-14 rounded-2xl border-2 border-amber-200 bg-white px-5 pr-12 text-sm font-black text-gray-900 appearance-none focus:border-amber-500 transition-all outline-none cursor-pointer"
                                            value={discrepancyType}
                                            onChange={(e) => setDiscrepancyType(e.target.value as any)}
                                        >
                                            <option value="INVENTORY">⚠️ Lệch tồn kho vật lý</option>
                                            <option value="CONVERSION_RATE">⚠️ Lệch tỷ lệ quy đổi</option>
                                            <option value="SALE_REQUEST">📝 Yêu cầu Sale sửa số</option>
                                            <option value="WAREHOUSE_SPEC">📦 Soạn theo quy cách kho</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleWarehouseDiscoverySubmit}
                                    disabled={isNotifying}
                                    className="h-14 px-8 bg-[#D97706] hover:bg-[#B45309] text-white rounded-2xl shadow-xl shadow-amber-900/10 active:scale-95 transition-all flex items-center gap-3 disabled:bg-gray-400 font-black text-sm uppercase tracking-widest"
                                >
                                    {isNotifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-5 h-5" />}
                                    Request Sale
                                </button>
                            </div>

                            {/* Note Box */}
                            <div className="bg-white border-2 border-amber-100/50 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <Scale className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                                    <div>
                                        <div className="text-xs font-black text-amber-800 mb-1.5 flex items-center gap-2">Lưu ý: Bạn đang gửi request:</div>
                                        <ul className="text-xs text-amber-900/60 font-medium space-y-1 list-disc pl-4 uppercase tracking-tight">
                                            <li>Tồn kho thực tế: <span className="text-amber-700 font-bold">{inputWarehouseQty} {sod.unitWarehouseName}</span></li>
                                            <li>SL còn lại theo đơn: <span className="text-amber-700 font-bold">{inputOrderQty} {sod.unitOrderName}</span></li>
                                            <li>SL Thực soạn: <span className="text-emerald-700 font-bold">{inputActualPickedQty} {sod.unitWarehouseName}</span></li>
                                            <li>Nguyên nhân: <span className="text-amber-700 font-bold">{discrepancyType === 'INVENTORY' ? '⚠️ Lệch tồn kho vật lý' : discrepancyType === 'CONVERSION_RATE' ? '⚠️ Lệch tỷ lệ quy đổi' : discrepancyType === 'SALE_REQUEST' ? '📝 Yêu cầu Sale sửa số' : '📦 Quy cách bán của kho'}</span></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
