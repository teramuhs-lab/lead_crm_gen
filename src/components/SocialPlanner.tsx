
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Facebook, Instagram, Linkedin, Twitter,
  Plus, Calendar, Clock, Search, X, Trash2, Edit3, Send,
  Sparkles, Loader2, Hash, ChevronDown,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import type { SocialPost, SocialPlatform, SocialPostStatus } from '../types';
import { NexusHeader } from './NexusUI';

// ── Platform config ──
const PLATFORMS: {
  key: SocialPlatform;
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  ring: string;
  maxChars: number;
}[] = [
  { key: 'facebook',  label: 'Facebook',  icon: Facebook,  color: 'text-blue-600',  bg: 'bg-blue-50',  ring: 'ring-blue-600',  maxChars: 3000 },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500',  bg: 'bg-pink-50',  ring: 'ring-pink-500',  maxChars: 2200 },
  { key: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,  color: 'text-blue-700',  bg: 'bg-blue-50',  ring: 'ring-blue-700',  maxChars: 3000 },
  { key: 'twitter',   label: 'Twitter',   icon: Twitter,   color: 'text-sky-500',   bg: 'bg-sky-50',   ring: 'ring-sky-500',   maxChars: 280  },
];

const STATUS_STYLES: Record<SocialPostStatus, string> = {
  draft:     'bg-slate-100 text-slate-700',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed:    'bg-rose-100 text-rose-700',
};

const STATUS_TABS: { key: SocialPostStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'draft',     label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
];

function platformMeta(key: SocialPlatform) {
  return PLATFORMS.find(p => p.key === key)!;
}

// ── Component ──

