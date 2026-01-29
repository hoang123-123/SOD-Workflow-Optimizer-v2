import React, { useState } from 'react';
import { SOD } from '../../types';
import { StatusBadge } from '../Badge';
import { SectionHeader, LabelText } from '../Typography';
import { SaleActionZone } from '../SaleActionZone';
import {
    ChevronDown,
    Box,
    ClipboardList,
    CheckCircle2,
    CalendarDays
} from 'lucide-react';

interface SaleShortageCardProps {
    sod: SOD;
    recordId: string;
    onUpdate: (updatedSOD: SOD) => void;
    onSaveState?: (updatedSOD: SOD) => Promise<void>;
    customerIndustryType?: number; // [NEW] Ngành nghề khách hàng
}

export const SaleShortageCard: React.FC<SaleShortageCardProps> = ({ sod, recordId, onUpdate, onSaveState, customerIndustryType }) => {
    const [isDetailExpanded, setIsDetailExpanded] = useState(false);

    const rs = sod.qtyOrdered - sod.qtyDelivered;
    const isSufficient = (rs - (sod.qtyAvailable || 0)) <= 0;

    const handleActionComplete = async (updatedSOD: SOD) => {
        onUpdate(updatedSOD);
        if (onSaveState) await onSaveState(updatedSOD);
    }

    const formatQty = (val: number) => (
        <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-800">{val}</span>
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                {sod.unitOrderName || 'SP'}
            </span>
        </div>
    );

    return (
        <div className="bg-white border border-gray-200 rounded-xl transition-all overflow-hidden hover:border-indigo-200">
            {/* --- HEADER TỔNG (CLICKABLE) --- */}
            <button
                onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                className="w-full text-left px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50 transition-colors group"
            >
                <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg transition-all ${isDetailExpanded ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Box className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 text-sm leading-tight">{sod.detailName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 text-[10px]">{sod.product.sku}</span>
                            <span className="truncate max-w-[180px]">{sod.product.name}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-auto md:ml-0">
                    <div className="flex flex-col items-end">
                        <LabelText className="text-[9px] uppercase tracking-wide text-gray-400">Thiếu hụt</LabelText>
                        <div className="text-lg font-bold text-rose-500">{Math.max(0, rs - (sod.qtyAvailable || 0))}</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                    <div className="flex items-center gap-3">
                        <StatusBadge sod={sod} />
                        <div className={`p-1 rounded-md transition-all duration-300 ${isDetailExpanded ? 'rotate-0 text-indigo-600' : 'rotate-180 text-gray-400'}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </button>

            {/* --- NỘI DUNG CHI TIẾT --- */}
            {isDetailExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-4 space-y-4">
                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <LabelText className="block mb-1 text-gray-500 text-[10px]">Cần giao (Đơn/Kho)</LabelText>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-gray-900">{sod.qtyOrderRemainingON || 0}</span>
                                <span className="text-gray-300 mx-0.5">/</span>
                                <span className="text-base font-semibold text-gray-500">{sod.qtyOrderRemainingWH || 0}</span>
                                <span className="text-[9px] text-gray-400 font-semibold uppercase ml-1">{sod.unitWarehouseName || 'Cái'}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <LabelText className="block mb-1 text-gray-500 text-[10px]">Hệ thống có (Đơn/Kho)</LabelText>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-indigo-600">{sod.qtyAvailable || 0}</span>
                                <span className="text-indigo-200 mx-0.5">/</span>
                                <span className="text-base font-semibold text-indigo-400">{(sod.qtyAvailable || 0) * (sod.conversionRate || 1)}</span>
                                <span className="text-[9px] text-indigo-400/60 font-semibold uppercase ml-1">{sod.unitWarehouseName || 'Cái'}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-gray-100">
                            <LabelText className="block mb-1 text-[10px]">Ngày giao dự kiến</LabelText>
                            <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-indigo-400" />
                                <span className="font-semibold text-gray-800 text-sm">
                                    {sod.expectedDeliveryDate ? new Date(sod.expectedDeliveryDate).toLocaleDateString('vi-VN') : '---'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Workflow Actions */}
                    <div className="pt-2 border-t border-dashed border-gray-200" onClick={(e) => e.stopPropagation()}>
                        <SaleActionZone
                            sod={sod}
                            canAct={!sod.saleDecision}
                            recordId={recordId}
                            onAction={handleActionComplete}
                            isDue={true}
                            isSufficient={isSufficient}
                            customerIndustryType={customerIndustryType}
                            renderBadge={() => {
                                if (!sod.saleDecision) return null;
                                if (sod.saleDecision.action === 'SHIP_PARTIAL') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm"><CheckCircle2 className="w-3 h-3" /> SALE CHỐT GIAO</span>;
                                if (sod.saleDecision.action === 'CANCEL_ORDER') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 uppercase tracking-wide shadow-sm">SALE CHỐT HỦY</span>;
                                if (sod.saleDecision.action === 'WAIT_ALL') return <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide shadow-sm">SALE CHỜ HÀNG</span>;
                                return null;
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
