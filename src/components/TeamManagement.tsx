
import React, { useState } from 'react';
import { UsersRound, UserPlus, Shield, Mail, MoreHorizontal, CheckCircle2, XCircle, Lock, Edit3, Trash2, Ban, Play } from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { SubAccountUser } from '../types';
import { NexusModal, NexusButton, NexusInput, NexusSelect, NexusHeader } from './NexusUI';

const PERMISSIONS = ['contacts', 'conversations', 'workflows', 'funnels', 'calendars', 'billing', 'settings', 'team'];

const TeamManagement: React.FC = () => {
  const { teamMembers, addTeamMember, updateTeamMember, removeTeamMember, notify } = useNexus();

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<SubAccountUser | null>(null);
  const [formData, setFormData] = useState<{ name: string; email: string; password: string; role: string; permissions: string[] }>({
    name: '',
    email: '',
    password: '',
    role: 'subaccount_user',
    permissions: [],
  });
  const [showActions, setShowActions] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingMember(null);
    setFormData({ name: '', email: '', password: '', role: 'subaccount_user', permissions: [] });
    setShowModal(true);
  };

  const openEditModal = (member: SubAccountUser) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      permissions: [...member.permissions],
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingMember) {
      updateTeamMember({
        ...editingMember,
        name: formData.name,
        role: formData.role as SubAccountUser['role'],
        permissions: formData.permissions,
      });
    } else {
      if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
        notify?.('Please fill in all required fields', 'error');
        return;
      }
      addTeamMember({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        permissions: formData.permissions,
      });
    }
    setShowModal(false);
  };

  const handleToggleStatus = (member: SubAccountUser) => {
    let newStatus: SubAccountUser['status'];
    if (member.status === 'active') {
      newStatus = 'suspended';
    } else if (member.status === 'suspended') {
      newStatus = 'active';
    } else {
      newStatus = 'active';
    }
    updateTeamMember({ ...member, status: newStatus });
  };

  const handleRemove = (id: string) => {
    removeTeamMember(id);
    setShowActions(null);
  };

  const togglePermission = (perm: string) => {
    setFormData(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <NexusHeader title="Team Management" subtitle="Invite team members, assign roles, and manage permissions">
        <NexusButton onClick={openAddModal} icon={UserPlus}>Add Team Member</NexusButton>
      </NexusHeader>

      {/* Team Table */}
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
            {teamMembers.map(member => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-semibold text-slate-400">
                      {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{member.name || 'Unnamed'}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                    member.role === 'agency_admin' ? 'bg-indigo-50 text-brand border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {member.role === 'agency_admin' ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex gap-1.5 flex-wrap">
                    {(member.permissions as string[]).length > 0 ? (member.permissions as string[]).map(p => (
                      <span key={p} className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500">{p}</span>
                    )) : (
                      <span className="text-xs text-slate-300">No permissions</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-1.5">
                    {member.status === 'active' && <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs font-medium text-emerald-600">Active</span></>}
                    {member.status === 'suspended' && <><Ban className="w-4 h-4 text-rose-500" /><span className="text-xs font-medium text-rose-600">Suspended</span></>}
                    {member.status === 'invited' && <><Mail className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-amber-600">Invited</span></>}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="relative inline-block">
                    <button onClick={() => setShowActions(showActions === member.id ? null : member.id)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {showActions === member.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                        <button onClick={() => { openEditModal(member); setShowActions(null); }} className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                          <Edit3 className="w-3.5 h-3.5" /> Edit Member
                        </button>
                        <button onClick={() => { handleToggleStatus(member); setShowActions(null); }} className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                          {member.status === 'suspended' ? <><Play className="w-3.5 h-3.5" /> Activate</> : <><Ban className="w-3.5 h-3.5" /> Suspend</>}
                        </button>
                        <button onClick={() => handleRemove(member.id)} className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3">
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {teamMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center">
                  <UsersRound className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-medium text-slate-400">No team members yet</p>
                  <p className="text-xs text-slate-300 mt-1">Add your first team member to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Global Permissions card (decorative) */}
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

        {/* Security Audit Log (decorative) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-brand/20 text-brand rounded-xl flex items-center justify-center mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 leading-tight">Security Audit Log</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">Track every administrative action taken by your team members to ensure total platform security and accountability.</p>
            <div className="space-y-4">
              {teamMembers.slice(0, 3).map((member, i) => (
                <div key={member.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                  <div className="flex gap-3 items-center">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-brand' : 'bg-slate-700'}`}></div>
                    <span className="text-xs font-bold">{member.name || member.email} logged in</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{i === 0 ? 'Just now' : `${i} hour${i > 1 ? 's' : ''} ago`}</span>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                  <span className="text-xs font-bold text-slate-500">No activity yet</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-brand/10 blur-3xl rounded-full"></div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <NexusModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingMember ? 'Edit Team Member' : 'Add Team Member'} subtitle={editingMember ? 'Update member details and permissions' : 'Create a new account for your team member'}>
        <div className="space-y-5">
          <NexusInput label="Full Name" placeholder="John Smith" value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} />

          {!editingMember && (
            <>
              <NexusInput label="Email Address" placeholder="john@company.com" type="email" value={formData.email} onChange={e => setFormData(f => ({...f, email: e.target.value}))} />
              <NexusInput label="Temporary Password" placeholder="Minimum 6 characters" type="password" value={formData.password} onChange={e => setFormData(f => ({...f, password: e.target.value}))} />
            </>
          )}

          <NexusSelect label="Role" value={formData.role} onChange={e => setFormData(f => ({...f, role: e.target.value}))}>
            <option value="agency_admin">Admin</option>
            <option value="subaccount_user">User</option>
          </NexusSelect>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 block">Permissions</label>
            <div className="grid grid-cols-2 gap-3">
              {PERMISSIONS.map(perm => (
                <label key={perm} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  formData.permissions.includes(perm) ? 'bg-indigo-50 border-brand' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="w-4 h-4 rounded text-brand focus:ring-brand"
                  />
                  <span className="text-xs font-bold text-slate-700 capitalize">{perm}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <NexusButton className="w-full" size="lg" onClick={handleSave}>
              {editingMember ? 'Update Member' : 'Add Member'}
            </NexusButton>
          </div>
        </div>
      </NexusModal>
    </div>
  );
};

export default TeamManagement;
