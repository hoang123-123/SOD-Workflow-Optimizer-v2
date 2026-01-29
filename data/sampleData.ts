/**
 * Sample Data cho Demo Mode
 * Chỉ Admin có quyền truy cập
 * Lưu thao tác vào localStorage
 */

import { SOD, SODStatus, INDUSTRY_FACTORY } from '../types';

// Key cho localStorage
export const DEMO_STORAGE_KEY = 'sod_demo_state';

// Định nghĩa các Test Case
export interface DemoTestCase {
    id: string;
    name: string;
    description: string;
    customerIndustryType: number; // 191920000 = Nhà máy
    sod: SOD;
}

// Ngày hôm nay để test
const today = new Date().toISOString().split('T')[0];

/**
 * Tất cả Test Cases
 */
export const DEMO_TEST_CASES: DemoTestCase[] = [
    // ============ SALE TẠO REQUEST (từ Kế hoạch soạn) ============
    {
        id: 'SALE_REQ_FACTORY_1',
        name: '[Sale] Thiếu hàng - Nhà máy',
        description: 'Sale tạo request từ đơn thiếu. Khách là Nhà máy → Chỉ có option Giao',
        customerIndustryType: INDUSTRY_FACTORY,
        sod: {
            id: 'demo-sale-factory-1',
            detailName: 'DEMO-SOD-001',
            soNumber: 'SO-DEMO-001',
            product: {
                sku: 'DEMO-SKU-001',
                name: 'Sản phẩm Demo - Nhà máy'
            },
            qtyOrdered: 100,
            qtyDelivered: 0,
            qtyAvailable: 60, // Khả dụng < Cần → Thiếu
            qtyOrderRemainingON: 100,
            qtyOrderRemainingWH: 200,
            deliveryCount: 0,
            conversionRate: 2,
            unitOrderName: 'Hộp',
            unitWarehouseName: 'Cái',
            status: SODStatus.SHORTAGE_PENDING_SALE,
            statusFromPlan: 'Thiếu',
            expectedDeliveryDate: today,
            theoreticalStock: 50,
            requiredProductQty: 100
        }
    },
    {
        id: 'SALE_REQ_OTHER_1',
        name: '[Sale] Thiếu hàng - Khách thường',
        description: 'Sale tạo request từ đơn thiếu. Khách thường → Có option Giao + Hủy',
        customerIndustryType: 0, // Không phải Factory
        sod: {
            id: 'demo-sale-other-1',
            detailName: 'DEMO-SOD-002',
            soNumber: 'SO-DEMO-002',
            product: {
                sku: 'DEMO-SKU-002',
                name: 'Sản phẩm Demo - Khách thường'
            },
            qtyOrdered: 50,
            qtyDelivered: 0,
            qtyAvailable: 30, // Thiếu 20
            qtyOrderRemainingON: 50,
            qtyOrderRemainingWH: 50,
            deliveryCount: 0,
            conversionRate: 1,
            unitOrderName: 'Thùng',
            unitWarehouseName: 'Thùng',
            status: SODStatus.SHORTAGE_PENDING_SALE,
            statusFromPlan: 'Thiếu',
            expectedDeliveryDate: today,
            theoreticalStock: 20,
            requiredProductQty: 50
        }
    },

    // ============ KHO GỬI REQUEST (Báo sai lệch) ============
    {
        id: 'WH_REQ_FACTORY_1',
        name: '[Kho→Sale] Sai lệch - Nhà máy',
        description: 'Kho đã kiểm đếm và báo sai lệch. Khách Nhà máy → Giao + Chờ hàng',
        customerIndustryType: INDUSTRY_FACTORY,
        sod: {
            id: 'demo-wh-factory-1',
            detailName: 'DEMO-SOD-003',
            soNumber: 'SO-DEMO-003',
            product: {
                sku: 'DEMO-SKU-003',
                name: 'Sản phẩm Demo - Kho báo sai lệch (Factory)'
            },
            qtyOrdered: 80,
            qtyDelivered: 0,
            qtyAvailable: 50,
            qtyOrderRemainingON: 80,
            qtyOrderRemainingWH: 160,
            deliveryCount: 0,
            conversionRate: 2,
            unitOrderName: 'Bao',
            unitWarehouseName: 'Kg',
            status: SODStatus.SHORTAGE_PENDING_SALE,
            statusFromPlan: 'Thiếu',
            expectedDeliveryDate: today,
            isNotificationSent: true, // ← Kho đã gửi notification
            warehouseVerification: {
                actualQty: 100, // Kho có 100 Kg
                requestedQty: 50, // Đáp ứng 50 Bao
                timestamp: new Date().toISOString(),
                discrepancyType: 'INVENTORY',
                createdByDept: 'Kho Miền Nam'
            }
        }
    },
    {
        id: 'WH_REQ_OTHER_1',
        name: '[Kho→Sale] Sai lệch - Khách thường',
        description: 'Kho đã kiểm đếm và báo sai lệch. Khách thường → Giao + Chờ hàng + Hủy',
        customerIndustryType: 0,
        sod: {
            id: 'demo-wh-other-1',
            detailName: 'DEMO-SOD-004',
            soNumber: 'SO-DEMO-004',
            product: {
                sku: 'DEMO-SKU-004',
                name: 'Sản phẩm Demo - Kho báo sai lệch (Khách thường)'
            },
            qtyOrdered: 40,
            qtyDelivered: 0,
            qtyAvailable: 25,
            qtyOrderRemainingON: 40,
            qtyOrderRemainingWH: 40,
            deliveryCount: 0,
            conversionRate: 1,
            unitOrderName: 'Thùng',
            unitWarehouseName: 'Thùng',
            status: SODStatus.SHORTAGE_PENDING_SALE,
            statusFromPlan: 'Thiếu',
            expectedDeliveryDate: today,
            isNotificationSent: true,
            warehouseVerification: {
                actualQty: 25,
                requestedQty: 25,
                timestamp: new Date().toISOString(),
                discrepancyType: 'INVENTORY',
                createdByDept: 'Kho Trung tâm'
            }
        }
    },

    // ============ ĐƠN GẤP ============
    {
        id: 'URGENT_PENDING',
        name: '[Đơn gấp] Sale yêu cầu - Kho chưa xử lý',
        description: 'Sale đã yêu cầu giao gấp. Kho cần Chấp nhận hoặc Từ chối.',
        customerIndustryType: INDUSTRY_FACTORY,
        sod: {
            id: 'demo-urgent-1',
            detailName: 'DEMO-SOD-005',
            soNumber: 'SO-DEMO-005',
            product: {
                sku: 'DEMO-SKU-005',
                name: 'Sản phẩm Demo - Đơn gấp'
            },
            qtyOrdered: 30,
            qtyDelivered: 0,
            qtyAvailable: 30,
            qtyOrderRemainingON: 30,
            qtyOrderRemainingWH: 60,
            deliveryCount: 0,
            conversionRate: 2,
            unitOrderName: 'Hộp',
            unitWarehouseName: 'Cái',
            status: SODStatus.SUFFICIENT,
            statusFromPlan: 'Đủ',
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 ngày sau
            theoreticalStock: 100,
            requiredProductQty: 30,
            urgentRequest: {
                status: 'PENDING',
                timestamp: new Date().toISOString(),
                requestedBy: 'Sale Demo'
            }
        }
    },

    // ============ ĐƠN ĐÃ XỬ LÝ ============
    {
        id: 'PROCESSED_SHIP',
        name: '[Đã xử lý] Sale chốt giao',
        description: 'Đơn đã được Sale chốt giao. Hiển thị trạng thái đã xử lý.',
        customerIndustryType: 0,
        sod: {
            id: 'demo-processed-1',
            detailName: 'DEMO-SOD-006',
            soNumber: 'SO-DEMO-006',
            product: {
                sku: 'DEMO-SKU-006',
                name: 'Sản phẩm Demo - Đã xử lý'
            },
            qtyOrdered: 20,
            qtyDelivered: 0,
            qtyAvailable: 15,
            qtyOrderRemainingON: 20,
            qtyOrderRemainingWH: 20,
            deliveryCount: 0,
            conversionRate: 1,
            unitOrderName: 'Thùng',
            unitWarehouseName: 'Thùng',
            status: SODStatus.RESOLVED,
            statusFromPlan: 'Thiếu',
            expectedDeliveryDate: today,
            isNotificationSent: true,
            saleDecision: {
                action: 'SHIP_AND_CLOSE',
                quantity: 15,
                timestamp: new Date().toISOString()
            }
        }
    }
];

/**
 * Helper: Lấy state từ localStorage
 */
export const getDemoState = (): Record<string, SOD> => {
    try {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

/**
 * Helper: Lưu state vào localStorage
 */
export const saveDemoState = (state: Record<string, SOD>) => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
};

/**
 * Helper: Reset demo về trạng thái ban đầu
 */
export const resetDemoState = () => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
};

/**
 * Lấy SOD cho test case (merge với localStorage nếu có)
 */
export const getTestCaseSOD = (caseId: string): { sod: SOD; customerIndustryType: number } | null => {
    const testCase = DEMO_TEST_CASES.find(tc => tc.id === caseId);
    if (!testCase) return null;

    const savedState = getDemoState();
    const mergedSod = savedState[caseId] || testCase.sod;

    return {
        sod: mergedSod,
        customerIndustryType: testCase.customerIndustryType
    };
};

/**
 * Cập nhật SOD cho test case và lưu vào localStorage
 */
export const updateTestCaseSOD = (caseId: string, updatedSod: SOD) => {
    const state = getDemoState();
    state[caseId] = updatedSod;
    saveDemoState(state);
};
