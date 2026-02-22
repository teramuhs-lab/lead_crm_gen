
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wand2, Layout, Mail, Share2, Sparkles, Copy, RefreshCw, Loader2, CheckCircle2,
  BookmarkPlus, Library, Trash2, ChevronRight, X,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { AIGeneratedContentEntry } from '../types';
import { NexusHeader } from './NexusUI';

type ContentType = 'email' | 'social' | 'ad';
type Tone = 'Professional' | 'Casual' | 'Urgent' | 'Friendly';

interface EmailContent {
  subject: string;
  body: string;
  callToAction: string;
}

interface SocialContent {
  caption: string;
  hashtags: string[];
  platform: string;
}

interface AdContent {
  headline: string;
  description: string;
  callToAction: string;
}

type GeneratedContent = EmailContent | SocialContent | AdContent;

const ContentAI: React.FC = () => {
  const { activeSubAccount, notify } = useNexus();
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeType, setActiveType] = useState<ContentType>('email');
  const [tone, setTone] = useState<Tone>('Professional');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Library state
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<AIGeneratedContentEntry[]>([]);
  const [libraryFilter, setLibraryFilter] = useState<'all' | ContentType>('all');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<AIGeneratedContentEntry | null>(null);

  const fetchLibrary = useCallback(async () => {
    if (!activeSubAccount?.id) return;
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams({ subAccountId: activeSubAccount.id });
      if (libraryFilter !== 'all') params.set('type', libraryFilter);
      const data = await api.get<{ items: AIGeneratedContentEntry[] }>(`/ai/content-library?${params}`);
      setLibraryItems(data.items);
    } catch {
      notify('Failed to load content library', 'error');
    } finally {
      setLibraryLoading(false);
    }
  }, [activeSubAccount?.id, libraryFilter, notify]);

  useEffect(() => {
    if (showLibrary) fetchLibrary();
  }, [showLibrary, fetchLibrary]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const data = await api.post<GeneratedContent>('/ai/generate-content', {
        subAccountId: activeSubAccount?.id,
        type: activeType,
        prompt,
        tone,
      });
      setGeneratedContent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getAutoTitle = (type: ContentType, content: GeneratedContent): string => {
    if (type === 'email') return (content as EmailContent).subject || 'Untitled Email';
    if (type === 'social') {
      const caption = (content as SocialContent).caption || '';
      return caption.slice(0, 50) + (caption.length > 50 ? '...' : '') || 'Untitled Post';
    }
    return (content as AdContent).headline || 'Untitled Ad';
  };

  const handleSaveToLibrary = async () => {
    if (!generatedContent || !activeSubAccount?.id) return;
    setIsSaving(true);
    try {
      const title = getAutoTitle(activeType, generatedContent);
      await api.post('/ai/content-library', {
        subAccountId: activeSubAccount.id,
        contentType: activeType,
        prompt,
        tone,
        content: generatedContent,
        title,
      });
      notify('Saved to content library');
    } catch {
      notify('Failed to save content', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLibraryItem = async (id: string) => {
    try {
      await api.delete(`/ai/content-library/${id}`);
      setLibraryItems(prev => prev.filter(i => i.id !== id));
      if (selectedLibraryItem?.id === id) setSelectedLibraryItem(null);
      notify('Content deleted');
    } catch {
      notify('Failed to delete content', 'error');
    }
  };

  const getClipboardText = (): string => {
    if (!generatedContent) return '';

    if (activeType === 'email') {
      const c = generatedContent as EmailContent;
      return `Subject: ${c.subject}\n\n${c.body}\n\n${c.callToAction}`;
    }
    if (activeType === 'social') {
      const c = generatedContent as SocialContent;
      return `${c.caption}\n\n${c.hashtags.map(h => `#${h}`).join(' ')}\n\nPlatform: ${c.platform}`;
    }
    const c = generatedContent as AdContent;
    return `${c.headline}\n\n${c.description}\n\n${c.callToAction}`;
  };

  const handleCopy = async () => {
    const text = getClipboardText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silently
    }
  };

  const handleRegenerate = () => {
    if (prompt.trim()) {
      handleGenerate();
    }
  };

  const renderEmailContent = (content: EmailContent) => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</label>
        <p className="mt-1.5 text-base font-semibold text-slate-900">{content.subject}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Body</label>
        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content.body}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call to Action</label>
        <div className="mt-1.5">
          <span className="inline-block px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold">{content.callToAction}</span>
        </div>
      </div>
    </div>
  );

  const renderSocialContent = (content: SocialContent) => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Caption</label>
        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content.caption}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hashtags</label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {content.hashtags.map((tag, i) => (
            <span key={i} className="inline-block px-3 py-1 bg-indigo-50 text-brand rounded-full text-xs font-semibold">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform</label>
        <p className="mt-1.5 text-sm font-medium text-slate-700">{content.platform}</p>
      </div>
    </div>
  );

  const renderAdContent = (content: AdContent) => (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Headline</label>
        <p className="mt-1.5 text-lg font-bold text-slate-900">{content.headline}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
        <p className="mt-1.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content.description}</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call to Action</label>
        <div className="mt-1.5">
          <span className="inline-block px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold">{content.callToAction}</span>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (!generatedContent) return null;
    if (activeType === 'email') return renderEmailContent(generatedContent as EmailContent);
    if (activeType === 'social') return renderSocialContent(generatedContent as SocialContent);
    return renderAdContent(generatedContent as AdContent);
  };

  const renderLibraryContent = (item: AIGeneratedContentEntry) => {
    const c = item.content as Record<string, any>;
    if (item.contentType === 'email') return renderEmailContent(c as EmailContent);
    if (item.contentType === 'social') return renderSocialContent(c as SocialContent);
    return renderAdContent(c as AdContent);
  };

  const typeBadgeColor = (type: string) => {
    if (type === 'email') return 'bg-indigo-50 text-indigo-600';
    if (type === 'social') return 'bg-emerald-50 text-emerald-600';
    return 'bg-amber-50 text-amber-600';
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto">
      <NexusHeader title="Content AI Generator" subtitle="Generate email, social, and ad copy with AI — save your best content to the library">
           <button
             onClick={() => setShowLibrary(!showLibrary)}
             className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all ${showLibrary ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
           >
             <Library className="w-4 h-4" /> {showLibrary ? 'Back to Generator' : 'Content Library'}
           </button>
           <button className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"><Sparkles className="w-4 h-4" /> Go Pro</button>
      </NexusHeader>

      {showLibrary ? (
        /* ── Library View ── */
        <div className="flex-1 flex flex-col">
          <div className="flex gap-2 mb-4">
            {(['all', 'email', 'social', 'ad'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setLibraryFilter(f); setSelectedLibraryItem(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  libraryFilter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {selectedLibraryItem ? (
            <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedLibraryItem(null)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-slate-900 truncate max-w-md">{selectedLibraryItem.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeColor(selectedLibraryItem.contentType)}`}>
                    {selectedLibraryItem.contentType}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteLibraryItem(selectedLibraryItem.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto">
                {renderLibraryContent(selectedLibraryItem)}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-400">
                  Created {new Date(selectedLibraryItem.createdAt).toLocaleDateString()} | Tone: {selectedLibraryItem.tone}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {libraryLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                  </div>
                ) : libraryItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none p-8">
                    <Library className="w-16 h-16 mb-4" />
                    <p className="text-lg font-semibold">No saved content yet</p>
                    <p className="text-xs mt-1">Generate content and save it to build your library.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {libraryItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedLibraryItem(item)}
                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeColor(item.contentType)}`}>
                              {item.contentType}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Generator View ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <label className="text-xs font-medium text-slate-400 block">Choose Content Type</label>
                <div className="grid grid-cols-1 gap-2">
                   {([
                     { id: 'email' as ContentType, label: 'Email Broadcast', icon: Mail },
                     { id: 'social' as ContentType, label: 'Social Post', icon: Share2 },
                     { id: 'ad' as ContentType, label: 'Ad Copy', icon: Layout }
                   ]).map(type => (
                     <button
                       key={type.id}
                       onClick={() => { setActiveType(type.id); setGeneratedContent(null); setError(null); }}
                       className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${activeType === type.id ? 'bg-indigo-50 border-brand text-brand font-semibold' : 'border-slate-50 hover:bg-slate-50 text-slate-500 font-medium'}`}
                     >
                       <type.icon className="w-5 h-5" />
                       <span className="text-sm">{type.label}</span>
                     </button>
                   ))}
                </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <label className="text-xs font-medium text-slate-400 block">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                >
                  <option value="Professional">Professional</option>
                  <option value="Casual">Casual</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Friendly">Friendly</option>
                </select>

                <label className="text-xs font-medium text-slate-400 block">Prompt</label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What are we writing today?"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
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
                      <button
                        onClick={handleRegenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="p-2 text-slate-400 hover:text-brand transition-colors disabled:opacity-30"
                        title="Regenerate"
                      >
                        <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleCopy}
                        disabled={!generatedContent}
                        className="p-2 text-slate-400 hover:text-brand transition-colors disabled:opacity-30"
                        title="Copy to Clipboard"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={handleSaveToLibrary}
                        disabled={!generatedContent || isSaving}
                        className="p-2 text-slate-400 hover:text-brand transition-colors disabled:opacity-30"
                        title="Save to Library"
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookmarkPlus className="w-5 h-5" />}
                      </button>
                   </div>
                </div>
                <div className="flex-1 p-8 overflow-y-auto text-slate-700 leading-relaxed text-sm font-medium">
                   {error && (
                     <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                       {error}
                     </div>
                   )}
                   {generatedContent ? (
                     <div className="space-y-4">
                        {renderContent()}
                     </div>
                   ) : !error ? (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                        <Wand2 className="w-20 h-20 mb-4" />
                        <p className="text-lg font-semibold">Input a prompt to begin</p>
                        <p className="text-xs mt-1">Your AI-generated marketing copy will appear here.</p>
                     </div>
                   ) : null}
                </div>
                <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-brand" /></div>
                      <span className="text-xs font-medium text-slate-400">
                        {generatedContent ? 'Content ready' : 'Ready to generate'}
                      </span>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={handleSaveToLibrary}
                       disabled={!generatedContent || isSaving}
                       className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                     >
                        {isSaving ? 'Saving...' : 'Save to Library'} <BookmarkPlus className="w-3.5 h-3.5" />
                     </button>
                     <button
                       onClick={handleCopy}
                       disabled={!generatedContent}
                       className="px-6 py-2.5 bg-brand text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                     >
                        {copied ? 'Copied!' : 'Copy to Clipboard'} <Copy className="w-3.5 h-3.5" />
                     </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentAI;
