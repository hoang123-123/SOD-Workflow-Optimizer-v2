
import React, { useState } from 'react';
import { X, BookOpen, UserCircle2, Factory, Warehouse, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';

interface UserManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManual: React.FC<UserManualProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALE' | 'SOURCE' | 'WAREHOUSE'>('OVERVIEW');

  const tabs = [
      { id: 'OVERVIEW', label: 'Tổng quan', icon: HelpCircle },
      { id: 'SALE', label: 'Dành cho Sale', icon: UserCircle2 },
      { id: 'SOURCE', label: 'Dành cho Source', icon: Factory },
      { id: 'WAREHOUSE', label: 'Dành cho Kho', icon: Warehouse },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
                <BookOpen className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-800">Hướng dẫn sử dụng</h2>
                <p className="text-sm text-gray-500">Quy trình xử lý đơn hàng thiếu hụt (Shortage Management)</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-2 hidden md:block overflow-y-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeTab === tab.id 
                            ? 'bg-white text-blue-600 shadow-md border border-gray-100 ring-1 ring-black/5' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                
                {/* OVERVIEW CONTENT */}
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-blue-500" />
                                Giới thiệu chung
                            </h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                Ứng dụng này giúp các bộ phận phối hợp xử lý các dòng hàng bị thiếu hụt (Shortage) trong đơn hàng. 
                                Thay vì trao đổi qua Email/Chat rời rạc, mọi quyết định được ghi nhận trực tiếp tại đây để đảm bảo tính nhất quán.
                            </p>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                                <div className="flex items-center gap-2 mb-2 font-bold text-indigo-700">
                                    <UserCircle2 className="w-4 h-4" /> Sale
                                </div>
                                <p className="text-xs text-indigo-600">Quyết định phương án với khách hàng: Giao ngay, Chờ hàng, hoặc Chốt đơn.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                                <div className="flex items-center gap-2 mb-2 font-bold text-amber-700">
                                    <Factory className="w-4 h-4" /> Source
                                </div>
                                <p className="text-xs text-amber-600">Xác nhận ngày hàng về (ETA) nếu Sale chọn phương án "Chờ hàng".</p>
                            </div>
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2 font-bold text-blue-700">
                                    <Warehouse className="w-4 h-4" /> Kho (Logistics)
                                </div>
                                <p className="text-xs text-blue-600">Thực hiện xuất kho hoặc báo cáo sự cố nếu Sale chọn "Giao ngay".</p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Quy trình cơ bản</h3>
                            <div className="flex flex-col md:flex-row items-center gap-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <span className="font-semibold text-gray-800">1. Phát sinh thiếu</span>
                                <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 md:rotate-0" />
                                <span className="font-semibold text-indigo-600">2. Sale chốt phương án</span>
                                <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 md:rotate-0" />
                                <span className="font-semibold text-gray-800">3. Source/Kho thực hiện</span>
                                <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 md:rotate-0" />
                                <span className="font-semibold text-emerald-600">4. Hoàn tất</span>
                            </div>
                        </section>
                    </div>
                )}

                {/* SALE CONTENT */}
                {activeTab === 'SALE' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <UserCircle2 className="w-6 h-6" />
                             </div>
                             <h3 className="text-xl font-bold text-indigo-900">Hướng dẫn dành cho Sale</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-indigo-100 rounded-lg overflow-hidden">
                                <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 font-semibold text-indigo-800 text-sm">
                                    Các tùy chọn xử lý
                                </div>
                                <div className="divide-y divide-gray-100">
                                    <div className="p-4 hover:bg-gray-50">
                                        <h4 className="font-bold text-gray-800 text-sm mb-1">1. Giao ngay / Xác nhận giao (Ship Partial)</h4>
                                        <p className="text-sm text-gray-600 mb-2">Chọn khi khách hàng đồng ý nhận trước số lượng đang có trong kho.</p>
                                        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 w-fit px-2 py-1 rounded">
                                            <ArrowRight className="w-3 h-3" /> Hệ thống sẽ gửi yêu cầu xuống Kho để xuất hàng ngay.
                                        </div>
                                    </div>
                                    <div className="p-4 hover:bg-gray-50">
                                        <h4 className="font-bold text-gray-800 text-sm mb-1">2. Chờ hàng (Bổ sung sau)</h4>
                                        <p className="text-sm text-gray-600 mb-2">Chọn khi khách hàng muốn chờ hàng về rồi giao một thể.</p>
                                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded">
                                            <ArrowRight className="w-3 h-3" /> Hệ thống chuyển yêu cầu sang bộ phận Nguồn hàng (Source) để xác nhận ETA.
                                        </div>
                                    </div>
                                    <div className="p-4 hover:bg-gray-50">
                                        <h4 className="font-bold text-gray-800 text-sm mb-1">3. Chốt đơn (Hủy phần thiếu)</h4>
                                        <p className="text-sm text-gray-600 mb-2">Chọn khi khách hàng không muốn mua sản phẩm này nữa hoặc không muốn chờ.</p>
                                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 w-fit px-2 py-1 rounded">
                                            <ArrowRight className="w-3 h-3" /> Đơn hàng sẽ chốt số lượng thực tế và đóng lại.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SOURCE CONTENT */}
                {activeTab === 'SOURCE' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <Factory className="w-6 h-6" />
                             </div>
                             <h3 className="text-xl font-bold text-amber-900">Hướng dẫn dành cho Source</h3>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-sm leading-relaxed">
                            Nhiệm vụ của Source là phản hồi thông tin <strong>Ngày hàng về (ETA)</strong> khi Sale chọn phương án "Chờ hàng".
                        </div>

                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="mt-1 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">Nhận thông báo</h4>
                                    <p className="text-sm text-gray-600">Khi Sale chọn "Chờ hàng", trạng thái đơn hàng sẽ chuyển sang <strong>"Chờ Source Xử Lý"</strong>.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">Cập nhật kế hoạch</h4>
                                    <p className="text-sm text-gray-600">Nhập <strong>Ngày dự kiến (ETA)</strong> và <strong>Nguồn cung cấp</strong> vào form.</p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">Xác nhận</h4>
                                    <p className="text-sm text-gray-600">Nhấn nút <strong>"Xác nhận Kế hoạch"</strong>. Hệ thống sẽ tự động báo lại cho Sale để thông tin tới khách hàng.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                )}

                 {/* WAREHOUSE CONTENT */}
                 {activeTab === 'WAREHOUSE' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                         <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Warehouse className="w-6 h-6" />
                             </div>
                             <h3 className="text-xl font-bold text-blue-900">Hướng dẫn dành cho Kho</h3>
                        </div>

                         <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 text-sm leading-relaxed">
                            Kho chỉ tham gia xử lý khi Sale chọn phương án <strong>"Giao ngay (Ship Partial)"</strong>. Nhiệm vụ là xác nhận thực xuất hoặc từ chối nếu hàng hỏng/mất.
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="border border-gray-200 rounded-lg p-4">
                                 <h4 className="font-bold text-emerald-600 text-sm mb-2 flex items-center gap-2">
                                     <CheckCircle2 className="w-4 h-4" /> Xác nhận Xuất
                                 </h4>
                                 <p className="text-xs text-gray-600">
                                     Chọn khi hàng hóa thực tế trong kho đủ điều kiện và đã được soạn xong. Hệ thống sẽ trừ tồn kho và cập nhật trạng thái đã giao.
                                 </p>
                             </div>
                             <div className="border border-gray-200 rounded-lg p-4">
                                 <h4 className="font-bold text-red-600 text-sm mb-2 flex items-center gap-2">
                                     <AlertTriangle className="w-4 h-4" /> Từ chối Xuất
                                 </h4>
                                 <p className="text-xs text-gray-600">
                                     Chọn khi hàng trên hệ thống có nhưng thực tế bị hỏng, thất lạc. <strong>Bắt buộc nhập lý do</strong> để Sale biết và xử lý lại.
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
