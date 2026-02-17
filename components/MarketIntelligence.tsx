
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Search, Sparkles, Loader2, ExternalLink, Globe, TrendingUp, Filter, Wand2 } from 'lucide-react';

const MarketIntelligence: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{text: string, sources: any[]} | null>(null);

  const handleResearch = async () => {
    if (!query) return;
    setIsSearching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the current market landscape for: ${query}. Focus on competitors, trending search intent, and recent news. Provide actionable marketing advice.`,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      setResults({
        text: response.text || '',
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      });
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">Market Intelligence</h2>
          <p className="text-sm text-slate-500">Real-time competitor research powered by Gemini & Google Search</p>
        </div>
        <div className="flex gap-2">
           <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand transition-all"><Filter className="w-5 h-5" /></button>
           <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Global Trends</button>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xl overflow-hidden focus-within:ring-4 focus-within:ring-brand/10 transition-all flex items-center">
         <div className="flex items-center gap-4 px-6 flex-1">
            <Search className="w-6 h-6 text-slate-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Current trends in residential HVAC marketing in Miami..."
              className="w-full py-6 bg-transparent border-none focus:ring-0 text-lg font-medium placeholder:text-slate-300"
              onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
            />
         </div>
         <button
           onClick={handleResearch}
           disabled={isSearching || !query}
           className="m-2 px-8 py-5 bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center gap-3 hover:bg-brand disabled:opacity-20 transition-all"
         >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isSearching ? 'Thinking...' : 'Get Insights'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2"><Wand2 className="w-5 h-5 text-brand" /> Strategic Analysis</h3>
                  {results && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Analysis Complete</span>}
               </div>
               <div className="p-10 flex-1 whitespace-pre-wrap text-slate-700 leading-relaxed text-sm font-medium">
                  {results ? results.text : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 select-none space-y-4">
                       <Globe className="w-24 h-24 text-slate-300" />
                       <p className="text-xl font-semibold">Enter a niche to research</p>
                       <p className="text-xs max-w-xs mx-auto">Gemini will scan live web data to provide competitor strategies and intent signals.</p>
                    </div>
                  )}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col">
               <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><ExternalLink className="w-5 h-5 text-brand" /> Research Sources</h3>
               <div className="space-y-4 flex-1">
                  {results && results.sources.length > 0 ? results.sources.map((chunk: any, i: number) => (
                    <a
                      key={i}
                      href={chunk.web?.uri || '#'}
                      target="_blank"
                      className="block p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand hover:bg-white transition-all group"
                    >
                       <p className="text-xs font-semibold text-brand mb-1 truncate">{chunk.web?.title || 'Source Reference'}</p>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600 truncate">{chunk.web?.uri || 'Click to visit'}</span>
                          <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-brand" />
                       </div>
                    </a>
                  )) : (
                    <div className="py-12 text-center opacity-30 select-none">
                       <p className="text-xs font-bold italic">No sources loaded yet</p>
                    </div>
                  )}
               </div>
               <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <p className="text-xs font-semibold text-indigo-700">Note</p>
                  <p className="text-sm text-indigo-800 leading-snug mt-1">Grounding with Google Search ensures the AI doesn't hallucinate news or market trends.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MarketIntelligence;
