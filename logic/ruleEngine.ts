
import { BUSINESS_RULES, TriggerActionType } from './rules';
import { SOD, SODStatus } from '../types';
import * as FlowTriggers from '../services/flowTriggers';

// Interface cho tham số truyền vào khi thực thi Rule
export interface RuleExecutionParams {
    quantity?: number;      // Cho hành động Ship
    eta?: string;           // Cho hành động Source Confirm
    supplier?: string;      // Cho hành động Source Confirm
    reason?: string;        // Cho hành động Warehouse Reject
    actualQty?: number;     // Cho hành động Warehouse Report
    requestedQty?: number;  // Cho hành động Warehouse Report
    actualPickedQty?: number; // [NEW] Số lượng thực soạn
    discrepancyType?: 'INVENTORY' | 'CONVERSION_RATE' | 'SALE_REQUEST' | 'WAREHOUSE_SPEC'; // [UPDATED] Thêm loại sai lệch
    dept?: string;          // [NEW] Phòng ban thực hiện
    actor?: string;         // [NEW] Role người thực hiện
    isFactory?: boolean;    // [NEW] Khách hàng là Nhà máy?
}

/**
 * Hàm thực thi Rule tập trung (The Brain)
 * @param ruleId ID của Rule trong file rules.ts (VD: 'A1', 'B2', 'WH_CONFIRM')
 * @param sod Dữ liệu SOD hiện tại
 * @param recordId ID của bản ghi cha (Context)
 * @param params Các tham số phụ (số lượng, ngày tháng...)
 * @returns Bản sao SOD đã được cập nhật trạng thái
 */
