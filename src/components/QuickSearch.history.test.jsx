import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { test, expect, beforeEach } from 'vitest'
import QuickSearch from './QuickSearch'
import { DataProvider } from '../context/DataContext'
import { MemoryRouter } from 'react-router-dom'

beforeEach(()=>{
  localStorage.removeItem('recruitiq_qs_history')
})

test('action items are not stored in history and not duplicated', ()=>{
  // seed localStorage with an action entry and a real item
  const seeded = [
    { type: 'action', id: 'new-job', title: 'Create job', subtitle: 'Quickly add a job' },
    { type: 'job', id: 123, title: 'Frontend Engineer', subtitle: 'Remote' }
  ]
  localStorage.setItem('recruitiq_qs_history', JSON.stringify(seeded))

  render(
    <MemoryRouter>
      <DataProvider>
        <QuickSearch open={true} onClose={()=>{}} />
      </DataProvider>
    </MemoryRouter>
  )

  // quick actions should still be present and have unique ids; the seeded action should not duplicate the quick action
  const listbox = screen.getByRole('listbox')
  const actionButton = listbox.querySelector('#qs-action-new-job')
  expect(actionButton).toBeTruthy()
  const allActionEls = listbox.querySelectorAll('#qs-action-new-job')
  expect(allActionEls.length).toBe(1)

  // Now simulate clicking the Create job action and ensure it doesn't get persisted into localStorage
  fireEvent.click(actionButton)

  const stored = JSON.parse(localStorage.getItem('recruitiq_qs_history')||'[]')
  // no action entries should be present
  expect(stored.find(s=> s.type === 'action')).toBeUndefined()
})
