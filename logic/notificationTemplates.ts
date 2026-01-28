
import { SOD, NotificationPayload } from '../types';

/**
 * HELPER: Tính toán các chỉ số cơ bản
 */
const getIndices = (sod: SOD) => {
    const k = (sod.deliveryCount || 0) + 1; // Lần giao thứ K
    const N = sod.qtyOrdered - sod.qtyDelivered; // Nhu cầu (Net Need)
    const L = sod.qtyAvailable || 0; // Tồn kho khả dụng (Logistics)
    const unit = sod.unitOrderName || 'SP';
    
    // [NEW] Warehouse unit conversion info
    const unitWarehouse = sod.unitWarehouseName || unit;
    const rate = sod.conversionRate || 1;
    // Nhu cầu tính theo đơn vị kho (làm tròn 2 số thập phân để hiển thị đẹp)
    const N_wh = parseFloat((N * rate).toFixed(2));

    return { k, N, L, unit, unitWarehouse, N_wh, rate };
};

/**
 * TEMPLATE 1: SALE -> SOURCE (Yêu cầu nhập hàng)
 */
export const buildSaleToSourcePayload = (sod: SOD, recordId: string): NotificationPayload => {
    const { k, N, L, unit } = getIndices(sod);
    const missing = Math.max(0, N - L);

    // Logic nội dung tin nhắn
    const message = k === 1
        ? `Đơn hàng mới thiếu ${missing} ${unit}. Yêu cầu Source xác nhận ngày về.`
        : `Giao bổ sung lần ${k} vẫn thiếu ${missing} ${unit}. Tiếp tục chờ Source.`;

    return {
        Type: "SALE_TO_SOURCE",
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: message,
        Details: {
            NhuCau: N,
            TonKho: L,
            ThieuHut: missing,
            LanGiao: k
        },
        Timestamp: new Date().toISOString()
    };
};

/**
 * TEMPLATE 2: SALE -> WAREHOUSE (Lệnh xuất kho)
 */
export const buildSaleToWarehousePayload = (sod: SOD, recordId: string, quantityToShip?: number): NotificationPayload => {
    const { k, N, L, unit, unitWarehouse, rate } = getIndices(sod);
    
    // [UPDATED] Xác định số lượng xuất:
    const actualShipQty = quantityToShip !== undefined 
        ? quantityToShip 
        : (sod.warehouseVerification?.requestedQty ?? L);

    const actualShipQtyWh = parseFloat((actualShipQty * rate).toFixed(2));

    // [RULE CHANGE]: Mọi hành động giao hàng đều là "Giao & Chốt" (Không treo dở dang SOD)
    // Type luôn là SALE_TO_WAREHOUSE_CHOT_DON
    
    // Tính số lượng giảm (để ERP biết cần hủy bao nhiêu)
    // NumSOD âm = Giảm số lượng đặt
    // Ví dụ: Cần 10, Giao 8 => Hủy 2 (numSOD = -2)
    // ERP: OldQty(10) + (-2) = 8 (Khớp số thực giao)
    const numSOD = actualShipQty - N; 

    const message = `Yêu cầu xuất kho (Lần ${k}): ${actualShipQty} ${unit} (${actualShipQtyWh} ${unitWarehouse}) và CHỐT dòng hàng (Hủy phần thiếu).`;

    const details = { 
        SoLuongXuat: actualShipQty, 
        SoLuongXuatKho: actualShipQtyWh,
        LanGiao: k, 
        Loai: "Giao & Chốt", 
        GiamSoLuongDat: numSOD 
    };

    return {
        Type: "SALE_TO_WAREHOUSE_CHOT_DON",
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: message,
        Details: details,
        Timestamp: new Date().toISOString()
    };
};

/**
 * TEMPLATE 3: SALE -> CANCEL (Hủy hoặc Dừng giao)
 */
export const buildSaleCancelPayload = (sod: SOD, recordId: string): NotificationPayload => {
    const { k, N, L } = getIndices(sod);
    
    let type: NotificationPayload["Type"] = "SALE_HUY_DON";
    let message = "";
    let details: any = {};

    if (k === 1) {
        type = "SALE_HUY_DON";
        message = "Khách hàng hủy đơn,không đồng ý chờ.";
        details = { NhuCauHuy: N, TonKhoHienTai: L };
    } else {
        type = "SALE_CHOT_DON";
        message = `Dừng giao hàng tại lần ${k}. Chốt số lượng thực giao là ${sod.qtyDelivered}.`;
        details = { TongDaGiao: sod.qtyDelivered, LanDung: k };
    }

    return {
        Type: type,
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: message,
        Details: details,
        Timestamp: new Date().toISOString()
    };
};

/**
 * TEMPLATE 4: SOURCE -> SALE (Phản hồi ETA)
 */
