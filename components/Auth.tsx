
import React, { useState } from 'react';
import { ShieldCheck, Zap, ArrowRight, Lock, Key, LayoutGrid } from 'lucide-react';

interface AuthProps {
  onLogin: (role: 'agency_admin' | 'subaccount_user') => void;
  platformName: string;
}

const Auth: React.FC<AuthProps> = ({ onLogin, platformName }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('admin@nexus-crm.com');

  const handleLogin = (role: 'agency_admin' | 'subaccount_user') => {
    setLoading(true);
    setTimeout(() => {
      onLogin(role);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/30 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-md w-full relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30 animate-float">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{platformName}</h1>
            <p className="text-slate-400 text-sm">Agency Operating System</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 ml-1">Email</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 ml-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value="password1234"
                  readOnly
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <p className="text-xs text-slate-400 text-center">Choose your role</p>
             <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleLogin('agency_admin')}
                  disabled={loading}
                  className="group relative bg-brand hover:bg-indigo-700 text-white p-5 rounded-xl text-left transition-all disabled:opacity-50"
                >
                   <ShieldCheck className="w-6 h-6 mb-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                   <p className="font-semibold text-sm">Agency Admin</p>
                   <p className="text-xs text-indigo-200 mt-1">Full access & settings</p>
                   <ArrowRight className="absolute bottom-5 right-5 w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                </button>

                <button
                  onClick={() => handleLogin('subaccount_user')}
                  disabled={loading}
                  className="group relative bg-slate-800 hover:bg-slate-700 text-white p-5 rounded-xl text-left transition-all disabled:opacity-50"
                >
                   <LayoutGrid className="w-6 h-6 mb-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                   <p className="font-semibold text-sm">Client User</p>
                   <p className="text-xs text-slate-400 mt-1">CRM & marketing tools</p>
                   <ArrowRight className="absolute bottom-5 right-5 w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                </button>
             </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-slate-500 text-xs">
           <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>All systems operational</span>
           </div>
           <span className="text-slate-700">|</span>
           <span>v2.4.0</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
