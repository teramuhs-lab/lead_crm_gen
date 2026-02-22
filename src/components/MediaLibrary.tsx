import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Search, Grid, List,
  Trash2, Download, Plus, Video,
  FileText, Image as ImageIcon, File as FileIcon,
  Loader2, X
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { Asset } from '../types';
import { NexusHeader } from './NexusUI';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

const MediaLibrary: React.FC = () => {
  const { activeSubAccountId, notify } = useNexus();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch assets on mount and when sub-account changes
  useEffect(() => {
    if (!activeSubAccountId) return;
    const fetchAssets = async () => {
      try {
        const res = await fetch(`/api/assets?subAccountId=${activeSubAccountId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      }
    };
    fetchAssets();
  }, [activeSubAccountId]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSubAccountId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subAccountId', activeSubAccountId);

      const res = await fetch('/api/assets', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const newAsset = await res.json();
        setAssets((prev) => [newAsset, ...prev]);
        notify('File uploaded successfully');
      } else {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        notify(err.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      notify('Failed to upload file', 'error');
    } finally {
      setUploading(false);
      // Reset the input so the same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete handler
  const deleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        notify('Asset deleted');
      } else {
        notify('Failed to delete asset', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete asset', 'error');
    }
  };

  // Filtering
  const filteredAssets = assets.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'images' && a.type === 'image') ||
      (typeFilter === 'videos' && a.type === 'video') ||
      (typeFilter === 'documents' && (a.type === 'pdf' || a.type === 'document'));
    return matchesSearch && matchesType;
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      <NexusHeader title="Media Library" subtitle="Upload, organize, and manage images, videos, and documents">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload Files
              </>
            )}
          </button>
      </NexusHeader>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand' : 'text-slate-400'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand' : 'text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-500"
          >
            <option value="all">All Types</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="documents">Documents</option>
          </select>
        </div>
      </div>

      {/* Asset Display Area */}
      <div className="flex-1 bg-slate-50/50 rounded-xl p-8 border border-slate-200 shadow-inner overflow-y-auto">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand transition-all group flex flex-col"
              >
                <div className="aspect-square bg-slate-100 relative flex items-center justify-center p-4">
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-xl" />
                  ) : asset.type === 'video' ? (
                    <Video className="w-12 h-12 text-slate-300" />
                  ) : asset.type === 'pdf' ? (
                    <FileIcon className="w-12 h-12 text-slate-300" />
                  ) : (
                    <FileIcon className="w-12 h-12 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={asset.url}
                      download={asset.name}
                      className="p-2.5 bg-white text-slate-900 rounded-xl transition-transform hover:scale-105"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="p-2.5 bg-rose-500 text-white rounded-xl transition-transform hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-slate-900 truncate mb-1">{asset.name}</p>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>{formatSize(asset.size)}</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-brand hover:border-brand transition-all group"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mb-2 animate-spin" />
              ) : (
                <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              )}
              <span className="text-xs font-semibold">{uploading ? 'Uploading...' : 'Add Asset'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-xs font-semibold text-slate-400">File Name</th>
                  <th className="px-8 py-5 text-xs font-semibold text-slate-400">Type</th>
                  <th className="px-8 py-5 text-xs font-semibold text-slate-400">Size</th>
                  <th className="px-8 py-5 text-xs font-semibold text-slate-400">Date</th>
                  <th className="px-8 py-5 text-xs font-semibold text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-brand">
                          {asset.type === 'image' ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : asset.type === 'video' ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-xs font-semibold text-slate-400 capitalize">{asset.type}</span>
                    </td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-600">{formatSize(asset.size)}</td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-400">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <a
                          href={asset.url}
                          download={asset.name}
                          className="p-2 text-slate-300 hover:text-brand"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="p-2 text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
