
import React, { useState } from 'react';
import { Layout, Plus, Search, MoreVertical, Edit3, Send, Eye, MousePointer2, Target, Users, Zap, Mail, ChevronRight, BarChart3, Clock, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useNexus } from '../context/NexusContext';

const EmailTemplates: React.FC = () => {
  const { smartLists, notify } = useNexus();
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string>('all');

  const templates = [
    { id: 't1', name: 'Monthly Growth Audit', lastUsed: '2 days ago', stats: { open: '42%', click: '12%' }, content: 'Nexus Intelligence Update...' },
    { id: 't2', name: 'Strategic Offer - Limited', lastUsed: 'Nov 2023', stats: { open: '58%', click: '24%' }, content: 'Exclusive agency access...' },
    { id: 't3', name: 'Onboarding Sequence v4', lastUsed: 'Active', stats: { open: '72%', click: '18%' }, content: 'Welcome to the core...' },
  ];

  const handleLaunchCampaign = async () => {
    setIsLaunching(true);
    await new Promise(r => setTimeout(r, 2500));
    setIsLaunching(false);
    setShowLaunchModal(false);
    notify(`Campaign sent to ${smartLists.find(l => l.id === selectedList)?.name || 'All Contacts'}.`, "success");
  };

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-semibold text-slate-900 leading-none">Campaign Center</h2>
          <p className="text-xs font-medium text-slate-400 mt-3">Email campaigns and broadcast management</p>
        </div>
        <div className="flex items-center gap-4">
           <button className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand transition-all shadow-sm flex items-center gap-3">
              <Zap className="w-4 h-4" /> AI Optimizer
           </button>
           <button className="px-10 py-4 bg-brand text-white rounded-2xl text-xs font-semibold shadow-xl shadow-brand/20 transition-all">
             <Plus className="w-5 h-5" /> New Template
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
            { label: 'Total Sent', value: '12,452', icon: Send, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'Avg Open Rate', value: '48.2%', icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Engagement', value: '18.5%', icon: Target, color: 'text-brand', bg: 'bg-indigo-50' },
            { label: 'Conversion', value: '4.2%', icon: Users, color: 'text-rose-500', bg: 'bg-rose-50' },
         ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-brand/20 transition-all">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-sm`}>
                 <stat.icon className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs font-medium text-slate-400">{stat.label}</p>
                 <p className="text-xl font-semibold text-slate-900">{stat.value}</p>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6">
         <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input type="text" placeholder="Search templates or campaigns..." className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all" />
         </div>
         <div className="flex gap-3">
            <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-semibold text-slate-400 hover:text-slate-900 transition-all">Templates</button>
            <button className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-semibold text-slate-400 hover:text-slate-900 transition-all">Recent</button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tmp => (
          <div key={tmp.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand transition-all group flex flex-col relative border-b-8 border-brand/5">
             <div className="h-56 bg-slate-50 relative flex items-center justify-center p-10 overflow-hidden border-b border-slate-100">
                <div className="w-full h-full bg-white border-2 border-slate-200 rounded-2xl shadow-xl flex flex-col p-6 space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-2.5 bg-slate-100 rounded-full"></div>
                      <div className="w-6 h-2.5 bg-slate-100 rounded-full opacity-50"></div>
                   </div>
                   <div className="space-y-2">
                      <div className="w-full h-4 bg-slate-50 rounded-lg"></div>
                      <div className="w-full h-4 bg-slate-50 rounded-lg opacity-60"></div>
                      <div className="w-2/3 h-4 bg-slate-50 rounded-lg opacity-40"></div>
                   </div>
                   <div className="mt-auto flex justify-center">
                      <div className="w-24 h-8 bg-brand/10 border border-brand/20 rounded-xl"></div>
                   </div>
                </div>
                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                   <div className="flex gap-4">
                      <button className="p-4 bg-white text-slate-900 rounded-xl shadow-md"><Eye className="w-6 h-6" /></button>
                      <button className="p-4 bg-brand text-white rounded-xl shadow-md"><Edit3 className="w-6 h-6" /></button>
                   </div>
                   <button
                     onClick={() => { setSelectedTemplate(tmp.id); setShowLaunchModal(true); }}
                     className="px-8 py-3.5 bg-white text-slate-900 rounded-xl text-xs font-semibold hover:bg-brand hover:text-white transition-all shadow-md"
                   >
                     Launch Campaign
                   </button>
                </div>
             </div>
             <div className="p-8 space-y-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                   <div className="min-w-0">
                      <h4 className="text-xl font-semibold text-slate-900 truncate">{tmp.name}</h4>
                      <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-2">
                         <Clock className="w-3.5 h-3.5" /> Used {tmp.lastUsed}
                      </p>
                   </div>
                   <button className="p-3 bg-slate-50 text-slate-300 hover:text-brand rounded-2xl transition-all"><MoreVertical className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 group-hover:border-brand/20 transition-all">
                      <p className="text-xs font-medium text-slate-400 mb-1">Open Rate</p>
                      <p className="text-lg font-semibold text-slate-900">{tmp.stats.open}</p>
                   </div>
                   <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 group-hover:border-brand/20 transition-all">
                      <p className="text-xs font-medium text-slate-400 mb-1">Click Rate</p>
                      <p className="text-lg font-semibold text-slate-900">{tmp.stats.click}</p>
                   </div>
                </div>

                <button
                  onClick={() => { setSelectedTemplate(tmp.id); setShowLaunchModal(true); }}
                  className="w-full mt-auto py-5 border-2 border-slate-200 text-slate-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all group/btn"
                >
                   Send Campaign <Send className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </button>
             </div>
          </div>
        ))}

        <button className="border-4 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-300 hover:text-brand hover:border-brand hover:bg-white transition-all group space-y-6 shadow-inner">
           <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
              <Mail className="w-10 h-10" />
           </div>
           <div className="text-center">
              <p className="font-semibold text-sm">New Template</p>
              <p className="text-xs font-medium mt-2 opacity-50">Create a new email campaign</p>
           </div>
        </button>
      </div>

      {/* Launch Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
              <div className="p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-4xl font-semibold text-slate-900">Send Campaign</h3>
                      <p className="text-xs text-slate-400 font-medium mt-3">Choose your audience and send</p>
                    </div>
                    <button onClick={() => setShowLaunchModal(false)} className="p-4 bg-slate-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all"><X className="w-8 h-8" /></button>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-4">
                       <label className="text-xs font-semibold text-slate-400 ml-4">Audience</label>
                       <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => setSelectedList('all')}
                            className={`flex items-center justify-between p-6 rounded-xl border-2 transition-all ${selectedList === 'all' ? 'bg-indigo-50 border-brand' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                             <div className="flex items-center gap-4">
                                <Users className={`w-6 h-6 ${selectedList === 'all' ? 'text-brand' : 'text-slate-300'}`} />
                                <span className={`text-sm font-semibold ${selectedList === 'all' ? 'text-brand' : 'text-slate-700'}`}>All Contacts</span>
                             </div>
                             {selectedList === 'all' && <CheckCircle2 className="w-6 h-6 text-brand" />}
                          </button>
                          {smartLists.map(list => (
                            <button
                              key={list.id}
                              onClick={() => setSelectedList(list.id)}
                              className={`flex items-center justify-between p-6 rounded-xl border-2 transition-all ${selectedList === list.id ? 'bg-indigo-50 border-brand' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                               <div className="flex items-center gap-4">
                                  <Target className={`w-6 h-6 ${selectedList === list.id ? 'text-brand' : 'text-slate-300'}`} />
                                  <span className={`text-sm font-semibold ${selectedList === list.id ? 'text-brand' : 'text-slate-700'}`}>{list.name}</span>
                               </div>
                               {selectedList === list.id && <CheckCircle2 className="w-6 h-6 text-brand" />}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-xl text-white flex items-center gap-6 border-4 border-white shadow-md relative overflow-hidden">
                       <div className="w-14 h-14 bg-brand/20 text-brand rounded-2xl flex items-center justify-center shrink-0">
                          <Sparkles className="w-8 h-8" />
                       </div>
                       <div className="relative z-10">
                          <p className="text-xs font-medium text-slate-500 mb-1">AI Recommendation</p>
                          <p className="text-xs font-medium text-slate-200 leading-relaxed">Send at 10:15 AM EST for best results based on past engagement data.</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-6">
                    <button onClick={() => setShowLaunchModal(false)} className="flex-1 py-7 bg-slate-100 text-slate-400 rounded-xl font-semibold text-xs hover:bg-slate-200 transition-all">Cancel</button>
                    <button
                      onClick={handleLaunchCampaign}
                      disabled={isLaunching}
                      className="flex-1 py-7 bg-brand text-white rounded-xl font-semibold text-xs shadow-md shadow-brand/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isLaunching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {isLaunching ? 'Sending...' : 'Send Campaign'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
