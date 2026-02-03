
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
    const query = `crdfd_customers?$select=crdfd_customerid,crdfd_name, crdfd_nganhnghe&$orderby=crdfd_name asc&$filter=statecode eq 0`;

    // Hàm chuyển đổi raw data sang Customer Type
    const mapData = (rawItems: any[]): Customer[] => {
        return rawItems.map((item: any) => ({
            id: item.crdfd_customerid,
            name: item.crdfd_name || 'Khách hàng (Không tên)',
            industryType: item.crdfd_nganhnghe // 191920000 = Nhà máy (Factory)
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
    const query = `crdfd_customers(${cleanId})?$select=crdfd_customerid,crdfd_name,crdfd_nganhnghe`;
    try {
        const token = await getAccessToken();
        const url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/${query}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error("Customer not found");
        const item = await response.json();

        return {
            id: item.crdfd_customerid,
            name: item.crdfd_name || 'Khách hàng (Không tên)',
            industryType: item.crdfd_nganhnghe // 191920000 = Nhà máy (Factory)
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
    const query = `crdfd_sale_orders?$select=crdfd_sale_orderid,crdfd_name,cr1bb_hinhthucgiaohang,crdfd_soonhangchitiet,_cr1bb_vitrikho_value &$filter=_crdfd_khachhang_value eq ${cleanId} and crdfd_trangthaigiaonhan1 ne ${DATAVERSE_STATUS_MAP.DELIVERED} and statecode eq 0`;

    const data = await fetchFromDataverse(query);
    const ordersRaw = data.value;

    console.log(`[Dataverse] Orders found for customer ${cleanId}:`, ordersRaw);

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
            sodCount: realCount, // Sử dụng giá trị thực tế
            warehouseLocationId: item._cr1bb_vitrikho_value || undefined // [NEW] ID vị trí kho
        };
    });
    return Promise.all(enrichedOrdersPromise);
};

// 4. Tải Chi tiết SOD + Kế hoạch soạn
// [UPDATED] Thêm warehouseLocationId để query bảng kho lấy tồn kho lý thuyết bỏ mua
export const fetchSODsByOrder = async (orderId: string, soNumber: string, warehouseLocationId?: string): Promise<SOD[]> => {
    const cleanId = orderId.replace(/[{}]/g, "");

    // 1. Expand Plan: Thay vì chỉ lấy trạng thái 'Thiếu', ta dùng filter chung (statecode eq 0)
    // Việc này bao gồm cả 'expandPlan' (Thiếu) và 'expandPlanDu' (Đủ) trong một query mở rộng.
    // Điều này cho phép trả về tất cả các dòng hàng đã được lên kế hoạch (dù thiếu hay đủ).
    const expandAllActivePlans = `crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail(` +
        `$select=crdfd_soluongthucsoan,cr1bb_soluongthucsoanhtheokho,cr1bb_soluongconlaitheoon,cr1bb_soluongconlaitheokho,cr1bb_solangiaoso,cr1bb_trangthaihang;` +
        `$filter=statecode eq 0 and cr1bb_soluongconlaitheokho ge 0` +
        `)`;

    // 2. Expand Units: Lấy thông tin đơn vị và tỷ lệ chuyển đổi
    // crdfd_onvionhang: Đơn vị Đặt hàng (Field Text)
    // crdfd_onvi: Lấy tỷ lệ chuyển đổi (crdfd_giatrichuyenoi)
    // crdfd_onvichuan: Đơn vị Kho (Standard Unit) -> Field Text (được cập nhật theo yêu cầu)
    const expandUnits = `crdfd_onvi($select=crdfd_giatrichuyenoi,crdfd_onvichuan)`;

    // [UPDATED] Thêm _crdfd_sanpham_value để lấy ID sản phẩm dùng cho query bảng kho
    const query = `crdfd_saleorderdetails?$select=crdfd_name, crdfd_saleorderdetailid, crdfd_soluongconlaitheokhonew,crdfd_ngaygiaodukientonghop,crdfd_tensanphamtext,crdfd_masanpham, crdfd_onvionhang, crdfd_vitrikho, crdfd_ton_kho_ly_thuyet_bo_mua, crdfd_productnum, _crdfd_sanpham_value&$filter=statecode eq 0 and _crdfd_socode_value eq ${cleanId} and crdfd_trangthaionhang1 ne ${DATAVERSE_STATUS_MAP.DELIVERED}&$expand=${expandAllActivePlans},${expandUnits}`;

    const data = await fetchFromDataverse(query);

    // FIX: Lọc client-side để đảm bảo chỉ lấy những dòng có kế hoạch (cả thiếu và đủ)
    const filteredItems = data.value.filter((item: any) => {
        const plans = item.crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail;
        return Array.isArray(plans) && plans.length > 0;
    });

    // [OPTIMIZED] Query bảng kho CHỈ với những sản phẩm có trong SOD
    // Thay vì query toàn bộ kho (10,000+ rows), chỉ query những productId cần thiết
    const inventoryMap: Record<string, number> = {};

    if (warehouseLocationId && filteredItems.length > 0) {
        const cleanWarehouseId = warehouseLocationId.replace(/[{}]/g, "");

        // Lấy danh sách productId unique từ SOD
        const productIds = [...new Set(
            filteredItems
                .map((item: any) => item._crdfd_sanpham_value)
                .filter((id: any) => id) // Loại bỏ null/undefined
        )] as string[];

        if (productIds.length > 0) {
            try {
                // Build filter với OR conditions (max ~50 items per batch để tránh URL quá dài)
                const BATCH_SIZE = 50;
                const batches: string[][] = [];
                for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
                    batches.push(productIds.slice(i, i + BATCH_SIZE));
                }

                // Query song song các batch
                const batchPromises = batches.map(async (batchIds) => {
                    const productFilter = batchIds
                        .map(id => `_crdfd_tensanphamlookup_value eq ${id}`)
                        .join(' or ');

                    const inventoryQuery = `crdfd_kho_binh_dinhs?$select=_crdfd_tensanphamlookup_value,cr1bb_tonkholythuyetbomua&$filter=statecode eq 0 and _crdfd_vitrikho_value eq ${cleanWarehouseId} and (${productFilter})`;
                    return fetchFromDataverse(inventoryQuery);
                });

                const batchResults = await Promise.all(batchPromises);

                // Merge tất cả results vào inventoryMap
                batchResults.forEach(inventoryData => {
                    if (inventoryData.value && Array.isArray(inventoryData.value)) {
                        inventoryData.value.forEach((inv: any) => {
                            const productId = inv._crdfd_tensanphamlookup_value;
                            if (productId) {
                                inventoryMap[productId.toLowerCase()] = inv.cr1bb_tonkholythuyetbomua || 0;
                            }
                        });
                    }
                });

                console.log(`📦 [Inventory] Loaded ${Object.keys(inventoryMap).length}/${productIds.length} products from warehouse ${cleanWarehouseId}`);
            } catch (e) {
                console.warn('⚠️ [Inventory] Could not fetch inventory data from kho_binh_dinh:', e);
            }
        }
    }

    return filteredItems.map((item: any) => {
        // Map dữ liệu
        const plans = item.crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail || [];
        const hasPlan = plans.length > 0;

        // crdfd_soluongthucsoan (Actual Picked) -> This is now the "Available" for Sale to ship
        const qtyActualPicked = plans.reduce((acc: number, p: any) => acc + (p.crdfd_soluongthucsoan || 0), 0);

        // [NEW] Tính toán các trường số lượng nâng cao
        const qtySystemPickedWH = plans.reduce((acc: number, p: any) => acc + (p.cr1bb_soluongthucsoanhtheokho || 0), 0);
        const qtyOrderRemainingON = plans.reduce((acc: number, p: any) => acc + (p.cr1bb_soluongconlaitheoon || 0), 0);
        const qtyOrderRemainingWH = plans.reduce((acc: number, p: any) => acc + (p.cr1bb_soluongconlaitheokho || 0), 0);

        // cr1bb_solangiaoso - taking max/first valid value
        const deliveryCount = plans.length > 0 ? (plans[0].cr1bb_solangiaoso || 0) : 0;

        // [NEW] Lấy trạng thái từ nhãn OptionSet của Plan
        // [FIX] Fallback sang giá trị raw nếu FormattedValue không có
        const planStatusLabel = plans.length > 0
            ? (plans[0]['cr1bb_trangthaihang@OData.Community.Display.V1.FormattedValue'] || plans[0].cr1bb_trangthaihang || '')
            : '';

        // [DEBUG] Log dữ liệu plan
        console.log('📦 SOD Data:', {
            name: item.crdfd_name,
            planStatusLabel,
            rawPlanStatus: plans.length > 0 ? plans[0].cr1bb_trangthaihang : null,
            expectedDate: item.crdfd_ngaygiaodukientonghop
        });

        // [FIX] qtyOrdered lấy từ cr1bb_soluongconlaitheoon (số lượng đơn hàng)
        // thay vì crdfd_soluongconlaitheokhonew (tên confusing - có thể là số theo kho)
        const qtyOrdered = qtyOrderRemainingON || item.crdfd_soluongconlaitheokhonew || 0;

        // [MODIFIED] Khả dụng lấy từ DB (soluongthucsoan), nếu null/0 thì là 0
        const qtyAvailable = qtyActualPicked;

        // Xác định Status dựa trên statusFromPlan của user yêu cầu
        // Nếu Plan báo 'Thiếu' (hoặc label tương ứng) -> SHORTAGE
        // Nếu Plan báo 'Đủ' (hoặc label tương ứng) -> SUFFICIENT
        let status = planStatusLabel === 'Thiếu' ? SODStatus.SHORTAGE_PENDING_SALE : SODStatus.SUFFICIENT;

        return {
            id: item.crdfd_saleorderdetailid,
            detailName: item.crdfd_name || 'N/A',
            soNumber: soNumber || '',
            statusFromPlan: planStatusLabel,
            product: {
                sku: item.crdfd_masanpham || 'UNKNOWN',
                name: item.crdfd_tensanphamtext || 'Sản phẩm chưa đặt tên'
            },
            qtyOrdered: qtyOrdered,
            qtyDelivered: 0,
            qtyAvailable: qtyAvailable,
            qtyOrderRemainingON: qtyOrderRemainingON,
            qtyOrderRemainingWH: qtyOrderRemainingWH,
            qtySystemPickedWH: qtySystemPickedWH,
            deliveryCount: deliveryCount,
            warehouseLocation: item.crdfd_vitrikho,
            status: status,
            sourcePlan: hasPlan && status === SODStatus.SHORTAGE_PENDING_SALE ? {
                eta: item.crdfd_ngaygiaodukientonghop,
                status: 'CONFIRMED',
                supplier: '',
                timestamp: new Date().toISOString()
            } : undefined,

            // [NEW] Map Expected Delivery Date for filtering
            expectedDeliveryDate: item.crdfd_ngaygiaodukientonghop ? item.crdfd_ngaygiaodukientonghop.split('T')[0] : undefined,

            // [UPDATED] Lấy tồn kho lý thuyết bỏ mua từ bảng kho (crdfd_kho_binh_dinh)
            // Ưu tiên giá trị từ inventoryMap, fallback về 0 nếu không tìm thấy
            theoreticalStock: (() => {
                const productId = item._crdfd_sanpham_value;
                if (productId && inventoryMap[productId.toLowerCase()] !== undefined) {
                    return inventoryMap[productId.toLowerCase()];
                }
                return 0; // Không tìm thấy hoặc thiếu thông tin -> trả về 0
            })(),
            requiredProductQty: item.crdfd_productnum || 0,

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
        const url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/crdfd_order_requests(${cleanId})?$select=crdfd_history1`;

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
        if (data.crdfd_history1) {
            try {
                return JSON.parse(data.crdfd_history1);
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
            "crdfd_history1": JSON.stringify(appState)
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
