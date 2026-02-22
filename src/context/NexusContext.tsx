
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';
import {
  Contact, SubAccount, SubAccountUser, AgencySettings, CustomFieldDefinition,
  ViewType, Workflow, Message,
  SmartList, Funnel, Task, Activity, WorkflowLog,
  Calendar, Appointment
} from '../types';

interface Notification { id: string; message: string; type: 'success' | 'error' | 'info'; }

interface NexusContextType {
  contacts: Contact[];
  subAccounts: SubAccount[];
  agencySettings: AgencySettings;
  fieldDefinitions: CustomFieldDefinition[];
  workflows: Workflow[];
  messages: Message[];
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isSyncing: boolean;
  notifications: Notification[];
  activeSubAccountId: string;
  setActiveSubAccountId: (id: string) => void;
  activeSubAccount: SubAccount;
  smartLists: SmartList[];
  funnels: Funnel[];
  workflowLogs: WorkflowLog[];
  calendars: Calendar[];
  appointments: Appointment[];
  addAppointment: (partial: Partial<Appointment>) => void;
  updateAppointment: (apt: Appointment) => void;
  deleteAppointment: (id: string) => void;
  teamMembers: SubAccountUser[];
  addTeamMember: (partial: { name: string; email: string; password: string; role: string; permissions: string[] }) => void;
  updateTeamMember: (member: SubAccountUser) => void;
  removeTeamMember: (id: string) => void;

