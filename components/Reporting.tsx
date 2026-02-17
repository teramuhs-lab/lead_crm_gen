
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNexus } from '../context/NexusContext';
import { Calendar, UserCheck, UserX, TrendingUp, Download, Filter, BarChart3 } from 'lucide-react';
import { NexusCard, NexusButton, NexusHeader } from './NexusUI';

const Reporting: React.FC = () => {
  const { contacts, activeSubAccount } = useNexus();

  const chartData = useMemo(() => {
    const stages = ['Lead', 'Interested', 'Appointment', 'Closed'];
    return stages.map(stage => ({
      stage,
      value: contacts.filter(c => c.status === stage).length
    }));
  }, [contacts]);

  const pieData = useMemo(() => {
    const closed = contacts.filter(c => c.status === 'Closed').length;
    const others = contacts.length - closed;
    return [
      { name: 'Won Deals', value: closed, color: '#6366f1' },
      { name: 'In Pipeline', value: others, color: '#94a3b8' },
    ];
  }, [contacts]);

  const totalValue = contacts.length * activeSubAccount.leadValue;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <NexusHeader title="Business Analytics" subtitle="Visualizing performance across your sales ecosystem">
        <NexusButton variant="ghost" icon={Filter}>Date Range</NexusButton>
        <NexusButton variant="brand" icon={Download}>Export Report</NexusButton>
      </NexusHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <NexusCard padding="lg" className="flex flex-col items-center group">
           <h3 className="font-semibold text-slate-900 text-xs mb-8 w-full text-center">Conversion Rate</h3>
           <div className="h-72 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={pieData} innerRadius={80} outerRadius={110} paddingAngle={10} dataKey="value" stroke="none">
                       {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-medium text-slate-400">Efficiency</span>
                <span className="text-3xl font-semibold text-slate-900">{contacts.length > 0 ? ((contacts.filter(c => c.status === 'Closed').length / contacts.length) * 100).toFixed(0) : 0}%</span>
              </div>
           </div>
           <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 w-full">
              {pieData.map(item => (
                <div key={item.name} className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.color}}></div>
                      <span className="text-xs font-medium text-slate-400">{item.name}</span>
                   </div>
                   <span className="text-lg font-semibold text-slate-900 ml-4.5">{item.value}</span>
                </div>
              ))}
           </div>
        </NexusCard>

        <NexusCard padding="lg" className="lg:col-span-2">
           <div className="flex items-center justify-between mb-10">
              <h3 className="font-semibold text-slate-900 text-xs">Stage Distribution</h3>
              <BarChart3 className="w-5 h-5 text-brand" />
           </div>
           <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={50} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-10 p-6 bg-slate-900 rounded-xl flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <TrendingUp className="w-32 h-32 text-brand" />
              </div>
              <div className="flex items-center gap-6 relative z-10">
                 <div className="p-4 bg-white/10 rounded-2xl text-brand backdrop-blur-md shadow-xl"><TrendingUp className="w-8 h-8" /></div>
                 <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Projected Annual Revenue</p>
                    <p className="text-3xl font-semibold text-white">${(totalValue * 12).toLocaleString()}</p>
                 </div>
              </div>
              <NexusButton size="lg" className="relative z-10">View Forecast</NexusButton>
           </div>
        </NexusCard>
      </div>
    </div>
  );
};

export default Reporting;
