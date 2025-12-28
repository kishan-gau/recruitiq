/**
 * Template-Based Time Slot Generator
 * 
 * Generates dynamic time slots based on active shift templates,
 * following industry standards for workforce management systems.
 * 
 * Industry Standards Implemented:
 * - 1-hour increments (configurable)
 * - Dynamic time range based on actual template coverage
 * - Organization-specific business hours
 * - Buffer time before/after templates for flexibility
 */

interface ShiftTemplate {
  id: string;
  startTime: string; // "06:00"
  endTime: string;   // "14:00"
  isActive: boolean;
  templateName: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
  timestamp: string; // "06:00"
}

interface TimeSlotGeneratorConfig {
  /**
   * Increment in minutes (default: 60 for 1-hour slots)
   */
  intervalMinutes: number;
  
  /**
   * Buffer time before earliest template (in minutes)
   */
  preBuffer: number;
  
  /**
   * Buffer time after latest template (in minutes) 
   */
  postBuffer: number;
  
  /**
   * Minimum business hours if no templates exist
   */
  fallbackStart: string;
  fallbackEnd: string;
  
  /**
   * Maximum time range (safety limit)
   */
  maxRangeHours: number;
}

/**
 * Default configuration following industry standards
 */
const DEFAULT_CONFIG: TimeSlotGeneratorConfig = {
  intervalMinutes: 60,     // 1-hour intervals for better view
  preBuffer: 30,          // 30min buffer before earliest template
  postBuffer: 30,         // 30min buffer after latest template
  fallbackStart: '06:00', // Default business hours start
  fallbackEnd: '18:00',   // Default business hours end
  maxRangeHours: 20       // Safety: max 20-hour range
};

/**
 * Converts time string to minutes since midnight
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats time for display (12-hour format)
 */
