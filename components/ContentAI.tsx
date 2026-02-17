
import React, { useState } from 'react';
import { Wand2, Layout, Mail, Share2, Sparkles, Copy, RefreshCw, Send, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { generateMarketingCopy } from '../services/geminiService';

const ContentAI: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeType, setActiveType] = useState<'email' | 'social' | 'ads'>('email');

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    const fullPrompt = `${activeType.toUpperCase()} content for: ${prompt}`;
    const result = await generateMarketingCopy(fullPrompt);
    setGeneratedText(result || "Error generating content.");
    setIsGenerating(false);
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-semibold text-slate-900">Content AI Generator</h2>
           <p className="text-sm text-slate-500">Create high-converting copy in seconds with Gemini</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition-all">Prompt Library</button>
           <button className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"><Sparkles className="w-4 h-4" /> Go Pro</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <label className="text-xs font-medium text-slate-400 block">Choose Content Type</label>
              <div className="grid grid-cols-1 gap-2">
                 {[
                   { id: 'email', label: 'Email Broadcast', icon: Mail },
                   { id: 'social', label: 'Social Post', icon: Share2 },
                   { id: 'ads', label: 'Ad Headlines', icon: Layout }
                 ].map(type => (
                   <button
                     key={type.id}
                     onClick={() => setActiveType(type.id as any)}
                     className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${activeType === type.id ? 'bg-indigo-50 border-brand text-brand font-semibold' : 'border-slate-50 hover:bg-slate-50 text-slate-500 font-medium'}`}
                   >
                     <type.icon className="w-5 h-5" />
                     <span className="text-sm">{type.label}</span>
                   </button>
                 ))}
              </div>
           </div>

           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <label className="text-xs font-medium text-slate-400 block">Topic & Tone</label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What are we writing today?"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {isGenerating ? 'AI is thinking...' : 'Generate Magic Copy'}
              </button>
           </div>
        </div>

        <div className="lg:col-span-2 flex flex-col">
           <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur">
                 <h3 className="font-bold text-slate-900">Generated Output</h3>
                 <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-brand transition-colors"><RefreshCw className="w-5 h-5" /></button>
                    <button className="p-2 text-slate-400 hover:text-brand transition-colors"><Copy className="w-5 h-5" /></button>
                 </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap text-slate-700 leading-relaxed text-sm font-medium">
                 {generatedText ? (
                   <div className="space-y-4">
                      {generatedText}
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                      <Wand2 className="w-20 h-20 mb-4" />
                      <p className="text-lg font-semibold">Input a prompt to begin</p>
                      <p className="text-xs mt-1">Your AI-generated marketing copy will appear here.</p>
                   </div>
                 )}
              </div>
              <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-brand" /></div>
                    <span className="text-xs font-medium text-slate-400">Ready to apply</span>
                 </div>
                 <button className="px-6 py-2.5 bg-brand text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 hover:opacity-90 transition-all">
                    Send to Social Planner <Send className="w-3.5 h-3.5" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ContentAI;
