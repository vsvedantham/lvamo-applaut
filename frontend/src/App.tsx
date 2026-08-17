import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './applaut/context/AuthContext'
import Layout from './applaut/components/layout/Layout'
import Hub from './pages/Hub'
import Landing from './applaut/pages/Landing'
import Jobref from './jobref/pages/Jobref'
import Login from './applaut/pages/Login'
import Register from './applaut/pages/Register'
import Dashboard from './applaut/pages/Dashboard'
import Onboarding from './applaut/pages/Onboarding'
import ResumePage from './applaut/pages/Resume'
import Opportunities from './applaut/pages/Opportunities'
import OpportunityDetail from './applaut/pages/OpportunityDetail'
import DocumentDetail from './applaut/pages/DocumentDetail'
import Applications from './applaut/pages/Applications'
import AuditLog from './applaut/pages/AuditLog'
import NotFound from './applaut/pages/NotFound'
import ProtectedRoute from './applaut/components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="jobref" element={<Jobref />} />
          <Route path="applaut" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route
              path="onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="resume"
              element={
                <ProtectedRoute>
                  <ResumePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="opportunities"
              element={
                <ProtectedRoute>
                  <Opportunities />
                </ProtectedRoute>
              }
            />
            <Route
              path="opportunities/:id"
              element={
                <ProtectedRoute>
                  <OpportunityDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="scores" element={<Navigate to="/applaut/opportunities" replace />} />
            <Route
              path="documents/:opportunityId"
              element={
                <ProtectedRoute>
                  <DocumentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="applications"
              element={
                <ProtectedRoute>
                  <Applications />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute>
                  <AuditLog />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