export const executeBusinessRule = async (
    ruleId: string,
    sod: SOD,
    recordId: string,
    params: RuleExecutionParams
): Promise<SOD> => {

    // 1. Tìm Rule Definition
    const ruleDef = BUSINESS_RULES.find(r => r.id === ruleId);
    if (!ruleDef) {
        throw new Error(`Rule ID '${ruleId}' not found in configuration.`);
    }

    // 2. Clone SOD để không mutate trực tiếp
    let updatedSOD = { ...sod };

    const actionType = ruleDef.process.triggerAction;

    // 3. Thực thi Logic dựa trên TriggerAction
    switch (actionType) {
        case 'TRIGGER_SALE_SHIPMENT': {
            const qtyToShip = params.quantity || 0;
            const isFactory = params.isFactory || false;

            // [NEW] Gọi Flow trigger với isFactory param
            await FlowTriggers.notifyWarehouseOnSaleShipment(sod, qtyToShip, recordId, isFactory);

            // [NEW] Cập nhật State - phân biệt action dựa trên Factory
            updatedSOD.saleDecision = {
                action: isFactory ? 'SHIP_PARTIAL' : 'SHIP_AND_CLOSE',
                quantity: qtyToShip,
                timestamp: new Date().toISOString(),
                isFactory: isFactory
            };

            // [UPDATED] Tự động xác nhận kho (Auto-Approve) cho TẤT CẢ khách hàng
            // Vì khi Sale chốt giao, hệ thống đã tự động chạy kế hoạch soạn hàng
            updatedSOD.warehouseConfirmation = {
                status: 'CONFIRMED',
                timestamp: new Date().toISOString()
            };

            // Nếu chuyển sang Ship -> Xóa Source Plan cũ (nếu có)
            updatedSOD.sourcePlan = undefined;
            break;
        }

        case 'TRIGGER_SALE_WAIT': {
            await FlowTriggers.notifySourceOnSaleDecision(sod, recordId);

            updatedSOD.saleDecision = {
                action: 'WAIT_ALL',
                timestamp: new Date().toISOString()
            };
            // Reset Source Plan để Source nhập lại
            updatedSOD.sourcePlan = undefined;
            break;
        }

        case 'TRIGGER_SALE_CANCEL': {
            await FlowTriggers.notifySaleCancelDecision(sod, recordId);

            updatedSOD.saleDecision = {
                action: 'CANCEL_ORDER',
                quantity: params.quantity || 0, // Thường là 0 hoặc phần còn thiếu
                timestamp: new Date().toISOString()
            };
            break;
        }

        case 'TRIGGER_SALE_REJECT_REPORT': {
            await FlowTriggers.notifyWarehouseOnSaleRejectReport(sod, recordId);

            updatedSOD.saleDecision = {
                action: 'REJECT_REPORT',
                timestamp: new Date().toISOString()
            };
            break;
        }

        case 'TRIGGER_SOURCE_CONFIRM': {
            // Cập nhật thông tin trước khi gửi notify
            updatedSOD.sourcePlan = {
                status: 'CONFIRMED',
                eta: params.eta || '',
                supplier: params.supplier || '',
                timestamp: new Date().toISOString()
            };

            await FlowTriggers.notifySaleOnSourcePlan(updatedSOD, recordId);
            break;
        }

        case 'TRIGGER_WH_REPORT': {
            updatedSOD.warehouseVerification = {
                actualQty: params.actualQty || 0,
                requestedQty: params.requestedQty || 0,
                actualPickedQty: params.actualPickedQty || 0, // [NEW] Số lượng thực soạn
                requestedNeedON: sod.qtyOrderRemainingON || 0, // [NEW] Lưu nhu cầu ON
                requestedNeedWH: sod.qtyOrderRemainingWH || 0, // [NEW] Lưu nhu cầu WH
                discrepancyType: params.discrepancyType,
                createdByDept: params.dept,
                actor: params.actor,
                timestamp: new Date().toISOString()
            };
            // Set cờ đã báo cáo
            updatedSOD.isNotificationSent = true;

            // Truyền SOD đã update vào hàm notify để nội dung chính xác
            await FlowTriggers.notifySaleOnShortage(updatedSOD, recordId);
            break;
        }

        case 'TRIGGER_WH_CONFIRM': {
            updatedSOD.warehouseConfirmation = {
                status: 'CONFIRMED',
                timestamp: new Date().toISOString()
            };

            // Gửi song song cho Sale và Picking Dept
            await Promise.all([
                FlowTriggers.notifySaleOnWarehouseConfirmation(updatedSOD, 'CONFIRMED', undefined, recordId),
                FlowTriggers.notifyPickingDeptOnSubmit(updatedSOD, recordId)
            ]);
            break;
        }

        case 'TRIGGER_WH_REJECT': {
            updatedSOD.warehouseConfirmation = {
                status: 'REJECTED',
                reason: params.reason || 'Không rõ lý do',
                timestamp: new Date().toISOString()
            };

            await FlowTriggers.notifySaleOnWarehouseConfirmation(updatedSOD, 'REJECTED', params.reason, recordId);
            break;
        }

        case 'TRIGGER_SALE_URGENT_REQUEST': {
            updatedSOD.urgentRequest = {
                status: 'PENDING',
                timestamp: new Date().toISOString()
            };
            await FlowTriggers.notifyWarehouseOnUrgentRequest(updatedSOD, recordId);
            break;
        }

        case 'TRIGGER_WH_ACCEPT_URGENT': {
            updatedSOD.urgentRequest = {
                status: 'ACCEPTED',
                timestamp: new Date().toISOString()
            };
            await FlowTriggers.notifySaleOnUrgentResponse(updatedSOD, 'ACCEPTED', recordId);
            break;
        }

        case 'TRIGGER_WH_REJECT_URGENT': {
            updatedSOD.urgentRequest = {
                status: 'REJECTED',
                timestamp: new Date().toISOString()
            };
            await FlowTriggers.notifySaleOnUrgentResponse(updatedSOD, 'REJECTED', recordId);
            break;
        }

        // [NEW] Sale đồng ý yêu cầu sửa số từ Kho (discrepancyType = SALE_REQUEST)
        case 'TRIGGER_SALE_ACCEPT_CORRECTION': {
            // Cập nhật saleDecision
            updatedSOD.saleDecision = {
                action: 'SHIP_AND_CLOSE', // Đánh dấu là đã xử lý
                quantity: sod.warehouseVerification?.requestedQty || 0,
                timestamp: new Date().toISOString()
            };

            // Gửi notification xuống Power Automate để sửa số
            await FlowTriggers.notifyWarehouseOnSaleAcceptCorrection(updatedSOD, recordId);
            break;
        }

        // [NEW] Sale từ chối yêu cầu sửa số từ Kho
        case 'TRIGGER_SALE_REJECT_CORRECTION': {
            // Cập nhật saleDecision để đánh dấu đã từ chối
            updatedSOD.saleDecision = {
                action: 'REJECT_REPORT', // Đánh dấu là từ chối
                timestamp: new Date().toISOString()
            };

            // Xóa warehouseVerification để Kho có thể gửi request mới
            updatedSOD.warehouseVerification = undefined;
            updatedSOD.isNotificationSent = false;

            // Gửi notification
            await FlowTriggers.notifyWarehouseOnSaleRejectCorrection(updatedSOD, recordId);
            break;
        }

        default:
            console.warn(`⚠️ [RuleEngine] Action type '${actionType}' not implemented.`);
    }

    // 4. Cập nhật Status chung (Status Transition)
    if (ruleDef.process.nextStatus !== 'KEEP_CURRENT') {
        updatedSOD.status = ruleDef.process.nextStatus;
    }

    return updatedSOD;
};
