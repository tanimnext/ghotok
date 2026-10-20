import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp, can } from './lib/app.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Biodatas from './pages/Biodatas.jsx';
import BiodataReview from './pages/BiodataReview.jsx';
import Payments from './pages/Payments.jsx';
import Refunds from './pages/Refunds.jsx';
import Reports from './pages/Reports.jsx';
import Recovery from './pages/Recovery.jsx';
import Tickets from './pages/Tickets.jsx';
import TicketView from './pages/TicketView.jsx';
import Users from './pages/Users.jsx';
import UserView from './pages/UserView.jsx';
import Packages from './pages/Packages.jsx';
import Audit from './pages/Audit.jsx';

function Guard({ min, children }) {
  const { user } = useApp();
  return can(user, min) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, ready } = useApp();
  if (!ready) return <div className="empty"><Spinner /></div>;
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="biodatas" element={<Biodatas />} />
        <Route path="nid" element={<Biodatas nidMode />} />
        <Route path="biodatas/:id" element={<BiodataReview />} />
        <Route path="payments" element={<Guard min="admin"><Payments /></Guard>} />
        <Route path="refunds" element={<Guard min="admin"><Refunds /></Guard>} />
        <Route path="reports" element={<Reports />} />
        <Route path="recovery" element={<Guard min="admin"><Recovery /></Guard>} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="tickets/:id" element={<TicketView />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserView />} />
        <Route path="packages" element={<Guard min="admin"><Packages /></Guard>} />
        <Route path="audit" element={<Guard min="admin"><Audit /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
