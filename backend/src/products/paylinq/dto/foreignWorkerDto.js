/**
 * Foreign Worker Compliance DTOs
 * Data transformation objects for work permits, visas, and tax residency
 */

/**
 * Map work permit from database to API format
 */
export const mapWorkPermitDbToApi = (dbPermit) => {
  if (!dbPermit) return null;

  return {
    id: dbPermit.id,
    employeeId: dbPermit.employee_id,
    permitNumber: dbPermit.permit_number,
    permitType: dbPermit.permit_type,
    issuingCountry: dbPermit.issuing_country,
    issuingAuthority: dbPermit.issuing_authority,
    issueDate: dbPermit.issue_date,
    expiryDate: dbPermit.expiry_date,
    renewalDate: dbPermit.renewal_date,
    status: dbPermit.status,
    restrictions: dbPermit.restrictions,
    sponsor: dbPermit.sponsor,
    notes: dbPermit.notes,
    documentUrl: dbPermit.document_url,
    alertDaysBeforeExpiry: dbPermit.alert_days_before_expiry,
    lastAlertSentAt: dbPermit.last_alert_sent_at,
    createdAt: dbPermit.created_at,
    updatedAt: dbPermit.updated_at,
    createdBy: dbPermit.created_by,
    updatedBy: dbPermit.updated_by,
  };
};

/**
 * Map array of work permits from database to API format
 */
export const mapWorkPermitsDbToApi = (dbPermits) => {
  if (!Array.isArray(dbPermits)) return [];
  return dbPermits.map(mapWorkPermitDbToApi);
};

/**
 * Map work permit from API to database format
 */
export const mapWorkPermitApiToDb = (apiPermit) => {
  const dbPermit = {};

  if (apiPermit.employeeId !== undefined) dbPermit.employee_id = apiPermit.employeeId;
  if (apiPermit.permitNumber !== undefined) dbPermit.permit_number = apiPermit.permitNumber;
  if (apiPermit.permitType !== undefined) dbPermit.permit_type = apiPermit.permitType;
  if (apiPermit.issuingCountry !== undefined) dbPermit.issuing_country = apiPermit.issuingCountry;
  if (apiPermit.issuingAuthority !== undefined) dbPermit.issuing_authority = apiPermit.issuingAuthority;
  if (apiPermit.issueDate !== undefined) dbPermit.issue_date = apiPermit.issueDate;
  if (apiPermit.expiryDate !== undefined) dbPermit.expiry_date = apiPermit.expiryDate;
  if (apiPermit.renewalDate !== undefined) dbPermit.renewal_date = apiPermit.renewalDate;
  if (apiPermit.status !== undefined) dbPermit.status = apiPermit.status;
  if (apiPermit.restrictions !== undefined) dbPermit.restrictions = apiPermit.restrictions;
  if (apiPermit.sponsor !== undefined) dbPermit.sponsor = apiPermit.sponsor;
  if (apiPermit.notes !== undefined) dbPermit.notes = apiPermit.notes;
  if (apiPermit.documentUrl !== undefined) dbPermit.document_url = apiPermit.documentUrl;
  if (apiPermit.alertDaysBeforeExpiry !== undefined) dbPermit.alert_days_before_expiry = apiPermit.alertDaysBeforeExpiry;

  return dbPermit;
};

/**
 * Map visa status from database to API format
 */
export const mapVisaStatusDbToApi = (dbVisa) => {
  if (!dbVisa) return null;

  return {
    id: dbVisa.id,
    employeeId: dbVisa.employee_id,
    visaNumber: dbVisa.visa_number,
    visaType: dbVisa.visa_type,
    issuingCountry: dbVisa.issuing_country,
    destinationCountry: dbVisa.destination_country,
    issueDate: dbVisa.issue_date,
    expiryDate: dbVisa.expiry_date,
    entryDate: dbVisa.entry_date,
    status: dbVisa.status,
    maxStayDays: dbVisa.max_stay_days,
    entriesAllowed: dbVisa.entries_allowed,
    notes: dbVisa.notes,
    documentUrl: dbVisa.document_url,
    alertDaysBeforeExpiry: dbVisa.alert_days_before_expiry,
    lastAlertSentAt: dbVisa.last_alert_sent_at,
    createdAt: dbVisa.created_at,
    updatedAt: dbVisa.updated_at,
    createdBy: dbVisa.created_by,
    updatedBy: dbVisa.updated_by,
  };
};

/**
 * Map array of visa statuses from database to API format
 */
export const mapVisaStatusesDbToApi = (dbVisas) => {
  if (!Array.isArray(dbVisas)) return [];
  return dbVisas.map(mapVisaStatusDbToApi);
};

/**
 * Map visa status from API to database format
 */
