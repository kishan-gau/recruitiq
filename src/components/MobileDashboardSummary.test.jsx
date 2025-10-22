import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MobileDashboardSummary from './MobileDashboardSummary'
import { DataProvider } from '../context/DataContext'
import { MemoryRouter } from 'react-router-dom'

describe('MobileDashboardSummary (snapshot)', ()=>{
  it('renders compact summary', ()=>{
    const { container } = render(
      <MemoryRouter>
        <DataProvider>
          <MobileDashboardSummary />
        </DataProvider>
      </MemoryRouter>
    )
    // confirm a key label from the mobile summary is present
    const label = container.querySelector('div')
    expect(container.textContent).toContain('Open roles')
  })
})
