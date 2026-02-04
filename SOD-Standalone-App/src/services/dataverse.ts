import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest, DATAVERSE_CONFIG, DATAVERSE_STATUS_MAP } from '../config/authConfig';
import { Customer, SalesOrder, SOD, SODStatus } from '../types';

/**
 * Service để kết nối Dataverse sử dụng MSAL Authentication
 * Sử dụng OAuth 2.0 Authorization Code Flow với PKCE
 */

// Hook để lấy access token
export const useDataverseAuth = () => {
    const { instance, accounts } = useMsal();

    const getAccessToken = async (): Promise<string> => {
        if (accounts.length === 0) {
            throw new Error('No authenticated user found');
        }

        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            });
            return response.accessToken;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                // Token expired, need interactive login
                const response = await instance.acquireTokenPopup(loginRequest);
                return response.accessToken;
            }
            throw error;
        }
    };

    return { getAccessToken };
};

// Helper function cho API calls
const createDataverseService = (getAccessToken: () => Promise<string>) => {

    const fetchFromDataverse = async (path: string, onProgress?: (items: any[]) => void) => {
        try {
            const token = await getAccessToken();
            let url = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/${path}`;
            const allRecords: any[] = [];

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
                    if (onProgress) {
                        onProgress(batch);
                    }
                    allRecords.push(...batch);
                }

                url = data['@odata.nextLink'] || null;
            }

            return { value: allRecords };
        } catch (error: any) {
            if (error.message === 'Failed to fetch') {
                throw new Error("Lỗi kết nối mạng hoặc bị chặn CORS.");
            }
            throw error;
        }
    };

    // Fetch Customers
    const fetchCustomers = async (onProgress?: (customers: Customer[]) => void): Promise<Customer[]> => {
        const query = `crdfd_customers?$select=crdfd_customerid,crdfd_name,crdfd_nganhnghe&$orderby=crdfd_name asc&$filter=statecode eq 0`;

        const mapData = (rawItems: any[]): Customer[] => {
            return rawItems.map((item: any) => ({
                id: item.crdfd_customerid,
                name: item.crdfd_name || 'Khách hàng (Không tên)',
                industryType: item.crdfd_nganhnghe
            }));
        };

        const data = await fetchFromDataverse(query, (rawBatch) => {
            if (onProgress) {
                onProgress(mapData(rawBatch));
            }
        });

        return mapData(data.value);
    };

    // Fetch Orders by Customer
    const fetchOrdersByCustomer = async (customerId: string): Promise<SalesOrder[]> => {
        const cleanId = customerId.replace(/[{}]/g, "");
        const query = `crdfd_sale_orders?$select=crdfd_sale_orderid,crdfd_name,cr1bb_hinhthucgiaohang,crdfd_soonhangchitiet,_cr1bb_vitrikho_value &$filter=_crdfd_khachhang_value eq ${cleanId} and crdfd_trangthaigiaonhan1 ne ${DATAVERSE_STATUS_MAP.DELIVERED} and statecode eq 0`;

        const data = await fetchFromDataverse(query);
        const ordersRaw = data.value;

        const token = await getAccessToken();

        const enrichedOrdersPromise = ordersRaw.map(async (item: any) => {
            let realCount = item.crdfd_soonhangchitiet || 0;

            try {
                const countQueryUrl = `${DATAVERSE_CONFIG.ORG_URL}/api/data/v9.2/crdfd_saleorderdetails?$select=crdfd_saleorderdetailid&$filter=_crdfd_socode_value eq ${item.crdfd_sale_orderid}&$count=true`;
                const countRes = await fetch(countQueryUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Prefer': 'odata.include-annotations="*"'
                    }
                });

                if (countRes.ok) {
                    const countJson = await countRes.json();
                    if (typeof countJson['@odata.count'] === 'number') {
                        realCount = countJson['@odata.count'];
                    }
                }
            } catch (e) {
                console.warn(`Could not fetch count for order ${item.crdfd_name}`, e);
            }

            return {
                id: item.crdfd_sale_orderid,
                soNumber: item.crdfd_name || 'SO (Không mã)',
                deliveryDate: 'Null',
                deliveryMethod: item.cr1bb_hinhthucgiaohang,
                priority: 'Normal',
                sodCount: realCount,
                warehouseLocationId: item._cr1bb_vitrikho_value || undefined
            };
        });

        return Promise.all(enrichedOrdersPromise);
    };

    // Fetch SODs by Order
    const fetchSODsByOrder = async (orderId: string, soNumber: string, warehouseLocationId?: string): Promise<SOD[]> => {
        const cleanId = orderId.replace(/[{}]/g, "");

        const expandAllActivePlans = `crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail(` +
            `$select=crdfd_soluongthucsoan,cr1bb_soluongthucsoanhtheokho,cr1bb_soluongconlaitheoon,cr1bb_soluongconlaitheokho,cr1bb_solangiaoso,cr1bb_trangthaihang;` +
            `$filter=statecode eq 0 and cr1bb_soluongconlaitheokho ge 0` +
            `)`;

        const expandUnits = `crdfd_onvi($select=crdfd_giatrichuyenoi,crdfd_onvichuan)`;

        const query = `crdfd_saleorderdetails?$select=crdfd_name, crdfd_saleorderdetailid, crdfd_soluongconlaitheokhonew,crdfd_ngaygiaodukientonghop,crdfd_tensanphamtext,crdfd_masanpham, crdfd_onvionhang, crdfd_vitrikho, crdfd_ton_kho_ly_thuyet_bo_mua, crdfd_productnum, _crdfd_sanpham_value&$filter=statecode eq 0 and _crdfd_socode_value eq ${cleanId} and crdfd_trangthaionhang1 ne ${DATAVERSE_STATUS_MAP.DELIVERED}&$expand=${expandAllActivePlans},${expandUnits}`;

        const data = await fetchFromDataverse(query);
        const filteredItems = data.value;

        // Build inventory map
        const inventoryMap: Record<string, number> = {};

        if (warehouseLocationId && filteredItems.length > 0) {
            const cleanWarehouseId = warehouseLocationId.replace(/[{}]/g, "");
            const productIds = [...new Set(
                filteredItems.map((item: any) => item._crdfd_sanpham_value).filter((id: any) => id)
            )] as string[];

            if (productIds.length > 0) {
                try {
                    const BATCH_SIZE = 50;
                    const batches: string[][] = [];
                    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
                        batches.push(productIds.slice(i, i + BATCH_SIZE));
                    }

                    const batchPromises = batches.map(async (batchIds) => {
                        const productFilter = batchIds.map(id => `_crdfd_tensanphamlookup_value eq ${id}`).join(' or ');
                        const inventoryQuery = `crdfd_kho_binh_dinhs?$select=_crdfd_tensanphamlookup_value,cr1bb_tonkholythuyetbomua&$filter=statecode eq 0 and _crdfd_vitrikho_value eq ${cleanWarehouseId} and (${productFilter})`;
                        return fetchFromDataverse(inventoryQuery);
                    });

                    const batchResults = await Promise.all(batchPromises);

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
                } catch (e) {
                    console.warn('Could not fetch inventory data:', e);
                }
            }
        }

        return filteredItems.map((item: any) => {
            const plans = item.crdfd_kehoachsoanhangdetail_onbanchitiet_crdfd_saleorderdetail || [];
            const hasPlan = plans.length > 0;

            const qtyActualPicked = plans.reduce((acc: number, p: any) => acc + (p.crdfd_soluongthucsoan || 0), 0);
            const qtySystemPickedWH = plans.reduce((acc: number, p: any) => acc + (p.cr1bb_soluongthucsoanhtheokho || 0), 0);
            const qtyOrderRemainingON = plans.reduce((acc: number, p: any) => acc + (p.cr1bb_soluongconlaitheoon || 0), 0);
            const qtyOrderRemainingWH = plans.reduce((acc: number, p: any) => acc + (p.cr1bb_soluongconlaitheokho || 0), 0);
            const deliveryCount = plans.length > 0 ? (plans[0].cr1bb_solangiaoso || 0) : 0;

            const planStatusLabel = plans.length > 0
                ? (plans[0]['cr1bb_trangthaihang@OData.Community.Display.V1.FormattedValue'] || plans[0].cr1bb_trangthaihang || '')
                : '';

            const qtyOrdered = qtyOrderRemainingON || item.crdfd_soluongconlaitheokhonew || 0;
            const qtyAvailable = qtyActualPicked;
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
                expectedDeliveryDate: item.crdfd_ngaygiaodukientonghop ? item.crdfd_ngaygiaodukientonghop.split('T')[0] : undefined,
                theoreticalStock: (() => {
                    const productId = item._crdfd_sanpham_value;
                    if (productId && inventoryMap[productId.toLowerCase()] !== undefined) {
                        return inventoryMap[productId.toLowerCase()];
                    }
                    return 0;
                })(),
                requiredProductQty: item.crdfd_productnum || 0,
                unitOrderName: item.crdfd_onvionhang || '',
                unitWarehouseName: item.crdfd_onvi?.crdfd_onvichuan || '',
                conversionRate: item.crdfd_onvi?.crdfd_giatrichuyenoi || 1
            };
        });
    };

    return {
        fetchCustomers,
        fetchOrdersByCustomer,
        fetchSODsByOrder,
    };
};

export { createDataverseService };
