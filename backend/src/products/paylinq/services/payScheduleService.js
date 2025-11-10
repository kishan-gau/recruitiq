/**
 * Pay Schedule Service
 * Business logic for managing pay schedules
 */

/**
 * Pay frequency types
 */
export const PAY_FREQUENCIES = {
  WEEKLY: 'weekly',
  BI_WEEKLY: 'bi_weekly',
  SEMI_MONTHLY: 'semi_monthly',
  MONTHLY: 'monthly'
};

/**
 * Create a new pay schedule
 */
export async function createPaySchedule(scheduleData, organizationId, userId) {
  // Validate frequency
  if (!Object.values(PAY_FREQUENCIES).includes(scheduleData.frequency)) {
    throw new Error('Invalid pay frequency');
  }

  // Implementation would go here
  return {
    id: '123',
    ...scheduleData,
    organization_id: organizationId,
    created_by: userId
  };
}

/**
 * Get pay schedule by ID
 */
export async function getPayScheduleById(scheduleId, organizationId) {
  // Implementation would go here
  return null;
}

/**
 * Get all pay schedules for organization
 */
export async function getPaySchedules(organizationId) {
  // Implementation would go here
  return [];
}

/**
 * Calculate next pay date
 */
export function calculateNextPayDate(lastPayDate, frequency) {
  const date = new Date(lastPayDate);
  
  switch (frequency) {
    case PAY_FREQUENCIES.WEEKLY:
      date.setDate(date.getDate() + 7);
      break;
    case PAY_FREQUENCIES.BI_WEEKLY:
      date.setDate(date.getDate() + 14);
      break;
    case PAY_FREQUENCIES.SEMI_MONTHLY:
      date.setDate(date.getDate() + 15);
      break;
    case PAY_FREQUENCIES.MONTHLY:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date;
}

export default {
  createPaySchedule,
  getPayScheduleById,
  getPaySchedules,
  calculateNextPayDate,
  PAY_FREQUENCIES
};