function formatTimeDisplay(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`;
  return `${displayHours}${displayMinutes} ${period}`;
}

/**
 * Determines time range from active shift templates
 */
function calculateTimeRange(templates: ShiftTemplate[], config: TimeSlotGeneratorConfig) {
  // Defensive programming: ensure templates is an array
  if (!Array.isArray(templates)) {
    console.warn('calculateTimeRange: templates parameter is not an array, using fallback', templates);
    return {
      startMinutes: timeToMinutes(config.fallbackStart),
      endMinutes: timeToMinutes(config.fallbackEnd),
      source: 'fallback' as const
    };
  }
  
  const activeTemplates = templates.filter(t => t.isActive);
  
  if (activeTemplates.length === 0) {
    // No active templates - use fallback business hours
    return {
      startMinutes: timeToMinutes(config.fallbackStart),
      endMinutes: timeToMinutes(config.fallbackEnd),
      source: 'fallback' as const
    };
  }

  // Find actual coverage from templates
  const templateTimes = activeTemplates.map(template => ({
    start: timeToMinutes(template.startTime),
    end: timeToMinutes(template.endTime),
    name: template.templateName
  }));

  const earliestStart = Math.min(...templateTimes.map(t => t.start));
  const latestEnd = Math.max(...templateTimes.map(t => t.end));

  // Add buffer time
  let startMinutes = Math.max(0, earliestStart - config.preBuffer);
  let endMinutes = Math.min(24 * 60, latestEnd + config.postBuffer);

  // Safety check: prevent excessive range
  const rangeHours = (endMinutes - startMinutes) / 60;
  if (rangeHours > config.maxRangeHours) {
    // Trim to max range, centered on templates
    const centerMinutes = (earliestStart + latestEnd) / 2;
    const halfRange = (config.maxRangeHours * 60) / 2;
    startMinutes = Math.max(0, centerMinutes - halfRange);
    endMinutes = Math.min(24 * 60, centerMinutes + halfRange);
  }

  return {
    startMinutes,
    endMinutes,
    source: 'templates' as const,
    templateCount: activeTemplates.length,
    templateRange: {
      earliest: minutesToTime(earliestStart),
      latest: minutesToTime(latestEnd)
    }
  };
}

/**
 * Generates time slots based on active shift templates
 * 
 * @param templates - Active shift templates
 * @param config - Configuration options
 * @returns Array of time slots covering template range
 */
export function generateTimeSlots(
  templates: ShiftTemplate[],
  config: Partial<TimeSlotGeneratorConfig> = {}
): {
  timeSlots: TimeSlot[];
  metadata: {
    source: 'templates' | 'fallback';
    range: string;
    intervalMinutes: number;
    templateCount?: number;
    templateRange?: {
      earliest: string;
      latest: string;
    };
  };
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Determine time range from templates
  const { startMinutes, endMinutes, source, templateCount, templateRange } = 
    calculateTimeRange(templates, finalConfig);

  const timeSlots: TimeSlot[] = [];
  
  // Generate slots at specified intervals
  for (let minutes = startMinutes; minutes < endMinutes; minutes += finalConfig.intervalMinutes) {
    const timeString = minutesToTime(minutes);
    const [hour, minute] = timeString.split(':').map(Number);
    
    timeSlots.push({
      hour,
      minute,
      label: formatTimeDisplay(timeString),
      timestamp: timeString
    });
  }

  return {
    timeSlots,
    metadata: {
      source,
      range: `${minutesToTime(startMinutes)} - ${minutesToTime(endMinutes)}`,
      intervalMinutes: finalConfig.intervalMinutes,
      templateCount,
      templateRange
    }
  };
}

/**
 * React Hook for template-based time slots
 */
export function useTemplateBasedTimeSlots({
  templates,
  config,
  selectedTemplateId
}: {
  templates: ShiftTemplate[] | undefined;
  config?: Partial<TimeSlotGeneratorConfig>;
  selectedTemplateId?: string;
}) {
  // If templates are not provided or not an array, use fallback
  if (!templates || !Array.isArray(templates)) {
    console.warn('useTemplateBasedTimeSlots: Invalid templates parameter, using fallback', templates);
    return generateTimeSlots([], config);
  }

  // Filter templates based on selection
  let filteredTemplates = templates;
  
  // If a specific template is selected, filter to just that template
  if (selectedTemplateId) {
    const selectedTemplate = templates.find(template => template.id === selectedTemplateId);
    if (selectedTemplate) {
      filteredTemplates = [selectedTemplate];
      console.log('Filtered to selected template:', {
        templateId: selectedTemplateId,
        templateName: selectedTemplate.templateName,
        startTime: selectedTemplate.startTime,
        endTime: selectedTemplate.endTime
      });
    } else {
      console.warn('Selected template not found:', selectedTemplateId);
    }
  } else {
    // Timeline view (no specific template selected) - use 24-hour range
    const fullDayConfig = {
      ...config,
      fallbackStart: '00:00',
      fallbackEnd: '23:59',
      maxRangeHours: 24,
      preBuffer: 0,
      postBuffer: 60 // Add 1 hour to include 11 PM slot
    };
    return generateTimeSlots(filteredTemplates, fullDayConfig);
  }

  return generateTimeSlots(filteredTemplates, config);
}

/**
 * Utility to validate time slot coverage
 */
export function validateTemplateTimeCoverage(
  templates: ShiftTemplate[]
): {
  hasGaps: boolean;
  gaps: Array<{ start: string; end: string; durationMinutes: number }>;
  coverage: Array<{ start: string; end: string; templates: string[] }>;
} {
  const activeTemplates = templates
    .filter(t => t.isActive)
    .map(t => ({
      start: timeToMinutes(t.startTime),
      end: timeToMinutes(t.endTime),
      name: t.templateName
    }))
    .sort((a, b) => a.start - b.start);

  const gaps: Array<{ start: string; end: string; durationMinutes: number }> = [];
  const coverage: Array<{ start: string; end: string; templates: string[] }> = [];

  if (activeTemplates.length === 0) {
    return { hasGaps: false, gaps, coverage };
  }

  // Analyze coverage and gaps
  for (let i = 0; i < activeTemplates.length - 1; i++) {
    const current = activeTemplates[i];
    const next = activeTemplates[i + 1];
    
    // Add current template to coverage
    coverage.push({
      start: minutesToTime(current.start),
      end: minutesToTime(current.end),
      templates: [current.name]
    });

    // Check for gap between current and next
    if (current.end < next.start) {
      gaps.push({
        start: minutesToTime(current.end),
        end: minutesToTime(next.start),
        durationMinutes: next.start - current.end
      });
    }
  }

  // Add last template
  const lastTemplate = activeTemplates[activeTemplates.length - 1];
  coverage.push({
    start: minutesToTime(lastTemplate.start),
    end: minutesToTime(lastTemplate.end),
    templates: [lastTemplate.name]
  });

  return {
    hasGaps: gaps.length > 0,
    gaps,
    coverage
  };
}

/**
 * Quick generator for common scenarios
 */
export const TimeSlotPresets = {
  /**
   * Standard business hours (9 AM - 5 PM, 1-hour intervals)
   */
  businessHours: () => generateTimeSlots([], {
    fallbackStart: '09:00',
    fallbackEnd: '17:00',
    intervalMinutes: 60
  }),

  /**
   * Extended hours (6 AM - 10 PM, 1-hour intervals)
   */
  extendedHours: () => generateTimeSlots([], {
    fallbackStart: '06:00', 
    fallbackEnd: '22:00',
    intervalMinutes: 60
  }),

  /**
   * 24/7 operations (hourly intervals for readability)
   */
  fullDay: () => generateTimeSlots([], {
    fallbackStart: '00:00',
    fallbackEnd: '23:59',
    intervalMinutes: 60
  }),

  /**
   * Half-hour intervals (good for longer shifts)
   */
  halfHour: (templates: ShiftTemplate[]) => generateTimeSlots(templates, {
    intervalMinutes: 30
  })
};