const SocialPlanner: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  // Data state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | null>(null);
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Form state
  const [formPlatform, setFormPlatform] = useState<SocialPlatform>('facebook');
  const [formContent, setFormContent] = useState('');
  const [formHashtags, setFormHashtags] = useState<string[]>([]);
  const [formHashtagInput, setFormHashtagInput] = useState('');
  const [formMediaUrls, setFormMediaUrls] = useState<string[]>([]);
  const [formScheduleDate, setFormScheduleDate] = useState('');
  const [formScheduleTime, setFormScheduleTime] = useState('');
  const [formAsDraft, setFormAsDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Fetch posts ──
  const fetchPosts = useCallback(async () => {
    if (!activeSubAccountId) return;
    setLoading(true);
    try {
      const data = await api.get<SocialPost[]>(`/social?subAccountId=${activeSubAccountId}`);
      setPosts(data);
    } catch {
      notify('Failed to load social posts', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeSubAccountId, notify]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ── Derived data ──
  const platformCounts = useMemo(() => {
    const counts: Record<SocialPlatform, number> = { facebook: 0, instagram: 0, linkedin: 0, twitter: 0 };
    posts.forEach(p => { counts[p.platform]++; });
    return counts;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activePlatform) result = result.filter(p => p.platform === activePlatform);
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.content.toLowerCase().includes(q) ||
        p.hashtags.some(h => h.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, activePlatform, statusFilter, searchQuery]);

  // ── Modal helpers ──
  const openCreateModal = useCallback(() => {
    setEditingPost(null);
    setFormPlatform('facebook');
    setFormContent('');
    setFormHashtags([]);
    setFormHashtagInput('');
    setFormMediaUrls([]);
    setFormScheduleDate('');
    setFormScheduleTime('');
    setFormAsDraft(true);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((post: SocialPost) => {
    setEditingPost(post);
    setFormPlatform(post.platform);
    setFormContent(post.content);
    setFormHashtags([...post.hashtags]);
    setFormHashtagInput('');
    setFormMediaUrls([...post.mediaUrls]);
    if (post.scheduledAt) {
      const dt = new Date(post.scheduledAt);
      setFormScheduleDate(dt.toISOString().split('T')[0]);
      setFormScheduleTime(dt.toTimeString().slice(0, 5));
      setFormAsDraft(false);
    } else {
      setFormScheduleDate('');
      setFormScheduleTime('');
      setFormAsDraft(true);
    }
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingPost(null);
  }, []);

  // ── Max chars for active platform ──
  const maxChars = useMemo(() => platformMeta(formPlatform).maxChars, [formPlatform]);

  // ── Hashtag handlers ──
  const addHashtag = useCallback(() => {
    const raw = formHashtagInput.trim().replace(/^#/, '');
    if (raw && !formHashtags.includes(raw)) {
      setFormHashtags(prev => [...prev, raw]);
    }
    setFormHashtagInput('');
  }, [formHashtagInput, formHashtags]);

  const removeHashtag = useCallback((tag: string) => {
    setFormHashtags(prev => prev.filter(t => t !== tag));
  }, []);

  // ── AI Caption ──
  const generateAICaption = useCallback(async () => {
    setAiLoading(true);
    try {
      const result = await api.post<{ caption: string; hashtags: string[] }>('/social/ai-caption', {
        topic: formContent || 'engaging social media post',
        platform: formPlatform,
        tone: 'professional',
      });
      setFormContent(result.caption);
      setFormHashtags(result.hashtags);
      notify('AI caption generated');
    } catch {
      notify('Failed to generate AI caption', 'error');
    } finally {
      setAiLoading(false);
    }
  }, [formContent, formPlatform, notify]);

  // ── Save (create / edit) ──
  const handleSave = useCallback(async () => {
    if (!formContent.trim()) {
      notify('Content cannot be empty', 'error');
      return;
    }
    setSaving(true);

    const scheduledAt = !formAsDraft && formScheduleDate && formScheduleTime
      ? new Date(`${formScheduleDate}T${formScheduleTime}`).toISOString()
      : undefined;
    const status: SocialPostStatus = scheduledAt ? 'scheduled' : 'draft';

    try {
      if (editingPost) {
        const updated = await api.put<SocialPost>(`/social/${editingPost.id}`, {
          content: formContent,
          hashtags: formHashtags,
          mediaUrls: formMediaUrls,
          status,
          scheduledAt,
        });
        setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
        notify('Post updated');
      } else {
        const created = await api.post<SocialPost>('/social', {
          subAccountId: activeSubAccountId,
          platform: formPlatform,
          content: formContent,
          hashtags: formHashtags,
          mediaUrls: formMediaUrls,
          scheduledAt,
          status,
        });
        setPosts(prev => [created, ...prev]);
        notify('Post created');
      }
      closeModal();
    } catch {
      notify('Failed to save post', 'error');
    } finally {
      setSaving(false);
    }
  }, [editingPost, formContent, formHashtags, formMediaUrls, formPlatform, formAsDraft, formScheduleDate, formScheduleTime, activeSubAccountId, notify, closeModal]);

  // ── Publish now ──
  const publishNow = useCallback(async (id: string) => {
    setPublishing(id);
    try {
      const updated = await api.post<SocialPost>(`/social/${id}/publish`, {});
      setPosts(prev => prev.map(p => p.id === id ? updated : p));
      notify('Post published');
    } catch {
      notify('Failed to publish post', 'error');
    } finally {
      setPublishing(null);
    }
  }, [notify]);

  // ── Delete ──
  const deletePost = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/social/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      notify('Post deleted');
    } catch {
      notify('Failed to delete post', 'error');
    } finally {
      setDeleting(null);
    }
  }, [notify]);

  // ── Render ──
  return (
    <div className="pb-20 animate-in fade-in duration-700">
      <NexusHeader title="Social Planner" subtitle="Schedule, publish, and manage your social media content across platforms">
        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition"
        >
          <Plus className="w-5 h-5" /> Create New Post
        </button>
      </NexusHeader>

      {/* ── Platform Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLATFORMS.map(p => {
          const active = activePlatform === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActivePlatform(active ? null : p.key)}
              className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center transition cursor-pointer hover:shadow-md ${
                active ? `ring-2 ${p.ring}` : ''
              }`}
            >
              <div className={`w-12 h-12 ${p.bg} rounded-xl flex items-center justify-center mb-3`}>
                <p.icon className={`w-6 h-6 ${p.color}`} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{p.label}</h4>
              <p className="text-lg font-bold text-slate-800 mt-1">{platformCounts[p.key]}</p>
              <p className="text-[10px] text-slate-400 mt-1">posts</p>
              <p className="text-[9px] text-slate-300 mt-2">API Coming Soon</p>
            </button>
          );
        })}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                statusFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 bg-white"
          />
        </div>
      </div>

      {/* ── Post Queue / Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-slate-400" />
          </div>
          <h4 className="font-bold text-slate-800">No Posts Found</h4>
          <p className="text-sm text-slate-500 max-w-xs mt-2">
            {posts.length === 0
              ? 'Start growing your audience by creating your first cross-platform post.'
              : 'No posts match your current filters. Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPosts.map(post => {
            const meta = platformMeta(post.platform);
            const PlatformIcon = meta.icon;
            return (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition"
              >
                {/* Top row: platform + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${meta.bg} rounded-lg flex items-center justify-center`}>
                      <PlatformIcon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{meta.label}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[post.status]}`}>
                    {post.status}
                  </span>
                </div>

                {/* Content preview */}
                <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{post.content}</p>

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {post.hashtags.length > 3 && (
                      <span className="text-xs text-slate-400 px-1 py-0.5">
                        +{post.hashtags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Date info */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {post.status === 'published' && post.publishedAt ? (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      Published {new Date(post.publishedAt).toLocaleDateString()}
                    </>
                  ) : post.scheduledAt ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Scheduled for {new Date(post.scheduledAt).toLocaleDateString()} at {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      Created {new Date(post.createdAt).toLocaleDateString()}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(post)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand transition px-2 py-1.5 rounded-lg hover:bg-slate-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <button
                      onClick={() => publishNow(post.id)}
                      disabled={publishing === post.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition px-2 py-1.5 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {publishing === post.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Publish Now
                    </button>
                  )}
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={deleting === post.id}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 transition px-2 py-1.5 rounded-lg hover:bg-rose-50 ml-auto disabled:opacity-50"
                  >
                    {deleting === post.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPost ? 'Edit Post' : 'Create New Post'}
              </h3>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Platform select */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setFormPlatform(p.key)}
                      disabled={!!editingPost}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition ${
                        formPlatform === p.key
                          ? `border-transparent ring-2 ${p.ring} ${p.bg}`
                          : 'border-slate-200 hover:border-slate-300'
                      } ${editingPost ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <p.icon className={`w-5 h-5 ${formPlatform === p.key ? p.color : 'text-slate-400'}`} />
                      <span className={`text-xs font-semibold ${formPlatform === p.key ? 'text-slate-900' : 'text-slate-500'}`}>
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Content</label>
                  <span className={`text-xs font-mono ${formContent.length > maxChars ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {formContent.length}/{maxChars}
                  </span>
                </div>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={5}
                  placeholder="Write your post content..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
                <button
                  type="button"
                  onClick={generateAICaption}
                  disabled={aiLoading}
                  className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand/80 transition disabled:opacity-50"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  AI Caption
                </button>
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Hashtags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formHashtags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full"
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(tag)}
                        className="ml-0.5 hover:text-rose-500 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formHashtagInput}
                    onChange={e => setFormHashtagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addHashtag();
                      }
                    }}
                    placeholder="Type a hashtag and press Enter"
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    type="button"
                    onClick={addHashtag}
                    className="px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Schedule</label>
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAsDraft}
                      onChange={e => setFormAsDraft(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                    />
                    <span className="text-sm text-slate-600">Save as Draft (no schedule)</span>
                  </label>
                </div>
                {!formAsDraft && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">Date</span>
                      </div>
                      <input
                        type="date"
                        value={formScheduleDate}
                        onChange={e => setFormScheduleDate(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">Time</span>
                      </div>
                      <input
                        type="time"
                        value={formScheduleTime}
                        onChange={e => setFormScheduleTime(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 rounded-2xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || formContent.length > maxChars || !formContent.trim()}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPost ? 'Update Post' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPlanner;
