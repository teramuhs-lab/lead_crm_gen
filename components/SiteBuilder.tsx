
import React, { useState, useMemo } from 'react';
import {
  Layout, Plus, Save, Eye, Smartphone, Tablet, Monitor,
  Trash2, ChevronRight, Rocket, Globe,
  ArrowLeft, Search, Settings2, ExternalLink,
  Sparkles, X, ChevronLeft, Layers, MousePointer2,
  FileText, MousePointer, BarChart3, Cloud
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { Funnel, Block } from '../types';
import { NexusCard, NexusButton, NexusBadge, NexusHeader, NexusInput } from './NexusUI';

const SiteBuilder: React.FC = () => {
  const { funnels, addFunnel, updateFunnel, deleteFunnel, notify } = useNexus();
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const activePage = useMemo(() =>
    editingFunnel?.pages.find(p => p.id === activePageId) || editingFunnel?.pages[0] || null,
  [editingFunnel, activePageId]);

  const handleStartEdit = (funnel: Funnel) => {
    setActiveFunnelId(funnel.id);
    setEditingFunnel(JSON.parse(JSON.stringify(funnel)));
    setActivePageId(funnel.pages[0]?.id || null);
  };

  const handleSaveAndExit = () => {
    if (editingFunnel) {
      updateFunnel(editingFunnel);
      notify("Site saved.");
    }
    setActiveFunnelId(null);
    setEditingFunnel(null);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise(r => setTimeout(r, 2000));
    if (editingFunnel) {
      const published = { ...editingFunnel, status: 'published' as const };
      updateFunnel(published);
    }
    setIsPublishing(false);
    notify("Published successfully.");
  };

  const addBlock = (type: Block['type']) => {
    if (!editingFunnel || !activePageId) return;
    const newBlock: Block = {
      id: `b-${Date.now()}`,
      type,
      title: type === 'hero' ? 'Welcome to our service' : type === 'form' ? 'Register Now' : 'Enter details here',
      subtitle: 'Change this text in the editor',
      content: 'Sample content for your new block.',
      buttonText: 'Get Started',
    };
    setEditingFunnel({
      ...editingFunnel,
      pages: editingFunnel.pages.map(p => p.id === activePageId ? { ...p, blocks: [...p.blocks, newBlock] } : p)
    });
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    if (!editingFunnel || !activePageId) return;
    setEditingFunnel({
      ...editingFunnel,
      pages: editingFunnel.pages.map(p => p.id === activePageId ? {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
      } : p)
    });
  };

  if (!activeFunnelId) {
    return (
      <div className="space-y-5 animate-in fade-in duration-500 pb-20">
        <NexusHeader title="Site Builder" subtitle="Create and manage your landing pages">
          <NexusButton onClick={() => addFunnel({ name: 'Growth Funnel v1' })} icon={Plus}>New Site</NexusButton>
        </NexusHeader>

        <NexusCard padding="none" className="border-b-[12px] border-brand/5">
           <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Globe className="w-5 h-5 text-brand" />
                 <h3 className="text-sm font-semibold text-slate-900">Your Sites</h3>
              </div>
              <div className="w-64">
                 <NexusInput placeholder="Search sites..." icon={Search} size="sm" className="py-2.5 px-4" />
              </div>
           </div>
           <div className="divide-y divide-slate-100">
              {funnels.map(f => (
                <div key={f.id} className="p-8 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-brand shadow-sm">
                         <Layout className="w-7 h-7" />
                      </div>
                      <div>
                         <h4 className="text-lg font-semibold text-slate-900">{f.name}</h4>
                         <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs font-medium text-slate-400">{f.pages.length} Pages</span>
                            <NexusBadge variant={f.status === 'published' ? 'emerald' : 'slate'}>{f.status}</NexusBadge>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="hidden md:flex gap-6 text-right">
                         <div>
                            <p className="text-xs font-medium text-slate-400">Visits</p>
                            {/* Fix: Explicitly ensure numeric value is converted for rendering if needed, though standard React handles it. */}
                            <p className="text-sm font-semibold text-slate-900">{f.stats.visits.toString()}</p>
                         </div>
                         <div>
                            <p className="text-xs font-medium text-emerald-500">Conversion</p>
                            {/* Fix: Calculation ensures number type is maintained before toFixed. */}
                            <p className="text-sm font-semibold text-emerald-600">{((f.stats.conversions / (f.stats.visits || 1)) * 100).toFixed(1)}%</p>
                         </div>
                      </div>
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                         <NexusButton variant="ghost" onClick={() => handleStartEdit(f)}>Edit</NexusButton>
                         <button className="p-4 bg-white text-slate-300 hover:text-rose-500 rounded-2xl shadow-xl hover:bg-rose-50 transition-all" onClick={() => deleteFunnel(f.id)}><Trash2 className="w-5 h-5" /></button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </NexusCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col animate-in fade-in duration-300">
      <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={handleSaveAndExit} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="flex items-center gap-4">
             <span className="text-xs text-slate-400 font-medium">Sites /</span>
             <h2 className="text-lg font-semibold text-slate-900">{editingFunnel?.name}</h2>
             <NexusBadge variant="brand">V1.0</NexusBadge>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex bg-slate-100 p-1.5 rounded-2xl">
             <button onClick={() => setViewMode('desktop')} className={`p-2 rounded-xl transition-all ${viewMode === 'desktop' ? 'bg-white shadow-xl text-brand' : 'text-slate-400'}`}><Monitor className="w-5 h-5" /></button>
             <button onClick={() => setViewMode('mobile')} className={`p-2 rounded-xl transition-all ${viewMode === 'mobile' ? 'bg-white shadow-xl text-brand' : 'text-slate-400'}`}><Smartphone className="w-5 h-5" /></button>
           </div>
           <NexusButton variant="ghost" icon={Eye}>Preview</NexusButton>
           <NexusButton onClick={handlePublish} loading={isPublishing} icon={Rocket}>Publish</NexusButton>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex flex-col gap-6 shrink-0 p-6 bg-white border-r border-slate-200">
           <NexusCard padding="none" className="flex-1 flex flex-col overflow-hidden border border-slate-100">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <h3 className="text-xs font-semibold text-slate-900">Pages</h3>
                 <button className="p-2 text-brand hover:bg-indigo-50 rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 thin-scrollbar">
                 {editingFunnel?.pages.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePageId(p.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all ${activePageId === p.id ? 'bg-indigo-50 text-brand shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                       <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold opacity-30">{i + 1}</span>
                          <span className="text-sm font-semibold truncate">{p.name}</span>
                       </div>
                       <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activePageId === p.id ? 'rotate-90' : 'opacity-20'}`} />
                    </button>
                 ))}
              </div>
           </NexusCard>

           <NexusCard padding="md" className="space-y-6 border border-slate-100">
              <h3 className="text-xs font-semibold text-slate-900">Components</h3>
              <div className="grid grid-cols-2 gap-3">
                 {[
                   { id: 'hero', label: 'Hero', icon: Layout, color: 'text-brand' },
                   { id: 'form', label: 'Form', icon: FileText, color: 'text-emerald-500' },
                   { id: 'text', label: 'Text', icon: Layers, color: 'text-indigo-500' },
                   { id: 'features', label: 'Features', icon: MousePointer, color: 'text-amber-500' }
                 ].map(item => (
                   <button
                     key={item.id}
                     onClick={() => addBlock(item.id as any)}
                     className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-brand hover:bg-white transition-all flex flex-col items-center gap-3 group shadow-sm"
                   >
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                      <span className="text-xs font-medium text-slate-400 group-hover:text-slate-900">{item.label}</span>
                   </button>
                 ))}
              </div>
           </NexusCard>
        </div>

        <div className="flex-1 bg-slate-100/50 overflow-hidden relative flex flex-col p-6">
           <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
              <div className={`mx-auto bg-white shadow-[0_40px_120px_rgba(0,0,0,0.15)] transition-all duration-700 overflow-hidden min-h-full rounded-xl border border-slate-200 ${viewMode === 'desktop' ? 'w-full max-w-5xl' : 'w-[400px]'}`}>
                 {activePage?.blocks.length === 0 && (
                   <div className="py-40 text-center space-y-6 opacity-20 select-none">
                      <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center mx-auto shadow-inner">
                         <MousePointer2 className="w-12 h-12 text-slate-400" />
                      </div>
                      <div>
                         <p className="text-2xl font-semibold">Empty Canvas</p>
                         <p className="text-xs font-medium mt-2">Add components from the sidebar</p>
                      </div>
                   </div>
                 )}

                 {activePage?.blocks.map(block => (
                   <div key={block.id} className="relative group border-b border-transparent hover:border-brand/20 transition-all animate-in slide-in-from-bottom-2">
                      <div className="absolute right-8 top-8 opacity-0 group-hover:opacity-100 flex gap-3 z-10 transition-all transform translate-x-4 group-hover:translate-x-0">
                         <button className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-500 shadow-md hover:bg-rose-50 transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>

                      {block.type === 'hero' && (
                        <div className="py-32 px-20 text-center space-y-8 bg-slate-50/50">
                           <input
                             className="w-full text-6xl font-semibold text-slate-900 text-center bg-transparent border-none focus:ring-0 p-0 leading-tight"
                             value={block.title}
                             onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                           />
                           <textarea
                             className="w-full text-slate-500 text-xl font-medium text-center bg-transparent border-none focus:ring-0 resize-none max-w-2xl mx-auto leading-relaxed"
                             rows={2}
                             value={block.subtitle}
                             onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                           />
                           <div className="flex justify-center pt-6">
                              <NexusButton variant="brand" size="xl">{block.buttonText}</NexusButton>
                           </div>
                        </div>
                      )}

                      {block.type === 'form' && (
                        <div className="py-24 px-20 bg-white flex justify-center border-y border-slate-50">
                           <div className="w-full max-w-md p-6 bg-white rounded-xl border border-slate-100 text-center space-y-5 shadow-md">
                              <h3 className="text-2xl font-semibold text-slate-900">{block.title}</h3>
                              <div className="space-y-4">
                                 <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl"></div>
                                 <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl"></div>
                                 <NexusButton variant="slate" size="lg" className="w-full mt-4">Submit</NexusButton>
                              </div>
                           </div>
                        </div>
                      )}

                      {block.type === 'text' && (
                        <div className="py-20 px-20 space-y-8">
                           <input
                             className="w-full text-3xl font-semibold text-slate-900 bg-transparent border-none focus:ring-0 p-0"
                             value={block.title}
                             onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                           />
                           <textarea
                             className="w-full text-sm font-medium text-slate-500 bg-transparent border-none focus:ring-0 resize-none leading-loose"
                             rows={6}
                             value={block.content}
                             onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                           />
                        </div>
                      )}
                   </div>
                 ))}
              </div>
           </div>

           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-5 bg-slate-900/90 backdrop-blur-3xl rounded-xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)] z-50 animate-in slide-in-from-bottom-10 duration-700">
              <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                 <Cloud className="w-5 h-5 text-emerald-400" />
                 <span className="text-xs font-semibold text-white">Auto-Save Active</span>
              </div>
              <div className="flex items-center gap-8">
                 <button className="flex flex-col items-center gap-1 group">
                    <Layout className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
                    <span className="text-xs font-medium text-slate-500">Layout</span>
                 </button>
                 <button className="flex flex-col items-center gap-1 group">
                    <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
                    <span className="text-xs font-medium text-slate-500">AI Copy</span>
                 </button>
                 <button className="flex flex-col items-center gap-1 group">
                    <Settings2 className="w-4 h-4 text-slate-400 group-hover:text-brand transition-colors" />
                    <span className="text-xs font-medium text-slate-500">Settings</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SiteBuilder;
