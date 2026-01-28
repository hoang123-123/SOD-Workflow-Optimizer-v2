
import React, { useState } from 'react';
import { X, BookOpen, UserCircle2, Factory, Warehouse, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Truck, RotateCw, Ban } from 'lucide-react';

interface UserManualProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserManual: React.FC<UserManualProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALE' | 'SOURCE' | 'WAREHOUSE'>('OVERVIEW');

    const tabs = [
        { id: 'OVERVIEW', label: 'TỔNG QUAN', icon: HelpCircle },
        { id: 'SALE', label: 'DÀNH CHO SALE', icon: UserCircle2 },
        { id: 'SOURCE', label: 'DÀNH CHO SOURCE', icon: Factory },
        { id: 'WAREHOUSE', label: 'DÀNH CHO KHO', icon: Warehouse },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-slate-950 rounded-[2.5rem] shadow-[0_0_100px_-20px_rgba(79,70,229,0.3)] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-800">

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-indigo-500 rounded-2xl text-slate-950 shadow-2xl shadow-indigo-500/50">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">User Manual</h2>
                            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">Shortage Management Workflow v2.0</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 text-slate-400 hover:text-white transition-all">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Body Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-72 bg-slate-900/30 border-r border-slate-800 p-6 space-y-2 hidden md:block overflow-y-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${activeTab === tab.id
                                        ? 'bg-indigo-500 text-slate-950 shadow-xl shadow-indigo-500/20 border-indigo-500 scale-[1.02]'
                                        : 'text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300'
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-slate-950' : 'text-slate-600'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-12 bg-slate-950 custom-scrollbar">

                        {/* OVERVIEW CONTENT */}
                        {activeTab === 'OVERVIEW' && (
                            <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                                <section className="bg-indigo-500/5 p-8 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                                    <h3 className="text-xl font-black text-white mb-4 flex items-center gap-3 uppercase tracking-tight">
                                        <HelpCircle className="w-6 h-6 text-indigo-400" />
                                        Giới thiệu chung
                                    </h3>
                                    <p className="text-slate-300 leading-relaxed text-sm font-medium">
                                        Ứng dụng này giúp các bộ phận phối hợp xử lý các dòng hàng bị thiếu hụt (Shortage) trong đơn hàng.
                                        Thay vì trao đổi qua Email/Chat rời rạc, mọi quyết định được ghi nhận trực tiếp tại đây để đảm bảo tính nhất quán.
                                    </p>
                                </section>

                                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl group">
                                        <div className="flex items-center gap-3 mb-3 font-black text-indigo-400 uppercase tracking-widest text-[10px]">
                                            <UserCircle2 className="w-5 h-5" /> Sale
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Quyết định phương án với khách hàng: Giao ngay, Chờ hàng, hoặc Chốt đơn.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl group">
                                        <div className="flex items-center gap-3 mb-3 font-black text-amber-400 uppercase tracking-widest text-[10px]">
                                            <Factory className="w-5 h-5" /> Source
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Xác nhận ngày hàng về (ETA) nếu Sale chọn phương án "Chờ hàng".</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl group">
                                        <div className="flex items-center gap-3 mb-3 font-black text-blue-400 uppercase tracking-widest text-[10px]">
                                            <Warehouse className="w-5 h-5" /> Kho (Logistics)
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Thực hiện xuất kho hoặc báo cáo sự cố nếu Sale chọn "Giao ngay".</p>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-[10px] font-black text-slate-600 mb-6 uppercase tracking-[0.2em] border-b border-slate-800 pb-3">Quy trình cơ bản</h3>
                                    <div className="flex flex-col md:flex-row items-center gap-4 text-sm bg-slate-900/50 p-8 rounded-2xl border border-slate-800 justify-center">
                                        <span className="font-black text-slate-300 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">1. Phát sinh thiếu</span>
                                        <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 md:rotate-0" />
                                        <span className="font-black text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">2. Sale chốt phương án</span>
                                        <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 md:rotate-0" />
                                        <span className="font-black text-slate-300 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">3. Source/Kho thực hiện</span>
                                        <ArrowRight className="w-6 h-6 text-slate-700 rotate-90 md:rotate-0" />
                                        <span className="font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">4. Hoàn tất</span>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* SALE CONTENT */}
                        {activeTab === 'SALE' && (
                            <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400">
                                        <UserCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Hướng dẫn dành cho Sale</h3>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                                    <div className="bg-indigo-500/10 px-8 py-4 border-b border-slate-800 font-black text-indigo-300 text-[10px] uppercase tracking-widest">
                                        Các tùy chọn xử lý
                                    </div>
                                    <div className="divide-y divide-slate-800">
                                        <div className="p-8 hover:bg-slate-800/30 transition-all group">
                                            <h4 className="font-black text-white text-lg mb-2 flex items-center gap-3">
                                                <Truck className="w-5 h-5 text-indigo-400" /> 1. Giao ngay (Ship Partial)
                                            </h4>
                                            <p className="text-sm text-slate-400 mb-4 font-medium leading-relaxed">Chọn khi khách hàng đồng ý nhận trước số lượng đang có trong kho.</p>
                                            <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 w-fit px-4 py-2 rounded-xl uppercase tracking-widest">
                                                <ArrowRight className="w-3.5 h-3.5" /> Gửi yêu cầu xuống bộ phận Kho
                                            </div>
                                        </div>
                                        <div className="p-8 hover:bg-slate-800/30 transition-all group">
                                            <h4 className="font-black text-white text-lg mb-2 flex items-center gap-3">
                                                <RotateCw className="w-5 h-5 text-amber-400" /> 2. Chờ hàng (Bổ sung sau)
                                            </h4>
                                            <p className="text-sm text-slate-400 mb-4 font-medium leading-relaxed">Chọn khi khách hàng muốn chờ hàng về rồi giao một thể.</p>
                                            <div className="flex items-center gap-3 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 w-fit px-4 py-2 rounded-xl uppercase tracking-widest">
                                                <ArrowRight className="w-3.5 h-3.5" /> Chuyển Source xác nhận Ngày hàng về (ETA)
                                            </div>
                                        </div>
                                        <div className="p-8 hover:bg-slate-800/30 transition-all group">
                                            <h4 className="font-black text-white text-lg mb-2 flex items-center gap-3">
                                                <Ban className="w-5 h-5 text-red-400" /> 3. Chốt đơn (Hủy phần thiếu)
                                            </h4>
                                            <p className="text-sm text-slate-400 mb-4 font-medium leading-relaxed">Chọn khi khách hàng không muốn mua sản phẩm này nữa hoặc không muốn chờ.</p>
                                            <div className="flex items-center gap-3 text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 w-fit px-4 py-2 rounded-xl uppercase tracking-widest">
                                                <ArrowRight className="w-3.5 h-3.5" /> Đóng dòng hàng và cập nhật kết quả
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SOURCE CONTENT */}
                        {activeTab === 'SOURCE' && (
                            <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-400">
                                        <Factory className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Hướng dẫn dành cho Source</h3>
                                </div>

                                <div className="p-8 bg-amber-500/5 rounded-3xl border border-amber-500/20 text-slate-300 text-sm font-medium leading-relaxed shadow-xl">
                                    Nhiệm vụ của Source là phản hồi thông tin <strong className="text-amber-400">Ngày hàng về (ETA)</strong> khi Sale chọn phương án "Chờ hàng".
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { step: 1, title: "Nhận thông báo", desc: "Khi Sale chọn 'Chờ hàng', đơn hàng chuyển sang 'Chờ Source Xử Lý'." },
                                        { step: 2, title: "Cập nhật kế hoạch", desc: "Nhập Ngày dự kiến (ETA) và Nguồn cung cấp vào form." },
                                        { step: 3, title: "Xác nhận", desc: "Hệ thống tự động thông báo lại cho Sale sau khi bạn nhấn OK." }
                                    ].map(item => (
                                        <div key={item.step} className="flex gap-6 p-6 bg-slate-900 rounded-2xl border border-slate-800 group hover:border-amber-500/30 transition-all">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-black text-lg shadow-inner group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                                                {item.step}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-white uppercase tracking-widest text-[10px] mb-1">{item.title}</h4>
                                                <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* WAREHOUSE CONTENT */}
                        {activeTab === 'WAREHOUSE' && (
                            <div className="space-y-10 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400">
                                        <Warehouse className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Hướng dẫn dành cho Kho</h3>
                                </div>

                                <div className="p-8 bg-blue-500/5 rounded-3xl border border-blue-500/20 text-slate-300 text-sm font-medium leading-relaxed shadow-xl">
                                    Kho chỉ tham gia xử lý khi Sale chọn phương án <strong className="text-blue-400">"Giao ngay (Ship Partial)"</strong>.
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="border border-slate-800 rounded-2xl p-8 bg-slate-900 group hover:border-emerald-500/30 transition-all">
                                        <h4 className="font-black text-emerald-400 uppercase tracking-widest text-[10px] mb-4 flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5" /> Xác nhận Xuất
                                        </h4>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Chọn khi hàng hóa thực tế đủ điều kiện và đã soạn xong. Hệ thống sẽ trừ tồn thực tế.
                                        </p>
                                    </div>
                                    <div className="border border-slate-800 rounded-2xl p-8 bg-slate-900 group hover:border-red-500/30 transition-all">
                                        <h4 className="font-black text-red-400 uppercase tracking-widest text-[10px] mb-4 flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5" /> Từ chối Xuất
                                        </h4>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Chọn khi hàng bị hỏng, thất lạc. <strong>Bắt buộc nhập lý do</strong> để báo cáo Sale.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
