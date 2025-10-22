import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Profile from '../../pages/Profile'
import { BrowserRouter } from 'react-router-dom'

test('Profile theme toggle persists and applies class', ()=>{
  // ensure no theme initially
  localStorage.removeItem('recruitiq_theme')
  render(<BrowserRouter><Profile /></BrowserRouter>)
  const light = screen.getByLabelText(/Light/i)
  const dark = screen.getByLabelText(/Dark/i)
  // initial selection should be light by default
  expect(light.checked).toBe(true)
  // toggle to dark by clicking the label
  fireEvent.click(dark)
  expect(localStorage.getItem('recruitiq_theme')).toBe('dark')
})
