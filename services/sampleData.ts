
import { SOD, SODStatus } from '../types';

export const generateDemoScenarios = (): SOD[] => {
  const timestamp = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  return [
    // CASE 1: Mới phát sinh thiếu - Chờ Sale xử lý
    {
      id: 'DEMO-CASE-01',
      detailName: 'SOD-001: Ghế Ergonomic (Mới thiếu)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'CHAIR-ERGO-01', name: 'Ghế Công Thái Học Ultra (Black)' },
      qtyOrdered: 50,
      qtyDelivered: 0,
      qtyAvailable: 20, // Thiếu 30
      deliveryCount: 0,
      status: SODStatus.SHORTAGE_PENDING_SALE,
      warehouseLocation: 'Zone A-01'
    },

    // CASE 2: Đủ hàng - Happy Path
    {
      id: 'DEMO-CASE-02',
      detailName: 'SOD-002: Bàn Nâng Hạ (Đủ hàng)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'DESK-SMART-PRO', name: 'Bàn Nâng Hạ SmartDesk Pro' },
      qtyOrdered: 10,
      qtyDelivered: 0,
      qtyAvailable: 15, // Đủ
      deliveryCount: 0,
      status: SODStatus.SUFFICIENT,
      warehouseLocation: 'Zone B-05'
    },

    // CASE 3: Sale chọn Giao Ngay -> Chờ Kho xử lý (Pending Warehouse)
    {
      id: 'DEMO-CASE-03',
      detailName: 'SOD-003: Arm Màn Hình (Chờ Kho)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'ACC-ARM-DUAL', name: 'Tay Đỡ Màn Hình Dual Arm' },
      qtyOrdered: 100,
      qtyDelivered: 0,
      qtyAvailable: 40,
      deliveryCount: 0,
      status: SODStatus.RESOLVED, // Logic UI sẽ hiện chờ kho
      warehouseLocation: 'Zone C-12',
      saleDecision: {
          action: 'SHIP_PARTIAL',
          quantity: 40,
          timestamp: timestamp
      }
    },

    // CASE 4: Sale chọn Chờ Hàng -> Chờ Source xử lý (Pending Source)
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
      saleDecision: {
          action: 'WAIT_ALL',
          timestamp: timestamp
      }
    },

    // CASE 5: Sale chọn Hủy Đơn (Stopped)
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
      saleDecision: {
          action: 'CANCEL_ORDER',
          quantity: 30, // Hủy toàn bộ phần thiếu
          timestamp: yesterday
      }
    },

    // CASE 6: Source Đã Xác Nhận Kế Hoạch (Source Confirmed)
    {
      id: 'DEMO-CASE-06',
      detailName: 'SOD-006: Sofa Tiếp Khách (Source Đã báo)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'SOFA-LOUNGE-2S', name: 'Sofa Lounge 2 Seat' },
      qtyOrdered: 5,
      qtyDelivered: 0,
      qtyAvailable: 0,
      deliveryCount: 0,
      status: SODStatus.RESOLVED,
      warehouseLocation: 'Zone E-01',
      saleDecision: {
          action: 'WAIT_ALL',
          timestamp: yesterday
      },
      sourcePlan: {
          status: 'CONFIRMED',
          eta: '2025-03-15',
          supplier: 'Nhà máy Bình Dương',
          timestamp: timestamp
      }
    },

    // CASE 7: Kho Đã Xuất Hàng Thành Công (Warehouse Confirmed)
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

    // CASE 8: Kho Từ Chối Xuất Hàng (Warehouse Rejected)
    {
      id: 'DEMO-CASE-08',
      detailName: 'SOD-008: Màn Hình Dell (Kho Báo Lỗi)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'LCD-DELL-U27', name: 'Màn Hình Dell UltraSharp U2723QE' },
      qtyOrdered: 10,
      qtyDelivered: 0,
      qtyAvailable: 2,
      deliveryCount: 0,
      status: SODStatus.RESOLVED,
      warehouseLocation: 'Zone F-Tech',
      saleDecision: {
          action: 'SHIP_PARTIAL',
          quantity: 2,
          timestamp: yesterday
      },
      warehouseConfirmation: {
          status: 'REJECTED',
          reason: 'Hàng thực tế bị vỡ màn hình do vận chuyển, không thể xuất.',
          timestamp: timestamp
      }
    },

    // CASE 9 (CASE B): Đã Giao 1 phần, Hàng về thêm nhưng vẫn chưa đủ (Giao tiếp Lần n)
    {
      id: 'DEMO-CASE-09',
      detailName: 'SOD-009: RAM Desktop (Giao Lần 2 - Vẫn Thiếu)',
      soNumber: 'DEMO-SO-2025',
      product: { sku: 'RAM-DDR5-32G', name: 'RAM Corsair Dominator 32GB' },
      qtyOrdered: 100,
      qtyDelivered: 40, // Đã giao 40
      qtyAvailable: 30, // Vừa về thêm 30. Tổng cần còn lại là 60. Vậy vẫn thiếu 30 nữa.
      deliveryCount: 1, // Đã giao 1 lần trước đó -> K=2
      status: SODStatus.SHORTAGE_PENDING_SALE,
      warehouseLocation: 'Zone H-05'
    }
  ];
};
