import { test, expect } from 'vitest'
import { levenshtein, fuzzyScore, tokenScore } from './searchUtils'

test('levenshtein basic', ()=>{
  expect(levenshtein('','')).toBe(0)
  expect(levenshtein('a','')).toBe(1)
  expect(levenshtein('kitten','sitting')).toBe(3)
})

test('fuzzyScore exact and prefix', ()=>{
  expect(fuzzyScore('frontend','frontend')).toBeGreaterThan(150)
  expect(fuzzyScore('frontend','front')).toBeGreaterThan(140)
  expect(fuzzyScore('frontend','back')).toBeGreaterThanOrEqual(0)
})

test('tokenScore multi token', ()=>{
  const tokens = ['front','engineer']
  const s1 = tokenScore('Frontend Engineer', tokens)
  const s2 = tokenScore('Backend Engineer', tokens)
  expect(s1).toBeGreaterThan(s2)
  expect(tokenScore('', tokens)).toBe(0)
})

test('tokenScore ignores empty tokens', ()=>{
  expect(tokenScore('Frontend', [''])).toBe(0)
})

test('fuzzyScore handles empty input', ()=>{
  expect(fuzzyScore('', '')).toBe(0)
  expect(fuzzyScore('a', '')).toBe(0)
})
