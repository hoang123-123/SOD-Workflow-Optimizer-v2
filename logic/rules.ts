
import { UserRole, SODStatus } from '../types';

// Định nghĩa các loại Trigger Action mà hệ thống hỗ trợ
export type TriggerActionType = 
    | 'TRIGGER_SALE_SHIPMENT'      // Sale giao hàng
    | 'TRIGGER_SALE_WAIT'          // Sale chờ hàng
    | 'TRIGGER_SALE_CANCEL'        // Sale hủy
    | 'TRIGGER_SOURCE_CONFIRM'     // Source xác nhận ETA
    | 'TRIGGER_WH_REPORT'          // Kho báo cáo thiếu
    | 'TRIGGER_WH_CONFIRM'         // Kho xác nhận xuất
    | 'TRIGGER_WH_REJECT';         // Kho từ chối

export interface BusinessRule {
    id: string;
    group: 'CASE A (Lần đầu K=1)' | 'CASE B (Lần sau K>1)' | 'EXCEPTION';
    name: string;
    description: string;
    actor: UserRole;
    
    // INPUT: Điều kiện kích hoạt
    input: {
        actionName: string;
        condition: string;
    };

    // PROCESS: Cấu hình xử lý cho Rule Engine
    process: {
        triggerAction: TriggerActionType; // [NEW] Key để Engine biết gọi hàm nào
        apiTrigger: string; // Mô tả (Documentation)
        notificationTag?: string; // [NEW] Định danh Type của Notification gửi đi
        nextStatus: SODStatus | 'KEEP_CURRENT'; // Trạng thái đích
        logicDesc: string; 
    };

    // OUTPUT: Mô tả UI
    output: {
        targetRole: UserRole;
        uiDescription: string;
        nextAction: string;
    };
}

