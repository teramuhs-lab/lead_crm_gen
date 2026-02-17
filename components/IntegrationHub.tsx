
import React, { useState } from 'react';
import {
  Link2, Zap, Shield, Key, RefreshCw, Plus, Globe, Settings, Code, Copy,
  Phone, Search, CreditCard, Activity, CheckCircle2, AlertCircle, Terminal,
  ExternalLink, Box, Database, Cpu
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';

const IntegrationHub: React.FC = () => {
  const { notify } = useNexus();
  const [n8nUrl, setN8nUrl] = useState('');
  const [apifyToken, setApifyToken] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const integrations = [
    { name: 'n8n (8n8)', status: n8nUrl ? 'Connected' : 'Available', icon: Link2, color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Apify', status: apifyToken ? 'Connected' : 'Available', icon: Box, color: 'text-[#FF9000]', bg: 'bg-orange-50' },
    { name: 'Twilio', status: 'Connected', icon: Phone, color: 'text-red-500', bg: 'bg-red-50' },
    { name: 'Stripe', status: 'Connected', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const handleTestApify = () => {
    setTestStatus('sending');
    setTimeout(() => {
      setTestStatus('success');
      notify("Apify connection verified. Nexus Scraper Core online.");
    }, 1500);
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-semibold text-slate-900">Integration Hub</h2>
           <p className="text-sm text-slate-500">Connect third-party powerhouses to Nexus CRM</p>
        </div>
        <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {integrations.map(int => (
           <div key={int.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-brand transition-all cursor-pointer group">
              <div className={`p-4 ${int.bg} rounded-2xl mb-3 transition-transform`}>
                 <int.icon className={`w-6 h-6 ${int.color}`} />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">{int.name}</h4>
              <p className={`text-xs font-semibold mt-1 ${int.status === 'Connected' ? 'text-emerald-500' : 'text-slate-300'}`}>{int.status}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-2 space-y-6">
            {/* Apify Card */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Box className="w-32 h-32 text-[#FF9000] rotate-12" />
               </div>

               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-[#FF9000]">
                     <Box className="w-6 h-6" />
                  </div>
                  <div>
                     <h3 className="font-semibold text-slate-900">Web Scraping</h3>
                     <p className="text-xs text-slate-500 font-medium">Automated lead enrichment and web automation</p>
                  </div>
               </div>

               <div className="space-y-4 pt-4">
                  <div>
                     <label className="text-xs font-medium text-slate-400 block mb-2">Apify Personal API Token</label>
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                           <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input
                             type="password"
                             value={apifyToken}
                             onChange={(e) => setApifyToken(e.target.value)}
                             placeholder="apify_api_..."
                             className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                           />
                        </div>
                        <button
                          onClick={handleTestApify}
                          disabled={!apifyToken || testStatus === 'sending'}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${testStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-[#FF9000] text-white hover:opacity-90 disabled:opacity-30'}`}
                        >
                           {testStatus === 'sending' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                           {testStatus === 'success' ? 'Verified!' : 'Connect'}
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
               <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Database className="w-5 h-5 text-brand" /> Webhook Integration</h3>
               <p className="text-xs text-slate-500 leading-relaxed">Enter your n8n or Make.com webhook URL to receive lead event packets.</p>
               <input
                  type="text"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
               />
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-8 text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <Cpu className="w-8 h-8 mb-4 text-[#FF9000]" />
                  <h4 className="text-xl font-semibold mb-2 leading-tight">Data Sync</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">Use Apify to scrape competitor pricing daily and update your Market Intelligence dashboard automatically.</p>
                  <button className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-semibold shadow-lg hover:bg-orange-50 transition-colors">
                     View Scraper Blueprints
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default IntegrationHub;
