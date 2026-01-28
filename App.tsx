
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SOD, UserRole, SODStatus, Customer, SalesOrder } from './types';
import { SODCard } from './components/SODCard';
import { WorkflowGuide } from './components/WorkflowGuide';
import { fetchCustomerById, fetchOrdersByCustomer, fetchSODsByOrder, updateRequestHistory, fetchRequestHistory } from './services/dataverse';
import { notifySaleOnShortage } from './services/flowTriggers';
import { generateDemoScenarios } from './services/sampleData'; // Import Demo Data Generator
import { Users, Search, Database, ChevronDown, Check, X, Package, Building2, Warehouse, ShieldCheck, RefreshCw, Cloud, AlertTriangle, Factory, UserCircle2, BookOpen, FlaskConical, PackageCheck, ChevronUp, LayoutGrid } from 'lucide-react';

// --- DEPARTMENT MAPPING CONFIGURATION ---
const DEPARTMENT_ROLE_MAP: { [key: string]: UserRole } = {
    'SOURCING': UserRole.SOURCE,
    'LOGISTICS': UserRole.WAREHOUSE,
    'FULLFILLMENT': UserRole.WAREHOUSE,
    'QUALITY CONTROL': UserRole.WAREHOUSE,
    'BUSINESS DEVELOPMENT': UserRole.SALE,
    'TECH': UserRole.ADMIN,
    'BOARD OF DIRECTOR': UserRole.VIEWER,
    'MARKETING': UserRole.VIEWER,
    'HUMAN RESOURCE': UserRole.VIEWER,
    'PRODUCT DESIGN': UserRole.VIEWER,
    'FINANCE & ACCOUNT': UserRole.VIEWER,
};

// --- TEST CUSTOMERS CONFIGURATION (FOR ADMIN/TESTING) ---
const TEST_CUSTOMER_IDS = [
    "09480845-9ace-f011-8544-000d3aa05927",
    "066b26aa-b9a3-ee11-be37-000d3aa3fd6f"
];

// [DEV] Record ID phiếu demo để test
const DEV_RECORD_ID = "da5fb5b6-b1f5-f011-8406-000d3aa213fd";

const getRoleFromDepartment = (department: string | null): UserRole => {
    if (!department) return UserRole.ADMIN;
    const normalizedDept = department.trim().toUpperCase();
    if (DEPARTMENT_ROLE_MAP[normalizedDept]) return DEPARTMENT_ROLE_MAP[normalizedDept];
    if (normalizedDept.includes('SALE') || normalizedDept.includes('BUSINESS')) return UserRole.SALE;
    if (normalizedDept.includes('SOURCE') || normalizedDept.includes('PURCHASING')) return UserRole.SOURCE;
    if (normalizedDept.includes('KHO') || normalizedDept.includes('WAREHOUSE')) return UserRole.WAREHOUSE;
    if (normalizedDept.includes('TECH') || normalizedDept.includes('ADMIN')) return UserRole.ADMIN;
    return UserRole.ADMIN;
};

// Helper: Normalize ID for reliable comparison (lowercase, no braces, trim)
const normalizeId = (id: string | null | undefined) => {
    if (!id) return "";
    return id.toLowerCase().replace(/[{}]/g, "").trim();
};

