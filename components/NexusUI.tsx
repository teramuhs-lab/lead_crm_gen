
import React from 'react';
import { LucideIcon, X, ChevronDown } from 'lucide-react';

// --- BUTTONS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'brand' | 'slate' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  loading?: boolean;
}

export const NexusButton: React.FC<ButtonProps> = ({
  children, variant = 'brand', size = 'md', icon: Icon, loading, className = '', ...props
}) => {
  const base = "inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    brand: "bg-brand text-white shadow-sm hover:bg-indigo-700",
    slate: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
    ghost: "bg-white border border-slate-200 text-slate-600 hover:border-brand hover:text-brand",
    danger: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-lg",
    lg: "px-6 py-2.5 text-sm rounded-xl",
    xl: "px-8 py-3 text-base rounded-xl",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// --- CARDS ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'slate' | 'glass' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const NexusCard: React.FC<CardProps> = ({
  children, className = '', variant = 'white', padding = 'md', ...props
}) => {
  const variants = {
    white: "bg-white border border-slate-200 shadow-sm",
    slate: "bg-slate-900 text-white border border-slate-800",
    glass: "bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm",
    ghost: "bg-slate-50 border border-dashed border-slate-200",
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-8",
    xl: "p-10",
  };

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};

// --- INPUTS ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const NexusInput: React.FC<InputProps> = ({ label, icon: Icon, error, className = '', ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-xs font-medium text-slate-600 ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand transition-colors" />}
      <input
        className={`w-full ${Icon ? 'pl-10' : 'px-3'} py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all placeholder:text-slate-400 ${error ? 'border-rose-500' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-rose-500 ml-1">{error}</p>}
  </div>
);

export const NexusTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-xs font-medium text-slate-600 ml-1">{label}</label>}
    <textarea
      className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all resize-none placeholder:text-slate-400 ${className}`}
      {...props}
    />
  </div>
);

export const NexusSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, icon?: LucideIcon }> = ({ label, icon: Icon, children, className = '', ...props }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-xs font-medium text-slate-600 ml-1">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
      <select
        className={`w-full appearance-none ${Icon ? 'pl-10' : 'px-3'} py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

// --- BADGES ---
export const NexusBadge: React.FC<{ children: React.ReactNode, variant?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate' | 'orange' }> = ({ children, variant = 'brand' }) => {
  const styles = {
    brand: "bg-indigo-50 text-brand border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-500 border-rose-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};

// --- MODALS ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const NexusModal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200`}>
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- SECTION HEADERS ---
export const NexusHeader: React.FC<{ title: string, subtitle: string, children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold text-slate-900 leading-none">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);
