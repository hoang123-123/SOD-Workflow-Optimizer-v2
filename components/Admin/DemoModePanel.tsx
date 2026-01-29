/**
 * Demo Mode Panel - Mô phỏng Workflow đầy đủ
 * Sale submit → Kho xem → Kho xử lý → Sale xem kết quả
 */

import React, { useState, useEffect } from 'react';
import { SOD, UserRole, NotificationPayload, SODStatus } from '../../types';
import { SODCard } from '../SODCard';
import {
    DEMO_TEST_CASES,
    getTestCaseSOD,
    updateTestCaseSOD,
    resetDemoState,
    getDemoState,
    DemoTestCase
} from '../../data/sampleData';
import {
    FlaskConical,
    ChevronDown,
    RotateCcw,
    Check,
    Play,
    Info,
    X,
    Users,
    Code,
    Copy,
    CheckCircle2,
    Send,
    Clock,
    Trash2,
    ArrowRight,
    AlertCircle,
    Zap,
    Eye
} from 'lucide-react';

// Storage keys
const PAYLOAD_LOG_KEY = 'sod_demo_payload_logs';
const WORKFLOW_STATE_KEY = 'sod_demo_workflow_state';

// Workflow states
interface WorkflowState {
    currentStep: number;
    steps: WorkflowStep[];
    testCaseId: string;
}

interface WorkflowStep {
    id: string;
    role: UserRole;
    action: string;
    description: string;
    completed: boolean;
    payload?: NotificationPayload;
    timestamp?: string;
}

// Payload log entry
interface PayloadLogEntry {
    id: string;
    timestamp: string;
    testCaseId: string;
    testCaseName: string;
    actionType: string;
    payload: NotificationPayload;
    fromRole: UserRole;
    toRole: UserRole;
}

interface DemoModePanelProps {
    primaryRole: UserRole;
    currentRole: UserRole;
    onRoleChange: (role: UserRole) => void;
}

// Helper: Xác định người nhận dựa trên action
const getReceiverRole = (actionType: string): UserRole => {
    switch (actionType) {
        case 'SALE_SHIP_FACTORY':
        case 'SALE_SHIP_AND_CLOSE':
        case 'SALE_TO_WAREHOUSE_CHOT_DON':
            return UserRole.WAREHOUSE;
        case 'SALE_TO_SOURCE':
            return UserRole.SOURCE;
        case 'WAREHOUSE_TO_SALE':
        case 'SOURCE_TO_SALE':
        case 'WAREHOUSE_CONFIRM_EXPORT':
        case 'WAREHOUSE_REJECT_EXPORT':
            return UserRole.SALE;
        default:
            return UserRole.ADMIN;
    }
};