export const buildSourceToSalePayload = (sod: SOD, recordId: string): NotificationPayload => {
    const { N, L, unit } = getIndices(sod);
    const shortage = Math.max(0, N - L);
    const eta = sod.sourcePlan?.eta || 'Chưa xác định';
    const supplier = sod.sourcePlan?.supplier || 'N/A';

    return {
        Type: "SOURCE_TO_SALE",
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: `Source xác nhận: ${shortage} ${unit} sẽ về ngày ${eta} từ ${supplier}.`,
        Details: {
            NgayVe: eta,
            NhaCungCap: supplier,
            SoLuongVe: shortage
        },
        Timestamp: new Date().toISOString()
    };
};

/**
 * TEMPLATE 5: WAREHOUSE -> SALE (Báo cáo thiếu hụt thực tế)
 */
export const buildWarehouseReportPayload = (sod: SOD, recordId: string): NotificationPayload => {
    const { N, unit, unitWarehouse, N_wh } = getIndices(sod);
    
    // actual: Số lượng thực tế tại kho (Đơn vị kho)
    const actual = sod.warehouseVerification?.actualQty || 0;
    
    // requested: Khả năng đáp ứng đơn (Đơn vị đơn hàng)
    const requested = sod.warehouseVerification?.requestedQty || 0;
    
    // Shortage: Tính theo đơn vị đơn hàng
    const shortage = Math.max(0, N - requested);

    // [NEW] Lý do sai lệch (Text hiển thị)
    let reasonText = "";
    if (sod.warehouseVerification?.discrepancyType === 'CONVERSION_RATE') {
        reasonText = "(Lệch quy đổi)";
    } else if (sod.warehouseVerification?.discrepancyType === 'INVENTORY') {
        reasonText = "(Lệch tồn kho)";
    }

    // Format tin nhắn: "Thực tế đáp ứng 5/10 Cái (4/10 Cái tại kho)."
    // Giúp Sale thấy rõ tỷ lệ đáp ứng trên tổng nhu cầu ở cả 2 đơn vị.
    const message = `⚠ KHO REQUEST: Thực tế đáp ứng ${requested}/${N} ${unit} (${actual}/${N_wh} ${unitWarehouse} tại kho). Thiếu ${shortage} ${unit}. ${reasonText}`;

    return {
        Type: "WAREHOUSE_TO_SALE",
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: message,
        Details: {
            ThucTeKiemDem: actual,    // Kho
            KhaNangDapUng: requested, // Đơn
            TongNhuCauDon: N,
            TongNhuCauKho: N_wh,
            ChenhLech: shortage,
            LoaiSaiLech: sod.warehouseVerification?.discrepancyType || 'UNKNOWN'
        },
        Timestamp: new Date().toISOString()
    };
};

/**
 * TEMPLATE 6: WAREHOUSE CONFIRM/REJECT (Kết quả xuất kho)
 */
export const buildWarehouseConfirmationPayload = (sod: SOD, recordId: string, status: 'CONFIRMED' | 'REJECTED', reason?: string): NotificationPayload => {
    const isConfirmed = status === 'CONFIRMED';
    
    return {
        Type: isConfirmed ? "WAREHOUSE_CONFIRM_EXPORT" : "WAREHOUSE_REJECT_EXPORT",
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: isConfirmed 
            ? `✅ Kho Xác nhận xuất hàng.` 
            : `⛔ Kho TỪ CHỐI xuất hàng. Lý do: ${reason}`,
        Details: {
            TrangThai: status,
            LyDo: reason || '',
            SoLuongXuat: isConfirmed ? (sod.saleDecision?.quantity || 0) : 0
        },
        Timestamp: new Date().toISOString()
    };
};

/**
 * TEMPLATE 7: PICKING DEPT (Thông báo soạn hàng)
 */
export const buildPickingDeptPayload = (sod: SOD, recordId: string): NotificationPayload => {
    // [UPDATED] Lấy chính xác số lượng Sale đã chốt để gửi cho bộ phận soạn hàng
    const quantity = sod.saleDecision?.quantity || 0;
    const { unit, unitWarehouse } = getIndices(sod);
    const rate = sod.conversionRate || 1;
    
    // Tính toán số lượng theo đơn vị kho
    const quantityWh = parseFloat((quantity * rate).toFixed(2));

    return {
        Type: "WAREHOUSE_SUBMIT",
        SodId: sod.id,
        RecordId: recordId,
        SodName: sod.detailName,
        Sku: sod.product.sku,
        Message: `Lệnh soạn hàng mới: ${quantity} ${unit} (${quantityWh} ${unitWarehouse}).`,
        Details: { 
            SoLuongCanSoan: quantity,
            SoLuongCanSoanKho: quantityWh,
            ViTriKho: sod.warehouseLocation 
        },
        Timestamp: new Date().toISOString()
    };
};