  // Pure Actions
  addContact: (contact: Partial<Contact>) => void;
  updateContact: (contact: Contact) => void;
  sendMessage: (msg: Partial<Message>) => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
  setSubAccounts: React.Dispatch<React.SetStateAction<SubAccount[]>>;
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  setFieldDefinitions: React.Dispatch<React.SetStateAction<CustomFieldDefinition[]>>;
  setAgencySettings: React.Dispatch<React.SetStateAction<AgencySettings>>;
  bulkAddTag: (ids: Set<string>, tag: string) => void;
  bulkChangeStatus: (ids: Set<string>, status: Contact['status']) => void;
  deleteContacts: (ids: Set<string>, hard?: boolean) => void;
  restoreContacts: (ids: Set<string>) => void;
  runWorkflow: (workflowId: string, contactId: string) => void;
  addFunnel: (funnel: Partial<Funnel>) => void;
  updateFunnel: (funnel: Funnel) => void;
  deleteFunnel: (id: string) => void;
  addTask: (contactId: string, task: Partial<Task>) => void;
  toggleTask: (contactId: string, taskId: string) => void;
  logActivity: (contactId: string, activity: Partial<Activity>) => void;
  importTemplate: (templateId: string) => void;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AgencySettings = {
  platformName: 'Nexus CRM', logoUrl: '', primaryColor: '#6366f1', customDomain: '',
};

const DEFAULT_SUB_ACCOUNT: SubAccount = {
  id: '', name: 'Default Instance', domain: '',
  status: 'active', plan: 'pro', leadValue: 500
};

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSubAccountId, setActiveSubAccountId] = useState('');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [agencySettingsState, setAgencySettingsState] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<SubAccountUser[]>([]);

  const initDone = useRef(false);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const removeNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);

  // Wrap setAgencySettings to also persist via API
  const setAgencySettings: React.Dispatch<React.SetStateAction<AgencySettings>> = useCallback((action: React.SetStateAction<AgencySettings>) => {
    setAgencySettingsState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      api.put('/settings', next).catch(() => {});
      return next;
    });
  }, []);

  // --- Initial data fetch ---
  useEffect(() => {
    const init = async () => {
      setIsSyncing(true);
      try {
        const [subs, settings, wfs, msgs, funs, sls, wfLogs, cals, apts, team] = await Promise.all([
          api.get<SubAccount[]>('/sub-accounts').catch(() => [] as SubAccount[]),
          api.get<AgencySettings>('/settings').catch(() => DEFAULT_SETTINGS),
          api.get<Workflow[]>('/workflows').catch(() => [] as Workflow[]),
          api.get<Message[]>('/messages').catch(() => [] as Message[]),
          api.get<Funnel[]>('/funnels').catch(() => [] as Funnel[]),
          api.get<SmartList[]>('/smart-lists').catch(() => [] as SmartList[]),
          api.get<WorkflowLog[]>('/workflow-logs').catch(() => [] as WorkflowLog[]),
          api.get<Calendar[]>('/calendars').catch(() => [] as Calendar[]),
          api.get<Appointment[]>('/calendars/appointments').catch(() => [] as Appointment[]),
          api.get<SubAccountUser[]>('/team').catch(() => [] as SubAccountUser[]),
        ]);

        setSubAccounts(subs);
        setAgencySettingsState(settings);
        setWorkflows(wfs);
        setMessages(msgs);
        setFunnels(funs);
        setSmartLists(sls);
        setWorkflowLogs(wfLogs);
        setCalendars(cals);
        setAppointments(apts);
        setTeamMembers(team);

        const subId = subs[0]?.id || '';
        if (subId) {
          setActiveSubAccountId(subId);
          const [contactsData, fieldDefs] = await Promise.all([
            api.get<Contact[]>(`/contacts?subAccountId=${subId}`).catch(() => [] as Contact[]),
            api.get<CustomFieldDefinition[]>(`/field-definitions?subAccountId=${subId}`).catch(() => [] as CustomFieldDefinition[]),
          ]);
          setContacts(contactsData);
          setFieldDefinitions(fieldDefs);
        }
      } catch (err) {
        console.error('Failed to initialize data:', err);
      } finally {
        setIsSyncing(false);
        initDone.current = true;
      }
    };
    init();
  }, []);

  // Refetch tenant data when active sub-account changes (after init)
  useEffect(() => {
    if (!initDone.current || !activeSubAccountId) return;
    const fetchTenantData = async () => {
      try {
        const [contactsData, fieldDefs] = await Promise.all([
          api.get<Contact[]>(`/contacts?subAccountId=${activeSubAccountId}`),
          api.get<CustomFieldDefinition[]>(`/field-definitions?subAccountId=${activeSubAccountId}`),
        ]);
        setContacts(contactsData);
        setFieldDefinitions(fieldDefs);
      } catch {
        // keep existing state on failure
      }
    };
    fetchTenantData();
  }, [activeSubAccountId]);

  const activeSubAccount = useMemo(() =>
    subAccounts.find(s => s.id === activeSubAccountId) || subAccounts[0] || DEFAULT_SUB_ACCOUNT,
  [subAccounts, activeSubAccountId]);

  const tenantContacts = useMemo(() =>
    contacts.filter(c => c.subAccountId === activeSubAccountId),
  [contacts, activeSubAccountId]);

  // --- Optimistic mutation functions ---

  const addContact = useCallback(async (partial: Partial<Contact>) => {
    const optimistic: Contact = {
      id: 'temp-' + Date.now(), subAccountId: activeSubAccountId,
      name: partial.name || 'Anonymous', email: partial.email || '',
      phone: partial.phone || '', status: partial.status || 'Lead',
      source: partial.source || 'Direct', tags: partial.tags || [],
      createdAt: new Date().toISOString(), lastActivity: 'Just now',
      leadScore: partial.leadScore || 40, activities: [], tasks: [], customFields: {},
    };
    setContacts(prev => [optimistic, ...prev]);
    notify(`Contact added: ${optimistic.name}`);
    try {
      const saved = await api.post<Contact>('/contacts', { subAccountId: activeSubAccountId, ...partial });
      setContacts(prev => prev.map(c => c.id === optimistic.id ? saved : c));
    } catch {
      setContacts(prev => prev.filter(c => c.id !== optimistic.id));
      notify('Failed to save contact', 'error');
    }
  }, [activeSubAccountId, notify]);

  const updateContact = useCallback(async (updated: Contact) => {
    let previous: Contact | undefined;
    setContacts(prev => {
      previous = prev.find(c => c.id === updated.id);
      return prev.map(c => c.id === updated.id ? updated : c);
    });
    try {
      await api.put(`/contacts/${updated.id}`, updated);
    } catch {
      if (previous) setContacts(prev => prev.map(c => c.id === updated.id ? previous! : c));
      notify('Failed to update contact', 'error');
    }
  }, [notify]);

  const sendMessage = useCallback(async (partial: Partial<Message>) => {
    const optimistic: Message = {
      id: 'temp-' + Date.now(), contactId: partial.contactId || '',
      channel: partial.channel || 'sms', direction: 'outbound',
      content: partial.content || '', status: 'queued',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const saved = await api.post<Message>('/messages', partial);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
      notify('Message sent');
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      notify('Failed to send message', 'error');
    }
  }, [notify]);

  const addTask = useCallback(async (contactId: string, partial: Partial<Task>) => {
    const tempId = 'temp-' + Date.now();
    const newTask: Task = { id: tempId, title: partial.title || 'Untitled Task', dueDate: partial.dueDate || new Date().toISOString(), status: 'pending' };
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tasks: [...c.tasks, newTask] } : c));
    notify('Task added');
    try {
      const saved = await api.post<Task>(`/contacts/${contactId}/tasks`, partial);
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tasks: c.tasks.map(t => t.id === tempId ? saved : t) } : c));
    } catch {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tasks: c.tasks.filter(t => t.id !== tempId) } : c));
      notify('Failed to add task', 'error');
    }
  }, [notify]);

  const toggleTask = useCallback(async (contactId: string, taskId: string) => {
    let oldStatus: string | undefined;
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      return { ...c, tasks: c.tasks.map(t => {
        if (t.id !== taskId) return t;
        oldStatus = t.status;
        return { ...t, status: (t.status === 'pending' ? 'completed' : 'pending') as Task['status'] };
      })};
    }));
    try {
      await api.patch(`/contacts/${contactId}/tasks/${taskId}`);
    } catch {
      if (oldStatus) {
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: oldStatus as Task['status'] } : t) } : c));
      }
      notify('Failed to toggle task', 'error');
    }
  }, [notify]);

  const logActivity = useCallback(async (contactId: string, activity: Partial<Activity>) => {
    const tempId = 'temp-' + Date.now();
    const newAct: Activity = { id: tempId, type: activity.type || 'note', content: activity.content || '', timestamp: new Date().toISOString() };
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, activities: [newAct, ...c.activities], lastActivity: 'Just now' } : c));
    try {
      const saved = await api.post<Activity>(`/contacts/${contactId}/activities`, activity);
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, activities: c.activities.map(a => a.id === tempId ? saved : a) } : c));
    } catch {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, activities: c.activities.filter(a => a.id !== tempId) } : c));
      notify('Failed to log activity', 'error');
    }
  }, [notify]);

  const bulkAddTag = useCallback(async (ids: Set<string>, tag: string) => {
    const snapshot = new Map<string, string[]>();
    setContacts(prev => prev.map(c => {
      if (!ids.has(c.id)) return c;
      snapshot.set(c.id, [...c.tags]);
      return { ...c, tags: [...new Set([...c.tags, tag])] };
    }));
    notify(`Tag applied to ${ids.size} contacts`);
    try {
      await api.post('/contacts/bulk/tag', { ids: [...ids], tag });
    } catch {
      setContacts(prev => prev.map(c => snapshot.has(c.id) ? { ...c, tags: snapshot.get(c.id)! } : c));
      notify('Failed to apply tag', 'error');
    }
  }, [notify]);

  const bulkChangeStatus = useCallback(async (ids: Set<string>, status: Contact['status']) => {
    const snapshot = new Map<string, Contact['status']>();
    setContacts(prev => prev.map(c => {
      if (!ids.has(c.id)) return c;
      snapshot.set(c.id, c.status);
      return { ...c, status };
    }));
    notify('Status updated');
    try {
      await api.post('/contacts/bulk/status', { ids: [...ids], status });
    } catch {
      setContacts(prev => prev.map(c => snapshot.has(c.id) ? { ...c, status: snapshot.get(c.id)! } : c));
      notify('Failed to update status', 'error');
    }
  }, [notify]);

  const deleteContacts = useCallback(async (ids: Set<string>, hard = false) => {
    let snapshot: Contact[] = [];
    if (hard) {
      setContacts(prev => {
        snapshot = prev.filter(c => ids.has(c.id));
        return prev.filter(c => !ids.has(c.id));
      });
    } else {
      setContacts(prev => {
        snapshot = prev.filter(c => ids.has(c.id));
        return prev.map(c => ids.has(c.id) ? { ...c, isArchived: true } : c);
      });
    }
    notify('Contacts archived');
    try {
      await api.post('/contacts/bulk/delete', { ids: [...ids], hard });
    } catch {
      if (hard) {
        setContacts(prev => [...snapshot, ...prev]);
      } else {
        setContacts(prev => prev.map(c => {
          const orig = snapshot.find(s => s.id === c.id);
          return orig ? { ...c, isArchived: orig.isArchived } : c;
        }));
      }
      notify('Failed to delete contacts', 'error');
    }
  }, [notify]);

  const restoreContacts = useCallback(async (ids: Set<string>) => {
    setContacts(prev => prev.map(c => ids.has(c.id) ? { ...c, isArchived: false } : c));
    notify('Contacts restored');
    try {
      await api.post('/contacts/bulk/restore', { ids: [...ids] });
    } catch {
      setContacts(prev => prev.map(c => ids.has(c.id) ? { ...c, isArchived: true } : c));
      notify('Failed to restore contacts', 'error');
    }
  }, [notify]);

  const runWorkflow = useCallback(async (workflowId: string, contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    const optimistic: WorkflowLog = {
      id: 'temp-' + Date.now(), contactName: contact.name,
      workflowName: 'Workflow', currentStep: 'Initial Step',
      status: 'success', timestamp: new Date().toISOString(),
    };
    setWorkflowLogs(prev => [optimistic, ...prev].slice(0, 50));
    notify(`Workflow started for ${contact.name}`);
    try {
      const saved = await api.post<WorkflowLog>(`/workflows/${workflowId}/run`, { contactName: contact.name });
      setWorkflowLogs(prev => prev.map(l => l.id === optimistic.id ? saved : l));
    } catch {
      setWorkflowLogs(prev => prev.filter(l => l.id !== optimistic.id));
      notify('Failed to run workflow', 'error');
    }
  }, [contacts, notify]);

  const addFunnel = useCallback(async (partial: Partial<Funnel>) => {
    const optimistic: Funnel = {
      id: 'temp-' + Date.now(), name: partial.name || 'New Funnel',
      description: partial.description || '', category: partial.category || 'Lead Gen',
      status: 'draft', pages: [], stats: { visits: 0, conversions: 0 },
    };
    setFunnels(prev => [optimistic, ...prev]);
    try {
      const saved = await api.post<Funnel>('/funnels', partial);
      setFunnels(prev => prev.map(f => f.id === optimistic.id ? saved : f));
    } catch {
      setFunnels(prev => prev.filter(f => f.id !== optimistic.id));
      notify('Failed to create funnel', 'error');
    }
  }, [notify]);

  const updateFunnel = useCallback(async (updated: Funnel) => {
    let previous: Funnel | undefined;
    setFunnels(prev => {
      previous = prev.find(f => f.id === updated.id);
      return prev.map(f => f.id === updated.id ? updated : f);
    });
    try {
      await api.put(`/funnels/${updated.id}`, updated);
    } catch {
      if (previous) setFunnels(prev => prev.map(f => f.id === updated.id ? previous! : f));
      notify('Failed to update funnel', 'error');
    }
  }, [notify]);

  const deleteFunnel = useCallback(async (id: string) => {
    let removed: Funnel | undefined;
    setFunnels(prev => {
      removed = prev.find(f => f.id === id);
      return prev.filter(f => f.id !== id);
    });
    try {
      await api.delete(`/funnels/${id}`);
    } catch {
      if (removed) setFunnels(prev => [removed!, ...prev]);
      notify('Failed to delete funnel', 'error');
    }
  }, [notify]);

  const addAppointment = useCallback(async (partial: Partial<Appointment>) => {
    const optimistic: Appointment = {
      id: 'temp-' + Date.now(),
      calendarId: partial.calendarId || '',
      contactId: partial.contactId || '',
      contactName: partial.contactName || '',
      title: partial.title || 'New Appointment',
      startTime: partial.startTime || new Date().toISOString(),
      endTime: partial.endTime || new Date().toISOString(),
      status: 'booked',
      notes: partial.notes || '',
    };
    setAppointments(prev => [optimistic, ...prev]);
    notify('Appointment booked');
    try {
      const saved = await api.post<Appointment>('/calendars/appointments', partial);
      setAppointments(prev => prev.map(a => a.id === optimistic.id ? saved : a));
    } catch {
      setAppointments(prev => prev.filter(a => a.id !== optimistic.id));
      notify('Failed to book appointment', 'error');
    }
  }, [notify]);

  const updateAppointment = useCallback(async (updated: Appointment) => {
    let previous: Appointment | undefined;
    setAppointments(prev => {
      previous = prev.find(a => a.id === updated.id);
      return prev.map(a => a.id === updated.id ? updated : a);
    });
    try {
      await api.put(`/calendars/appointments/${updated.id}`, updated);
    } catch {
      if (previous) setAppointments(prev => prev.map(a => a.id === updated.id ? previous! : a));
      notify('Failed to update appointment', 'error');
    }
  }, [notify]);

  const deleteAppointment = useCallback(async (id: string) => {
    let removed: Appointment | undefined;
    setAppointments(prev => {
      removed = prev.find(a => a.id === id);
      return prev.filter(a => a.id !== id);
    });
    try {
      await api.delete(`/calendars/appointments/${id}`);
    } catch {
      if (removed) setAppointments(prev => [removed!, ...prev]);
      notify('Failed to delete appointment', 'error');
    }
  }, [notify]);

  const addTeamMember = useCallback(async (partial: { name: string; email: string; password: string; role: string; permissions: string[] }) => {
    const optimistic: SubAccountUser = {
      id: 'temp-' + Date.now(),
      name: partial.name,
      email: partial.email,
      role: partial.role as SubAccountUser['role'],
      status: 'active',
      permissions: partial.permissions,
      createdAt: new Date().toISOString(),
    };
    setTeamMembers(prev => [optimistic, ...prev]);
    notify('Team member added');
    try {
      const saved = await api.post<SubAccountUser>('/team', partial);
      setTeamMembers(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch {
      setTeamMembers(prev => prev.filter(m => m.id !== optimistic.id));
      notify('Failed to add team member', 'error');
    }
  }, [notify]);

  const updateTeamMember = useCallback(async (updated: SubAccountUser) => {
    let previous: SubAccountUser | undefined;
    setTeamMembers(prev => {
      previous = prev.find(m => m.id === updated.id);
      return prev.map(m => m.id === updated.id ? updated : m);
    });
    try {
      await api.put(`/team/${updated.id}`, updated);
    } catch {
      if (previous) setTeamMembers(prev => prev.map(m => m.id === updated.id ? previous! : m));
      notify('Failed to update team member', 'error');
    }
  }, [notify]);

  const removeTeamMember = useCallback(async (id: string) => {
    let removed: SubAccountUser | undefined;
    setTeamMembers(prev => {
      removed = prev.find(m => m.id === id);
      return prev.filter(m => m.id !== id);
    });
    try {
      await api.delete(`/team/${id}`);
    } catch {
      if (removed) setTeamMembers(prev => [removed!, ...prev]);
      notify('Failed to remove team member', 'error');
    }
  }, [notify]);

  const importTemplate = useCallback((id: string) => {
     notify(`Template ${id} applied successfully.`);
  }, [notify]);

  // ── WebSocket: real-time updates ──
  useWebSocket({
    'message:new': (payload: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === payload.id)) {
          return prev.map(m => m.id === payload.id ? payload : m);
        }
        return [...prev, payload];
      });
    },
    'message:status': (payload: { id: string; status: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === payload.id ? { ...m, status: payload.status as Message['status'] } : m
      ));
    },
    'message:opened': (payload: { id: string; contactId: string; openedAt: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === payload.id ? { ...m, status: 'opened' as Message['status'], openedAt: payload.openedAt } : m
      ));
    },
    'message:clicked': (payload: { id: string; contactId: string; clickedAt: string }) => {
      setMessages(prev => prev.map(m =>
        m.id === payload.id ? { ...m, status: 'clicked' as Message['status'], clickedAt: payload.clickedAt } : m
      ));
    },
    'contact:score_updated': (payload: { id: string; leadScore: number }) => {
      setContacts(prev => prev.map(c =>
        c.id === payload.id ? { ...c, leadScore: payload.leadScore } : c
      ));
    },
    'sequence:reply_detected': (payload: { contactId: string }) => {
      setContacts(prev => prev.map(c =>
        c.id === payload.contactId ? { ...c, status: 'Interested' } : c
      ));
    },
    'workflow:step': (payload: any) => {
      setWorkflowLogs(prev => {
        const existing = prev.find(l => l.id === payload.logId);
        if (existing) {
          return prev.map(l => l.id === payload.logId ? { ...l, currentStep: payload.stepName || payload.stepType, status: payload.status } : l);
        }
        return prev;
      });
    },
  });

  const contextValue = useMemo(() => ({
    contacts: tenantContacts, subAccounts, agencySettings: agencySettingsState, fieldDefinitions, workflows, messages,
    activeView, setActiveView, isSyncing, notifications, activeSubAccountId, setActiveSubAccountId,
    activeSubAccount, smartLists, funnels, workflowLogs, calendars, appointments,
    addContact, updateContact, sendMessage, notify, removeNotification,
    setSubAccounts, setWorkflows, setFieldDefinitions, setAgencySettings,
    bulkAddTag, bulkChangeStatus, deleteContacts, restoreContacts, runWorkflow,
    addFunnel, updateFunnel, deleteFunnel,
    addAppointment, updateAppointment, deleteAppointment,
    teamMembers, addTeamMember, updateTeamMember, removeTeamMember,
    addTask, toggleTask, logActivity, importTemplate
  }), [tenantContacts, subAccounts, agencySettingsState, fieldDefinitions, workflows, messages, activeView, isSyncing, notifications, activeSubAccountId, activeSubAccount, smartLists, funnels, workflowLogs, calendars, appointments, addContact, updateContact, sendMessage, notify, removeNotification, setAgencySettings, addTask, toggleTask, logActivity, updateFunnel, deleteFunnel, addFunnel, addAppointment, updateAppointment, deleteAppointment, bulkAddTag, bulkChangeStatus, deleteContacts, restoreContacts, runWorkflow, importTemplate, teamMembers, addTeamMember, updateTeamMember, removeTeamMember]);

  return <NexusContext.Provider value={contextValue}>{children}</NexusContext.Provider>;
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error('useNexus must be used within a NexusProvider');
  return context;
};
