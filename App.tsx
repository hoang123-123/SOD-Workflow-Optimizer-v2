
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SOD, UserRole, SODStatus, Customer, SalesOrder } from './types';
import { SODCard } from './components/SODCard';
import { WorkflowGuide } from './components/WorkflowGuide';
import { fetchCustomerById, fetchOrdersByCustomer, fetchSODsByOrder, updateRequestHistory, fetchRequestHistory } from './services/dataverse';
import { notifySaleOnShortage } from './services/flowTriggers';
import { generateDemoScenarios } from './services/sampleData'; // Import Demo Data Generator
import { Users, Search, Database, ChevronDown, Check, X, Package, Building2, Warehouse, ShieldCheck, RefreshCw, Cloud, AlertTriangle, Factory, UserCircle2, BookOpen, FlaskConical, PackageCheck, ChevronUp } from 'lucide-react';

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
    "c585ae98-4585-f011-b4cc-6045bd1d396f",
    "066b26aa-b9a3-ee11-be37-000d3aa3fd6f"
];

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

  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [sods, setSods] = useState<SOD[]>([]);
  const [historyData, setHistoryData] = useState<any>(null); // Store parsed history

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
                console.info("Dev Mode: Using Test Record ID (DEV_TEST_RECORD_ID)");
                recordId = "DEV_TEST_RECORD_ID";
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
                    } catch(e2) {
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
                if(sourceOfTruth !== 'NONE') {
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
                  sourcePlan: savedState.sourcePlan || sod.sourcePlan,
                  warehouseConfirmation: savedState.warehouseConfirmation || sod.warehouseConfirmation, // [ADDED] Restore Warehouse Action
                  warehouseVerification: savedState.warehouseVerification || sod.warehouseVerification // [ADDED] Restore Verification
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
          // Fetch new customer info
          const customer = await fetchCustomerById(customerId);
          setSelectedCustomer(customer);
          
          // Fetch new orders
          const customerOrders = await fetchOrdersByCustomer(customerId);
          setOrders(customerOrders);
          
          // Reset Selection
          setSelectedOrder('');
          setOrderSearch('');
          setSods([]);
          // DO NOT reset contextRecordId here if it's the main context from URL, but 
          // if we switch customer manually, the initial record context might be invalid for new customer.
          // However, for testing "DEV_TEST_RECORD_ID" should persist.
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
      // Create a fake customer if none selected to make UI look consistent
      if (!selectedCustomer) {
          setSelectedCustomer({ id: 'DEMO-CUSTOMER', name: 'Khách Hàng Demo (Admin)' });
      }
  };

  const handleUpdateSOD = (updatedSOD: SOD) => {
    // Optimistic Update UI
    setSods(prev => prev.map(s => s.id === updatedSOD.id ? updatedSOD : s));
  };

  // --- CRITICAL: GLOBAL SAVE STATE HANDLER ---
  const handleSaveState = async (currentSods: SOD[], note?: string) => {
      if (!contextRecordId) {
          console.warn("⚠️ Cannot save history: No Context Record ID found.");
          setSaveStatus('ERROR');
          return;
      }

      // Skip Dataverse update if we are in Dev Mode with Test Record ID
      if (contextRecordId.includes('dev_test_record_id')) {
          console.log("📝 Dev Mode: Skipping sync to Dataverse for Test Record ID.");
          setSaveStatus('SAVED');
          setTimeout(() => setSaveStatus('IDLE'), 2000);
          return;
      }
      
      setSaveStatus('SAVING');

      // Construct a complete snapshot including Context
      const stateToSave = {
          timestamp: new Date().toISOString(),
          context: {
             orderId: selectedOrder,
             orderNumber: currentOrderInfo?.soNumber || orderSearch,
          },
          sods: currentSods.reduce((acc, sod) => {
              // Only save necessary fields to keep JSON small
              acc[sod.id] = {
                  qtyAvailable: sod.qtyAvailable,
                  status: sod.status,
                  isNotificationSent: sod.isNotificationSent,
                  saleDecision: sod.saleDecision, // Preserve Sale Data
                  sourcePlan: sod.sourcePlan,      // Preserve Source Data
                  warehouseConfirmation: sod.warehouseConfirmation, // [ADDED] Preserve Warehouse Data
                  warehouseVerification: sod.warehouseVerification // [ADDED] Preserve Verification Data
              };
              return acc;
          }, {} as Record<string, any>)
      };

      console.log("☁️ Syncing State to Dataverse...", { recordId: contextRecordId, state: stateToSave, note });
      
      setHistoryData(stateToSave);

      // Persist to Dataverse with Error Handling
      // [UPDATED] Pass note if available
      const success = await updateRequestHistory(contextRecordId, stateToSave, note);
      
      if (success) {
          setSaveStatus('SAVED');
          setTimeout(() => setSaveStatus('IDLE'), 2000);
      } else {
          setSaveStatus('ERROR');
          console.error("❌ Save Failed: API returned false.");
          // Only alert if user action triggered it, otherwise it might be annoying
          // For now, let the UI indicator show red 'ERROR'
      }
  };

  const handleCardNotify = async (sod: SOD, recordId: string): Promise<boolean> => {
      // 1. Send Notification Trigger to Sale (Re-added logic)
      await notifySaleOnShortage(sod, recordId);
      
      // 2. Update UI State & Save
      const updatedSod = { ...sod, isNotificationSent: true };
      const newSods = sods.map(s => s.id === sod.id ? updatedSod : s);
      setSods(newSods);

      await handleSaveState(newSods);
      
      return true;
  };

  const handleManualSave = async (updatedSod: SOD) => {
      // 1. Calculate new state array first
      const newSods = sods.map(s => s.id === updatedSod.id ? updatedSod : s);
      
      // 2. Update React State locally (Redundant if onUpdate was called, but ensures consistency)
      setSods(newSods);
      
      // 3. Check for specific note (Discrepancy) to save to column
      let note = undefined;
      if (updatedSod.warehouseVerification?.discrepancyType) {
          note = updatedSod.warehouseVerification.discrepancyType === 'CONVERSION_RATE' 
              ? 'Lệch tỷ lệ chuyển đổi' 
              : 'Lệch tồn kho';
      }

      // 4. Trigger Global Save with the FULL new list and Optional Note
      await handleSaveState(newSods, note);
  };

  // Role Switch Handler
  const handleRoleSwitch = (role: UserRole, deptName: string) => {
      setCurrentRole(role);
      setCurrentDepartment(deptName);
      setIsRoleMenuOpen(false);
  };

  // Logic phân loại SODs cho hiển thị
  const { processedShortageSods, processedSufficientSods } = useMemo(() => {
    // 1. Lọc theo Search & Status cơ bản
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

    // 2. Phân chia thành 2 nhóm: Shortage (Thiếu) và Sufficient (Đủ)
    const shortage = [];
    const sufficient = [];

    const today = new Date();
    today.setHours(0,0,0,0);

    for (const sod of baseFiltered) {
        if (sod.status === SODStatus.SUFFICIENT) {
            // [LOGIC MỚI] Nếu là User Kho, chỉ hiển thị dòng Sufficient khi đã đến hạn (Date <= Today)
            if (currentRole === UserRole.WAREHOUSE) {
                let isDue = true; // Mặc định là true nếu không có ngày
                if (sod.expectedDeliveryDate) {
                     const target = new Date(sod.expectedDeliveryDate);
                     target.setHours(0,0,0,0);
                     isDue = target <= today;
                }
                
                if (isDue) {
                    sufficient.push(sod);
                }
                // Nếu chưa đến hạn thì Kho không thấy dòng này trong list Sufficient
            } else {
                // Sale / Admin thấy hết
                sufficient.push(sod);
            }
        } else {
            shortage.push(sod);
        }
    }

    // 3. Sort cho Shortage List
    const sortedShortage = shortage.sort((a, b) => {
        const aShortage = Math.max(0, (a.qtyOrdered - a.qtyDelivered) - a.qtyAvailable);
        const bShortage = Math.max(0, (b.qtyOrdered - b.qtyDelivered) - b.qtyAvailable);
        if (aShortage > 0 && bShortage === 0) return -1;
        if (aShortage === 0 && bShortage > 0) return 1;
        return 0;
    });

    return {
        processedShortageSods: sortedShortage,
        processedSufficientSods: sufficient
    };
  }, [sods, searchTerm, statusFilter, currentRole]);

  const renderRoleIndicator = () => {
      const displayRoleName = currentDepartment || currentRole;
      
      // Logic: Nếu đang ở chế độ Simulation (chọn role khác Admin), Icon sẽ thay đổi
      // Nhưng nút vẫn Clickable để cho phép chuyển lại
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
        <div className="flex items-center gap-2">
            
            {/* Workflow Guide Button - Visible to ALL USERS */}
            <button 
                onClick={() => setShowWorkflowGuide(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors shadow-sm"
            >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">Luồng xử lý & Hướng dẫn</span>
            </button>

            {/* Admin Buttons: Demo Data */}
            {currentRole === UserRole.ADMIN && (
                <button 
                    onClick={handleLoadDemoData}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors shadow-sm"
                >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Nạp Demo</span>
                </button>
            )}

            {/* Auto-Save Indicator with Auto-Hide */}
            {contextRecordId && saveStatus !== 'IDLE' && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 animate-in fade-in slide-in-from-right-4 
                    ${saveStatus === 'SAVING' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : ''}
                    ${saveStatus === 'SAVED' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : ''}
                    ${saveStatus === 'ERROR' ? 'bg-red-50 border-red-100 text-red-600' : ''}
                `}>
                    {saveStatus === 'SAVING' && (
                        <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs font-bold">Đang lưu...</span>
                        </>
                    )}
                    {saveStatus === 'SAVED' && (
                        <>
                            <Cloud className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">Đã lưu</span>
                        </>
                    )}
                    {saveStatus === 'ERROR' && (
                         <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">Lỗi lưu!</span>
                         </>
                    )}
                </div>
            )}
            
            {/* ROLE SWITCHER BADGE */}
            <div className="relative" ref={roleMenuRef}>
                <button 
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white shadow-sm transition-all hover:ring-2 hover:ring-indigo-100 cursor-pointer ${currentRole === UserRole.ADMIN ? 'border-gray-200' : 'border-indigo-300 ring-2 ring-indigo-50'}`}
                    title="Click to Switch Role (Simulation Mode)"
                >
                    {React.createElement(currentIcon, { className: "w-3.5 h-3.5 text-gray-500" })}
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[150px]">{displayRoleName}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {isRoleMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mô phỏng vai trò</span>
                        </div>
                        <ul className="py-1">
                            {SIMULATION_ROLES.map((item) => (
                                <li key={item.role}>
                                    <button
                                        onClick={() => handleRoleSwitch(item.role, item.dept)}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors ${currentRole === item.role ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                                    >
                                        <item.icon className={`w-3.5 h-3.5 ${currentRole === item.role ? 'text-indigo-600' : 'text-gray-400'}`} />
                                        {item.label}
                                        {currentRole === item.role && <Check className="w-3 h-3 ml-auto text-indigo-600" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50 font-sans text-gray-900 relative">
      <WorkflowGuide isOpen={showWorkflowGuide} onClose={() => setShowWorkflowGuide(false)} />

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3">
            <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full lg:w-auto">
                    {/* Customer */}
                    <div className="relative">
                         {currentRole === UserRole.ADMIN ? (
                             <div className="relative">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                     <Building2 className="w-4 h-4 text-gray-400" />
                                 </div>
                                 <select 
                                    className="appearance-none block w-full h-9 pl-9 pr-8 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                                    value={selectedCustomer?.id || ''}
                                    onChange={(e) => handleCustomerSwitch(e.target.value)}
                                 >
                                     {customerOptions.map(id => {
                                         // Compare normalized IDs to ensure match even if case differs
                                         const isSelected = normalizeId(id) === normalizeId(selectedCustomer?.id);
                                         return (
                                            <option key={id} value={id}>
                                                {/* If this option is currently selected (or matches loaded customer), show the name */}
                                                {isSelected && selectedCustomer 
                                                    ? selectedCustomer.name 
                                                    : (id === TEST_CUSTOMER_IDS[0] ? 'Khách hàng Demo' : `ID: ${id.substring(0, 20)}...`)
                                                }
                                            </option>
                                         );
                                     })}
                                 </select>
                                 <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                     <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                 </div>
                             </div>
                         ) : (
                             <div className="flex items-center w-full h-9 pl-3 pr-3 border border-gray-200 rounded-md bg-gray-50/50">
                                 <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                                 <span className="text-sm font-medium text-gray-700 truncate flex-1">
                                    {selectedCustomer ? selectedCustomer.name : (isLoading ? 'Đang tải...' : 'Khách hàng')}
                                 </span>
                            </div>
                         )}
                    </div>

                    {/* Order Search */}
                    <div className="relative" ref={orderDropdownRef}>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Package className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full h-9 pl-9 pr-8 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                                placeholder={selectedCustomer ? "Tìm mã đơn hàng..." : "..."}
                                value={orderSearch}
                                onChange={(e) => {
                                    setOrderSearch(e.target.value);
                                    setIsOrderDropdownOpen(true);
                                    if (!e.target.value) setSelectedOrder('');
                                }}
                                onFocus={() => { if (selectedCustomer) setIsOrderDropdownOpen(true); }}
                                disabled={!selectedCustomer}
                            />
                            {selectedOrder ? (
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center cursor-pointer" onClick={handleClearOrder}>
                                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                                </div>
                            ) : (
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Dropdown */}
                        {isOrderDropdownOpen && selectedCustomer && (
                             <div className="absolute top-full left-0 z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 max-h-[60vh] overflow-y-auto">
                                 {filteredOrders.length > 0 ? (
                                     <ul className="py-1">
                                         {filteredOrders.map(o => (
                                             <li 
                                                 key={o.id}
                                                 className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm"
                                                 onClick={() => handleSelectOrder(o)}
                                             >
                                                 <span className={`font-medium ${selectedOrder === o.id ? 'text-indigo-600' : 'text-gray-700'}`}>{o.soNumber || "Không có mã"}</span>
                                                 {selectedOrder === o.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                             </li>
                                         ))}
                                     </ul>
                                 ) : (
                                     <div className="px-3 py-4 text-center text-xs text-gray-400">Không có dữ liệu</div>
                                 )}
                             </div>
                        )}
                    </div>
                </div>

                <div className="mt-2 lg:mt-0">
                    {renderRoleIndicator()}
                </div>
            </div>
            
            {(isLoading || isRestoring || saveStatus === 'SAVING') && (
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gray-100 overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-[progress_1s_ease-in-out_infinite] origin-left"></div>
                </div>
            )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {selectedOrder ? (
        <div className="animate-in fade-in duration-300">
            <section className="mb-6">
                {/* TOOLBAR */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-5">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">Chi tiết dòng hàng</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                            {processedShortageSods.length}
                        </span>
                        {showRestoredBadge && (
                            <span className="ml-2 flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase font-bold tracking-wide animate-in fade-in duration-500">
                                <RefreshCw className="w-3 h-3" />
                                Đã khôi phục
                            </span>
                        )}
                        {saveStatus === 'ERROR' && (
                             <span className="ml-2 flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase font-bold tracking-wide animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                Lỗi lưu dữ liệu!
                            </span>
                        )}
                     </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-3.5 w-3.5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full sm:w-64 pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                                placeholder="Tìm kiếm SKU, Sản phẩm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <select 
                                className="block w-full sm:w-48 pl-3 pr-8 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer text-gray-700 font-medium"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value={SODStatus.SHORTAGE_PENDING_SALE}>Cần Sale xử lý</option>
                                <option value={SODStatus.SHORTAGE_PENDING_SOURCE}>Cần Source xử lý</option>
                                <option value={SODStatus.RESOLVED}>Đã hoàn tất</option>
                                <option value={SODStatus.SUFFICIENT}>Đủ tồn kho</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* LIST 1: SHORTAGE ITEMS (MAIN) */}
                    {processedShortageSods.length > 0 ? (
                        processedShortageSods.map(sod => (
                            <SODCard 
                                key={sod.id} 
                                sod={sod} 
                                currentRole={currentRole}
                                recordId={contextRecordId} // Pass recordId to SODCard
                                onUpdate={handleUpdateSOD}
                                onNotifySale={handleCardNotify}
                                onSaveState={handleManualSave}
                                saleId={saleId} 
                            />
                        ))
                    ) : (
                        <div className="py-12 text-center border border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                            {isLoading ? "Đang tải dữ liệu..." : "Không tìm thấy dòng hàng thiếu hụt."}
                        </div>
                    )}

                    {/* LIST 2: SUFFICIENT ITEMS (WAREHOUSE + SALE + ADMIN) */}
                    {/* [UPDATED] Show for Sale also per request */}
                    {(currentRole === UserRole.WAREHOUSE || currentRole === UserRole.ADMIN || currentRole === UserRole.SALE) && processedSufficientSods.length > 0 && (
                        <div className="mt-8">
                             <div 
                                className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
                                onClick={() => setIsSufficientExpanded(!isSufficientExpanded)}
                             >
                                <div className="flex items-center gap-2">
                                    <PackageCheck className="w-5 h-5 text-emerald-600" />
                                    <span className="font-bold text-emerald-800 text-sm">Các dòng hàng Đủ tiêu chuẩn (Sufficient)</span>
                                    <span className="px-2 py-0.5 bg-white text-emerald-600 text-xs font-bold rounded-full border border-emerald-200">
                                        {processedSufficientSods.length}
                                    </span>
                                </div>
                                {isSufficientExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
                             </div>

                             {isSufficientExpanded && (
                                <div className="mt-4 space-y-4 border-l-2 border-emerald-100 pl-4 animate-in slide-in-from-top-2">
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
           <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <Database className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-sm font-medium">Vui lòng chọn đơn hàng để bắt đầu.</p>
           </div>
           )
        )}
      </main>
      <style>{`@keyframes progress { 0% { transform: translateX(-100%) scaleX(0.2); } 50% { transform: translateX(0%) scaleX(0.5); } 100% { transform: translateX(100%) scaleX(0.2); } }`}</style>
    </div>
  );
};

export default App;
