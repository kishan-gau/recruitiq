import { useState, useRef, useEffect } from 'react';

import { useData } from '../context/DataContext';
import { useFlow } from '../context/FlowContext';
import { useToast } from '../context/ToastContext';

import Modal from './Modal';

export default function CandidateForm({open, onClose, candidate}){
  const { state, addCandidate, updateCandidate } = useData();
  const { flowTemplates, ensureLoaded } = useFlow();
  
  const isEdit = !!candidate;
  
  // Ensure flow templates are loaded when component mounts
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobId, setJobId] = useState(state.jobs[0]?.id || '');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false });
  const nameRef = useRef(null);
  const emailRef = useRef(null);

  const toast = useToast();
  
  // Get the first stage from the selected job's flow template
  const getInitialStage = () => {
    const selectedJob = state.jobs.find(j => j.id === Number(jobId));
    if (!selectedJob?.flowTemplateId || !flowTemplates) {
      return 'Applied'; // Fallback
    }
    
    try {
      const template = flowTemplates.find(t => t.id === selectedJob.flowTemplateId);
      
      if (template?.stages && template.stages.length > 0) {
        // Return the first stage name
        return template.stages[0].name;
      }
    } catch (e) {
      console.error('Failed to load flow template for initial stage:', e);
    }
    
    return 'Applied'; // Fallback
  };
  
  // Reset form when modal closes/opens or populate when editing
  useEffect(() => {
    if (open && candidate) {
      // Populate fields for editing
      setName(candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim());
      setEmail(candidate.email || '');
      setTitle(candidate.currentJobTitle || candidate.title || '');
      setLocation(candidate.location || 'Remote');
      setJobId(candidate.jobId || state.jobs[0]?.id || '');
      setNameError('');
      setEmailError('');
      setTouched({ name: false, email: false });
    } else if (!open) {
      // Reset form when closing
      setName('');
      setEmail('');
      setTitle('');
      setLocation('Remote');
      setJobId(state.jobs[0]?.id || '');
      setNameError('');
      setEmailError('');
      setTouched({ name: false, email: false });
    }
  }, [open, candidate, state.jobs]);

  const validateName = (value) => {
    if (!value.trim()) {
      return 'Candidate name is required';
    }
    return '';
  };

  const validateEmail = (value) => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (touched.name) {
      setNameError(validateName(value));
    }
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }));
    setNameError(validateName(name));
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setEmailError(validateEmail(email));
  };

  function submit(e){
    e.preventDefault();
    
    // Mark all as touched
    setTouched({ name: true, email: true });
    
    // Validate
    const nameValidationError = validateName(name);
    const emailValidationError = validateEmail(email);
    setNameError(nameValidationError);
    setEmailError(emailValidationError);
    
    if (nameValidationError) {
      toast.show('Please fix the errors before submitting');
      
      // Scroll to and focus the first error field with animation
      if (nameRef.current) {
        nameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameRef.current.classList.add('animate-shake');
        setTimeout(() => {
          nameRef.current?.classList.remove('animate-shake');
          nameRef.current?.focus();
        }, 400);
      }
      return;
    }

    if (emailValidationError) {
      toast.show('Please fix the errors before submitting');
      
      // Scroll to and focus email field with animation
      if (emailRef.current) {
        emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current.classList.add('animate-shake');
        setTimeout(() => {
          emailRef.current?.classList.remove('animate-shake');
          emailRef.current?.focus();
        }, 400);
      }
      return;
    }
    
    const candidateData = { 
      name,
      email,
      title, 
      location
    };
    
    if (isEdit) {
      // Update existing candidate
      updateCandidate(candidate.id, candidateData).then(()=>{
        toast.show('Candidate updated');
        onClose();
      }).catch(err=>{
        console.error(err);
        toast.show('Failed to update candidate');
      });
    } else {
      // Add new candidate
      const initialStage = getInitialStage();
      candidateData.jobId = Number(jobId);
      candidateData.stage = initialStage;
      candidateData.experience = '';
      candidateData.resume = '';
      
      addCandidate(candidateData).then(()=>{
        toast.show('Candidate added');
        onClose();
      }).catch(err=>{
        console.error(err);
        toast.show('Failed to add candidate on server');
      });
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Edit Candidate' : 'Add Candidate'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label htmlFor="candidate-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input 
            id="candidate-name"
            ref={nameRef}
            type="text"
            value={name} 
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            placeholder="Full name" 
            aria-required="true"
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'name-error' : undefined}
            className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              nameError 
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
          />
          {nameError && (
            <div id="name-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
              {nameError}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="candidate-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input 
            id="candidate-email"
            ref={emailRef}
            type="email"
            value={email} 
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            placeholder="email@example.com" 
            aria-required="true"
            aria-invalid={emailError ? 'true' : 'false'}
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`w-full border px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${
              emailError 
                ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
            }`}
          />
          {emailError && (
            <div id="email-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
              {emailError}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="candidate-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Current Title
          </label>
          <input 
            id="candidate-title"
            type="text"
            value={title} 
            onChange={e=>setTitle(e.target.value)} 
            placeholder="Current title" 
            className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="candidate-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            <input 
              id="candidate-location"
              type="text"
              value={location} 
              onChange={e=>setLocation(e.target.value)} 
              placeholder="Location"
              className="w-full border border-slate-300 dark:border-slate-600 px-3 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow" 
            />
          </div>
          <div>
            <label htmlFor="candidate-job" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Job
            </label>
            <select 
              id="candidate-job"
              value={jobId} 
              onChange={e=>setJobId(e.target.value)} 
              className="w-full border border-slate-300 dark:border-slate-600 px-2 py-2 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            >
              {state.jobs.map(j=> <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-emerald-500 text-white rounded">Add</button>
        </div>
      </form>
    </Modal>
  );
}
