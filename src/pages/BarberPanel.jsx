import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
    Calendar, Users, BookOpen, Settings, LogOut, 
    Bell, Moon, Sun, ChevronDown, X, Menu
} from 'lucide-react';

// Reusing existing tabs from Admin (they are already modularized in Admin.jsx or separate files)
// For now, I will import the needed sub-components. 
// Note: In a real refactor, these would be in src/pages/admin/tabs/
import { 
    AppointmentsTab, 
    CustomersTab, 
    SettingsTab,
    PromotionInterestsTab,
    CategoriesTab
} from './Admin'; 
import AcademyTab from './admin/AcademyTab';

const BarberPanel = () => {
    const { user, role, signOut } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('appointments');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const TABS = [
        { id: 'appointments', label: 'Minha Agenda', icon: <Calendar size={20} /> },
        { id: 'customers', label: 'Meus Clientes', icon: <Users size={20} /> },
        { id: 'leads', label: 'Interessados', icon: <Bell size={20} /> },
        { id: 'categories', label: 'Categorias', icon: <Menu size={20} /> },
        { id: 'academy', label: 'Academy', icon: <BookOpen size={20} /> },
        { id: 'settings', label: 'Minha Conta', icon: <Settings size={20} /> },
    ];

    return (
        <div className="admin-shell">
            <header className="admin-topbar">
                <div className="admin-topbar-inner">
                    <div className="admin-topbar-left">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="admin-topbar-title">Painel do Barbeiro</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                Olá, {user?.email?.split('@')[0]}
                            </span>
                        </div>
                        
                        <nav className="admin-desktop-nav" style={{ marginLeft: '20px' }}>
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="admin-topbar-right">
                        <button onClick={toggleTheme} className="theme-toggle-btn">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="admin-logout-btn" onClick={handleLogout} style={{ color: '#ef4444' }}>
                            <LogOut size={20} />
                        </button>
                        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            <nav className={`mobile-navigation ${mobileMenuOpen ? 'open' : ''}`}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setMobileMenuOpen(false);
                        }}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <main className="admin-content">
                {activeTab === 'appointments' && <AppointmentsTab />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'leads' && <PromotionInterestsTab />}
                {activeTab === 'categories' && <CategoriesTab />}
                {activeTab === 'academy' && <AcademyTab />}
                {activeTab === 'settings' && <SettingsTab />}
            </main>
        </div>
    );
};

export default BarberPanel;
