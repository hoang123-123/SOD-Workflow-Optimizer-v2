// Types copied from original project
export enum UserRole {
    SALE = 'SALE',
    SOURCE = 'SOURCE',
    WAREHOUSE = 'WAREHOUSE',
    VIEWER = 'VIEWER',
    ADMIN = 'ADMIN'
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
    action: 'SHIP_PARTIAL' | 'SHIP_AND_CLOSE' | 'WAIT_ALL' | 'CANCEL_ORDER' | 'REJECT_REPORT';
    timestamp: string;
    quantity?: number;
    isFactory?: boolean;
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
    requestedBy?: string;
}

export interface WarehouseVerification {
    actualQty: number;
    requestedQty: number;
    actualPickedQty?: number;
    requestedNeed?: number;
    requestedNeedON?: number;
    requestedNeedWH?: number;
    timestamp: string;
    discrepancyType?: 'INVENTORY' | 'CONVERSION_RATE' | 'SALE_REQUEST' | 'WAREHOUSE_SPEC';
    createdByDept?: string;
    actor?: string;
}

export interface SOD {
    id: string;
    detailName: string;
    soNumber: string;
    product: Product;
    qtyOrdered: number;
    qtyDelivered: number;
    qtyAvailable: number;
    deliveryCount?: number;
    warehouseLocation?: string;
    status: SODStatus;
    saleDecision?: SaleDecision;
    sourcePlan?: SourcePlan;
    warehouseConfirmation?: WarehouseConfirmation;
    warehouseVerification?: WarehouseVerification;
    isNotificationSent?: boolean;
    expectedDeliveryDate?: string;
    unitOrderName?: string;
    unitWarehouseName?: string;
    conversionRate?: number;
    theoreticalStock?: number;
    requiredProductQty?: number;
    qtyOrderRemainingON?: number;
    qtyOrderRemainingWH?: number;
    qtySystemPickedWH?: number;
    urgentRequest?: UrgentRequest;
    statusFromPlan?: 'Đủ' | 'Thiếu' | string;
}

export interface Customer {
    id: string;
    name: string;
    industryType?: number;
}

export const INDUSTRY_FACTORY = 191920000;

export interface SalesOrder {
    id: string;
    soNumber: string;
    deliveryDate: string;
    priority: string;
    deliveryMethod?: number;
    sodCount?: number;
    warehouseLocationId?: string;
}
