/**
 * VIP Employee types matching backend VIP Employee Tracking schema
 */

import type { AuditFields } from './common.types';
import type { EmployeeListItem } from './employee.types';

export type RestrictionLevel = 'none' | 'financial' | 'full' | 'executive';

export type AccessType = 
  | 'general' 
  | 'compensation' 
  | 'personal_info' 
  | 'performance' 
  | 'documents' 
  | 'time_off' 
  | 'benefits' 
  | 'attendance';

export interface VIPEmployee extends EmployeeListItem {
  isVip: boolean;
  isRestricted: boolean;
  restrictionLevel?: RestrictionLevel;
  restrictedBy?: string;
  restrictedAt?: string;
  restrictionReason?: string;
}

export interface VIPStatus {
  employeeId: string;
  isVip: boolean;
  isRestricted: boolean;
  restrictionLevel?: RestrictionLevel;
  restrictedAt?: string;
  restrictedBy?: string;
  restrictedByEmail?: string;
  restrictionReason?: string;
  accessControl?: VIPAccessControl;
}

export interface VIPAccessControl extends AuditFields {
  id: string;
  employeeId: string;
  allowedUserIds: string[];
  allowedRoleIds: string[];
  allowedDepartmentIds: string[];
  restrictCompensation: boolean;
  restrictPersonalInfo: boolean;
  restrictPerformance: boolean;
  restrictDocuments: boolean;
  restrictTimeOff: boolean;
  restrictBenefits: boolean;
  restrictAttendance: boolean;
}

export interface VIPAccessLog {
  id: string;
  employeeId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  accessType: AccessType;
  accessGranted: boolean;
  denialReason?: string;
  endpoint?: string;
  httpMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  accessedAt: string;
}

export interface MarkAsVIPDTO {
  isVip: boolean;
  isRestricted: boolean;
  restrictionLevel?: RestrictionLevel;
  restrictionReason?: string;
  allowedUserIds?: string[];
  allowedRoleIds?: string[];
  allowedDepartmentIds?: string[];
  restrictCompensation?: boolean;
  restrictPersonalInfo?: boolean;
  restrictPerformance?: boolean;
  restrictDocuments?: boolean;
  restrictTimeOff?: boolean;
  restrictBenefits?: boolean;
  restrictAttendance?: boolean;
}

export interface UpdateAccessControlDTO {
  allowedUserIds?: string[];
  allowedRoleIds?: string[];
  allowedDepartmentIds?: string[];
  restrictCompensation?: boolean;
  restrictPersonalInfo?: boolean;
  restrictPerformance?: boolean;
  restrictDocuments?: boolean;
  restrictTimeOff?: boolean;
  restrictBenefits?: boolean;
  restrictAttendance?: boolean;
}

export interface VIPEmployeeFilters {
  search?: string;
  isRestricted?: boolean;
  restrictionLevel?: RestrictionLevel;
  page?: number;
  limit?: number;
}

export interface VIPCount {
  totalVip: number;
  restricted: number;
  unrestricted: number;
}

export interface VIPAccessCheck {
  granted: boolean;
  reason?: string;
}

export interface VIPAuditLogFilters {
  accessType?: AccessType;
  accessGranted?: boolean;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
