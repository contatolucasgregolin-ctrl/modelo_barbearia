import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SiteContext } from '../context/SiteContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, CalendarDays, Scissors, Users, Settings, LogOut,
    Plus, X, Ban, Bell, RefreshCw, User, TrendingUp, Image as ImageIcon, Tag,
    Sun, Moon, Megaphone, Star, MessageCircle,
    Package, Sparkles, AlertCircle
} from 'lucide-react';

import '../styles/Admin.css';

// ── Modular Tab Components ──
import StockTab from './admin/StockTab';
import DashboardTab from './admin/DashboardTab';
import FinancesTab from './admin/FinancesTab';
import TeamManagementTab from './admin/TeamManagementTab';
import AcademyTab from './admin/AcademyTab';
import AppointmentsTab from './admin/AppointmentsTab';
import SubscriptionsTab from './admin/SubscriptionsTab';
import CustomersTab from './admin/CustomersTab';
import ServicesTab from './admin/ServicesTab';
import CategoriesTab from './admin/CategoriesTab';
import GalleryTab from './admin/GalleryTab';
import PromotionInterestsTab from './admin/PromotionInterestsTab';
import PlansPromosTab from './admin/PlansPromosTab';
import SettingsTab from './admin/SettingsTab';
import OnboardingTour from '../components/OnboardingTour';

// ─── Shared UI Components (exported for use by child tabs) ───────────────────

const STATUS_LABELS = {
    pending: { label: 'Pendente', color: '#facc15' },
    confirmed: { label: 'Confirmado', color: '#4ade80' },
    active: { label: 'Ativo', color: '#4ade80' },
    contacted: { label: 'Contatado', color: '#a78bfa' },
    completed: { label: 'Concluído', color: '#38bdf8' },
    cancelled: { label: 'Cancelado', color: '#ef4444' },
    finished: { label: 'Finalizado', color: '#a78bfa' },
    expired: { label: 'Expirado', color: '#f87171' },
};

export const StatusBadge = ({ status }) => {
    const s = STATUS_LABELS[status] || STATUS_LABELS.pending;
    return (
        <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
            background: s.color + '22', color: s.color, whiteSpace: 'nowrap'
        }}>{s.label}</span>
    );
};

export const Modal = ({ title, onClose, children }) => {
    const modalContent = (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal glass-panel fade-in" onClick={e => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h3>{title}</h3>
                    <button onClick={onClose} className="admin-modal-close" aria-label="Fechar modal"><X size={20} /></button>
                </div>
                <div className="admin-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
    return createPortal(modalContent, document.body);
};

// ── Skeleton Loader Component ──
const SkeletonLoader = () => (
    <div className="admin-skeleton-container fade-in">
        <div className="admin-skeleton-grid">
            {[1,2,3].map(i => (
                <div key={i} className="admin-skeleton-card glass-panel">
                    <div className="skeleton skeleton-circle" />
                    <div className="skeleton skeleton-line wide" />
                    <div className="skeleton skeleton-line" />
                </div>
            ))}
        </div>
        <div className="admin-skeleton-table glass-panel">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="admin-skeleton-row">
                    <div className="skeleton skeleton-line narrow" />
                    <div className="skeleton skeleton-line wide" />
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line narrow" />
                </div>
            ))}
        </div>
    </div>
);

// ─── TabBar ─────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'appointments', icon: <CalendarDays size={18} />, label: 'Agendamentos' },
    { id: 'subscriptions', icon: <User size={18} />, label: 'Mensalistas' },
    { id: 'customers', icon: <Users size={18} />, label: 'Clientes' },
    { id: 'team_management', icon: <Users size={18} />, label: 'Equipe e Acesso' },
    { id: 'services', icon: <Scissors size={18} />, label: 'Serviços' },
    { id: 'stock', icon: <Package size={18} />, label: 'Estoque' },
    { id: 'planspromos', icon: <Megaphone size={18} />, label: 'Gerenciar Promoções' },
    { id: 'promo_interests', icon: <Bell size={18} />, label: 'Interessados / Ofertas' },
    { id: 'categories', icon: <Tag size={18} />, label: 'Categorias' },
    { id: 'gallery', icon: <ImageIcon size={18} />, label: 'Galeria' },
    { id: 'finances', icon: <TrendingUp size={18} />, label: 'Financeiro' },
    { id: 'academy', icon: <Sparkles size={18} />, label: 'StudioFlow Academy' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Configurações' },
];

