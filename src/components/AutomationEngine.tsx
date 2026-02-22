
import React, { useState } from 'react';
import {
  Zap, Plus, Wand2, Sparkles, X, Trash2, Mail, Clock, Cpu,
  Save, Activity, Workflow as WorkflowIcon, BookOpen, Rocket, Box, Table, Braces, Terminal, Copy, ChevronRight, PlayCircle, MessageSquare,
  RefreshCw, GitBranch, Globe
} from 'lucide-react';
import { Workflow, WorkflowStep } from '../types';
import { useNexus } from '../context/NexusContext';
import { api } from '../lib/api';
import { NexusCard, NexusButton, NexusBadge, NexusHeader, NexusInput, NexusTextArea, NexusSelect, NexusModal } from './NexusUI';

const AutomationEngine: React.FC = () => {
  const { workflows, setWorkflows, contacts, notify, importTemplate } = useNexus();
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(workflows[0] || null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [showAiModal, setShowAiModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastOutput, setLastOutput] = useState<any>(null);
  const [testContactId, setTestContactId] = useState<string>(contacts[0]?.id || '');
  const [aiPrompt, setAiPrompt] = useState('');

  const activeStep = activeWorkflow?.steps.find(s => s.id === editingStepId);
  const testContact = contacts.find(c => c.id === testContactId);

  const addStep = (type: WorkflowStep['type'], afterIndex?: number) => {
    if (!activeWorkflow) return;
    const newStep: WorkflowStep = {
      id: `s-${Date.now()}`, type,
      config: type === 'wait' ? { waitTime: '1 Day' } :
              type === 'email' ? { subject: 'New Opportunity Follow-up', message: 'Hi {{contact.name}}! Thanks for reaching out.' } :
              type === 'sms' ? { message: 'Hi {{contact.name}}!' } :
              type === 'apify_actor' ? { actorId: 'apify/google-maps-scraper', input: '{ "queries": ["{{contact.search_query}}"] }' } :
              type === 'external_sync' ? { provider: 'Google Sheets', spreadsheetId: 'leads_db' } :
              type === 'condition' ? { field: 'leadScore', operator: 'gt', value: '50' } :
              type === 'ai_step' ? { description: 'Analyze lead info and suggest next action' } : {}
    };
    const steps = [...activeWorkflow.steps];
    if (afterIndex !== undefined) {
      steps.splice(afterIndex + 1, 0, newStep);
    } else {
      steps.push(newStep);
    }
    const updated = { ...activeWorkflow, steps };
    setActiveWorkflow(updated);
    setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
    setEditingStepId(newStep.id);
  };

  const removeStep = (id: string) => {
    if (!activeWorkflow) return;
    const updated = { ...activeWorkflow, steps: activeWorkflow.steps.filter(s => s.id !== id) };
    setActiveWorkflow(updated);
    setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
    if (editingStepId === id) setEditingStepId(null);
  };

  const updateStepConfig = (key: string, value: string) => {
    if (!activeWorkflow || !editingStepId) return;
    const updated = {
      ...activeWorkflow,
      steps: activeWorkflow.steps.map(s =>
        s.id === editingStepId ? { ...s, config: { ...s.config, [key]: value } } : s
      ),
    };
    setActiveWorkflow(updated);
    setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
  };

  const handleSaveWorkflow = async () => {
    if (!activeWorkflow) return;
    setIsSaving(true);
    try {
      await api.put(`/workflows/${activeWorkflow.id}`, {
        name: activeWorkflow.name,
        trigger: activeWorkflow.trigger,
        isActive: activeWorkflow.isActive,
        steps: activeWorkflow.steps.map(s => ({ type: s.type, config: s.config })),
      });
      notify('Workflow saved successfully.');
    } catch (err: any) {
      notify(err.message || 'Failed to save workflow', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const created = await api.post<Workflow>('/workflows', {
        name: `New Workflow ${workflows.length + 1}`,
        trigger: 'Form Submitted',
        isActive: false,
        steps: [],
      });
      setWorkflows(prev => [...prev, created]);
      setActiveWorkflow(created);
      setEditingStepId(null);
      notify('Workflow created.');
    } catch (err: any) {
      notify(err.message || 'Failed to create workflow', 'error');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await api.delete(`/workflows/${id}`);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      if (activeWorkflow?.id === id) {
        const remaining = workflows.filter(w => w.id !== id);
        setActiveWorkflow(remaining[0] || null);
      }
      setEditingStepId(null);
      notify('Workflow deleted.');
    } catch (err: any) {
      notify(err.message || 'Failed to delete workflow', 'error');
    }
  };

  const handleExecuteStep = async () => {
    if (!activeWorkflow || !testContactId) return;
    setIsExecuting(true);
    setLastOutput(null);
    try {
      const result = await api.post(`/workflows/${activeWorkflow.id}/run`, {
        contactId: testContactId,
        contactName: testContact?.name || 'Test Contact',
      });
      setLastOutput(result);
      notify('Workflow execution started — watch for real-time updates.');
    } catch (err: any) {
      setLastOutput({ error: err.message || 'Execution failed' });
      notify('Workflow execution failed', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-full flex gap-6 animate-in fade-in duration-500 overflow-hidden">
      {!editingStepId && (
        <NexusCard padding="none" className="w-72 flex flex-col shrink-0 overflow-hidden border-b-8 border-brand/5">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 px-2">Workflows</span>
            <div className="flex gap-1">
               <button onClick={() => setShowTemplates(true)} className="p-2 text-slate-400 hover:text-brand transition-colors"><BookOpen className="w-4 h-4" /></button>
               <button onClick={handleCreateWorkflow} className="p-2 text-brand hover:bg-indigo-50 rounded-xl transition-all" title="New Workflow"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {workflows.map(wf => (
              <div key={wf.id} className={`group w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 font-semibold text-sm cursor-pointer ${activeWorkflow?.id === wf.id ? 'bg-indigo-50 text-brand shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => { setActiveWorkflow(wf); setEditingStepId(null); }}>
                <WorkflowIcon className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{wf.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf.id); }} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="p-6 border-t border-slate-100">
             <NexusButton variant="slate" size="md" className="w-full" onClick={() => setShowAiModal(true)} icon={Sparkles}>AI Builder</NexusButton>
          </div>
        </NexusCard>
      )}

      <div className={`flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-500 ${editingStepId ? 'bg-slate-50' : ''}`}>
        <div className="h-20 border-b border-slate-200 px-8 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-6">
            {editingStepId ? (
              <>
                <button onClick={() => setEditingStepId(null)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                <div className="w-px h-6 bg-slate-100"></div>
                <h2 className="text-sm font-semibold text-slate-900">{activeStep?.type.replace('_', ' ')} Step Settings</h2>
              </>
            ) : (
              <div className="flex items-center gap-4">
                 <h2 className="text-lg font-semibold text-slate-900">{activeWorkflow?.name || 'Workflow Builder'}</h2>
                 {activeWorkflow && <NexusBadge variant="emerald">Active</NexusBadge>}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {editingStepId && <NexusButton variant="danger" size="md" icon={isExecuting ? Activity : PlayCircle} loading={isExecuting} onClick={handleExecuteStep}>Run Step</NexusButton>}
            {activeWorkflow && !editingStepId && <NexusButton icon={Save} loading={isSaving} onClick={handleSaveWorkflow}>Save Workflow</NexusButton>}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {editingStepId ? (
            <div className="h-full flex overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-1/2 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                 <div className="flex border-b border-slate-100 px-6">
                    <button onClick={() => setActiveTab('parameters')} className={`px-8 py-5 text-xs font-semibold transition-all border-b-4 ${activeTab === 'parameters' ? 'border-brand text-brand' : 'border-transparent text-slate-400'}`}>Parameters</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-8 py-5 text-xs font-semibold transition-all border-b-4 ${activeTab === 'settings' ? 'border-brand text-brand' : 'border-transparent text-slate-400'}`}>Settings</button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-5 thin-scrollbar">
                    {activeTab === 'parameters' ? (
                      <div className="space-y-8">
                         <NexusSelect label="Test Contact" value={testContactId} onChange={(e) => setTestContactId(e.target.value)}>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </NexusSelect>
                         {activeStep?.type === 'email' && (
                           <>
                             <NexusInput label="Subject" value={activeStep.config.subject || ''} onChange={(e) => updateStepConfig('subject', e.target.value)} />
                             <NexusTextArea label="Message Body" rows={10} value={activeStep.config.message || ''} onChange={(e) => updateStepConfig('message', e.target.value)} />
                           </>
                         )}
                         {activeStep?.type === 'sms' && (
                           <>
                             <NexusTextArea label="SMS Message" rows={4} value={activeStep.config.message || ''} onChange={(e) => updateStepConfig('message', e.target.value)} />
                             <p className="text-xs text-slate-400">Use {'{{contact.name}}'} for merge fields. Max 160 chars per segment.</p>
                           </>
                         )}
                         {activeStep?.type === 'wait' && (
                           <>
                             <NexusSelect label="Wait Duration" value={activeStep.config.waitTime || '1 Day'} onChange={(e) => updateStepConfig('waitTime', e.target.value)}>
                               <option value="5 Minutes">5 Minutes</option>
                               <option value="30 Minutes">30 Minutes</option>
                               <option value="1 Hour">1 Hour</option>
                               <option value="6 Hours">6 Hours</option>
                               <option value="1 Day">1 Day</option>
                               <option value="3 Days">3 Days</option>
                               <option value="7 Days">7 Days</option>
                             </NexusSelect>
                           </>
                         )}
                         {activeStep?.type === 'ai_step' && (
                           <>
                             <NexusTextArea label="AI Instruction" rows={6} value={activeStep.config.description || ''} onChange={(e) => updateStepConfig('description', e.target.value)} placeholder="Describe what the AI should do with this lead..." />
                             <p className="text-xs text-slate-400">The AI will receive the contact's data and your instruction, then generate a response or take an action.</p>
                           </>
                         )}
                         {activeStep?.type === 'condition' && (
                           <>
                             <NexusInput label="Field" value={activeStep.config.field || ''} onChange={(e) => updateStepConfig('field', e.target.value)} placeholder="e.g. leadScore, status" />
                             <NexusSelect label="Operator" value={activeStep.config.operator || 'gt'} onChange={(e) => updateStepConfig('operator', e.target.value)}>
                               <option value="gt">Greater than</option>
                               <option value="lt">Less than</option>
                               <option value="eq">Equals</option>
                               <option value="contains">Contains</option>
                             </NexusSelect>
                             <NexusInput label="Value" value={activeStep.config.value || ''} onChange={(e) => updateStepConfig('value', e.target.value)} />
                           </>
                         )}
                         {activeStep?.type === 'apify_actor' && (
                           <>
                             <NexusInput label="Actor ID" value={activeStep.config.actorId || ''} onChange={(e) => updateStepConfig('actorId', e.target.value)} />
                             <NexusTextArea label="JSON Input" rows={8} value={activeStep.config.input || ''} onChange={(e) => updateStepConfig('input', e.target.value)} className="bg-slate-900 text-emerald-400 font-mono text-sm" />
                           </>
                         )}
                         {activeStep?.type === 'external_sync' && (
                           <>
                             <NexusSelect label="Provider" value={activeStep.config.provider || 'Google Sheets'} onChange={(e) => updateStepConfig('provider', e.target.value)}>
                               <option value="Google Sheets">Google Sheets</option>
                               <option value="Airtable">Airtable</option>
                               <option value="Webhook">Webhook URL</option>
                             </NexusSelect>
                             <NexusInput label="Spreadsheet / Table ID" value={activeStep.config.spreadsheetId || ''} onChange={(e) => updateStepConfig('spreadsheetId', e.target.value)} />
                           </>
                         )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                         <NexusCard variant="ghost" padding="sm" className="flex items-center justify-between">
                            <div className="space-y-1">
                               <p className="text-xs font-semibold text-slate-900">Wait for full completion</p>
                               <p className="text-xs font-medium text-slate-400">Block next step until finish.</p>
                            </div>
                            <div className="w-8 h-4 bg-brand rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
                         </NexusCard>
                      </div>
                    )}
                 </div>
              </div>
              <div className="w-1/2 bg-slate-900 flex flex-col overflow-hidden relative">
                 <div className="h-12 border-b border-white/5 px-8 flex items-center justify-between bg-slate-950/50">
                    <span className="text-xs font-semibold text-slate-500">Live Output</span>
                 </div>
                 <div className="flex-1 p-6 overflow-y-auto thin-scrollbar font-mono text-sm">
                    {lastOutput ? (
                       <div className="bg-slate-950 rounded-xl p-8 text-emerald-400 border border-white/5 shadow-md animate-in zoom-in-95 duration-200">
                          <pre>{JSON.stringify(lastOutput, null, 2)}</pre>
                       </div>
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6">
                          <Terminal className="w-16 h-16 text-slate-500" />
                          <p className="text-sm font-semibold text-white">Waiting for output</p>
                       </div>
                    )}
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto bg-slate-50/50 p-8 thin-scrollbar">
              {activeWorkflow ? (
                <div className="max-w-md mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                  <NexusCard variant="slate" padding="md" className="w-full text-center relative border-8 border-white group">
                     <span className="text-xs font-semibold text-brand block mb-4">Entry Trigger</span>
                     <h4 className="font-semibold text-white text-base">{activeWorkflow.trigger}</h4>
                  </NexusCard>

                  {activeWorkflow.steps.map((step, idx) => (
                    <React.Fragment key={step.id}>
                      <div className="w-1 h-12 bg-slate-200 relative flex items-center justify-center group/insert">
                         <div className="absolute opacity-0 group-hover/insert:opacity-100 transition-all z-10 flex gap-1 bg-white border border-slate-100 rounded-full px-2 py-1 shadow-xl">
                           <button onClick={() => addStep('email', idx - 1)} className="p-1.5 text-slate-300 hover:text-brand transition-all" title="Insert Email"><Mail className="w-3.5 h-3.5" /></button>
                           <button onClick={() => addStep('sms', idx - 1)} className="p-1.5 text-slate-300 hover:text-brand transition-all" title="Insert SMS"><MessageSquare className="w-3.5 h-3.5" /></button>
                           <button onClick={() => addStep('wait', idx - 1)} className="p-1.5 text-slate-300 hover:text-amber-500 transition-all" title="Insert Wait"><Clock className="w-3.5 h-3.5" /></button>
                           <button onClick={() => addStep('ai_step', idx - 1)} className="p-1.5 text-slate-300 hover:text-brand transition-all" title="Insert AI Step"><Cpu className="w-3.5 h-3.5" /></button>
                         </div>
                      </div>
                      <NexusCard onClick={() => setEditingStepId(step.id)} padding="sm" className={`w-full cursor-pointer flex items-center gap-6 border-4 transition-all group/step ${editingStepId === step.id ? 'border-brand ring-[12px] ring-brand/5 scale-105 shadow-md' : 'border-white hover:border-brand/20 shadow-xl'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${step.type === 'email' ? 'bg-indigo-50 text-brand' : step.type === 'sms' ? 'bg-green-50 text-green-600' : step.type === 'wait' ? 'bg-amber-50 text-amber-600' : step.type === 'condition' ? 'bg-purple-50 text-purple-600' : step.type === 'ai_step' ? 'bg-slate-100 text-slate-700' : step.type === 'external_sync' ? 'bg-cyan-50 text-cyan-600' : 'bg-orange-50 text-[#FF9000]'}`}>
                          {step.type === 'email' && <Mail className="w-6 h-6" />}
                          {step.type === 'sms' && <MessageSquare className="w-6 h-6" />}
                          {step.type === 'wait' && <Clock className="w-6 h-6" />}
                          {step.type === 'condition' && <GitBranch className="w-6 h-6" />}
                          {step.type === 'ai_step' && <Cpu className="w-6 h-6" />}
                          {step.type === 'apify_actor' && <Box className="w-6 h-6" />}
                          {step.type === 'external_sync' && <Globe className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400 mb-1">{step.type.replace('_', ' ')} step</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{step.config.subject || step.config.message || step.config.waitTime || step.config.actorId || step.config.provider || step.config.description || '—'}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-3 text-slate-200 hover:text-rose-500 opacity-0 group-hover/step:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </NexusCard>
                    </React.Fragment>
                  ))}

                  <div className="w-1 h-12 bg-slate-200"></div>
                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-md">
                     <button onClick={() => addStep('email')} className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-brand hover:bg-indigo-50 transition-all" title="Email"><Mail className="w-5 h-5" /></button>
                     <button onClick={() => addStep('sms')} className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-brand hover:bg-indigo-50 transition-all" title="SMS"><MessageSquare className="w-5 h-5" /><span className="text-xs mt-1 font-semibold">SMS</span></button>
                     <button onClick={() => addStep('wait')} className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-amber-500 hover:bg-amber-50 transition-all"><Clock className="w-5 h-5" /></button>
                     <button onClick={() => addStep('apify_actor')} className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-[#FF9000] hover:bg-orange-50 transition-all"><Box className="w-5 h-5" /></button>
                     <button onClick={() => addStep('ai_step')} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-brand transition-all shadow-xl"><Cpu className="w-5 h-5" /></button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                   <WorkflowIcon className="w-24 h-24 text-slate-200 mb-8" />
                   <p className="text-2xl font-semibold text-slate-400">No workflow selected</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NexusModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="Template Library" maxWidth="max-w-4xl">
         <div className="grid grid-cols-2 gap-4">
            <NexusCard variant="ghost" padding="md" className="space-y-6 hover:border-brand transition-all cursor-pointer group">
               <div className="w-14 h-14 bg-brand text-white rounded-2xl flex items-center justify-center shadow-xl"><Rocket className="w-8 h-8" /></div>
               <h4 className="font-semibold text-slate-900 text-sm">Agency Growth Master</h4>
               <NexusButton variant="brand" className="w-full" onClick={() => { importTemplate('agency-master'); setShowTemplates(false); }}>Use Template</NexusButton>
            </NexusCard>
            <NexusCard variant="ghost" padding="md" className="space-y-6 hover:border-[#FF9000] transition-all cursor-pointer group">
               <div className="w-14 h-14 bg-[#FF9000] text-white rounded-2xl flex items-center justify-center shadow-xl"><Table className="w-8 h-8" /></div>
               <h4 className="font-semibold text-slate-900 text-sm">Market Research AI</h4>
               <NexusButton variant="slate" className="w-full" onClick={() => { importTemplate('apify-research'); setShowTemplates(false); }}>Use Template</NexusButton>
            </NexusCard>
         </div>
      </NexusModal>

      <NexusModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} title="AI Workflow Builder" maxWidth="max-w-lg">
         <div className="space-y-6">
            <p className="text-sm text-slate-500">Describe the workflow you want to build and AI will generate the steps for you.</p>
            <NexusTextArea
              label="Describe your workflow"
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. When a new lead submits a form, send a welcome email, wait 1 day, then send a follow-up SMS if they haven't replied..."
            />
            <div className="flex gap-3 justify-end">
               <NexusButton variant="slate" onClick={() => setShowAiModal(false)}>Cancel</NexusButton>
               <NexusButton
                 variant="brand"
                 icon={Sparkles}
                 onClick={async () => {
                   if (!aiPrompt.trim()) { notify('Please describe the workflow you want to build.', 'error'); return; }
                   try {
                     const result = await api.post<{ name: string; trigger: string; steps: Array<{ type: string; config: any }> }>('/ai/generate-json', {
                       systemPrompt: 'You are a workflow builder assistant. Generate a JSON workflow with name, trigger, and steps array. Each step has type (email|sms|wait|condition|ai_step) and config object. Return valid JSON only.',
                       message: aiPrompt,
                     });
                     const created = await api.post<Workflow>('/workflows', {
                       name: result.name || 'AI-Generated Workflow',
                       trigger: result.trigger || 'Form Submitted',
                       isActive: false,
                       steps: result.steps || [],
                     });
                     setWorkflows(prev => [...prev, created]);
                     setActiveWorkflow(created);
                     setShowAiModal(false);
                     setAiPrompt('');
                     notify('AI workflow generated successfully!');
                   } catch (err: any) {
                     notify(err.message || 'AI generation failed. Try a more specific description.', 'error');
                   }
                 }}
               >Generate Workflow</NexusButton>
            </div>
         </div>
      </NexusModal>
    </div>
  );
};

export default AutomationEngine;
