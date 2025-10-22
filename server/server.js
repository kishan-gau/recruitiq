const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, 'db.json')

function readDB(){
  try{return JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){
    const init = { jobs: [], candidates: [] }
    fs.writeFileSync(DB, JSON.stringify(init, null, 2))
    return init
  }
}

function writeDB(data){ fs.writeFileSync(DB, JSON.stringify(data, null, 2)) }

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/api/data', (req,res)=>{
  res.json(readDB())
})

app.post('/api/jobs', (req,res)=>{
  const db = readDB()
  const id = Math.max(0, ...db.jobs.map(j=>j.id))+1
  const job = { id, ...req.body }
  db.jobs.unshift(job)
  writeDB(db)
  res.json(job)
})

app.post('/api/candidates', (req,res)=>{
  const db = readDB()
  const id = Math.max(0, ...db.candidates.map(c=>c.id))+1
  const candidate = { id, ...req.body }
  db.candidates.unshift(candidate)
  writeDB(db)
  res.json(candidate)
})

app.post('/api/candidates/:id/move', (req,res)=>{
  const db = readDB()
  const id = Number(req.params.id)
  const c = db.candidates.find(x=>x.id===id)
  if(!c) return res.status(404).json({error:'not found'})
  c.stage = req.body.stage
  writeDB(db)
  res.json(c)
})

app.delete('/api/candidates/:id', (req,res)=>{
  const db = readDB()
  const id = Number(req.params.id)
  const idx = db.candidates.findIndex(x=>x.id===id)
  if(idx === -1) return res.status(404).json({error:'not found'})
  const removed = db.candidates.splice(idx,1)[0]
  writeDB(db)
  res.json(removed)
})

const port = process.env.PORT || 4000
app.listen(port, ()=> console.log('Mock API listening on', port))
