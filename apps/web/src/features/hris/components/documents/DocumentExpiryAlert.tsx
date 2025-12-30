/**
 * Document Expiry Alert Component
 * Displays individual document expiry warnings with urgency indicators
 */

import {
  AlertTriangle,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import type { Document } from '@/types/documents.types';

interface DocumentExpiryAlertProps {
  document: Document;
  showActions?: boolean;
}

export default function DocumentExpiryAlert({
  document,
  showActions = true,
}: DocumentExpiryAlertProps) {
  const urgency = useMemo(() => {
    if (!document.expiryDate) return null;

    const today = new Date();
    const expiryDate = new Date(document.expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        level: 'expired' as const,
        days: Math.abs(daysUntilExpiry),
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700',
        iconColor: 'text-red-600',
        badgeColor: 'bg-red-100 text-red-700',
        message: `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`,
      };
    }

    if (daysUntilExpiry <= 7) {
      return {
        level: 'critical' as const,
        days: daysUntilExpiry,
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700',
        iconColor: 'text-red-600',
        badgeColor: 'bg-red-100 text-red-700',
        message: `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        level: 'warning' as const,
        days: daysUntilExpiry,
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-700',
        iconColor: 'text-orange-600',
        badgeColor: 'bg-orange-100 text-orange-700',
        message: `Expires in ${daysUntilExpiry} days`,
      };
    }

    return {
      level: 'attention' as const,
      days: daysUntilExpiry,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-600',
      badgeColor: 'bg-yellow-100 text-yellow-700',
      message: `Expires in ${daysUntilExpiry} days`,
    };
  }, [document.expiryDate]);

  if (!urgency) return null;

  const Icon = urgency.level === 'expired' || urgency.level === 'critical'
    ? AlertTriangle
    : urgency.level === 'warning'
    ? AlertCircle
    : Clock;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border ${urgency.bgColor} ${urgency.borderColor} 
                 transition-all hover:shadow-md`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${urgency.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to={`/documents/${document.id}`}
            className={`font-medium ${urgency.textColor} hover:underline truncate`}
          >
            {document.name}
          </Link>
          <span className={`text-xs px-2 py-1 rounded-full ${urgency.badgeColor} font-medium`}>
            {urgency.level.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span className="capitalize">{document.category}</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{urgency.message}</span>
          </div>
          {document.employee && (
            <>
              <span>·</span>
              <span className="truncate">
                {document.employee.firstName} {document.employee.lastName}
              </span>
            </>
          )}
        </div>

        {/* Additional Info */}
        {document.requiresSignature && !document.signedAt && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3" />
            <span>Signature required</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex-shrink-0">
          <Link
            to={`/documents/${document.id}`}
            className={`p-2 rounded-lg hover:bg-white transition-colors ${urgency.textColor}`}
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  );
}

// Export badge-only version for compact displays
export function DocumentExpiryBadge({ document }: { document: Document }) {
  const urgency = useMemo(() => {
    if (!document.expiryDate) return null;

    const today = new Date();
    const expiryDate = new Date(document.expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        level: 'expired',
        label: 'Expired',
        className: 'bg-red-100 text-red-700 border-red-300',
      };
    }

    if (daysUntilExpiry <= 7) {
      return {
        level: 'critical',
        label: `${daysUntilExpiry}d`,
        className: 'bg-red-100 text-red-700 border-red-300',
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        level: 'warning',
        label: `${daysUntilExpiry}d`,
        className: 'bg-orange-100 text-orange-700 border-orange-300',
      };
    }

    if (daysUntilExpiry <= 90) {
      return {
        level: 'attention',
        label: `${daysUntilExpiry}d`,
        className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      };
    }

    return null;
  }, [document.expiryDate]);

  if (!urgency) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                 rounded-full border ${urgency.className}`}
      title={`Expires: ${new Date(document.expiryDate!).toLocaleDateString()}`}
    >
      <AlertTriangle className="w-3 h-3" />
      {urgency.label}
    </span>
  );
}
