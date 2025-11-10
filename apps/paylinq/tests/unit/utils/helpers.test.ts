import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  daysBetween,
  formatTime,
  calculateHours,
  getStatusColor,
} from '@/utils/helpers'

describe('Helpers Utilities', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts with SRD symbol by default', () => {
      expect(formatCurrency(1000)).toBe('SRD 1,000.00')
      expect(formatCurrency(500.5)).toBe('SRD 500.50')
    })

    it('formats amounts without symbol when showSymbol is false', () => {
      expect(formatCurrency(1000, false)).toBe('1,000.00')
      expect(formatCurrency(250.75, false)).toBe('250.75')
    })

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('SRD 0.00')
      expect(formatCurrency(0, false)).toBe('0.00')
    })

    it('formats negative amounts', () => {
      expect(formatCurrency(-500)).toBe('SRD -500.00')
      expect(formatCurrency(-1234.56, false)).toBe('-1,234.56')
    })

    it('formats large amounts with thousand separators', () => {
      expect(formatCurrency(1000000)).toBe('SRD 1,000,000.00')
      expect(formatCurrency(12345678.90)).toBe('SRD 12,345,678.90')
    })

    it('always shows 2 decimal places', () => {
      expect(formatCurrency(100)).toBe('SRD 100.00')
      expect(formatCurrency(99.9)).toBe('SRD 99.90')
      expect(formatCurrency(1.1)).toBe('SRD 1.10')
    })
  })

  describe('formatDate', () => {
    it('formats valid date strings', () => {
      const result = formatDate('2024-11-06')
      expect(result).toContain('2024')
      expect(result).toContain('Nov')
    })

    it('formats ISO date strings', () => {
      const result = formatDate('2024-01-15T10:30:00Z')
      expect(result).toContain('2024')
      expect(result).toContain('Jan')
    })

    it('handles different month names', () => {
      expect(formatDate('2024-12-25')).toContain('Dec')
      expect(formatDate('2024-06-15')).toContain('Jun')
    })
  })

  describe('formatDateRange', () => {
    it('formats date range with two dates', () => {
      const result = formatDateRange('2024-11-01', '2024-11-30')
      expect(result).toContain('-')
      expect(result).toMatch(/Nov/)
    })

    it('handles ranges within same month', () => {
      const result = formatDateRange('2024-11-01', '2024-11-15')
      expect(result).toContain('Nov')
    })

    it('handles ranges across different months', () => {
      const result = formatDateRange('2024-10-25', '2024-11-05')
      expect(result).toMatch(/Oct.*Nov/)
    })
  })

  describe('daysBetween', () => {
    it('calculates days between two dates', () => {
      expect(daysBetween('2024-11-01', '2024-11-10')).toBe(9)
      expect(daysBetween('2024-11-01', '2024-11-02')).toBe(1)
    })

    it('handles same dates', () => {
      expect(daysBetween('2024-11-06', '2024-11-06')).toBe(0)
    })

    it('handles reversed date order (absolute value)', () => {
      expect(daysBetween('2024-11-10', '2024-11-01')).toBe(9)
    })

    it('calculates days across months', () => {
      expect(daysBetween('2024-10-25', '2024-11-05')).toBe(11)
    })

    it('calculates days across years', () => {
      expect(daysBetween('2023-12-30', '2024-01-05')).toBe(6)
    })
  })

  describe('formatTime', () => {
    it('returns time string as-is when provided', () => {
      expect(formatTime('09:30')).toBe('09:30')
      expect(formatTime('14:45')).toBe('14:45')
      expect(formatTime('00:00')).toBe('00:00')
    })

    it('returns placeholder when time is undefined', () => {
      expect(formatTime(undefined)).toBe('--:--')
    })

    it('returns placeholder when time is empty string', () => {
      expect(formatTime('')).toBe('--:--')
    })
  })

  describe('calculateHours', () => {
    it('calculates hours between times without break', () => {
      expect(calculateHours('09:00', '17:00')).toBe(8)
      expect(calculateHours('08:30', '12:30')).toBe(4)
    })

    it('calculates hours with break time', () => {
      expect(calculateHours('09:00', '17:00', 1)).toBe(7) // 8 hours - 1 hour break
      expect(calculateHours('08:00', '17:00', 0.5)).toBe(8.5)
    })

    it('handles fractional hours correctly', () => {
      expect(calculateHours('09:00', '09:30')).toBe(0.5)
      expect(calculateHours('10:15', '11:45')).toBe(1.5)
    })

    it('handles times across noon', () => {
      expect(calculateHours('09:00', '13:00')).toBe(4)
      expect(calculateHours('11:30', '14:30')).toBe(3)
    })

    it('returns 0 for negative duration (end before start)', () => {
      // Function uses Math.max(0, ...) to prevent negative values
      expect(calculateHours('17:00', '09:00')).toBe(0)
    })

    it('handles break time longer than work time', () => {
      // Function uses Math.max(0, ...) to prevent negative values
      const result = calculateHours('09:00', '10:00', 2)
      expect(result).toBe(0)
    })

    it('calculates with minutes precision', () => {
      expect(calculateHours('09:15', '17:45')).toBe(8.5)
      expect(calculateHours('08:30', '12:15')).toBe(3.75)
    })
  })

  describe('getStatusColor', () => {
    describe('Worker Status Colors', () => {
      it('returns green for active status', () => {
        const color = getStatusColor('active')
        expect(color).toContain('green')
        expect(color).toContain('bg-green-100')
      })

      it('returns gray for inactive status', () => {
        const color = getStatusColor('inactive')
        expect(color).toContain('gray')
      })

      it('returns yellow for suspended status', () => {
        const color = getStatusColor('suspended')
        expect(color).toContain('yellow')
      })

      it('returns red for terminated status', () => {
        const color = getStatusColor('terminated')
        expect(color).toContain('red')
      })
    })

    describe('Approval Status Colors', () => {
      it('returns yellow for pending status', () => {
        const color = getStatusColor('pending')
        expect(color).toContain('yellow')
      })

      it('returns green for approved status', () => {
        const color = getStatusColor('approved')
        expect(color).toContain('green')
      })

      it('returns red for rejected status', () => {
        const color = getStatusColor('rejected')
        expect(color).toContain('red')
      })
    })

    describe('Dark Mode Support', () => {
      it('includes dark mode classes', () => {
        expect(getStatusColor('active')).toContain('dark:')
        expect(getStatusColor('pending')).toContain('dark:')
      })
    })

    describe('Unknown Status', () => {
      it('handles unknown status gracefully', () => {
        const color = getStatusColor('unknown-status')
        expect(color).toBeDefined()
      })

      it('handles undefined status', () => {
        const color = getStatusColor(undefined)
        expect(color).toBeDefined()
        expect(color).toContain('gray') // Should default to inactive
      })

      it('handles null status', () => {
        const color = getStatusColor(null)
        expect(color).toBeDefined()
        expect(color).toContain('gray') // Should default to inactive
      })

      it('handles empty string status', () => {
        const color = getStatusColor('')
        expect(color).toBeDefined()
        expect(color).toContain('gray') // Should default to inactive
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles very large currency amounts', () => {
      expect(formatCurrency(999999999.99)).toContain('999,999,999.99')
    })

    it('handles very small currency amounts', () => {
      expect(formatCurrency(0.01)).toBe('SRD 0.01')
    })

    it('handles dates far in the past', () => {
      const result = formatDate('1990-06-15')
      expect(result).toContain('1990')
    })

    it('handles dates far in the future', () => {
      const result = formatDate('2099-12-31')
      expect(result).toContain('2099')
    })

    it('calculates hours for 24-hour shifts', () => {
      expect(calculateHours('00:00', '23:59')).toBeCloseTo(23.98, 1)
    })

    it('handles midnight times', () => {
      expect(calculateHours('00:00', '08:00')).toBe(8)
    })
  })

  describe('Type Safety', () => {
    it('handles currency NaN', () => {
      const result = formatCurrency(NaN)
      expect(result).toBeDefined()
    })

    it('handles Infinity currency', () => {
      const result = formatCurrency(Infinity)
      expect(result).toBeDefined()
    })
  })

  describe('Real-World Scenarios', () => {
    it('formats typical monthly salary', () => {
      expect(formatCurrency(5000)).toBe('SRD 5,000.00')
    })

    it('calculates standard work day', () => {
      // 9 AM to 5 PM with 1 hour lunch
      expect(calculateHours('09:00', '17:00', 1)).toBe(7)
    })

    it('calculates part-time hours', () => {
      // 4-hour shift
      expect(calculateHours('10:00', '14:00')).toBe(4)
    })

    it('formats payroll period', () => {
      const result = formatDateRange('2024-11-01', '2024-11-15')
      expect(result).toContain('Nov')
    })

    it('calculates days in pay period', () => {
      // Bi-weekly period
      expect(daysBetween('2024-11-01', '2024-11-14')).toBe(13)
    })
  })
})
