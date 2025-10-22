import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ConfirmDialog from '../ConfirmDialog'

describe('ConfirmDialog', ()=>{
  it('renders when open', ()=>{
    render(
      <ConfirmDialog 
        open={true} 
        title="Confirm action" 
        description="Are you sure?"
        onConfirm={()=>{}}
        onCancel={()=>{}}
      />
    )
    expect(screen.getByText('Confirm action')).toBeTruthy()
    expect(screen.getByText('Are you sure?')).toBeTruthy()
  })

  it('does not render when closed', ()=>{
    render(
      <ConfirmDialog 
        open={false} 
        title="Confirm action" 
        description="Are you sure?"
        onConfirm={()=>{}}
        onCancel={()=>{}}
      />
    )
    expect(screen.queryByText('Confirm action')).toBeNull()
  })

  it('calls onConfirm when confirm button clicked', ()=>{
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog 
        open={true} 
        title="Confirm action" 
        description="Are you sure?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
        onCancel={()=>{}}
      />
    )
    const confirmButton = screen.getByRole('button', { name: /Yes/i })
    fireEvent.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button clicked', ()=>{
    const onCancel = vi.fn()
    render(
      <ConfirmDialog 
        open={true} 
        title="Confirm action" 
        description="Are you sure?"
        cancelLabel="No"
        onConfirm={()=>{}}
        onCancel={onCancel}
      />
    )
    const cancelButton = screen.getByRole('button', { name: /No/i })
    fireEvent.click(cancelButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
