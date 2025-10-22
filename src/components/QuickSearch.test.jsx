import React from 'react'
import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import QuickSearch from './QuickSearch'
import { DataProvider } from '../context/DataContext'
import { MemoryRouter } from 'react-router-dom'

test('QuickSearch renders and shows input when open', ()=>{
  render(
    <MemoryRouter>
      <DataProvider>
        <QuickSearch open={true} onClose={()=>{}} />
      </DataProvider>
    </MemoryRouter>
  )
  const input = screen.getByPlaceholderText(/Search people or jobs.../i)
  expect(input).toBeTruthy()
})
