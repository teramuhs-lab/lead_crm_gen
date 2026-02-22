
import React, { useState, useEffect } from 'react';
import {
  Map, Search, Target, Loader2, Star, MapPin,
  Compass, Briefcase, ChevronRight, ChevronLeft, LocateFixed,
  UserPlus, Zap, MessageSquare, Mail,
  History, Clock, ExternalLink, Sparkles,
  Globe, Phone, Hash, Check, LayoutGrid, List
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import type { LocalSEOResult, SearchResultEntry, EmailSequence, SequenceEmail } from '../types';
import { NexusHeader } from './NexusUI';

const LocalSEO: React.FC = () => {
  const { addContact, notify, activeSubAccount } = useNexus();
  const [location, setLocation] = useState('San Francisco, CA');
  const [industry, setIndustry] = useState('Plumbers');
  const [resultCount, setResultCount] = useState(5);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
  const [pastSearches, setPastSearches] = useState<SearchResultEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [importingIndex, setImportingIndex] = useState<number | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; phase: 'importing' | 'enriching' | 'done' } | null>(null);
  const [enrichmentStats, setEnrichmentStats] = useState<{ emails: number; enriched: number; failed: number; lastContact: string } | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [searchPhase, setSearchPhase] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Cycle through search progress phases while searching
  useEffect(() => {
    if (!isSearching) {
      setSearchPhase(0);
      return;
    }
    const interval = setInterval(() => {
      setSearchPhase(prev => (prev < 4 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [isSearching]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocation("Current Location");
      }, (err) => console.debug("Geolocation denied", err));
    }
  }, []);

  // Load past searches when history tab is opened
  useEffect(() => {
    if (activeTab === 'history' && activeSubAccount?.id) {
      loadPastSearches();
    }
  }, [activeTab, activeSubAccount?.id]);

  const loadPastSearches = async () => {
    if (!activeSubAccount?.id) return;
    setIsLoadingHistory(true);
    try {
      const data = await api.get<SearchResultEntry[]>(`/usage/searches?subAccountId=${activeSubAccount.id}&limit=20`);
      setPastSearches(data.filter(s => s.searchType === 'local_seo'));
    } catch (err) {
      console.error('Failed to load past searches:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleProspect = async () => {
    setIsSearching(true);
    setResults(null);
    setSources([]);
    setBusinesses([]);
    setCurrentPage(1);
    setExpandedRow(null);
    try {
      const result = await api.post<any>('/ai/local-seo', {
        subAccountId: activeSubAccount?.id,
        industry,
        location,
        resultCount,
        ...(coords && location === 'Current Location' ? { coords } : {}),
      });

      setResults(result.text);

      if (result.fromDatabase) {
        notify(`Found ${result.existingCount} existing contacts in your CRM — no API call needed.`, 'info');
      } else if (result.cached) {
        const ageHrs = Math.round(result.cacheAge / 60);
        notify(`Loaded from search cache (${ageHrs > 0 ? ageHrs + 'h' : result.cacheAge + 'min'} ago) — no API call needed.`, 'info');
      }

      let newSources: any[] = [];
      if (result.dataSource === 'apify' && result.businesses) {
        setBusinesses(result.businesses);
        newSources = result.sources || [];
      } else {
        setBusinesses([]);
        newSources = (result.sources || []).filter((s: any) => s.maps?.title);
      }
      setSources(newSources);

      // Auto-switch to list view for large result sets
      setViewMode(newSources.length > 12 ? 'list' : 'grid');
    } catch (err) {
      console.error(err);
      notify("Search failed. Check API configuration.", "error");
    }
    setIsSearching(false);
  };

  // Parse business details — uses Apify structured data when available, regex fallback for Gemini
  const parseBusinessDetails = (businessName: string, source?: any) => {
    // If we have structured Apify data on the source, use it directly
    if (source?.structured) {
      const s = source.structured;
      // Try to find reputation gap + outreach from the Gemini analysis text
      let reputationGap = '';
      let outreach = '';
      if (results) {
        const nameEscaped = businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameIdx = results.search(new RegExp(nameEscaped, 'i'));
        if (nameIdx !== -1) {
          const section = results.slice(nameIdx, nameIdx + 2000);
          const gapMatch = section.match(/\*?\*?Reputation Gap\*?\*?[:\s—-]+([^\n*]+)/i);
          const outreachMatch = section.match(/\*?\*?(?:Recommended )?Outreach\*?\*?[:\s—-]+([^\n*]+)/i);
          reputationGap = gapMatch?.[1]?.trim() || '';
          outreach = outreachMatch?.[1]?.trim() || '';
        }
      }
      return {
        website: s.website || '',
        email: '',
        phone: s.phone || '',
        ownerName: '',
        reputationGap,
        outreach,
      };
    }

    // Fallback: regex parsing for Gemini-sourced results (backward compat + saved searches)
    if (!results) return { website: '', email: '', phone: '', ownerName: '', reputationGap: '', outreach: '' };

    const text = results;
    const nameEscaped = businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameIdx = text.search(new RegExp(nameEscaped, 'i'));
    if (nameIdx === -1) return { website: '', email: '', phone: '', ownerName: '', reputationGap: '', outreach: '' };

    const section = text.slice(nameIdx, nameIdx + 2000);

    const clean = (v?: string) => v?.trim().replace(/^not found$/i, '').replace(/^n\/a$/i, '') || '';
    const websiteMatch = section.match(/\*?\*?Website\*?\*?[:\s—-]+([^\n*]+)/i);
    const emailMatch = section.match(/\*?\*?Email\*?\*?[:\s—-]+([^\n*]+)/i);
    const phoneMatch = section.match(/\*?\*?Phone\*?\*?[:\s—-]+([^\n*]+)/i);
    const ownerMatch = section.match(/\*?\*?Owner(?:\s*Name)?\*?\*?\s*[:\s—-]+\s*([^\n*]+)/i);
    const gapMatch = section.match(/\*?\*?Reputation Gap\*?\*?[:\s—-]+([^\n*]+)/i);
    const outreachMatch = section.match(/\*?\*?(?:Recommended )?Outreach\*?\*?[:\s—-]+([^\n*]+)/i);

    let ownerRaw = clean(ownerMatch?.[1]);
    if (ownerRaw.toLowerCase().startsWith('name:')) ownerRaw = ownerRaw.slice(5).trim();

    return {
      website: clean(websiteMatch?.[1]),
      email: clean(emailMatch?.[1]),
      phone: clean(phoneMatch?.[1]),
      ownerName: ownerRaw,
      reputationGap: gapMatch?.[1]?.trim() || '',
      outreach: outreachMatch?.[1]?.trim() || '',
    };
  };

  // Extract place_id from Apify Google Maps URL (query_place_id=ChIJ...)
  const extractPlaceId = (source: any): string | undefined => {
    const url = source.maps?.uri || '';
    const match = url.match(/query_place_id=([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    if (url.startsWith('places/')) return url;
    return undefined;
  };

  // Build full customFields from Apify structured data + parsed details
  const buildCustomFields = (source: any, details: ReturnType<typeof parseBusinessDetails>) => {
    const biz = businesses.find((b: any) => b.title === (source.maps?.title || ''));
    const placeId = extractPlaceId(source);

    // Base fields (always present)
    const fields: Record<string, any> = {
      google_rating: source.maps?.rating || '',
      google_maps_url: source.maps?.uri || '',
      place_id: placeId,
      website: source.structured?.website || details.website,
      owner_name: details.ownerName || undefined,
      email_from_search: details.email || undefined,
      industry,
      location,
      reputation_gap: details.reputationGap,
      outreach_strategy: details.outreach,
      discovery_date: new Date().toISOString().split('T')[0],
      data_source: source.structured ? 'apify' : 'gemini',
    };

    // Apify-enriched fields (when structured data is available)
    if (biz) {
      fields.total_score = biz.totalScore;
      fields.review_count = biz.reviewsCount;
      fields.address = biz.address || '';
      fields.street = biz.street || '';
      fields.city = biz.city || '';
      fields.state = biz.state || '';
      fields.country_code = biz.countryCode || '';
      fields.category_name = biz.categoryName || '';
      fields.categories = biz.categories || [];
    } else {
      fields.address = source.structured?.address || '';
      fields.review_count = source.structured?.reviewsCount;
      fields.categories = source.structured?.categories || [];
      fields.category_name = source.structured?.categoryName || '';
    }

    return fields;
  };

  const handleInitializeLead = async (source: any, idx: number) => {
    const businessName = source.maps?.title || "New Prospect";
    const details = parseBusinessDetails(businessName, source);

    setImportingIndex(idx);

    try {
      const saved = await api.post<any>('/contacts', {
        subAccountId: activeSubAccount?.id,
        name: businessName,
        email: details.email || '',
        phone: source.structured?.phone || details.phone || '',
        source: 'Local SEO Discovery',
        status: 'Lead',
        tags: ['Reputation Management', 'SEO Prospect', industry],
        customFields: buildCustomFields(source, details),
      });

      notify(`${businessName} added to CRM. Enriching lead data...`, 'info');

      // 2. Enrich the lead (find email, owner, services, pain points)
      if (saved?.id && activeSubAccount?.id) {
        try {
          const enrichResult = await api.post<any>('/ai/enrich-lead', {
            contactId: saved.id,
            subAccountId: activeSubAccount.id,
          });
          if (enrichResult?.enrichedEmail) {
            notify(`Found email for ${businessName}: ${enrichResult.enrichedEmail}`, 'info');
          } else {
            notify(`No email found for ${businessName}. Will use SMS outreach.`, 'warning');
          }

          // 3. Auto-create sequence — SMS-first if no email, email if available
          const hasEmail = !!enrichResult?.enrichedEmail;
          const hasPhone = !!details.phone;

          if (saved?.id && activeSubAccount?.id && (hasEmail || hasPhone)) {
            const seq = await api.post<EmailSequence>('/sequences', {
              subAccountId: activeSubAccount.id,
              name: `${businessName} Outreach`,
            });

            // Switch to SMS channel if no email but has phone
            if (!hasEmail && hasPhone && seq.emails?.length) {
              for (const email of seq.emails) {
                await api.put(`/sequences/${seq.id}/emails/${email.id}`, { channel: 'sms' });
              }
            }

            await api.post<{ emails: SequenceEmail[] }>(`/sequences/${seq.id}/generate`, {
              contactId: saved.id,
              subAccountId: activeSubAccount.id,
            });

            await api.post(`/sequences/${seq.id}/enroll`, { contactId: saved.id });
            notify(`${hasEmail ? 'Email' : 'SMS'} sequence started for ${businessName}`, 'info');
          }
        } catch (enrichErr: any) {
          console.error('Enrichment/sequence failed:', enrichErr);
          notify(`Enrichment skipped for ${businessName}. Continuing...`, 'warning');
        }
      }
    } catch (err) {
      console.error('Failed to import lead:', err);
      notify('Failed to import lead', 'error');
    } finally {
      setImportingIndex(null);
    }
  };

  const handleBulkImport = async () => {
    if (!sources.length || isBulkImporting) return;
    setIsBulkImporting(true);
    setEnrichmentStats(null);

    // Phase 1: Import all contacts rapidly (no enrichment, no gaps)
    setBulkProgress({ current: 0, total: sources.length, phase: 'importing' });
    const importedIds: string[] = [];
    let importFails = 0;

    for (let i = 0; i < sources.length; i++) {
      setBulkProgress({ current: i + 1, total: sources.length, phase: 'importing' });
      const source = sources[i];
      const businessName = source.maps?.title || 'New Prospect';
      const details = parseBusinessDetails(businessName, source);

      try {
        const saved = await api.post<any>('/contacts', {
          subAccountId: activeSubAccount?.id,
          name: businessName,
          email: details.email || '',
          phone: source.structured?.phone || details.phone || '',
          source: 'Local SEO Discovery',
          status: 'Lead',
          tags: ['Reputation Management', 'SEO Prospect', industry],
          customFields: buildCustomFields(source, details),
        });
        if (saved?.id && !saved.duplicate) importedIds.push(saved.id);
      } catch (err) {
        console.error(`Failed to import ${businessName}:`, err);
        importFails++;
      }
    }

    if (importedIds.length === 0) {
      setIsBulkImporting(false);
      setBulkProgress(null);
      notify(importFails > 0 ? `Import failed: ${importFails} errors` : 'All contacts already imported (no duplicates created)', importFails > 0 ? 'error' : 'info');
      return;
    }

    notify(`${importedIds.length} new contacts imported. Starting batch enrichment...`, 'info');

    // Phase 2: Batch enrich all contacts (server-side, rate-limit-aware)
    try {
      console.log('[bulk-import] Starting batch enrichment for', importedIds.length, 'contacts. subAccountId:', activeSubAccount?.id);
      const batch = await api.post<{ batchId: string; total: number }>('/ai/batch-enrich', {
        contactIds: importedIds,
        subAccountId: activeSubAccount?.id,
      });
      console.log('[bulk-import] Batch started:', batch.batchId, 'total:', batch.total);

      setBulkProgress({ current: 0, total: batch.total, phase: 'enriching' });
      setEnrichmentStats({ emails: 0, enriched: 0, failed: 0, lastContact: '' });

      // Phase 3: Poll for progress every 5 seconds
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const progress = await api.get<any>(`/ai/batch-enrich/${batch.batchId}`);
          setBulkProgress({ current: progress.processed, total: progress.total, phase: progress.status === 'completed' || progress.status === 'failed' ? 'done' : 'enriching' });

          const emailCount = progress.results.filter((r: any) => r.enrichedEmail).length;
          const enrichedCount = progress.results.filter((r: any) => r.status === 'success').length;
          const failedCount = progress.results.filter((r: any) => r.status === 'failed').length;
          const lastResult = progress.results[progress.results.length - 1];
          setEnrichmentStats({
            emails: emailCount,
            enriched: enrichedCount,
            failed: failedCount,
            lastContact: lastResult?.contactName || '',
          });

          if (progress.status === 'completed' || progress.status === 'failed') {
            done = true;
            notify(
              `Enrichment complete: ${enrichedCount}/${progress.total} enriched, ${emailCount} emails found`,
              emailCount > 0 ? 'info' : 'warning'
            );
            // Keep the done state visible for 5 seconds before clearing
            await new Promise(r => setTimeout(r, 5000));
          }
        } catch (pollErr) {
          console.error('Poll failed:', pollErr);
        }
      }
    } catch (err: any) {
      console.error('[bulk-import] Batch enrichment failed:', err);
      notify(`Enrichment failed: ${err.message || 'Unknown error'}. Contacts were imported.`, 'error');
    }

    setIsBulkImporting(false);
    setBulkProgress(null);
    setEnrichmentStats(null);
  };

  const handleReloadSearch = (entry: SearchResultEntry) => {
    const result = entry.result as { text: string; sources: any[]; businesses?: any[]; dataSource?: string };
    setResults(result.text);

    let newSources: any[] = [];
    if (result.dataSource === 'apify' && result.businesses) {
      setBusinesses(result.businesses);
      newSources = result.sources || [];
    } else {
      setBusinesses([]);
      newSources = (result.sources || []).filter((s: any) => s.maps?.title);
    }
    setSources(newSources);
    setCurrentPage(1);
    setExpandedRow(null);
    setViewMode(newSources.length > 12 ? 'list' : 'grid');

    // Parse query to restore industry/location
    const parts = entry.query.split(' in ');
    if (parts.length === 2) {
      setIndustry(parts[0]);
      setLocation(parts[1]);
    }
    setActiveTab('search');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto h-full flex flex-col pb-20 animate-in fade-in duration-500">
      <NexusHeader title="Local Prospector" subtitle="Optimize your local search presence and manage business listings">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'search' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Past Searches
          </button>
        </div>
      </NexusHeader>

      {activeTab === 'search' && (
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
                 <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 ml-1">Results <span className="text-slate-300">(1–500)</span></label>
                    <div className="relative">
                       <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                       <input
                         type="number"
                         min={1}
                         max={500}
                         value={resultCount}
                         onChange={(e) => setResultCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand/10"
                       />
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

              {/* Import info card */}
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Smart Import
                </h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Click the <UserPlus className="w-3 h-3 inline" /> button to import a lead with full Local SEO data and auto-start an AI email sequence.
                </p>
              </div>
           </div>

           {/* Results Display */}
           <div className="lg:col-span-3 space-y-4">
              {/* Header bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Lead Scan Results
                      {sources.length > 0 && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {sources.length} found
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* View toggle */}
                      {sources.length > 0 && (
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                          <button
                            onClick={() => { setViewMode('grid'); setExpandedRow(null); }}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Grid view"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setViewMode('list'); setExpandedRow(null); }}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            title="List view"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Page size selector */}
                      {sources.length > pageSize && (
                        <select
                          value={pageSize}
                          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                          className="text-[11px] font-bold text-slate-600 bg-slate-100 border-0 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                        >
                          <option value={10}>10 / page</option>
                          <option value={20}>20 / page</option>
                          <option value={50}>50 / page</option>
                        </select>
                      )}

                      {sources.length > 0 && (
                        <button
                          onClick={handleBulkImport}
                          disabled={isBulkImporting || importingIndex !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                          title="Import all discovered leads with enrichment + email sequences"
                        >
                          {isBulkImporting ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {bulkProgress?.phase === 'importing'
                                ? `Importing ${bulkProgress?.current}/${bulkProgress?.total}...`
                                : bulkProgress?.phase === 'done'
                                  ? `Done — ${enrichmentStats?.emails || 0} emails`
                                  : `Enriching ${bulkProgress?.current}/${bulkProgress?.total}...`
                              }
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              Import All ({sources.length})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                 </div>

                 {/* Summary stats bar */}
                 {sources.length > 0 && (
                   <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-500">
                     <span className="flex items-center gap-1">
                       <Globe className="w-3 h-3 text-indigo-400" />
                       <span className="font-bold text-slate-700">{sources.filter((s: any) => s.structured?.website).length}</span> with website
                     </span>
                     <span className="flex items-center gap-1">
                       <Phone className="w-3 h-3 text-slate-400" />
                       <span className="font-bold text-slate-700">{sources.filter((s: any) => s.structured?.phone).length}</span> with phone
                     </span>
                     <span className="flex items-center gap-1">
                       <MapPin className="w-3 h-3 text-slate-400" />
                       <span className="font-bold text-slate-700">{sources.filter((s: any) => s.structured?.address).length}</span> with address
                     </span>
                     {(() => {
                       const rated = sources.filter((s: any) => s.maps?.rating);
                       const avg = rated.length > 0
                         ? sources.reduce((sum: number, s: any) => sum + (parseFloat(s.maps?.rating) || 0), 0) / rated.length
                         : 0;
                       return (
                         <span className="flex items-center gap-1">
                           <Star className="w-3 h-3 text-amber-400" />
                           avg <span className="font-bold text-slate-700">{avg.toFixed(1)}</span>
                         </span>
                       );
                     })()}
                   </div>
                 )}

                 {isBulkImporting && bulkProgress && (
                   <div className={`px-4 py-3 border-t ${bulkProgress.phase === 'done' ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                     {/* Phase label + progress count */}
                     <div className="flex items-center justify-between mb-1.5">
                       <div className="flex items-center gap-2">
                         {bulkProgress.phase === 'done' ? (
                           <Check className="w-3.5 h-3.5 text-emerald-600" />
                         ) : (
                           <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                         )}
                         <span className={`text-xs font-bold ${bulkProgress.phase === 'done' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                           {bulkProgress.phase === 'importing'
                             ? `Importing contacts (${bulkProgress.current}/${bulkProgress.total})`
                             : bulkProgress.phase === 'done'
                               ? `Enrichment complete (${bulkProgress.total}/${bulkProgress.total})`
                               : `Enriching leads (${bulkProgress.current}/${bulkProgress.total})`
                           }
                         </span>
                       </div>
                       <span className={`text-[10px] ${bulkProgress.phase === 'done' ? 'text-emerald-600' : 'text-indigo-500'}`}>
                         {bulkProgress.phase === 'importing'
                           ? 'Fast import'
                           : bulkProgress.phase === 'done'
                             ? 'All contacts processed'
                             : enrichmentStats?.lastContact
                               ? `Processing: ${enrichmentStats.lastContact}`
                               : 'Starting enrichment...'
                         }
                       </span>
                     </div>

                     {/* Progress bar */}
                     <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                       <div
                         className={`h-2 rounded-full transition-all duration-700 ${bulkProgress.phase === 'done' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                         style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                       />
                     </div>

                     {/* Stats row — only during enriching/done phase */}
                     {bulkProgress.phase !== 'importing' && enrichmentStats && (
                       <div className="flex items-center gap-4 text-[10px]">
                         <span className="flex items-center gap-1 text-emerald-700">
                           <Check className="w-3 h-3" />
                           <span className="font-bold">{enrichmentStats.enriched}</span> enriched
                         </span>
                         <span className="flex items-center gap-1 text-indigo-700">
                           <Mail className="w-3 h-3" />
                           <span className="font-bold">{enrichmentStats.emails}</span> emails found
                         </span>
                         {enrichmentStats.failed > 0 && (
                           <span className="flex items-center gap-1 text-red-500">
                             <span className="font-bold">{enrichmentStats.failed}</span> failed
                           </span>
                         )}
                         {bulkProgress.phase === 'enriching' && (
                           <span className="text-slate-400 ml-auto">
                             ~{Math.ceil((bulkProgress.total - bulkProgress.current) * 15 / 60)} min remaining
                           </span>
                         )}
                       </div>
                     )}
                   </div>
                 )}
              </div>

              {/* Loading / Results / Empty state */}
              {isSearching ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Progress stepper */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Searching Google Maps</p>
                          <p className="text-[11px] text-slate-400">
                            Estimated {resultCount <= 5 ? '~30 seconds' : resultCount <= 15 ? '~1–2 minutes' : resultCount <= 50 ? '~2–3 minutes' : resultCount <= 200 ? '~3–5 minutes' : '~5–10 minutes'} for {resultCount} results
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        LIVE
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2.5 ml-1">
                      {[
                        { icon: Globe, text: 'Connecting to Google Maps...' },
                        { icon: Search, text: `Scanning ${industry} in ${location}...` },
                        { icon: Target, text: 'Discovering businesses...' },
                        { icon: Sparkles, text: 'Analyzing reputation data...' },
                        { icon: Zap, text: 'Preparing your results...' },
                      ].map((step, idx) => {
                        const StepIcon = step.icon;
                        const isActive = idx === searchPhase;
                        const isDone = idx < searchPhase;
                        const isPending = idx > searchPhase;
                        return (
                          <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${isPending ? 'opacity-25' : 'opacity-100'}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${
                              isDone ? 'bg-emerald-100 text-emerald-600' :
                              isActive ? 'bg-indigo-100 text-indigo-600' :
                              'bg-slate-50 text-slate-300'
                            }`}>
                              {isDone ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : isActive ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <StepIcon className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className={`text-xs transition-all duration-500 ${
                              isDone ? 'text-emerald-600 font-medium' :
                              isActive ? 'text-slate-900 font-bold' :
                              'text-slate-300 font-medium'
                            }`}>{step.text}</span>
                            {isDone && (
                              <span className="text-[9px] text-emerald-500 font-bold ml-auto">Done</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-[4000ms] ease-linear"
                        style={{ width: `${Math.min(((searchPhase + 1) / 5) * 100, 95)}%` }}
                      />
                    </div>
                  </div>

                  {/* Skeleton cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: Math.min(resultCount, 6) }).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
                        <div className="animate-pulse">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3.5 bg-slate-200 rounded-lg w-3/4" />
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, s) => (
                                  <div key={s} className="w-3 h-3 bg-slate-100 rounded-sm" />
                                ))}
                                <div className="h-2.5 bg-slate-100 rounded w-8 ml-1" />
                              </div>
                            </div>
                          </div>
                          <div className="ml-[42px] space-y-2">
                            <div className="h-4 bg-indigo-50 rounded-full w-24" />
                            <div className="space-y-1.5">
                              <div className="h-3 bg-slate-100 rounded w-4/5" />
                              <div className="h-3 bg-slate-100 rounded w-3/5" />
                              <div className="h-3 bg-slate-100 rounded w-2/3" />
                            </div>
                            <div className="h-14 bg-amber-50/60 rounded-xl mt-2" />
                            <div className="h-14 bg-emerald-50/60 rounded-xl" />
                            <div className="flex gap-1.5 mt-2">
                              <div className="h-4 bg-slate-100 rounded w-14" />
                              <div className="h-4 bg-slate-100 rounded w-12" />
                              <div className="h-4 bg-slate-100 rounded w-16" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : sources.length > 0 ? (
                <>
                  {/* ── GRID VIEW (always on mobile; on desktop only when grid mode selected) ── */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 ${viewMode === 'list' ? 'md:hidden' : ''}`}>
                      {sources.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((chunk: any, idx: number) => {
                        const i = (currentPage - 1) * pageSize + idx;
                        const details = parseBusinessDetails(chunk.maps?.title || '', chunk);
                        const website = chunk.structured?.website || details.website;
                        const phone = chunk.structured?.phone || details.phone;
                        const address = chunk.structured?.address || '';
                        const reviewCount = chunk.structured?.reviewsCount;
                        const category = chunk.structured?.categoryName;
                        const rating = chunk.maps?.rating ? parseFloat(chunk.maps.rating) : 0;

                        return (
                          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden">
                            <div className="p-4 pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2.5 mb-1">
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                      {i + 1}
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{chunk.maps?.title || 'Unknown Business'}</h4>
                                  </div>
                                  <div className="flex items-center gap-2 ml-[42px]">
                                    {rating > 0 && (
                                      <div className="flex items-center gap-1">
                                        <div className="flex items-center gap-0.5">
                                          {Array.from({ length: 5 }).map((_, s) => (
                                            <Star key={s} className={`w-3 h-3 ${s < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                          ))}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{chunk.maps.rating}</span>
                                      </div>
                                    )}
                                    {reviewCount != null && (
                                      <span className="text-[10px] text-slate-400">({reviewCount} reviews)</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() => handleInitializeLead(chunk, i)}
                                    disabled={importingIndex === i}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-brand rounded-xl transition-all disabled:opacity-50"
                                    title="Import to CRM + Start Sequence"
                                  >
                                    {importingIndex === i ? <Loader2 className="w-4 h-4 animate-spin text-brand" /> : <UserPlus className="w-4 h-4" />}
                                  </button>
                                  {chunk.maps?.uri && (
                                    <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition-all">
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="px-4 pb-4 space-y-2.5">
                              {category && (
                                <div className="ml-[42px]">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{category}</span>
                                </div>
                              )}
                              <div className="ml-[42px] space-y-1.5">
                                {website && (
                                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-indigo-500 hover:text-indigo-700 group/link">
                                    <Globe className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                                    <span className="truncate group-hover/link:underline">{website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                                  </a>
                                )}
                                {phone && (
                                  <a href={`tel:${phone}`} className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-slate-900">
                                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    <span>{phone}</span>
                                  </a>
                                )}
                                {address && (
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    <span className="truncate">{address}</span>
                                  </div>
                                )}
                              </div>
                              {details.reputationGap && (
                                <div className="ml-[42px] p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                                  <p className="text-[10px] font-bold text-amber-700 mb-0.5 flex items-center gap-1"><Target className="w-3 h-3" /> Reputation Gap</p>
                                  <p className="text-[11px] text-amber-600 leading-relaxed line-clamp-2">{details.reputationGap}</p>
                                </div>
                              )}
                              {details.outreach && (
                                <div className="ml-[42px] p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                  <p className="text-[10px] font-bold text-emerald-700 mb-0.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Outreach</p>
                                  <p className="text-[11px] text-emerald-600 leading-relaxed line-clamp-2">{details.outreach}</p>
                                </div>
                              )}
                              <div className="ml-[42px] flex flex-wrap gap-1.5 pt-1">
                                {website && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Website</span>}
                                {phone && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Phone</span>}
                                {address && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Address</span>}
                                {!website && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-400 border border-red-100">No Website</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* ── LIST VIEW (hidden on small screens — falls back to grid) ── */}
                  {viewMode === 'list' && (
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                      {/* Table header */}
                      <div className="grid grid-cols-[40px_1fr_80px_80px_140px_120px_44px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>#</span>
                        <span>Business</span>
                        <span>Rating</span>
                        <span>Reviews</span>
                        <span>Phone</span>
                        <span>Category</span>
                        <span></span>
                      </div>

                      {/* Table rows */}
                      {sources.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((chunk: any, idx: number) => {
                        const i = (currentPage - 1) * pageSize + idx;
                        const details = parseBusinessDetails(chunk.maps?.title || '', chunk);
                        const website = chunk.structured?.website || details.website;
                        const phone = chunk.structured?.phone || details.phone;
                        const address = chunk.structured?.address || '';
                        const reviewCount = chunk.structured?.reviewsCount;
                        const category = chunk.structured?.categoryName;
                        const rating = chunk.maps?.rating ? parseFloat(chunk.maps.rating) : 0;
                        const isExpanded = expandedRow === i;

                        return (
                          <div key={i} className={`border-b border-slate-100 last:border-b-0 transition-all ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                            {/* Compact row */}
                            <div
                              className="grid grid-cols-[40px_1fr_80px_80px_140px_120px_44px] gap-2 px-4 py-2.5 items-center cursor-pointer"
                              onClick={() => setExpandedRow(isExpanded ? null : i)}
                            >
                              <span className="text-[11px] font-bold text-indigo-500">{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{chunk.maps?.title || 'Unknown'}</p>
                                {website && (
                                  <p className="text-[10px] text-indigo-400 truncate">{website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5">
                                {rating > 0 && (
                                  <>
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span className="text-[11px] font-bold text-slate-700">{chunk.maps.rating}</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">{reviewCount != null ? reviewCount.toLocaleString() : '—'}</span>
                              <span className="text-[11px] text-slate-600 truncate">{phone || '—'}</span>
                              <span className="text-[10px] text-indigo-500 truncate">{category || '—'}</span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleInitializeLead(chunk, i); }}
                                  disabled={importingIndex === i}
                                  className="p-1 text-slate-400 hover:text-brand rounded-lg transition-all disabled:opacity-50"
                                  title="Import to CRM"
                                >
                                  {importingIndex === i ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> : <UserPlus className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded detail panel */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 ml-[40px] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {website && (
                                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-700">
                                      <Globe className="w-3.5 h-3.5" /> <span className="hover:underline">{website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                                    </a>
                                  )}
                                  {phone && (
                                    <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {phone}
                                    </a>
                                  )}
                                  {address && (
                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {address}
                                    </span>
                                  )}
                                  {chunk.maps?.uri && (
                                    <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700">
                                      <ExternalLink className="w-3.5 h-3.5" /> Maps
                                    </a>
                                  )}
                                </div>
                                {details.reputationGap && (
                                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-700 mb-0.5 flex items-center gap-1"><Target className="w-3 h-3" /> Reputation Gap</p>
                                    <p className="text-[11px] text-amber-600 leading-relaxed">{details.reputationGap}</p>
                                  </div>
                                )}
                                {details.outreach && (
                                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-700 mb-0.5 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Outreach</p>
                                    <p className="text-[11px] text-emerald-600 leading-relaxed">{details.outreach}</p>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {website && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Website</span>}
                                  {phone && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Phone</span>}
                                  {address && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Address</span>}
                                  {!website && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-400 border border-red-100">No Website</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── PAGINATION ── */}
                  {sources.length > pageSize && (
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
                      <span className="text-[11px] text-slate-500">
                        Showing <span className="font-bold text-slate-700">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sources.length)}</span> of <span className="font-bold text-slate-700">{sources.length}</span> results
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setCurrentPage(1); setExpandedRow(null); }}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                        >
                          First
                        </button>
                        <button
                          onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setExpandedRow(null); }}
                          disabled={currentPage === 1}
                          className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page numbers */}
                        {(() => {
                          const totalPages = Math.ceil(sources.length / pageSize);
                          const pages: (number | 'dots')[] = [];
                          if (totalPages <= 7) {
                            for (let p = 1; p <= totalPages; p++) pages.push(p);
                          } else {
                            pages.push(1);
                            if (currentPage > 3) pages.push('dots');
                            for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p);
                            if (currentPage < totalPages - 2) pages.push('dots');
                            pages.push(totalPages);
                          }
                          return pages.map((p, idx) =>
                            p === 'dots' ? (
                              <span key={`dots-${idx}`} className="px-1 text-slate-300 text-xs">...</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => { setCurrentPage(p); setExpandedRow(null); }}
                                className={`w-8 h-8 text-[11px] font-bold rounded-lg transition-all ${
                                  currentPage === p
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                {p}
                              </button>
                            )
                          );
                        })()}

                        <button
                          onClick={() => { setCurrentPage(p => Math.min(Math.ceil(sources.length / pageSize), p + 1)); setExpandedRow(null); }}
                          disabled={currentPage >= Math.ceil(sources.length / pageSize)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setCurrentPage(Math.ceil(sources.length / pageSize)); setExpandedRow(null); }}
                          disabled={currentPage >= Math.ceil(sources.length / pageSize)}
                          className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-50 transition-all"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center opacity-40 select-none space-y-4">
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
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
              <span className="ml-2 text-sm text-slate-400">Loading past searches...</span>
            </div>
          ) : pastSearches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <History className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-sm font-semibold text-slate-500">No past searches</p>
              <p className="text-xs text-slate-400 mt-1">Run a Local SEO search to see results here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastSearches.map((entry) => {
                const result = entry.result as { text: string; sources: any[] };
                const sourceCount = result.sources?.length || 0;
                const date = new Date(entry.createdAt);

                return (
                  <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-brand transition-all group">
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{entry.query}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-brand">
                              {sourceCount} leads
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {date.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <MapPin className="w-4 h-4 text-slate-300 shrink-0" />
                      </div>

                      {/* Preview of found businesses */}
                      <div className="space-y-1.5">
                        {(result.sources || []).slice(0, 3).map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                              {i + 1}
                            </div>
                            <span className="text-slate-700 font-medium truncate">{s.maps?.title || 'Unknown'}</span>
                            {s.maps?.rating && (
                              <span className="text-amber-500 font-bold shrink-0">{s.maps.rating}★</span>
                            )}
                          </div>
                        ))}
                        {sourceCount > 3 && (
                          <p className="text-[10px] text-slate-400 ml-7">+{sourceCount - 3} more</p>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                      <button
                        onClick={() => handleReloadSearch(entry)}
                        className="flex-1 py-2 text-xs font-bold text-brand bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" /> View Results
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocalSEO;
