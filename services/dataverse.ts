
import { DATAVERSE_CONFIG, DATAVERSE_STATUS_MAP } from '../config';
import { Customer, SalesOrder, SOD, SODStatus } from '../types';

const STORAGE_KEY_TOKEN = 'dv_auth_token';
const STORAGE_KEY_EXPIRY = 'dv_token_expiry';

// 1. Lấy Token từ Power Automate Trigger (Optimized with LocalStorage Caching)
export const getAccessToken = async (): Promise<string> => {
  // Bước 1: Kiểm tra cache trong LocalStorage
  const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
  const storedExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);

  if (storedToken && storedExpiry) {
    const expiryTime = parseInt(storedExpiry, 10);
    const currentTime = Date.now();
    
    // Kiểm tra nếu token còn hạn (Trừ hao 5 phút = 300,000ms để đảm bảo an toàn khi request mạng)
    if (currentTime < expiryTime - 300000) {
      return storedToken;
    }
  }

  // Bước 2: Nếu không có hoặc hết hạn, gọi API lấy token mới
  try {
    const response = await fetch(DATAVERSE_CONFIG.AUTH_TRIGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Body rỗng để kích hoạt trigger
    });

    if (!response.ok) throw new Error('Failed to fetch token from Flow');
    
    const data = await response.json();
    
    // Bước 3: Parse dữ liệu token
    let accessToken = '';
    let expiresIn = 3599;

    if (data.body && data.body.access_token) {
        accessToken = data.body.access_token;
        if (data.body.expires_in) expiresIn = data.body.expires_in;
    } else if (data.access_token) {
        accessToken = data.access_token;
        if (data.expires_in) expiresIn = data.expires_in;
    } else if (data.token) {
        accessToken = data.token;
    }

    if (!accessToken) {
        throw new Error("Token not found in response");
    }

    // Bước 4: Lưu vào LocalStorage
    const expiryTimestamp = Date.now() + (expiresIn * 1000);
    localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEY_EXPIRY, expiryTimestamp.toString());
    
    return accessToken;
  } catch (error) {
    console.error("Auth Error:", error);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    throw error;
  }
};

// Helper để gọi API Dataverse (Có xử lý phân trang nextLink và Streaming Callback)
// onProgress: Callback được gọi mỗi khi tải xong 1 trang dữ liệu
const fetchFromDataverse = async (path: string, onProgress?: (items: any[]) => void) => {
  try {
    const token = await getAccessToken();
    // Khởi tạo URL ban đầu
    let url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/${path}`;
    
    const allRecords: any[] = [];
    
    // Vòng lặp lấy dữ liệu nếu có phân trang
    while (url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'odata.include-annotations="*"'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dataverse API Error (${response.status}): ${errorText || response.statusText}`);
        }
        
        const data = await response.json();
        const batch = data.value || [];

        if (Array.isArray(batch) && batch.length > 0) {
            // Streaming: Nếu có callback, trả dữ liệu ngay lập tức để UI render
            if (onProgress) {
                onProgress(batch);
            }
            // Vẫn lưu vào mảng tổng để trả về cuối hàm (cho các hàm không dùng streaming)
            allRecords.push(...batch);
        }
        
        // Kiểm tra nextLink để lấy trang tiếp theo
        url = data['@odata.nextLink'] || null;
    }

    return { value: allRecords };
  } catch (error: any) {
    // Bắt lỗi 'Failed to fetch' (thường là CORS hoặc Network)
    if (error.message === 'Failed to fetch') {
        console.error("CORS/Network Error: Không thể kết nối tới Dataverse. Kiểm tra xem trình duyệt có chặn Request Cross-Origin không.");
        throw new Error("Lỗi kết nối mạng hoặc bị chặn CORS. Vui lòng kiểm tra Console.");
    }
    throw error;
  }
};

// 2. Tải danh sách Khách hàng (Hỗ trợ Streaming Loading)
export const fetchCustomers = async (onProgress?: (customers: Customer[]) => void): Promise<Customer[]> => {
  // Lấy danh sách khách hàng
  const query = `crdfd_customers?$select=crdfd_customerid,crdfd_name&$orderby=crdfd_name asc&$filter=statecode eq 0`;
  
  // Hàm chuyển đổi raw data sang Customer Type
  const mapData = (rawItems: any[]): Customer[] => {
    return rawItems.map((item: any) => ({
        id: item.crdfd_customerid,
        name: item.crdfd_name || 'Khách hàng (Không tên)'
    }));
  };

  const data = await fetchFromDataverse(query, (rawBatch) => {
      // Khi nhận được 1 batch raw data, convert và đẩy ra ngoài ngay
      if (onProgress) {
          onProgress(mapData(rawBatch));
      }
  });
  
  return mapData(data.value);
};

