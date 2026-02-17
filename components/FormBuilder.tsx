
import React, { useState } from 'react';
import {
  Eye, Copy, Save, Plus, ChevronRight, Layout, Type, Mail, Phone,
  CheckSquare, Hash, Database, Trash2, Rocket, Loader2, CheckCircle2,
  X, Zap, ArrowRight, UserPlus, MessageSquare, Bell, Workflow
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { NexusCard, NexusButton, NexusHeader, NexusInput, NexusBadge } from './NexusUI';

const FormBuilder: React.FC = () => {
  const { addContact, notify, workflows, fieldDefinitions } = useNexus();
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [formFields, setFormFields] = useState([
    { id: '1', type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
    { id: '2', type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true },
  ]);

  const [mockName, setMockName] = useState('Prospective Lead');
  const [mockEmail, setMockEmail] = useState('demo@nexus.io');

  const addStandardField = (type: string) => {
    const newField = {
      id: Date.now().toString(),
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: '',
      required: false
    };
    setFormFields([...formFields, newField]);
  };

  const handleSimulateSubmit = async () => {
    setIsSimulating(true);
    setSimulationStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setSimulationStep(2);

    addContact({
      name: mockName,
      email: mockEmail,
      source: 'Direct',
      status: 'Lead',
      activities: [{
        id: Date.now().toString(),
        type: 'form_submission',
        content: `Captured via Form Builder: Contact Form`,
        timestamp: new Date().toISOString()
      }]
    });

    setSimulationStep(3);
    await new Promise(r => setTimeout(r, 1000));
    setIsSimulating(false);
    setSimulationStep(0);
  };

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700 pb-20">
      <NexusHeader title="Form Builder" subtitle="Create forms and connect them to workflows">
        <NexusButton variant="ghost" onClick={() => setIsSimulating(true)} icon={Eye}>Test Submission</NexusButton>
        <NexusButton icon={Save}>Save Form</NexusButton>
      </NexusHeader>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="w-80 space-y-8 shrink-0 flex flex-col overflow-y-auto thin-scrollbar pb-10">
          <NexusCard padding="md" className="flex-1 flex flex-col h-full border-b-8 border-brand/5">
            <h3 className="text-xs font-semibold text-slate-400 mb-6 flex items-center gap-2 px-2">
               <Plus className="w-3.5 h-3.5" /> Field Library
            </h3>
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
              <button onClick={() => setActiveTab('standard')} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'standard' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}>Standard</button>
              <button onClick={() => setActiveTab('custom')} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'custom' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}>Custom</button>
            </div>

            <div className="flex-1 overflow-y-auto thin-scrollbar space-y-3">
              {activeTab === 'standard' ? (
                <>
                  {[
                    { label: 'Short Text', type: 'text', icon: Type, color: 'text-indigo-500' },
                    { label: 'Email', type: 'email', icon: Mail, color: 'text-emerald-500' },
                    { label: 'Phone Number', type: 'phone', icon: Phone, color: 'text-rose-500' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => addStandardField(item.type)} className="w-full flex items-center gap-4 p-4 border border-slate-50 bg-slate-50/30 rounded-2xl hover:border-brand hover:bg-white transition-all group shadow-sm">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                      <span className="text-xs font-semibold text-slate-500 group-hover:text-brand">{item.label}</span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {fieldDefinitions.map(field => (
                    <button key={field.id} onClick={() => addStandardField(field.type)} className="w-full flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-brand hover:shadow-md transition-all group text-left">
                       <Database className="w-4 h-4 text-indigo-400" />
                       <span className="text-xs font-semibold text-slate-700 truncate">{field.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </NexusCard>
        </div>

        <div className="flex-1 bg-slate-100 rounded-2xl p-6 border-4 border-white shadow-md overflow-y-auto thin-scrollbar relative">
          <div className="max-w-md mx-auto space-y-5">
             <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-6 duration-700">
               <div className="bg-brand h-2.5 w-full"></div>
               <div className="p-6 space-y-5">
                 <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold text-slate-900">Contact Form</h2>
                    <p className="text-slate-400 text-xs font-medium">Fill in the details below</p>
                 </div>
                 <div className="space-y-6">
                   {formFields.map((field) => (
                     <div key={field.id} className="relative group animate-in fade-in duration-300">
                       <label className="text-xs font-semibold text-slate-500 ml-1 mb-2 block">{field.label}</label>
                       <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-6 text-slate-300 text-sm font-medium italic select-none shadow-inner group-hover:border-brand/20 transition-all">
                          {field.placeholder || 'Enter value...'}
                       </div>
                       <button onClick={() => setFormFields(formFields.filter(f => f.id !== field.id))} className="absolute -right-12 top-1/2 -translate-y-1/2 p-2.5 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                     </div>
                   ))}
                   <NexusButton variant="brand" size="xl" className="w-full mt-6">Submit</NexusButton>
                 </div>
               </div>
             </div>
          </div>
        </div>

        <div className="w-80 space-y-6 shrink-0 flex flex-col overflow-y-auto thin-scrollbar pb-10">
           <NexusCard padding="md" className="space-y-8 h-full flex flex-col">
              <div>
                 <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand" /> After Submission
                 </h3>
                 <p className="text-xs text-slate-400 font-medium leading-relaxed">Actions that run after the form is submitted.</p>
              </div>
              <div className="space-y-4 flex-1">
                 <div className="p-5 bg-slate-950 rounded-xl text-white relative overflow-hidden group">
                    <div className="relative z-10 space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand/20 text-brand flex items-center justify-center border border-brand/20"><UserPlus className="w-4 h-4" /></div>
                          <span className="text-xs font-semibold">Add Contact</span>
                       </div>
                       <p className="text-xs text-slate-400 leading-relaxed">Source set to "Web Form".</p>
                    </div>
                 </div>
                 <div className="flex justify-center py-2"><ArrowRight className="w-4 h-4 text-slate-200 rotate-90" /></div>
                 <div className="p-5 bg-white border border-slate-100 rounded-xl relative group shadow-sm hover:border-brand transition-all cursor-pointer">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-indigo-50 text-brand flex items-center justify-center border border-indigo-100"><Workflow className="w-4 h-4" /></div>
                             <span className="text-xs font-semibold text-slate-900">Start Workflow</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-200" />
                       </div>
                       <div className="px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                          <p className="text-xs font-semibold text-brand truncate">{workflows[0]?.name || 'Nurture Sequence 01'}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </NexusCard>
        </div>
      </div>

      {isSimulating && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-8">
           <div className="w-full max-w-xl bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500">
              {simulationStep === 0 ? (
                 <div className="p-8 space-y-6 text-center">
                    <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto shadow-xl"><Rocket className="w-12 h-12" /></div>
                    <div className="space-y-4">
                       <h3 className="text-4xl font-semibold text-slate-900">Test Submission</h3>
                       <p className="text-slate-400 font-medium text-xs leading-relaxed">Send a test entry to validate your form.</p>
                    </div>
                    <div className="space-y-4 text-left">
                       <NexusInput label="Test Name" value={mockName} onChange={e => setMockName(e.target.value)} />
                       <NexusInput label="Test Email" value={mockEmail} onChange={e => setMockEmail(e.target.value)} />
                    </div>
                    <div className="flex gap-4">
                       <NexusButton variant="ghost" className="flex-1" size="lg" onClick={() => setIsSimulating(false)}>Cancel</NexusButton>
                       <NexusButton variant="brand" className="flex-1" size="lg" onClick={handleSimulateSubmit}>Submit Test</NexusButton>
                    </div>
                 </div>
              ) : (
                 <div className="p-8 space-y-6 text-center">
                    <div className="w-32 h-32 bg-brand/10 rounded-xl flex items-center justify-center mx-auto shadow-md relative">
                       {simulationStep < 3 ? <Loader2 className="w-16 h-16 text-brand animate-spin" /> : <CheckCircle2 className="w-16 h-16 text-emerald-500" />}
                    </div>
                    <h3 className="text-4xl font-semibold text-slate-900">
                       {simulationStep === 1 && 'Submitting...'}
                       {simulationStep === 2 && 'Processing...'}
                       {simulationStep === 3 && 'Submission Complete'}
                    </h3>
                    {simulationStep === 3 && <NexusButton onClick={() => setIsSimulating(false)} size="lg">Return to Builder</NexusButton>}
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
