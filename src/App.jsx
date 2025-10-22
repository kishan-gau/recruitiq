import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import JobRequisition from './pages/JobRequisition'
import Candidates from './pages/Candidates'
import CandidateDetail from './pages/CandidateDetail'
import Pipeline from './pages/Pipeline'
import Layout from './components/Layout'
import MobileQuickResults from './pages/MobileQuickResults'
import Profile from './pages/Profile'
import DebugOverlay from './components/DebugOverlay'

export default function App(){
  return (
    <Layout>
      <DebugOverlay />
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/jobs" element={<Jobs/>} />
        <Route path="/jobs/new" element={<JobRequisition/>} />
        <Route path="/jobs/:id/edit" element={<JobRequisition/>} />
        <Route path="/jobs/:id" element={<JobDetail/>} />
        <Route path="/candidates" element={<Candidates/>} />
        <Route path="/candidates/:id" element={<CandidateDetail/>} />
        <Route path="/pipeline" element={<Pipeline/>} />
        <Route path="/profile" element={<Profile/>} />
        <Route path="/mobile/quick-results" element={<MobileQuickResults/>} />
      </Routes>
    </Layout>
  )
}
