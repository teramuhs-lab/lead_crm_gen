
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as LucideCalendar, Clock, User, ChevronLeft, ChevronRight, Plus, X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { Appointment } from '../types';
import { NexusModal, NexusButton, NexusInput, NexusSelect, NexusHeader } from './NexusUI';

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const CalendarManager: React.FC = () => {
  const { addAppointment, updateAppointment, deleteAppointment, calendars, contacts, notify } = useNexus();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    contactId: '',
    contactName: '',
    date: '',
    startHour: '09',
    endHour: '10',
    notes: '',
  });

  useEffect(() => {
    const fetchWeek = async () => {
      setLoading(true);
      try {
        const apts = await api.get<Appointment[]>(`/calendars/appointments?weekStart=${currentWeekStart.toISOString()}`);
        setWeekAppointments(apts);
      } catch {
        setWeekAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWeek();
  }, [currentWeekStart]);

  const prevWeek = useCallback(() => {
    setCurrentWeekStart(prev => new Date(prev.getTime() - 7 * 86400000));
  }, []);

  const nextWeek = useCallback(() => {
    setCurrentWeekStart(prev => new Date(prev.getTime() + 7 * 86400000));
  }, []);

  const goToday = useCallback(() => {
    setCurrentWeekStart(getMonday(new Date()));
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  const startDay = weekDays[0];
  const endDay = weekDays[6];
  const weekLabel = `${startDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endDay.getFullYear()}`;

  const handleCellClick = (day: Date, hour: number) => {
    setEditingAppointment(null);
    setFormData({
      title: '',
      contactId: '',
      contactName: '',
      date: day.toISOString().split('T')[0],
      startHour: hour.toString().padStart(2, '0'),
      endHour: (hour + 1).toString().padStart(2, '0'),
      notes: '',
    });
    setShowModal(true);
  };

  const handleAppointmentClick = (apt: Appointment) => {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    setEditingAppointment(apt);
    setFormData({
      title: apt.title,
      contactId: apt.contactId,
      contactName: apt.contactName,
      date: start.toISOString().split('T')[0],
      startHour: start.getHours().toString().padStart(2, '0'),
      endHour: end.getHours().toString().padStart(2, '0'),
      notes: apt.notes,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { notify('Please enter a title', 'error'); return; }
    if (!formData.date) { notify('Please select a date', 'error'); return; }
    if (parseInt(formData.endHour) <= parseInt(formData.startHour)) { notify('End time must be after start time', 'error'); return; }
    const startTime = new Date(`${formData.date}T${formData.startHour}:00:00`).toISOString();
    const endTime = new Date(`${formData.date}T${formData.endHour}:00:00`).toISOString();

    if (editingAppointment) {
      const updated: Appointment = {
        ...editingAppointment,
        title: formData.title,
        contactId: formData.contactId,
        contactName: formData.contactName,
        startTime,
        endTime,
        notes: formData.notes,
      };
      updateAppointment(updated);
    } else {
      addAppointment({
        calendarId: calendars[0]?.id || '',
        contactId: formData.contactId,
        contactName: formData.contactName,
        title: formData.title,
        startTime,
        endTime,
        notes: formData.notes,
      });
    }
    setShowModal(false);
    // Refetch after a brief delay to get the server-assigned ID
    setTimeout(async () => {
      try {
        const apts = await api.get<Appointment[]>(`/calendars/appointments?weekStart=${currentWeekStart.toISOString()}`);
        setWeekAppointments(apts);
      } catch {}
    }, 500);
  };

  const handleDelete = () => {
    if (editingAppointment) {
      deleteAppointment(editingAppointment.id);
      setShowModal(false);
      setWeekAppointments(prev => prev.filter(a => a.id !== editingAppointment.id));
    }
  };

  const handleCancel = () => {
    if (editingAppointment) {
      const cancelled = { ...editingAppointment, status: 'cancelled' as const };
      updateAppointment(cancelled);
      setShowModal(false);
      setWeekAppointments(prev => prev.map(a => a.id === editingAppointment.id ? cancelled : a));
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <NexusHeader title="Booking Calendar" subtitle="Schedule appointments, manage availability, and sync your calendar">
          <button onClick={goToday} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:text-brand transition-colors">Today</button>
          <NexusButton onClick={() => { const now = new Date(); handleCellClick(now, Math.max(8, Math.min(now.getHours() + 1, 17))); }} icon={Plus}>Create Appointment</NexusButton>
      </NexusHeader>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Week navigation header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900">{weekLabel}</h3>
            <div className="flex gap-1">
              <button onClick={prevWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={nextWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400">{weekAppointments.filter(a => a.status === 'booked').length} appointments this week</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-20 border-r border-slate-100"></th>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <th key={i} className="py-3 px-4 border-b border-slate-100 text-center">
                      <p className="text-xs font-medium text-slate-400">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-brand' : 'text-slate-900'}`}>{day.getDate()}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map(hour => (
                <tr key={hour} className="group">
                  <td className="text-xs font-medium text-slate-400 text-center border-r border-slate-100 py-6 align-top">
                    {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                  </td>
                  {weekDays.map((day, di) => {
                    const dayApts = weekAppointments.filter(a => {
                      const s = new Date(a.startTime);
                      return s.getFullYear() === day.getFullYear() &&
                             s.getMonth() === day.getMonth() &&
                             s.getDate() === day.getDate() &&
                             s.getHours() === hour;
                    });
                    return (
                      <td key={di} className="border border-slate-50 relative min-h-[80px] cursor-pointer" onClick={() => handleCellClick(day, hour)}>
                        {dayApts.map(apt => (
                          <div
                            key={apt.id}
                            onClick={(e) => { e.stopPropagation(); handleAppointmentClick(apt); }}
                            className={`absolute inset-1 rounded-lg p-2 shadow-sm cursor-pointer transition-all ${
                              apt.status === 'cancelled' ? 'bg-rose-50 border-l-4 border-rose-400 opacity-60' :
                              apt.status === 'completed' ? 'bg-emerald-50 border-l-4 border-emerald-400' :
                              'bg-indigo-50 border-l-4 border-brand hover:bg-indigo-100'
                            }`}
                          >
                            <p className="text-xs font-medium text-brand truncate">{apt.title}</p>
                            <p className="text-xs font-bold text-slate-900 truncate">{apt.contactName}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(apt.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(apt.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                        {dayApts.length === 0 && (
                          <div className="w-full h-full min-h-[60px] opacity-0 group-hover:opacity-100 flex items-center justify-center">
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

      {/* Create/Edit Modal */}
      <NexusModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAppointment ? 'Edit Appointment' : 'Create Appointment'} subtitle={editingAppointment ? 'Update appointment details' : 'Schedule a new appointment'}>
        <div className="space-y-5">
          <NexusInput label="Title" placeholder="Demo call, Strategy meeting..." value={formData.title} onChange={e => setFormData(f => ({...f, title: e.target.value}))} />

          <NexusSelect label="Contact" value={formData.contactId} onChange={e => {
            const contact = contacts.find(c => c.id === e.target.value);
            setFormData(f => ({...f, contactId: e.target.value, contactName: contact?.name || ''}));
          }}>
            <option value="">Select a contact...</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NexusSelect>

          <NexusInput label="Date" type="date" value={formData.date} onChange={e => setFormData(f => ({...f, date: e.target.value}))} />

          <div className="grid grid-cols-2 gap-4">
            <NexusSelect label="Start Time" value={formData.startHour} onChange={e => {
              const newStart = parseInt(e.target.value);
              const newEnd = Math.min(newStart + 1, 18).toString().padStart(2, '0');
              setFormData(f => ({...f, startHour: e.target.value, endHour: parseInt(f.endHour) <= newStart ? newEnd : f.endHour }));
            }}>
              {Array.from({ length: 11 }, (_, i) => i + 8).map(h => (
                <option key={h} value={h.toString().padStart(2, '0')}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}</option>
              ))}
            </NexusSelect>
            <NexusSelect label="End Time" value={formData.endHour} onChange={e => setFormData(f => ({...f, endHour: e.target.value}))}>
              {Array.from({ length: 11 }, (_, i) => i + 8).filter(h => h > parseInt(formData.startHour)).map(h => (
                <option key={h} value={h.toString().padStart(2, '0')}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}</option>
              ))}
            </NexusSelect>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 block">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(f => ({...f, notes: e.target.value}))}
              placeholder="Optional notes..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand/20 resize-none h-24"
            />
          </div>

          <div className="pt-4 flex gap-3">
            {editingAppointment && (
              <>
                <button onClick={handleCancel} className="px-4 py-3 text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">Mark Cancelled</button>
                <button onClick={handleDelete} className="px-4 py-3 text-xs font-semibold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">Delete</button>
              </>
            )}
            <NexusButton className="flex-1" size="lg" onClick={handleSave}>{editingAppointment ? 'Update' : 'Book Appointment'}</NexusButton>
          </div>
        </div>
      </NexusModal>
    </div>
  );
};

export default CalendarManager;
