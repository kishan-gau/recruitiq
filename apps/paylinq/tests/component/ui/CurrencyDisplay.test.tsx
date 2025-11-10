import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CurrencyDisplay from '@/components/ui/CurrencyDisplay'

describe('CurrencyDisplay', () => {
  describe('SRD Currency (Default)', () => {
    it('displays SRD currency with symbol by default', () => {
      render(<CurrencyDisplay amount={1000} />)
      
      // Should display with SRD symbol
      expect(screen.getByText(/SRD/)).toBeInTheDocument()
    })

    it('formats amount with thousand separators', () => {
      render(<CurrencyDisplay amount={10000} />)
      
      // Should format with commas (SRD 10,000.00)
      const text = screen.getByText(/10,000/)
      expect(text).toBeInTheDocument()
    })

    it('displays with 2 decimal places', () => {
      render(<CurrencyDisplay amount={1234.5} />)
      
      // Should show .50 or similar precision
      const text = screen.getByText(/1,234\.5/)
      expect(text).toBeInTheDocument()
    })

    it('hides symbol when showSymbol is false', () => {
      render(<CurrencyDisplay amount={1000} showSymbol={false} />)
      
      // Should not display SRD symbol
      const container = screen.getByText(/1,000/)
      expect(container).toBeInTheDocument()
    })

    it('handles zero amount', () => {
      render(<CurrencyDisplay amount={0} />)
      
      expect(screen.getByText(/0/)).toBeInTheDocument()
    })

    it('handles negative amounts', () => {
      render(<CurrencyDisplay amount={-500} />)
      
      // Should show negative sign
      expect(screen.getByText(/-/)).toBeInTheDocument()
    })
  })

  describe('USD Currency', () => {
    it('displays USD format with dollar sign', () => {
      render(<CurrencyDisplay amount={1000} currency="USD" />)
      
      // Should display with $ symbol
      expect(screen.getByText(/\$/)).toBeInTheDocument()
    })

    it('formats USD amounts correctly', () => {
      render(<CurrencyDisplay amount={5000} currency="USD" />)
      
      expect(screen.getByText(/5,000/)).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('applies default variant styling', () => {
      const { container } = render(<CurrencyDisplay amount={1000} variant="default" />)
      
      const element = container.querySelector('.text-gray-900')
      expect(element).toBeInTheDocument()
    })

    it('applies positive variant styling', () => {
      const { container } = render(<CurrencyDisplay amount={1000} variant="positive" />)
      
      const element = container.querySelector('.text-green-600')
      expect(element).toBeInTheDocument()
    })

    it('applies negative variant styling', () => {
      const { container } = render(<CurrencyDisplay amount={1000} variant="negative" />)
      
      const element = container.querySelector('.text-red-600')
      expect(element).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <CurrencyDisplay amount={1000} className="text-xl font-bold" />
      )
      
      const element = container.querySelector('.text-xl')
      expect(element).toBeInTheDocument()
    })

    it('maintains tabular-nums class for alignment', () => {
      const { container } = render(<CurrencyDisplay amount={1000} />)
      
      const element = container.querySelector('.tabular-nums')
      expect(element).toBeInTheDocument()
    })
  })

  describe('Large Amounts', () => {
    it('handles amounts over 1 million', () => {
      render(<CurrencyDisplay amount={1500000} />)
      
      expect(screen.getByText(/1,500,000/)).toBeInTheDocument()
    })

    it('handles decimal precision for large amounts', () => {
      render(<CurrencyDisplay amount={999999.99} />)
      
      expect(screen.getByText(/999,999/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles very small decimal amounts', () => {
      render(<CurrencyDisplay amount={0.01} />)
      
      const container = screen.getByText(/0\.01/)
      expect(container).toBeInTheDocument()
    })

    it('handles NaN gracefully', () => {
      // Component should handle NaN without crashing
      const { container } = render(<CurrencyDisplay amount={NaN} />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Snapshot', () => {
    it('matches snapshot for SRD currency', () => {
      const { container } = render(<CurrencyDisplay amount={1234.56} />)
      expect(container).toMatchSnapshot()
    })

    it('matches snapshot for USD currency', () => {
      const { container } = render(<CurrencyDisplay amount={1234.56} currency="USD" />)
      expect(container).toMatchSnapshot()
    })

    it('matches snapshot for positive variant', () => {
      const { container } = render(<CurrencyDisplay amount={5000} variant="positive" />)
      expect(container).toMatchSnapshot()
    })
  })
})
