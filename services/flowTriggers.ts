
// Service quản lý các Webhook trigger sang Power Automate hoặc hệ thống bên ngoài
import * as Templates from '../logic/notificationTemplates';
import { NotificationPayload } from '../types';

// [UPDATED] Sử dụng chung URL cho cả Sale Decision và Notification theo yêu cầu
const UNIVERSAL_FLOW_URL = 'https://de210e4bcd22e60591ca8e841aad4b.8e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/d156724722ef4734b42926199b053df6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=X0w7jUMxJmZXDdRT4hX_xwVYOlFSciq_Fy2soUfyZA0';

/**
 * Helper: Gửi Payload đến Power Automate
 */
const sendToFlow = async (payload: NotificationPayload, contextName: string): Promise<boolean> => {
    try {
        console.log(`🔔 [${contextName}] Sending payload:`, payload);

        const response = await fetch(UNIVERSAL_FLOW_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const softSuccessCodes = [502, 500, 503, 504, 400, 404, 401];
            if (softSuccessCodes.includes(response.status)) {
                console.warn(`⚠️ [${contextName}] Flow returned ${response.status}. Treating as success for UI.`);
                return true;
            }
            throw new Error(`[${contextName}] Failed: ${response.status} ${response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error(`[Flow Trigger] ${contextName} Error:`, error);
        return true; // Return true to not block UI
    }
};

/**
 * [CASE A2 & B2] Sale chọn "Chờ Source xử lý" (WAIT_ALL)
 */
export const notifySourceOnSaleDecision = async (sod: any, recordId: string): Promise<boolean> => {
    const payload = Templates.buildSaleToSourcePayload(sod, recordId);
    return await sendToFlow(payload, "Notify Source");
};

/**
 * [CASE A1 & B1] Sale chọn "Giao ngay" (SHIP_PARTIAL hoặc SHIP_AND_CLOSE)
 * @param isFactory - true nếu khách hàng là Nhà máy (chỉ giao, không chốt)
 */
export const notifyWarehouseOnSaleShipment = async (sod: any, quantityToShip: number, recordId: string, isFactory: boolean = false): Promise<boolean> => {
    console.log("!!! notifyWarehouseOnSaleShipment - isFactory:", isFactory);

    // [NEW] Chọn template dựa trên loại khách hàng
    const payload = isFactory
        ? Templates.buildFactoryShipPayload(sod, recordId, quantityToShip)
        : Templates.buildStandardShipPayload(sod, recordId, quantityToShip);

    return await sendToFlow(payload, isFactory ? "Notify Warehouse (Factory)" : "Notify Warehouse (Standard)");
};

/**
 * [CASE A3 & B3] Sale chọn "Hủy / Chốt đơn" (CANCEL_ORDER)
 */
export const notifySaleCancelDecision = async (sod: any, recordId: string): Promise<boolean> => {
    const payload = Templates.buildSaleCancelPayload(sod, recordId);
    return await sendToFlow(payload, "Notify Cancel");
}

/**
 * [MỚI] Thông báo ngược lại cho Sale khi Source đã xác nhận kế hoạch (ETA)
 */
export const notifySaleOnSourcePlan = async (sod: any, recordId: string): Promise<boolean> => {
    const payload = Templates.buildSourceToSalePayload(sod, recordId);
    return await sendToFlow(payload, "Notify Sale (Source Plan)");
};

/**
 * [MỚI] Thông báo cho Sale khi Kho xác nhận thiếu hụt (Warehouse Discovery)
 */
export const notifySaleOnShortage = async (sod: any, recordId: string): Promise<boolean> => {
    const payload = Templates.buildWarehouseReportPayload(sod, recordId);
    return await sendToFlow(payload, "Notify Sale (Shortage)");
};

/**
 * [MỚI] Thông báo Kết quả xử lý của Kho (Xác nhận/Từ chối) - Gửi Sale
 */
export const notifySaleOnWarehouseConfirmation = async (sod: any, status: 'CONFIRMED' | 'REJECTED', reason: string | undefined, recordId: string): Promise<boolean> => {
    const payload = Templates.buildWarehouseConfirmationPayload(sod, recordId, status, reason);
    return await sendToFlow(payload, "Notify Warehouse Confirm");
};

/**
 * [MỚI] Thông báo cho Bộ phận Soạn hàng khi Kho Xác nhận (WAREHOUSE_SUBMIT)
 */
export const notifyPickingDeptOnSubmit = async (sod: any, recordId: string): Promise<boolean> => {
    const payload = Templates.buildPickingDeptPayload(sod, recordId);
    return await sendToFlow(payload, "Notify Picking Dept");
};

/**
 * [MỚI] Sale yêu cầu giao gấp (Urgent Request)
 */
export const notifyWarehouseOnUrgentRequest = async (sod: any, recordId: string): Promise<boolean> => {
    const payload: NotificationPayload = {
        "Type": "SALE_URGENT_TO_WH",
        "RecordId": recordId,
        "SodId": sod.id,
        "SodName": sod.detailName,
        "SONumber": sod.soNumber,
        "Sku": sod.product.sku,
        "ProductName": sod.product.name,
        "Message": `ĐƠN GẤP: Sale yêu cầu ưu tiên soạn hàng cho mã này.`,
        "Timestamp": new Date().toISOString()
    };
    return await sendToFlow(payload, "Notify Urgent Request");
};

/**
 * [MỚI] Kho phản hồi yêu cầu giao gấp (Urgent Response)
 */
export const notifySaleOnUrgentResponse = async (sod: any, status: 'ACCEPTED' | 'REJECTED', recordId: string): Promise<boolean> => {
    const payload: NotificationPayload = {
        "Type": status === 'ACCEPTED' ? "WH_URGENT_ACCEPTED" : "WH_URGENT_REJECTED",
        "RecordId": recordId,
        "SodId": sod.id,
        "SodName": sod.detailName,
        "SONumber": sod.soNumber,
        "Sku": sod.product.sku,
        "ProductName": sod.product.name,
        "Message": status === 'ACCEPTED' ? "KHO ĐÃ CHẤP NHẬN ĐƠN GẤP" : "KHO TỪ CHỐI ĐƠN GẤP",
        "Timestamp": new Date().toISOString()
    };
    return await sendToFlow(payload, "Notify Urgent Response");
};
