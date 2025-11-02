import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from '../Modal'

describe('Modal', ()=>{
  it('renders when open', ()=>{
    render(<Modal open={true} title="Test Modal" onClose={()=>{}}>Content</Modal>)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Test Modal')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
  })

  it('does not render when closed', ()=>{
    render(<Modal open={false} title="Test Modal" onClose={()=>{}}>Content</Modal>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls onClose when Close button clicked', ()=>{
    const onClose = vi.fn()
    render(<Modal open={true} title="Test Modal" onClose={onClose}>Content</Modal>)
    const closeButton = screen.getByRole('button', { name: /Close/i })
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop clicked', ()=>{
    const onClose = vi.fn()
    const { container } = render(<Modal open={true} title="Test Modal" onClose={onClose}>Content</Modal>)
    // backdrop is the first child div with bg-black/40
    const backdrop = container.querySelector('.bg-black\\/40')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
