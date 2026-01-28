
import React from 'react';
import { SOD, SODStatus } from '../types';
import { CheckCircle2, AlertCircle, Clock, PackageCheck, Warehouse, Ban, ShieldAlert } from 'lucide-react';

interface BadgeProps {
  sod: SOD;
}

export const StatusBadge: React.FC<BadgeProps> = ({ sod }) => {
  const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors";

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

      // 2. Nếu Sale chọn GIAO (SHIP_PARTIAL)
      if (sod.saleDecision?.action === 'SHIP_PARTIAL') {
          // 2a. Kho chưa xác nhận -> CHỜ KHO
          if (!sod.warehouseConfirmation) {
              return (
                <span className={`${baseClasses} bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse`}>
                  <Warehouse className="w-3.5 h-3.5" />
                  Chờ Kho Xử Lý
                </span>
              );
          }
          // 2b. Kho TỪ CHỐI
          if (sod.warehouseConfirmation.status === 'REJECTED') {
               return (
                <span className={`${baseClasses} bg-red-50 text-red-700 border-red-200`}>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Kho Từ Chối Xuất
                </span>
              );
          }
           // 2c. Kho ĐÃ XUẤT (CONFIRMED)
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