// ══════════════════════════════════════════════════════════════════════════════
// ── Tab Error Boundary ──
// ══════════════════════════════════════════════════════════════════════════════
class TabErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Tab Error Boundary Caught:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="tab-error-fallback fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div className="error-icon-glow">
                        <AlertCircle size={48} color="#ef4444" />
                    </div>
                    <h3 style={{ marginTop: '20px', fontSize: '1.25rem' }}>Ops! Algo deu errado nesta aba.</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '15px auto 25px' }}>
                        Não foi possível carregar as informações desta seção no momento.
                    </p>
                    <button className="admin-btn-primary" onClick={() => window.location.reload()}>
                        Recarregar Painel
                    </button>
                    {import.meta.env.DEV && (
                        <pre style={{ fontSize: '10px', marginTop: '20px', opacity: 0.5, maxWidth: '100%', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                            {this.state.error?.toString()}
                        </pre>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT (Shell)
// ══════════════════════════════════════════════════════════════════════════════
const Admin = () => {
    const { siteData, updateSiteData, theme, toggleTheme } = useContext(SiteContext);
    const { user, isAdmin, role } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : 'appointments');
    const [notificationQueue, setNotificationQueue] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showBellPanel, setShowBellPanel] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null);
    const [realtimeStatus, setRealtimeStatus] = useState('connecting');

    // Pre-load notification sound to avoid browser autoplay blocking
    const notifAudioRef = useRef(null);
    useEffect(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.8;
        audio.preload = 'auto';
        notifAudioRef.current = audio;
    }, []);

    // Navbar scroll state
    const navRef = useRef(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(true);

    const handleScroll = useCallback(() => {
        if (!navRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }, []);

    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [handleScroll]);

    // ─── CENTRALIZED DATA CACHE ───
    const [cachedData, setCachedData] = useState({
        appointments: [],
        services: [],
        artists: [],
        plans: [],
        subscriptions: [],
        promotion_interests: [],
        customers: [],
        user_roles: [],
        finances: [],
        activeSubs: 0,
        lastUpdate: null
    });
    const [globalLoading, setGlobalLoading] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshTimeoutRef = useRef(null);
    const isRefreshingRef = useRef(false);
    const refreshPendingRef = useRef(false);

    const refreshAllDataImmediate = useCallback(async () => {
        if (isRefreshingRef.current) {
            console.log("[Admin] Sync em andamento, agendando...");
            refreshPendingRef.current = true;
            return;
        }
        
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        refreshPendingRef.current = false;
        const syncId = Date.now();
        console.log(`[Admin] 🔄 Iniciando Sync Master #${syncId}...`);
        
        const loadingTimeout = setTimeout(() => {
            if (isRefreshingRef.current) {
                console.warn("[Admin] Timeout de sync (10s) atingido. Liberando UI.");
                isRefreshingRef.current = false;
                setIsRefreshing(false);
                setGlobalLoading(false);
                setIsInitialLoading(false);
            }
        }, 10000);

        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

            const safeFetch = async (promise, description) => {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout: ${description}`)), 8000)
                );
                try {
                    const result = await Promise.race([promise, timeoutPromise]);
                    if (result.error) throw result.error;
                    return result.data || [];
                } catch (err) {
                    console.error(`[Admin] Falha em ${description}:`, err.message);
                    throw err; // Propaga para o catch principal para não limpar o cache com arrays vazios
                }
            };

            // Carregamento paralelo massivo
            const [
                appointments, services, artists, plans, finances, 
                subscriptions, promotion_interests, customers, user_roles
            ] = await Promise.all([
                safeFetch(supabase.from('appointments').select('*, customer:customers(name, phone), service:services(name), artist:artists(name)').order('created_at', { ascending: false }).limit(100), 'agendamentos'),
                safeFetch(supabase.from('services').select('*').order('name'), 'serviços'),
                safeFetch(supabase.from('artists').select('*').order('name'), 'equipe'),
                safeFetch(supabase.from('plans').select('*').order('price'), 'planos'),
                safeFetch(supabase.from('finances').select('*').gte('date', dateStr).order('date', { ascending: false }), 'financeiro'),
                safeFetch(supabase.from('plan_subscriptions').select('*, customer:customers(name, phone), plan:plans(*)').order('created_at', { ascending: false }), 'assinaturas'),
                safeFetch(supabase.from('promotion_interests').select('*, promotion:promotions(title)').order('created_at', { ascending: false }), 'interesses'),
                safeFetch(supabase.from('customers').select('*').order('name'), 'clientes'),
                safeFetch(supabase.from('user_roles').select('*').order('role'), 'permissões')
            ]);

            setCachedData(prev => ({
                ...prev,
                appointments,
                services,
                artists,
                plans,
                finances,
                subscriptions,
                activeSubs: subscriptions.filter(s => s.status === 'active').length,
                promotion_interests,
                customers,
                user_roles,
                lastUpdate: Date.now()
            }));

        } catch (err) {
            console.error("[Admin] Erro crítico de comunicação:", err);
            // Em caso de erro, removemos o estado de refreshing mas mantemos os dados antigos (cache)
        } finally {
            clearTimeout(loadingTimeout);
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            setGlobalLoading(false);
            setIsInitialLoading(false);
            
            // Se houve pedidos de refresh durante este, fazemos apenas UM após 2 segundos
            if (refreshPendingRef.current) {
                console.log("[Admin] Processando refresh pendente...");
                refreshPendingRef.current = false;
                if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = setTimeout(() => {
                    refreshAllDataImmediate();
                }, 500);
            }
        }
    }, [updateSiteData]);

    const refreshAllData = useCallback((module) => {
        if (module) console.log(`[Admin] Agendando refresh devido a mudança em: ${module}`);
        
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = setTimeout(() => {
            refreshAllDataImmediate();
        }, 500); // Debounce reduzido para agilizar visualização de novos dados
    }, [refreshAllDataImmediate]);

    useEffect(() => {
        if (user) {
            refreshAllDataImmediate();
        }
    }, [user, refreshAllDataImmediate]);

    // Supabase Real-time listener UNIFICADO
    // Use refs to decouple from render cycles and avoid stale closures
    const refreshRef = useRef(refreshAllData);
    useEffect(() => { refreshRef.current = refreshAllData; }, [refreshAllData]);

    const isAdminRef = useRef(isAdmin);
    useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    // Stable notification dispatcher via ref (avoids stale closure in channel callbacks)
    const showNotificationRef = useRef(null);
    showNotificationRef.current = (notif) => {
        console.log(`[Admin] 🔔 DISPARANDO NOTIFICAÇÃO @ ${new Date().toLocaleTimeString()}:`, notif.title);
        
        // Play sound from pre-loaded audio
        try {
            if (notifAudioRef.current) {
                notifAudioRef.current.currentTime = 0;
                const p = notifAudioRef.current.play();
                if (p) p.catch(() => console.warn('[Admin] Som bloqueado pelo navegador — clique na página primeiro.'));
            }
        } catch(e) { console.warn('[Admin] Áudio erro:', e); }
        
        // Update notification queue + show central alert
        setNotificationQueue(q => {
            if (q.some(n => n.id === notif.id)) return q;
            return [notif, ...q];
        });
        setUnreadCount(c => c + 1);
        setActiveAlert(notif);
    };

    useEffect(() => {
        if (!isAdmin) {
            console.log('[Admin Realtime] isAdmin=false, canal não será criado.');
            return;
        }

        const ts = () => new Date().toLocaleTimeString();
        console.log(`[Admin] 📡 Iniciando Master Realtime Channel @ ${ts()}`);
        
        const masterChannel = supabase.channel('admin-master-realtime-v2', {
            config: { broadcast: { self: true } }
        })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, payload => {
                console.log(`[Realtime ${ts()}] ✅ INSERT appointments:`, payload.new?.id);
                showNotificationRef.current({ 
                    id: `appt-${payload.new?.id || Date.now()}`, 
                    title: '🔔 Novo Agendamento!', 
                    message: `Um novo horário (${payload.new?.time?.slice(0,5) || '??:??'}) foi solicitado.`, 
                    type: 'appointment' 
                });
                refreshRef.current('appointments');
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, payload => {
                console.log(`[Realtime ${ts()}] 🔄 UPDATE appointments:`, payload.new?.id, payload.new?.status);
                refreshRef.current('appointments');
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plan_subscriptions' }, payload => {
                console.log(`[Realtime ${ts()}] ✅ INSERT plan_subscriptions:`, payload.new?.id);
                showNotificationRef.current({ 
                    id: `sub-${payload.new?.id || Date.now()}`, 
                    title: '⭐ Nova Assinatura!', 
                    message: 'Um cliente acaba de aderir ao seu Clube!', 
                    type: 'subscription' 
                });
                refreshRef.current('subscriptions');
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'promotion_interests' }, payload => {
                console.log(`[Realtime ${ts()}] ✅ INSERT promotion_interests:`, payload.new?.id);
                showNotificationRef.current({ 
                    id: `promo-${payload.new?.id || Date.now()}`, 
                    title: '🎁 Novo Interesse!', 
                    message: 'Temos um novo cliente interessado em promoções!', 
                    type: 'promo_interest' 
                });
                refreshRef.current('interests');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_subscriptions' }, payload => {
                if (payload.eventType === 'UPDATE') refreshRef.current('subscriptions');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'promotion_interests' }, payload => {
                if (payload.eventType === 'UPDATE') refreshRef.current('interests');
            })
            .subscribe((status, err) => {
                console.log(`[Admin Realtime ${ts()}] Status: ${status}`, err ? `Erro: ${err.message}` : '✅');
                setRealtimeStatus(status);
                
                if (status === 'CHANNEL_ERROR') {
                    console.error('[Admin Realtime] ❌ Canal com erro. Tentando reconectar em 5s...');
                    setTimeout(() => {
                        supabase.removeChannel(masterChannel);
                    }, 5000);
                }
            });

        return () => {
            console.log(`[Admin] Removendo Master Realtime Channel @ ${ts()}`);
            supabase.removeChannel(masterChannel);
        };
    }, [isAdmin]);

    // Auto-dismiss notification after 8 seconds
    useEffect(() => {
        if (activeAlert) {
            const timer = setTimeout(() => {
                setActiveAlert(null);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [activeAlert]);

    const dismissNotification = () => {
        setNotificationQueue(q => q.slice(1));
    };

    const handleNotificationClick = (notif) => {
        let targetTab = 'appointments';
        if (notif?.type === 'subscription') targetTab = 'subscriptions';
        if (notif?.type === 'promo_interest') targetTab = 'promo_interests';

        if (notif) {
            setNotificationQueue(prev => prev.filter(n => n !== notif));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
            setNotificationQueue([]);
            setUnreadCount(0);
        }
        setShowBellPanel(false);
        handleTabChange(targetTab);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setMobileMenuOpen(false);
    };

    const currentTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Dashboard';

    const visibleTabs = TABS.filter(tab => {
        if (isAdmin) return true;
        const allowedForBarber = ['appointments', 'customers', 'academy', 'settings'];
        return allowedForBarber.includes(tab.id);
    });

    return (
        <div className="admin-shell" onClick={() => setShowBellPanel(false)}>
            <OnboardingTour />

            {/* ── Central Pop-up Alert ── */}
            {activeAlert && (
                <div className="admin-central-alert-overlay fade-in">
                    <div className="admin-central-alert bounce-in">
                        <div className="alert-icon-main">
                            {activeAlert.type === 'subscription' ? <Star size={48} color="var(--color-primary)" /> :
                                activeAlert.type === 'promo_interest' ? <Megaphone size={48} color="var(--color-primary)" /> :
                                    <Bell size={48} color="var(--color-primary)" />}
                        </div>
                        <h3>{activeAlert.title}</h3>
                        <p>{activeAlert.message}</p>
                        <div className="alert-actions">
                            <button className="admin-btn-secondary" onClick={() => setActiveAlert(null)}>Fechar</button>
                            <button className="admin-btn-primary" onClick={() => {
                                handleNotificationClick(activeAlert);
                                setActiveAlert(null);
                            }}>Ver Agora</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Mobile Sidebar Overlay ── */}
            <div className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />

            {/* ═══ SIDEBAR ═══ */}
            <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-name">{siteData?.menuTitle || 'StudioFlow'}</div>
                    <div className="sidebar-brand-sub">Management Suite</div>
                </div>

                <nav className="sidebar-nav">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-new-session" onClick={() => { handleTabChange('appointments'); }}>
                        <Plus size={18} /> Nova Sessão
                    </button>
                    <div className="sidebar-links">
                        <button onClick={() => handleTabChange('academy')}><Sparkles size={12} /> Academy</button>
                        <button onClick={() => handleTabChange('settings')}><Settings size={12} /> Config</button>
                    </div>
                </div>
            </aside>

            {/* ═══ MAIN AREA ═══ */}
            {/* Syncing Indicator - High Visibility but non-blocking */}
            {isRefreshing && !globalLoading && (
                <div className="admin-sync-indicator fade-in" style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-primary)',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 10000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                }}>
                    <RefreshCw size={16} className="spin-slow" />
                    <span>Sincronizando...</span>
                </div>
            )}

            <div className="admin-main">
                {/* ── Top Bar ── */}
                <header className="admin-topbar">
                    <div className="admin-topbar-inner">
                        <div className="admin-topbar-left">
                            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                                {mobileMenuOpen ? <X size={22} /> : <LayoutDashboard size={22} />}
                            </button>
                            <span className="admin-topbar-title">{currentTabLabel}</span>
                        </div>
                        <div className="admin-topbar-right">
                            <div className="server-status">
                                {isRefreshing ? (
                                    <span className="server-status-value fade-in" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <RefreshCw size={12} className="spin-slow" />
                                        Sincronizando...
                                    </span>
                                ) : (
                                    <>
                                        <span className="server-status-label">Realtime</span>
                                        <span className="server-status-value" title={`Status: ${realtimeStatus}`}>
                                            <span className={`status-dot ${realtimeStatus === 'SUBSCRIBED' ? 'pulse-dot' : 'offline'}`} 
                                                  style={{ background: realtimeStatus === 'SUBSCRIBED' ? 'var(--color-success)' : '#ef4444' }} />
                                            {realtimeStatus === 'SUBSCRIBED' ? 'Conectado' : realtimeStatus === 'connecting' ? 'Conectando...' : 'Offline'}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Bell */}
                            <div style={{ position: 'relative', display: 'inline-flex' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowBellPanel(!showBellPanel); }}
                                    className={`theme-toggle-btn ${showBellPanel ? 'active' : ''}`}
                                    title={unreadCount > 0 ? `${unreadCount} notificações` : 'Notificações'}
                                    style={{ position: 'relative' }}
                                >
                                    <Bell size={18} />
                                    {notificationQueue.length > 0 && (
                                        <span style={{
                                            position: 'absolute', top: '-4px', right: '-4px',
                                            background: '#ef4444', color: '#fff',
                                            fontSize: '0.6rem', fontWeight: 800,
                                            padding: '1px 5px', borderRadius: '10px',
                                            lineHeight: '14px', minWidth: '16px',
                                            textAlign: 'center', pointerEvents: 'none'
                                        }}>
                                            {notificationQueue.length > 9 ? '9+' : notificationQueue.length}
                                        </span>
                                    )}
                                </button>
                                {showBellPanel && (
                                    <div className="admin-bell-panel glass-panel fade-in" onClick={e => e.stopPropagation()}>
                                        <div className="bell-panel-header">
                                            <h4>Notificações</h4>
                                            {notificationQueue.length > 0 && (
                                                <button onClick={() => { setNotificationQueue([]); setUnreadCount(0); }} className="text-primary" style={{ fontSize: '0.75rem' }}>Limpar</button>
                                            )}
                                        </div>
                                        <div className="bell-panel-content">
                                            {notificationQueue.length === 0 ? (
                                                <div className="bell-empty">Nenhuma nova notificação</div>
                                            ) : notificationQueue.map((notif, idx) => (
                                                <div key={idx} className="bell-item" onClick={() => handleNotificationClick(notif)}>
                                                    <div className="bell-item-icon"><Bell size={14} /></div>
                                                    <div className="bell-item-text">
                                                        <div className="bell-item-title">{notif.title}</div>
                                                        <div className="bell-item-msg">{notif.message}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={toggleTheme} className="theme-toggle-btn" title="Alternar Tema">
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            <button onClick={handleLogout} title="Sair" className="theme-toggle-btn" style={{ color: '#ef4444' }}>
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    {isInitialLoading || !user ? (
                        <SkeletonLoader />
                    ) : (isAdmin === null) ? (
                        <div className="tab-loading-placeholder fade-in">
                            <div className="loading-spinner-glow"></div>
                            <p>Sincronizando perfil de acesso...</p>
                        </div>
                    ) : (
                        <TabErrorBoundary key={activeTab}>
                            <div className="tab-content-wrapper fade-in">
                                {(activeTab === 'dashboard' && isAdmin) && <DashboardTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {activeTab === 'appointments' && (
                                    <AppointmentsTab 
                                        appointments={cachedData.appointments} 
                                        loading={isRefreshing && cachedData.appointments.length === 0} 
                                        refreshAll={refreshAllData} 
                                    />
                                )}
                                {activeTab === 'subscriptions' && <SubscriptionsTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {activeTab === 'academy' && <AcademyTab />}
                                {activeTab === 'customers' && <CustomersTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {(activeTab === 'services' && isAdmin) && <ServicesTab services={cachedData.services} loading={isRefreshing && cachedData.services.length === 0} refresh={refreshAllData} updateSiteData={updateSiteData} />}
                                {(activeTab === 'team_management' && isAdmin) && <TeamManagementTab isAdmin={isAdmin} cachedData={cachedData} refreshAll={refreshAllData} />}
                                {(activeTab === 'categories' && isAdmin) && <CategoriesTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {(activeTab === 'gallery' && isAdmin) && <GalleryTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {(activeTab === 'finances' && isAdmin) && <FinancesTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {(activeTab === 'stock' && isAdmin) && <StockTab cachedData={cachedData} refreshAll={refreshAllData} />}
                                {activeTab === 'settings' && <SettingsTab siteData={siteData || {}} updateSiteData={updateSiteData} />}
                                {(activeTab === 'planspromos' && isAdmin) && <PlansPromosTab cachedData={cachedData} refreshAll={refreshAllDataImmediate} />}
                                {(activeTab === 'promo_interests' && isAdmin) && <PromotionInterestsTab cachedData={cachedData} refreshAll={refreshAllData} />}

                                {!isAdmin && ['dashboard', 'services', 'team_management', 'categories', 'gallery', 'finances', 'stock', 'planspromos', 'promo_interests', 'subscriptions'].includes(activeTab) && (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <Ban size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                                        <h3>Acesso Restrito</h3>
                                        <p>Apenas o administrador da barbearia tem acesso a esta funcionalidade.</p>
                                        <button className="admin-btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveTab('appointments')}>Ir para Agendamentos</button>
                                    </div>
                                )}
                            </div>
                        </TabErrorBoundary>
                    )}
                </main>

            </div>
        </div>
    );
};

export default Admin;
