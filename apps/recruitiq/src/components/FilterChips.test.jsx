import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterChips from './FilterChips'

describe('FilterChips Component', () => {
  const mockFilters = [
    { key: 'search', label: 'Search', value: 'engineer' },
    { key: 'status', label: 'Status', value: 'open' },
    { key: 'type', label: 'Type', value: 'Full-time' },
  ]

  it('renders nothing when no filters', () => {
    const { container } = render(<FilterChips filters={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all filter chips', () => {
    render(<FilterChips filters={mockFilters} onRemove={vi.fn()} onClearAll={vi.fn()} />)
    
    expect(screen.getByText('Search:')).toBeInTheDocument()
    expect(screen.getByText('engineer')).toBeInTheDocument()
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('Type:')).toBeInTheDocument()
    expect(screen.getByText('Full-time')).toBeInTheDocument()
  })

  it('calls onRemove when remove button clicked', () => {
    const onRemove = vi.fn()
    render(<FilterChips filters={mockFilters} onRemove={onRemove} onClearAll={vi.fn()} />)
    
    const removeButtons = screen.getAllByLabelText(/Remove .+ filter/)
    fireEvent.click(removeButtons[0])
    
    expect(onRemove).toHaveBeenCalledWith('search')
  })

  it('shows clear all button when multiple filters', () => {
    render(<FilterChips filters={mockFilters} onRemove={vi.fn()} onClearAll={vi.fn()} />)
    
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('hides clear all button with single filter', () => {
    render(
      <FilterChips 
        filters={[mockFilters[0]]} 
        onRemove={vi.fn()} 
        onClearAll={vi.fn()} 
      />
    )
    
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
  })

  it('calls onClearAll when clear all clicked', () => {
    const onClearAll = vi.fn()
    render(<FilterChips filters={mockFilters} onRemove={vi.fn()} onClearAll={onClearAll} />)
    
    const clearAllButton = screen.getByText('Clear all')
    fireEvent.click(clearAllButton)
    
    expect(onClearAll).toHaveBeenCalled()
  })

  it('displays active filters label', () => {
    render(<FilterChips filters={mockFilters} onRemove={vi.fn()} onClearAll={vi.fn()} />)
    
    expect(screen.getByText('Active filters:')).toBeInTheDocument()
  })
})
