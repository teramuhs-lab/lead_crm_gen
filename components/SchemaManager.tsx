
import React, { useState } from 'react';
import { Database, Plus, Trash2, Edit2, Hash, Type, Calendar, ChevronDown, Save, X } from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { CustomFieldDefinition } from '../types';
import { NexusCard, NexusButton, NexusHeader, NexusInput, NexusSelect, NexusModal } from './NexusUI';

const SchemaManager: React.FC = () => {
  const { fieldDefinitions, setFieldDefinitions, activeSubAccountId } = useNexus();
  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomFieldDefinition>>({
    label: '',
    type: 'text',
    options: []
  });

  const handleAddField = () => {
    if (!newField.label) return;
    const field: CustomFieldDefinition = {
      id: `cf-${Date.now()}`,
      label: newField.label,
      type: newField.type as any,
      options: newField.options,
      subAccountId: activeSubAccountId
    };
    setFieldDefinitions([...fieldDefinitions, field]);
    setIsAdding(false);
    setNewField({ label: '', type: 'text', options: [] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <NexusHeader title="Custom Fields" subtitle="Define the database schema for this sub-account">
        <NexusButton onClick={() => setIsAdding(true)} icon={Plus}>Add New Field</NexusButton>
      </NexusHeader>

      <NexusCard padding="none">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
           <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Database className="w-4 h-4 text-brand" /> Active Database Schema
           </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {fieldDefinitions.map(field => (
            <div key={field.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                  {field.type === 'text' && <Type className="w-6 h-6" />}
                  {field.type === 'number' && <Hash className="w-6 h-6" />}
                  {field.type === 'date' && <Calendar className="w-6 h-6" />}
                  {field.type === 'dropdown' && <ChevronDown className="w-6 h-6" />}
                </div>
                <div>
                   <h4 className="font-bold text-slate-900 text-sm">{field.label}</h4>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-brand bg-indigo-50 px-2 py-0.5 rounded-md">{field.type}</span>
                   </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => setFieldDefinitions(prev => prev.filter(f => f.id !== field.id))} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {fieldDefinitions.length === 0 && (
            <div className="p-20 text-center text-slate-400 italic text-sm">No custom fields defined.</div>
          )}
        </div>
      </NexusCard>

      <NexusModal isOpen={isAdding} onClose={() => setIsAdding(false)} title="Add Custom Field" subtitle="Extend the schema with a new field">
         <div className="space-y-6">
            <NexusInput label="Field Name" placeholder="e.g. Property Address" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} />
            <NexusSelect label="Data Type" value={newField.type} onChange={e => setNewField({...newField, type: e.target.value as any})}>
               <option value="text">Single Line Text</option>
               <option value="number">Numeric Value</option>
               <option value="date">Date</option>
            </NexusSelect>
            <div className="pt-6">
               <NexusButton className="w-full" size="xl" onClick={handleAddField}>Save Field</NexusButton>
            </div>
         </div>
      </NexusModal>
    </div>
  );
};

export default SchemaManager;
