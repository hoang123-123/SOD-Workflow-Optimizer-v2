
import React, { useState } from 'react';
import {
    X, UserCircle2, Factory, Warehouse, ArrowRight, MonitorPlay, Zap,
    Info, Calculator, ListTree, BellRing, HelpCircle, BookOpen,
    CheckCircle2, AlertTriangle, AlertOctagon, RotateCw, Ban, Truck
} from 'lucide-react';
import { BUSINESS_RULES } from '../logic/rules';
import { UserRole } from '../types';

interface WorkflowGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<string>('GUIDE_OVERVIEW');

    if (!isOpen) return null;

    const MENU_GROUPS = [
        {
            title: "HƯỚNG DẪN THAO TÁC",
            items: [
                { id: 'GUIDE_OVERVIEW', label: 'Tổng quan quy trình', icon: HelpCircle },
                { id: 'GUIDE_SALE', label: 'Sale', icon: UserCircle2 },
                { id: 'GUIDE_SOURCE', label: 'Source', icon: Factory },
                { id: 'GUIDE_WAREHOUSE', label: 'Kho', icon: Warehouse },
            ]
        },
        {
            title: "LOGIC & CƠ CHẾ",
            items: [
                { id: 'LOGIC_GLOSSARY', label: 'Ký hiệu & Biến số', icon: Calculator },
                { id: 'LOGIC_CASE_A', label: 'Case A (Lần đầu)', icon: ListTree },
                { id: 'LOGIC_CASE_B', label: 'Case B (Lần sau)', icon: ListTree },
                { id: 'LOGIC_EXCEPTION', label: 'Các ngoại lệ', icon: AlertOctagon },
            ]
        }
    ];

    const getRulesByTab = (tabId: string) => {
        switch (tabId) {
            case 'LOGIC_CASE_A': return BUSINESS_RULES.filter(r => r.group === 'CASE A (Lần đầu K=1)');
            case 'LOGIC_CASE_B': return BUSINESS_RULES.filter(r => r.group === 'CASE B (Lần sau K>1)');
            case 'LOGIC_EXCEPTION': return BUSINESS_RULES.filter(r => r.group === 'EXCEPTION');
            default: return [];
        }
    };

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case UserRole.SALE: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case UserRole.SOURCE: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case UserRole.WAREHOUSE: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case UserRole.SALE: return UserCircle2;
            case UserRole.SOURCE: return Factory;
            case UserRole.WAREHOUSE: return Warehouse;
            default: return Info;
        }
    }

    const renderGuideContent = () => {
        switch (activeTab) {
            case 'GUIDE_OVERVIEW':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <section className="bg-indigo-500/5 p-8 rounded-2xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <HelpCircle className="w-32 h-32" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-3 uppercase tracking-tight">
                                <HelpCircle className="w-6 h-6 text-indigo-400" />
                                Giới thiệu chung
                            </h3>
                            <p className="text-slate-300 leading-relaxed text-sm font-medium">
                                Hệ thống quản lý dòng hàng thiếu hụt (Shortage Management) giúp các bộ phận phối hợp xử lý tình huống khi tồn kho không đủ đáp ứng đơn hàng.
                                <br /><br />
                                Thay vì trao đổi rời rạc, mọi quyết định được ghi nhận tập trung tại đây để đảm bảo tính nhất quán và tự động hóa quy trình.
                            </p>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl hover:border-indigo-500/30 transition-all group">
                                <div className="flex items-center gap-3 mb-3 font-black text-indigo-400 uppercase tracking-widest text-[10px]">
                                    <UserCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> Sale
                                </div>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">Quyết định phương án với khách hàng: Giao ngay, Chờ hàng, hoặc Chốt đơn.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl hover:border-amber-500/30 transition-all group">
                                <div className="flex items-center gap-3 mb-3 font-black text-amber-400 uppercase tracking-widest text-[10px]">
                                    <Factory className="w-5 h-5 group-hover:scale-110 transition-transform" /> Source
                                </div>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">Xác nhận ngày hàng về (ETA) và nguồn cung nếu Sale chọn phương án "Chờ hàng".</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl hover:border-blue-500/30 transition-all group">
                                <div className="flex items-center gap-3 mb-3 font-black text-blue-400 uppercase tracking-widest text-[10px]">
                                    <Warehouse className="w-5 h-5 group-hover:scale-110 transition-transform" /> Kho (Logistics)
                                </div>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">Thực hiện xuất kho thực tế hoặc báo cáo sự cố sai lệch tồn kho cho Sale.</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-slate-500 mb-6 uppercase tracking-widest border-b border-slate-800 pb-3">Luồng quy trình cơ bản</h3>
                            <div className="flex flex-col md:flex-row items-center gap-4 text-sm bg-slate-900/50 p-8 rounded-2xl border border-slate-800 justify-center">
                                <div className="text-center group">
                                    <span className="block font-black text-slate-300 bg-slate-800 px-4 py-2 rounded-xl shadow-lg border border-slate-700 mb-1 group-hover:border-indigo-500/50 transition-all">1. Phát sinh thiếu</span>
                                </div>
                                <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 md:rotate-0" />
                                <div className="text-center group">
                                    <span className="block font-black text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl shadow-lg border border-indigo-500/20 mb-1 group-hover:scale-105 transition-all">2. Sale chốt phương án</span>
                                </div>
                                <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 md:rotate-0" />
                                <div className="text-center group">
                                    <span className="block font-black text-slate-300 bg-slate-800 px-4 py-2 rounded-xl shadow-lg border border-slate-700 mb-1 group-hover:border-indigo-500/50 transition-all">3. Source/Kho thực hiện</span>
                                </div>
                                <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 md:rotate-0" />
                                <div className="text-center group">
                                    <span className="block font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl shadow-lg border border-emerald-500/20 mb-1 group-hover:scale-105 transition-all">4. Hoàn tất</span>
                                </div>
                            </div>
                        </section>
                    </div>
                );

            case 'GUIDE_SALE':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-6 mb-2">
                            <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-xl border border-indigo-500/20">
                                <UserCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Hướng dẫn dành cho Sale</h3>
                                <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Người ra quyết định chính</p>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="bg-indigo-500/10 px-6 py-4 border-b border-slate-800 font-black text-indigo-300 text-[10px] uppercase tracking-widest">
                                Chi tiết các tình huống xử lý
                            </div>
                            <div className="divide-y divide-slate-800">
                                {/* CASE 1: GIAO NGAY */}
                                <div className="p-8 hover:bg-slate-800/30 transition-colors">
                                    <h4 className="font-black text-white text-lg mb-3 flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg"><Truck className="w-6 h-6 text-indigo-400" /></div>
                                        1. Giao ngay / Giao 1 phần (Ship Partial)
                                    </h4>
                                    <div className="ml-12 space-y-4">
                                        <p className="text-sm text-slate-400 font-medium">
                                            <span className="text-indigo-400 font-black uppercase text-[10px] tracking-widest block mb-1">Khi nào dùng?</span>
                                            Khi trong kho có sẵn một lượng hàng (dù chưa đủ) và khách đồng ý nhận trước phần này.
                                        </p>
                                        <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10 text-sm">
                                            <div className="font-black text-indigo-300 mb-2 uppercase text-[10px] tracking-widest">Điều gì xảy ra tiếp theo?</div>
                                            <ul className="list-disc list-inside text-slate-300 space-y-2 font-medium">
                                                <li>Lệnh xuất kho được gửi xuống bộ phận Kho.</li>
                                                <li>Sau khi Kho xác nhận xuất xong, số lượng tồn kho sẽ bị trừ.</li>
                                                <li><span className="text-indigo-400 font-black">Quan trọng:</span> Phần thiếu còn lại sẽ được hệ thống treo lại để xử lý ở lần bổ sung tiếp theo (Case B).</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                {/* CASE 2: CHỜ HÀNG */}
                                <div className="p-8 hover:bg-slate-800/30 transition-colors">
                                    <h4 className="font-black text-white text-lg mb-3 flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg"><RotateCw className="w-6 h-6 text-amber-400" /></div>
                                        2. Chờ hàng (Wait All / Backorder)
                                    </h4>
                                    <div className="ml-12 space-y-4">
                                        <p className="text-sm text-slate-400 font-medium">
                                            <span className="text-amber-400 font-black uppercase text-[10px] tracking-widest block mb-1">Khi nào dùng?</span>
                                            Khi khách hàng muốn gom đủ hàng mới giao, hoặc khi kho đã hết sạch hàng.
                                        </p>
                                        <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/10 text-sm">
                                            <div className="font-black text-amber-300 mb-2 uppercase text-[10px] tracking-widest">Điều gì xảy ra tiếp theo?</div>
                                            <ul className="list-disc list-inside text-slate-300 space-y-2 font-medium">
                                                <li>Trạng thái đơn hàng chuyển sang <strong className="text-amber-400">"Chờ Source xử lý"</strong>.</li>
                                                <li>Source sẽ điền ngày hàng về (ETA).</li>
                                                <li>Khi Source xác nhận xong, Sale sẽ nhận được thông báo để cập nhật cho khách hàng.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                {/* CASE 3: HỦY ĐƠN */}
                                <div className="p-8 hover:bg-slate-800/30 transition-colors">
                                    <h4 className="font-black text-white text-lg mb-3 flex items-center gap-3">
                                        <div className="p-2 bg-red-500/20 rounded-lg"><Ban className="w-6 h-6 text-red-400" /></div>
                                        3. Chốt đơn / Hủy phần thiếu (Cancel)
                                    </h4>
                                    <div className="ml-12 space-y-4">
                                        <p className="text-sm text-slate-400 font-medium">
                                            <span className="text-red-400 font-black uppercase text-[10px] tracking-widest block mb-1">Khi nào dùng?</span>
                                            Khi khách hàng không muốn chờ và quyết định hủy phần hàng còn thiếu.
                                        </p>
                                        <div className="bg-red-500/5 p-5 rounded-2xl border border-red-500/10 text-sm">
                                            <div className="font-black text-red-300 mb-2 uppercase text-[10px] tracking-widest">Điều gì xảy ra tiếp theo?</div>
                                            <ul className="list-disc list-inside text-slate-300 space-y-2 font-medium">
                                                <li>Nếu chưa giao gì: Dòng hàng bị hủy hoàn toàn.</li>
                                                <li>Nếu đã giao 1 phần: Hệ thống sẽ chốt số lượng thực tế đã giao và đóng dòng hàng lại.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'GUIDE_SOURCE':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-6 mb-2">
                            <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-400 shadow-xl border border-amber-500/20">
                                <Factory className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Hướng dẫn dành cho Source</h3>
                                <p className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">Quản lý nguồn hàng</p>
                            </div>
                        </div>

                        <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-slate-300 text-sm font-medium leading-relaxed shadow-xl">
                            Nhiệm vụ của Source là phản hồi thông tin <strong className="text-amber-400">Ngày hàng về (ETA)</strong> khi Sale chọn phương án "Chờ hàng".
                        </div>

                        <div className="space-y-4">
                            {[
                                { step: 1, title: "Nhận thông báo", desc: "Khi Sale chọn 'Chờ hàng', trạng thái đơn hàng sẽ chuyển sang 'Chờ Source Xử Lý'." },
                                { step: 2, title: "Cập nhật kế hoạch", desc: "Nhập Ngày dự kiến (ETA) và Nguồn cung cấp vào form trên giao diện." },
                                { step: 3, title: "Xác nhận", desc: "Nhấn nút 'Xác nhận Kế hoạch'. Hệ thống sẽ tự động báo lại cho Sale." }
                            ].map(item => (
                                <div key={item.step} className="flex gap-6 p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl hover:border-amber-500/30 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-black text-lg shadow-inner group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0">{item.step}</div>
                                    <div>
                                        <h4 className="font-black text-white uppercase tracking-widest text-[10px] mb-1">{item.title}</h4>
                                        <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'GUIDE_WAREHOUSE':
                return (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-6 mb-2">
                            <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400 shadow-xl border border-blue-500/20">
                                <Warehouse className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Hướng dẫn dành cho Kho</h3>
                                <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Vận hành Logistics</p>
                            </div>
                        </div>

                        <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/20 text-slate-300 text-sm font-medium leading-relaxed shadow-xl">
                            Kho chỉ tham gia xử lý khi Sale chọn phương án <strong className="text-blue-400">"Giao ngay"</strong> hoặc khi cần kiểm đếm thực tế.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="border border-slate-800 bg-slate-900 rounded-2xl p-8 shadow-xl hover:border-emerald-500/30 transition-all group">
                                <h4 className="font-black text-emerald-400 uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> Xác nhận Xuất
                                </h4>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    Chọn khi hàng hóa thực tế trong kho <strong>đủ điều kiện</strong> và đã được soạn xong theo yêu cầu của Sale.
                                </p>
                                <div className="mt-4 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/10 text-center">
                                    Tự động trừ tồn kho & Hoàn tất
                                </div>
                            </div>

                            <div className="border border-slate-800 bg-slate-900 rounded-2xl p-8 shadow-xl hover:border-red-500/30 transition-all group">
                                <h4 className="font-black text-red-400 uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Từ chối / Báo lỗi
                                </h4>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    Chọn khi hàng trên hệ thống có nhưng thực tế <strong>bị hỏng, thất lạc, hoặc sai lệch</strong>.
                                </p>
                                <div className="mt-4 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 p-3 rounded-xl border border-red-500/10 text-center">
                                    Bắt buộc nhập lý do báo lỗi
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <AlertOctagon className="w-32 h-32" />
                            </div>
                            <h4 className="font-black text-amber-400 uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                                <AlertOctagon className="w-5 h-5" /> Chức năng Kiểm đếm (Warehouse Request)
                            </h4>
                            <p className="text-sm text-slate-300 font-medium mb-0 leading-relaxed">
                                Khi phát hiện số liệu hệ thống sai lệch (ví dụ: Hệ thống báo có 10, thực tế chỉ có 5), Kho có thể chủ động nhập số lượng thực tế và gửi <strong>"Request Sale"</strong>. Sale sẽ nhận được cảnh báo và điều chỉnh lại đơn hàng.
                            </p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };


    const renderLogicContent = () => {
        if (activeTab === 'LOGIC_GLOSSARY') {
            return (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8">
                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                            <Calculator className="w-6 h-6 text-indigo-400" />
                            Các biến số quan trọng
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 shadow-inner group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform">N</div>
                                    <div>
                                        <div className="font-black text-white uppercase tracking-widest text-[10px]">Nhu cầu (Net Need)</div>
                                        <div className="text-xs text-indigo-400 font-black font-mono">N = QtyOrdered - QtyDelivered</div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    Số lượng sản phẩm khách hàng <strong>thực sự còn cần</strong> tại thời điểm hiện tại.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-inner group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform">L</div>
                                    <div>
                                        <div className="font-black text-white uppercase tracking-widest text-[10px]">Tồn kho (Logistics)</div>
                                        <div className="text-xs text-emerald-400 font-black font-mono">L = QtyAvailable</div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    Số lượng tồn kho <strong>khả dụng thực tế</strong> có thể dùng để giao ngay lập tức.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 shadow-inner group">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-xl shadow-lg group-hover:scale-110 transition-transform">K</div>
                                    <div>
                                        <div className="font-black text-white uppercase tracking-widest text-[10px]">Lần giao (Sequence)</div>
                                        <div className="text-xs text-amber-400 font-black font-mono">K = DeliveryCount + 1</div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium italic">
                                    • <strong className="text-white">K=1 (Case A):</strong> Xử lý lần đầu tiên.<br />
                                    • <strong className="text-white">K&gt;1 (Case B):</strong> Xử lý các lần bổ sung tiếp theo.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8">
                        <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                            <MonitorPlay className="w-6 h-6 text-indigo-400" />
                            Bảng tóm tắt Logic
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-800">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-950 text-slate-500 uppercase font-black text-[10px] tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Tình huống</th>
                                        <th className="px-6 py-4">Điều kiện Logic</th>
                                        <th className="px-6 py-4">Ý nghĩa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                                    <tr>
                                        <td className="px-6 py-5 font-black text-indigo-400 uppercase tracking-tight">Shortage (Thiếu)</td>
                                        <td className="px-6 py-5 font-black font-mono text-white text-base">N &gt; L</td>
                                        <td className="px-6 py-5 text-slate-400 font-medium">Nhu cầu lớn hơn tồn kho. Cần Sale quyết định.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-5 font-black text-emerald-400 uppercase tracking-tight">Sufficient (Đủ)</td>
                                        <td className="px-6 py-5 font-black font-mono text-white text-base">N &le; L</td>
                                        <td className="px-6 py-5 text-slate-400 font-medium">Đủ hàng. Hệ thống tự động chuyển trạng thái OK.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        const rules = getRulesByTab(activeTab);
        return (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                {rules.map((rule) => {
                    const ActorIcon = getRoleIcon(rule.actor);
                    const TargetIcon = getRoleIcon(rule.output.targetRole);

                    return (
                        <div key={rule.id} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
                            <div className="bg-slate-950 px-8 py-5 border-b border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-indigo-500 text-slate-950 shadow-lg tracking-widest">{rule.id}</span>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">{rule.name}</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-50">{rule.description}</span>
                            </div>

                            <div className="p-8">
                                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                                    <div className="flex-1 bg-slate-800/20 rounded-2xl p-6 border border-slate-800 relative group">
                                        <div className="absolute -top-3 left-6 bg-slate-900 border border-slate-800 px-3 py-0.5 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-lg">Step 1: Input</div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black mb-4 uppercase tracking-widest border ${getRoleColor(rule.actor)}`}>
                                            <ActorIcon className="w-4 h-4" /> {rule.actor}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></div>
                                                <p className="text-sm text-slate-300 font-bold leading-tight"><strong>Hành động:</strong> {rule.input.actionName}</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-2 shrink-0"></div>
                                                <p className="text-xs text-slate-500 italic font-medium">Điều kiện: {rule.input.condition}</p>
                                            </div>
                                        </div>
                                        <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="w-6 h-6 text-indigo-500" />
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/10 relative group">
                                        <div className="absolute -top-3 left-6 bg-slate-900 border border-slate-800 px-3 py-0.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest rounded-lg">Step 2: System</div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black mb-4 uppercase tracking-widest bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                            <MonitorPlay className="w-4 h-4" /> SYSTEM
                                        </div>
                                        <div className="space-y-4">
                                            {rule.process.notificationTag && (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-black text-indigo-500/50 uppercase tracking-widest">Notification Alert:</span>
                                                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-indigo-500/10 border-indigo-500/20 text-indigo-300">
                                                        <BellRing className="w-4 h-4" />
                                                        <span className="text-xs font-black font-mono tracking-wider">{rule.process.notificationTag}</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="text-sm text-slate-300 font-medium leading-relaxed italic border-t border-indigo-500/10 pt-4">
                                                <strong className="text-indigo-400 block mb-1 uppercase text-[9px] font-black tracking-widest">Processing Logic:</strong> {rule.process.logicDesc}
                                            </div>
                                        </div>
                                        <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="w-6 h-6 text-indigo-500" />
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/10 relative group">
                                        <div className="absolute -top-3 left-6 bg-slate-900 border border-slate-800 px-3 py-0.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest rounded-lg">Step 3: Output</div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black mb-4 uppercase tracking-widest border ${getRoleColor(rule.output.targetRole)}`}>
                                            <TargetIcon className="w-4 h-4" /> {rule.output.targetRole}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/10 shadow-inner">
                                                <p className="text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest">Interface Result (UI)</p>
                                                <p className="text-sm text-emerald-300 font-bold leading-tight">{rule.output.uiDescription}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-950 rounded-[2.5rem] shadow-[0_0_100px_-20px_rgba(79,70,229,0.3)] w-full max-w-[95vw] xl:max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-slate-800">

                <div className="flex items-center justify-between p-8 border-b border-slate-800 bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-indigo-500 rounded-2xl text-slate-950 shadow-2xl shadow-indigo-500/50">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Workflow Blueprint</h2>
                            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">Hệ thống quản lý dòng hàng thiếu hụt v2.0</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 text-slate-400 hover:text-white transition-all">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <div className="w-64 bg-slate-900/30 border-r border-slate-800 p-6 space-y-8 overflow-y-auto hidden md:block shrink-0">
                        {MENU_GROUPS.map((group) => (
                            <div key={group.title}>
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">
                                    {group.title}
                                </div>
                                <div className="space-y-2">
                                    {group.items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full text-left px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border ${activeTab === item.id
                                                    ? 'bg-indigo-500 text-slate-950 shadow-xl shadow-indigo-500/20 border-indigo-500 scale-[1.02]'
                                                    : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300 border-transparent'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-slate-950' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-12 bg-slate-950 custom-scrollbar">
                        {activeTab.startsWith('GUIDE_') ? renderGuideContent() : renderLogicContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};
