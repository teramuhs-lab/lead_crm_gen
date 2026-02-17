
import React from 'react';
// Added Settings2 to the imports
import { MessageCircle, Users, Hash, TrendingUp, MoreHorizontal, MessageSquare, Plus, Bell, Settings2 } from 'lucide-react';

const CommunityHub: React.FC = () => {
  const channels = [
    { id: 'c1', name: 'General Discussion', members: 450, lastPost: '2m ago' },
    { id: 'c2', name: 'Student Feedback', members: 128, lastPost: '1h ago' },
    { id: 'c3', name: 'Q&A Support', members: 210, lastPost: '15m ago' },
    { id: 'c4', name: 'Networking Lounge', members: 89, lastPost: 'Yesterday' },
  ];

  return (
    <div className="h-full flex gap-6 bg-slate-50">
      <div className="w-64 bg-white border border-slate-200 rounded-xl flex flex-col shrink-0 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
           <h3 className="font-semibold text-slate-900 text-sm">Channels</h3>
           <Plus className="w-4 h-4 text-slate-400 cursor-pointer hover:text-brand" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {channels.map(channel => (
             <button key={channel.id} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${channel.id === 'c1' ? 'bg-indigo-50 text-brand font-bold' : 'hover:bg-slate-50 text-slate-500 font-medium'}`}>
                <div className="flex items-center gap-2">
                   <Hash className={`w-4 h-4 ${channel.id === 'c1' ? 'text-brand' : 'text-slate-300'}`} />
                   <span className="text-xs truncate">{channel.name}</span>
                </div>
                {channel.id === 'c1' && <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>}
             </button>
           ))}
        </div>
        <div className="p-4 bg-slate-50 mt-auto border-t border-slate-100">
           <div className="flex items-center gap-3">
              <img src="https://picsum.photos/seed/user/32/32" className="w-8 h-8 rounded-full border border-white" alt="" />
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-bold text-slate-900 truncate">Alex Agency</p>
                 <p className="text-xs text-emerald-600 font-medium">Founder</p>
              </div>
              <Settings2 className="w-3 h-3 text-slate-400" />
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
         <div className="h-16 border-b border-slate-50 px-8 flex items-center justify-between bg-white/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-4">
               <h3 className="font-semibold text-slate-900 text-lg"># General Discussion</h3>
               <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">450 Members</span>
            </div>
            <div className="flex items-center gap-3">
               <button className="p-2 text-slate-400 hover:text-brand transition-colors"><Bell className="w-5 h-5" /></button>
               <button className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-md">Invite Member</button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20">
            <div className="flex gap-4">
               <img src="https://picsum.photos/seed/p1/40/40" className="w-10 h-10 rounded-xl" alt="" />
               <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                     <span className="font-semibold text-slate-900 text-sm">Samantha Mills</span>
                     <span className="text-xs text-slate-400">10:42 AM</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl rounded-tl-none border border-slate-100 shadow-sm">
                     Just finished the Marketing Mastery course! The section on workflow branching was a total game-changer for my agency. Highly recommend everyone checks it out! 🚀
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                     <button className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-brand transition-colors">
                        <TrendingUp className="w-3.5 h-3.5" /> 12 Likes
                     </button>
                     <button className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-brand transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" /> 4 Replies
                     </button>
                  </div>
               </div>
            </div>

            <div className="flex gap-4">
               <img src="https://picsum.photos/seed/p2/40/40" className="w-10 h-10 rounded-xl" alt="" />
               <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                     <span className="font-semibold text-slate-900 text-sm">Mark Thompson</span>
                     <span className="text-xs text-slate-400">11:05 AM</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl rounded-tl-none border border-slate-100 shadow-sm">
                     Quick question for the group: How are you guys setting up your retention-based automations? I'm trying to optimize my 'Subscription Cancelled' flow.
                  </p>
               </div>
            </div>
         </div>

         <div className="p-6 border-t border-slate-100 bg-white">
            <div className="relative group">
               <input type="text" placeholder="Share something with the community..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all pr-20" />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-brand transition-colors"><Plus className="w-5 h-5" /></button>
                  <button className="p-2 bg-brand text-white rounded-xl shadow-lg shadow-indigo-200"><MessageCircle className="w-5 h-5" /></button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CommunityHub;