export const DemoModePanel: React.FC<DemoModePanelProps> = ({
    primaryRole,
    currentRole,
    onRoleChange
}) => {
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [currentTestCase, setCurrentTestCase] = useState<DemoTestCase | null>(null);
    const [currentSOD, setCurrentSOD] = useState<SOD | null>(null);
    const [customerIndustryType, setCustomerIndustryType] = useState<number>(0);

    // Workflow & Payload states
    const [payloadLogs, setPayloadLogs] = useState<PayloadLogEntry[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<{ toRole: UserRole; description: string } | null>(null);

    // [UPDATED] Mọi role đều có thể vào Demo Mode
    // Admin thấy tất cả cases, các role khác chỉ thấy cases liên quan đến họ
    const getFilteredTestCases = (): DemoTestCase[] => {
        if (primaryRole === UserRole.ADMIN) {
            return DEMO_TEST_CASES; // Admin thấy tất cả
        }

        // Filter cases theo role
        return DEMO_TEST_CASES.filter(tc => {
            // Sale thấy: cases thiếu hàng + cases Kho→Sale
            if (primaryRole === UserRole.SALE) {
                return tc.id.startsWith('SALE_REQ') || tc.id.startsWith('WH_REQ');
            }
            // Warehouse thấy: đơn gấp + cases đã xử lý
            if (primaryRole === UserRole.WAREHOUSE) {
                return tc.id.startsWith('URGENT') || tc.id.startsWith('PROCESSED');
            }
            // Source thấy: cases chờ hàng (nếu có)
            if (primaryRole === UserRole.SOURCE) {
                return tc.id.includes('SOURCE') || false;
            }
            return false;
        });
    };

    const filteredTestCases = getFilteredTestCases();

    // Load payload logs từ localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(PAYLOAD_LOG_KEY);
            if (stored) {
                setPayloadLogs(JSON.parse(stored));
            }
        } catch { }
    }, [isDemoMode]);

    // Load test case và check pending action
    useEffect(() => {
        if (selectedCaseId) {
            const result = getTestCaseSOD(selectedCaseId);
            if (result) {
                setCurrentSOD(result.sod);
                setCustomerIndustryType(result.customerIndustryType);
                setCurrentTestCase(DEMO_TEST_CASES.find(tc => tc.id === selectedCaseId) || null);

                // Check nếu có pending action từ log gần nhất
                const latestLog = payloadLogs.find(log => log.testCaseId === selectedCaseId);
                if (latestLog && latestLog.toRole !== currentRole) {
                    setPendingAction({
                        toRole: latestLog.toRole,
                        description: `${latestLog.fromRole} đã submit "${latestLog.actionType}". Chuyển sang ${latestLog.toRole} để xử lý.`
                    });
                } else {
                    setPendingAction(null);
                }
            }
        } else {
            setCurrentSOD(null);
            setCurrentTestCase(null);
            setPendingAction(null);
        }
    }, [selectedCaseId, payloadLogs, currentRole]);

    // Handler cập nhật SOD - capture payload và update workflow
    const handleSODUpdate = (updatedSOD: SOD) => {
        setCurrentSOD(updatedSOD);
        if (selectedCaseId) {
            updateTestCaseSOD(selectedCaseId, updatedSOD);

            // Tạo payload log entry
            const newLog = generatePayloadLog(selectedCaseId, currentTestCase?.name || '', updatedSOD, currentRole);
            if (newLog) {
                const updatedLogs = [newLog, ...payloadLogs].slice(0, 20);
                setPayloadLogs(updatedLogs);
                localStorage.setItem(PAYLOAD_LOG_KEY, JSON.stringify(updatedLogs));

                // Set pending action dựa trên toRole
                if (newLog.toRole === UserRole.ADMIN) {
                    // Hệ thống tự xử lý - không cần chuyển role
                    setPendingAction({
                        toRole: UserRole.ADMIN,
                        description: `✅ Hoàn tất! Hệ thống tự động xử lý. Không cần bên nào thao tác thêm.`
                    });
                } else {
                    // Cần người khác xử lý
                    setPendingAction({
                        toRole: newLog.toRole,
                        description: `Đã submit! Chuyển sang ${newLog.toRole} để xem người nhận sẽ thấy gì và cần thao tác gì.`
                    });
                }
            }
        }
    };

    // Generate payload log
    const generatePayloadLog = (caseId: string, caseName: string, sod: SOD, fromRole: UserRole): PayloadLogEntry | null => {
        let actionType = '';
        let payload: NotificationPayload | null = null;
        let toRole: UserRole = UserRole.ADMIN;

        // Detect action type từ SOD state
        if (sod.saleDecision) {
            const action = sod.saleDecision.action;
            switch (action) {
                case 'SHIP_PARTIAL':
                    actionType = 'SALE_SHIP_FACTORY';
                    // [WORKFLOW] Sale chấp nhận số hệ thống → Hệ thống tự đưa vào kế hoạch soạn
                    // Kho KHÔNG CẦN xác nhận lại, chỉ thực hiện soạn hàng
                    toRole = UserRole.ADMIN; // Hệ thống tự xử lý
                    payload = {
                        Type: 'SALE_SHIP_FACTORY',
                        RecordId: `demo-record-${caseId}`,
                        SodId: sod.id,
                        SodName: sod.detailName,
                        Sku: sod.product.sku,
                        SONumber: sod.soNumber,
                        ProductName: sod.product.name,
                        Message: `📦 GIAO HÀNG (Nhà máy): ${sod.saleDecision.quantity || 0} ${sod.unitOrderName || 'SP'}`,
                        Timestamp: new Date().toISOString(),
                        Details: {
                            Actor: 'SALE',
                            ActionCode: 'SHIP_PARTIAL',
                            OriginalQty: sod.qtyOrdered,
                            ShipQty: sod.saleDecision.quantity,
                            RemainingQty: sod.qtyOrdered - (sod.saleDecision.quantity || 0),
                            DeliveryRound: (sod.deliveryCount || 0) + 1,
                            NextAction: '✅ HỆ THỐNG TỰ ĐỘNG đưa vào Kế hoạch soạn. Kho chỉ cần thực hiện, KHÔNG CẦN xác nhận lại.',
                            WorkflowNote: 'Số liệu đã đúng từ hệ thống rải tồn'
                        }
                    };
                    break;
                case 'SHIP_AND_CLOSE':
                    actionType = 'SALE_SHIP_AND_CLOSE';
                    // [WORKFLOW] Sale chấp nhận số hệ thống → Hệ thống tự đưa vào kế hoạch soạn
                    toRole = UserRole.ADMIN; // Hệ thống tự xử lý
                    payload = {
                        Type: 'SALE_SHIP_AND_CLOSE',
                        RecordId: `demo-record-${caseId}`,
                        SodId: sod.id,
                        SodName: sod.detailName,
                        Sku: sod.product.sku,
                        SONumber: sod.soNumber,
                        ProductName: sod.product.name,
                        Message: `📦 GIAO & CHỐT ĐƠN: ${sod.saleDecision.quantity || 0} ${sod.unitOrderName || 'SP'}`,
                        Timestamp: new Date().toISOString(),
                        Details: {
                            Actor: 'SALE',
                            ActionCode: 'SHIP_AND_CLOSE',
                            OriginalQty: sod.qtyOrdered,
                            ShipQty: sod.saleDecision.quantity,
                            CancelledQty: sod.qtyOrdered - (sod.saleDecision.quantity || 0),
                            NextAction: '✅ HỆ THỐNG TỰ ĐỘNG đưa vào Kế hoạch soạn + ĐÓNG dòng. Kho chỉ cần thực hiện.',
                            WorkflowNote: 'Số liệu đã đúng từ hệ thống rải tồn'
                        }
                    };
                    break;
                case 'WAIT_ALL':
                    actionType = 'SALE_TO_SOURCE';
                    toRole = UserRole.SOURCE;
                    payload = {
                        Type: 'SALE_TO_SOURCE',
                        RecordId: `demo-record-${caseId}`,
                        SodId: sod.id,
                        SodName: sod.detailName,
                        Sku: sod.product.sku,
                        SONumber: sod.soNumber,
                        ProductName: sod.product.name,
                        Message: `⏳ CHỜ HÀNG: Yêu cầu Source xác nhận kế hoạch`,
                        Timestamp: new Date().toISOString(),
                        Details: {
                            Actor: 'SALE',
                            ActionCode: 'WAIT_ALL',
                            RequestedQty: sod.qtyOrdered,
                            AvailableQty: sod.qtyAvailable,
                            ShortageQty: sod.qtyOrdered - (sod.qtyAvailable || 0),
                            NextAction: 'SOURCE cần XÁC NHẬN ngày về hàng (ETA)'
                        }
                    };
                    break;
                case 'CANCEL_ORDER':
                    actionType = 'SALE_HUY_DON';
                    // [WORKFLOW] Hủy đơn → Hệ thống tự đóng dòng
                    toRole = UserRole.ADMIN; // Hệ thống tự xử lý
                    payload = {
                        Type: 'SALE_HUY_DON',
                        RecordId: `demo-record-${caseId}`,
                        SodId: sod.id,
                        SodName: sod.detailName,
                        Sku: sod.product.sku,
                        SONumber: sod.soNumber,
                        ProductName: sod.product.name,
                        Message: `❌ HỦY ĐƠN HÀNG: Không giao, đóng đơn`,
                        Timestamp: new Date().toISOString(),
                        Details: {
                            Actor: 'SALE',
                            ActionCode: 'CANCEL_ORDER',
                            CancelledQty: sod.qtyOrdered,
                            NextAction: '✅ HỆ THỐNG TỰ ĐỘNG đóng dòng. Không cần Kho xử lý.',
                            WorkflowNote: 'Đơn hàng đã được hủy và đóng tự động'
                        }
                    };
                    break;
            }
        } else if (sod.warehouseConfirmation) {
            const status = sod.warehouseConfirmation.status;
            actionType = status === 'CONFIRMED' ? 'WAREHOUSE_CONFIRM_EXPORT' : 'WAREHOUSE_REJECT_EXPORT';
            toRole = UserRole.SALE;
            payload = {
                Type: actionType as any,
                RecordId: `demo-record-${caseId}`,
                SodId: sod.id,
                SodName: sod.detailName,
                Sku: sod.product.sku,
                SONumber: sod.soNumber,
                ProductName: sod.product.name,
                Message: status === 'CONFIRMED'
                    ? '✅ KHO ĐÃ XÁC NHẬN XUẤT HÀNG'
                    : `❌ KHO TỪ CHỐI: ${sod.warehouseConfirmation.reason || 'Không rõ lý do'}`,
                Timestamp: new Date().toISOString(),
                Details: {
                    Actor: 'WAREHOUSE',
                    ActionCode: status,
                    Reason: sod.warehouseConfirmation.reason,
                    NextAction: status === 'CONFIRMED'
                        ? 'Quy trình hoàn tất - Hàng sẽ được xuất'
                        : 'SALE cần xem lại và quyết định lại'
                }
            };
        } else if (sod.urgentRequest && sod.urgentRequest.status !== 'PENDING') {
            const status = sod.urgentRequest.status;
            actionType = status === 'ACCEPTED' ? 'WH_URGENT_ACCEPTED' : 'WH_URGENT_REJECTED';
            toRole = UserRole.SALE;
            payload = {
                Type: actionType as any,
                RecordId: `demo-record-${caseId}`,
                SodId: sod.id,
                SodName: sod.detailName,
                Sku: sod.product.sku,
                SONumber: sod.soNumber,
                ProductName: sod.product.name,
                Message: status === 'ACCEPTED' ? '⚡ KHO ĐÃ CHẤP NHẬN ĐƠN GẤP' : '⚡ KHO TỪ CHỐI ĐƠN GẤP',
                Timestamp: new Date().toISOString(),
                Details: {
                    Actor: 'WAREHOUSE',
                    ActionCode: status,
                    NextAction: status === 'ACCEPTED'
                        ? 'Kho sẽ ưu tiên soạn hàng'
                        : 'SALE cần liên hệ khách hàng'
                }
            };
        } else if (sod.warehouseVerification) {
            actionType = 'WAREHOUSE_TO_SALE';
            toRole = UserRole.SALE;
            payload = {
                Type: 'WAREHOUSE_TO_SALE',
                RecordId: `demo-record-${caseId}`,
                SodId: sod.id,
                SodName: sod.detailName,
                Sku: sod.product.sku,
                SONumber: sod.soNumber,
                ProductName: sod.product.name,
                Message: `⚠️ KHO BÁO SAI LỆCH: Có ${sod.warehouseVerification.actualQty} ${sod.unitWarehouseName}, cần ${sod.qtyOrderRemainingWH}`,
                Timestamp: new Date().toISOString(),
                Details: {
                    Actor: 'WAREHOUSE',
                    ActionCode: 'REPORT_DISCREPANCY',
                    ActualQtyWH: sod.warehouseVerification.actualQty,
                    RequestedQtyON: sod.warehouseVerification.requestedQty,
                    DiscrepancyType: sod.warehouseVerification.discrepancyType,
                    NextAction: 'SALE cần quyết định: Giao / Chờ hàng / Hủy'
                }
            };
        }

        if (!payload) return null;

        return {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            testCaseId: caseId,
            testCaseName: caseName,
            actionType,
            payload,
            fromRole,
            toRole
        };
    };

    // Handler lưu state
    const handleSaveState = async (updatedSOD: SOD) => {
        if (selectedCaseId) {
            updateTestCaseSOD(selectedCaseId, updatedSOD);
        }
    };

    // Reset tất cả
    const handleResetAll = () => {
        resetDemoState();
        localStorage.removeItem(PAYLOAD_LOG_KEY);
        setPayloadLogs([]);
        setPendingAction(null);
        if (selectedCaseId) {
            const originalCase = DEMO_TEST_CASES.find(tc => tc.id === selectedCaseId);
            if (originalCase) {
                setCurrentSOD({ ...originalCase.sod });
            }
        }
    };

    // Clear payload logs
    const handleClearLogs = () => {
        localStorage.removeItem(PAYLOAD_LOG_KEY);
        setPayloadLogs([]);
    };

    // Copy payload
    const handleCopyPayload = (log: PayloadLogEntry) => {
        navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
        setCopiedId(log.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Switch role
    const handleSwitchRole = (role: UserRole) => {
        onRoleChange(role);
        setPendingAction(null);
    };

    // Đếm số case đã có thay đổi
    const modifiedCount = Object.keys(getDemoState()).length;

    // Check xem role hiện tại có pending action không
    const hasPendingForCurrentRole = payloadLogs.some(
        log => log.testCaseId === selectedCaseId && log.toRole === currentRole
    );

    if (!isDemoMode) {
        return (
            <button
                onClick={() => setIsDemoMode(true)}
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all hover:scale-105 active:scale-95"
            >
                <FlaskConical className="w-5 h-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Demo Mode</span>
                {(modifiedCount > 0 || payloadLogs.length > 0) && (
                    <span className="bg-white text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        {payloadLogs.length || modifiedCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm overflow-hidden flex">
            {/* Left Panel - Controls + Preview */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-purple-500/30 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-purple-400">
                            <FlaskConical className="w-6 h-6" />
                            <h1 className="text-xl font-black uppercase tracking-wider">Workflow Demo</h1>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            Chỉ Admin thấy
                        </span>
                    </div>
                    <button
                        onClick={() => setIsDemoMode(false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Pending Action Banner */}
                    {pendingAction && (
                        pendingAction.toRole === UserRole.ADMIN ? (
                            // Hệ thống tự xử lý - Banner xanh
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <div>
                                        <div className="font-bold text-emerald-400">Quy trình hoàn tất</div>
                                        <div className="text-sm text-slate-300">{pendingAction.description}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Cần người khác xử lý - Banner vàng + button
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                        <div>
                                            <div className="font-bold text-amber-400">Workflow tiếp theo</div>
                                            <div className="text-sm text-slate-300">{pendingAction.description}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSwitchRole(pendingAction.toRole)}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-bold hover:bg-amber-400 transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Xem với role {pendingAction.toRole}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    )}

                    {/* Controls */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-6">
                        {/* Role Switcher */}
                        <div>
                            <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
                                <Users className="w-4 h-4 inline mr-2" />
                                Đang xem với vai trò
                            </label>
                            <div className="flex gap-2">
                                {[UserRole.SALE, UserRole.WAREHOUSE, UserRole.SOURCE].map(role => {
                                    const isPending = payloadLogs.some(
                                        log => log.testCaseId === selectedCaseId && log.toRole === role
                                    );
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => handleSwitchRole(role)}
                                            className={`relative px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all ${currentRole === role
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                }`}
                                        >
                                            {role}
                                            {isPending && currentRole !== role && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Test Case Selector */}
                        <div>
                            <label className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
                                <Play className="w-4 h-4 inline mr-2" />
                                Chọn Test Case
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedCaseId}
                                    onChange={(e) => setSelectedCaseId(e.target.value)}
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-xl px-4 py-3 font-medium appearance-none cursor-pointer focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                >
                                    <option value="">-- Chọn một test case --</option>
                                    <optgroup label="Sale TẠO Request (Kho sẽ nhận)">
                                        {filteredTestCases.filter(tc => tc.id.startsWith('SALE_')).map(tc => (
                                            <option key={tc.id} value={tc.id}>{tc.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Kho GỬI Notification (Sale sẽ nhận)">
                                        {filteredTestCases.filter(tc => tc.id.startsWith('WH_')).map(tc => (
                                            <option key={tc.id} value={tc.id}>{tc.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Đơn Gấp">
                                        {filteredTestCases.filter(tc => tc.id.startsWith('URGENT_')).map(tc => (
                                            <option key={tc.id} value={tc.id}>{tc.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Test Case Info + Current Role Context */}
                        {currentTestCase && (
                            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-bold text-white mb-1">{currentTestCase.name}</div>
                                        <div className="text-sm text-slate-300 mb-3">{currentTestCase.description}</div>

                                        {/* Current Role Context */}
                                        <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                                            <div className="text-xs font-bold text-purple-400 uppercase mb-2">
                                                Với vai trò {currentRole}:
                                            </div>
                                            <div className="text-sm text-slate-300">
                                                {currentRole === UserRole.SALE && !currentSOD?.isNotificationSent && (
                                                    <>Bạn là người TẠO request → Chọn action để submit</>
                                                )}
                                                {currentRole === UserRole.SALE && currentSOD?.isNotificationSent && (
                                                    <>Kho đã báo sai lệch → Bạn cần quyết định Giao/Chờ/Hủy</>
                                                )}
                                                {currentRole === UserRole.WAREHOUSE && (
                                                    <>Bạn sẽ NHẬN request từ Sale → Xác nhận hoặc Từ chối xuất hàng</>
                                                )}
                                                {currentRole === UserRole.SOURCE && (
                                                    <>Bạn sẽ NHẬN yêu cầu chờ hàng → Xác nhận ngày về hàng (ETA)</>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-3 text-xs">
                                            <span className={`px-2 py-1 rounded-lg font-bold ${customerIndustryType === 191920000
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                }`}>
                                                {customerIndustryType === 191920000 ? 'Nhà máy' : 'Khách thường'}
                                            </span>
                                            {hasPendingForCurrentRole && (
                                                <span className="px-2 py-1 rounded-lg font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    Đang chờ bạn xử lý
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleResetAll}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all font-medium"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset tất cả
                            </button>
                        </div>
                    </div>

                    {/* SOD Card Preview */}
                    {currentSOD && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Check className="w-5 h-5" />
                                <span className="font-bold text-sm uppercase tracking-wider">
                                    UI {currentRole} sẽ thấy
                                </span>
                            </div>
                            <div className="bg-white rounded-2xl">
                                <SODCard
                                    sod={currentSOD}
                                    currentRole={currentRole}
                                    onUpdate={handleSODUpdate}
                                    onSaveState={handleSaveState}
                                    recordId={`demo-record-${selectedCaseId}`}
                                    customerIndustryType={customerIndustryType}
                                    currentDepartment="Demo Department"
                                    isRequestCreator={!currentSOD.isNotificationSent}
                                />
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!currentSOD && (
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
                            <FlaskConical className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <div className="text-slate-400 font-medium">Chọn một test case để bắt đầu demo workflow</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Payload Logs */}
            <div className="w-[450px] bg-slate-950 border-l border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <Code className="w-5 h-5" />
                        <span className="font-bold text-sm uppercase tracking-wider">Payload Log</span>
                        {payloadLogs.length > 0 && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                {payloadLogs.length}
                            </span>
                        )}
                    </div>
                    {payloadLogs.length > 0 && (
                        <button
                            onClick={handleClearLogs}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                            Xóa log
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {payloadLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <Send className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                            <div className="text-sm text-slate-500">Chưa có payload nào</div>
                            <div className="text-xs text-slate-600 mt-1">Submit action trên card để xem payload</div>
                        </div>
                    ) : (
                        payloadLogs.map((log) => (
                            <div key={log.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                {/* Log Header */}
                                <div className="p-3 border-b border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                                            {log.actionType}
                                        </span>
                                        <button
                                            onClick={() => handleCopyPayload(log)}
                                            className={`p-1.5 rounded-lg transition-all ${copiedId === log.id
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                                }`}
                                        >
                                            {copiedId === log.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Flow Direction */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold">
                                            {log.fromRole}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-slate-500" />
                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded font-bold">
                                            {log.toRole}
                                        </span>
                                        <span className="text-slate-500 ml-auto">
                                            {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                                        </span>
                                    </div>
                                </div>
                                {/* Payload JSON */}
                                <pre className="p-3 text-xs text-slate-300 overflow-x-auto font-mono leading-relaxed max-h-[250px] overflow-y-auto">
                                    {JSON.stringify(log.payload, null, 2)}
                                </pre>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
