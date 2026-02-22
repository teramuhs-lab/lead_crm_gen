
import React, { useState, useCallback, useEffect } from 'react';
import {
  Star, Search, Plus, Sparkles, Trash2, Flag, Loader2,
  TrendingUp, MessageSquare, ThumbsUp, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { Review, ReviewPlatform, ReviewStatus } from '../types';
import { NexusHeader } from './NexusUI';

interface ReputationStats {
  avgRating: number;
  totalReviews: number;
  positivePercent: number;
  responseRate: number;
}

const PLATFORM_COLORS: Record<ReviewPlatform, string> = {
  google: 'bg-blue-100 text-blue-700',
  facebook: 'bg-indigo-100 text-indigo-700',
  yelp: 'bg-red-100 text-red-700',
  other: 'bg-slate-100 text-slate-700',
};

const STATUS_COLORS: Record<ReviewStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  responded: 'bg-emerald-100 text-emerald-700',
  flagged: 'bg-rose-100 text-rose-700',
};

const DEFAULT_STATS: ReputationStats = {
  avgRating: 0,
  totalReviews: 0,
  positivePercent: 0,
  responseRate: 0,
};

const ReputationManager: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  // ── Data state ──
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReputationStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<ReviewPlatform | 'all'>('all');

  // ── AI reply loading per review ──
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  // ── Inline reply editor state ──
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // ── Add review modal state ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReview, setNewReview] = useState({
    platform: 'google' as ReviewPlatform,
    author: '',
    rating: 5,
    content: '',
    externalUrl: '',
  });
  const [saving, setSaving] = useState(false);

  // ── Fetch helpers ──
  const fetchReviews = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<Review[]>(`/reputation?subAccountId=${activeSubAccountId}`);
      setReviews(data);
    } catch {
      notify('Failed to load reviews', 'error');
    }
  }, [activeSubAccountId, notify]);

  const fetchStats = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<ReputationStats>(`/reputation/stats?subAccountId=${activeSubAccountId}`);
      setStats(data);
    } catch {
      setStats(DEFAULT_STATS);
    }
  }, [activeSubAccountId, notify]);

  // ── Mount + activeSubAccountId change ──
  useEffect(() => {
    if (!activeSubAccountId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchReviews(), fetchStats()]);
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [activeSubAccountId, fetchReviews, fetchStats]);

  // ── Filtered reviews ──
  const filteredReviews = reviews.filter((r) => {
    const matchesPlatform = platformFilter === 'all' || r.platform === platformFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q || r.author.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
    return matchesPlatform && matchesSearch;
  });

  // ── Actions ──
  const handleAiReply = useCallback(async (id: string) => {
    setAiLoadingId(id);
    try {
      const updated = await api.post<Review>(`/reputation/${id}/ai-reply`);
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setReplyingId(id);
      setReplyText(updated.response);
      notify('AI reply generated');
    } catch {
      notify('Failed to generate AI reply', 'error');
    } finally {
      setAiLoadingId(null);
    }
  }, [notify]);

  const handleSaveReply = useCallback(async (id: string) => {
    try {
      const updated = await api.put<Review>(`/reputation/${id}`, { response: replyText });
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setReplyingId(null);
      setReplyText('');
      notify('Reply saved');
      fetchStats();
    } catch {
      notify('Failed to save reply', 'error');
    }
  }, [replyText, notify, fetchStats]);

  const handleFlag = useCallback(async (review: Review) => {
    const nextStatus: ReviewStatus = review.status === 'flagged' ? 'new' : 'flagged';
    try {
      const updated = await api.put<Review>(`/reputation/${review.id}`, { status: nextStatus });
      setReviews((prev) => prev.map((r) => (r.id === review.id ? updated : r)));
      notify(nextStatus === 'flagged' ? 'Review flagged' : 'Flag removed');
    } catch {
      notify('Failed to update review', 'error');
    }
  }, [notify]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/reputation/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      notify('Review deleted');
      fetchStats();
    } catch {
      notify('Failed to delete review', 'error');
    }
  }, [notify, fetchStats]);

  const handleAddReview = useCallback(async () => {
    if (!newReview.author.trim() || !newReview.content.trim()) {
      notify('Author and content are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<Review>('/reputation', {
        subAccountId: activeSubAccountId,
        platform: newReview.platform,
        author: newReview.author,
        rating: newReview.rating,
        content: newReview.content,
        externalUrl: newReview.externalUrl || undefined,
      });
      setReviews((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewReview({ platform: 'google', author: '', rating: 5, content: '', externalUrl: '' });
      notify('Review added');
      fetchStats();
    } catch {
      notify('Failed to add review', 'error');
    } finally {
      setSaving(false);
    }
  }, [newReview, activeSubAccountId, notify, fetchStats]);

  const openReplyEditor = useCallback((review: Review) => {
    setReplyingId(review.id);
    setReplyText(review.response || '');
  }, []);

  // ── Star renderers ──
  const renderStars = (rating: number, size = 'w-4 h-4') =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`${size} ${i < rating ? 'text-amber-400 fill-current' : 'text-slate-200'}`}
      />
    ));

  const renderClickableStars = (rating: number, onChange: (v: number) => void) =>
    Array.from({ length: 5 }).map((_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i + 1)}
        className="focus:outline-none"
      >
        <Star
          className={`w-6 h-6 cursor-pointer transition-colors ${
            i < rating ? 'text-amber-400 fill-current' : 'text-slate-300 hover:text-amber-300'
          }`}
        />
      </button>
    ));

  // ── Loading state ──
  if (loading) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-6 animate-in fade-in duration-700">
      <NexusHeader title="Reputation Manager" subtitle="Monitor and respond to reviews across Google, Facebook, and other platforms">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Review
        </button>
      </NexusHeader>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Rating */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Average Rating</span>
            <div className="p-1 bg-emerald-50 rounded text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-slate-900">
              {stats.avgRating.toFixed(1)}
            </span>
            <div className="flex">{renderStars(Math.round(stats.avgRating))}</div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Total Reviews</span>
            <MessageSquare className="w-4 h-4 text-brand" />
          </div>
          <span className="text-4xl font-semibold text-slate-900">{stats.totalReviews}</span>
          <p className="text-xs text-slate-500 mt-2">
            {stats.responseRate}% response rate
          </p>
        </div>

        {/* Positive Sentiment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-slate-400">Positive Sentiment</span>
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-4xl font-semibold text-slate-900">
            {stats.positivePercent}%
          </span>
          <p className="text-xs text-slate-500 mt-2">Based on ratings 4+</p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by author or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as ReviewPlatform | 'all')}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          <option value="all">All Platforms</option>
          <option value="google">Google</option>
          <option value="facebook">Facebook</option>
          <option value="yelp">Yelp</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* ── Review List ── */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-700 text-lg">No reviews found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {reviews.length === 0
              ? 'Add your first review to get started.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
            >
              {/* Top row: platform badge, author, date, status */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PLATFORM_COLORS[review.platform]}`}
                >
                  {review.platform}
                </span>
                <span className="font-bold text-slate-900">{review.author}</span>
                <span className="text-xs text-slate-400">
                  {new Date(review.reviewDate).toLocaleDateString()}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ml-auto ${STATUS_COLORS[review.status]}`}
                >
                  {review.status}
                </span>
              </div>

              {/* Star rating */}
              <div className="flex">{renderStars(review.rating, 'w-4 h-4')}</div>

              {/* Review content */}
              <p className="text-sm text-slate-600 leading-relaxed">{review.content}</p>

              {/* Existing response */}
              {review.response && replyingId !== review.id && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    Your Reply:
                  </span>
                  <p className="text-sm text-slate-700">{review.response}</p>
                </div>
              )}

              {/* Inline reply editor */}
              {replyingId === review.id && (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Write your reply..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveReply(review.id)}
                      disabled={!replyText.trim()}
                      className="px-4 py-2 bg-brand text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Save Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingId(null);
                        setReplyText('');
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                {/* Reply button */}
                {replyingId !== review.id && (
                  <button
                    onClick={() => openReplyEditor(review)}
                    className="px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/5 rounded-lg transition-colors"
                  >
                    Reply
                  </button>
                )}

                {/* AI Reply */}
                <button
                  onClick={() => handleAiReply(review.id)}
                  disabled={aiLoadingId === review.id}
                  className="px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {aiLoadingId === review.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  AI Reply
                </button>

                {/* Flag toggle */}
                <button
                  onClick={() => handleFlag(review)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    review.status === 'flagged'
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {review.status === 'flagged' ? 'Unflag' : 'Flag'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(review.id)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Review Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in duration-700">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Review</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Platform */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Platform
                </label>
                <select
                  value={newReview.platform}
                  onChange={(e) =>
                    setNewReview((prev) => ({
                      ...prev,
                      platform: e.target.value as ReviewPlatform,
                    }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                >
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="yelp">Yelp</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Author Name
                </label>
                <input
                  type="text"
                  value={newReview.author}
                  onChange={(e) =>
                    setNewReview((prev) => ({ ...prev, author: e.target.value }))
                  }
                  placeholder="Reviewer name"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Rating
                </label>
                <div className="flex gap-1">
                  {renderClickableStars(newReview.rating, (v) =>
                    setNewReview((prev) => ({ ...prev, rating: v }))
                  )}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Review Content
                </label>
                <textarea
                  value={newReview.content}
                  onChange={(e) =>
                    setNewReview((prev) => ({ ...prev, content: e.target.value }))
                  }
                  rows={4}
                  placeholder="What did the reviewer say?"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                />
              </div>

              {/* External URL */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  External URL
                  <span className="text-slate-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="url"
                  value={newReview.externalUrl}
                  onChange={(e) =>
                    setNewReview((prev) => ({ ...prev, externalUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReview}
                disabled={saving}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : 'Add Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReputationManager;
