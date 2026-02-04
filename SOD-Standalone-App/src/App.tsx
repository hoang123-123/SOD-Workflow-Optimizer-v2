import React, { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from './config/authConfig';
import { createDataverseService, useDataverseAuth } from './services/dataverse';
import { Customer, SalesOrder, SOD, UserRole } from './types';
import {
    LogIn,
    LogOut,
    Package,
    User,
    Building2,
    Truck,
    ChevronDown,
    Scale,
    Search,
    Box,
    FileText,
    CheckCircle2,
    AlertTriangle,
    BellRing,
    Loader2
} from 'lucide-react';

// ============================================
// LOGIN COMPONENT
// ============================================
const LoginPage: React.FC = () => {
    const { instance } = useMsal();

    const handleLogin = async () => {
        try {
            await instance.loginPopup(loginRequest);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <Package />
                </div>
                <h1>SOD Workflow Optimizer</h1>
                <p>Đăng nhập bằng tài khoản Microsoft để tiếp tục</p>
                <button className="login-btn" onClick={handleLogin}>
                    <LogIn size={20} />
                    Đăng nhập với Microsoft
                </button>
            </div>
        </div>
    );
};

// ============================================
// SOD CARD COMPONENT (Warehouse Discovery)
// ============================================
interface SODCardProps {
    sod: SOD;
    currentRole: UserRole;
    onSubmit: (sod: SOD, data: any) => void;
}

const SODCard: React.FC<SODCardProps> = ({ sod, currentRole, onSubmit }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [inputWarehouseQty, setInputWarehouseQty] = useState('0');
    const [inputOrderQty, setInputOrderQty] = useState(String(sod.qtyOrderRemainingON || 0));
    const [inputActualPickedQty, setInputActualPickedQty] = useState('0');
    const [discrepancyType, setDiscrepancyType] = useState<'INVENTORY' | 'CONVERSION_RATE' | 'SALE_REQUEST' | 'WAREHOUSE_SPEC'>('INVENTORY');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(sod, {
                actualQty: parseFloat(inputWarehouseQty) || 0,
                requestedQty: parseFloat(inputOrderQty) || 0,
                actualPickedQty: parseFloat(inputActualPickedQty) || 0,
                discrepancyType,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = () => {
        if (sod.statusFromPlan === 'Thiếu') {
            return <span className="status-badge shortage">Thiếu hàng</span>;
        }
        if (sod.statusFromPlan === 'Đủ') {
            return <span className="status-badge sufficient">Đủ tồn</span>;
        }
        return <span className="status-badge pending">{sod.statusFromPlan || 'Đang xử lý'}</span>;
    };

    return (
        <div className="sod-card">
            <div className="sod-card-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="sod-info">
                    <div className="sod-icon">
                        <Scale size={20} />
                    </div>
                    <div className="sod-details">
                        <h3>{sod.detailName}</h3>
                        <span className="sod-sku">{sod.product.sku}</span>
                        <p className="sod-product-name">{sod.product.name}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {getStatusBadge()}
                    <ChevronDown
                        size={20}
                        style={{
                            transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                            color: '#9ca3af'
                        }}
                    />
                </div>
            </div>

            {isExpanded && currentRole === UserRole.WAREHOUSE && (
                <div style={{ padding: '1.5rem', background: '#fffbeb' }}>
                    <div className="discovery-card">
                        <div className="discovery-header">
                            <div className="discovery-icon">
                                <Search size={24} />
                            </div>
                            <div>
                                <h4>Báo cáo kiểm đếm thực tế</h4>
                                <p>Sử dụng chức năng này nếu phát hiện sai lệch tồn kho hoặc quy đổi đơn vị.</p>
                            </div>
                        </div>

                        <div className="discovery-inputs">
                            <div className="input-group">
                                <label className="input-label">
                                    <Box size={12} /> Số lượng kho
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={inputWarehouseQty}
                                    onChange={(e) => setInputWarehouseQty(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">
                                    <FileText size={12} /> Số lượng đơn
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={inputOrderQty}
                                    onChange={(e) => setInputOrderQty(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label" style={{ color: '#059669' }}>
                                    <CheckCircle2 size={12} /> Số lượng thực soạn
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    style={{ borderColor: '#6ee7b7' }}
                                    value={inputActualPickedQty}
                                    onChange={(e) => setInputActualPickedQty(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">
                                    <AlertTriangle size={12} /> Loại sai lệch
                                </label>
                                <select
                                    className="input-field"
                                    style={{ fontSize: '0.875rem', cursor: 'pointer' }}
                                    value={discrepancyType}
                                    onChange={(e) => setDiscrepancyType(e.target.value as any)}
                                >
                                    <option value="INVENTORY">Lệch tồn kho vật lý</option>
                                    <option value="CONVERSION_RATE">Lệch tỷ lệ quy đổi</option>
                                    <option value="SALE_REQUEST">Soạn theo yêu cầu của sale</option>
                                    <option value="WAREHOUSE_SPEC">Soạn theo quy cách bán của kho</option>
                                </select>
                            </div>
                        </div>

                        <button
                            className="submit-btn"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 size={20} className="loading-spinner" /> : <BellRing size={20} />}
                            Request Sale
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
const MainApp: React.FC = () => {
    const { instance, accounts } = useMsal();
    const { getAccessToken } = useDataverseAuth();

    const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.WAREHOUSE);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [sods, setSods] = useState<SOD[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const dataverseService = createDataverseService(getAccessToken);

    const userName = accounts[0]?.name || 'User';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const handleLogout = () => {
        instance.logoutPopup();
    };

    // Load customers on mount
    useEffect(() => {
        const loadCustomers = async () => {
            setIsLoading(true);
            setLoadingMessage('Đang tải danh sách khách hàng...');
            try {
                const data = await dataverseService.fetchCustomers();
                setCustomers(data);
            } catch (error) {
                console.error('Failed to load customers:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCustomers();
    }, []);

    // Load orders when customer is selected
    useEffect(() => {
        if (!selectedCustomer) {
            setOrders([]);
            setSelectedOrder(null);
            return;
        }

        const loadOrders = async () => {
            setIsLoading(true);
            setLoadingMessage('Đang tải đơn hàng...');
            try {
                const data = await dataverseService.fetchOrdersByCustomer(selectedCustomer.id);
                setOrders(data);
            } catch (error) {
                console.error('Failed to load orders:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadOrders();
    }, [selectedCustomer]);

    // Load SODs when order is selected
    useEffect(() => {
        if (!selectedOrder) {
            setSods([]);
            return;
        }

        const loadSODs = async () => {
            setIsLoading(true);
            setLoadingMessage('Đang tải chi tiết đơn hàng...');
            try {
                const data = await dataverseService.fetchSODsByOrder(
                    selectedOrder.id,
                    selectedOrder.soNumber,
                    selectedOrder.warehouseLocationId
                );
                setSods(data);
            } catch (error) {
                console.error('Failed to load SODs:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSODs();
    }, [selectedOrder]);

    const handleSODSubmit = (sod: SOD, data: any) => {
        console.log('SOD submitted:', sod, data);
        // TODO: Implement actual submission to Dataverse
        alert(`Đã gửi báo cáo cho ${sod.product.name}\n\nSố lượng kho: ${data.actualQty}\nSố lượng đơn: ${data.requestedQty}\nSL thực soạn: ${data.actualPickedQty}\nLoại: ${data.discrepancyType}`);
    };

    return (
        <div className="app-container">
            {/* Header */}
            <header className="header">
                <div className="header-left">
                    <div className="header-logo">
                        <Package size={24} />
                    </div>
                    <h1>SOD Workflow Optimizer</h1>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <div className="user-avatar">{userInitials}</div>
                        <span className="user-name">{userName}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        Đăng xuất
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                {/* Role Selector */}
                <div className="role-selector">
                    <button
                        className={`role-btn ${currentRole === UserRole.SALE ? 'active' : ''}`}
                        onClick={() => setCurrentRole(UserRole.SALE)}
                    >
                        <User size={16} style={{ marginRight: '0.5rem' }} />
                        Sale
                    </button>
                    <button
                        className={`role-btn ${currentRole === UserRole.SOURCE ? 'active' : ''}`}
                        onClick={() => setCurrentRole(UserRole.SOURCE)}
                    >
                        <Building2 size={16} style={{ marginRight: '0.5rem' }} />
                        Source
                    </button>
                    <button
                        className={`role-btn ${currentRole === UserRole.WAREHOUSE ? 'active' : ''}`}
                        onClick={() => setCurrentRole(UserRole.WAREHOUSE)}
                    >
                        <Truck size={16} style={{ marginRight: '0.5rem' }} />
                        Warehouse
                    </button>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-body">
                        <div className="grid-2">
                            <div className="select-wrapper">
                                <label className="select-label">Khách hàng</label>
                                <select
                                    className="select-input"
                                    value={selectedCustomer?.id || ''}
                                    onChange={(e) => {
                                        const customer = customers.find(c => c.id === e.target.value);
                                        setSelectedCustomer(customer || null);
                                        setSelectedOrder(null);
                                    }}
                                >
                                    <option value="">-- Chọn khách hàng --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="select-wrapper">
                                <label className="select-label">Đơn hàng</label>
                                <select
                                    className="select-input"
                                    value={selectedOrder?.id || ''}
                                    onChange={(e) => {
                                        const order = orders.find(o => o.id === e.target.value);
                                        setSelectedOrder(order || null);
                                    }}
                                    disabled={!selectedCustomer}
                                >
                                    <option value="">-- Chọn đơn hàng --</option>
                                    {orders.map(o => (
                                        <option key={o.id} value={o.id}>
                                            {o.soNumber} ({o.sodCount || 0} sản phẩm)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">{loadingMessage}</p>
                    </div>
                )}

                {/* SOD List */}
                {!isLoading && sods.length > 0 && (
                    <div className="card">
                        <div className="card-header">
                            <h2>Chi tiết đơn hàng ({sods.length} sản phẩm)</h2>
                        </div>
                        <div className="card-body">
                            <div className="sod-list">
                                {sods.map(sod => (
                                    <SODCard
                                        key={sod.id}
                                        sod={sod}
                                        currentRole={currentRole}
                                        onSubmit={handleSODSubmit}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && selectedOrder && sods.length === 0 && (
                    <div className="loading-container">
                        <Package size={48} style={{ color: '#9ca3af' }} />
                        <p className="loading-text">Không có chi tiết đơn hàng nào</p>
                    </div>
                )}
            </main>
        </div>
    );
};

// ============================================
// ROOT APP COMPONENT
// ============================================
const App: React.FC = () => {
    const isAuthenticated = useIsAuthenticated();

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return <MainApp />;
};

export default App;
