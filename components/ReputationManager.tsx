
import React from 'react';
import { Star, MessageSquare, Send, ThumbsUp, TrendingUp, Search, MoreHorizontal } from 'lucide-react';

const ReputationManager: React.FC = () => {
  const reviews = [
    { id: 'r1', author: 'Samantha Wills', platform: 'Google', rating: 5, content: 'Absolutely loved the service. The team was extremely professional and responsive!', date: '2 days ago' },
    { id: 'r2', author: 'Mark Davidson', platform: 'Facebook', rating: 4, content: 'Great platform, really helped our marketing. A bit of a learning curve but worth it.', date: '1 week ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reputation Management</h2>
          <p className="text-slate-500 text-sm">Monitor reviews and automate your review request campaigns</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90">
          <Send className="w-4 h-4" /> Send Review Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-400">Average Rating</span>
              <div className="p-1 bg-emerald-50 rounded text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-slate-900">4.8</span>
              <div className="flex text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
           </div>
           <p className="text-xs text-slate-500 mt-2">+0.2 from last month</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-400">Sent Requests</span>
              <MessageSquare className="w-4 h-4 text-brand" />
           </div>
           <span className="text-4xl font-semibold text-slate-900">142</span>
           <p className="text-xs text-slate-500 mt-2">68% response rate</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-400">Positive Sentiment</span>
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
           </div>
           <span className="text-4xl font-semibold text-slate-900">92%</span>
           <p className="text-xs text-slate-500 mt-2">Highly favorable feedback</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Reviews</h3>
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input type="text" placeholder="Search reviews..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            </div>
         </div>
         <div className="divide-y divide-slate-100">
            {reviews.map(review => (
              <div key={review.id} className="p-6 hover:bg-slate-50 transition-colors flex gap-4">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${review.platform === 'Google' ? 'bg-red-500' : 'bg-blue-600'}`}>
                    {review.platform.charAt(0)}
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                       <h4 className="font-bold text-slate-900">{review.author}</h4>
                       <span className="text-xs text-slate-400">{review.date}</span>
                    </div>
                    <div className="flex text-amber-400 mb-2">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                       ))}
                    </div>
                    <p className="text-sm text-slate-600 italic">"{review.content}"</p>
                    <div className="mt-4 flex gap-2">
                       <button className="text-xs font-bold text-brand hover:underline">Reply Publicly</button>
                       <span className="text-slate-300">|</span>
                       <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Flag Review</button>
                    </div>
                 </div>
                 <button className="p-2 text-slate-400 hover:text-slate-900 self-start"><MoreHorizontal className="w-5 h-5" /></button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ReputationManager;
