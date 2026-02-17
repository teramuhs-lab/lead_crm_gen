
import React from 'react';
import { MonitorPlay, TrendingUp, DollarSign, Target, Plus, Search, Globe, ChevronRight, Wand2, Share2, Facebook } from 'lucide-react';
import { AdCampaign } from '../types';

const AdManager: React.FC = () => {
  const campaigns: AdCampaign[] = [
    { id: 'ad1', platform: 'facebook', name: 'Fall Enrollment - Retargeting', spend: 1250, leads: 82, roas: 3.4, status: 'active' },
    { id: 'ad2', platform: 'google', name: 'Emergency Plumber Near Me', spend: 3400, leads: 145, roas: 5.1, status: 'active' },
    { id: 'ad3', platform: 'facebook', name: 'Agency SaaS Demo - Cold', spend: 850, leads: 12, roas: 1.2, status: 'paused' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-semibold text-slate-900">Performance Ads Manager</h2>
           <p className="text-sm text-slate-500">Track ROAS and generate AI-powered creatives across Google & Meta</p>
        </div>
        <div className="flex gap-3">
           <button className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">Reporting Export</button>
           <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90">
             <Plus className="w-4 h-4" /> Connect New Account
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Ad Spend</p>
            <p className="text-2xl font-semibold text-slate-900">$5,500.00</p>
            <span className="text-xs text-emerald-600 font-medium mt-1 block">Within Budget</span>
         </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-400 mb-1">Attributed Leads</p>
            <p className="text-2xl font-semibold text-slate-900">239</p>
            <span className="text-xs text-brand font-medium mt-1 block">$23.01 Per Lead</span>
         </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-400 mb-1">Average ROAS</p>
            <p className="text-2xl font-semibold text-emerald-600">3.23x</p>
            <span className="text-xs text-slate-400 font-medium mt-1 block">Live tracking</span>
         </div>
         <div className="bg-indigo-600 p-6 rounded-xl shadow-lg text-white">
            <p className="text-xs font-medium text-indigo-200 mb-1">AI Efficiency</p>
            <p className="text-2xl font-semibold">+14.2%</p>
            <span className="text-xs text-indigo-100 font-medium mt-1 block">Gemini Optimization</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Active Campaigns</h3>
                  <div className="flex gap-2">
                     <button className="p-2 bg-slate-50 rounded-lg text-slate-400"><Search className="w-4 h-4" /></button>
                     <button className="p-2 bg-slate-50 rounded-lg text-slate-400"><Globe className="w-4 h-4" /></button>
                  </div>
               </div>
               <div className="divide-y divide-slate-50">
                  {campaigns.map(camp => (
                    <div key={camp.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${camp.platform === 'facebook' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'}`}>
                             {camp.platform === 'facebook' ? <Facebook className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900 text-sm">{camp.name}</h4>
                             <p className="text-xs text-slate-400 font-medium mt-0.5">{camp.status}</p>
                          </div>
                       </div>
                       <div className="flex gap-4 text-right">
                          <div>
                             <p className="text-xs text-slate-400 font-medium">Spend</p>
                             <p className="text-sm font-semibold text-slate-900">${camp.spend.toLocaleString()}</p>
                          </div>
                          <div className="min-w-[80px]">
                             <p className="text-xs text-slate-400 font-medium">ROAS</p>
                             <p className={`text-sm font-semibold ${camp.roas > 2 ? 'text-emerald-600' : 'text-slate-900'}`}>{camp.roas}x</p>
                          </div>
                          <button className="p-2 text-slate-300 hover:text-slate-900"><ChevronRight className="w-5 h-5" /></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                     <Wand2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900">AI Ad Creative</h3>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed">Let Gemini generate high-converting Meta and Google headlines based on your website content.</p>
               <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-pointer hover:border-brand transition-all">
                     <p className="text-xs font-semibold text-brand mb-1">Draft 1</p>
                     <p className="text-xs font-bold text-slate-700 italic">"Stop Losing Leads to the Competition. Switch to Nexus CRM Today."</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-pointer hover:border-brand transition-all">
                     <p className="text-xs font-semibold text-brand mb-1">Draft 2</p>
                     <p className="text-xs font-bold text-slate-700 italic">"The #1 White-Label Platform for Agencies. Launch Your CRM in 5 Mins."</p>
                  </div>
               </div>
               <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                  <Share2 className="w-4 h-4" /> Publish to Facebook
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdManager;
