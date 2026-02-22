
import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, Loader2, DollarSign, Users, BookOpen,
  GraduationCap, Pencil, Trash2, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { Course, CourseStatus } from '../types';
import { NexusHeader } from './NexusUI';

/* ─── helpers ─── */

interface CourseStats {
  totalStudents: number;
  totalRevenue: number;
  activeCourses: number;
}

const fmtCurrency = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge: Record<CourseStatus, string> = {
  published: 'bg-emerald-100 text-emerald-700',
  draft:     'bg-slate-50 text-slate-400',
  archived:  'bg-slate-100 text-slate-600',
};

/* ─── component ─── */

const MembershipPortal: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  /* state */
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<CourseStats>({ totalStudents: 0, totalRevenue: 0, activeCourses: 0 });
  const [loading, setLoading] = useState(true);

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    lessonCount: '',
    status: 'draft' as CourseStatus,
  });
  const [saving, setSaving] = useState(false);

  /* data fetching */
  const fetchCourses = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<Course[]>(`/courses?subAccountId=${activeSubAccountId}`);
      setCourses(data);
    } catch {
      notify('Failed to load courses', 'error');
    }
  }, [activeSubAccountId, notify]);

  const fetchStats = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<CourseStats>(`/courses/stats?subAccountId=${activeSubAccountId}`);
      setStats(data);
    } catch {
      // keep defaults
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCourses(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchCourses, fetchStats]);

  /* ── actions ── */

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', price: '', lessonCount: '', status: 'draft' });
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description,
      price: (c.price / 100).toFixed(2),
      lessonCount: String(c.lessonCount),
      status: c.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.put<Course>(`/courses/${editing.id}`, {
          title: form.title,
          description: form.description,
          price: Math.round(parseFloat(form.price || '0') * 100),
          lessonCount: parseInt(form.lessonCount || '0', 10),
          status: form.status,
        });
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        notify('Course updated');
      } else {
        const created = await api.post<Course>('/courses', {
          subAccountId: activeSubAccountId,
          title: form.title,
          description: form.description,
          price: Math.round(parseFloat(form.price || '0') * 100),
          lessonCount: parseInt(form.lessonCount || '0', 10),
        });
        setCourses((prev) => [created, ...prev]);
        fetchStats();
        notify('Course created');
      }
      setModalOpen(false);
    } catch {
      notify('Failed to save course', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await api.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      fetchStats();
      notify('Course deleted');
    } catch {
      notify('Failed to delete course', 'error');
    }
  };

  /* ── render ── */

  if (loading) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-8 max-w-7xl mx-auto">
      <NexusHeader title="Membership Portal" subtitle="Create and manage membership sites, courses, and gated content">
        <button
          onClick={openCreate}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 text-sm"
        >
          <Plus className="w-4 h-4" /> Create Course
        </button>
      </NexusHeader>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Total Students</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{stats.totalStudents.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Membership Revenue</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{fmtCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Active Courses</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{stats.activeCourses}</p>
        </div>
      </div>

      {/* ── Course Card Grid ── */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No courses yet</h3>
          <p className="text-sm text-slate-400 mb-6">Create your first course to start building your membership portal.</p>
          <button
            onClick={openCreate}
            className="px-6 py-3 bg-brand text-white rounded-2xl font-bold text-sm hover:opacity-90"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors group"
            >
              {/* image placeholder */}
              <div className="h-32 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors" />
                <GraduationCap className="absolute bottom-4 right-4 w-12 h-12 text-brand/20" />
              </div>

              <div className="p-6">
                {/* title + status */}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{c.title}</h4>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ml-3 ${statusBadge[c.status]}`}>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                </div>

                {/* description preview */}
                {c.description && (
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">{c.description}</p>
                )}

                {/* stats row */}
                <div className="flex items-center gap-6 text-xs mb-4">
                  <div>
                    <span className="text-slate-400">Students</span>
                    <p className="font-semibold text-slate-900">{c.studentCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Lessons</span>
                    <p className="font-semibold text-slate-900">{c.lessonCount}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Revenue</span>
                    <p className="font-semibold text-emerald-600">{fmtCurrency(c.revenue)}</p>
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => openEdit(c)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => deleteCourse(c.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editing ? 'Edit Course' : 'New Course'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* body */}
            <div className="p-6 space-y-5">
              {/* title */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Course Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Marketing Mastery 101"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* description */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what students will learn..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
              </div>

              {/* price + lesson count */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Price ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Lesson Count</label>
                  <input
                    type="number"
                    min="0"
                    value={form.lessonCount}
                    onChange={(e) => setForm({ ...form, lessonCount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              {/* status select (edit only) */}
              {editing && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['draft', 'published', 'archived'] as CourseStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm({ ...form, status: s })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          form.status === s
                            ? 'border-brand bg-brand/5 text-brand'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPortal;
