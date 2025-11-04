import React from 'react'

/**
 * Parse markdown-like text to HTML (same as JobDescriptionStep)
 * @param {string} text - Text with markdown-like syntax
 * @returns {string} HTML string
 */
const parseMarkdown = (text) => {
  if (!text) return ''
  
  let html = text
  
  // Convert headings (## Heading)
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-slate-900 dark:text-slate-100">$1</h3>')
  
  // Convert bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
  
  // Convert italic (*text*)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>')
  
  // Convert underline (__text__)
  html = html.replace(/__(.+?)__/g, '<u class="underline">$1</u>')
  
  // Convert strikethrough (~~text~~)
  html = html.replace(/~~(.+?)~~/g, '<s class="line-through">$1</s>')
  
  // Convert links ([text](url))
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-emerald-600 dark:text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Convert bullet points (• item)
  html = html.replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
  
  // Convert numbered lists (1. item, 2. item, etc.)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
  
  // Wrap consecutive <li> elements in <ul> or <ol>
  html = html.replace(/(<li class="ml-4">.*?<\/li>\n?)+/g, (match) => {
    return `<ul class="list-disc space-y-1 my-2">${match}</ul>`
  })
  html = html.replace(/(<li class="ml-4 list-decimal">.*?<\/li>\n?)+/g, (match) => {
    return `<ol class="list-decimal space-y-1 my-2">${match}</ol>`
  })
  
  // Convert line breaks to <br> but preserve paragraph spacing
  html = html.replace(/\n\n/g, '</p><p class="mt-3">')
  html = html.replace(/\n/g, '<br />')
  
  // Wrap in paragraph if not empty
  if (html && !html.startsWith('<')) {
    html = `<p>${html}</p>`
  }
  
  return html
}

/**
 * JobRequirementsStep - Third step of job requisition form
 * Handles job requirements and salary information
 * 
 * @param {Object} formData - Form data object (requirements, experienceLevel, salary)
 * @param {Object} errors - Validation errors object
 * @param {Object} touched - Touched fields tracking object
 * @param {Function} onFieldChange - Handler for field value changes
 * @param {Function} onFieldBlur - Handler for field blur events
 * @param {Object} requirementsRef - React ref for requirements textarea
 * @param {Function} toast - Toast notification function
 */
