
import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, Search, Loader2, Package, DollarSign, ShoppingBag,
  CheckCircle2, Pencil, Trash2, X, LayoutGrid, List,
} from 'lucide-react';
import { api } from '../lib/api';
import { useNexus } from '../context/NexusContext';
import { Product, ProductType, ProductStatus } from '../types';
import { NexusHeader } from './NexusUI';

/* ─── helpers ─── */

interface ProductStats {
  totalProducts: number;
  totalRevenue: number;
  activeProducts: number;
}

const fmtPrice = (cents: number) =>
  '$' + (cents / 100).toFixed(2);

const typeBadge: Record<ProductType, string> = {
  digital:  'bg-indigo-50 text-brand',
  physical: 'bg-emerald-50 text-emerald-600',
  service:  'bg-amber-50 text-amber-600',
};

const statusColor: Record<ProductStatus, { dot: string; text: string; label: string }> = {
  active:   { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active' },
  draft:    { dot: 'bg-slate-300',   text: 'text-slate-400',   label: 'Draft' },
  archived: { dot: 'bg-red-400',     text: 'text-red-500',     label: 'Archived' },
};

/* ─── component ─── */

const StoreManager: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();

  /* state */
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({ totalProducts: 0, totalRevenue: 0, activeProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    type: 'digital' as ProductType,
    stock: '',
    imageUrl: '',
    status: 'draft' as ProductStatus,
  });
  const [saving, setSaving] = useState(false);

  /* data fetching */
  const fetchProducts = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<Product[]>(`/products?subAccountId=${activeSubAccountId}`);
      setProducts(data);
    } catch {
      notify('Failed to load products', 'error');
    }
  }, [activeSubAccountId, notify]);

  const fetchStats = useCallback(async () => {
    if (!activeSubAccountId) return;
    try {
      const data = await api.get<ProductStats>(`/products/stats?subAccountId=${activeSubAccountId}`);
      setStats(data);
    } catch {
      // keep defaults
    }
  }, [activeSubAccountId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchProducts, fetchStats]);

  /* filtered list */
  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  /* ── actions ── */

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', type: 'digital', stock: '', imageUrl: '', status: 'draft' });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: (p.price / 100).toFixed(2),
      type: p.type,
      stock: String(p.stock),
      imageUrl: p.imageUrl || '',
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Math.round(parseFloat(form.price || '0') * 100),
        type: form.type,
        stock: parseInt(form.stock || '0', 10),
        imageUrl: form.imageUrl || undefined,
      };

      if (editing) {
        const updated = await api.put<Product>(`/products/${editing.id}`, {
          ...payload,
          status: form.status,
        });
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        notify('Product updated');
      } else {
        const created = await api.post<Product>('/products', {
          subAccountId: activeSubAccountId,
          ...payload,
        });
        setProducts((prev) => [created, ...prev]);
        fetchStats();
        notify('Product created');
      }
      setModalOpen(false);
    } catch {
      notify('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      fetchStats();
      notify('Product deleted');
    } catch {
      notify('Failed to delete product', 'error');
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
      <NexusHeader title="Store" subtitle="Manage your products, inventory, and online storefront">
        <button
          onClick={openCreate}
          className="px-6 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </NexusHeader>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Total Products</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{stats.totalProducts}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Total Revenue</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{fmtPrice(stats.totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-400">Active Products</p>
          </div>
          <p className="text-2xl font-semibold text-slate-900">{stats.activeProducts}</p>
        </div>
      </div>

      {/* ── Search bar + Type filter + View toggle ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['all', 'digital', 'physical', 'service'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-white shadow-sm text-brand'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-brand' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-brand' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Product Grid / List ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No products yet</h3>
          <p className="text-sm text-slate-400 mb-6">Create your first product to start selling.</p>
          <button
            onClick={openCreate}
            className="px-6 py-3 bg-brand text-white rounded-2xl font-bold text-sm hover:opacity-90"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Add Product
          </button>
        </div>
      ) : view === 'grid' ? (
        /* ── Grid view ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const sc = statusColor[product.status];
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-brand transition-all"
              >
                {/* Image placeholder */}
                <div className="h-40 bg-slate-50 relative flex items-center justify-center p-8">
                  <div className="absolute top-4 right-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge[product.type]}`}>
                      {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                    </span>
                  </div>
                  <Package className="w-12 h-12 text-slate-200 group-hover:scale-110 transition-transform" />
                </div>

                {/* Card body */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-900 group-hover:text-brand transition-colors">
                      {product.name}
                    </h4>
                  </div>
                  <p className="text-xl font-semibold text-slate-900">{fmtPrice(product.price)}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                    <span className="text-xs font-medium text-slate-400">Stock: {product.stock}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                      <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 mt-3">
                    <button
                      onClick={() => openEdit(product)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List view ── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Product</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Type</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Price</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Stock</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const sc = statusColor[product.status];
                return (
                  <tr key={product.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-300" />
                        </div>
                        <span className="font-semibold text-slate-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge[product.type]}`}>
                        {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{fmtPrice(product.price)}</td>
                    <td className="px-6 py-4 text-slate-600">{product.stock}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(product)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editing ? 'Edit Product' : 'New Product'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* name */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ultimate Agency Snapshot"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* description */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your product..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
              </div>

              {/* price */}
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

              {/* type */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Product Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['digital', 'physical', 'service'] as ProductType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                        form.type === t
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* stock */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* image URL */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Image URL</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              {/* status toggle (edit only) */}
              {editing && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['draft', 'active', 'archived'] as ProductStatus[]).map((s) => (
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
                disabled={saving || !form.name.trim()}
                className="px-6 py-2.5 bg-brand text-white rounded-2xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManager;
