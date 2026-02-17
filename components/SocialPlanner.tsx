
import React from 'react';
import { Share2, Facebook, Instagram, Linkedin, Twitter, Plus, Calendar, Clock, Image as ImageIcon } from 'lucide-react';

const SocialPlanner: React.FC = () => {
  const platforms = [
    { icon: Facebook, color: 'text-blue-600', name: 'Facebook' },
    { icon: Instagram, color: 'text-pink-600', name: 'Instagram' },
    { icon: Linkedin, color: 'text-blue-800', name: 'LinkedIn' },
    { icon: Twitter, color: 'text-sky-500', name: 'X / Twitter' },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Social Planner</h2>
          <p className="text-slate-500 text-sm">Schedule and manage your posts across all platforms</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
          <Plus className="w-5 h-5" /> Create New Post
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {platforms.map(p => (
          <div key={p.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <p.icon className={`w-8 h-8 ${p.color} mb-4`} />
            <h4 className="font-bold text-slate-900">{p.name}</h4>
            <p className="text-xs text-slate-500 mt-1">Connected as @nexus_agency</p>
            <button className="mt-4 text-xs font-bold text-brand hover:underline">Sync Feed</button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Scheduled Queue</h3>
            <button className="text-sm font-bold text-slate-500 hover:text-brand">View Calendar</button>
         </div>
         <div className="p-6 flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
               <Calendar className="w-10 h-10 text-slate-400" />
            </div>
            <h4 className="font-bold text-slate-800">No Posts Scheduled</h4>
            <p className="text-sm text-slate-500 max-w-xs mt-2">Start growing your audience by scheduling your first cross-platform post.</p>
         </div>
      </div>
    </div>
  );
};

export default SocialPlanner;
