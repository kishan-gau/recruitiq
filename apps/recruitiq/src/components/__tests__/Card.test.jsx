import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Card from '../Card'

describe('Card', ()=>{
  it('renders children', ()=>{
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeTruthy()
  })

  it('applies custom className', ()=>{
    const { container } = render(<Card className="custom-class">Content</Card>)
    const card = container.querySelector('.custom-class')
    expect(card).toBeTruthy()
  })

  it('has default styling classes', ()=>{
    const { container } = render(<Card>Content</Card>)
    const card = container.firstChild
    expect(card.className).toContain('p-4')
    expect(card.className).toContain('bg-white')
    expect(card.className).toContain('rounded')
    expect(card.className).toContain('shadow-sm')
  })
})
