// Lightweight search utilities used by QuickSearch
export function levenshtein(a, b){
  a = String(a || '')
  b = String(b || '')
  if(!a.length) return b.length
  if(!b.length) return a.length
  const m = Array.from({length: a.length+1}, ()=> new Array(b.length+1).fill(0))
  for(let i=0;i<=a.length;i++) m[i][0]=i
  for(let j=0;j<=b.length;j++) m[0][j]=j
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      const cost = a[i-1]===b[j-1]?0:1
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+cost)
    }
  }
  return m[a.length][b.length]
}

export function fuzzyScore(text, q){
  if(!q) return 0
  const t = String(text||'').toLowerCase()
  const qi = String(q||'').toLowerCase()
  if(t === qi) return 200
  if(t.startsWith(qi)) return 150
  const d = levenshtein(t, qi)
  return Math.max(0, 100 - d*4)
}

// tokenScore(text, tokens[]): sum of fuzzy scores across tokens
export function tokenScore(text, tokens){
  if(!tokens || tokens.length === 0) return 0
  const t = String(text||'').toLowerCase()
  if(t.trim() === '') return 0
  let score = 0
  for(const tk of tokens){
    if(!tk) continue
    score += fuzzyScore(t, tk)
  }
  return score
}
