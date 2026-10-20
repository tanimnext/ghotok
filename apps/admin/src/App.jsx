import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp, can } from './lib/app.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';

// Pages load on demand so the first screen stays small.
const Overview = lazy(() => import('./pages/Overview.jsx'));
const Biodatas = lazy(() => import('./pages/Biodatas.jsx'));
const BiodataReview = lazy(() => import('./pages/BiodataReview.jsx'));
const Payments = lazy(() => import('./pages/Payments.jsx'));
const Refunds = lazy(() => import('./pages/Refunds.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Recovery = lazy(() => import('./pages/Recovery.jsx'));
const Tickets = lazy(() => import('./pages/Tickets.jsx'));
const TicketView = lazy(() => import('./pages/TicketView.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const UserView = lazy(() => import('./pages/UserView.jsx'));
const Packages = lazy(() => import('./pages/Packages.jsx'));
const Audit = lazy(() => import('./pages/Audit.jsx'));
const ContactMessages = lazy(() => import('./pages/ContactMessages.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function Guard({ min, children }) {
  const { user } = useApp();
  return can(user, min) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, ready } = useApp();
  if (!ready)
    return (
      <div className="empty">
        <Spinner />
      </div>
    );
  if (!user) return <Login />;
  return (
    <Suspense
      fallback={
        <div className="empty">
          <Spinner />
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="biodatas" element={<Biodatas />} />
          <Route path="nid" element={<Biodatas nidMode />} />
          <Route path="biodatas/:id" element={<BiodataReview />} />
          <Route
            path="payments"
            element={
              <Guard min="admin">
                <Payments />
              </Guard>
            }
          />
          <Route
            path="refunds"
            element={
              <Guard min="admin">
                <Refunds />
              </Guard>
            }
          />
          <Route path="reports" element={<Reports />} />
          <Route
            path="recovery"
            element={
              <Guard min="admin">
                <Recovery />
              </Guard>
            }
          />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketView />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserView />} />
          <Route
            path="packages"
            element={
              <Guard min="admin">
                <Packages />
              </Guard>
            }
          />
          <Route
            path="audit"
            element={
              <Guard min="admin">
                <Audit />
              </Guard>
            }
          />
          <Route path="contact" element={<ContactMessages />} />
          <Route
            path="resources"
            element={
              <Guard min="admin">
                <Resources />
              </Guard>
            }
          />
          <Route
            path="settings"
            element={
              <Guard min="admin">
                <Settings />
              </Guard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