export default function JobRequirementsStep({ 
  formData,
  errors = {},
  touched = {},
  onFieldChange,
  onFieldBlur,
  requirementsRef,
  toast
}) {
  const { requirements = '', experienceLevel = 'mid', salary = '' } = formData

  // Text formatting functions for requirements
  const applyFormat = (formatType) => {
    const textarea = requirementsRef?.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = requirements.substring(start, end)
    
    if (!selectedText) {
      toast?.show('Please select text to format')
      return
    }
    
    let formattedText = ''
    let newCursorPos = end
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`
        newCursorPos = end + 4
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        newCursorPos = end + 2
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        newCursorPos = end + 4
        break
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`
        newCursorPos = end + 4
        break
      default:
        formattedText = selectedText
    }
    
    const newRequirements = requirements.substring(0, start) + formattedText + requirements.substring(end)
    onFieldChange('requirements', newRequirements)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }
  
  const insertList = (listType) => {
    const textarea = requirementsRef?.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = requirements.substring(start, end)
    
    let formattedText = ''
    
    if (selectedText) {
      // Format selected lines
      const lines = selectedText.split('\n')
      formattedText = lines.map((line, index) => {
        if (line.trim()) {
          return listType === 'bullet' ? `• ${line.trim()}` : `${index + 1}. ${line.trim()}`
        }
        return line
      }).join('\n')
    } else {
      // Insert new list item
      formattedText = listType === 'bullet' ? '• ' : '1. '
    }
    
    const newRequirements = requirements.substring(0, start) + formattedText + requirements.substring(end)
    onFieldChange('requirements', newRequirements)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
    }, 0)
  }
  
  const insertLink = () => {
    const textarea = requirementsRef?.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = requirements.substring(start, end)
    
    const linkText = selectedText || 'link text'
    const formattedText = `[${linkText}](https://example.com)`
    
    const newRequirements = requirements.substring(0, start) + formattedText + requirements.substring(end)
    onFieldChange('requirements', newRequirements)
    
    setTimeout(() => {
      textarea.focus()
      // Select the URL part for easy editing
      const urlStart = start + linkText.length + 3
      textarea.setSelectionRange(urlStart, urlStart + 19)
    }, 0)
  }
  
  const insertHeading = () => {
    const textarea = requirementsRef?.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const lineStart = requirements.lastIndexOf('\n', start - 1) + 1
    
    const formattedText = '## '
    const newRequirements = requirements.substring(0, lineStart) + formattedText + requirements.substring(lineStart)
    onFieldChange('requirements', newRequirements)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart + formattedText.length, lineStart + formattedText.length)
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Requirements</h2>
        
        {/* Formatting Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-0.5 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm">
          <button 
            type="button" 
            onClick={() => applyFormat('bold')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Bold (**text**)"
            aria-label="Bold"
          >
            <span className="block w-5 h-5 text-center font-bold text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">B</span>
          </button>
          <button 
            type="button" 
            onClick={() => applyFormat('italic')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Italic (*text*)"
            aria-label="Italic"
          >
            <span className="block w-5 h-5 text-center italic font-serif text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">I</span>
          </button>
          <button 
            type="button" 
            onClick={() => applyFormat('underline')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Underline (__text__)"
            aria-label="Underline"
          >
            <span className="block w-5 h-5 text-center underline text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">U</span>
          </button>
          <button 
            type="button" 
            onClick={() => applyFormat('strikethrough')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Strikethrough (~~text~~)"
            aria-label="Strikethrough"
          >
            <span className="block w-5 h-5 text-center line-through text-base leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">S</span>
          </button>
          
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          
          <button 
            type="button" 
            onClick={insertHeading}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Heading (## text)"
            aria-label="Heading"
          >
            <span className="block w-5 h-5 text-center font-bold text-lg leading-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">H</span>
          </button>
          
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          
          <button 
            type="button" 
            onClick={() => insertList('bullet')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Bullet list (• item)"
            aria-label="Bullet list"
          >
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round"/>
              <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round"/>
              <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round"/>
              <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
              <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
            </svg>
          </button>
          <button 
            type="button" 
            onClick={() => insertList('numbered')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Numbered list (1. item)"
            aria-label="Numbered list"
          >
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
            </svg>
          </button>
          
          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
          
          <button 
            type="button" 
            onClick={insertLink}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group" 
            title="Insert link ([text](url))"
            aria-label="Insert link"
          >
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>
        
        {/* Requirements Textarea */}
        <textarea
          id="job-requirements"
          ref={requirementsRef}
          value={requirements}
          onChange={(e) => onFieldChange('requirements', e.target.value)}
          onBlur={() => onFieldBlur && onFieldBlur('requirements')}
          placeholder="Write the job requirements...&#10;&#10;Example:&#10;## Required Qualifications&#10;• Bachelor's degree in Computer Science or related field&#10;• 3+ years of experience in QA testing&#10;• Strong knowledge of testing frameworks"
          rows="10"
          aria-invalid={errors.requirements ? 'true' : 'false'}
          aria-describedby={errors.requirements ? 'requirements-error' : undefined}
          className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all resize-none font-mono text-sm ${
            errors.requirements && touched.requirements
              ? 'border-red-400 dark:border-red-500 focus:ring-red-500 focus:border-red-500 animate-shake' 
              : 'border-slate-300 dark:border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
          }`}
        />
        {errors.requirements && touched.requirements && (
          <div id="requirements-error" className="mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn" role="alert">
            {errors.requirements}
          </div>
        )}
        
        {/* Live Preview */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Preview</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
            {requirements ? (
              <div 
                className="leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(requirements) }}
              />
            ) : (
              <div className="text-slate-400 italic">Your formatted requirements will appear here...</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Salary Range */}
      <div>
        <label htmlFor="salary-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Salary Range (Optional)
        </label>
        <input
          id="salary-input"
          type="text"
          value={salary}
          onChange={(e) => onFieldChange('salary', e.target.value)}
          placeholder="$100,000 - $130,000"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
        />
      </div>
    </div>
  )
}
