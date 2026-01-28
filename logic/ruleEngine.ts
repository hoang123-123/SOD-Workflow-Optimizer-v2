
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
    discrepancyType?: 'INVENTORY' | 'CONVERSION_RATE'; // [NEW] Cho hành động Warehouse Report
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

    console.log(`🧠 [RuleEngine] Executing Rule: ${ruleId} (${ruleDef.name})`, { params });

    // 2. Clone SOD để không mutate trực tiếp
    let updatedSOD = { ...sod };
    const actionType = ruleDef.process.triggerAction;

    // 3. Thực thi Logic dựa trên TriggerAction
    switch (actionType) {
        case 'TRIGGER_SALE_SHIPMENT': {
            const qtyToShip = params.quantity || 0;
            // Gọi Flow trigger
            await FlowTriggers.notifyWarehouseOnSaleShipment(sod, qtyToShip, recordId);
            
            // Cập nhật State
            updatedSOD.saleDecision = {
                action: 'SHIP_PARTIAL',
                quantity: qtyToShip,
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
                discrepancyType: params.discrepancyType, // [NEW]
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

        default:
            console.warn(`⚠️ [RuleEngine] Action type '${actionType}' not implemented.`);
    }

    // 4. Cập nhật Status chung (Status Transition)
    if (ruleDef.process.nextStatus !== 'KEEP_CURRENT') {
        updatedSOD.status = ruleDef.process.nextStatus;
    }

    return updatedSOD;
};
