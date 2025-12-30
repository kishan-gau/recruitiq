import { FileText, Edit, Copy, Users, Archive, MoreVertical, Eye } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TemplateCardProps {
  template: any;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAssignments: (id: string) => void;
  onPreview: (id: string) => void;
  onArchive: (id: string) => void;
  onActivate: (id: string) => void;
}

export default function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onAssignments,
  onPreview,
  onArchive,
  onActivate,
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const getStatusColor = () => {
    switch (template.status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getLayoutLabel = () => {
    switch (template.layout_type) {
      case 'standard':
        return 'Standard';
      case 'compact':
        return 'Compact';
      case 'detailed':
        return 'Detailed';
      case 'custom':
        return 'Custom';
      default:
        return template.layout_type;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all hover:shadow-md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {template.template_name}
                </h3>
                {template.is_default && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{template.template_code}</p>
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                <button
                  onClick={() => {
                    onEdit(template.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    onDuplicate(template.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Duplicate</span>
                </button>
                {template.status !== 'active' && (
                  <button
                    onClick={() => {
                      onActivate(template.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-green-600 dark:text-green-400"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Activate</span>
                  </button>
                )}
                {template.status === 'active' && (
                  <button
                    onClick={() => {
                      onArchive(template.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-amber-600 dark:text-amber-400"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Archive</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {template.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor()}`}>
              {template.status}
            </span>
          </div>
          <div>{getLayoutLabel()} layout</div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{template.assignment_count || 0} assignments</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPreview(template.id)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => onEdit(template.id)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onAssignments(template.id)}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            <span>Assignments</span>
          </button>
        </div>
      </div>
    </div>
  );
}
