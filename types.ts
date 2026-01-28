
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
  action: 'SHIP_PARTIAL' | 'WAIT_ALL' | 'CANCEL_ORDER';
  timestamp: string;
  quantity?: number; // Quantity decided for shipment
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

export interface WarehouseVerification {
    actualQty: number; // Số lượng thực tế kho nhập
    requestedQty: number; // Số lượng đơn kho xác nhận
    timestamp: string;
    discrepancyType?: 'INVENTORY' | 'CONVERSION_RATE'; // [NEW] Loại sai lệch
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
}

export interface Customer {
    id: string;
    name: string;
}

export interface SalesOrder {
    id: string;
    soNumber: string;
    deliveryDate: string;
    priority: string;
    deliveryMethod?: number; // cr1bb_hinhthucgiaohang
    sodCount?: number;
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
        | "SALE_CHOT_DON"
        | "WAREHOUSE_SUBMIT";
        
    "SodId": string;
    "RecordId": string; 
    "SodName": string;
    "Sku": string;
    "Message": string;
    "Details"?: any;
    "Timestamp": string;
}
