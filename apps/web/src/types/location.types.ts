/**
 * Location types matching backend hris.location schema
 */

import type { AuditFields } from './common.types';

// Re-export ApiError for backward compatibility
export type { ApiError } from './api.types';

export type LocationType = 'headquarters' | 'branch' | 'remote' | 'warehouse' | 'store';

export interface Location extends AuditFields {
  id: string;
  organizationId: string;
  locationCode: string;
  locationName: string;
  locationType?: LocationType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface CreateLocationDTO {
  locationCode: string;
  locationName: string;
  locationType?: LocationType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateLocationDTO extends Partial<CreateLocationDTO> {}

export interface LocationFilters {
  search?: string;
  locationType?: LocationType;
  isActive?: boolean;
  country?: string;
}
