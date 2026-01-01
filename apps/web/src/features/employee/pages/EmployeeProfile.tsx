import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Bell,
  Shield,
  ChevronRight,
  Camera
} from 'lucide-react';

import { useAuth } from '@recruitiq/auth';

/**
 * Employee Profile Page
 * Mobile-optimized profile and settings management
 * 
 * Features:
 * - Personal information viewing/editing
 * - Emergency contacts
 * - Profile photo upload
 * - Notification preferences
 * - Account settings
 * 
 * From PWA Proposal Phase 2: Profile & Settings Module
 */
export default function EmployeeProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header with Profile Photo */}
      <div className="bg-primary text-primary-foreground p-6 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">My Profile</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-1.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 
                     rounded-lg text-sm font-medium touch-manipulation"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Profile Photo - Overlapping header */}
      <div className="-mt-16 px-6 mb-6">
        <div className="relative w-32 h-32 mx-auto">
          <div className="w-full h-full rounded-full bg-card border-4 border-background 
                        flex items-center justify-center overflow-hidden shadow-lg">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-16 w-16 text-muted-foreground" />
            )}
          </div>
          {isEditing && (
            <button
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground 
                       rounded-full flex items-center justify-center shadow-lg touch-manipulation
                       hover:bg-primary/90"
              aria-label="Change photo"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold text-center mt-3">
          {user?.name || 'Employee Name'}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {user?.email || 'employee@example.com'}
        </p>
      </div>

      {/* Content Sections */}
      <div className="px-4 space-y-6">
        {/* Personal Information */}
        <Section title="Personal Information" icon={User}>
          <InfoField 
            icon={Mail} 
            label="Email" 
            value={user?.email || 'Not set'}
            editable={isEditing}
          />
          <InfoField 
            icon={Phone} 
            label="Phone" 
            value="+1 (555) 123-4567"
            editable={isEditing}
          />
          <InfoField 
            icon={MapPin} 
            label="Address" 
            value="123 Main St, City, State 12345"
            editable={isEditing}
          />
          <InfoField 
            icon={Calendar} 
            label="Date of Birth" 
            value="January 1, 1990"
            editable={isEditing}
          />
        </Section>

        {/* Emergency Contacts */}
        <Section title="Emergency Contacts" icon={Users}>
          <EmergencyContactCard
            name="Jane Doe"
            relationship="Spouse"
            phone="+1 (555) 987-6543"
            editable={isEditing}
          />
          <button
            className="w-full py-3 border-2 border-dashed border-border rounded-lg
                     text-sm text-muted-foreground hover:border-primary hover:text-primary
                     touch-manipulation transition-colors"
          >
            + Add Emergency Contact
          </button>
        </Section>

        {/* Settings */}
        <Section title="Settings" icon={Shield}>
          <SettingsLink
            icon={Bell}
            label="Notifications"
            description="Manage push notifications"
            to="/employee/settings/notifications"
          />
          <SettingsLink
            icon={Shield}
            label="Security"
            description="Password and biometric auth"
            to="/employee/settings/security"
          />
        </Section>

        {/* Logout Button */}
        <button
          className="w-full py-3 bg-red-500/10 text-red-600 rounded-lg font-medium
                   hover:bg-red-500/20 touch-manipulation transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

/**
 * Section Component
 */
interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Info Field Component
 */
interface InfoFieldProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  editable?: boolean;
}

function InfoField({ icon: Icon, label, value, editable = false }: InfoFieldProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {editable ? (
          <input
            type="text"
            defaultValue={value}
            className="w-full px-2 py-1 bg-muted border border-border rounded-md
                     focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        ) : (
          <p className="font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Emergency Contact Card
 */
interface EmergencyContactCardProps {
  name: string;
  relationship: string;
  phone: string;
  editable?: boolean;
}

function EmergencyContactCard({ name, relationship, phone, editable = false }: EmergencyContactCardProps) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{relationship}</p>
        </div>
        {editable && (
          <button className="text-sm text-primary hover:underline touch-manipulation">
            Edit
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span>{phone}</span>
      </div>
    </div>
  );
}

/**
 * Settings Link Component
 */
interface SettingsLinkProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  to: string;
}

function SettingsLink({ icon: Icon, label, description, to }: SettingsLinkProps) {
  return (
    <button
      onClick={() => {/* Navigate to settings page */}}
      className="w-full flex items-center gap-3 py-2 touch-manipulation 
               hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
