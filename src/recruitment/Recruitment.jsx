/**
 * Recruitment module — main router entry point.
 * All routes are nested under /recruitment/* in the root App.jsx.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import './recruitment.css';

// Layouts
import DashboardLayout from './components/DashboardLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

// Candidate pages
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import ProfileComplete from './pages/ProfileComplete.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SubdomainSelection from './pages/SubdomainSelection.jsx';
import RoundOne from './pages/RoundOne.jsx';
import Assessment from './pages/Assessment.jsx';
import RoundTwo from './pages/RoundTwo.jsx';
import CandidateInterview from './pages/CandidateInterview.jsx';
import CandidateResult from './pages/CandidateResult.jsx';

// Admin pages
import AdminLogin from './pages/AdminLogin.jsx';
import AdminOverview from './pages/AdminOverview.jsx';
import AdminCandidates from './pages/AdminCandidates.jsx';
import CandidateDossier from './pages/CandidateDossier.jsx';
import AdminAssessments from './pages/AdminAssessments.jsx';
import AdminProjects from './pages/AdminProjects.jsx';
import AdminInterviews from './pages/AdminInterviews.jsx';
import AdminResults from './pages/AdminResults.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import AdminDomains from './pages/AdminDomains.jsx';
import AdminOperations from './pages/AdminOperations.jsx';

export default function Recruitment() {
  return (
    <div className="rct-root">
      <Routes>
        {/* ── Public / Auth ──────────────────────────────── */}
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="auth/callback" element={<AuthCallback />} />

        {/* ── Candidate — protected by DashboardLayout ──── */}
        <Route element={<DashboardLayout />}>
          <Route path="profile/complete" element={<ProfileComplete />} />
          <Route path="subdomain" element={<SubdomainSelection />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/round-1" element={<RoundOne />} />
          <Route path="dashboard/assessment" element={<Assessment />} />
          <Route path="round-1" element={<RoundOne />} />
          <Route path="round-2" element={<RoundTwo />} />
          <Route path="interview" element={<CandidateInterview />} />
          <Route path="result" element={<CandidateResult />} />
        </Route>

        {/* ── Admin ─────────────────────────────────────── */}
        <Route path="admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLogin />} />
          <Route index element={<AdminOverview />} />
          <Route path="operations" element={<AdminOperations />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="candidates/:id" element={<CandidateDossier />} />
          <Route path="assessments" element={<AdminAssessments />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="interviews" element={<AdminInterviews />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="domains" element={<AdminDomains />} />
        </Route>

        {/* ── Fallback ───────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/recruitment" replace />} />
      </Routes>
    </div>
  );
}
