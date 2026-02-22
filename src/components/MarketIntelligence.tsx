
import React, { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Loader2, ExternalLink, Globe, TrendingUp, Filter, Wand2, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import type { MarketResearchResult } from '../types';
import { NexusHeader } from './NexusUI';

type FocusFilter = 'all' | 'competitors' | 'trends' | 'intent';

const FOCUS_OPTIONS: { value: FocusFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All Topics', description: 'Broad analysis across all areas' },
  { value: 'competitors', label: 'Competitors', description: 'Market positioning & competitive advantages' },
  { value: 'trends', label: 'Trends', description: 'Emerging patterns & industry developments' },
  { value: 'intent', label: 'Consumer Intent', description: 'Buying signals & customer pain points' },
];

const MarketIntelligence: React.FC = () => {
  const { activeSubAccount, notify } = useNexus();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MarketResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleResearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q) return;
    setIsSearching(true);
    setError(null);
    try {
      const focusInstruction = focusFilter === 'competitors' ? ' Focus specifically on competitor analysis, market positioning, and competitive advantages.'
        : focusFilter === 'trends' ? ' Focus specifically on trending search intent, emerging patterns, and recent industry developments.'
        : focusFilter === 'intent' ? ' Focus specifically on consumer search intent, buying signals, and customer pain points.'
        : '';

      const result = await api.post<MarketResearchResult>('/ai/market-research', {
        subAccountId: activeSubAccount?.id,
        query: q + focusInstruction,
      });
      setResults({
        text: result.text,
        sources: result.sources,
      });
    } catch (err: any) {
      const message = err.message || 'Market research failed. Please try again.';
      setError(message);
      notify(message, 'error');
    }
    setIsSearching(false);
  };

  const handleGlobalTrends = () => {
    const trendQuery = 'Top global marketing trends and emerging strategies in 2026';
    setQuery(trendQuery);
    handleResearch(trendQuery);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <NexusHeader title="Market Intelligence" subtitle="Research competitors, analyze markets, and discover growth opportunities">
           <div className="relative" ref={filterRef}>
             <button
               onClick={() => setShowFilterMenu(!showFilterMenu)}
               className={`p-3 border rounded-xl transition-all flex items-center gap-2 ${
                 focusFilter !== 'all'
                   ? 'bg-indigo-50 border-indigo-200 text-brand'
                   : 'bg-white border-slate-200 text-slate-400 hover:text-brand'
               }`}
             >
               <Filter className="w-5 h-5" />
               {focusFilter !== 'all' && (
                 <span className="text-xs font-bold">{FOCUS_OPTIONS.find(o => o.value === focusFilter)?.label}</span>
               )}
             </button>
             {showFilterMenu && (
               <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                 <div className="px-3 py-2 border-b border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Analysis Focus</p>
                 </div>
                 {FOCUS_OPTIONS.map(opt => (
                   <button
                     key={opt.value}
                     onClick={() => { setFocusFilter(opt.value); setShowFilterMenu(false); }}
                     className={`w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between ${
                       focusFilter === opt.value ? 'bg-indigo-50' : 'hover:bg-slate-50'
                     }`}
                   >
                     <div>
                       <p className={`text-sm font-semibold ${focusFilter === opt.value ? 'text-brand' : 'text-slate-700'}`}>{opt.label}</p>
                       <p className="text-[11px] text-slate-400">{opt.description}</p>
                     </div>
                     {focusFilter === opt.value && <Check className="w-4 h-4 text-brand shrink-0" />}
                   </button>
                 ))}
               </div>
             )}
           </div>
           <button
             onClick={handleGlobalTrends}
             disabled={isSearching}
             className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
           >
             {isSearching && query.includes('global marketing trends') ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
             Global Trends
           </button>
      </NexusHeader>

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
           onClick={() => handleResearch()}
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
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                  {results ? results.text : !error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 select-none space-y-4">
                       <Globe className="w-24 h-24 text-slate-300" />
                       <p className="text-xl font-semibold">Enter a niche to research</p>
                       <p className="text-xs max-w-xs mx-auto">Gemini will scan live web data to provide competitor strategies and intent signals.</p>
                    </div>
                  ) : null}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col">
               <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><ExternalLink className="w-5 h-5 text-brand" /> Research Sources</h3>
               <div className="space-y-4 flex-1">
                  {results && results.sources.length > 0 ? results.sources.map((chunk, i) => (
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
