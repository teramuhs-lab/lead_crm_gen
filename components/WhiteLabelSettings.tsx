
import React from 'react';
import { AgencySettings } from '../types';
import { Palette, Globe, Save, Plus, Zap, CheckCircle2 } from 'lucide-react';

interface WhiteLabelSettingsProps {
  settings: AgencySettings;
  setSettings: React.Dispatch<React.SetStateAction<AgencySettings>>;
}

const WhiteLabelSettings: React.FC<WhiteLabelSettingsProps> = ({ settings, setSettings }) => {
  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#8b5cf6', '#1e293b', '#000000'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col">
        <h2 className="text-3xl font-semibold text-slate-900 leading-none">Agency Customization</h2>
        <p className="text-xs font-medium text-slate-400 mt-2">Manage your platform's visual identity & custom endpoints</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm space-y-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-brand/10 text-brand rounded-xl shadow-sm">
                  <Palette className="w-6 h-6" />
               </div>
               <h3 className="font-semibold text-slate-900">Visual Settings</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Platform Name</label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all"
                  placeholder="Nexus Enterprise"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-semibold text-slate-400 block ml-2">Brand Color Palette</label>
                <div className="flex flex-wrap gap-4">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSettings({...settings, primaryColor: color})}
                      className={`w-12 h-12 rounded-xl border-4 transition-all ${settings.primaryColor === color ? 'border-white ring-4 ring-brand shadow-xl' : 'border-transparent shadow-sm'}`}
                      style={{backgroundColor: color}}
                    ></button>
                  ))}
                  <div className="relative group">
                    <input
                       type="color"
                       value={settings.primaryColor}
                       onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                       className="w-12 h-12 rounded-xl overflow-hidden opacity-0 absolute inset-0 cursor-pointer z-10"
                    />
                    <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 bg-white group-hover:border-brand group-hover:text-brand transition-all">
                       <Plus className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-brand/10 text-brand rounded-xl shadow-sm">
                  <Globe className="w-6 h-6" />
               </div>
               <h3 className="font-semibold text-slate-900">Domain Configuration</h3>
            </div>
            <div className="space-y-4">
               <label className="text-xs font-semibold text-slate-400 block ml-2">Agency Custom CNAME</label>
               <div className="flex gap-4">
                  <input
                    type="text"
                    value={settings.customDomain}
                    onChange={(e) => setSettings({...settings, customDomain: e.target.value})}
                    className="flex-1 px-8 py-5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                    placeholder="app.agency.io"
                  />
                  <button className="px-8 py-5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-brand transition-all">Verify</button>
               </div>
               <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-medium text-amber-700 leading-none">Point CNAME records to proxy-live.nexus.io</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 flex flex-col">
           <div className="bg-slate-900 rounded-2xl p-10 shadow-md relative overflow-hidden flex-1 border-[10px] border-white shadow-brand/10">
              <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                 <Zap className="w-80 h-80 text-brand rotate-12" />
              </div>
              <p className="text-xs font-medium text-slate-500 mb-8 text-center leading-none">Real-time Interface Preview</p>

              <div className="w-full flex flex-col gap-10">
                 <div className="flex items-center gap-5 px-6">
                    <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center transition-all animate-pulse">
                      <Zap className="w-7 h-7 text-white fill-white" />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-semibold text-2xl text-white leading-none">{settings.platformName}</span>
                       <span className="text-xs font-medium text-slate-500 mt-1">Enterprise Console</span>
                    </div>
                 </div>

                 <div className="space-y-4 px-6">
                    <div className="h-14 w-full bg-brand rounded-xl flex items-center px-6 shadow-md shadow-brand/20">
                       <div className="w-2.5 h-2.5 rounded-full bg-white mr-4"></div>
                       <div className="w-32 h-2.5 bg-white/30 rounded-full"></div>
                    </div>
                    <div className="h-14 w-full bg-slate-800 rounded-xl opacity-50 flex items-center px-6">
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mr-4"></div>
                       <div className="w-24 h-2.5 bg-slate-700 rounded-full"></div>
                    </div>
                    <div className="h-14 w-full bg-slate-800 rounded-xl opacity-30 flex items-center px-6">
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mr-4"></div>
                       <div className="w-40 h-2.5 bg-slate-700 rounded-full"></div>
                    </div>
                 </div>

                 <div className="mt-10 px-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="h-32 bg-slate-800 rounded-xl border border-white/5 p-6 space-y-3">
                          <div className="w-8 h-8 rounded-xl bg-brand/20 border border-brand/40"></div>
                          <div className="w-full h-2 bg-slate-700 rounded-full"></div>
                          <div className="w-2/3 h-2 bg-slate-700 rounded-full opacity-50"></div>
                       </div>
                       <div className="h-32 bg-brand/10 rounded-xl border border-brand/30 p-6 space-y-3">
                          <div className="w-8 h-8 rounded-xl bg-brand shadow-lg"></div>
                          <div className="w-full h-2 bg-brand/30 rounded-full"></div>
                          <div className="w-2/3 h-2 bg-brand/30 rounded-full opacity-50"></div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <button
             onClick={() => window.location.reload()}
             className="w-full py-8 bg-brand text-white font-semibold text-xs rounded-xl shadow-md shadow-brand/40 flex items-center justify-center gap-4 hover:scale-105 transition-all"
           >
              <Save className="w-6 h-6" /> Save Theme Changes
           </button>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabelSettings;
