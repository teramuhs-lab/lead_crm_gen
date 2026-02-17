
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  Contact, SubAccount, AgencySettings, CustomFieldDefinition, 
  ViewType, Workflow, Message, Calendar, Appointment,
  SmartList, Funnel, Task, Activity, WorkflowLog
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

const DEFAULT_SUB_ACCOUNT: SubAccount = { 
  id: 'sub-01', name: 'Master Growth Instance', domain: 'master.nexus.io', 
  status: 'active', plan: 'pro', leadValue: 500, twilio: { isVerified: true } 
};

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeSubAccountId, setActiveSubAccountId] = useState('sub-01');
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 'c-01', subAccountId: 'sub-01', name: 'James Carter', email: 'james@enterprise.com',
      phone: '+1 555 0101', status: 'Lead', source: 'Facebook Ads', tags: ['High Intent'],
      createdAt: new Date().toISOString(), lastActivity: '2h ago', leadScore: 75,
      activities: [], tasks: [], customFields: {}
    }
  ]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([DEFAULT_SUB_ACCOUNT]);
  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
    platformName: 'Nexus CRM', logoUrl: '', primaryColor: '#6366f1', customDomain: 'app.nexus-agency.com',
  });
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { id: 'wf-01', name: 'New Lead Speed-to-Lead', trigger: 'Form Submitted', isActive: true, steps: [] }
  ]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([
    { id: 'f-01', name: 'Agency Landing Page', description: 'Main acquisition funnel', category: 'Lead Gen', status: 'published', pages: [], stats: { visits: 1420, conversions: 88 } }
  ]);
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([
    { id: 'cf-01', label: 'Company Name', type: 'text', subAccountId: 'sub-01' }
  ]);
  const [smartLists, setSmartLists] = useState<SmartList[]>([
    { id: 'sl-01', name: 'High Temperature Leads', conditions: [{ field: 'leadScore', operator: 'gt', value: 80 }] }
  ]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const removeNotification = useCallback((id: string) => setNotifications(prev => prev.filter(n => n.id !== id)), []);

  const activeSubAccount = useMemo(() => 
    subAccounts.find(s => s.id === activeSubAccountId) || subAccounts[0] || DEFAULT_SUB_ACCOUNT, 
  [subAccounts, activeSubAccountId]);

  const tenantContacts = useMemo(() => 
    contacts.filter(c => c.subAccountId === activeSubAccountId), 
  [contacts, activeSubAccountId]);

  const addContact = useCallback((partial: Partial<Contact>) => {
    const contact: Contact = {
      id: 'c-'+Date.now(), subAccountId: activeSubAccountId,
      name: partial.name || 'Anonymous Node', email: partial.email || '',
      phone: partial.phone || '', status: partial.status || 'Lead',
      source: partial.source || 'Direct Ingress', tags: partial.tags || [],
      createdAt: new Date().toISOString(), lastActivity: 'Initialized',
      leadScore: partial.leadScore || 40, activities: partial.activities || [], 
      tasks: [], customFields: {},
    };
    setContacts(prev => [contact, ...prev]);
    notify(`Identity Indexed: ${contact.name}`);
  }, [activeSubAccountId, notify]);

  const updateContact = useCallback((updated: Contact) => {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, []);

  // Fix: Implemented the missing sendMessage function in NexusProvider.
  const sendMessage = useCallback(async (partial: Partial<Message>) => {
    const msg: Message = {
      id: 'm-' + Date.now(),
      contactId: partial.contactId || '',
      channel: partial.channel || 'sms',
      direction: 'outbound',
      content: partial.content || '',
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    notify(`Message dispatched to cluster.`);
  }, [notify]);

  const addTask = useCallback((contactId: string, partial: Partial<Task>) => {
    const newTask: Task = { id: 't-'+Date.now(), title: partial.title || 'Untitled Operation', dueDate: partial.dueDate || new Date().toISOString(), status: 'pending' };
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, tasks: [...c.tasks, newTask] } : c));
    notify("Operation Task Appended");
  }, [notify]);

  const toggleTask = useCallback((contactId: string, taskId: string) => {
    setContacts(prev => prev.map(c => c.id === contactId ? {
      ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t)
    } : c));
  }, []);

  const logActivity = useCallback((contactId: string, activity: Partial<Activity>) => {
    const newAct: Activity = { id: 'a-'+Date.now(), type: activity.type || 'note', content: activity.content || '', timestamp: new Date().toISOString() };
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, activities: [newAct, ...c.activities], lastActivity: 'Just now' } : c));
  }, []);

  const bulkAddTag = useCallback((ids: Set<string>, tag: string) => {
    setContacts(prev => prev.map(c => ids.has(c.id) ? { ...c, tags: [...new Set([...c.tags, tag])] } : c));
    notify(`Tag distributed to ${ids.size} nodes.`);
  }, [notify]);

  const bulkChangeStatus = useCallback((ids: Set<string>, status: Contact['status']) => {
    setContacts(prev => prev.map(c => ids.has(c.id) ? { ...c, status } : c));
    notify(`Global Pipeline Sync Complete.`);
  }, [notify]);

  const deleteContacts = useCallback((ids: Set<string>, hard = false) => {
    if (hard) setContacts(prev => prev.filter(c => !ids.has(c.id)));
    else setContacts(prev => prev.map(c => ids.has(c.id) ? { ...c, isArchived: true } : c));
    notify(`Nodes migrated to archive.`);
  }, [notify]);

  const restoreContacts = useCallback((ids: Set<string>) => {
    setContacts(prev => prev.map(c => ids.has(c.id) ? { ...c, isArchived: false } : c));
    notify(`Nodes restored to production cluster.`);
  }, [notify]);

  const runWorkflow = useCallback((workflowId: string, contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    const log: WorkflowLog = { id: 'l-'+Date.now(), contactName: contact.name, workflowName: 'Logic Probe', currentStep: 'Initial Ping', status: 'success', timestamp: new Date().toLocaleTimeString() };
    setWorkflowLogs(prev => [log, ...prev].slice(0, 50));
    notify(`Protocol Active: ${contact.name}`);
  }, [contacts, notify]);

  const updateFunnel = useCallback((updated: Funnel) => {
    setFunnels(prev => prev.map(f => f.id === updated.id ? updated : f));
  }, []);

  const addFunnel = useCallback((partial: Partial<Funnel>) => {
    const funnel: Funnel = {
      id: 'f-'+Date.now(), name: partial.name || 'New Funnel', description: '', category: 'Lead Gen', 
      status: 'draft', pages: [], stats: { visits: 0, conversions: 0 }
    };
    setFunnels(prev => [funnel, ...prev]);
  }, []);

  const deleteFunnel = useCallback((id: string) => setFunnels(prev => prev.filter(f => f.id !== id)), []);

  const importTemplate = useCallback((id: string) => {
     notify(`Logic Blueprint ${id.toUpperCase()} successfully applied.`);
  }, [notify]);

  const contextValue = useMemo(() => ({
    contacts: tenantContacts, subAccounts, agencySettings, fieldDefinitions, workflows, messages,
    activeView, setActiveView, isSyncing, notifications, activeSubAccountId, setActiveSubAccountId,
    activeSubAccount, smartLists, funnels, workflowLogs,
    addContact, updateContact, sendMessage, notify, removeNotification,
    setSubAccounts, setWorkflows, setFieldDefinitions, setAgencySettings,
    bulkAddTag, bulkChangeStatus, deleteContacts, restoreContacts, runWorkflow,
    addFunnel, updateFunnel, deleteFunnel,
    addTask, toggleTask, logActivity, importTemplate
  }), [tenantContacts, subAccounts, agencySettings, fieldDefinitions, workflows, messages, activeView, isSyncing, notifications, activeSubAccountId, activeSubAccount, smartLists, funnels, workflowLogs, addContact, updateContact, sendMessage, notify, removeNotification, addTask, toggleTask, logActivity, updateFunnel, deleteFunnel, bulkAddTag, bulkChangeStatus, deleteContacts, restoreContacts, runWorkflow, importTemplate]);

  return <NexusContext.Provider value={contextValue}>{children}</NexusContext.Provider>;
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error('useNexus must be used within a NexusProvider');
  return context;
};
