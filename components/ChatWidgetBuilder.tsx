
import React, { useState } from 'react';
// Added X to the imports
import { MessageSquareCode, Palette, MessageSquare, Save, Settings, Phone, Smile, Send, CheckCircle2, X } from 'lucide-react';

const ChatWidgetBuilder: React.FC = () => {
  const [bubbleColor, setBubbleColor] = useState('#6366f1');
  const [greeting, setGreeting] = useState('Hi! How can we help you today?');
  const [widgetName, setWidgetName] = useState('Nexus Chat');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Web Chat Widget</h2>
          <p className="text-sm text-slate-500">Customize the chat bubble your clients embed on their websites</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
          <Save className="w-4 h-4" /> Save & Get Code
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Palette className="w-5 h-5 text-brand" /> Visual Styling</h3>

              <div>
                 <label className="text-xs font-medium text-slate-400 block mb-2">Widget Name</label>
                 <input
                   type="text"
                   value={widgetName}
                   onChange={(e) => setWidgetName(e.target.value)}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                 />
              </div>

              <div>
                 <label className="text-xs font-medium text-slate-400 block mb-2">Bubble Color</label>
                 <div className="flex gap-3">
                    {['#6366f1', '#0ea5e9', '#10b981', '#f43f5e', '#000000'].map(c => (
                      <button
                        key={c}
                        onClick={() => setBubbleColor(c)}
                        className={`w-10 h-10 rounded-full border-4 ${bubbleColor === c ? 'border-white ring-2 ring-brand' : 'border-transparent'}`}
                        style={{backgroundColor: c}}
                      />
                    ))}
                 </div>
              </div>

              <div>
                 <label className="text-xs font-medium text-slate-400 block mb-2">Welcome Greeting</label>
                 <textarea
                   rows={3}
                   value={greeting}
                   onChange={(e) => setGreeting(e.target.value)}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                 />
              </div>
           </div>

           <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 space-y-4">
              <div className="flex items-center gap-3">
                 <Settings className="w-5 h-5 text-brand" />
                 <h4 className="font-bold text-indigo-900">Advanced Behavior</h4>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                 <span className="text-xs font-bold text-indigo-700">Mobile Only</span>
                 <div className="w-8 h-4 bg-slate-200 rounded-full"></div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                 <span className="text-xs font-bold text-indigo-700">Auto-Open Popup</span>
                 <div className="w-8 h-4 bg-brand rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
              </label>
           </div>
        </div>

        <div className="lg:col-span-2 bg-slate-100 rounded-xl p-6 border-8 border-white shadow-md relative overflow-hidden flex items-center justify-center min-h-[600px]">
           <div className="text-center space-y-4 opacity-20 select-none">
              <h4 className="text-3xl font-semibold text-slate-400">Mock Website Preview</h4>
              <p className="text-sm font-bold text-slate-400">The chat bubble appears in the bottom right corner</p>
           </div>

           {/* Live Widget Preview */}
           <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-80 bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100">
                 <div className="p-4 flex items-center justify-between text-white" style={{backgroundColor: bubbleColor}}>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-semibold">N</div>
                       <div>
                          <p className="font-bold text-sm leading-none">{widgetName}</p>
                          <p className="text-xs opacity-80 mt-1">Online & Ready</p>
                       </div>
                    </div>
                    <X className="w-4 h-4 opacity-50" />
                 </div>
                 <div className="p-6 bg-slate-50 h-48 flex flex-col justify-end gap-4 overflow-y-auto thin-scrollbar">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm self-start">
                       <p className="text-xs text-slate-700">{greeting}</p>
                    </div>
                 </div>
                 <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
                    <input type="text" placeholder="Type a message..." className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs outline-none" />
                    <button className="p-2 text-white rounded-xl shadow-lg" style={{backgroundColor: bubbleColor}}><Send className="w-4 h-4" /></button>
                 </div>
              </div>
              <button className="w-16 h-16 rounded-full shadow-md flex items-center justify-center text-white transform transition-transform" style={{backgroundColor: bubbleColor}}>
                 <MessageSquare className="w-8 h-8" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidgetBuilder;
