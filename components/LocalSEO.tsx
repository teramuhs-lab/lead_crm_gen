
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
  Map, Search, Target, Loader2, Star, MapPin,
  Compass, Briefcase, ChevronRight, LocateFixed,
  UserPlus, Zap, ArrowRight, MessageSquare
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';

const LocalSEO: React.FC = () => {
  const { addContact, notify } = useNexus();
  const [location, setLocation] = useState('San Francisco, CA');
  const [industry, setIndustry] = useState('Plumbers');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocation("Current Location");
      }, (err) => console.debug("Geolocation denied", err));
    }
  }, []);

  const handleProspect = async () => {
    setIsSearching(true);
    setResults(null);
    setSources([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Find 5 ${industry} in ${location} that have low Google ratings or few reviews.
      List them clearly. For each one, provide:
      1. Business Name
      2. Their specific "Reputation Gap" (why they need help)
      3. A recommended outreach strategy.`;

      const config: any = { tools: [{googleMaps: {}}] };
      if (coords && location === "Current Location") {
        config.toolConfig = {
          retrievalConfig: { latLng: { latitude: coords.lat, longitude: coords.lng } }
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: config,
      });

      setResults(response.text || '');
      setSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
    } catch (err) {
      console.error(err);
      notify("Search failed. Check API configuration.", "error");
    }
    setIsSearching(false);
  };

  const handleInitializeLead = (source: any) => {
    const businessName = source.maps?.title || "New Prospect";
    addContact({
      name: businessName,
      email: `contact@${businessName.toLowerCase().replace(/\s+/g, '')}.com`,
      source: 'Local SEO Discovery',
      status: 'Lead',
      tags: ['Reputation Management', 'SEO Prospect'],
      leadScore: 65,
    });
    notify(`${businessName} added to CRM & Nurture Workflow triggered.`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
              <Map className="w-6 h-6" />
           </div>
           <div>
              <h2 className="text-xl font-bold text-slate-900">Local Prospector</h2>
              <p className="text-xs text-slate-500 mt-0.5">Find local businesses needing reputation management</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
         {/* Search Controls */}
         <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
               <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 ml-1">Industry</label>
                  <div className="relative">
                     <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                     <input
                       type="text"
                       value={industry}
                       onChange={(e) => setIndustry(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand/10"
                     />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 ml-1">Location</label>
                  <div className="relative">
                     <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                     <input
                       type="text"
                       value={location}
                       onChange={(e) => setLocation(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand/10"
                     />
                     {coords && (
                        <button onClick={() => setLocation("Current Location")} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand transition-transform">
                          <LocateFixed className="w-3.5 h-3.5" />
                        </button>
                     )}
                  </div>
               </div>
               <button
                 onClick={handleProspect}
                 disabled={isSearching}
                 className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 hover:bg-brand transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
               >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {isSearching ? 'Scanning...' : 'Find Leads'}
               </button>
            </div>

            <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
               <div className="relative z-10">
                  <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 fill-white" /> Pro Strategy
                  </h4>
                  <p className="text-xs text-indigo-100 leading-relaxed italic opacity-90">
                    "Look for '3-star' businesses with high review counts. They care about their profile but are struggling to maintain it."
                  </p>
               </div>
               <Compass className="absolute -bottom-4 -right-4 w-20 h-20 text-white/10 rotate-12" />
            </div>
         </div>

         {/* Results Display */}
         <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Lead Scan Results
                  </h3>
                  {results && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Live Data</span>}
               </div>

               <div className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap text-slate-700 leading-relaxed text-sm font-medium">
                  {results ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                      {results}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 select-none space-y-4">
                       <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                          <Target className="w-8 h-8 text-slate-300" />
                       </div>
                       <div>
                          <p className="text-sm font-semibold text-slate-500">No leads found yet</p>
                          <p className="text-xs mt-1 text-slate-400">Configure your target industry and location to start scouting.</p>
                       </div>
                    </div>
                  )}
               </div>

               {sources.length > 0 && (
                 <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400 mb-3 ml-2">Locations Found</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {sources.map((chunk: any, i: number) => (
                         <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-brand transition-all group">
                            <div className="flex items-center gap-3 overflow-hidden">
                               <div className="w-8 h-8 bg-indigo-50 text-brand rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                                  {i + 1}
                               </div>
                               <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{chunk.maps?.title || 'Unknown Business'}</p>
                                  <span className="text-xs font-bold text-slate-400 truncate block">Rating: {chunk.maps?.rating || 'Low'}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button
                                 onClick={() => handleInitializeLead(chunk)}
                                 className="p-2 text-slate-400 hover:text-brand hover:bg-indigo-50 rounded-lg transition-all"
                                 title="Add to CRM"
                               >
                                  <UserPlus className="w-4 h-4" />
                               </button>
                               <a href={chunk.maps?.uri} target="_blank" className="p-2 text-slate-400 hover:text-slate-900">
                                  <ArrowRight className="w-4 h-4" />
                               </a>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LocalSEO;
