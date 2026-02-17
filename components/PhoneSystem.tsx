
import React, { useState } from 'react';
// Added RefreshCw to the imports
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, MoreHorizontal, User, Play, Clock, Mic, Volume2, Grid, X, RefreshCw } from 'lucide-react';
import { CallLog } from '../types';

const PhoneSystem: React.FC = () => {
  const [showDialer, setShowDialer] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const callLogs: CallLog[] = [
    { id: 'c1', contactName: 'John Doe', direction: 'outbound', duration: '5:24', status: 'completed', timestamp: 'Today, 2:15 PM' },
    { id: 'c2', contactName: 'Jane Smith', direction: 'inbound', duration: '0:00', status: 'missed', timestamp: 'Today, 11:45 AM' },
    { id: 'c3', contactName: 'Mike Ross', direction: 'inbound', duration: '12:10', status: 'completed', timestamp: 'Yesterday, 4:30 PM' },
  ];

  const handleDial = (num: string) => setPhoneNumber(prev => prev + num);

  return (
    <div className="h-full flex gap-6 relative">
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Call History</h2>
            <p className="text-xs text-slate-500 mt-1">Unified logs for outbound and inbound calls</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search logs..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {callLogs.map(log => (
            <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${log.status === 'missed' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  {log.direction === 'inbound' ? <PhoneIncoming className="w-5 h-5" /> : <PhoneOutgoing className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{log.contactName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-slate-400">{log.timestamp}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-xs font-medium text-slate-400">{log.duration}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-lg"><Play className="w-4 h-4" /></button>
                <button className="p-2 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-lg"><Phone className="w-4 h-4" /></button>
                <button className="p-2 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-lg"><MoreHorizontal className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Dialer Simulation */}
      <div className={`
        fixed bottom-8 right-8 w-80 bg-slate-900 rounded-xl shadow-md transition-all duration-500 transform
        ${showDialer ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-90 pointer-events-none'}
      `}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-slate-500">Dialer</span>
            <button onClick={() => setShowDialer(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="mb-8 text-center">
             <input
               type="text"
               value={phoneNumber}
               readOnly
               className="bg-transparent border-none text-white text-3xl font-bold w-full text-center focus:ring-0"
               placeholder="000-000-0000"
             />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map(num => (
              <button
                key={num}
                onClick={() => handleDial(num.toString())}
                className="w-14 h-14 rounded-full bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 transition-all mx-auto"
              >
                {num}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6">
             <button onClick={() => setPhoneNumber('')} className="p-4 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700"><RefreshCw className="w-6 h-6" /></button>
             <button className="p-5 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/20 hover:opacity-90"><Phone className="w-8 h-8 fill-current" /></button>
             <button className="p-4 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700"><Mic className="w-6 h-6" /></button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowDialer(!showDialer)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-brand text-white rounded-full shadow-xl shadow-indigo-200 flex items-center justify-center transition-transform z-50"
      >
        <Grid className="w-8 h-8" />
      </button>
    </div>
  );
};

export default PhoneSystem;
