
export enum UserRole {
  SALE = 'SALE',
  SOURCE = 'SOURCE',
  WAREHOUSE = 'WAREHOUSE', // New Role
  VIEWER = 'VIEWER', // Read only
  ADMIN = 'ADMIN' // Full Access
}

export enum SODStatus {
  SUFFICIENT = 'SUFFICIENT',
  SHORTAGE_PENDING_SALE = 'SHORTAGE_PENDING_SALE',
  SHORTAGE_PENDING_SOURCE = 'SHORTAGE_PENDING_SOURCE',
  RESOLVED = 'RESOLVED'
}

export interface Product {
  sku: string;
  name: string;
  imageUrl?: string;
}

export interface SaleDecision {
  action: 'SHIP_PARTIAL' | 'SHIP_AND_CLOSE' | 'WAIT_ALL' | 'CANCEL_ORDER' | 'REJECT_REPORT'; // [UPDATED] Thêm REJECT_REPORT
  timestamp: string;
  quantity?: number; // Quantity decided for shipment
  isFactory?: boolean; // [NEW] Flag xác định loại khách hàng
}

export interface SourcePlan {
  eta: string;
  supplier?: string;
  status: 'PENDING' | 'CONFIRMED';
  timestamp: string;
}

export interface WarehouseConfirmation {
  status: 'CONFIRMED' | 'REJECTED';
  timestamp: string;
  reason?: string;
}

export interface UrgentRequest {
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
  note?: string;
  requestedBy?: string; // [NEW] Người yêu cầu
}

export interface WarehouseVerification {
  actualQty: number; // Số lượng thực tế kho nhập (Đơn vị Kho - WH)
  requestedQty: number; // Số lượng đơn kho xác nhận (Đơn vị Đơn - ON)
  actualPickedQty?: number; // [NEW] Số lượng thực soạn (Đơn vị Kho - WH)
  requestedNeed?: number; // [DEPRECATED] Dùng requestedNeedON/WH thay thế
  requestedNeedON?: number; // [NEW] Nhu cầu đơn còn lại (ON) lúc Kho submit
  requestedNeedWH?: number; // [NEW] Nhu cầu đơn còn lại (WH) lúc Kho submit
  timestamp: string;
  discrepancyType?: 'INVENTORY' | 'CONVERSION_RATE'; // [NEW] Loại sai lệch
  createdByDept?: string; // [NEW] Phòng ban tạo request (VD: Kho Miền Trung)
  actor?: string; // [NEW] Role người tạo
}

export interface SOD {
  id: string;
  detailName: string;
  soNumber: string;
  product: Product;
  qtyOrdered: number; // Requested
  qtyDelivered: number; // Already shipped
  qtyAvailable: number; // In stock (System)
  deliveryCount?: number; // cr1bb_solangiaoso
  warehouseLocation?: string; // Shelf/Bin
  status: SODStatus;
  saleDecision?: SaleDecision;
  sourcePlan?: SourcePlan;
  warehouseConfirmation?: WarehouseConfirmation; // New Field
  warehouseVerification?: WarehouseVerification; // [NEW] Kết quả kiểm đếm thực tế
  isNotificationSent?: boolean; // Flag to track if Warehouse notified Sale

  expectedDeliveryDate?: string; // [NEW] crdfd_exdeliverrydate - Ngày giao dự kiến

  // Unit & Conversion Info
  unitOrderName?: string; // Tên đơn vị đặt hàng (VD: Hộp)
  unitWarehouseName?: string; // Tên đơn vị kho (VD: Cái)
  conversionRate?: number; // Tỷ lệ chuyển đổi (crdfd_giatrichuyenoi)

  // [NEW] Thông tin Đơn gấp
  theoreticalStock?: number; // crdfd_ton_kho_ly_thuyet_bo_mua
  requiredProductQty?: number; // crdfd_productnum

  // [NEW] Thông tin số lượng chi tiết cho Sale
  qtyOrderRemainingON?: number; // cr1bb_soluongconlaitheoon (Số lượng đơn)
  qtyOrderRemainingWH?: number; // cr1bb_soluongconlaitheokho (Số lượng kho)
  qtySystemPickedWH?: number;   // cr1bb_soluongthucsoanhtheokho (Hệ thống có - Kho)
  urgentRequest?: UrgentRequest; // Trạng thái yêu cầu giao gấp
  statusFromPlan?: 'Đủ' | 'Thiếu' | string; // [NEW] cr1bb_trangthaihang từ Plan
}

export interface Customer {
  id: string;
  name: string;
  industryType?: number; // crdfd_nganhnghe: 191920000 = Nhà máy (Factory)
}

// Constant for Factory industry type
export const INDUSTRY_FACTORY = 191920000;

export interface SalesOrder {
  id: string;
  soNumber: string;
  deliveryDate: string;
  priority: string;
  deliveryMethod?: number; // cr1bb_hinhthucgiaohang
  sodCount?: number;
  warehouseLocationId?: string; // [NEW] _cr1bb_vitrikho_value - ID vị trí kho
}

// [MOVED HERE TO FIX CIRCULAR DEPENDENCY]
export interface NotificationPayload {
  "Type":
  | "SALE_TO_SOURCE"
  | "SOURCE_TO_SALE"
  | "WAREHOUSE_TO_SALE"
  | "SALE_TO_WAREHOUSE"
  | "WAREHOUSE_CONFIRM_EXPORT"
  | "WAREHOUSE_REJECT_EXPORT"
  | "SALE_HUY_DON"
  | "SALE_TO_WAREHOUSE_CHOT_DON"
  | "SALE_SHIP_FACTORY"      // [NEW] Factory: Giao không chốt
  | "SALE_SHIP_AND_CLOSE"    // [NEW] Standard: Giao & Chốt
  | "SALE_CHOT_DON"
  | "WAREHOUSE_SUBMIT"
  | "SALE_URGENT_TO_WH"
  | "WH_URGENT_ACCEPTED"
  | "WH_URGENT_REJECTED"
  | "SALE_TO_WAREHOUSE_REJECT_REPORT";

  "SodId": string;
  "RecordId": string;
  "SodName": string;
  "Sku": string;
  "SONumber"?: string;
  "ProductName"?: string;
  "Message": string;
  "Details"?: {
    Actor?: string;
    ActionCode?: string;
    OriginalQty?: number;
    [key: string]: any;
  };
  "Timestamp": string;
}
