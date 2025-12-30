import React, { useState, useRef, useEffect } from 'react';

import { useData } from '../context/DataContext';
import { useFlow } from '../context/FlowContext';
import { useToast } from '../context/ToastContext';

import Modal from './Modal';

export default function JobForm({open, onClose}){
  const { state, addJob } = useData();
  const { flowTemplates: availableFlowTemplates, ensureLoaded } = useFlow();
  
  // Ensure flow templates are loaded when component mounts
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Remote');
  const [type, setType] = useState('full-time');
  const [openings, setOpenings] = useState(1);
  const [flowTemplateId, setFlowTemplateId] = useState('');
  const [titleError, setTitleError] = useState('');
  const [flowTemplateError, setFlowTemplateError] = useState('');
  const [touched, setTouched] = useState({ title: false, flowTemplate: false });
  const titleRef = useRef(null);
  const flowTemplateRef = useRef(null);

  const toast = useToast();
  
  // Reset form when modal closes/opens
  useEffect(() => {
    if (!open) {
      setTitle('');
      setLocation('Remote');
      setType('full-time');
      setOpenings(1);
      setFlowTemplateId('');
      setTitleError('');
      setFlowTemplateError('');
      setTouched({ title: false, flowTemplate: false });
    }
  }, [open]);

  const validateTitle = (value) => {
    if (!value.trim()) {
      return 'Job title is required';
    }
    return '';
  };
  
  const validateFlowTemplate = (value) => {
    if (!value) {
      return 'Flow template is required';
    }
    return '';
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTitle(value);
    if (touched.title) {
      setTitleError(validateTitle(value));
    }
  };

  const handleTitleBlur = () => {
    setTouched(prev => ({ ...prev, title: true }));
    setTitleError(validateTitle(title));
  };
  
  const handleFlowTemplateChange = (e) => {
    const value = e.target.value;
    setFlowTemplateId(value);
    if (touched.flowTemplate) {
      setFlowTemplateError(validateFlowTemplate(value));
    }
  };

  const handleFlowTemplateBlur = () => {
    setTouched(prev => ({ ...prev, flowTemplate: true }));
    setFlowTemplateError(validateFlowTemplate(flowTemplateId));
  };

  function submit(e){
    e.preventDefault();
    
    // Mark all as touched
    setTouched({ title: true, flowTemplate: true });
    
    // Validate
    const titleValidationError = validateTitle(title);
    const flowTemplateValidationError = validateFlowTemplate(flowTemplateId);
    setTitleError(titleValidationError);
    setFlowTemplateError(flowTemplateValidationError);
    
    if (titleValidationError || flowTemplateValidationError) {
      toast.show('Please fix the errors before submitting');
      
      // Scroll to and focus the first error field with animation
      const firstErrorRef = titleValidationError ? titleRef : flowTemplateRef;
      if (firstErrorRef.current) {
        firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorRef.current.classList.add('animate-shake');
        setTimeout(() => {
          firstErrorRef.current?.classList.remove('animate-shake');
          firstErrorRef.current?.focus();
        }, 400);
      }
      return;
    }
    
    const job = { 
      title, 
      location, 
      employmentType: type, // Backend expects 'employmentType', not 'type'
      description: 'Job description to be added.', // Provide default description for quick create
      flowTemplateId: null // Can be set later through job edit
    };
    addJob(job).then(()=>{
      toast.show('Job created');
      onClose();
    }).catch(err=>{
      console.error(err);
      toast.show('Failed to create job on server');
    });
  }

  return (
    <Modal open={open} title="Create job" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="job-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input 
            id="job-title"
            ref={titleRef}
            type="text"
            value={title} 
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="e.g., Senior Software Engineer" 
            aria-required="true"
            aria-invalid={titleError ? 'true' : 'false'}
            aria-describedby={titleError ? 'title-error' : undefined}
            className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              titleError 
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
          />
          {titleError && (
            <div id="title-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
              {titleError}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="flow-template" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Recruitment Flow <span className="text-red-500">*</span>
          </label>
          <select
            id="flow-template"
            ref={flowTemplateRef}
            value={flowTemplateId}
            onChange={handleFlowTemplateChange}
            onBlur={handleFlowTemplateBlur}
            aria-required="true"
            aria-invalid={flowTemplateError ? 'true' : 'false'}
            aria-describedby={flowTemplateError ? 'flow-template-error' : undefined}
            className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              flowTemplateError 
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
          >
            <option value="">Select a flow template...</option>
            {availableFlowTemplates && availableFlowTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} {template.category ? `(${template.category})` : ''}
              </option>
            ))}
          </select>
          {flowTemplateError && (
            <div id="flow-template-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
              {flowTemplateError}
            </div>
          )}
          {(!availableFlowTemplates || availableFlowTemplates.length === 0) && (
            <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              No flow templates found. Create one in Workspace Settings first.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="job-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            <input 
              id="job-location"
              type="text"
              value={location} 
              onChange={e=>setLocation(e.target.value)} 
              placeholder="Location"
              className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
            />
          </div>
          <div>
            <label htmlFor="job-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type
            </label>
            <select 
              id="job-type"
              value={type} 
              onChange={e=>setType(e.target.value)} 
              className="w-full border border-slate-300 dark:border-slate-600 px-2 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="job-openings" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Number of Openings
          </label>
          <input 
            id="job-openings"
            type="number" 
            min={1} 
            value={openings} 
            onChange={e=>setOpenings(e.target.value)} 
            className="w-28 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">Cancel</button>
          <button 
            type="submit" 
            disabled={!title.trim() || !flowTemplateId || flowTemplates.length === 0}
            className={`px-3 py-2 rounded font-medium transition-all ${
              !title.trim() || !flowTemplateId || flowTemplates.length === 0
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
            }`}
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
