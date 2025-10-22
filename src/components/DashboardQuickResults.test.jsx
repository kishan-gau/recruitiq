import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { test, expect } from 'vitest'
import DashboardQuickResults from './DashboardQuickResults'
import { DataProvider } from '../context/DataContext'
import { MemoryRouter } from 'react-router-dom'

test('DashboardQuickResults renders actions and candidate items', ()=>{
  render(
    <MemoryRouter>
      <DataProvider>
        <DashboardQuickResults />
      </DataProvider>
    </MemoryRouter>
  )

  expect(screen.getByText(/Quick results/i)).toBeTruthy()
  expect(screen.getByText(/New Job/i)).toBeTruthy()
  // there should be at least one candidate displayed from mock data
  const candidate = screen.getAllByText(/Software Engineer|Product Designer|Bob Smith/i)
  expect(candidate.length).toBeGreaterThan(0)

  // test pinning a search
  const input = screen.getByPlaceholderText(/Quick search.../i)
  input.focus()
  // simulate typing into the quick search input
  fireEvent.change(input, { target: { value: 'Alice' } })
  // click the save icon button to open modal
  const saveIcon = screen.getByTestId('save-query-btn')
  expect(saveIcon).toBeTruthy()
  fireEvent.click(saveIcon)
  // modal should appear
  const modal = screen.getByTestId('save-modal')
  expect(modal).toBeTruthy()
  const nameEl = within(modal).getByPlaceholderText('Name')
  fireEvent.change(nameEl, { target: { value: 'Alice search' } })
  const modalSave = within(modal).getByText('Save')
  fireEvent.click(modalSave)
  const stored = JSON.parse(localStorage.getItem('recruitiq_pinned_searches')||'[]')
  expect(stored.find(s=> s.name === 'Alice search')).toBeTruthy()
  // clicking pinned button should set query
  const pinnedBtn = screen.getByText('Alice search')
  pinnedBtn.click()
  expect(screen.getByPlaceholderText(/Quick search.../i).value).toBe('Alice')

  // now delete the pinned search using delete button
  const deleteBtn = screen.getByTestId('delete-pin-Alice search')
  expect(deleteBtn).toBeTruthy()
  fireEvent.click(deleteBtn)
  const storedAfter = JSON.parse(localStorage.getItem('recruitiq_pinned_searches')||'[]')
  expect(storedAfter.find(s=> s.name === 'Alice search')).toBeUndefined()
})
