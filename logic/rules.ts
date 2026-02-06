
import { UserRole, SODStatus } from '../types';

// Định nghĩa các loại Trigger Action mà hệ thống hỗ trợ
export type TriggerActionType =
    | 'TRIGGER_SALE_SHIPMENT'      // Sale giao hàng
    | 'TRIGGER_SALE_WAIT'          // Sale chờ hàng
    | 'TRIGGER_SALE_CANCEL'        // Sale hủy
    | 'TRIGGER_SOURCE_CONFIRM'     // Source xác nhận ETA
    | 'TRIGGER_WH_REPORT'          // Kho báo cáo thiếu
    | 'TRIGGER_WH_CONFIRM'         // Kho xác nhận xuất
    | 'TRIGGER_WH_REJECT'          // Kho từ chối
    | 'TRIGGER_SALE_URGENT_REQUEST' // Sale yêu cầu đơn gấp
    | 'TRIGGER_WH_ACCEPT_URGENT'    // Kho chấp nhận đơn gấp
    | 'TRIGGER_WH_REJECT_URGENT'    // Kho từ chối đơn gấp
    | 'TRIGGER_SALE_REJECT_REPORT'  // [NEW] Sale từ chối báo cáo sai lệch (không hủy đơn)
    | 'TRIGGER_SALE_ACCEPT_CORRECTION'  // [NEW] Sale đồng ý sửa số -> gửi Automate
    | 'TRIGGER_SALE_REJECT_CORRECTION'; // [NEW] Sale từ chối sửa số -> Kho kiểm lại

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
    // --- CASE A1: GIAO & CHỐT LẦN 1 (K=1) ---
    {
        id: 'A1',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Giao & Chốt dòng',
        description: 'Giao số có sẵn và chốt dòng hàng. Tag: DT_X1_D1',
        actor: UserRole.SALE,
        input: {
            actionName: 'Giao & Chốt',
            condition: 'DeliveryCount = 0 & Có hàng khả dụng'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_SHIPMENT',
            apiTrigger: 'notifyWarehouseOnSaleShipment',
            notificationTag: 'SALE_TO_WAREHOUSE_CHOT_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Gửi yêu cầu xuất + Giảm số lượng đặt (nếu thiếu). Tag: DT_X1_D1'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận lệnh và thông báo chốt dòng.',
            nextAction: 'Kho xác nhận xuất.'
        }
    },
    // --- CASE A2: CHỜ HÀNG (CHỈ SAU KHI KHO BÁO SAI LỆCH) ---
    {
        id: 'A2',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Chờ bổ sung hàng',
        description: 'Kho báo thiếu, khách đồng ý chờ. Tag: DT_X1_D1',
        actor: UserRole.SALE,
        input: {
            actionName: 'Chờ bổ sung hàng',
            condition: 'DeliveryCount = 0 & isNotificationSent = true'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_WAIT',
            apiTrigger: 'notifySourceOnSaleDecision',
            notificationTag: 'SALE_TO_SOURCE',
            nextStatus: SODStatus.SHORTAGE_PENDING_SOURCE,
            logicDesc: 'Treo SOD chờ Source bổ sung. Tag: DT_X1_D1'
        },
        output: {
            targetRole: UserRole.SOURCE,
            uiDescription: 'Source nhập ETA.',
            nextAction: 'Source xác nhận ngày hàng về.'
        }
    },
    // --- CASE A3: HỦY ĐƠN LẦN 1 ---
    {
        id: 'A3',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Hủy đơn (Cancel)',
        description: 'Hủy dòng hàng. Tag: DT_X1_D1',
        actor: UserRole.SALE,
        input: {
            actionName: 'Hủy dòng hàng',
            condition: 'DeliveryCount = 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_CANCEL',
            apiTrigger: 'notifySaleCancelDecision',
            notificationTag: 'SALE_HUY_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Đóng dòng hàng 100%. Tag: DT_X1_D1'
        },
        output: {
            targetRole: UserRole.VIEWER,
            uiDescription: 'Trạng thái Đã Hủy.',
            nextAction: 'Kết thúc.'
        }
    },
    // --- CASE A4: TỪ CHỐI BÁO CÁO SAI LỆCH (KHÔNG HỦY ĐƠN) ---
    {
        id: 'A4',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Từ chối báo cáo sai lệch',
        description: 'Sale không đồng ý với số liệu Kho báo. Tag: DT_X1_D1',
        actor: UserRole.SALE,
        input: {
            actionName: 'Từ chối báo cáo',
            condition: 'Có warehouseVerification'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_REJECT_REPORT',
            apiTrigger: 'notifySaleRejectReport',
            notificationTag: 'SALE_TO_WAREHOUSE_REJECT_REPORT',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Từ chối đề xuất của Kho, yêu cầu kiểm tra lại. Tag: DT_X1_D1'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận thông báo từ chối báo cáo.',
            nextAction: 'Kho kiểm tra lại tồn kho.'
        }
    },
    // --- CASE A5: ĐỒNG Ý SỬA SỐ (CHỈ CHO DISCREPANCY TYPE = SALE_REQUEST) ---
    {
        id: 'A5',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Đồng ý sửa số lượng',
        description: 'Sale đồng ý yêu cầu sửa số từ Kho. Power Automate sẽ cập nhật số lượng đơn.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Xác nhận sửa số',
            condition: 'DeliveryCount = 0 & discrepancyType = SALE_REQUEST'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_ACCEPT_CORRECTION',
            apiTrigger: 'notifyWarehouseOnSaleAcceptCorrection',
            notificationTag: 'SALE_ACCEPT_CORRECTION',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Gửi Automate sửa số lượng trên đơn hàng.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận thông báo Sale đã đồng ý sửa số.',
            nextAction: 'Automate cập nhật số lượng.'
        }
    },
    // --- CASE A6: TỪ CHỐI SỬA SỐ (CHỈ CHO DISCREPANCY TYPE = SALE_REQUEST) ---
    {
        id: 'A6',
        group: 'CASE A (Lần đầu K=1)',
        name: 'Từ chối sửa số lượng',
        description: 'Sale từ chối yêu cầu sửa số từ Kho. Kho cần kiểm tra lại.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Từ chối sửa số',
            condition: 'DeliveryCount = 0 & discrepancyType = SALE_REQUEST'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_REJECT_CORRECTION',
            apiTrigger: 'notifyWarehouseOnSaleRejectCorrection',
            notificationTag: 'SALE_REJECT_CORRECTION',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Gửi thông báo từ chối. Kho kiểm tra lại.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận thông báo Sale từ chối sửa số.',
            nextAction: 'Kho kiểm tra lại và gửi request mới nếu cần.'
        }
    },

    {
        id: 'B1',
        group: 'CASE B (Lần sau K>1)',
        name: 'Giao & Chốt (Partial)',
        description: 'Giao số có và chốt luôn. Tag: DT_X1_D2',
        actor: UserRole.SALE,
        input: {
            actionName: 'Giao & Chốt',
            condition: 'DeliveryCount > 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_SHIPMENT',
            apiTrigger: 'notifyWarehouseOnSaleShipment',
            notificationTag: 'SALE_TO_WAREHOUSE_CHOT_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Gửi yêu cầu xuất + Giảm số lượng đặt. Tag: DT_X1_D2'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận lệnh và thông báo chốt.',
            nextAction: 'Kho xác nhận xuất.'
        }
    },
    // --- CASE B2: CHỜ HÀNG (CHỈ SAU KHI KHO BÁO SAI LỆCH) ---
    {
        id: 'B2',
        group: 'CASE B (Lần sau K>1)',
        name: 'Chờ bổ sung hàng',
        description: 'Kho báo thiếu, tiếp tục chờ đợt sau. Tag: DT_X1_D2',
        actor: UserRole.SALE,
        input: {
            actionName: 'Chờ bổ sung hàng',
            condition: 'DeliveryCount > 0 & isNotificationSent = true'
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
    // --- CASE B3: HỦY ĐƠN (CANCEL) - GIỐNG A3 ---
    {
        id: 'B3',
        group: 'CASE B (Lần sau K>1)',
        name: 'Hủy đơn (Cancel)',
        description: 'Hủy hoàn toàn dòng hàng. Không giao dở dang. Tag: DT_X1_D2',
        actor: UserRole.SALE,
        input: {
            actionName: 'Hủy dòng hàng',
            condition: 'DeliveryCount > 0'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_CANCEL',
            apiTrigger: 'notifySaleCancelDecision',
            notificationTag: 'SALE_HUY_DON',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Hủy toàn bộ dòng hàng. Không cho phép giao dở dang. Tag: DT_X1_D2'
        },
        output: {
            targetRole: UserRole.VIEWER,
            uiDescription: 'Trạng thái Đã Hủy.',
            nextAction: 'Kết thúc.'
        }
    },
    // --- CASE B4: TỪ CHỐI BÁO CÁO SAI LỆCH LẦN K>1 ---
    {
        id: 'B4',
        group: 'CASE B (Lần sau K>1)',
        name: 'Từ chối báo cáo sai lệch',
        description: 'Sale không đồng ý với số liệu Kho báo. Tag: DT_X1_D2',
        actor: UserRole.SALE,
        input: {
            actionName: 'Từ chối báo cáo',
            condition: 'DeliveryCount > 0 & Có warehouseVerification'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_REJECT_REPORT',
            apiTrigger: 'notifySaleRejectReport',
            notificationTag: 'SALE_TO_WAREHOUSE_REJECT_REPORT',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Từ chối đề xuất của Kho, yêu cầu kiểm tra lại. Tag: DT_X1_D2'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận thông báo từ chối báo cáo.',
            nextAction: 'Kho kiểm tra lại tồn kho.'
        }
    },
    // --- CASE B5: ĐỒNG Ý SỬA SỐ (CHỈ CHO DISCREPANCY TYPE = SALE_REQUEST) ---
    {
        id: 'B5',
        group: 'CASE B (Lần sau K>1)',
        name: 'Đồng ý sửa số lượng',
        description: 'Sale đồng ý yêu cầu sửa số từ Kho. Power Automate sẽ cập nhật số lượng đơn.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Xác nhận sửa số',
            condition: 'DeliveryCount > 0 & discrepancyType = SALE_REQUEST'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_ACCEPT_CORRECTION',
            apiTrigger: 'notifyWarehouseOnSaleAcceptCorrection',
            notificationTag: 'SALE_ACCEPT_CORRECTION',
            nextStatus: SODStatus.RESOLVED,
            logicDesc: 'Gửi Automate sửa số lượng trên đơn hàng.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận thông báo Sale đã đồng ý sửa số.',
            nextAction: 'Automate cập nhật số lượng.'
        }
    },
    // --- CASE B6: TỪ CHỐI SỬA SỐ (CHỈ CHO DISCREPANCY TYPE = SALE_REQUEST) ---
    {
        id: 'B6',
        group: 'CASE B (Lần sau K>1)',
        name: 'Từ chối sửa số lượng',
        description: 'Sale từ chối yêu cầu sửa số từ Kho. Kho cần kiểm tra lại.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Từ chối sửa số',
            condition: 'DeliveryCount > 0 & discrepancyType = SALE_REQUEST'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_REJECT_CORRECTION',
            apiTrigger: 'notifyWarehouseOnSaleRejectCorrection',
            notificationTag: 'SALE_REJECT_CORRECTION',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Gửi thông báo từ chối. Kho kiểm tra lại.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho nhận thông báo Sale từ chối sửa số.',
            nextAction: 'Kho kiểm tra lại và gửi request mới nếu cần.'
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
    },
    // --- ACTION CỦA SALE: YÊU CẦU ĐƠN GẤP ---
    {
        id: 'SALE_URGENT',
        group: 'EXCEPTION',
        name: 'Sale Yêu Cầu Đơn Gấp',
        description: 'Sale yêu cầu kho ưu tiên soạn đơn dù chưa đến hạn.',
        actor: UserRole.SALE,
        input: {
            actionName: 'Yêu cầu Giao gấp',
            condition: 'theoreticalStock > requiredProductQty & Future Order'
        },
        process: {
            triggerAction: 'TRIGGER_SALE_URGENT_REQUEST',
            apiTrigger: 'notifyWarehouseOnUrgentRequest',
            notificationTag: 'SALE_URGENT_TO_WH',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Gửi yêu cầu ưu tiên tới Kho.'
        },
        output: {
            targetRole: UserRole.WAREHOUSE,
            uiDescription: 'Kho thấy yêu cầu Giao gấp.',
            nextAction: 'Kho chấp nhận hoặc từ chối.'
        }
    },
    // --- ACTION CỦA KHO: CHẤP NHẬN ĐƠN GẤP ---
    {
        id: 'WH_URGENT_ACCEPT',
        group: 'EXCEPTION',
        name: 'Kho Chấp Nhận Đơn Gấp',
        description: 'Kho đồng ý đưa đơn gấp vào kế hoạch soạn.',
        actor: UserRole.WAREHOUSE,
        input: {
            actionName: 'Chấp nhận Giao gấp',
            condition: 'Sale đã yêu cầu Urgent'
        },
        process: {
            triggerAction: 'TRIGGER_WH_ACCEPT_URGENT',
            apiTrigger: 'notifySaleOnUrgentResponse (ACCEPTED)',
            notificationTag: 'WH_URGENT_ACCEPTED',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Cập nhật urgentRequest = ACCEPTED.'
        },
        output: {
            targetRole: UserRole.SALE,
            uiDescription: 'Sale nhận thông tin Kho đã nhận đơn gấp.',
            nextAction: 'Sale thực hiện lệnh Giao & Chốt.'
        }
    },
    // --- ACTION CỦA KHO: TỪ CHỐI ĐƠN GẤP ---
    {
        id: 'WH_URGENT_REJECT',
        group: 'EXCEPTION',
        name: 'Kho Từ Chối Đơn Gấp',
        description: 'Kho từ chối xử lý đơn gấp do quá tải hoặc lý do khác.',
        actor: UserRole.WAREHOUSE,
        input: {
            actionName: 'Từ chối Giao gấp',
            condition: 'Sale đã yêu cầu Urgent'
        },
        process: {
            triggerAction: 'TRIGGER_WH_REJECT_URGENT',
            apiTrigger: 'notifySaleOnUrgentResponse (REJECTED)',
            notificationTag: 'WH_URGENT_REJECTED',
            nextStatus: 'KEEP_CURRENT',
            logicDesc: 'Cập nhật urgentRequest = REJECTED.'
        },
        output: {
            targetRole: UserRole.SALE,
            uiDescription: 'Sale nhận thông tin Kho từ chối đơn gấp.',
            nextAction: 'Sale chờ đến hạn hoặc xử lý khác.'
        }
    }
];
