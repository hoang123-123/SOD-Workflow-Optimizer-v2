import React from 'react';

// --- SHARED UI COMPONENTS ---

export const SectionHeader = ({ icon: Icon, title, isActive, rightElement }: { icon: any, title: string, isActive: boolean, rightElement?: React.ReactNode }) => (
    <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
            </div>
            <span className={`text-sm font-bold uppercase tracking-tight ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
            {rightElement}
            {isActive && <span className="text-[10px] font-bold text-white bg-indigo-500 px-3 py-1 rounded-full tracking-widest shadow-sm uppercase">Cần xử lý</span>}
        </div>
    </div>
);

export const LabelText = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <span className={`text-[10px] font-bold text-gray-500 uppercase tracking-widest ${className}`}>{children}</span>
);

export const ValueText = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <span className={`text-base font-bold text-gray-800 ${className}`}>{children}</span>
);