export const mapVisaStatusApiToDb = (apiVisa) => {
  const dbVisa = {};

  if (apiVisa.employeeId !== undefined) dbVisa.employee_id = apiVisa.employeeId;
  if (apiVisa.visaNumber !== undefined) dbVisa.visa_number = apiVisa.visaNumber;
  if (apiVisa.visaType !== undefined) dbVisa.visa_type = apiVisa.visaType;
  if (apiVisa.issuingCountry !== undefined) dbVisa.issuing_country = apiVisa.issuingCountry;
  if (apiVisa.destinationCountry !== undefined) dbVisa.destination_country = apiVisa.destinationCountry;
  if (apiVisa.issueDate !== undefined) dbVisa.issue_date = apiVisa.issueDate;
  if (apiVisa.expiryDate !== undefined) dbVisa.expiry_date = apiVisa.expiryDate;
  if (apiVisa.entryDate !== undefined) dbVisa.entry_date = apiVisa.entryDate;
  if (apiVisa.status !== undefined) dbVisa.status = apiVisa.status;
  if (apiVisa.maxStayDays !== undefined) dbVisa.max_stay_days = apiVisa.maxStayDays;
  if (apiVisa.entriesAllowed !== undefined) dbVisa.entries_allowed = apiVisa.entriesAllowed;
  if (apiVisa.notes !== undefined) dbVisa.notes = apiVisa.notes;
  if (apiVisa.documentUrl !== undefined) dbVisa.document_url = apiVisa.documentUrl;
  if (apiVisa.alertDaysBeforeExpiry !== undefined) dbVisa.alert_days_before_expiry = apiVisa.alertDaysBeforeExpiry;

  return dbVisa;
};

/**
 * Map tax residency from database to API format
 */
export const mapTaxResidencyDbToApi = (dbResidency) => {
  if (!dbResidency) return null;

  return {
    id: dbResidency.id,
    employeeId: dbResidency.employee_id,
    country: dbResidency.country,
    taxIdentificationNumber: dbResidency.tax_identification_number,
    residencyType: dbResidency.residency_type,
    effectiveFrom: dbResidency.effective_from,
    effectiveTo: dbResidency.effective_to,
    isCurrent: dbResidency.is_current,
    treatyCountry: dbResidency.treaty_country,
    treatyArticle: dbResidency.treaty_article,
    withholdingRate: dbResidency.withholding_rate,
    daysInCountry: dbResidency.days_in_country,
    permanentEstablishment: dbResidency.permanent_establishment,
    centerOfVitalInterests: dbResidency.center_of_vital_interests,
    notes: dbResidency.notes,
    certificateUrl: dbResidency.certificate_url,
    createdAt: dbResidency.created_at,
    updatedAt: dbResidency.updated_at,
    createdBy: dbResidency.created_by,
    updatedBy: dbResidency.updated_by,
  };
};

/**
 * Map array of tax residencies from database to API format
 */
export const mapTaxResidenciesDbToApi = (dbResidencies) => {
  if (!Array.isArray(dbResidencies)) return [];
  return dbResidencies.map(mapTaxResidencyDbToApi);
};

/**
 * Map tax residency from API to database format
 */
export const mapTaxResidencyApiToDb = (apiResidency) => {
  const dbResidency = {};

  if (apiResidency.employeeId !== undefined) dbResidency.employee_id = apiResidency.employeeId;
  if (apiResidency.country !== undefined) dbResidency.country = apiResidency.country;
  if (apiResidency.taxIdentificationNumber !== undefined) dbResidency.tax_identification_number = apiResidency.taxIdentificationNumber;
  if (apiResidency.residencyType !== undefined) dbResidency.residency_type = apiResidency.residencyType;
  if (apiResidency.effectiveFrom !== undefined) dbResidency.effective_from = apiResidency.effectiveFrom;
  if (apiResidency.effectiveTo !== undefined) dbResidency.effective_to = apiResidency.effectiveTo;
  if (apiResidency.isCurrent !== undefined) dbResidency.is_current = apiResidency.isCurrent;
  if (apiResidency.treatyCountry !== undefined) dbResidency.treaty_country = apiResidency.treatyCountry;
  if (apiResidency.treatyArticle !== undefined) dbResidency.treaty_article = apiResidency.treatyArticle;
  if (apiResidency.withholdingRate !== undefined) dbResidency.withholding_rate = apiResidency.withholdingRate;
  if (apiResidency.daysInCountry !== undefined) dbResidency.days_in_country = apiResidency.daysInCountry;
  if (apiResidency.permanentEstablishment !== undefined) dbResidency.permanent_establishment = apiResidency.permanentEstablishment;
  if (apiResidency.centerOfVitalInterests !== undefined) dbResidency.center_of_vital_interests = apiResidency.centerOfVitalInterests;
  if (apiResidency.notes !== undefined) dbResidency.notes = apiResidency.notes;
  if (apiResidency.certificateUrl !== undefined) dbResidency.certificate_url = apiResidency.certificateUrl;

  return dbResidency;
};

/**
 * Map compliance audit log from database to API format
 */
export const mapComplianceAuditLogDbToApi = (dbLog) => {
  if (!dbLog) return null;

  return {
    id: dbLog.id,
    employeeId: dbLog.employee_id,
    eventType: dbLog.event_type,
    eventCategory: dbLog.event_category,
    severity: dbLog.severity,
    description: dbLog.description,
    eventData: dbLog.event_data,
    workPermitId: dbLog.work_permit_id,
    visaStatusId: dbLog.visa_status_id,
    taxResidencyId: dbLog.tax_residency_id,
    actionTaken: dbLog.action_taken,
    actionTakenBy: dbLog.action_taken_by,
    actionTakenAt: dbLog.action_taken_at,
    status: dbLog.status,
    resolvedAt: dbLog.resolved_at,
    resolvedBy: dbLog.resolved_by,
    resolutionNotes: dbLog.resolution_notes,
    createdAt: dbLog.created_at,
    createdBy: dbLog.created_by,
  };
};

/**
 * Map array of compliance audit logs from database to API format
 */
export const mapComplianceAuditLogsDbToApi = (dbLogs) => {
  if (!Array.isArray(dbLogs)) return [];
  return dbLogs.map(mapComplianceAuditLogDbToApi);
};
