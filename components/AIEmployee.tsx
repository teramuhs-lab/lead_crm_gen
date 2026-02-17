
import React, { useState } from 'react';
import { BrainCircuit, Play, Settings2, Plus, FileText, Globe, MessageSquare, Save, CheckCircle2, AlertCircle, Bot } from 'lucide-react';

const AIEmployee: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'training' | 'logs'>('settings');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
              <BrainCircuit className="w-10 h-10" />
           </div>
           <div>
              <h2 className="text-2xl font-bold text-slate-900">AI Conversational Employee</h2>
              <p className="text-sm text-slate-500">Autonomous booking and lead qualification agent</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              Active & Listening
           </span>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-colors"><Settings2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
         <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Agent Settings</button>
         <button onClick={() => setActiveTab('training')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'training' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Knowledge Base</button>
         <button onClick={() => setActiveTab('logs')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Conversation Logs</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-6">
           {activeTab === 'settings' && (
             <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div>
                      <label className="text-xs font-medium text-slate-400 block mb-2">Agent Name</label>
                      <input type="text" defaultValue="Sarah" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20" />
                   </div>
                   <div>
                      <label className="text-xs font-medium text-slate-400 block mb-2">Primary Goal</label>
                      <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                         <option>Book Appointment</option>
                         <option>Qualify Lead</option>
                         <option>General Support</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-xs font-medium text-slate-400 block mb-2">Agent Instructions</label>
                   <textarea
                     rows={5}
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20"
                     defaultValue="You are Sarah, a friendly assistant for Acme Growth. Your goal is to qualify leads by asking their budget and current team size, then book them into the strategy call calendar."
                   />
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
                   <Bot className="w-6 h-6 text-brand shrink-0" />
                   <div>
                      <h4 className="font-semibold text-indigo-900 text-sm">Autonomous Mode Enabled</h4>
                      <p className="text-xs text-indigo-700 mt-1">Sarah will automatically respond to incoming SMS and Webchat messages if they match your business intent.</p>
                   </div>
                </div>

                <button className="w-full py-4 bg-brand text-white rounded-2xl font-semibold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                   <Save className="w-4 h-4" /> Save Agent Persona
                </button>
             </div>
           )}

           {activeTab === 'training' && (
             <div className="space-y-6">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                   <h3 className="font-semibold text-slate-900 mb-4">Training Sources</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <button className="p-6 border-2 border-dashed border-slate-100 rounded-2xl hover:border-brand hover:bg-slate-50 transition-all group flex flex-col items-center">
                         <FileText className="w-8 h-8 text-slate-300 group-hover:text-brand mb-2" />
                         <span className="text-xs font-semibold text-slate-500">Upload PDF</span>
                      </button>
                      <button className="p-6 border-2 border-dashed border-slate-100 rounded-2xl hover:border-brand hover:bg-slate-50 transition-all group flex flex-col items-center">
                         <Globe className="w-8 h-8 text-slate-300 group-hover:text-brand mb-2" />
                         <span className="text-xs font-semibold text-slate-500">Crawl Website</span>
                      </button>
                   </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-6 border-b border-slate-50 font-semibold text-slate-900">Current Knowledge</div>
                   <div className="divide-y divide-slate-50">
                      <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                         <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-brand" />
                            <div>
                               <p className="text-sm font-semibold">Pricing_Guide_2024.pdf</p>
                               <p className="text-xs text-slate-400 font-medium">PDF • 12 KB</p>
                            </div>
                         </div>
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="p-4 flex items-center justify-between hover:bg-slate-50">
                         <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-brand" />
                            <div>
                               <p className="text-sm font-semibold">acmegrowth.com/faq</p>
                               <p className="text-xs text-slate-400 font-medium">Website • 42 Pages</p>
                            </div>
                         </div>
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="space-y-6">
           <div className="bg-slate-900 rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">S</div>
                 <div>
                    <h4 className="font-semibold text-white text-sm">Testing Sandbox</h4>
                    <p className="text-xs text-slate-400 font-medium">Chat with Sarah</p>
                 </div>
              </div>
              <div className="space-y-4 h-64 overflow-y-auto mb-6 px-2 scrollbar-hide">
                 <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-xs text-slate-300">
                    Hello! I'm Sarah from Acme Growth. How can I help you today?
                 </div>
                 <div className="bg-brand/20 border border-brand/30 p-3 rounded-2xl rounded-tr-none text-xs text-brand ml-8">
                    Hi Sarah, I'm interested in the Pro plan. Do you offer discounts?
                 </div>
                 <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-xs text-slate-300">
                    Great choice! For the Pro plan, we offer a 20% discount on annual billing. Would you like to see a demo or book a call with our team?
                 </div>
              </div>
              <div className="relative">
                 <input type="text" placeholder="Type a test message..." className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs text-white outline-none ring-1 ring-slate-700 focus:ring-brand transition-all" />
                 <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand text-white rounded-lg"><Play className="w-3 h-3 fill-current" /></button>
              </div>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-brand" /> Performance</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Conversations today</span>
                    <span className="text-xs font-semibold text-slate-900">42</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Booking rate</span>
                    <span className="text-xs font-semibold text-emerald-600">18.5%</span>
                 </div>
                 <div className="w-full h-1 bg-slate-100 rounded-full">
                    <div className="h-full bg-emerald-500 w-[72%] rounded-full"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AIEmployee;
