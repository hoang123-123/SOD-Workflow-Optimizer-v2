import React from 'react';

// --- SHARED UI COMPONENTS ---

export const SectionHeader = ({ icon: Icon, title, isActive, rightElement }: { icon: any, title: string, isActive: boolean, rightElement?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
              <Icon className="w-4 h-4" />
          </div>
          <span className={`text-sm font-bold ${isActive ? 'text-indigo-900' : 'text-gray-400'}`}>{title}</span>
      </div>
      <div className="flex items-center gap-2">
          {rightElement}
          {isActive && <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-1 rounded tracking-wider shadow-sm">Cần xử lý</span>}
      </div>
    </div>
);

export const LabelText = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <span className={`text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${className}`}>{children}</span>
);

export const ValueText = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <span className={`text-base font-semibold text-slate-800 ${className}`}>{children}</span>
);
