import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { motion, AnimatePresence } from 'framer-motion';
import WorkspaceManager from './WorkspaceManager';

export default function WorkspaceSelector({ isCollapsed }) {
  const {
    currentWorkspace,
    workspaces,
    switchWorkspace,
    getWorkspaceColor,
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Safety check: if no current workspace, don't render (AFTER all hooks)
  if (!currentWorkspace) {
    return null;
  }

  const currentColor = getWorkspaceColor(currentWorkspace.color || 'emerald');

  const handleWorkspaceClick = (workspaceId) => {
    if (workspaceId !== currentWorkspace.id) {
      switchWorkspace(workspaceId);
    }
    setIsOpen(false);
  };

  const handleManageClick = () => {
    setIsOpen(false);
    setIsManagerOpen(true);
  };

  if (isCollapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-3 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
          title={currentWorkspace.name}
        >
          <div className={`w-3 h-3 rounded-full ${currentColor.class} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ${currentColor.ring}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full ml-2 top-0 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50"
            >
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Switch Workspace
              </div>
              <div className="max-h-80 overflow-y-auto">
                {workspaces.map((workspace) => {
                  const color = getWorkspaceColor(workspace.color);
                  const isActive = workspace.id === currentWorkspace.id;

                  return (
                    <button
                      key={workspace.id}
                      onClick={() => handleWorkspaceClick(workspace.id)}
                      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                        isActive ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${color.class} flex-shrink-0`} />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-1 text-left">
                        {workspace.name}
                      </span>
                      {isActive && (
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                <button
                  onClick={handleManageClick}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-emerald-600 dark:text-emerald-400"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium flex-1 text-left">Manage Workspaces</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <WorkspaceManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
      >
        <div className={`w-3 h-3 rounded-full ${currentColor.class} flex-shrink-0`} />
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-1 text-left">
          {currentWorkspace.name}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50"
          >
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              Switch Workspace
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {workspaces.map((workspace) => {
                const color = getWorkspaceColor(workspace.color);
                const isActive = workspace.id === currentWorkspace.id;

                return (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceClick(workspace.id)}
                    className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${
                      isActive ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${color.class} flex-shrink-0`} />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate flex-1 text-left">
                      {workspace.name}
                    </span>
                    {isActive && (
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
              <button
                onClick={handleManageClick}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-emerald-600 dark:text-emerald-400"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium flex-1 text-left">Manage Workspaces</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    <WorkspaceManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} />
    </>
  );
}
