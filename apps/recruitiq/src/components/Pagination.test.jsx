import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from './Pagination'

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 100,
    pageSize: 20,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  }

  it('renders correctly with basic props', () => {
    render(<Pagination {...defaultProps} />)
    
    // Check if showing correct range
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/20/)).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('displays correct item range', () => {
    render(<Pagination {...defaultProps} currentPage={2} />)
    
    // Page 2 should show items 21-40
    expect(screen.getByText(/21/)).toBeInTheDocument()
    expect(screen.getByText(/40/)).toBeInTheDocument()
  })

  it('calls onPageChange when page button clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />)
    
    // Click page 2
    const page2Button = screen.getByText('2')
    fireEvent.click(page2Button)
    
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when next button clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />)
    
    // Click next button
    const nextButton = screen.getByLabelText('Next page')
    fireEvent.click(nextButton)
    
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when previous button clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />)
    
    // Click previous button
    const prevButton = screen.getByLabelText('Previous page')
    fireEvent.click(prevButton)
    
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />)
    
    const prevButton = screen.getByLabelText('Previous page')
    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />)
    
    const nextButton = screen.getByLabelText('Next page')
    expect(nextButton).toBeDisabled()
  })

  it('calls onPageSizeChange when page size selected', () => {
    const onPageSizeChange = vi.fn()
    render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />)
    
    const select = screen.getByLabelText('Per page:')
    fireEvent.change(select, { target: { value: '50' } })
    
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  it('shows ellipsis for many pages', () => {
    render(<Pagination {...defaultProps} totalPages={20} currentPage={10} />)
    
    // Should show ellipsis
    const ellipsis = screen.getAllByText('...')
    expect(ellipsis.length).toBeGreaterThan(0)
  })

  it('highlights current page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />)
    
    const page3Button = screen.getByText('3')
    expect(page3Button).toHaveAttribute('aria-current', 'page')
  })

  it('hides pagination when only one page and showPageSize is false', () => {
    const { container } = render(
      <Pagination 
        {...defaultProps} 
        totalPages={1} 
        showPageSize={false}
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('shows page size selector when showPageSize is true', () => {
    render(<Pagination {...defaultProps} showPageSize={true} />)
    
    expect(screen.getByLabelText('Per page:')).toBeInTheDocument()
  })

  it('hides page size selector when showPageSize is false', () => {
    render(<Pagination {...defaultProps} showPageSize={false} />)
    
    expect(screen.queryByLabelText('Per page:')).not.toBeInTheDocument()
  })

  it('calculates correct end item on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalItems={95} />)
    
    // Last page: items 81-95
    expect(screen.getByText(/81/)).toBeInTheDocument()
    expect(screen.getByText(/95/)).toBeInTheDocument()
  })
})
