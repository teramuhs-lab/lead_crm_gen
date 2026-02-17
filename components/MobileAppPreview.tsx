
import React from 'react';
import { Smartphone, Layout, Bell, MessageSquare, Zap, Target, Search } from 'lucide-react';
import { AgencySettings } from '../types';

interface MobileAppPreviewProps {
  settings: AgencySettings;
}

const MobileAppPreview: React.FC<MobileAppPreviewProps> = ({ settings }) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-semibold text-slate-900 leading-tight">White-Label Mobile App</h2>
            <p className="text-sm text-slate-500">Preview your resalable agency app as your clients would see it</p>
         </div>
         <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
            <Target className="w-4 h-4" /> Request Production Build
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
               <h3 className="font-bold text-slate-900 flex items-center gap-3"><Layout className="w-5 h-5 text-brand" /> App Configuration</h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-semibold text-slate-400 block mb-2">App Icon URL</label>
                     <input type="text" placeholder="Upload square PNG..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-slate-400 block mb-2">Primary App Color</label>
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand border-2 border-white ring-2 ring-brand"></div>
                        <span className="text-xs font-bold text-slate-600">{settings.primaryColor}</span>
                     </div>
                  </div>
                  <div className="pt-4 space-y-4">
                     <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors">Enable Push Notifications</span>
                        <div className="w-8 h-4 bg-brand rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
                     </label>
                     <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-xs font-bold text-slate-700 group-hover:text-brand transition-colors">Offline CRM Mode</span>
                        <div className="w-8 h-4 bg-slate-200 rounded-full"></div>
                     </label>
                  </div>
               </div>
            </div>

            <div className="bg-indigo-50 p-8 rounded-xl border border-indigo-100 flex gap-4">
               <Zap className="w-8 h-8 text-brand shrink-0" />
               <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Resale Strategy</h4>
                  <p className="text-xs text-indigo-700 leading-relaxed mt-1 italic">"Agencies reselling a white-label mobile app increase client retention by 42% on average."</p>
               </div>
            </div>
         </div>

         <div className="lg:col-span-2 flex justify-center">
            {/* Native App Shell Preview */}
            <div className="w-[340px] h-[680px] bg-slate-900 rounded-xl p-4 border-[10px] border-slate-800 shadow-md relative">
               {/* Notch */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-slate-800 rounded-b-2xl z-50"></div>

               {/* App Content */}
               <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden flex flex-col relative">
                  {/* StatusBar */}
                  <div className="h-10 bg-white flex items-center justify-between px-8 pt-2">
                     <span className="text-xs font-bold">9:41</span>
                     <div className="flex gap-1.5">
                        <div className="w-3 h-1.5 bg-slate-900 rounded-full"></div>
                        <div className="w-3 h-3 border border-slate-900 rounded-full"></div>
                     </div>
                  </div>

                  {/* Header */}
                  <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
                     <h4 className="font-semibold text-slate-900 text-sm">{settings.platformName}</h4>
                     <div className="relative">
                        <Bell className="w-4 h-4 text-slate-400" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand rounded-full"></div>
                     </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center"><Target className="w-5 h-5" /></div>
                        <div>
                           <p className="text-xs font-medium text-slate-400">New Opportunity</p>
                           <p className="text-xs font-semibold text-slate-900">John Doe ($450)</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <h5 className="text-xs font-medium text-slate-400 px-2">Recent Inbox</h5>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">Rachel Zane</p>
                              <p className="text-xs text-slate-500 truncate">Is the meeting still at 2pm?</p>
                           </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">Mike Ross</p>
                              <p className="text-xs text-slate-500 truncate">Just signed the invoice!</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Tab Bar */}
                  <div className="h-20 bg-white border-t border-slate-100 flex items-center justify-around px-4 pb-4">
                     <div className="flex flex-col items-center gap-1 text-brand">
                        <Layout className="w-5 h-5" />
                        <span className="text-xs font-medium">Home</span>
                     </div>
                     <div className="flex flex-col items-center gap-1 text-slate-300">
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-xs font-medium">Chat</span>
                     </div>
                     <div className="flex flex-col items-center gap-1 text-slate-300">
                        <Search className="w-5 h-5" />
                        <span className="text-xs font-medium">Leads</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MobileAppPreview;
