
import { SOD, SODStatus } from '../types';

// Helper to get date string in YYYY-MM-DD format
const getDateString = (daysOffset: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateDemoScenarios = (): SOD[] => {
  const timestamp = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  return [
    // ========== SHORTAGE CASES (THIẾU HỤNG) ==========

    // CASE 1: Mới phát sinh thiếu - Chờ Sale xử lý (HÔM NAY)
    {
      id: 'DEMO-CASE-01',
      detailName: 'SOD-001: Ghế Ergonomic (Thiếu - Hôm nay)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'CHAIR-ERGO-01', name: 'Ghế Công Thái Học Ultra (Black)' },
      qtyOrdered: 50,
      qtyDelivered: 0,
      qtyAvailable: 20, // Thiếu 30
      deliveryCount: 0,
      status: SODStatus.SHORTAGE_PENDING_SALE,
      warehouseLocation: 'Zone A-01',
      expectedDeliveryDate: getDateString(0), // HÔM NAY
      unitOrderName: 'Cái',
      unitWarehouseName: 'Cái',
      conversionRate: 1,
      theoreticalStock: 20,
      requiredProductQty: 50
    },

    // CASE 2: Thiếu - Ngày MAI (Sale KHÔNG nên thấy)
    {
      id: 'DEMO-CASE-02B',
      detailName: 'SOD-002B: Bàn Gaming (Thiếu - Ngày mai)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'DESK-GAME-01', name: 'Bàn Gaming RGB Pro' },
      qtyOrdered: 10,
      qtyDelivered: 0,
      qtyAvailable: 5, // Thiếu 5
      deliveryCount: 0,
      status: SODStatus.SHORTAGE_PENDING_SALE,
      warehouseLocation: 'Zone B-02',
      expectedDeliveryDate: getDateString(1), // NGÀY MAI
      unitOrderName: 'Bộ',
      unitWarehouseName: 'Thùng',
      conversionRate: 2, // 1 Bộ = 2 Thùng
      theoreticalStock: 3,
      requiredProductQty: 10
    },

    // ========== SUFFICIENT CASES (ĐỦ HÀNG) ==========

    // CASE 2: Đủ hàng - HÔM NAY -> Kho xử lý
    {
      id: 'DEMO-CASE-02',
      detailName: 'SOD-002: Bàn Nâng Hạ (Đủ - Hôm nay)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'DESK-SMART-PRO', name: 'Bàn Nâng Hạ SmartDesk Pro' },
      qtyOrdered: 10,
      qtyDelivered: 0,
      qtyAvailable: 15, // Đủ
      deliveryCount: 0,
      status: SODStatus.SUFFICIENT,
      warehouseLocation: 'Zone B-05',
      expectedDeliveryDate: getDateString(0), // HÔM NAY
      unitOrderName: 'Cái',
      unitWarehouseName: 'Cái',
      conversionRate: 1,
      theoreticalStock: 15,
      requiredProductQty: 10
    },

    // CASE 10: Đủ hàng - TƯƠNG LAI (3 ngày sau) -> Sale thấy "Đơn gấp khả thi"
    {
      id: 'DEMO-CASE-10',
      detailName: 'SOD-010: Adapter 12V (Đủ - Tương lai)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'SP-1800', name: 'Adapter 12V 30A' },
      qtyOrdered: 1,
      qtyDelivered: 0,
      qtyAvailable: 190, // Đủ theo kho
      deliveryCount: 0,
      status: SODStatus.SUFFICIENT,
      warehouseLocation: 'Zone G-01',
      expectedDeliveryDate: getDateString(3), // 3 NGÀY SAU
      unitOrderName: 'Cái',
      unitWarehouseName: 'Cái',
      conversionRate: 190, // 1 Đơn = 190 Kho
      theoreticalStock: 200, // Tồn kho lý thuyết
      requiredProductQty: 1
    },

    // CASE 11: Đơn gấp đã gửi yêu cầu (PENDING) - Chờ Kho phản hồi
    {
      id: 'DEMO-CASE-11',
      detailName: 'SOD-011: PIN Lithium (Đã yêu cầu gấp)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'BAT-LI-5000', name: 'PIN Lithium 5000mAh' },
      qtyOrdered: 5,
      qtyDelivered: 0,
      qtyAvailable: 500,
      deliveryCount: 0,
      status: SODStatus.SUFFICIENT,
      warehouseLocation: 'Zone G-02',
      expectedDeliveryDate: getDateString(5), // 5 NGÀY SAU
      unitOrderName: 'Hộp',
      unitWarehouseName: 'Viên',
      conversionRate: 100, // 1 Hộp = 100 Viên
      theoreticalStock: 600,
      requiredProductQty: 5,
      urgentRequest: {
        status: 'PENDING',
        requestedBy: 'Sale Demo',
        timestamp: timestamp
      }
    },

    // CASE 12: Đơn gấp đã được Kho CHẤP NHẬN -> Chờ Kho xuất
    {
      id: 'DEMO-CASE-12',
      detailName: 'SOD-012: Cable USB-C (Kho đã chấp nhận gấp)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'CABLE-USBC-3M', name: 'Cáp USB-C 3m Braided' },
      qtyOrdered: 20,
      qtyDelivered: 0,
      qtyAvailable: 50,
      deliveryCount: 0,
      status: SODStatus.SUFFICIENT,
      warehouseLocation: 'Zone G-03',
      expectedDeliveryDate: getDateString(7), // 1 TUẦN SAU
      unitOrderName: 'Sợi',
      unitWarehouseName: 'Cuộn',
      conversionRate: 5, // 1 Cuộn = 5 Sợi
      theoreticalStock: 100,
      requiredProductQty: 20,
      urgentRequest: {
        status: 'ACCEPTED',
        requestedBy: 'Sale Demo',
        timestamp: yesterday
      }
    },

    // ========== EXISTING WORKFLOW CASES ==========

    // CASE 3: Sale chọn Giao Ngay -> Chờ Kho xử lý
    {
      id: 'DEMO-CASE-03',
      detailName: 'SOD-003: Arm Màn Hình (Chờ Kho)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'ACC-ARM-DUAL', name: 'Tay Đỡ Màn Hình Dual Arm' },
      qtyOrdered: 100,
      qtyDelivered: 0,
      qtyAvailable: 40,
      deliveryCount: 0,
      status: SODStatus.RESOLVED,
      warehouseLocation: 'Zone C-12',
      expectedDeliveryDate: getDateString(0),
      unitOrderName: 'Bộ',
      unitWarehouseName: 'Bộ',
      conversionRate: 1,
      theoreticalStock: 40,
      requiredProductQty: 100,
      saleDecision: {
        action: 'SHIP_PARTIAL',
        quantity: 40,
        timestamp: timestamp
      }
    },

    // CASE 4: Sale chọn Chờ Hàng -> Chờ Source xử lý
    {
      id: 'DEMO-CASE-04',
      detailName: 'SOD-004: Tủ Hồ Sơ (Chờ Source)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'CABINET-STEEL', name: 'Tủ Hồ Sơ Thép 3 Ngăn' },
      qtyOrdered: 20,
      qtyDelivered: 0,
      qtyAvailable: 0,
      deliveryCount: 0,
      status: SODStatus.SHORTAGE_PENDING_SOURCE,
      warehouseLocation: 'Zone D-02',
      expectedDeliveryDate: getDateString(0),
      unitOrderName: 'Cái',
      unitWarehouseName: 'Cái',
      conversionRate: 1,
      theoreticalStock: 0,
      requiredProductQty: 20,
      saleDecision: {
        action: 'WAIT_ALL',
        timestamp: timestamp
      }
    },

    // CASE 5: Sale chọn Hủy Đơn
    {
      id: 'DEMO-CASE-05',
      detailName: 'SOD-005: Đèn Bàn (Đã Hủy)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'LIGHT-LED-09', name: 'Đèn LED Chống Cận (White)' },
      qtyOrdered: 30,
      qtyDelivered: 0,
      qtyAvailable: 5,
      deliveryCount: 0,
      status: SODStatus.RESOLVED,
      warehouseLocation: 'Zone A-09',
      expectedDeliveryDate: getDateString(-1), // HÔM QUA
      unitOrderName: 'Cái',
      unitWarehouseName: 'Cái',
      conversionRate: 1,
      theoreticalStock: 5,
      requiredProductQty: 30,
      saleDecision: {
        action: 'CANCEL_ORDER',
        quantity: 30,
        timestamp: yesterday
      }
    },

    // CASE 7: Kho Đã Xuất Hàng Thành Công
    {
      id: 'DEMO-CASE-07',
      detailName: 'SOD-007: Chuột Logitech (Kho Đã Xuất)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'MOUSE-MX-3S', name: 'Chuột Logitech MX Master 3S' },
      qtyOrdered: 50,
      qtyDelivered: 0,
      qtyAvailable: 20,
      deliveryCount: 0,
      status: SODStatus.RESOLVED,
      warehouseLocation: 'Zone F-Tech',
      expectedDeliveryDate: getDateString(-1),
      unitOrderName: 'Cái',
      unitWarehouseName: 'Cái',
      conversionRate: 1,
      theoreticalStock: 20,
      requiredProductQty: 50,
      saleDecision: {
        action: 'SHIP_PARTIAL',
        quantity: 20,
        timestamp: yesterday
      },
      warehouseConfirmation: {
        status: 'CONFIRMED',
        timestamp: timestamp
      }
    },

    // CASE 9: Giao Lần 2 - Vẫn Thiếu
    {
      id: 'DEMO-CASE-09',
      detailName: 'SOD-009: RAM Desktop (Giao Lần 2 - Vẫn Thiếu)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'RAM-DDR5-32G', name: 'RAM Corsair Dominator 32GB' },
      qtyOrdered: 100,
      qtyDelivered: 40,
      qtyAvailable: 30,
      deliveryCount: 1,
      status: SODStatus.SHORTAGE_PENDING_SALE,
      warehouseLocation: 'Zone H-05',
      expectedDeliveryDate: getDateString(0), // HÔM NAY
      unitOrderName: 'Thanh',
      unitWarehouseName: 'Thanh',
      conversionRate: 1,
      theoreticalStock: 30,
      requiredProductQty: 60 // Còn lại 60
    }
  ];
};
