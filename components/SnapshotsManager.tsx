
import React, { useState } from 'react';
/* Added Activity to the imports */
import { Copy, Plus, MoreHorizontal, Zap, Layout, FormInput, ArrowRight, Layers, Loader2, CheckCircle2, ShieldCheck, Globe, Rocket, Terminal, Activity } from 'lucide-react';
import { Snapshot } from '../types';
import { useNexus } from '../context/NexusContext';

const SnapshotsManager: React.FC = () => {
  const { subAccounts, notify } = useNexus();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const snapshots: Snapshot[] = [
    { id: 's1', name: 'Real Estate Growth Pack', category: 'Real Estate', contentCount: { workflows: 12, funnels: 4, forms: 2 } },
    { id: 's2', name: 'Dental Patient Nurture', category: 'Medical', contentCount: { workflows: 8, funnels: 2, forms: 1 } },
    { id: 's3', name: 'SaaS Onboarding Kit', category: 'Tech', contentCount: { workflows: 15, funnels: 6, forms: 4 } },
  ];

  const handleDeploy = async (snapshotId: string) => {
    setSelectedSnapshot(snapshotId);
    setIsDeploying(true);
    setDeployStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setDeployStep(2);
    await new Promise(r => setTimeout(r, 1500));
    setDeployStep(3);
    await new Promise(r => setTimeout(r, 1000));
    setIsDeploying(false);
    setDeployStep(0);
    notify(`Snapshot Applied: Published to ${subAccounts.length} accounts.`, "success");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-semibold text-slate-900 leading-none">Snapshot Manager</h2>
          <p className="text-xs font-medium text-slate-400 mt-3">Package and distribute templates to sub-accounts</p>
        </div>
        <button className="px-10 py-4 bg-brand text-white rounded-xl font-semibold text-xs shadow-sm shadow-brand/20 hover:scale-105 transition-all">
          <Plus className="w-5 h-5" /> Create Template Bundle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {snapshots.map(sn => (
          <div key={sn.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand/20 transition-all group flex flex-col h-full border-b-8 border-brand/5">
            <div className="h-32 bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
               <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors"></div>
               <div className="relative z-10 p-5 bg-white rounded-xl shadow-sm border border-brand/10 group-hover:scale-110 transition-transform">
                  <Copy className="w-10 h-10 text-brand" />
               </div>
               <Rocket className="absolute bottom-[-20px] right-[-20px] w-24 h-24 text-brand/5 -rotate-12" />
            </div>
            <div className="p-8 space-y-8 flex-1 flex flex-col">
               <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-medium text-brand bg-indigo-50 px-3 py-1 rounded-full">{sn.category}</span>
                    <h4 className="text-xl font-semibold text-slate-900 mt-4">{sn.name}</h4>
                  </div>
                  <button className="p-3 bg-slate-50 text-slate-400 hover:text-brand rounded-xl transition-all shadow-sm">
                     <MoreHorizontal className="w-5 h-5" />
                  </button>
               </div>

               <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-50">
                  <div className="text-center space-y-2">
                    <Zap className="w-5 h-5 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-900 leading-none">{sn.contentCount.workflows}</p>
                    <p className="text-xs text-slate-400 font-medium">Workflows</p>
                  </div>
                  <div className="text-center space-y-2">
                    <Layout className="w-5 h-5 text-indigo-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-900 leading-none">{sn.contentCount.funnels}</p>
                    <p className="text-xs text-slate-400 font-medium">Funnels</p>
                  </div>
                  <div className="text-center space-y-2">
                    <FormInput className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-900 leading-none">{sn.contentCount.forms}</p>
                    <p className="text-xs text-slate-400 font-medium">Forms</p>
                  </div>
               </div>

               <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-medium text-slate-400">Active Distributions</p>
                  <div className="flex -space-x-2">
                     {[1,2,3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center font-semibold text-xs text-brand">U{i}</div>
                     ))}
                     <div className="w-7 h-7 rounded-full bg-brand text-white border-2 border-white flex items-center justify-center font-semibold text-xs">+{subAccounts.length}</div>
                  </div>
               </div>

               <button
                 onClick={() => handleDeploy(sn.id)}
                 className="w-full mt-auto py-5 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-3 hover:bg-brand shadow-md transition-all"
               >
                  Apply Snapshot <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}

        <button className="border-4 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-brand hover:border-brand hover:bg-white transition-all group space-y-6 shadow-inner">
           <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
              <Layers className="w-10 h-10 group-hover:scale-110 transition-transform" />
           </div>
           <div className="text-center">
              <p className="font-semibold text-sm">Marketplace</p>
              <p className="text-xs font-medium mt-2 opacity-50">Import verified industry templates</p>
           </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
         <div className="bg-slate-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden group">
            <div className="relative z-10">
               <div className="w-16 h-16 bg-brand/20 text-brand rounded-xl flex items-center justify-center mb-6 border border-brand/20">
                  <ShieldCheck className="w-8 h-8" />
               </div>
               <h3 className="text-3xl font-semibold mb-4">Account Integrity</h3>
               <p className="text-sm text-slate-400 leading-relaxed mb-10 max-w-md">Snapshots use high-fidelity mapping to ensure that when you update a core workflow, it synchronizes perfectly across your sub-accounts.</p>
               <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-semibold text-emerald-400">
                     <CheckCircle2 className="w-5 h-5" /> All Accounts Synchronized
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-brand">
                     <Globe className="w-5 h-5" /> Ready to Publish
                  </div>
               </div>
            </div>
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
               <Terminal className="w-80 h-80 text-brand rotate-12" />
            </div>
         </div>

         <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col group">
            <h4 className="text-slate-900 font-semibold text-xs mb-10 flex items-center gap-4">
               <Activity className="w-6 h-6 text-brand" /> Distribution Log
            </h4>
            <div className="space-y-8 flex-1">
               {[
                  { user: 'Acme Strategic', status: 'Success', time: '12m ago', type: 'Full Package' },
                  { user: 'Fresh Fitness', status: 'In Sync', time: '45m ago', type: 'Settings Update' },
                  { user: 'Zane Legal', status: 'Pending', time: '1h ago', type: 'Initial Setup' },
               ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-semibold text-xs text-slate-400 group-hover:bg-indigo-50 group-hover:text-brand transition-colors">{log.user.charAt(0)}</div>
                        <div>
                           <p className="text-xs font-semibold text-slate-900">{log.user}</p>
                           <p className="text-xs font-medium text-slate-400">{log.type}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-xs font-semibold ${log.status === 'Success' ? 'text-emerald-500' : log.status === 'Pending' ? 'text-amber-500' : 'text-brand'}`}>{log.status}</p>
                        <p className="text-xs font-medium text-slate-300">{log.time}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Deployment Modal */}
      {isDeploying && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center">
           <div className="w-full max-w-xl space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-40 h-40 bg-brand/10 rounded-xl flex items-center justify-center mx-auto shadow-md relative border-4 border-brand/20 group">
                 <Rocket className="w-20 h-20 text-brand animate-bounce" />
                 <div className="absolute inset-0 bg-brand/20 blur-[100px] rounded-full animate-pulse"></div>
              </div>
              <div className="space-y-6">
                 <h2 className="text-5xl font-semibold text-white">Publishing Snapshot</h2>
                 <p className="text-slate-400 font-medium text-sm h-6 flex items-center justify-center gap-4">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />
                    {deployStep === 1 && 'Preparing data...'}
                    {deployStep === 2 && 'Mapping account settings...'}
                    {deployStep === 3 && 'Saving changes...'}
                 </p>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5 shadow-inner">
                 <div
                   className="h-full bg-brand rounded-full transition-all duration-1000 ease-out shadow-[0_0_30px_rgba(99,102,241,0.8)]"
                   style={{width: `${(deployStep / 3) * 100}%`}}
                 ></div>
              </div>
              <div className="flex justify-between px-4 text-sm font-semibold text-slate-600">
                 <span className="flex items-center gap-3">Step <span className="text-brand">{deployStep}</span> of 3</span>
                 <span className="text-slate-400">Publishing in progress</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotsManager;
