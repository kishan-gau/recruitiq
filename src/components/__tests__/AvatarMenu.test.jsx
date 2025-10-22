import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AvatarMenu from '../../components/AvatarMenu'
import { BrowserRouter } from 'react-router-dom'

test('AvatarMenu opens and has profile and logout', ()=>{
  render(<BrowserRouter><AvatarMenu /></BrowserRouter>)
  const btn = screen.getByRole('button')
  // open by clicking the button
  fireEvent.click(btn)
  expect(screen.getByText(/Profile/)).toBeTruthy()
  expect(screen.getByText(/Log out/)).toBeTruthy()
  // navigate with ArrowDown
  fireEvent.keyDown(document, { key: 'ArrowDown' })
  // close with Escape
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText(/Profile/)).toBeNull()
})
