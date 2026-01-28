
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
  // Default tab: GUIDE_OVERVIEW để người dùng thấy hướng dẫn trước
  const [activeTab, setActiveTab] = useState<string>('GUIDE_OVERVIEW');

  if (!isOpen) return null;

  // --- CONFIGURATION ---
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

  // Map Logic Tabs to Rule Groups
  const getRulesByTab = (tabId: string) => {
      switch (tabId) {
          case 'LOGIC_CASE_A': return BUSINESS_RULES.filter(r => r.group === 'CASE A (Lần đầu K=1)');
          case 'LOGIC_CASE_B': return BUSINESS_RULES.filter(r => r.group === 'CASE B (Lần sau K>1)');
          case 'LOGIC_EXCEPTION': return BUSINESS_RULES.filter(r => r.group === 'EXCEPTION');
          default: return [];
      }
  };

  const getRoleColor = (role: UserRole) => {
      switch(role) {
          case UserRole.SALE: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
          case UserRole.SOURCE: return 'bg-amber-100 text-amber-700 border-amber-200';
          case UserRole.WAREHOUSE: return 'bg-blue-100 text-blue-700 border-blue-200';
          default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
  };

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
        case UserRole.SALE: return UserCircle2;
        case UserRole.SOURCE: return Factory;
        case UserRole.WAREHOUSE: return Warehouse;
        default: return Info;
    }
  }

  // --- RENDER CONTENT HELPERS ---

  // 1. Render User Guide Content (Non-technical)
  const renderGuideContent = () => {
      switch (activeTab) {
        case 'GUIDE_OVERVIEW':
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-blue-600" />
                            Giới thiệu chung
                        </h3>
                        <p className="text-blue-800 leading-relaxed text-sm">
                            Hệ thống quản lý dòng hàng thiếu hụt (Shortage Management) giúp các bộ phận phối hợp xử lý tình huống khi tồn kho không đủ đáp ứng đơn hàng.
                            <br/>
                            Thay vì trao đổi rời rạc, mọi quyết định được ghi nhận tập trung tại đây để đảm bảo tính nhất quán và tự động hóa quy trình.
                        </p>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2 font-bold text-indigo-700">
                                <UserCircle2 className="w-5 h-5" /> Sale
                            </div>
                            <p className="text-sm text-gray-600">Quyết định phương án với khách hàng: Giao ngay, Chờ hàng, hoặc Chốt đơn.</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2 font-bold text-amber-700">
                                <Factory className="w-5 h-5" /> Source
                            </div>
                            <p className="text-sm text-gray-600">Xác nhận ngày hàng về (ETA) và nguồn cung nếu Sale chọn phương án "Chờ hàng".</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2 font-bold text-blue-700">
                                <Warehouse className="w-5 h-5" /> Kho (Logistics)
                            </div>
                            <p className="text-sm text-gray-600">Thực hiện xuất kho thực tế hoặc báo cáo sự cố sai lệch tồn kho cho Sale.</p>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-100 pb-2">Luồng quy trình cơ bản</h3>
                        <div className="flex flex-col md:flex-row items-center gap-3 text-sm text-gray-600 bg-gray-50 p-5 rounded-xl border border-gray-200 justify-center">
                            <div className="text-center">
                                <span className="block font-bold text-gray-800 bg-white px-3 py-1 rounded shadow-sm border border-gray-100 mb-1">1. Phát sinh thiếu</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 md:rotate-0" />
                            <div className="text-center">
                                <span className="block font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded shadow-sm border border-indigo-100 mb-1">2. Sale chốt phương án</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 md:rotate-0" />
                            <div className="text-center">
                                <span className="block font-bold text-gray-800 bg-white px-3 py-1 rounded shadow-sm border border-gray-100 mb-1">3. Source/Kho thực hiện</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 md:rotate-0" />
                            <div className="text-center">
                                <span className="block font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded shadow-sm border border-emerald-100 mb-1">4. Hoàn tất</span>
                            </div>
                        </div>
                    </section>
                </div>
            );
        
        case 'GUIDE_SALE':
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                            <UserCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-indigo-900">Hướng dẫn dành cho Sale</h3>
                                <p className="text-indigo-600">Bạn là người ra quyết định chính khi đơn hàng bị thiếu.</p>
                            </div>
                    </div>

                    <div className="bg-white border border-indigo-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-indigo-50/50 px-6 py-3 border-b border-indigo-100 font-bold text-indigo-800 text-sm uppercase tracking-wide">
                            Chi tiết các tình huống xử lý
                        </div>
                        <div className="divide-y divide-gray-100">
                            
                            {/* CASE 1: GIAO NGAY */}
                            <div className="p-6 hover:bg-gray-50 transition-colors">
                                <h4 className="font-bold text-indigo-700 text-base mb-2 flex items-center gap-2">
                                    <Truck className="w-5 h-5"/>
                                    1. Giao ngay / Giao 1 phần (Ship Partial)
                                </h4>
                                <div className="ml-7 space-y-3">
                                    <p className="text-sm text-gray-600">
                                        <strong>Khi nào dùng?</strong> Khi trong kho có sẵn một lượng hàng (dù chưa đủ) và khách đồng ý nhận trước phần này.
                                    </p>
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm">
                                        <div className="font-semibold text-indigo-900 mb-1">Điều gì xảy ra tiếp theo?</div>
                                        <ul className="list-disc list-inside text-indigo-800 space-y-1">
                                            <li>Lệnh xuất kho được gửi xuống bộ phận Kho.</li>
                                            <li>Sau khi Kho xác nhận xuất xong, số lượng tồn kho sẽ bị trừ.</li>
                                            <li><span className="font-bold">Quan trọng:</span> Phần thiếu còn lại sẽ được hệ thống treo lại để xử lý ở lần bổ sung tiếp theo (Case B).</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* CASE 2: CHỜ HÀNG */}
                            <div className="p-6 hover:bg-gray-50 transition-colors">
                                <h4 className="font-bold text-amber-700 text-base mb-2 flex items-center gap-2">
                                    <RotateCw className="w-5 h-5"/>
                                    2. Chờ hàng (Wait All / Backorder)
                                </h4>
                                <div className="ml-7 space-y-3">
                                    <p className="text-sm text-gray-600">
                                        <strong>Khi nào dùng?</strong> Khi khách hàng muốn gom đủ hàng mới giao, hoặc khi kho đã hết sạch hàng.
                                    </p>
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm">
                                        <div className="font-semibold text-amber-900 mb-1">Điều gì xảy ra tiếp theo?</div>
                                        <ul className="list-disc list-inside text-amber-800 space-y-1">
                                            <li>Trạng thái đơn hàng chuyển sang <strong>"Chờ Source xử lý"</strong>.</li>
                                            <li>Source sẽ điền ngày hàng về (ETA).</li>
                                            <li>Khi Source xác nhận xong, Sale sẽ nhận được thông báo để cập nhật cho khách hàng.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* CASE 3: HỦY ĐƠN */}
                            <div className="p-6 hover:bg-gray-50 transition-colors">
                                <h4 className="font-bold text-red-700 text-base mb-2 flex items-center gap-2">
                                    <Ban className="w-5 h-5"/>
                                    3. Chốt đơn / Hủy phần thiếu (Cancel)
                                </h4>
                                <div className="ml-7 space-y-3">
                                    <p className="text-sm text-gray-600">
                                        <strong>Khi nào dùng?</strong> Khi khách hàng không muốn chờ và quyết định hủy phần hàng còn thiếu.
                                    </p>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                                        <div className="font-semibold text-red-900 mb-1">Điều gì xảy ra tiếp theo?</div>
                                        <ul className="list-disc list-inside text-red-800 space-y-1">
                                            <li>Nếu chưa giao gì: Dòng hàng bị hủy hoàn toàn.</li>
                                            <li>Nếu đã giao 1 phần: Hệ thống sẽ chốt số lượng thực tế đã giao và đóng dòng hàng lại (Status = Resolved).</li>
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
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                            <Factory className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-amber-900">Hướng dẫn dành cho Source</h3>
                                <p className="text-amber-600">Cung cấp thông tin ngày hàng về cho Sale.</p>
                            </div>
                    </div>

                    <div className="p-5 bg-amber-50 rounded-xl border border-amber-100 text-amber-900 text-sm leading-relaxed">
                        Nhiệm vụ của Source là phản hồi thông tin <strong>Ngày hàng về (ETA)</strong> khi Sale chọn phương án "Chờ hàng".
                    </div>

                    <div className="space-y-4">
                         <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                             <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold shrink-0">1</div>
                             <div>
                                 <h4 className="font-bold text-gray-900">Nhận thông báo</h4>
                                 <p className="text-sm text-gray-600 mt-1">Khi Sale chọn "Chờ hàng", trạng thái đơn hàng sẽ chuyển sang <strong className="text-amber-600">"Chờ Source Xử Lý"</strong>.</p>
                             </div>
                         </div>
                         <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                             <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold shrink-0">2</div>
                             <div>
                                 <h4 className="font-bold text-gray-900">Cập nhật kế hoạch</h4>
                                 <p className="text-sm text-gray-600 mt-1">Nhập <strong>Ngày dự kiến (ETA)</strong> và <strong>Nguồn cung cấp</strong> vào form trên giao diện.</p>
                             </div>
                         </div>
                         <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
                             <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold shrink-0">3</div>
                             <div>
                                 <h4 className="font-bold text-gray-900">Xác nhận</h4>
                                 <p className="text-sm text-gray-600 mt-1">Nhấn nút <strong>"Xác nhận Kế hoạch"</strong>. Hệ thống sẽ tự động báo lại cho Sale để thông tin tới khách hàng.</p>
                             </div>
                         </div>
                    </div>
                </div>
            );

        case 'GUIDE_WAREHOUSE':
            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <Warehouse className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-blue-900">Hướng dẫn dành cho Kho</h3>
                                <p className="text-blue-600">Xác nhận xuất hàng hoặc báo cáo sự cố.</p>
                            </div>
                    </div>

                        <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 text-blue-900 text-sm leading-relaxed">
                        Kho chỉ tham gia xử lý khi Sale chọn phương án <strong>"Giao ngay"</strong> hoặc khi cần kiểm đếm thực tế.
                    </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border border-emerald-100 bg-white rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-colors">
                                <h4 className="font-bold text-emerald-700 text-base mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> Xác nhận Xuất
                                </h4>
                                <p className="text-sm text-gray-600">
                                    Chọn khi hàng hóa thực tế trong kho <strong>đủ điều kiện</strong> và đã được soạn xong theo yêu cầu của Sale.
                                </p>
                                <div className="mt-3 text-xs bg-emerald-50 text-emerald-800 p-2 rounded">
                                    Hệ thống sẽ trừ tồn kho và cập nhật trạng thái đã giao.
                                </div>
                            </div>

                            <div className="border border-red-100 bg-white rounded-xl p-5 shadow-sm hover:border-red-300 transition-colors">
                                <h4 className="font-bold text-red-700 text-base mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> Từ chối / Báo lỗi
                                </h4>
                                <p className="text-sm text-gray-600">
                                    Chọn khi hàng trên hệ thống có nhưng thực tế <strong>bị hỏng, thất lạc, hoặc sai lệch</strong>.
                                </p>
                                <div className="mt-3 text-xs bg-red-50 text-red-800 p-2 rounded">
                                    Bắt buộc nhập lý do để Sale biết và xử lý lại.
                                </div>
                            </div>
                        </div>

                         <div className="p-5 bg-amber-50 rounded-xl border border-amber-100 mt-2">
                             <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                                 <AlertOctagon className="w-4 h-4"/> Chức năng Kiểm đếm (Warehouse Request)
                             </h4>
                             <p className="text-sm text-amber-900 mb-0">
                                 Khi phát hiện số liệu hệ thống sai lệch (ví dụ: Hệ thống báo có 10, thực tế chỉ có 5), Kho có thể chủ động nhập số lượng thực tế và gửi <strong>"Request Sale"</strong>. Sale sẽ nhận được cảnh báo và điều chỉnh lại đơn hàng.
                             </p>
                         </div>
                </div>
            );
        default: return null;
      }
  };


  // 2. Render Logic Content (Technical)
  const renderLogicContent = () => {
     if (activeTab === 'LOGIC_GLOSSARY') {
         return (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                {/* Biến số chính */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                        Các biến số quan trọng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">N</div>
                                <div>
                                    <div className="font-bold text-indigo-900">Nhu cầu (Net Need)</div>
                                    <div className="text-xs text-indigo-700 font-mono">N = QtyOrdered - QtyDelivered</div>
                                </div>
                            </div>
                            <p className="text-sm text-indigo-800 leading-relaxed">
                                Số lượng sản phẩm khách hàng <strong>thực sự còn cần</strong> tại thời điểm hiện tại.
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">L</div>
                                <div>
                                    <div className="font-bold text-emerald-900">Tồn kho (Logistics)</div>
                                    <div className="text-xs text-emerald-700 font-mono">L = QtyAvailable</div>
                                </div>
                            </div>
                            <p className="text-sm text-emerald-800 leading-relaxed">
                                Số lượng tồn kho <strong>khả dụng thực tế</strong> có thể dùng để giao ngay lập tức.
                            </p>
                        </div>
                        
                         <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">K</div>
                                <div>
                                    <div className="font-bold text-amber-900">Lần giao (Sequence)</div>
                                    <div className="text-xs text-amber-700 font-mono">K = DeliveryCount + 1</div>
                                </div>
                            </div>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                <br/>• <strong>K=1 (Case A):</strong> Xử lý lần đầu tiên.
                                <br/>• <strong>K&gt;1 (Case B):</strong> Xử lý các lần bổ sung tiếp theo.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Logic Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MonitorPlay className="w-5 h-5 text-indigo-600" />
                        Bảng tóm tắt Logic
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-4 py-3">Tình huống</th>
                                    <th className="px-4 py-3">Điều kiện Logic</th>
                                    <th className="px-4 py-3">Ý nghĩa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="bg-white">
                                    <td className="px-4 py-3 font-bold text-indigo-600">Shortage (Thiếu)</td>
                                    <td className="px-4 py-3 font-mono">N &gt; L</td>
                                    <td className="px-4 py-3 text-gray-600">Nhu cầu lớn hơn tồn kho. Cần Sale quyết định.</td>
                                </tr>
                                <tr className="bg-gray-50/50">
                                    <td className="px-4 py-3 font-bold text-emerald-600">Sufficient (Đủ)</td>
                                    <td className="px-4 py-3 font-mono">N &le; L</td>
                                    <td className="px-4 py-3 text-gray-600">Đủ hàng. Hệ thống tự động chuyển trạng thái OK.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
         );
     }

     // Render Rules
     const rules = getRulesByTab(activeTab);
     return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            {rules.map((rule) => {
                const ActorIcon = getRoleIcon(rule.actor);
                const TargetIcon = getRoleIcon(rule.output.targetRole);

                return (
                    <div key={rule.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        {/* Rule Header */}
                        <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 rounded text-xs font-black bg-gray-900 text-white shadow-sm">{rule.id}</span>
                                <h3 className="text-base font-bold text-gray-800">{rule.name}</h3>
                            </div>
                            <span className="text-xs text-gray-500 italic">{rule.description}</span>
                        </div>

                        {/* Interaction Flow Visualization */}
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                                
                                {/* STEP 1: INPUT (Actor) */}
                                <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-100 relative group">
                                    <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-gray-100 rounded">Step 1: Input</div>
                                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-bold mb-3 ${getRoleColor(rule.actor)}`}>
                                        <ActorIcon className="w-3.5 h-3.5" /> {rule.actor}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                                            <p className="text-sm text-gray-700"><strong>Hành động:</strong> {rule.input.actionName}</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                                            <p className="text-xs text-gray-500"><em>Điều kiện: {rule.input.condition}</em></p>
                                        </div>
                                    </div>
                                    
                                    <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                                        <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* STEP 2: PROCESS (System) */}
                                <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-200 relative">
                                    <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-slate-100 rounded">Step 2: System</div>
                                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-bold mb-3 bg-slate-200 text-slate-700">
                                        <MonitorPlay className="w-3.5 h-3.5" /> SYSTEM
                                    </div>

                                    <div className="space-y-3">
                                        {rule.process.notificationTag && (
                                            <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notified:</span>
                                                    <div className="flex items-center gap-2 px-2 py-1.5 rounded border bg-purple-50 border-purple-100 text-purple-700">
                                                    <BellRing className="w-3 h-3" />
                                                    <span className="text-xs font-mono font-bold">{rule.process.notificationTag}</span>
                                                    </div>
                                            </div>
                                        )}
                                        <div className="text-sm text-slate-700 mt-2">
                                            <strong>Logic:</strong> {rule.process.logicDesc}
                                        </div>
                                    </div>

                                    <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                                        <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* STEP 3: OUTPUT (Target) */}
                                <div className="flex-1 bg-emerald-50/50 rounded-lg p-4 border border-emerald-100 relative">
                                    <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-emerald-100 rounded">Step 3: Output</div>
                                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-bold mb-3 ${getRoleColor(rule.output.targetRole)}`}>
                                        <TargetIcon className="w-3.5 h-3.5" /> {rule.output.targetRole}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-2 bg-white rounded border border-emerald-100 shadow-sm">
                                            <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Giao diện (UI)</p>
                                            <p className="text-sm text-emerald-800">{rule.output.uiDescription}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* 1. Mở rộng chiều ngang: max-w-7xl. 2. Fix chiều cao: h-[85vh] */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] xl:max-w-7xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
                <BookOpen className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-900">Thông tin & Hướng dẫn sử dụng</h2>
                <p className="text-sm text-gray-500">Tài liệu tham khảo quy trình và thao tác hệ thống.</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden">
            {/* 3. Thu gọn Sidebar: w-52 */}
            <div className="w-52 bg-gray-50 border-r border-gray-100 p-4 space-y-6 overflow-y-auto hidden md:block shrink-0">
                
                {MENU_GROUPS.map((group) => (
                    <div key={group.title}>
                         <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                             {group.title}
                         </div>
                         <div className="space-y-1">
                            {group.items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                        activeTab === item.id 
                                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100 border-l-4 border-indigo-500' 
                                        : 'text-gray-600 hover:bg-gray-200/50'
                                    }`}
                                >
                                    <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    {item.label}
                                </button>
                            ))}
                         </div>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
                {activeTab.startsWith('GUIDE_') ? renderGuideContent() : renderLogicContent()}
            </div>
        </div>
      </div>
    </div>
  );
};
