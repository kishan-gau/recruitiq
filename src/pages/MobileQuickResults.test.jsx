import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MobileQuickResults from './MobileQuickResults'
import { DataProvider } from '../context/DataContext'
import { MemoryRouter } from 'react-router-dom'

describe('MobileQuickResults (smoke)', ()=>{
  it('renders quick search page', ()=>{
    const { getByRole } = render(
      <MemoryRouter>
        <DataProvider>
          <MobileQuickResults />
        </DataProvider>
      </MemoryRouter>
    )
    // QuickSearch contains an input when open
    const textbox = getByRole('textbox')
    expect(textbox).toBeTruthy()
  })
})
