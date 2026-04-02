import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { SiteProvider } from './context/SiteContext';
import { AuthProvider } from './context/AuthContext';
import SecurityShield from './components/SecurityShield';

import Home from './pages/Home';

// Placeholder Pages
import Schedule from './pages/Schedule';
import Portfolio from './pages/Portfolio';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Products from './pages/Products';
import BarberPanel from './pages/BarberPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

// Placeholder Pages - Removed as all are implemented

// Layout with Navigation will be added here
import Navbar from './components/Navbar';
import Header from './components/Header';

function App() {
  return (
    <SiteProvider>
      <AuthProvider>
        <Router>
          <div className="app-root">
            <SecurityShield>
              <AppRoutes />
            </SecurityShield>
          </div>
        </Router>
      </AuthProvider>
    </SiteProvider>
  );
}

function PublicLayout() {
  return (
    <>
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Navbar />
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes with Navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/agendamento" element={<Schedule />} />
          <Route path="/portifolio" element={<Portfolio />} />
          <Route path="/contato" element={<Contact />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route index element={<Admin />} />
        </Route>

        {/* Barber Routes */}
        <Route path="/barbeiro" element={<ProtectedRoute allowedRoles={['admin', 'barber']} />}>
          <Route index element={<BarberPanel />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
