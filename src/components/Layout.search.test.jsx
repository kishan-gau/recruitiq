import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { test, expect } from 'vitest'
import Layout from './Layout'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider } from '../context/DataContext'

test('search icon toggles inline input', ()=>{
  render(
    <MemoryRouter>
      <DataProvider>
        <Layout><div>Content</div></Layout>
      </DataProvider>
    </MemoryRouter>
  )
  const btn = screen.getByRole('button', { name: /Search/i })
  expect(btn).toBeTruthy()
  fireEvent.click(btn)
  const input = screen.getByPlaceholderText(/Search people or jobs.../i)
  expect(input).toBeTruthy()
})