const App: React.FC = () => {
    const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.ADMIN);
    const [currentDepartment, setCurrentDepartment] = useState<string>('');
    const [saleId, setSaleId] = useState<string | null>(null);
    const [contextRecordId, setContextRecordId] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // UI Indicators State
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');
    const [showRestoredBadge, setShowRestoredBadge] = useState(false);

    // Modals
    const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

    // Dropdowns
    const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
    const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false); // New State for Role Switcher
    const [isSufficientExpanded, setIsSufficientExpanded] = useState(true); // State for "Sufficient" container
    const [isShortageExpanded, setIsShortageExpanded] = useState(true); // [NEW] State for "Shortage" container

    const [error, setError] = useState<string | null>(null);

    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [sods, setSods] = useState<SOD[]>([]);
    const [historyData, setHistoryData] = useState<any>(null); // Store parsed history
    const [isRequestCreator, setIsRequestCreator] = useState<boolean>(true); // [NEW] True = bộ phận này TẠO request, False = XỬ LÝ request

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<string>('');
    const [orderSearch, setOrderSearch] = useState('');

    const orderDropdownRef = useRef<HTMLDivElement>(null);
    const roleMenuRef = useRef<HTMLDivElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Keep track of current order info for saving context
    const currentOrderInfo = useMemo(() => {
        return orders.find(o => o.id === selectedOrder);
    }, [orders, selectedOrder]);

    // Combine Test IDs with current selected customer ID to ensure it appears in dropdown
    const customerOptions = useMemo(() => {
        const ids = new Set(TEST_CUSTOMER_IDS);
        if (selectedCustomer?.id) {
            ids.add(selectedCustomer.id);
        }
        return Array.from(ids);
    }, [selectedCustomer]);

    useEffect(() => {
        const initContext = async () => {
            setIsLoading(true);
            try {
                const urlParams = new URLSearchParams(window.location.search);
                let dataParam = urlParams.get('data');
                let customerId: string | null = null;
                let recordId: string | null = null;
                let saleIDParam: string | null = urlParams.get('saleID');
                let historyValueParam: string | null = urlParams.get('historyValue');
                let directDeptParam = urlParams.get('department') || urlParams.get('phongBan');
                const directRoleParam = urlParams.get('role')?.toUpperCase();

                // Parse data param if exists (Legacy or wrapped params)
                if (dataParam) {
                    let decodedData = decodeURIComponent(dataParam);
                    if (decodedData.includes('%') || decodedData.includes('http')) {
                        try {
                            const secondDecode = decodeURIComponent(decodedData);
                            if (!secondDecode.includes('%')) decodedData = secondDecode;
                        } catch (e) { console.warn("Failed secondary decode"); }
                    }
                    const customParams = new URLSearchParams(decodedData);
                    customerId = customParams.get('customerId');
                    recordId = customParams.get('recordId');

                    if (!directDeptParam) directDeptParam = customParams.get('department') || customParams.get('phongBan');
                    if (!saleIDParam) saleIDParam = customParams.get('saleID');
                    if (!historyValueParam) historyValueParam = customParams.get('historyValue');
                }

                // Fallback to top level params
                if (!customerId) customerId = urlParams.get('customerId');
                if (!recordId) recordId = urlParams.get('recordId');

                // --- TEST FALLBACK: Use Default Sale ID if missing ---
                if (!saleIDParam) {
                    console.info("Dev Mode: Using Test Sale ID");
                    saleIDParam = "829bde80-1c54-ed11-9562-000d3ac7ccec";
                }

                // --- TEST FALLBACK: Record ID if missing ---
                if (!recordId || recordId === 'undefined' || recordId === 'null') {
                    console.info("Dev Mode: Using Test Record ID", DEV_RECORD_ID);
                    recordId = DEV_RECORD_ID;
                }

                // --- HISTORY RETRIEVAL STRATEGY ---
                let effectiveHistory = null;
                let sourceOfTruth = 'NONE';

                // 1. PRIORITY: URL History
                if (historyValueParam) {
                    try {
                        const decodedHistory = decodeURIComponent(historyValueParam);
                        effectiveHistory = JSON.parse(decodedHistory);
                        sourceOfTruth = 'URL';
                    } catch (e) {
                        try {
                            effectiveHistory = JSON.parse(historyValueParam);
                            sourceOfTruth = 'URL_RAW';
                        } catch (e2) {
                            console.warn("Failed to parse history from URL");
                        }
                    }
                }

                // 2. SECONDARY: DB Fetch (Only if URL has no history and we have a RecordID)
                if (recordId) {
                    const normRecordId = normalizeId(recordId);
                    setContextRecordId(normRecordId);

                    // Only fetch from DB if it looks like a valid GUID to avoid errors with "DEV_TEST_RECORD_ID"
                    const isValidGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normRecordId);

                    if (!effectiveHistory && isValidGuid) {
                        setIsRestoring(true);
                        try {
                            const dbHistory = await fetchRequestHistory(normRecordId);
                            if (dbHistory) {
                                effectiveHistory = dbHistory;
                                sourceOfTruth = 'DATAVERSE';
                            }
                        } catch (e) {
                            console.warn("Could not fetch history from DB:", e);
                        } finally {
                            setIsRestoring(false);
                        }
                    }
                }

                if (effectiveHistory) {
                    setHistoryData(effectiveHistory);
                    setIsRequestCreator(false); // [FIX] Có history = đang XỬ LÝ request từ nguồn khác
                    if (sourceOfTruth !== 'NONE') {
                        // Trigger Badge instead of Toast
                        setShowRestoredBadge(true);
                        setTimeout(() => setShowRestoredBadge(false), 3000); // Hide after 3s
                    }
                }

                // Set Context State
                if (directDeptParam) setCurrentDepartment(directDeptParam);
                else if (!currentDepartment) setCurrentDepartment('Tech'); // Default for dev

                if (saleIDParam) setSaleId(saleIDParam);

                if (directRoleParam === 'SOURCE') setCurrentRole(UserRole.SOURCE);
                else if (directRoleParam === 'WAREHOUSE' || directRoleParam === 'KHO') setCurrentRole(UserRole.WAREHOUSE);
                else if (directRoleParam === 'VIEWER') setCurrentRole(UserRole.VIEWER);
                else if (directRoleParam === 'ADMIN') setCurrentRole(UserRole.ADMIN);
                else if (directDeptParam) setCurrentRole(getRoleFromDepartment(directDeptParam));
                else setCurrentRole(UserRole.ADMIN);

                if (!customerId || customerId === 'undefined' || customerId === 'null') {
                    // Default to the first test customer if no specific customer is provided
                    customerId = TEST_CUSTOMER_IDS[0];
                }

                if (!customerId) {
                    setError("Không tìm thấy ID Khách hàng (customerId).");
                    setIsLoading(false);
                    return;
                }

                const normCustomerId = normalizeId(customerId);

                // Fetch Initial Customer
                try {
                    const customer = await fetchCustomerById(normCustomerId);
                    setSelectedCustomer(customer);

                    // Fetch Orders
                    const customerOrders = await fetchOrdersByCustomer(normCustomerId);
                    setOrders(customerOrders);

                    // --- AUTO SELECT ORDER LOGIC ---
                    // 1. Try matching URL RecordID
                    let targetOrder = null;
                    if (recordId && recordId !== 'undefined' && recordId !== "DEV_TEST_RECORD_ID") {
                        targetOrder = customerOrders.find(o => normalizeId(o.id) === normalizeId(recordId));
                    }

                    // 2. If not found, Try using Order ID saved in History
                    if (!targetOrder && effectiveHistory?.context?.orderId) {
                        console.log("Auto-selecting order from History Context:", effectiveHistory.context.orderId);
                        targetOrder = customerOrders.find(o => normalizeId(o.id) === normalizeId(effectiveHistory.context.orderId));
                    }

                    // Execute Selection
                    if (targetOrder) {
                        setSelectedOrder(targetOrder.id);
                        setOrderSearch(targetOrder.soNumber || '');

                        // Fetch and Apply
                        const sodsData = await fetchSODsByOrder(targetOrder.id, targetOrder.soNumber);
                        const mergedSods = applyHistoryToSods(sodsData, effectiveHistory);
                        setSods(mergedSods);
                    }
                } catch (err) {
                    console.warn("Initial customer fetch failed, possibly invalid ID", err);
                    // Fallback to manual selection mode if fetch fails
                }

            } catch (err) {
                setError("Lỗi khởi tạo dữ liệu: " + (err instanceof Error ? err.message : String(err)));
            } finally {
                setIsLoading(false);
            }
        };
        initContext();
    }, []);

    // Helper: Merge fresh data with history state (Aggressive normalization)
    const applyHistoryToSods = (freshSods: SOD[], history: any): SOD[] => {
        if (!history || !history.sods) return freshSods;

        const normalizedHistoryMap: Record<string, any> = {};
        Object.keys(history.sods).forEach(key => {
            normalizedHistoryMap[normalizeId(key)] = history.sods[key];
        });

        return freshSods.map(sod => {
            const normId = normalizeId(sod.id);
            const savedState = normalizedHistoryMap[normId];

            if (savedState) {
                return {
                    ...sod,
                    qtyAvailable: savedState.qtyAvailable !== undefined ? savedState.qtyAvailable : sod.qtyAvailable,
                    status: savedState.status || sod.status,
                    isNotificationSent: savedState.isNotificationSent || false,
                    saleDecision: savedState.saleDecision || sod.saleDecision,
                    urgentRequest: savedState.urgentRequest || sod.urgentRequest,
                    sourcePlan: savedState.sourcePlan || sod.sourcePlan,
                    warehouseConfirmation: savedState.warehouseConfirmation || sod.warehouseConfirmation,
                    warehouseVerification: savedState.warehouseVerification || sod.warehouseVerification
                };
            }
            return sod;
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (orderDropdownRef.current && !orderDropdownRef.current.contains(event.target as Node)) {
                setIsOrderDropdownOpen(false);
            }
            if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
                setIsRoleMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => (o.soNumber || '').toLowerCase().includes(orderSearch.toLowerCase()));
    }, [orders, orderSearch]);

    const handleSelectOrder = async (order: SalesOrder) => {
        setSelectedOrder(order.id);
        setOrderSearch(order.soNumber || '');
        setIsOrderDropdownOpen(false);
        try {
            setIsLoading(true);
            const data = await fetchSODsByOrder(order.id, order.soNumber);

            // Re-apply history if available
            const merged = applyHistoryToSods(data, historyData);
            setSods(merged);
        } catch (err) {
            console.error(err);
            alert("Lỗi tải chi tiết đơn hàng (SOD)");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomerSwitch = async (customerId: string) => {
        try {
            setIsLoading(true);
            const customer = await fetchCustomerById(customerId);
            setSelectedCustomer(customer);

            const customerOrders = await fetchOrdersByCustomer(customerId);
            setOrders(customerOrders);

            setSelectedOrder('');
            setOrderSearch('');
            setSods([]);
        } catch (e) {
            console.error("Switch Customer Error", e);
            alert("Không thể tải dữ liệu khách hàng này. Vui lòng kiểm tra lại ID.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearOrder = () => {
        setSelectedOrder('');
        setOrderSearch('');
        setSods([]);
    }

    const handleLoadDemoData = () => {
        const demoSods = generateDemoScenarios();
        setSods(demoSods);
        setSelectedOrder('DEMO-MODE');
        setOrderSearch('DEMO-SCENARIOS-2025');
        if (!selectedCustomer) {
            setSelectedCustomer({ id: 'DEMO-CUSTOMER', name: 'Khách Hàng Demo (Admin)' });
        }
    };

    const handleUpdateSOD = (updatedSOD: SOD) => {
        setSods(prev => prev.map(s => s.id === updatedSOD.id ? updatedSOD : s));
    };

    const handleSaveState = async (currentSods: SOD[], note?: string) => {
        console.log('📝 [handleSaveState] Called with:', { contextRecordId, sodCount: currentSods.length, note });

        if (!contextRecordId) {
            console.error('❌ [handleSaveState] No contextRecordId!');
            setSaveStatus('ERROR');
            return;
        }

        if (contextRecordId.toLowerCase().includes('dev_test_record_id')) {
            console.log('⚠️ [handleSaveState] Dev test mode, skipping API call');
            setSaveStatus('SAVED');
            setTimeout(() => setSaveStatus('IDLE'), 2000);
            return;
        }

        setSaveStatus('SAVING');
        console.log('💾 [handleSaveState] Saving to Dataverse...');

        const stateToSave = {
            timestamp: new Date().toISOString(),
            context: {
                orderId: selectedOrder,
                orderNumber: currentOrderInfo?.soNumber || orderSearch,
            },
            sods: currentSods.reduce((acc, sod) => {
                acc[sod.id] = {
                    qtyAvailable: sod.qtyAvailable,
                    status: sod.status,
                    isNotificationSent: sod.isNotificationSent,
                    saleDecision: sod.saleDecision,
                    urgentRequest: sod.urgentRequest,
                    sourcePlan: sod.sourcePlan,
                    warehouseConfirmation: sod.warehouseConfirmation,
                    warehouseVerification: sod.warehouseVerification
                };
                return acc;
            }, {} as Record<string, any>)
        };

        setHistoryData(stateToSave);
        const success = await updateRequestHistory(contextRecordId, stateToSave, note);

        if (success) {
            setSaveStatus('SAVED');
            setTimeout(() => setSaveStatus('IDLE'), 2000);
        } else {
            setSaveStatus('ERROR');
        }
    };

    const handleCardNotify = async (sod: SOD, recordId: string): Promise<boolean> => {
        await notifySaleOnShortage(sod, recordId);
        const updatedSod = { ...sod, isNotificationSent: true };
        const newSods = sods.map(s => s.id === sod.id ? updatedSod : s);
        setSods(newSods);
        await handleSaveState(newSods);
        return true;
    };

    const handleManualSave = async (updatedSod: SOD) => {
        const newSods = sods.map(s => s.id === updatedSod.id ? updatedSod : s);
        setSods(newSods);
        let note = undefined;
        if (updatedSod.warehouseVerification?.discrepancyType) {
            note = updatedSod.warehouseVerification.discrepancyType === 'CONVERSION_RATE'
                ? 'Lệch tỷ lệ chuyển đổi'
                : 'Lệch tồn kho';
        }
        await handleSaveState(newSods, note);
    };

    const handleRoleSwitch = (role: UserRole, deptName: string) => {
        setCurrentRole(role);
        setCurrentDepartment(deptName);
        setIsRoleMenuOpen(false);
    };

    const { processedDiscrepancySods, processedShortageSods, processedSufficientSods } = useMemo(() => {
        const baseFiltered = sods.filter(sod => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                (sod.soNumber || '').toLowerCase().includes(term) ||
                (sod.product?.sku || '').toLowerCase().includes(term) ||
                (sod.product?.name || '').toLowerCase().includes(term) ||
                (sod.detailName || '').toLowerCase().includes(term) ||
                (sod.id || '').toLowerCase().includes(term);
            const matchesStatus = statusFilter === 'ALL' || sod.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        const discrepancy: typeof sods = [];  // [NEW] List riêng cho Request từ Kho
        const shortage: typeof sods = [];     // List cho đơn thiếu hàng thường
        const sufficient: typeof sods = [];   // List cho đơn gấp/đủ hàng
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        for (const sod of baseFiltered) {
            // Fix: Chỉ lấy 10 ký tự đầu (YYYY-MM-DD) để so sánh, tránh lỗi do dính time "T00:00:00Z"
            const sodDate = sod.expectedDeliveryDate ? sod.expectedDeliveryDate.substring(0, 10) : '';
            const isFuture = sodDate > todayStr;
            const isDue = !sodDate || sodDate <= todayStr;
            const isUrgentPotential = (sod.theoreticalStock || 0) >= (sod.requiredProductQty || 0) * (sod.conversionRate || 1);
            const isUrgentPending = sod.urgentRequest?.status === 'PENDING';

            if (currentRole === UserRole.SALE) {
                const isShortageStatus = sod.status === SODStatus.SHORTAGE_PENDING_SALE;
                const isShortageFromPlan = sod.statusFromPlan?.toLowerCase().includes('thiếu') || sod.statusFromPlan?.toLowerCase().includes('thieu');
                const hasWarehouseDiscrepancy = !!sod.warehouseVerification;
                const hasSaleDecision = !!sod.saleDecision;
                const hasUrgentRequest = !!sod.urgentRequest;
                const isUrgentPending = sod.urgentRequest?.status === 'PENDING';

                if (!isRequestCreator) {
                    // [MODE: XỬ LÝ/XEM LẠI HISTORY]
                    // Hiển thị nếu có bất kỳ tác động nào trong history: Sai lệch kho OR Quyết định của Sale OR Yêu cầu gấp
                    if (hasWarehouseDiscrepancy) {
                        discrepancy.push(sod);
                    } else if (hasSaleDecision || hasUrgentRequest) {
                        // Quyết định chốt hàng của Sale hoặc Yêu cầu gấp -> cho vào list tương ứng để hiển thị
                        if (isUrgentPending || hasUrgentRequest) {
                            sufficient.push(sod);
                        } else {
                            shortage.push(sod);
                        }
                    }
                } else {
                    // [MODE: TẠO REQUEST] - Load data tự động từ hệ thống
                    if (hasWarehouseDiscrepancy) {
                        discrepancy.push(sod);
                    } else if (isShortageStatus || isShortageFromPlan) {
                        shortage.push(sod);
                    } else if ((isFuture && isUrgentPotential) || isUrgentPending) {
                        sufficient.push(sod);
                    }
                }
            } else if (currentRole === UserRole.WAREHOUSE) {
                const isPlanSufficient = sod.statusFromPlan === 'Đủ';
                const hasAnyUrgentRequest = !!sod.urgentRequest;
                const hasSaleDecision = !!sod.saleDecision;
                const hasWarehouseDiscrepancy = !!sod.warehouseVerification;

                if (!isRequestCreator) {
                    // [MODE: XỬ LÝ] - Kho xử lý các yêu cầu hoặc xem lại báo cáo
                    if (hasWarehouseDiscrepancy) {
                        // ƯU TIÊN 1: Nếu có sai lệch -> Đưa vào discrepancy
                        discrepancy.push(sod);
                    } else if (hasAnyUrgentRequest || hasSaleDecision) {
                        // ƯU TIÊN 2: Nếu không có sai lệch nhưng là Yêu cầu gấp hoặc lệnh xuất hàng -> Đưa vào shortage
                        shortage.push(sod);
                    }
                } else {
                    // [MODE: TẠO MỚI] - Kho khởi tạo yêu cầu
                    if (hasWarehouseDiscrepancy) {
                        // ƯU TIÊN 1: Đã có báo cáo sai lệch
                        discrepancy.push(sod);
                    } else if (hasAnyUrgentRequest) {
                        // ƯU TIÊN 2: Đã có yêu cầu gấp
                        shortage.push(sod);
                    } else if (isDue && isPlanSufficient) {
                        // ƯU TIÊN 3: Đơn đủ hàng đến hạn
                        sufficient.push(sod);
                    }
                }
                // Dòng hàng 'Thiếu' (Shortage) mà Sale chưa xử lý sẽ ẩn hoàn toàn khỏi Kho theo yêu cầu
            } else {
                // Admin or others
                if (sod.status === SODStatus.SUFFICIENT) sufficient.push(sod);
                else shortage.push(sod);
            }
        }

        const sortedShortage = shortage.sort((a, b) => {
            const aShortage = Math.max(0, (a.qtyOrdered - a.qtyDelivered) - a.qtyAvailable);
            const bShortage = Math.max(0, (b.qtyOrdered - b.qtyDelivered) - b.qtyAvailable);
            if (aShortage > 0 && bShortage === 0) return -1;
            if (aShortage === 0 && bShortage > 0) return 1;
            return 0;
        });

        return {
            processedDiscrepancySods: discrepancy,
            processedShortageSods: sortedShortage,
            processedSufficientSods: sufficient
        };
    }, [sods, searchTerm, statusFilter, currentRole, isRequestCreator]);

    const renderRoleIndicator = () => {
        const displayRoleName = currentDepartment || currentRole;
        const currentIcon = currentRole === UserRole.ADMIN ? ShieldCheck :
            (currentRole === UserRole.SALE ? UserCircle2 :
                (currentRole === UserRole.SOURCE ? Factory :
                    (currentRole === UserRole.WAREHOUSE ? Warehouse : Users)));

        const SIMULATION_ROLES = [
            { role: UserRole.ADMIN, dept: 'Tech', label: 'Admin (Tech)', icon: ShieldCheck },
            { role: UserRole.SALE, dept: 'Business Development', label: 'Sale (Business)', icon: UserCircle2 },
            { role: UserRole.SOURCE, dept: 'Sourcing', label: 'Source (Purchasing)', icon: Factory },
            { role: UserRole.WAREHOUSE, dept: 'Logistics', label: 'Warehouse (Kho)', icon: Warehouse },
            { role: UserRole.VIEWER, dept: 'Board of Director', label: 'Viewer (Board)', icon: Users },
        ];

        return (
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowWorkflowGuide(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-all shadow-lg active:scale-95 group"
                >
                    <BookOpen className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Hướng dẫn</span>
                </button>

                {currentRole === UserRole.ADMIN && (
                    <button
                        onClick={handleLoadDemoData}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all shadow-lg active:scale-95 group"
                    >
                        <FlaskConical className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Demo</span>
                    </button>
                )}

                {contextRecordId && saveStatus !== 'IDLE' && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-right-4 
                        ${saveStatus === 'SAVING' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/10' : ''}
                        ${saveStatus === 'SAVED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' : ''}
                        ${saveStatus === 'ERROR' ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-red-500/10' : ''}
                    `}>
                        {saveStatus === 'SAVING' && <RefreshCw className="w-4 h-4 animate-spin" />}
                        {saveStatus === 'SAVED' && <Cloud className="w-4 h-4" />}
                        {saveStatus === 'ERROR' && <AlertTriangle className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                            {saveStatus === 'SAVING' ? 'Lưu...' : (saveStatus === 'SAVED' ? 'Đã lưu' : 'Lỗi!')}
                        </span>
                    </div>
                )}

                <div className="relative" ref={roleMenuRef}>
                    <button
                        onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                        className="flex items-center gap-3 px-5 py-2 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-all shadow-xl active:scale-95 group"
                    >
                        {React.createElement(currentIcon, { className: "w-4 h-4 text-indigo-400 group-hover:scale-110 transition-all" })}
                        <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest truncate max-w-[150px]">{displayRoleName}</span>
                        <ChevronDown className="w-4 h-4 text-slate-500 group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    {isRoleMenuOpen && (
                        <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-2">
                            <div className="px-4 py-3 border-b border-slate-800 mb-2">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Mô phỏng vai trò</span>
                            </div>
                            <div className="space-y-1">
                                {SIMULATION_ROLES.map((item) => (
                                    <button
                                        key={item.role}
                                        onClick={() => handleRoleSwitch(item.role, item.dept)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${currentRole === item.role ? 'bg-indigo-500/10 text-indigo-400 shadow-inner' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="flex-1">{item.label}</span>
                                        {currentRole === item.role && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen pb-20 bg-gray-50 font-sans text-gray-800 relative">
            <WorkflowGuide isOpen={showWorkflowGuide} onClose={() => setShowWorkflowGuide(false)} />

            {/* HEADER */}
            <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40 px-6 py-4 shadow-sm">
                <div className="max-w-[1500px] mx-auto flex flex-col lg:flex-row items-center gap-6 justify-between">

                    <div className="flex items-center gap-3 group">
                        <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-all duration-500">
                            <LayoutGrid className="w-7 h-7 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Workflow</h1>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Optimizer v2.0</p>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full lg:max-w-3xl">
                        {/* Customer */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                <Building2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <select
                                className="appearance-none block w-full h-12 pl-12 pr-10 text-[11px] font-bold uppercase tracking-widest text-gray-700 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                                value={selectedCustomer?.id || ''}
                                onChange={(e) => handleCustomerSwitch(e.target.value)}
                                disabled={currentRole !== UserRole.ADMIN}
                            >
                                {customerOptions.map(id => {
                                    const isSelected = normalizeId(id) === normalizeId(selectedCustomer?.id);
                                    return (
                                        <option key={id} value={id}>
                                            {isSelected && selectedCustomer
                                                ? selectedCustomer.name
                                                : (id === TEST_CUSTOMER_IDS[0] ? 'KHÁCH HÀNG DEMO' : `ID: ${id.substring(0, 16)}...`)
                                            }
                                        </option>
                                    );
                                })}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Order Search */}
                        <div className="relative group" ref={orderDropdownRef}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                    <Package className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full h-12 pl-12 pr-12 text-[11px] font-bold uppercase tracking-widest text-gray-900 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400 shadow-sm"
                                    placeholder={selectedCustomer ? "TÌM MÃ ĐƠN HÀNG..." : "..."}
                                    value={orderSearch}
                                    onChange={(e) => {
                                        setOrderSearch(e.target.value);
                                        setIsOrderDropdownOpen(true);
                                        if (!e.target.value) setSelectedOrder('');
                                    }}
                                    onFocus={() => { if (selectedCustomer) setIsOrderDropdownOpen(true); }}
                                    disabled={!selectedCustomer}
                                />
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                    {selectedOrder ? (
                                        <button onClick={handleClearOrder} className="hover:text-red-400 transition-colors">
                                            <X className="h-4 w-4 text-gray-400" />
                                        </button>
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-gray-400 pointer-events-none" />
                                    )}
                                </div>
                            </div>

                            {/* Dropdown */}
                            {isOrderDropdownOpen && selectedCustomer && (
                                <div className="absolute top-full left-0 z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 max-h-[50vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 p-2">
                                    {filteredOrders.length > 0 ? (
                                        <div className="space-y-1">
                                            {filteredOrders.map(o => (
                                                <button
                                                    key={o.id}
                                                    className={`w-full px-4 py-3 rounded-lg text-left text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-between ${selectedOrder === o.id ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                                                    onClick={() => handleSelectOrder(o)}
                                                >
                                                    <span>{o.soNumber || "KHÔNG CÓ MÃ"}</span>
                                                    {selectedOrder === o.id && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-6 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400">Không có dữ liệu</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0">
                        {renderRoleIndicator()}
                    </div>
                </div>

                {isLoading && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-100 overflow-hidden">
                        <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-[progress_1.5s_ease-in-out_infinite] origin-left"></div>
                    </div>
                )}
            </header>

            <main className="max-w-[1500px] mx-auto px-6 py-10">
                {selectedOrder ? (
                    <div className="animate-in fade-in duration-500">
                        <section>
                            {/* TOOLBAR */}
                            <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center mb-10 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-6">
                                    {showRestoredBadge && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 uppercase tracking-widest animate-in fade-in duration-500 shadow-sm">
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Dữ liệu đã khôi phục
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                    <div className="relative flex-1 sm:w-80 group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                            <Search className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400 shadow-sm"
                                            placeholder="TÌM KIẾM SKU, SẢN PHẨM..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="relative sm:w-64 group">
                                        <select
                                            className="appearance-none block w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="ALL">TẤT CẢ TRẠNG THÁI</option>
                                            <option value={SODStatus.SHORTAGE_PENDING_SALE}>CẦN SALE XỪ LÝ</option>
                                            <option value={SODStatus.SHORTAGE_PENDING_SOURCE}>CẦN SOURCE XỪ LÝ</option>
                                            <option value={SODStatus.RESOLVED}>ĐÃ HOÀN TẤT</option>
                                            <option value={SODStatus.SUFFICIENT}>ĐỦ TỒN KHO</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-12">
                                {/* [NEW] LIST 0: REQUEST SAI LỆCH (DÀNH CHO CẢ SALE & KHO) */}
                                {(currentRole === UserRole.SALE || currentRole === UserRole.WAREHOUSE) && processedDiscrepancySods.length > 0 && (
                                    <div className="group/list border-2 rounded-[2rem] transition-all duration-500 overflow-hidden bg-white border-indigo-100 shadow-xl shadow-indigo-500/5">
                                        <button
                                            className="flex items-center justify-between w-full p-8 transition-all active:scale-[0.99] bg-indigo-50/30"
                                            onClick={() => setIsShortageExpanded(!isShortageExpanded)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="p-4 rounded-2xl shadow-lg transition-all duration-500 bg-indigo-500 text-white scale-110 rotate-0">
                                                    <AlertTriangle className="w-7 h-7" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="flex items-start gap-1">
                                                        <span className="block font-black uppercase tracking-tighter text-2xl leading-none text-gray-900">
                                                            {currentRole === UserRole.SALE ? 'Request từ Kho' : 'Báo cáo sai lệch'}
                                                        </span>
                                                        <div className="px-2 py-0.5 rounded-full font-black text-[10px] shadow-sm transform -translate-y-2 transition-all duration-500 bg-indigo-500 text-white">
                                                            {processedDiscrepancySods.length}
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600/70 mt-1.5 block">
                                                        {currentRole === UserRole.SALE ? 'Kho đã kiểm kê thấy sai lệch, cần xử lý phương án' : 'Yêu cầu kiểm tra số liệu tồn kho thực tế'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2.5 rounded-xl transition-all duration-500 bg-indigo-100 text-indigo-600 rotate-0">
                                                <ChevronDown className="w-6 h-6" />
                                            </div>
                                        </button>

                                        <div className="p-8 pt-0 space-y-8 animate-in slide-in-from-top-4 fade-in duration-500">
                                            <div className="grid grid-cols-1 gap-6">
                                                {processedDiscrepancySods.map(sod => (
                                                    <SODCard
                                                        key={sod.id}
                                                        sod={sod}
                                                        currentRole={currentRole}
                                                        recordId={contextRecordId}
                                                        onUpdate={handleUpdateSOD}
                                                        onNotifySale={handleCardNotify}
                                                        onSaveState={handleManualSave}
                                                        saleId={saleId}
                                                        customerIndustryType={selectedCustomer?.industryType}
                                                        currentDepartment={currentDepartment}
                                                        isRequestCreator={false}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* LIST 1: SHORTAGE ITEMS (MAIN) - HIDDEN FOR WAREHOUSE */}
                                {((currentRole !== UserRole.WAREHOUSE) || (currentRole === UserRole.WAREHOUSE && processedShortageSods.length > 0)) && processedShortageSods.length > 0 && (
                                    <div className={`group/list border-2 rounded-[2rem] transition-all duration-500 overflow-hidden ${isShortageExpanded ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-500/5' : 'bg-gray-50/50 border-gray-200'}`}>
                                        <button
                                            className={`flex items-center justify-between w-full p-8 transition-all active:scale-[0.99] ${isShortageExpanded ? 'bg-indigo-50/30' : 'bg-transparent hover:bg-gray-100/50'}`}
                                            onClick={() => setIsShortageExpanded(!isShortageExpanded)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`p-4 rounded-2xl shadow-lg transition-all duration-500 ${isShortageExpanded ? 'bg-indigo-500 text-white scale-110 rotate-0' : 'bg-gray-200 text-gray-500 -rotate-12 group-hover/list:rotate-0'}`}>
                                                    <AlertTriangle className="w-7 h-7" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="flex items-start gap-1">
                                                        <span className={`block font-black uppercase tracking-tighter text-2xl leading-none ${isShortageExpanded ? 'text-gray-900' : 'text-gray-500'}`}>
                                                            {currentRole === UserRole.WAREHOUSE ? 'Request giao gấp' : 'Danh sách thiếu hàng'}
                                                        </span>
                                                        <div className={`px-2 py-0.5 rounded-full font-black text-[10px] shadow-sm transform -translate-y-2 transition-all duration-500 ${isShortageExpanded ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                                            {processedShortageSods.length}
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600/70 mt-1.5 block">
                                                        {currentRole === UserRole.WAREHOUSE ? 'Các đơn hàng tương lai có khả năng giao sớm' : 'Các dòng hàng đang bị thiếu hụt cần xử lý phương án cung ứng'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`p-2.5 rounded-xl transition-all duration-500 ${isShortageExpanded ? 'bg-indigo-100 text-indigo-600 rotate-0' : 'bg-gray-200 text-gray-500 rotate-180'}`}>
                                                <ChevronDown className="w-6 h-6" />
                                            </div>
                                        </button>

                                        {isShortageExpanded && (
                                            <div className="p-8 pt-0 space-y-8 animate-in slide-in-from-top-4 fade-in duration-500">
                                                {processedShortageSods.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-6">
                                                        {processedShortageSods.map(sod => (
                                                            <SODCard
                                                                key={sod.id}
                                                                sod={sod}
                                                                currentRole={currentRole}
                                                                recordId={contextRecordId}
                                                                onUpdate={handleUpdateSOD}
                                                                onNotifySale={handleCardNotify}
                                                                onSaveState={handleManualSave}
                                                                saleId={saleId}
                                                                customerIndustryType={selectedCustomer?.industryType}
                                                                currentDepartment={currentDepartment}
                                                                isRequestCreator={isRequestCreator}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    !isLoading && (
                                                        <div className="py-24 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/30">
                                                            <Package className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                                                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Không tìm thấy dòng hàng thiếu hụt.</p>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* LIST 2: SUFFICIENT ITEMS */}
                                {(currentRole === UserRole.WAREHOUSE || currentRole === UserRole.ADMIN || currentRole === UserRole.SALE) && processedSufficientSods.length > 0 && (
                                    <div className={`group/list border-2 rounded-[2rem] transition-all duration-500 overflow-hidden ${isSufficientExpanded ? 'bg-white border-emerald-100 shadow-xl shadow-emerald-500/5' : 'bg-gray-50/50 border-gray-200'}`}>
                                        <button
                                            className={`flex items-center justify-between w-full p-8 transition-all active:scale-[0.99] ${isSufficientExpanded ? 'bg-emerald-50/30' : 'bg-transparent hover:bg-gray-100/50'}`}
                                            onClick={() => setIsSufficientExpanded(!isSufficientExpanded)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className={`p-4 rounded-2xl shadow-lg transition-all duration-500 ${isSufficientExpanded ? 'bg-emerald-500 text-white scale-110 rotate-0' : 'bg-gray-200 text-gray-500 -rotate-12 group-hover/list:rotate-0'}`}>
                                                    <PackageCheck className="w-7 h-7" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="flex items-start gap-1">
                                                        <span className={`block font-black uppercase tracking-tighter text-2xl leading-none ${isSufficientExpanded ? 'text-gray-900' : 'text-gray-500'}`}>
                                                            {currentRole === UserRole.SALE ? 'Đơn gấp khả thi' : (currentRole === UserRole.WAREHOUSE ? (isRequestCreator ? 'Báo cáo sai lệch' : 'Request xuất kho') : 'Items Approved')}
                                                        </span>
                                                        <div className={`px-2 py-0.5 rounded-full font-black text-[10px] shadow-sm transform -translate-y-2 transition-all duration-500 ${isSufficientExpanded ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                                            {processedSufficientSods.length}
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600/70 mt-1.5 block">
                                                        {currentRole === UserRole.SALE ? 'Các đơn hàng tương lai có khả năng giao sớm' : (currentRole === UserRole.WAREHOUSE ? (isRequestCreator ? 'Kho tạo yêu cầu kiểm tra số liệu tồn kho' : 'Xử lý xuất kho, đơn gấp và báo cáo sai lệch') : 'Các dòng hàng đủ tiêu chuẩn (Sufficient)')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSufficientExpanded ? 'bg-emerald-100 text-emerald-600 rotate-0' : 'bg-gray-200 text-gray-500 rotate-180'}`}>
                                                <ChevronDown className="w-6 h-6" />
                                            </div>
                                        </button>

                                        {isSufficientExpanded && (
                                            <div className="p-8 pt-0 space-y-8 animate-in slide-in-from-top-4 fade-in duration-500">
                                                {processedSufficientSods.map(sod => (
                                                    <SODCard
                                                        key={sod.id}
                                                        sod={sod}
                                                        currentRole={currentRole}
                                                        recordId={contextRecordId}
                                                        onUpdate={handleUpdateSOD}
                                                        onNotifySale={handleCardNotify}
                                                        onSaveState={handleManualSave}
                                                        saleId={saleId}
                                                        customerIndustryType={selectedCustomer?.industryType}
                                                        currentDepartment={currentDepartment}
                                                        isRequestCreator={isRequestCreator}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                    !isLoading && (
                        <div className="flex flex-col items-center justify-center py-48 animate-in zoom-in-95 duration-700">
                            <div className="relative mb-10">
                                <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] animate-pulse"></div>
                                <div className="relative p-12 bg-white rounded-3xl border border-gray-200 shadow-lg active:scale-95 transition-transform cursor-default">
                                    <Database className="w-24 h-24 text-indigo-500 opacity-30" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter text-center">Ready for input</h2>
                            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mt-4 text-center max-w-sm leading-relaxed opacity-70">
                                Vui lòng chọn khách hàng và đơn hàng ở phía trên để bắt đầu tối ưu hóa quy trình.
                            </p>

                            <div className="mt-12 flex gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]"></div>
                            </div>
                        </div>
                    )
                )}
            </main>
            <style>{`
                @keyframes progress { 0% { transform: translateX(-100%) scaleX(0.2); } 50% { transform: translateX(0%) scaleX(0.5); } 100% { transform: translateX(100%) scaleX(0.2); } }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default App;
