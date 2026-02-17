
import React from 'react';
import { Calendar as LucideCalendar, Clock, User, ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';

const CalendarManager: React.FC = () => {
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM to 5 PM
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const appointments = [
    { id: 'a1', contact: 'John Doe', day: 'Tue', hour: 10, type: 'Demo' },
    { id: 'a2', contact: 'Jane Smith', day: 'Wed', hour: 14, type: 'Follow up' },
    { id: 'a3', contact: 'Mike Ross', day: 'Thu', hour: 11, type: 'Strategy Call' },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Booking Calendar</h2>
          <p className="text-slate-500 text-sm">Schedule and manage your appointments seamlessly</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1">
            <button className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-900">Week</button>
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-indigo-600">Month</button>
          </div>
          <button className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-medium hover:opacity-90 shadow-md flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Appointment
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900">October 14 - 18, 2023</h3>
            <div className="flex gap-1">
               <button className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
               <button className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <button className="text-xs font-bold text-brand hover:underline">Availability Settings</button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-20 border-r border-slate-100"></th>
                {weekDays.map(day => (
                  <th key={day} className="py-3 px-4 border-b border-slate-100 text-center">
                    <p className="text-xs font-medium text-slate-400">{day}</p>
                    <p className="text-lg font-bold text-slate-900">{14 + weekDays.indexOf(day)}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(hour => (
                <tr key={hour} className="group">
                  <td className="text-xs font-medium text-slate-400 text-center border-r border-slate-100 py-6 align-top">
                    {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                  </td>
                  {weekDays.map(day => {
                    const apt = appointments.find(a => a.day === day && a.hour === hour);
                    return (
                      <td key={day} className="border border-slate-50 relative min-h-[80px]">
                        {apt ? (
                          <div className="absolute inset-1 bg-indigo-50 border-l-4 border-brand rounded-lg p-2 shadow-sm cursor-pointer hover:bg-indigo-100 transition-all">
                             <p className="text-xs font-medium text-brand truncate">{apt.type}</p>
                             <p className="text-xs font-bold text-slate-900 truncate">{apt.contact}</p>
                             <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-2 h-2" /> 60m
                             </div>
                          </div>
                        ) : (
                          <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-crosshair">
                            <Plus className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CalendarManager;
