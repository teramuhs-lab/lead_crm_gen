
import React from 'react';
import { ShoppingBag, Box, Tag, Package, Plus, Search, MoreVertical, LayoutGrid, CheckCircle2, TrendingUp } from 'lucide-react';
import { Product } from '../types';

const StoreManager: React.FC = () => {
  const products: Product[] = [
    { id: 'p1', name: 'Ultimate Agency Snapshot', price: 297.00, stock: 999, type: 'digital' },
    { id: 'p2', name: 'White-Label Marketing PDF', price: 49.00, stock: 120, type: 'digital' },
    { id: 'p3', name: 'CRM Consulting Hour', price: 150.00, stock: 15, type: 'physical' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">Commerce Hub</h2>
              <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Beta</span>
           </div>
           <p className="text-sm text-slate-500">Manage products, fulfillment, and direct store sales</p>
        </div>
        <div className="flex gap-3">
           <button className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage Shipping</button>
           <button className="px-6 py-3 bg-brand text-white rounded-xl font-semibold shadow-lg flex items-center gap-2 hover:opacity-90 transition-all">
             <Plus className="w-4 h-4" /> Add Product
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
               </div>
               <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  <button className="p-2 bg-white rounded-lg shadow-sm text-brand"><LayoutGrid className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-400 hover:text-slate-600"><Tag className="w-4 h-4" /></button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {products.map(product => (
                 <div key={product.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-brand transition-all">
                    <div className="h-40 bg-slate-50 relative flex items-center justify-center p-8">
                       <div className="absolute top-4 right-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${product.type === 'digital' ? 'bg-indigo-50 text-brand' : 'bg-emerald-50 text-emerald-600'}`}>
                             {product.type}
                          </span>
                       </div>
                       <Package className="w-12 h-12 text-slate-200 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-6">
                       <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-slate-900 group-hover:text-brand transition-colors">{product.name}</h4>
                          <button className="text-slate-300 hover:text-slate-900"><MoreVertical className="w-4 h-4" /></button>
                       </div>
                       <p className="text-xl font-semibold text-slate-900">${product.price.toLocaleString()}</p>
                       <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                          <span className="text-xs font-medium text-slate-400">Inventory: {product.stock}</span>
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                             <span className="text-xs font-medium text-emerald-600">Live</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 shadow-sm">
               <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand" /> Sales Performance</h3>
               <div className="space-y-4">
                  <div>
                     <p className="text-xs font-medium text-slate-500 mb-1">Today's Revenue</p>
                     <p className="text-2xl font-semibold text-white">$1,240.00</p>
                  </div>
                  <div>
                     <p className="text-xs font-medium text-slate-500 mb-1">Recent Orders</p>
                     <p className="text-2xl font-semibold text-white">42</p>
                  </div>
                  <button className="w-full py-3 bg-brand text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/50 mt-4">View Orders Hub</button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand" /> Connect Payment</h4>
               <p className="text-xs text-slate-500 leading-relaxed">Your store is currently connected to Stripe. All sales are automatically tracked in your Payments tab.</p>
               <button className="w-full mt-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors">Manage Gateway</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default StoreManager;