// 2.1 Lấy thông tin 1 Khách hàng theo ID (Dùng cho Context Mode)
export const fetchCustomerById = async (customerId: string): Promise<Customer> => {
    const cleanId = customerId.replace(/[{}]/g, "");
    const query = `crdfd_customers(${cleanId})?$select=crdfd_customerid,crdfd_name`;
    try {
        const token = await getAccessToken();
        const url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/${query}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        if(!response.ok) throw new Error("Customer not found");
        const item = await response.json();
        
        return {
            id: item.crdfd_customerid,
            name: item.crdfd_name || 'Khách hàng (Không tên)'
        };
    } catch (e) {
        console.error(e);
        throw e;
    }
}

// 3. Tải Đơn hàng theo Khách hàng
export const fetchOrdersByCustomer = async (customerId: string): Promise<SalesOrder[]> => {
  const cleanId = customerId.replace(/[{}]/g, "");
  // Add cr1bb_hinhthucgiaohang and crdfd_soonhangchitiet (Rollup field for SOD count) to select
  // Lưu ý: crdfd_soonhangchitiet là Rollup field, có thể bị chậm (12h update).
  const query = `crdfd_sale_orders?$select=crdfd_sale_orderid,crdfd_name,cr1bb_hinhthucgiaohang,crdfd_soonhangchitiet&$filter=_crdfd_khachhang_value eq ${cleanId} and crdfd_trangthaigiaonhan1 ne ${DATAVERSE_STATUS_MAP.DELIVERED} and statecode eq 0`;
  
  const data = await fetchFromDataverse(query);
  const ordersRaw = data.value;

  // Fix: Vì Rollup field chậm, ta sẽ gọi song song các request $count=true vào bảng chi tiết
  // để lấy số lượng thực tế (Real-time).
  // Dùng $top=0 để query cực nhanh (chỉ lấy số đếm header).
  const token = await getAccessToken();
  
  const enrichedOrdersPromise = ordersRaw.map(async (item: any) => {
      let realCount = item.crdfd_soonhangchitiet || 0;
      
      try {
          // Query đếm số dòng chi tiết thuộc đơn hàng này
          const countQueryUrl = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/crdfd_saleorderdetails?$filter=_crdfd_socode_value eq ${item.crdfd_sale_orderid}&$top=0&$count=true`;
          
          const countRes = await fetch(countQueryUrl, {
              headers: { 
                  'Authorization': `Bearer ${token}`, 
                  'Prefer': 'odata.include-annotations="*"' // Quan trọng để lấy @odata.count
              }
          });
          
          if (countRes.ok) {
              const countJson = await countRes.json();
              if (typeof countJson['@odata.count'] === 'number') {
                  realCount = countJson['@odata.count'];
              }
          }
      } catch (e) {
          console.warn(`Could not fetch real-time count for order ${item.crdfd_name}`, e);
          // Fallback về giá trị rollup nếu lỗi
      }

      return {
        id: item.crdfd_sale_orderid,
        soNumber: item.crdfd_name || 'SO (Không mã)',
        deliveryDate: 'Null',
        deliveryMethod: item.cr1bb_hinhthucgiaohang, 
        priority: 'Normal',
        sodCount: realCount // Sử dụng giá trị thực tế
      };
  });

  return Promise.all(enrichedOrdersPromise);
};

// 4. Tải Chi tiết SOD + Kế hoạch soạn
export const fetchSODsByOrder = async (orderId: string, soNumber: string): Promise<SOD[]> => {
  const cleanId = orderId.replace(/[{}]/g, "");
  
  // 1. Expand Plan: Thay vì chỉ lấy trạng thái 'Thiếu', ta dùng filter chung (statecode eq 0)
  // Việc này bao gồm cả 'expandPlan' (Thiếu) và 'expandPlanDu' (Đủ) trong một query mở rộng.
  // Điều này cho phép trả về tất cả các dòng hàng đã được lên kế hoạch (dù thiếu hay đủ).
  const expandAllActivePlans = `crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail(` +
  `$select=crdfd_soluongthucsoan,cr1bb_solangiaoso,cr1bb_trangthaihang;` +
  `$filter=statecode eq 0 and cr1bb_soluongconlaitheokho ge 0` + 
  `)`;

  // 2. Expand Units: Lấy thông tin đơn vị và tỷ lệ chuyển đổi
  // crdfd_onvionhang: Đơn vị Đặt hàng (Field Text)
  // crdfd_onvi: Lấy tỷ lệ chuyển đổi (crdfd_giatrichuyenoi)
  // crdfd_onvichuan: Đơn vị Kho (Standard Unit) -> Field Text (được cập nhật theo yêu cầu)
  const expandUnits = `crdfd_onvi($select=crdfd_giatrichuyenoi,crdfd_onvichuan)`;

  const query = `crdfd_saleorderdetails?$select=crdfd_name, crdfd_saleorderdetailid, crdfd_soluongconlaitheokhonew,crdfd_exdeliverrydate,crdfd_tensanphamtext,crdfd_masanpham, crdfd_onvionhang, crdfd_vitrikho&$filter=statecode eq 0 and _crdfd_socode_value eq ${cleanId} and crdfd_trangthaionhang1 ne ${DATAVERSE_STATUS_MAP.DELIVERED}&$expand=${expandAllActivePlans},${expandUnits}`;

  const data = await fetchFromDataverse(query);

  // FIX: Lọc client-side để đảm bảo chỉ lấy những dòng có kế hoạch (cả thiếu và đủ)
  const filteredItems = data.value.filter((item: any) => {
    const plans = item.crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail;
    return Array.isArray(plans) && plans.length > 0;
  });

  return filteredItems.map((item: any) => {
    // Map dữ liệu
    const plans = item.crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail || [];
    const hasPlan = plans.length > 0;
    
    // crdfd_soluongthucsoan (Actual Picked) -> This is now the "Available" for Sale to ship
    const qtyActualPicked = plans.reduce((acc: number, p: any) => acc + (p.crdfd_soluongthucsoan || 0), 0);
    // cr1bb_solangiaoso - taking max/first valid value
    const deliveryCount = plans.length > 0 ? (plans[0].cr1bb_solangiaoso || 0) : 0;
    
    const qtyOrdered = item.crdfd_soluongconlaitheokhonew || 0;
    
    // [MODIFIED] Khả dụng lấy từ DB (soluongthucsoan), nếu null/0 thì là 0
    const qtyAvailable = qtyActualPicked; 

    // Xác định Status dựa trên so sánh số lượng
    // Nếu Available < Ordered -> Thiếu (SHORTAGE)
    // Nếu Available >= Ordered -> Đủ (SUFFICIENT)
    let status = SODStatus.SUFFICIENT;
    if (qtyAvailable < qtyOrdered) {
        status = SODStatus.SHORTAGE_PENDING_SALE;
    }

    return {
      id: item.crdfd_saleorderdetailid, 
      detailName: item.crdfd_name || 'N/A',
      soNumber: soNumber || '',
      product: {
        sku: item.crdfd_masanpham || 'UNKNOWN', 
        name: item.crdfd_tensanphamtext || 'Sản phẩm chưa đặt tên'
      },
      qtyOrdered: qtyOrdered,
      qtyDelivered: 0,
      qtyAvailable: qtyAvailable,
      deliveryCount: deliveryCount, 
      warehouseLocation: item.crdfd_vitrikho,
      status: status,
      sourcePlan: hasPlan && status === SODStatus.SHORTAGE_PENDING_SALE ? {
        eta: item.crdfd_exdeliverrydate,
        status: 'CONFIRMED',
        supplier: '', 
        timestamp: new Date().toISOString()
      } : undefined,
      
      // [NEW] Map Expected Delivery Date for filtering
      expectedDeliveryDate: item.crdfd_exdeliverrydate ? item.crdfd_exdeliverrydate.split('T')[0] : undefined,

      // Unit Mapping
      unitOrderName: item.crdfd_onvionhang || '', // Text field
      unitWarehouseName: item.crdfd_onvi?.crdfd_onvichuan || '', // Text field (updated)
      conversionRate: item.crdfd_onvi?.crdfd_giatrichuyenoi || 1 // Conversion Rate source
    };
  });
};

/**
 * Lấy dữ liệu lịch sử từ cột crdfd_history trong bảng crdfd_order_requests
 * @param requestId ID của bản ghi crdfd_order_request
 */
export const fetchRequestHistory = async (requestId: string): Promise<any | null> => {
    try {
        const token = await getAccessToken();
        const cleanId = requestId.replace(/[{}]/g, "");
        // UPDATED: Use crdfd_history
        const url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/crdfd_order_requests(${cleanId})?$select=crdfd_history`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.warn("Failed to fetch history", response.status);
            return null;
        }

        const data = await response.json();
        // UPDATED: Check crdfd_history
        if (data.crdfd_history) {
            try {
                return JSON.parse(data.crdfd_history);
            } catch (e) {
                console.error("Failed to parse history JSON", e);
                return null;
            }
        }
        return null;
    } catch (e) {
        console.error("Fetch History Error:", e);
        return null;
    }
};

/**
 * Cập nhật trạng thái JSON vào cột crdfd_history bảng crdfd_order_requests
 * @param requestId (recordId from Context)
 * @param appState Object chứa trạng thái hiện tại của app
 * @param note [NEW] Ghi chú sai lệch từ Kho (nếu có)
 */
export const updateRequestHistory = async (requestId: string, appState: any, note?: string): Promise<boolean> => {
    try {
        const token = await getAccessToken();
        const cleanId = requestId.replace(/[{}]/g, "");
        const url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/crdfd_order_requests(${cleanId})`;
        
        // UPDATED: Save to crdfd_history AND crdfd_ghi_chu if provided
        const payload: any = {
            "crdfd_history": JSON.stringify(appState)
        };
        
        if (note) {
            payload["crdfd_ghi_chu"] = note;
        }

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'If-Match': '*' // Force update
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Failed to save history", await response.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error("Update History Error:", e);
        return false;
    }
};
