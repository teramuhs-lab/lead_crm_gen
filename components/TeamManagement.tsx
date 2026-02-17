
import React from 'react';
import { UsersRound, UserPlus, Shield, Mail, MoreHorizontal, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { SubAccountUser } from '../types';

const TeamManagement: React.FC = () => {
  const team: SubAccountUser[] = [
    { id: 'u1', name: 'Alex Thompson', email: 'alex@acmegrowth.com', role: 'Admin', permissions: ['all'] },
    { id: 'u2', name: 'Sarah Miller', email: 'sarah@acmegrowth.com', role: 'Sales', permissions: ['crm', 'conversations'] },
    { id: 'u3', name: 'Mike Johnson', email: 'mike@acmegrowth.com', role: 'User', permissions: ['crm'] },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-semibold text-slate-900 leading-tight">Team & Permissions</h2>
           <p className="text-sm text-slate-500">Manage internal staff and control their access levels across the platform</p>
        </div>
        <button className="px-6 py-3 bg-brand text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90">
           <UserPlus className="w-4 h-4" /> Add Team Member
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-semibold text-slate-400">Team Member</th>
              <th className="px-8 py-5 text-xs font-semibold text-slate-400">Role</th>
              <th className="px-8 py-5 text-xs font-semibold text-slate-400">Permissions</th>
              <th className="px-8 py-5 text-xs font-semibold text-slate-400">Status</th>
              <th className="px-8 py-5 text-xs font-semibold text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {team.map(member => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-semibold text-slate-400">
                         {member.name.charAt(0)}
                      </div>
                      <div>
                         <p className="text-sm font-bold text-slate-900 leading-tight">{member.name}</p>
                         <p className="text-sm text-slate-400 mt-0.5">{member.email}</p>
                      </div>
                   </div>
                </td>
                <td className="px-8 py-5">
                   <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-brand rounded-full text-xs font-semibold border border-indigo-100">
                      {member.role}
                   </span>
                </td>
                <td className="px-8 py-5">
                   <div className="flex gap-1.5">
                      {member.permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500">
                           {p}
                        </span>
                      ))}
                   </div>
                </td>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">Active</span>
                   </div>
                </td>
                <td className="px-8 py-5 text-right">
                   <button className="p-2 text-slate-300 hover:text-slate-900"><MoreHorizontal className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-3"><Shield className="w-5 h-5 text-brand" /> Global Permissions</h3>
            <div className="space-y-4">
               {[
                 { label: 'Can Export Contacts', checked: false },
                 { label: 'Can Delete Sub-accounts', checked: false },
                 { label: 'Access to Billing Settings', checked: false },
                 { label: 'Access to Snapshots', checked: true },
               ].map(item => (
                 <label key={item.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-white hover:border-brand transition-all">
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                    <input type="checkbox" defaultChecked={item.checked} className="w-4 h-4 rounded text-brand focus:ring-brand" />
                 </label>
               ))}
            </div>
         </div>

         <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
               <div className="w-14 h-14 bg-brand/20 text-brand rounded-xl flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-semibold mb-4 leading-tight">Security Audit Log</h3>
               <p className="text-sm text-slate-400 leading-relaxed mb-8">Track every administrative action taken by your team members to ensure total platform security and accountability.</p>
               <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                     <div className="flex gap-3 items-center">
                        <div className="w-2 h-2 rounded-full bg-brand"></div>
                        <span className="text-xs font-bold">Alex Thompson updated sub-account Acme</span>
                     </div>
                     <span className="text-xs font-bold text-slate-500">2 mins ago</span>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                     <div className="flex gap-3 items-center">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        <span className="text-xs font-bold">Sarah Miller exported contact list</span>
                     </div>
                     <span className="text-xs font-bold text-slate-500">1 hour ago</span>
                  </div>
               </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-brand/10 blur-3xl rounded-full"></div>
         </div>
      </div>
    </div>
  );
};

export default TeamManagement;
