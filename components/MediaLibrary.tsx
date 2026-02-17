
import React, { useState } from 'react';
import {
  FolderOpen, Upload, Search, Grid, List,
  MoreVertical, FileText, Image as ImageIcon,
  Video, File as FileIcon, Trash2, Download, ExternalLink, Plus
} from 'lucide-react';
import { Asset } from '../types';

const MediaLibrary: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'agency-logo.png', type: 'image', url: 'https://picsum.photos/seed/logo/200/200', size: '1.2 MB', createdAt: '2023-10-15' },
    { id: '2', name: 'marketing-video-v1.mp4', type: 'video', url: '#', size: '45.0 MB', createdAt: '2023-10-14' },
    { id: '3', name: 'onboarding-guide.pdf', type: 'pdf', url: '#', size: '2.5 MB', createdAt: '2023-10-12' },
    { id: '4', name: 'hero-bg.jpg', type: 'image', url: 'https://picsum.photos/seed/hero/800/400', size: '3.8 MB', createdAt: '2023-10-10' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const deleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">Media Library</h2>
          <p className="text-sm text-slate-500">Centralized assets for sites, funnels, and email marketing</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100">
            <Upload className="w-4 h-4" /> Upload Files
          </button>
        </div>
      </div>

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
          <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-500">
            <option>All Types</option>
            <option>Images</option>
            <option>Videos</option>
            <option>Documents</option>
          </select>
          <button className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-500">New Folder</button>
        </div>
      </div>

      <div className="flex-1 bg-slate-50/50 rounded-xl p-8 border border-slate-200 shadow-inner overflow-y-auto">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-brand transition-all group flex flex-col">
                <div className="aspect-square bg-slate-100 relative flex items-center justify-center p-4">
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-xl" />
                  ) : asset.type === 'video' ? (
                    <Video className="w-12 h-12 text-slate-300" />
                  ) : (
                    <FileIcon className="w-12 h-12 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2.5 bg-white text-slate-900 rounded-xl transition-transform"><Download className="w-4 h-4" /></button>
                    <button onClick={() => deleteAsset(asset.id)} className="p-2.5 bg-rose-500 text-white rounded-xl transition-transform"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-slate-900 truncate mb-1">{asset.name}</p>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>{asset.size}</span>
                    <span>{asset.createdAt}</span>
                  </div>
                </div>
              </div>
            ))}
            <button className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-brand hover:border-brand transition-all group">
              <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Add Asset</span>
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
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-brand">
                          {asset.type === 'image' ? <ImageIcon className="w-4 h-4" /> : asset.type === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-xs font-semibold text-slate-400">{asset.type}</span>
                    </td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-600">{asset.size}</td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-400">{asset.createdAt}</td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <button className="p-2 text-slate-300 hover:text-brand"><Download className="w-4 h-4" /></button>
                        <button onClick={() => deleteAsset(asset.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
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
