
import React, { useMemo } from 'react';
import {
  Users, Target, DollarSign, Activity, Zap, Clock,
  PieChart as PieChartIcon, BarChart3, CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNexus } from '../context/NexusContext';
import { NexusCard, NexusButton, NexusBadge, NexusHeader } from './NexusUI';

const Dashboard: React.FC = () => {
  const { contacts, activeSubAccount, setActiveView, workflowLogs, isSyncing } = useNexus();

  const metrics = useMemo(() => {
    const activeContacts = contacts.filter(c => !c.isArchived);
    const totalLeads = activeContacts.length;
    const closedWon = activeContacts.filter(c => c.status === 'Closed').length;
    const actualRevenue = closedWon * activeSubAccount.leadValue;
    const bookingRatio = totalLeads > 0 ? ((activeContacts.filter(c => c.status === 'Appointment').length / totalLeads) * 100).toFixed(1) : '0';

    return { totalLeads, closedWon, actualRevenue, bookingRatio };
  }, [contacts, activeSubAccount]);

  const stats = [
    { label: 'Total Contacts', value: metrics.totalLeads.toString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', trend: '+12.5%' },
    { label: 'Avg Response Time', value: '4.2m', icon: Clock, color: 'text-brand', bg: 'bg-indigo-50', trend: '-18%' },
    { label: 'Booking Rate', value: `${metrics.bookingRatio}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: '+2.1%' },
    { label: 'Revenue', value: `$${metrics.actualRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+18.2%' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <NexusHeader title="Dashboard" subtitle="Overview of your sales and marketing performance">
        <NexusButton variant="ghost" onClick={() => setActiveView('reporting')} icon={PieChartIcon}>Reports</NexusButton>
        <NexusButton variant="brand" onClick={() => setActiveView('contacts')} icon={Zap}>Add Contact</NexusButton>
      </NexusHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <NexusCard key={i} className="hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <NexusBadge variant={stat.trend.startsWith('+') ? 'emerald' : 'rose'}>{stat.trend}</NexusBadge>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </NexusCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NexusCard padding="lg">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-base font-semibold text-slate-900">Traffic Overview</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Incoming traffic by source</p>
               </div>
               <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ name: 'Mon', v: 400 }, { name: 'Tue', v: 300 }, { name: 'Wed', v: 900 }, { name: 'Thu', v: 600 }, { name: 'Fri', v: 800 }]}>
                  <defs><linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorV)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </NexusCard>
        </div>

        <div>
          <NexusCard padding="md" className="h-full">
            <h4 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-brand" /> Recent Activity
            </h4>
            <div className="space-y-3 max-h-80 overflow-y-auto thin-scrollbar pr-1">
               {workflowLogs.length > 0 ? workflowLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-white hover:border-slate-200 transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-sm font-semibold text-brand">{log.contactName.charAt(0)}</div>
                        <div>
                           <p className="text-sm font-medium text-slate-900">{log.contactName}</p>
                           <p className="text-xs text-slate-500">{log.workflowName}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end mb-0.5">
                           <NexusBadge variant="emerald">Success</NexusBadge>
                        </div>
                        <p className="text-xs text-slate-400">{log.timestamp}</p>
                     </div>
                  </div>
               )) : (
                 <div className="py-8 text-center text-sm text-slate-400">No recent activity</div>
               )}
            </div>
          </NexusCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