export const BUSINESS_RULES: BusinessRule[] = [
    // --- CASE A1: GIAO NGAY & CHỐT (CẬP NHẬT THEO YÊU CẦU: KHÔNG TREO SOD) ---
    {
        id: 'A1',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Giao ngay & Chốt',
        description: 'Giao số lượng đang có và Hủy phần thiếu còn lại.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Giao [X] SP',
            condition: 'DeliveryCount = 0 & Có Tồn kho'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_SHIPMENT',
            apiTrigger: 'notifyWarehouseOnSaleShipment',
            notificationTag: 'SALE_TO_WAREHOUSE_CHOT_DON', // [UPDATED] Chuyển sang Chốt đơn ngay lần 1
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Gửi yêu cầu xuất kho L. Chốt đơn và hủy phần thiếu.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Thấy yêu cầu xuất kho kèm thông báo chốt.',
            nextAction: 'Kho bấm Xác nhận Xuất.'
        }
    },
    // --- CASE A2: CHỜ HÀNG LẦN 1 ---
    {
        id: 'A2',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Chờ hàng (Wait All)',
        description: 'Khách muốn chờ đủ hàng mới giao.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Chờ hàng',
            condition: 'DeliveryCount = 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_WAIT',
            apiTrigger: 'notifySourceOnSaleDecision',
            notificationTag: 'SALE_TO_SOURCE',
            nextStatus: SODStatus.SHORTAGE_PENDING_SOURCE,
            logicDesc: 'Chuyển trạng thái sang Chờ Source.'
        },
        output: {
            targetRole: UserRole.SOURCE,
            uiDescription: 'Thấy Card "Xử lý Nguồn hàng" sáng lên.',
            nextAction: 'Source nhập ngày về và xác nhận.'
        }
    },
    // --- CASE A3: HỦY ĐƠN LẦN 1 ---
    {
        id: 'A3',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Hủy đơn (Cancel)',
        description: 'Khách không chờ được, hủy dòng hàng này.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Hủy đơn',
            condition: 'DeliveryCount = 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_CANCEL',
            apiTrigger: 'notifySaleCancelDecision',
            notificationTag: 'SALE_HUY_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Đóng dòng hàng (Status = Resolved).'
        },
        output: {
            targetRole: UserRole.VIEWER,
            uiDescription: 'Card hiển thị trạng thái "Đã Chốt".',
            nextAction: 'Quy trình kết thúc.'
        }
    },
    
    // --- CASE B1: GIAO TIẾP & CHỐT ---
    {
        id: 'B1',
        group: 'CASE B (Lần sau K>1)',
        name: 'Giao tiếp & Chốt',
        description: 'Giao nốt số có và chốt đơn (dù vẫn thiếu).',
        actor: UserRole.SALE,
        input: {
            actionName: 'Giao [X] SP',
            condition: 'DeliveryCount > 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_SHIPMENT', 
            apiTrigger: 'notifyWarehouseOnSaleShipment',
            notificationTag: 'SALE_TO_WAREHOUSE_CHOT_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Gửi yêu cầu xuất kho L. Đồng thời chốt đơn.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Thấy yêu cầu xuất kho kèm thông báo chốt.',
            nextAction: 'Kho bấm Xác nhận Xuất.'
        }
    },
    // --- CASE B2: TIẾP TỤC CHỜ ---
    {
        id: 'B2',
        group: 'CASE B (Lần sau K>1)',
        name: 'Tiếp tục chờ',
        description: 'Vẫn chưa đủ hàng, tiếp tục chờ đợt sau.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Chờ hàng',
            condition: 'DeliveryCount > 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_WAIT',
            apiTrigger: 'notifySourceOnSaleDecision',
            notificationTag: 'SALE_TO_SOURCE',
            nextStatus: SODStatus.SHORTAGE_PENDING_SOURCE,
            logicDesc: 'Trạng thái quay lại Chờ Source.'
        },
        output: {
            targetRole: UserRole.SOURCE,
            uiDescription: 'Card Source sáng lại. Yêu cầu nhập ETA mới.',
            nextAction: 'Source nhập ETA mới.'
        }
    },
    // --- CASE B3: CHỐT ĐƠN (STOP) ---
    {
        id: 'B3',
        group: 'CASE B (Lần sau K>1)',
        name: 'Chốt đơn (Stop)',
        description: 'Dừng, không chờ thêm nữa.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Hủy / Dừng',
            condition: 'DeliveryCount > 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_CANCEL',
            apiTrigger: 'notifySaleCancelDecision',
            notificationTag: 'SALE_CHOT_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Đóng dòng hàng theo số lượng đã giao.'
        },
        output: {
            targetRole: UserRole.VIEWER,
            uiDescription: 'Card hiển thị trạng thái "Đã Chốt".',
            nextAction: 'Quy trình kết thúc.'
        }
    },
    
    // --- ACTION CỦA KHO: BÁO CÁO SALE ---
    {
        id: 'WH_REPORT',
        group: 'EXCEPTION',
        name: 'Kho Request Sale',
        description: 'Kho kiểm đếm thấy thực tế khác hệ thống.',
        actor: UserRole.WAREHOUSE,
        input: {
            actionName: 'Request Sale',
            condition: 'Role = Warehouse'
        },
        process: {
            triggerAction: 'TRIGGER_WH_REPORT',
            apiTrigger: 'notifySaleOnShortage',
            notificationTag: 'WAREHOUSE_TO_SALE',
            nextStatus: 'KEEP_CURRENT', 
            logicDesc: 'Cập nhật warehouseVerification. Gửi noti Sale.'
        },
        output: {
            targetRole: UserRole.SALE,
            uiDescription: 'Sale thấy Alert xanh "Request từ Kho".',
            nextAction: 'Sale chọn phương án dựa trên số liệu mới.'
        }
    },

    // --- ACTION CỦA KHO: XÁC NHẬN ---
    {
        id: 'WH_CONFIRM',
        group: 'EXCEPTION',
        name: 'Kho Xác Nhận Xuất',
        description: 'Kho thực hiện lệnh xuất kho.',
        actor: UserRole.WAREHOUSE,
        input: {
            actionName: 'Xác nhận Xuất kho',
            condition: 'Sale chọn Ship'
        },
        process: {
            triggerAction: 'TRIGGER_WH_CONFIRM',
            apiTrigger: 'notifySale + notifyPicking',
            notificationTag: 'WAREHOUSE_CONFIRM_EXPORT', 
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Cập nhật warehouseConfirmation = CONFIRMED.'
        },
        output: {
            targetRole: UserRole.SALE,
            uiDescription: 'Badge chuyển thành "HOÀN TẤT XUẤT KHO".',
            nextAction: 'Kết thúc.'
        }
    },
    // --- ACTION CỦA KHO: TỪ CHỐI ---
    {
        id: 'WH_REJECT',
        group: 'EXCEPTION',
        name: 'Kho Từ Chối Xuất',
        description: 'Kho không thể xuất hàng (hỏng/lỗi).',
        actor: UserRole.WAREHOUSE,
        input: {
            actionName: 'Từ chối / Báo lỗi',
            condition: 'Sale chọn Ship'
        },
        process: {
            triggerAction: 'TRIGGER_WH_REJECT',
            apiTrigger: 'notifySaleOnWarehouseConfirmation (REJECTED)',
            notificationTag: 'WAREHOUSE_REJECT_EXPORT',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Cập nhật warehouseConfirmation = REJECTED.'
        },
        output: {
            targetRole: UserRole.SALE,
            uiDescription: 'Badge chuyển thành "KHO TỪ CHỐI".',
            nextAction: 'Sale kiểm tra lại.'
        }
    },
    // --- ACTION CỦA SOURCE: CONFIRM ---
    {
        id: 'SRC_CONFIRM',
        group: 'EXCEPTION',
        name: 'Source Xác Nhận ETA',
        description: 'Source phản hồi ngày hàng về.',
        actor: UserRole.SOURCE,
        input: {
            actionName: 'Xác nhận Kế hoạch',
            condition: 'Trạng thái Pending Source'
        },
        process: {
            triggerAction: 'TRIGGER_SOURCE_CONFIRM',
            apiTrigger: 'notifySaleOnSourcePlan',
            notificationTag: 'SOURCE_TO_SALE',
            nextStatus: SODStatus.RESOLVED, 
            logicDesc: 'Cập nhật SourcePlan = CONFIRMED.'
        },
        output: {
            targetRole: UserRole.SALE,
            uiDescription: 'Sale nhận thông tin ETA.',
            nextAction: 'Chờ đến ngày hàng về.'
        }
    }
];
