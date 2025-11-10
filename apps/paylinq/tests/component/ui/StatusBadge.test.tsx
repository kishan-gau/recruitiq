import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '@/components/ui/StatusBadge'

describe('StatusBadge', () => {
  describe('Basic Rendering', () => {
    it('renders status text with capitalized first letter', () => {
      render(<StatusBadge status="active" />)
      
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('capitalizes status text correctly', () => {
      render(<StatusBadge status="pending" />)
      
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('handles uppercase status', () => {
      render(<StatusBadge status="APPROVED" />)
      
      expect(screen.getByText('APPROVED')).toBeInTheDocument()
    })

    it('handles multi-word status', () => {
      render(<StatusBadge status="in progress" />)
      
      expect(screen.getByText('In progress')).toBeInTheDocument()
    })
  })

  describe('Status Colors', () => {
    it('applies active status color', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-green-100')
    })

    it('applies pending status color', () => {
      const { container } = render(<StatusBadge status="pending" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-yellow-100')
    })

    it('applies rejected status color', () => {
      const { container } = render(<StatusBadge status="rejected" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-red-100')
    })

    it('applies inactive status color', () => {
      const { container } = render(<StatusBadge status="inactive" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-gray-100')
    })
  })

  describe('Size Variants', () => {
    it('applies small size classes', () => {
      const { container } = render(<StatusBadge status="active" size="sm" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs')
    })

    it('applies medium size classes by default', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-xs')
    })

    it('applies large size classes', () => {
      const { container } = render(<StatusBadge status="active" size="lg" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })
  })

  describe('Styling', () => {
    it('includes rounded-full class', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('rounded-full')
    })

    it('includes inline-flex class', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('inline-flex')
    })

    it('includes font-medium class', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('font-medium')
    })

    it('accepts custom className', () => {
      const { container } = render(
        <StatusBadge status="active" className="ml-2 custom-class" />
      )
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('custom-class', 'ml-2')
    })
  })

  describe('Worker Status Values', () => {
    it('renders active status', () => {
      render(<StatusBadge status="active" />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders inactive status', () => {
      render(<StatusBadge status="inactive" />)
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('renders suspended status', () => {
      render(<StatusBadge status="suspended" />)
      expect(screen.getByText('Suspended')).toBeInTheDocument()
    })

    it('renders terminated status', () => {
      render(<StatusBadge status="terminated" />)
      expect(screen.getByText('Terminated')).toBeInTheDocument()
    })
  })

  describe('Approval Status Values', () => {
    it('renders pending status', () => {
      render(<StatusBadge status="pending" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('renders approved status', () => {
      render(<StatusBadge status="approved" />)
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('renders rejected status', () => {
      render(<StatusBadge status="rejected" />)
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('includes dark mode color classes', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      const classList = badge?.className || ''
      expect(classList).toContain('dark:')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty status', () => {
      const { container } = render(<StatusBadge status="" />)
      
      expect(container).toBeInTheDocument()
    })

    it('handles single character status', () => {
      render(<StatusBadge status="a" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('handles status with special characters', () => {
      render(<StatusBadge status="in-progress" />)
      expect(screen.getByText('In-progress')).toBeInTheDocument()
    })

    it('handles status with numbers', () => {
      render(<StatusBadge status="phase1" />)
      expect(screen.getByText('Phase1')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders as a span element', () => {
      const { container } = render(<StatusBadge status="active" />)
      
      const badge = container.querySelector('span')
      expect(badge?.tagName).toBe('SPAN')
    })

    it('maintains readable text', () => {
      render(<StatusBadge status="active" />)
      
      const badge = screen.getByText('Active')
      expect(badge).toBeVisible()
    })
  })

  describe('Real-World Usage', () => {
    it('renders worker status in table', () => {
      render(
        <div>
          <StatusBadge status="active" size="sm" />
        </div>
      )
      
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders approval status in list', () => {
      render(
        <div>
          <StatusBadge status="pending" size="md" />
        </div>
      )
      
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('renders with custom spacing', () => {
      const { container } = render(
        <StatusBadge status="active" className="mx-2" />
      )
      
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('mx-2')
    })
  })

  describe('Snapshot Testing', () => {
    it('matches snapshot for active status', () => {
      const { container } = render(<StatusBadge status="active" />)
      expect(container).toMatchSnapshot()
    })

    it('matches snapshot for small size', () => {
      const { container } = render(<StatusBadge status="pending" size="sm" />)
      expect(container).toMatchSnapshot()
    })

    it('matches snapshot for large size', () => {
      const { container } = render(<StatusBadge status="approved" size="lg" />)
      expect(container).toMatchSnapshot()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined status', () => {
      render(<StatusBadge status={undefined} />)
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('handles null status', () => {
      render(<StatusBadge status={null} />)
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('applies correct color for undefined status', () => {
      const { container } = render(<StatusBadge status={undefined} />)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-gray-100')
    })

    it('applies correct color for null status', () => {
      const { container } = render(<StatusBadge status={null} />)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-gray-100')
    })
  })
})
