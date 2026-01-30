
import React from 'react';
import { SOD, SODStatus } from '../types';
import { CheckCircle2, AlertCircle, Clock, PackageCheck, Warehouse, Ban, ShieldAlert } from 'lucide-react';

interface BadgeProps {
  sod: SOD;
}

export const StatusBadge: React.FC<BadgeProps> = ({ sod }) => {
  const baseClasses = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-all duration-300 shadow-sm whitespace-nowrap";

  switch (sod.status) {
    case SODStatus.SUFFICIENT:
      return (
        <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Đủ Tồn Kho
        </span>
      );
    case SODStatus.SHORTAGE_PENDING_SALE:
      return (
        <span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-200`}>
          <AlertCircle className="w-3.5 h-3.5" />
          Thiếu Hàng - Chờ Sale
        </span>
      );
    case SODStatus.SHORTAGE_PENDING_SOURCE:
      return (
        <span className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}>
          <Clock className="w-3.5 h-3.5" />
          Chờ Source Xử Lý
        </span>
      );
    case SODStatus.RESOLVED:
      // LOGIC MỚI: Phân loại trạng thái Resolved dựa trên Sale Decision và Warehouse Confirmation

      // 1. Nếu Sale chọn HỦY (CANCEL_ORDER)
      if (sod.saleDecision?.action === 'CANCEL_ORDER') {
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-600 border-gray-200`}>
            <Ban className="w-3.5 h-3.5" />
            Đã Chốt (Dừng Giao)
          </span>
        );
      }

      // 2. Nếu Sale chọn GIAO (SHIP_PARTIAL hoặc SHIP_AND_CLOSE)
      const isShipAction = sod.saleDecision?.action === 'SHIP_PARTIAL' || sod.saleDecision?.action === 'SHIP_AND_CLOSE';
      if (isShipAction) {
        // [FIX] Khi Sale chọn Giao, hệ thống đã tự động xác nhận kho (auto-approve)
        // Nên không còn case "Chờ Kho Xử Lý" - chỉ hiển thị nếu Kho từ chối
        if (sod.warehouseConfirmation?.status === 'REJECTED') {
          return (
            <span className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              Kho Từ Chối Xuất
            </span>
          );
        }
        // Mặc định: Đã hoàn tất (có hoặc không có warehouseConfirmation)
        return (
          <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}>
            <PackageCheck className="w-3.5 h-3.5" />
            Hoàn Tất Xuất Kho
          </span>
        );
      }

      // Default fallback (Trường hợp dữ liệu cũ hoặc case Wait All đã xong)
      return (
        <span className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}>
          <PackageCheck className="w-3.5 h-3.5" />
          Đã Chốt Phương Án
        </span>
      );

    default:
      return null;
  }
};
