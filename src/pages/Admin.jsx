import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SiteContext } from '../context/SiteContext';
import { supabase, uploadStorageFile, compressToWebP } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, CalendarDays, Scissors, Users, Settings, LogOut,
    Plus, Trash2, Save, Pencil, X, Check, Ban, Trophy, Bell, RefreshCw, ChevronDown, User, TrendingUp, Image as ImageIcon, Tag, Eye,
    ChevronLeft, ChevronRight, Maximize2, Sun, Moon, Download, Megaphone, Star
} from 'lucide-react';
import * as XLSX from 'xlsx';
import '../styles/Admin.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

const STATUS_LABELS = {
    pending: { label: 'Pendente', color: 'var(--color-primary)' },
    confirmed: { label: 'Confirmado', color: '#4ade80' },
    active: { label: 'Ativo', color: '#4ade80' },
    cancelled: { label: 'Cancelado', color: '#ef4444' },
    finished: { label: 'Finalizado', color: '#a78bfa' },
    expired: { label: 'Expirado', color: '#f87171' },
};

const StatusBadge = ({ status }) => {
    const s = STATUS_LABELS[status] || STATUS_LABELS.pending;
    return (
        <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
            background: s.color + '22', color: s.color, whiteSpace: 'nowrap'
        }}>{s.label}</span>
    );
};

const StatCard = ({ icon, label, value, color = 'var(--color-primary)' }) => (
    <div className="admin-stat-card glass-panel">
        <span style={{ fontSize: '2rem' }}>{icon}</span>
        <div>
            <p className="stat-label">{label}</p>
            <h3 className="stat-value" style={{ color }}>{value}</h3>
        </div>
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div className="admin-modal-overlay" onClick={onClose}>
        <div className="admin-modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
                <h3>{title}</h3>
                <button onClick={onClose} className="admin-modal-close"><X size={20} /></button>
            </div>
            {children}
        </div>
    </div>
);

// ─── TabBar ─────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'appointments', icon: <CalendarDays size={18} />, label: 'Agendamentos' },
    { id: 'subscriptions', icon: <User size={18} />, label: 'Mensalistas' },
    { id: 'customers', icon: <Users size={18} />, label: 'Clientes' },
    { id: 'services', icon: <Scissors size={18} />, label: 'Serviços' },
    { id: 'planspromos', icon: <Megaphone size={18} />, label: 'Planos & Promoções' },
    { id: 'artists', icon: <Trophy size={18} />, label: 'Profissionais' },
    { id: 'categories', icon: <Tag size={18} />, label: 'Categorias' },
    { id: 'gallery', icon: <ImageIcon size={18} />, label: 'Galeria' },
    { id: 'finances', icon: <TrendingUp size={18} />, label: 'Financeiro' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Configurações' },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
const Admin = () => {
    const { siteData, updateSiteData, theme, toggleTheme } = useContext(SiteContext);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [notificationQueue, setNotificationQueue] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showBellPanel, setShowBellPanel] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null); // Central pop-up alert

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

    // Supabase Real-time listener for New Appointments AND Subscriptions
    useEffect(() => {
        const appointmentChannel = supabase.channel('admin-appointments-notify')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, payload => {
                // Play notification sound
                try {
                    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-30.mp3');
                    audio.volume = 0.5;
                    audio.play();
                } catch (e) { console.warn("Audio autoplay blocked"); }

                // Add to persistent notification queue (accumulates multiple)
                const id = Date.now();
                const newNotif = {
                    id,
                    type: 'appointment',
                    title: '🔔 Novo Agendamento!',
                    message: 'Um novo pedido de agendamento foi recebido. Confira na aba Agendamentos.'
                };
                setNotificationQueue(q => [...q, newNotif]);
                setUnreadCount(c => c + 1);
                setActiveAlert(newNotif);
            })
            .subscribe();

        const subscriptionChannel = supabase.channel('admin-subscriptions-notify')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plan_subscriptions' }, payload => {
                try {
                    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-30.mp3');
                    audio.volume = 0.5;
                    audio.play();
                } catch (e) { console.warn("Audio autoplay blocked"); }

                const id = Date.now();
                const newNotif = {
                    id,
                    type: 'subscription',
                    title: '⭐ Nova Assinatura de Plano!',
                    message: 'Um cliente preencheu os dados para assinar um plano. Confira na aba Mensalistas.'
                };
                setNotificationQueue(q => [...q, newNotif]);
                setUnreadCount(c => c + 1);
                setActiveAlert(newNotif);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(appointmentChannel);
            supabase.removeChannel(subscriptionChannel);
        };
    }, []);

    const scrollNav = (direction) => {
        if (navRef.current) {
            const scrollAmount = direction === 'left' ? -200 : 200;
            navRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Helper: dismiss the current (first) notification in the queue
    const dismissNotification = () => {
        setNotificationQueue(q => q.slice(1));
    };

    // Navigate to respective tab and clear badge
    const handleNotificationClick = (notif) => {
        const targetTab = notif?.type === 'subscription' ? 'subscriptions' : 'appointments';
        // Se clicar em uma notificação específica, remove só ela
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

    return (
        <div className="admin-shell" onClick={() => setShowBellPanel(false)}>
            {/* ── Central Pop-up Alert ── */}
            {activeAlert && (
                <div className="admin-central-alert-overlay fade-in">
                    <div className="admin-central-alert glass-panel bounce-in">
                        <div className="alert-icon-main">
                            {activeAlert.type === 'subscription' ? <Star size={40} className="neon-text" /> : <Bell size={40} className="neon-text" />}
                        </div>
                        <h3>{activeAlert.title}</h3>
                        <p>{activeAlert.message}</p>
                        <div className="alert-actions">
                            <button className="admin-btn-secondary" onClick={() => setActiveAlert(null)}>Fechar</button>
                            <button className="admin-btn-primary neon-glow" onClick={() => {
                                handleNotificationClick(activeAlert);
                                setActiveAlert(null);
                            }}>Ver Agora</button>
                        </div>
                    </div>
                </div>
            )}


            {/* ── Top Bar ── */}
            <header className="admin-topbar">
                <div className="admin-topbar-inner">
                    <div className="admin-topbar-left">
                        <span className="admin-topbar-title">Painel Admin</span>
                        <div className="admin-nav-wrapper">
                            {showLeftScroll && (
                                <button className="nav-scroll-btn left" onClick={() => scrollNav('left')}>
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            <div className={`nav-fade-mask ${showLeftScroll ? 'has-left' : ''} ${showRightScroll ? 'has-right' : ''}`}>
                                <nav className="admin-desktop-nav" ref={navRef} onScroll={handleScroll}>
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                                            onClick={() => handleTabChange(tab.id)}
                                        >
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            {showRightScroll && (
                                <button className="nav-scroll-btn right" onClick={() => scrollNav('right')}>
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="admin-topbar-right">
                        {/* Bell Button with Badge */}
                        <div style={{ position: 'relative', display: 'inline-flex' }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBellPanel(!showBellPanel);
                                }}
                                className={`theme-toggle-btn ${showBellPanel ? 'active' : ''}`}
                                title={unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Notificações'}
                                style={{ marginRight: '4px', position: 'relative' }}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-4px', right: '-4px',
                                        background: '#ef4444', color: '#fff',
                                        fontSize: '0.6rem', fontWeight: 800,
                                        padding: '1px 5px', borderRadius: '10px',
                                        lineHeight: '14px', minWidth: '16px',
                                        textAlign: 'center', pointerEvents: 'none'
                                    }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* ── Bell Dropdown Panel ── */}
                            {showBellPanel && (
                                <div className="admin-bell-panel glass-panel fade-in" onClick={e => e.stopPropagation()}>
                                    <div className="bell-panel-header">
                                        <h4>Notificações Recentes</h4>
                                        {notificationQueue.length > 0 && (
                                            <button onClick={() => { setNotificationQueue([]); setUnreadCount(0); }} className="text-primary" style={{ fontSize: '0.75rem' }}>Limpar Todas</button>
                                        )}
                                    </div>
                                    <div className="bell-panel-content">
                                        {notificationQueue.length === 0 ? (
                                            <div className="bell-empty">Nenhuma nova notificação</div>
                                        ) : (
                                            notificationQueue.map((notif, idx) => (
                                                <div key={idx} className="bell-item" onClick={() => handleNotificationClick(notif)}>
                                                    <div className="bell-item-icon">
                                                        <Bell size={16} />
                                                    </div>
                                                    <div className="bell-item-text">
                                                        <div className="bell-item-title">{notif.title}</div>
                                                        <div className="bell-item-msg">{notif.message}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={toggleTheme} className="theme-toggle-btn" title="Alternar Tema" style={{ marginRight: '8px' }}>
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="admin-logout-btn" onClick={handleLogout} title="Sair" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                            <LogOut size={20} />
                        </button>
                        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <ChevronDown size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Mobile Navigation ── */}
            <nav className={`mobile-navigation ${mobileMenuOpen ? 'open' : ''}`}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* ── Tab Content ── */}
            <main className="admin-content">
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'appointments' && <AppointmentsTab />}
                {activeTab === 'subscriptions' && <SubscriptionsTab />}
                {activeTab === 'customers' && <CustomersTab />}
                {activeTab === 'services' && <ServicesTab siteData={siteData} updateSiteData={updateSiteData} />}
                {activeTab === 'artists' && <ArtistsTab siteData={siteData} updateSiteData={updateSiteData} />}
                {activeTab === 'categories' && <CategoriesTab />}
                {activeTab === 'gallery' && <GalleryTab />}
                {activeTab === 'finances' && <FinancesTab />}
                {activeTab === 'settings' && <SettingsTab siteData={siteData} updateSiteData={updateSiteData} />}
                {activeTab === 'planspromos' && <PlansPromosTab />}
            </main>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// PLANS & PROMOTIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
const PlansPromosTab = () => {
    const [plans, setPlans] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Plan Modal
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planForm, setPlanForm] = useState({ id: null, title: '', price: 0, period: 'por sessão', usage_limits: { cortes: 0, barbas: 0, bebidas: 0 }, is_popular: false, active: true, whatsapp_message: '' });

    // Promo Modal
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoForm, setPromoForm] = useState({ id: null, title: '', description: '', image_url: '', active: true });
    const [uploading, setUploading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [plansRes, promosRes] = await Promise.all([
            supabase.from('plans').select('*').order('price'),
            supabase.from('promotions').select('*').order('created_at', { ascending: false })
        ]);
        setPlans(plansRes.data || []);
        setPromotions(promosRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openPlan = (plan = null) => {
        if (plan) {
            const usage_limits = plan.usage_limits || { cortes: 0, barbas: 0, bebidas: 0 };
            setPlanForm({ ...plan, usage_limits, whatsapp_message: plan.whatsapp_message || '' });
        } else {
            setPlanForm({ id: null, title: '', price: 0, period: 'por mês', usage_limits: { cortes: 0, barbas: 0, bebidas: 0 }, is_popular: false, active: true, whatsapp_message: '' });
        }
        setShowPlanModal(true);
    };

    const savePlan = async () => {
        if (!planForm.title) return alert('O título é obrigatório');

        const limits = planForm.usage_limits;
        const autoFeatures = [];
        if (limits.cortes > 0) autoFeatures.push(`${limits.cortes} Corte${limits.cortes > 1 ? 's' : ''}`);
        if (limits.barbas > 0) autoFeatures.push(`${limits.barbas} Barba${limits.barbas > 1 ? 's' : ''}`);
        if (limits.bebidas > 0) autoFeatures.push(`${limits.bebidas} Bebida${limits.bebidas > 1 ? 's' : ''}`);

        const payload = {
            title: planForm.title,
            price: planForm.price,
            period: planForm.period,
            usage_limits: planForm.usage_limits,
            features: autoFeatures,
            is_popular: planForm.is_popular,
            active: planForm.active,
            whatsapp_message: planForm.whatsapp_message
        };

        if (planForm.id) {
            await supabase.from('plans').update(payload).eq('id', planForm.id);
        } else {
            await supabase.from('plans').insert([payload]);
        }
        setShowPlanModal(false);
        fetchData();
    };

    const deletePlan = async (id) => {
        if (!confirm('Excluir este plano?')) return;
        await supabase.from('plans').delete().eq('id', id);
        fetchData();
    };

    const openPromo = (promo = null) => {
        if (promo) {
            setPromoForm({ ...promo });
        } else {
            setPromoForm({ id: null, title: '', description: '', image_url: '', active: true });
        }
        setShowPromoModal(true);
    };

    const handlePromoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const fileName = `promos/${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setPromoForm(f => ({ ...f, image_url: publicUrl }));
        } catch (error) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    const savePromo = async () => {
        if (!promoForm.title || !promoForm.description) return alert('Título e descrição são obrigatórios');

        const payload = {
            title: promoForm.title,
            description: promoForm.description,
            image_url: promoForm.image_url,
            active: promoForm.active
        };

        if (promoForm.id) {
            await supabase.from('promotions').update(payload).eq('id', promoForm.id);
        } else {
            await supabase.from('promotions').insert([payload]);
        }
        setShowPromoModal(false);
        fetchData();
    };

    const deletePromo = async (id) => {
        if (!confirm('Excluir esta promoção?')) return;
        await supabase.from('promotions').delete().eq('id', id);
        fetchData();
    };

    return (
        <div className="fade-in">
            {/* Promoções Section */}
            <div className="admin-section-header">
                <h2 className="admin-section-title">Promoções em Destaque</h2>
                <button className="admin-add-btn neon-glow" onClick={() => openPromo()}><Plus size={16} /> <span>Nova Promoção</span></button>
            </div>
            {loading ? <div className="admin-loading">Carregando...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    {promotions.map(promo => (
                        <div key={promo.id} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', borderLeft: promo.active ? '4px solid #4ade80' : '4px solid #888' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{promo.title}</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', whiteSpace: 'pre-line', marginBottom: '16px' }}>{promo.description}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="action-btn edit" onClick={() => openPromo(promo)}><Pencil size={16} /></button>
                                    <button className="action-btn delete" onClick={() => deletePromo(promo.id)}><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {promo.image_url && <img src={promo.image_url} alt="Promo" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginTop: '10px' }} />}
                        </div>
                    ))}
                    {promotions.length === 0 && <p className="admin-empty">Nenhuma promoção ativa</p>}
                </div>
            )}

            {/* Planos Section */}
            <div className="admin-section-header">
                <h2 className="admin-section-title">Planos de Sessão</h2>
                <button className="admin-add-btn neon-glow" onClick={() => openPlan()}><Plus size={16} /> <span>Novo Plano</span></button>
            </div>
            {loading ? <div className="admin-loading">Carregando...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {plans.map(plan => (
                        <div key={plan.id} className="glass-panel" style={{ padding: '20px', borderRadius: '12px', borderLeft: plan.active ? '4px solid var(--color-primary)' : '4px solid #888' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{plan.title}</h3>
                                        {plan.is_popular && <span style={{ background: 'var(--color-primary)', color: '#000', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>POPULAR</span>}
                                    </div>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '16px' }}>R$ {plan.price} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>{plan.period}</span></p>
                                    <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '16px' }}>
                                        {(plan.features || []).map((feat, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{feat}</li>)}
                                    </ul>
                                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '10px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                                        <strong>Mensagem Zap:</strong> {plan.whatsapp_message || 'Padrão'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="action-btn edit" onClick={() => openPlan(plan)}><Pencil size={16} /></button>
                                    <button className="action-btn delete" onClick={() => deletePlan(plan.id)}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {plans.length === 0 && <p className="admin-empty">Nenhum plano cadastrado</p>}
                </div>
            )}

            {showPlanModal && (
                <Modal title={planForm.id ? 'Editar Plano' : 'Novo Plano'} onClose={() => setShowPlanModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Título do Plano *</label>
                            <input type="text" className="app-form-control" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Preço (R$) *</label>
                                <input type="number" className="app-form-control" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Período (Ex: por sessão)</label>
                                <input type="text" className="app-form-control" value={planForm.period} onChange={e => setPlanForm({ ...planForm, period: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Limites do Plano (Mensalistas)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '4px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>✂️ Cortes</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px' }}>
                                        <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, cortes: Math.max(0, planForm.usage_limits.cortes - 1) } })}>-</button>
                                        <span style={{ fontWeight: 'bold' }}>{planForm.usage_limits.cortes}</span>
                                        <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, cortes: planForm.usage_limits.cortes + 1 } })}>+</button>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>🧔 Barbas</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px' }}>
                                        <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, barbas: Math.max(0, planForm.usage_limits.barbas - 1) } })}>-</button>
                                        <span style={{ fontWeight: 'bold' }}>{planForm.usage_limits.barbas}</span>
                                        <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, barbas: planForm.usage_limits.barbas + 1 } })}>+</button>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>🥃 Bebidas</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px' }}>
                                        <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, bebidas: Math.max(0, planForm.usage_limits.bebidas - 1) } })}>-</button>
                                        <span style={{ fontWeight: 'bold' }}>{planForm.usage_limits.bebidas}</span>
                                        <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, bebidas: planForm.usage_limits.bebidas + 1 } })}>+</button>
                                    </div>
                                </div>
                            </div>
                            <small style={{ color: '#888', marginTop: '8px', display: 'block' }}>Os "Itens Inclusos" exibidos no site serão gerados automaticamente com base nestes números.</small>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Mensagem WhatsApp (Pré-definida para o cliente)</label>
                        <textarea className="app-form-control" rows={2} placeholder="Ex: Olá! Tenho interesse no plano XYZ..." value={planForm.whatsapp_message} onChange={e => setPlanForm({ ...planForm, whatsapp_message: e.target.value })}></textarea>
                        <small style={{ color: '#888' }}>Esta mensagem aparecerá no zap do cliente ao clicar no botão.</small>
                    </div>
                    <div className="form-group flex-row-center" style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" id="planActive" checked={planForm.active} onChange={e => setPlanForm({ ...planForm, active: e.target.checked })} />
                            <label htmlFor="planActive" style={{ margin: 0 }}>Ativo</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" id="planPopular" checked={planForm.is_popular} onChange={e => setPlanForm({ ...planForm, is_popular: e.target.checked })} />
                            <label htmlFor="planPopular" style={{ margin: 0 }}>Mais Popular (Destaque)</label>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button className="admin-btn-secondary" onClick={() => setShowPlanModal(false)}>Cancelar</button>
                        <button className="admin-btn-primary neon-glow" onClick={savePlan}><Save size={16} /> Salvar</button>
                    </div>
                </Modal>
            )}

            {showPromoModal && (
                <Modal title={promoForm.id ? 'Editar Promoção' : 'Nova Promoção'} onClose={() => setShowPromoModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Título da Promoção *</label>
                            <input type="text" className="app-form-control" placeholder="Ex: Dia do Noivo" value={promoForm.title} onChange={e => setPromoForm({ ...promoForm, title: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Descrição *</label>
                            <textarea className="app-form-control" rows={4} placeholder="Detalhes da promoção..." value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })}></textarea>
                        </div>
                        <div className="form-group">
                            <label>Imagem de Destaque (Opcional)</label>
                            {promoForm.image_url ? (
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Pré-visualização:</p>
                                        <button className="admin-btn-secondary" onClick={() => setPromoForm(f => ({ ...f, image_url: '' }))} type="button" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                            Remover / Trocar
                                        </button>
                                    </div>
                                    <img src={promoForm.image_url} alt="preview" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={handlePromoUpload} disabled={uploading} className="form-input" />
                            )}
                            {uploading && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Processando e reduzindo tamanho...</div>}
                        </div>
                        <div className="form-group flex-row-center" style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" id="promoActive" checked={promoForm.active} onChange={e => setPromoForm({ ...promoForm, active: e.target.checked })} />
                                <label htmlFor="promoActive" style={{ margin: 0 }}>Ativa (Visível na página principal)</label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowPromoModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={savePromo}><Save size={16} /> Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB

// ══════════════════════════════════════════════════════════════════════════════
const DashboardTab = () => {
    const [stats, setStats] = useState({ todayAppointments: 0, newCustomers: 0, completedSessions: 0, revenue: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const today = new Date().toISOString().split('T')[0];

                // 1. Agendamentos Hoje
                const { count: countToday } = await supabase
                    .from('appointments')
                    .select('*', { count: 'exact', head: true })
                    .eq('date', today);

                // 2. Clientes Novos Hoje
                const { count: countCustomers } = await supabase
                    .from('customers')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', today);

                // 3. Sessões Finalizadas de hoje
                const { data: completedData } = await supabase
                    .from('appointments')
                    .select('session_price')
                    .eq('date', today)
                    .eq('status', 'finished');

                const appRevenue = (completedData || []).reduce((acc, curr) => acc + (parseFloat(curr.session_price) || 0), 0);

                // 4. Faturamento via tabela finances (hoje)
                const { data: financesData } = await supabase
                    .from('finances')
                    .select('amount')
                    .eq('date', today)
                    .eq('type', 'income');

                const finRevenue = (financesData || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

                setStats({
                    todayAppointments: countToday || 0,
                    newCustomers: countCustomers || 0,
                    completedSessions: (completedData || []).length,
                    revenue: appRevenue + finRevenue
                });
            } catch (err) {
                console.error('Erro ao carregar dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="admin-loading">Carregando painel...</div>;

    return (
        <div className="fade-in">
            <h2 className="admin-section-title">Painel de Controle</h2>
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-icon-wrapper"><CalendarDays size={24} /></div>
                    <div>
                        <p>Agendamentos Hoje</p>
                        <h3>{stats.todayAppointments}</h3>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-icon-wrapper" style={{ color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)' }}><Users size={24} /></div>
                    <div>
                        <p>Clientes Novos</p>
                        <h3>{stats.newCustomers}</h3>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-icon-wrapper" style={{ color: '#A78BFA', background: 'rgba(167, 139, 250, 0.1)' }}><Trophy size={24} /></div>
                    <div>
                        <p>Sessões Realizadas</p>
                        <h3>{stats.completedSessions}</h3>
                    </div>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-icon-wrapper" style={{ color: '#FF7A00', background: 'rgba(255, 122, 0, 0.1)' }}><TrendingUp size={24} /></div>
                    <div>
                        <p>Faturamento Hoje</p>
                        <h3>R$ {stats.revenue.toFixed(2)}</h3>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════
const AppointmentsTab = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ date: '', status: '', service: '' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('appointments').select(`
            *,
            customers (name, phone),
            services (name),
            artists (name)
        `).order('created_at', { ascending: false });
        if (filters.date) query = query.eq('date', filters.date);
        if (filters.status) query = query.eq('status', filters.status);
        // Note: Filter by service_name removed as the column is now handled via relational join
        // We could filter by service_id if needed, but for now we skip the text filter or use ilike on the join if possible.
        const { data } = await query;
        setAppointments(data || []);
        setSelectedIds([]);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    const updateStatus = async (id, status) => {
        await supabase.from('appointments').update({ status }).eq('id', id);
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const deleteAppointment = async (id) => {
        if (!confirm('Excluir este agendamento?')) return;
        await supabase.from('appointments').delete().eq('id', id);
        setAppointments(prev => prev.filter(a => a.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(appointments.map(a => a.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        if (bulkAction === 'delete') {
            if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} agendamento(s)?`)) return;
            await supabase.from('appointments').delete().in('id', selectedIds);
            setAppointments(prev => prev.filter(a => !selectedIds.includes(a.id)));
        } else {
            // It's a status update
            if (!confirm(`Tem certeza que deseja alterar o status de ${selectedIds.length} agendamento(s) para '${bulkAction}'?`)) return;
            await supabase.from('appointments').update({ status: bulkAction }).in('id', selectedIds);
            setAppointments(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: bulkAction } : a));
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Agendamentos</h2>
                <button className="admin-refresh-btn" onClick={fetchAppointments}><RefreshCw size={16} /> Atualizar</button>
            </div>

            {/* Filters */}
            <div className="admin-filters glass-panel">
                <input type="date" className="admin-filter-input" value={filters.date}
                    onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
                <select className="admin-filter-input" value={filters.status}
                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="">Todos os status</option>
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="finished">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                </select>
                <input type="text" className="admin-filter-input" placeholder="Filtrar por serviço..."
                    value={filters.service} onChange={e => setFilters(f => ({ ...f, service: e.target.value }))} />
                {(filters.date || filters.status || filters.service) && (
                    <button className="admin-clear-btn" onClick={() => setFilters({ date: '', status: '', service: '' })}>
                        <X size={14} /> Limpar
                    </button>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="admin-bulk-actions glass-panel">
                    <span style={{ fontWeight: 'bold' }}>{selectedIds.length} selecionado(s)</span>
                    <select className="form-input" style={{ width: 'auto', padding: '8px', flex: 1, maxWidth: '250px' }} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                        <option value="">Ações em massa...</option>
                        <option value="pending">Marcar como Pendente</option>
                        <option value="confirmed">Marcar como Confirmado</option>
                        <option value="finished">Marcar como Finalizado</option>
                        <option value="cancelled">Marcar como Cancelado</option>
                        <option value="delete">Excluir Selecionados</option>
                    </select>
                    <button className="admin-btn-primary" style={{ padding: '8px 16px' }} onClick={handleBulkAction} disabled={!bulkAction}>Aplicar</button>
                    <button className="admin-btn-secondary" style={{ padding: '8px 16px', marginLeft: 'auto' }} onClick={() => setSelectedIds([])}><X size={14} /> Limpar</button>
                </div>
            )}

            {loading ? (
                <div className="admin-loading">Carregando agendamentos...</div>
            ) : appointments.length === 0 ? (
                <div className="admin-empty">Nenhum agendamento encontrado.</div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === appointments.length && appointments.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Data / Hora</th>
                                <th>Cliente / Contato</th>
                                <th>Serviço e Valores (Sinal)</th>
                                <th>Profissional</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map(app => (
                                <tr key={app.id} style={selectedIds.includes(app.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(app.id)}
                                            onChange={() => toggleSelectOne(app.id)}
                                            style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td>
                                        <strong>{app.date?.split('-').reverse().join('/')}</strong>
                                        <br /><span className="table-muted">{app.time}</span>
                                    </td>
                                    <td>
                                        <strong>{app.customers?.name || 'Cliente'}</strong>
                                        <br /><span className="table-muted">{app.customers?.phone || '-'}</span>
                                    </td>
                                    <td>
                                        <strong>{app.services?.name || 'Serviço'}</strong>
                                        <br /><span className="table-muted">Total: R$ {parseFloat(app.session_price || 0).toFixed(2)}</span>
                                        {app.deposit_price > 0 && (
                                            <div style={{ fontSize: '0.8rem', marginTop: '4px', color: app.deposit_status === 'paid' ? '#4ade80' : '#facc15' }}>
                                                Sinal: R$ {parseFloat(app.deposit_price).toFixed(2)} ({app.deposit_status === 'paid' ? 'Pago' : 'Pendente'})
                                            </div>
                                        )}
                                    </td>
                                    <td>{app.artists?.name || '-'}</td>
                                    <td><StatusBadge status={app.status} /></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-btn confirm" title="Confirmar" onClick={() => updateStatus(app.id, 'confirmed')}><Check size={14} /></button>
                                            <button className="action-btn finish" title="Finalizar" onClick={() => updateStatus(app.id, 'finished')}><Trophy size={14} /></button>
                                            <button className="action-btn cancel" title="Cancelar" onClick={() => updateStatus(app.id, 'cancelled')}><Ban size={14} /></button>
                                            <button className="action-btn delete" title="Excluir" onClick={() => deleteAppointment(app.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS (MENSALISTAS) TAB
// ══════════════════════════════════════════════════════════════════════════════
const SubscriptionsTab = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const fetchSubscriptions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('plan_subscriptions')
            .select(`
                *,
                customer:customers(name, phone),
                plan:plans(title, price, period, usage_limits),
                artist:artists(name)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSubscriptions(data);
            setSelectedIds([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSubscriptions();

        // Load artists for the preferred barber select
        supabase.from('artists').select('id, name').then(({ data }) => {
            if (data) setArtists(data);
        });

        // Real-time listener to refresh list automatically (unique channel name to avoid conflict)
        const channel = supabase.channel('subscriptions-tab-refresh')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_subscriptions' }, () => {
                fetchSubscriptions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleEdit = (sub) => {
        // Inicializar com zeros se estiver vazio
        const initialUsage = sub.features_usage || { cortes: 0, barbas: 0, bebidas: 0 };
        setSelectedSub({ ...sub, features_usage: initialUsage });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        const { error } = await supabase
            .from('plan_subscriptions')
            .update({
                status: selectedSub.status,
                notes: selectedSub.notes,
                features_usage: selectedSub.features_usage,
                start_month: selectedSub.start_month,
                preferred_barber: selectedSub.preferred_barber
            })
            .eq('id', selectedSub.id);

        if (!error) {
            setSubscriptions(prev => prev.map(s => s.id === selectedSub.id ? selectedSub : s));
            setIsEditModalOpen(false);
        } else {
            alert('Erro ao salvar assinante.');
        }
    };

    const handleApproveSubscription = async (sub) => {
        const clientName = sub.customer?.name || 'Cliente';
        if (!confirm(`Confirmar pagamento e ativar o plano ${sub.plan?.title || 'Plano'} para ${clientName}?`)) return;

        try {
            const now = new Date();
            const expiresAt = new Date();
            // Default to 1 month (30 days)
            expiresAt.setDate(now.getDate() + 30);

            // 1. Update subscription status and expiration dates
            const { error: subError } = await supabase
                .from('plan_subscriptions')
                .update({
                    status: 'active',
                    activated_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    notes: `${sub.notes || ''}\n[Sistema] Pago e aprovado em ${now.toLocaleDateString('pt-BR')}`
                })
                .eq('id', sub.id);

            if (subError) throw subError;

            // 2. Log in Finances
            const { error: finError } = await supabase
                .from('finances')
                .insert([{
                    description: `Mensalidade: ${sub.plan?.title || 'Plano'} (${clientName})`,
                    amount: sub.plan?.price || 0,
                    type: 'income',
                    category: 'mensalidade'
                }]);

            if (finError) throw finError;

            alert('Plano ativado e faturamento registrado com sucesso!');
            fetchSubscriptions();
        } catch (error) {
            console.error('Error approving sub:', error);
            alert('Erro ao processar aprovação: ' + error.message);
        }
    };

    const handleRenew = async (sub) => {
        const clientName = sub.customer?.name || 'Cliente';
        if (!confirm(`Gerar nova oferta de renovação para ${clientName}? Uma nova entrada pendente será criada.`)) return;

        try {
            // Clone the subscription as a new pending entry
            const { data, error } = await supabase
                .from('plan_subscriptions')
                .insert([{
                    customer_id: sub.customer_id,
                    plan_id: sub.plan_id,
                    artist_id: sub.artist_id,
                    status: 'pending',
                    notes: `[Sistema] Oferta de renovação baseada na assinatura anterior (${sub.id}).`,
                    start_month: sub.start_month,
                    features_usage: {} // Reset usage for new period
                }])
                .select();

            if (error) throw error;

            alert('Nova oferta de renovação criada como "Pendente"!');

            // Optional: Open WhatsApp with the new link or message
            const phone = (sub.customer?.phone || '').replace(/\D/g, '');
            const msg = encodeURIComponent(`Olá ${sub.customer?.name}! Geramos uma nova oferta de renovação para o seu plano "${sub.plan?.title}". Assim que realizar o pagamento, me avise para ativarmos seu novo período!`);
            window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');

            fetchSubscriptions();
        } catch (error) {
            console.error('Error renewing sub:', error);
            alert('Erro ao gerar renovação: ' + error.message);
        }
    };

    const calculateRemainingDays = (expiresAt) => {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt) - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta assinatura?')) return;
        await supabase.from('plan_subscriptions').delete().eq('id', id);
        setSubscriptions(prev => prev.filter(s => s.id !== id));
    };

    const incrementUsage = (key, delta = 1) => {
        setSelectedSub(prev => ({
            ...prev,
            features_usage: {
                ...prev.features_usage,
                [key]: Math.max(0, (prev.features_usage[key] || 0) + delta)
            }
        }));
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(subscriptions.map(s => s.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        if (bulkAction === 'delete') {
            if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} assinatura(s)?`)) return;
            const { error } = await supabase.from('plan_subscriptions').delete().in('id', selectedIds);
            if (error) alert('Erro ao excluir algumas assinaturas.');
            setSubscriptions(prev => prev.filter(s => !selectedIds.includes(s.id)));
        } else {
            // Bulk status update
            if (!confirm(`Tem certeza que deseja alterar o status de ${selectedIds.length} assinatura(s) para '${bulkAction}'?`)) return;
            const { error } = await supabase.from('plan_subscriptions').update({ status: bulkAction }).in('id', selectedIds);
            if (error) alert('Erro ao atualizar algumas assinaturas.');
            setSubscriptions(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, status: bulkAction } : s));
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <div>
                    <h2 className="admin-section-title">Mensalistas</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>Gerencie clientes que assinaram planos recorrentes ou pacotes de sessões.</p>
                </div>
                <button className="admin-refresh-btn" onClick={fetchSubscriptions}><RefreshCw size={16} /> Atualizar</button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="admin-bulk-actions glass-panel" style={{ marginTop: '20px' }}>
                    <span style={{ fontWeight: 'bold' }}>{selectedIds.length} selecionado(s)</span>
                    <select
                        className="form-input"
                        style={{ width: 'auto', padding: '8px', flex: 1, maxWidth: '250px' }}
                        value={bulkAction}
                        onChange={e => setBulkAction(e.target.value)}
                    >
                        <option value="">Ações em massa...</option>
                        <option value="pending">Marcar como Pendente</option>
                        <option value="active">Marcar como Ativo</option>
                        <option value="completed">Marcar como Concluído</option>
                        <option value="cancelled">Marcar como Cancelado</option>
                        <option value="delete">Excluir Selecionados</option>
                    </select>
                    <button
                        className="admin-btn-primary"
                        style={{ padding: '8px 16px' }}
                        onClick={handleBulkAction}
                        disabled={!bulkAction}
                    >Aplicar</button>
                    <button
                        className="admin-btn-secondary"
                        style={{ padding: '8px 16px', marginLeft: 'auto' }}
                        onClick={() => setSelectedIds([])}
                    ><X size={14} /> Limpar</button>
                </div>
            )}

            {loading ? <p>Carregando assinantes...</p> : (
                <div className="admin-table-wrap glass-panel" style={{ marginTop: '20px' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === subscriptions.length && subscriptions.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Plano</th>
                                <th>Preferências</th>
                                <th>Status / Validade</th>
                                <th>Anotações</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Nenhuma assinatura registrada.</td>
                                </tr>
                            ) : subscriptions.map(sub => (
                                <tr key={sub.id} style={selectedIds.includes(sub.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(sub.id)}
                                            onChange={() => toggleSelectOne(sub.id)}
                                            style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td>
                                        <div>{new Date(sub.created_at).toLocaleDateString('pt-BR')}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(sub.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td>
                                        <strong>{sub.customer?.name || 'Cliente Removido'}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{sub.customer?.phone}</div>
                                    </td>
                                    <td>
                                        <strong>{sub.plan?.title || 'Plano Removido'}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>R$ {sub.plan?.price} / {sub.plan?.period}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}><strong>Profissional:</strong> {sub.artist?.name || 'Qualquer'}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#888' }}><strong>Início:</strong> {sub.start_month || 'Imediato'}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {(() => {
                                                const days = calculateRemainingDays(sub.expires_at);
                                                const effectiveStatus = (sub.status === 'active' && days !== null && days <= 0) ? 'expired' : sub.status;
                                                return <StatusBadge status={effectiveStatus} />;
                                            })()}
                                            {sub.status === 'active' && sub.expires_at && (
                                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: calculateRemainingDays(sub.expires_at) <= 3 ? '#ef4444' : '#888' }}>
                                                    {(() => {
                                                        const days = calculateRemainingDays(sub.expires_at);
                                                        if (days > 1) return `${days} dias restantes`;
                                                        if (days === 1) return `Vence Amanhã`;
                                                        if (days === 0) return `Vence Hoje`;
                                                        return 'Expirado';
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '200px', fontSize: '0.85rem' }}>
                                        {/* Display usage badge if available */}
                                        {sub.status === 'active' && (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                <div className="table-usage-badge">
                                                    <span className="usage-icon">✂️</span>
                                                    <button
                                                        className="usage-minus-btn"
                                                        onClick={() => {
                                                            const newUsage = { ...sub.features_usage, cortes: Math.max(0, (sub.features_usage?.cortes || 0) - 1) };
                                                            supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => fetchSubscriptions());
                                                        }}
                                                        disabled={!(sub.features_usage?.cortes > 0)}
                                                        title="Reduzir Uso de Corte"
                                                    >-</button>
                                                    <span className="usage-numbers">
                                                        {sub.features_usage?.cortes || 0}/{sub.plan?.usage_limits?.cortes || 0}
                                                    </span>
                                                    <button
                                                        className="usage-plus-btn"
                                                        onClick={() => {
                                                            const newUsage = { ...sub.features_usage, cortes: (sub.features_usage?.cortes || 0) + 1 };
                                                            supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => fetchSubscriptions());
                                                        }}
                                                        title="Registrar Uso de Corte"
                                                    >+</button>
                                                </div>

                                                <div className="table-usage-badge">
                                                    <span className="usage-icon">🧔</span>
                                                    <button
                                                        className="usage-minus-btn"
                                                        onClick={() => {
                                                            const newUsage = { ...sub.features_usage, barbas: Math.max(0, (sub.features_usage?.barbas || 0) - 1) };
                                                            supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => fetchSubscriptions());
                                                        }}
                                                        disabled={!(sub.features_usage?.barbas > 0)}
                                                        title="Reduzir Uso de Barba"
                                                    >-</button>
                                                    <span className="usage-numbers">
                                                        {sub.features_usage?.barbas || 0}/{sub.plan?.usage_limits?.barbas || 0}
                                                    </span>
                                                    <button
                                                        className="usage-plus-btn"
                                                        onClick={() => {
                                                            const newUsage = { ...sub.features_usage, barbas: (sub.features_usage?.barbas || 0) + 1 };
                                                            supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => fetchSubscriptions());
                                                        }}
                                                        title="Registrar Uso de Barba"
                                                    >+</button>
                                                </div>

                                                <div className="table-usage-badge">
                                                    <span className="usage-icon">🥃</span>
                                                    <button
                                                        className="usage-minus-btn"
                                                        onClick={() => {
                                                            const newUsage = { ...sub.features_usage, bebidas: Math.max(0, (sub.features_usage?.bebidas || 0) - 1) };
                                                            supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => fetchSubscriptions());
                                                        }}
                                                        disabled={!(sub.features_usage?.bebidas > 0)}
                                                        title="Reduzir Consumo de Bebida"
                                                    >-</button>
                                                    <span className="usage-numbers">
                                                        {sub.features_usage?.bebidas || 0}/{sub.plan?.usage_limits?.bebidas || 0}
                                                    </span>
                                                    <button
                                                        className="usage-plus-btn"
                                                        onClick={() => {
                                                            const newUsage = { ...sub.features_usage, bebidas: (sub.features_usage?.bebidas || 0) + 1 };
                                                            supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => fetchSubscriptions());
                                                        }}
                                                        title="Registrar Consumo de Bebida"
                                                    >+</button>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#888' }}>
                                            {sub.notes || '-'}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {sub.status === 'pending' && (
                                            <button
                                                className="admin-action-btn confirm"
                                                onClick={() => handleApproveSubscription(sub)}
                                                title="Aprovar Pagamento e Ativar"
                                                style={{ marginRight: 8, background: '#4ade8022', color: '#4ade80' }}
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        {sub.status === 'active' && (
                                            <button
                                                className="admin-action-btn"
                                                onClick={() => handleRenew(sub)}
                                                title="Enviar Oferta de Renovação"
                                                style={{ marginRight: 8, background: '#facc1522', color: '#facc15' }}
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                        )}
                                        <button className="admin-action-btn" onClick={() => { setSelectedSub(sub); setIsDetailsModalOpen(true); }} title="Ver Detalhes"><Eye size={16} /></button>
                                        <button className="admin-action-btn" onClick={() => handleEdit(sub)} title="Editar"><Pencil size={16} /></button>
                                        <button className="admin-action-btn delete" onClick={() => handleDelete(sub.id)} title="Excluir"><Trash2 size={16} /></button>
                                        {sub.customer?.phone && sub.customer.phone !== '00000000000' && (
                                            <button className="admin-action-btn bg-green-900/40 text-green-400 hover:bg-green-800/60" title="WhatsApp" onClick={() => {
                                                const cleanPhone = (sub.customer.phone || '').replace(/\D/g, '');
                                                window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                                            }} style={{ marginLeft: 8 }}>Wpp</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isEditModalOpen && (
                <Modal title={`Editar Assinatura - ${selectedSub?.customer?.name}`} onClose={() => setIsEditModalOpen(false)}>
                    <form onSubmit={handleSaveEdit}>
                        <div className="admin-form-group">
                            <label>Status do Plano</label>
                            <select
                                className="app-form-control"
                                value={selectedSub.status}
                                onChange={e => setSelectedSub({ ...selectedSub, status: e.target.value })}
                            >
                                <option value="pending">Pendente</option>
                                <option value="active">Ativo (Em andamento)</option>
                                <option value="completed">Concluído</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label>Profissional Preferido</label>
                            <select
                                className="app-form-control"
                                value={selectedSub.preferred_barber || ''}
                                onChange={e => setSelectedSub({ ...selectedSub, preferred_barber: e.target.value })}
                            >
                                <option value="">Qualquer um</option>
                                {artists?.map(artist => (
                                    <option key={artist.id} value={artist.name}>{artist.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label>Controle de Consumo (Mês Atual)</label>
                            <div className="usage-card">
                                <div className="usage-item">
                                    <div className="usage-label">
                                        <span>✂️ Cortes Utilizados</span>
                                        <span className="usage-limit-info">Limite: {selectedSub.plan?.usage_limits?.cortes || 0}</span>
                                    </div>
                                    <div className="usage-controls">
                                        <button type="button" className="usage-btn" onClick={() => incrementUsage('cortes', -1)}>-</button>
                                        <span className="usage-value">{selectedSub.features_usage?.cortes || 0}</span>
                                        <button type="button" className="usage-btn" onClick={() => incrementUsage('cortes', 1)}>+</button>
                                    </div>
                                </div>
                                <div className="usage-item">
                                    <div className="usage-label">
                                        <span>🧔 Barbas Utilizadas</span>
                                        <span className="usage-limit-info">Limite: {selectedSub.plan?.usage_limits?.barbas || 0}</span>
                                    </div>
                                    <div className="usage-controls">
                                        <button type="button" className="usage-btn" onClick={() => incrementUsage('barbas', -1)}>-</button>
                                        <span className="usage-value">{selectedSub.features_usage?.barbas || 0}</span>
                                        <button type="button" className="usage-btn" onClick={() => incrementUsage('barbas', 1)}>+</button>
                                    </div>
                                </div>
                                <div className="usage-item">
                                    <div className="usage-label">
                                        <span>🥃 Bebidas Cortesia</span>
                                        <span className="usage-limit-info">Limite: {selectedSub.plan?.usage_limits?.bebidas || 0}</span>
                                    </div>
                                    <div className="usage-controls">
                                        <button type="button" className="usage-btn" onClick={() => incrementUsage('bebidas', -1)}>-</button>
                                        <span className="usage-value">{selectedSub.features_usage?.bebidas || 0}</span>
                                        <button type="button" className="usage-btn" onClick={() => incrementUsage('bebidas', 1)}>+</button>
                                    </div>
                                </div>
                            </div>
                            <small style={{ color: '#888', marginTop: '8px', display: 'block' }}>
                                Atente-se aos limites definidos no plano (ex: VIP = 2 cortes, 1 barba).
                            </small>
                        </div>
                        <div className="admin-form-group">
                            <label>Anotações Gerais</label>
                            <textarea
                                className="app-form-control"
                                rows="3"
                                placeholder="Notas adicionais sobre preferências, alergias, etc."
                                value={selectedSub.notes || ''}
                                onChange={e => setSelectedSub({ ...selectedSub, notes: e.target.value })}
                            />
                            <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>
                                Fica registrado todo o histórico da assinatura na linha do tempo.
                            </small>
                        </div>
                        <div className="admin-form-group">
                            <label>Mês de Início (Referência)</label>
                            <input
                                type="text"
                                className="app-form-control"
                                placeholder="Ex: Abril de 2026"
                                value={selectedSub.start_month || ''}
                                onChange={e => setSelectedSub({ ...selectedSub, start_month: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="admin-btn-primary" style={{ width: '100%', marginTop: '16px' }}>Salvar Alterações</button>
                    </form>
                </Modal>
            )}

            {isDetailsModalOpen && selectedSub && (
                <Modal title={`Detalhes da Assinatura`} onClose={() => setIsDetailsModalOpen(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#fff' }}>
                        <div>
                            <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Cliente</strong>
                            <div style={{ fontSize: '1.1rem' }}>{selectedSub.customer?.name}</div>
                            <div style={{ color: '#888' }}>{selectedSub.customer?.phone}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                            <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Plano Contratado</strong>
                            <div style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{selectedSub.plan?.title}</div>
                            <div style={{ color: '#ccc' }}>R$ {selectedSub.plan?.price} / {selectedSub.plan?.period}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Profissional Preferido</strong>
                                <div>{selectedSub.artist?.name || 'Qualquer (Sem preferência)'}</div>
                            </div>
                            <div>
                                <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Mês de Início</strong>
                                <div>{selectedSub.start_month || 'Não informado'}</div>
                            </div>
                        </div>
                        <div>
                            <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Status Atual</strong>
                            <div style={{ marginTop: '4px' }}>
                                <StatusBadge status={selectedSub.status} />
                            </div>
                        </div>
                        <div>
                            <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Anotações / Observações</strong>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', minHeight: '60px', whiteSpace: 'pre-wrap', color: '#ddd' }}>
                                {selectedSub.notes || 'Nenhuma observação.'}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '24px', textAlign: 'right' }}>
                        <button className="btn-app-secondary" onClick={() => setIsDetailsModalOpen(false)}>Fechar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS TAB (CRM)
// ══════════════════════════════════════════════════════════════════════════════
const CustomersTab = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    // For add/edit modal
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', instagram: '', birthday: '', observations: '' });

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('customers').select('*').order('name', { ascending: true });
        if (search) query = query.ilike('name', `%${search}%`);
        const { data } = await query;
        setCustomers(data || []);
        setSelectedIds([]);
        setLoading(false);
    }, [search]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const viewHistory = async (customer) => {
        setSelectedCustomer(customer);
        const { data } = await supabase.from('appointments').select('*')
            .eq('customer_id', customer.id).order('date', { ascending: false });
        setCustomerHistory(data || []);
    };

    const openNew = () => {
        setEditing(false);
        setForm({ name: '', phone: '', email: '', instagram: '', birthday: '', observations: '' });
        setShowModal(true);
    };

    const openEdit = (customer) => {
        setEditing(true);
        setForm(customer);
        setShowModal(true);
    };

    const save = async () => {
        if (!form.name) return alert('Nome é obrigatório');
        if (editing) {
            await supabase.from('customers').update(form).eq('id', form.id);
        } else {
            await supabase.from('customers').insert([form]);
        }
        setShowModal(false);
        fetchCustomers();
    };

    const remove = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        await supabase.from('customers').delete().eq('id', id);
        setCustomers(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(customers.map(c => c.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        if (bulkAction === 'delete') {
            if (!confirm(`ATENÇÃO: Excluir um cliente pode excluir ou quebrar seus agendamentos.\n\nTem certeza que deseja excluir ${selectedIds.length} cliente(s)?`)) return;
            await supabase.from('customers').delete().in('id', selectedIds);
            setCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Clientes (CRM)</h2>
                <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Adicionar Cliente</span></button>
            </div>

            <div className="admin-filters glass-panel">
                <input type="text" className="admin-filter-input" placeholder="Buscar por nome..."
                    value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
                <button className="admin-refresh-btn" onClick={fetchCustomers}><RefreshCw size={16} /></button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="admin-bulk-actions glass-panel">
                    <span style={{ fontWeight: 'bold' }}>{selectedIds.length} selecionado(s)</span>
                    <select className="form-input" style={{ width: 'auto', padding: '8px', flex: 1, maxWidth: '250px' }} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                        <option value="">Escolha uma ação...</option>
                        <option value="delete">Excluir Selecionados</option>
                    </select>
                    <button className="admin-btn-primary" style={{ padding: '8px 16px' }} onClick={handleBulkAction} disabled={!bulkAction}>Aplicar</button>
                    <button className="admin-btn-secondary" style={{ padding: '8px 16px', marginLeft: 'auto' }} onClick={() => setSelectedIds([])}><X size={14} /> Limpar Seleção</button>
                </div>
            )}

            {loading ? <div className="admin-loading">Carregando clientes...</div> : customers.length === 0 ? <div className="admin-empty">Nenhum cliente cadastrado.</div> : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === customers.length && customers.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Instagram</th>
                                <th>Nascimento</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id} style={selectedIds.includes(c.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(c.id)}
                                            onChange={() => toggleSelectOne(c.id)}
                                            style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                                    <td>{c.phone || '-'}</td>
                                    <td>{c.instagram || '-'}</td>
                                    <td>{c.birthday ? c.birthday.split('-').reverse().join('/') : '-'}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="action-btn" title="Ver Histórico" onClick={() => viewHistory(c)} style={{ color: 'var(--color-primary)' }}><CalendarDays size={16} /></button>
                                            <button className="action-btn edit" onClick={() => openEdit(c)}><Pencil size={16} /></button>
                                            <button className="action-btn delete" onClick={() => remove(c.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <Modal title={editing ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group"><label>Nome</label><input className="form-input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div className="form-group"><label>Telefone</label><input className="form-input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                        <div className="form-group"><label>Email</label><input className="form-input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                        <div className="form-group"><label>Instagram (sem @)</label><input className="form-input" value={form.instagram || ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                        <div className="form-group"><label>Data Nascimento</label><input type="date" className="form-input" value={form.birthday || ''} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} /></div>
                        <div className="form-group"><label>Observações (ex: alergias, etc)</label><textarea className="form-input" value={form.observations || ''} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows="3" /></div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 15 }}><button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar</button></div>
                    </div>
                </Modal>
            )}

            {selectedCustomer && (
                <Modal title={`Histórico: ${selectedCustomer.name} `} onClose={() => setSelectedCustomer(null)}>
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
                        {selectedCustomer.observations && (
                            <div className="glass-panel" style={{ padding: 15, marginBottom: 20, borderRadius: 8, borderLeft: '3px solid var(--color-primary)' }}>
                                <strong>Observações do Cliente:</strong><br />
                                {selectedCustomer.observations}
                            </div>
                        )}
                        <h4 style={{ marginBottom: 15 }}>Sessões</h4>
                        {customerHistory.length === 0 ? <p className="text-muted">Nenhum agendamento encontrado para este cliente.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {customerHistory.map(h => (
                                    <div key={h.id} className="glass-panel" style={{ padding: 15, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{h.service_name || 'Serviço'}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{h.date.split('-').reverse().join('/')}</p>
                                            <p style={{ fontSize: '0.9rem', marginTop: 5 }}><StatusBadge status={h.status} /></p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: 'bold' }}>R$ {parseFloat(h.session_price || 0).toFixed(2)}</p>
                                            {h.deposit_price > 0 && <p style={{ fontSize: '0.8rem', color: h.deposit_status === 'paid' ? '#4ade80' : 'var(--color-primary)' }}>Sinal: R$ {parseFloat(h.deposit_price).toFixed(2)}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};
const ServicesTab = ({ siteData, updateSiteData }) => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', duration_mins: '', is_featured: false });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const fetchServices = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('services').select('*').order('name');
        setServices(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', description: '', price: '', duration_mins: '', is_featured: false });
        setShowModal(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({
            name: s.name,
            description: s.description || '',
            price: s.price,
            duration_mins: s.duration_mins || '',
            is_featured: s.is_featured || false
        });
        setShowModal(true);
    };

    const save = async () => {
        if (!form.name || !form.price) return alert('Nome e Preço são obrigatórios');

        const payload = {
            ...form,
            price: parseFloat(form.price),
            duration_mins: parseInt(form.duration_mins) || 0
        };

        const { error } = editing
            ? await supabase.from('services').update(payload).eq('id', editing.id)
            : await supabase.from('services').insert([payload]);

        if (error) {
            console.error('Error saving service:', error);
            return alert('Erro ao salvar no banco de dados: ' + error.message);
        }

        setShowModal(false);
        fetchServices();
        if (updateSiteData) updateSiteData(); // Refresh global context if available
    };

    const remove = async (id) => {
        if (!confirm('Excluir este serviço? Isso pode afetar agendamentos existentes.')) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) {
            console.error('Error deleting service:', error);
            return alert('Erro ao excluir: ' + error.message);
        }
        fetchServices();
        if (updateSiteData) updateSiteData();
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(services.map(s => s.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        if (bulkAction === 'delete') {
            if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} serviço(s)? Isso pode afetar agendamentos existentes.`)) return;
            const { error } = await supabase.from('services').delete().in('id', selectedIds);
            if (error) {
                console.error('Error deleting services:', error);
                return alert('Erro ao excluir alguns serviços: ' + error.message);
            }
            fetchServices();
            if (updateSiteData) updateSiteData();
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Gestão de Serviços</h2>
                <button className="admin-add-btn neon-glow" onClick={openNew}>
                    <Plus size={18} />
                    <span>Novo Serviço</span>
                </button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="admin-bulk-actions glass-panel" style={{ marginTop: '20px' }}>
                    <span style={{ fontWeight: 'bold' }}>{selectedIds.length} selecionado(s)</span>
                    <select
                        className="form-input"
                        style={{ width: 'auto', padding: '8px', flex: 1, maxWidth: '250px' }}
                        value={bulkAction}
                        onChange={e => setBulkAction(e.target.value)}
                    >
                        <option value="">Ações em massa...</option>
                        <option value="delete">Excluir Selecionados</option>
                    </select>
                    <button
                        className="admin-btn-primary"
                        style={{ padding: '8px 16px' }}
                        onClick={handleBulkAction}
                        disabled={!bulkAction}
                    >Aplicar</button>
                    <button
                        className="admin-btn-secondary"
                        style={{ padding: '8px 16px', marginLeft: 'auto' }}
                        onClick={() => setSelectedIds([])}
                    ><X size={14} /> Limpar Seleção</button>
                </div>
            )}

            {loading ? <div className="admin-loading">Carregando serviços...</div> : (
                <div className="admin-table-wrap glass-panel">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === services.length && services.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Nome</th>
                                <th>Preço</th>
                                <th>Duração</th>
                                <th>Destaque</th>
                                <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map(s => (
                                <tr key={s.id} style={selectedIds.includes(s.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(s.id)}
                                            onChange={() => toggleSelectOne(s.id)}
                                            style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{s.description}</div>
                                    </td>
                                    <td>R$ {parseFloat(s.price).toFixed(2)}</td>
                                    <td>{s.duration_mins} min</td>
                                    <td>{s.is_featured ? <span style={{ color: 'var(--color-primary)' }}>★ Sim</span> : <span style={{ color: '#555' }}>Não</span>}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button className="action-btn edit" onClick={() => openEdit(s)} title="Editar"><Pencil size={18} /></button>
                                            <button className="action-btn delete" onClick={() => remove(s.id)} title="Excluir"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {services.length === 0 && <tr><td colSpan="6" className="text-center text-muted">Nenhum serviço cadastrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <Modal title={editing ? 'Editar Serviço' : 'Novo Serviço'} onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Nome do Serviço *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Corte Degradê" />
                        </div>
                        <div className="form-group">
                            <label>Descrição</label>
                            <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do serviço..." rows={2} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group">
                                <label>Preço (R$) *</label>
                                <input type="number" className="form-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" step="0.01" />
                            </div>
                            <div className="form-group">
                                <label>Duração (minutos)</label>
                                <input type="number" className="form-input" value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))} placeholder="45" />
                            </div>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <input type="checkbox" id="service_featured" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                            <label htmlFor="service_featured" style={{ cursor: 'pointer', margin: 0 }}>Destacar Serviço (Selo "Mais Pedido")</label>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar Serviço</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// ARTISTS TAB (CRUD)
// ══════════════════════════════════════════════════════════════════════════════
const ArtistsTab = () => {
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', photo_url: '', instagram: '', specialty: '', active: true });
    const [uploading, setUploading] = useState(false);

    const fetchArtists = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('artists').select('*').order('name');
        setArtists(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchArtists(); }, [fetchArtists]);

    const openNew = () => { setEditing(null); setForm({ name: '', photo_url: '', instagram: '', specialty: '', active: true }); setShowModal(true); };
    const openEdit = (a) => { setEditing(a); setForm({ name: a.name, photo_url: a.photo_url || '', instagram: a.instagram || '', specialty: a.specialty || '', active: a.active ?? true }); setShowModal(true); };

    const save = async () => {
        if (!form.name) return alert('Nome é obrigatório');

        const { error } = editing
            ? await supabase.from('artists').update(form).eq('id', editing.id)
            : await supabase.from('artists').insert([form]);

        if (error) {
            console.error('Error saving artist:', error);
            return alert('Erro ao salvar no banco de dados: ' + error.message);
        }

        setShowModal(false);
        fetchArtists();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            // Optimize image via WebP before uploading
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const fileName = `artists/${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setForm(f => ({ ...f, photo_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading:', error);
            alert(error.message || 'Erro ao processar/upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const remove = async (id) => {
        if (!confirm('Excluir este profissional? (Desativar pode ser melhor para manter o histórico).')) return;
        await supabase.from('artists').delete().eq('id', id);
        fetchArtists();
    };

    const toggleActive = async (artist) => {
        const newStatus = !artist.active;
        await supabase.from('artists').update({ active: newStatus }).eq('id', artist.id);
        fetchArtists();
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Profissionais</h2>
                <button className="admin-add-btn" onClick={openNew}>
                    <Plus size={18} />
                    <span>Novo Profissional</span>
                </button>
            </div>

            {loading ? <div className="admin-loading">Carregando profissionais...</div> : (
                <div className="admin-artists-grid">
                    {artists.map(a => (
                        <div key={a.id} className="admin-artist-card" style={!a.active ? { opacity: 0.6 } : {}}>
                            <img
                                src={a.photo_url || 'https://via.placeholder.com/150?text=Artist'}
                                alt={a.name}
                                className="artist-avatar"
                            />
                            <div className="artist-name">{a.name} {!a.active && '(Inativo)'}</div>
                            <div className="artist-specialty">{a.specialty || 'Tatuador'}</div>
                            <div className="artist-instagram">{a.instagram ? `@${a.instagram} ` : '-'}</div>

                            <div className="card-actions-row">
                                <button className="btn-card btn-edit" title="Editar" onClick={() => openEdit(a)}>
                                    <Pencil size={14} />
                                </button>
                                <button
                                    className="btn-card btn-toggle"
                                    title={a.active ? "Desativar" : "Ativar"}
                                    onClick={() => toggleActive(a)}
                                >
                                    <Ban size={14} />
                                </button>
                                <button className="btn-card btn-delete" title="Excluir" onClick={() => remove(a.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <Modal title={editing ? 'Editar Profissional' : 'Novo Profissional'} onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Nome</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Especialidade</label>
                            <input className="form-input" value={form.specialty} placeholder="ex: Tatuagem realista" onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Instagram (sem @)</label>
                            <input className="form-input" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Foto do Profissional</label>
                            {form.photo_url ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                    <img src={form.photo_url} alt="preview" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
                                    <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, photo_url: '' }))} type="button" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                        Remover / Trocar
                                    </button>
                                </div>
                            ) : (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="form-input"
                                />
                            )}
                            {uploading && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Enviando imagem...</div>}
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: 'var(--color-primary)' }} />
                            <label htmlFor="active" style={{ margin: 0 }}>Profissional Ativo (Aparece no Agendamento)</label>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════
const SettingsField = ({ label, field, type = 'text', placeholder, form, setForm }) => (
    <div className="form-group">
        <label>{label}</label>
        <input className="form-input" type={type} value={form[field] || ''} placeholder={placeholder}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
    </div>
);

const SettingsTimeField = ({ labelPrefix, prefixKey, form, setForm }) => (
    <div style={{ marginBottom: 15 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
            <SettingsField label={`Rótulo(${labelPrefix})`} field={`${prefixKey} Label`} form={form} setForm={setForm} />
            <SettingsField label="Abre (HH:MM)" field={`${prefixKey} Open`} placeholder="09:00" form={form} setForm={setForm} />
            <SettingsField label="Fecha (HH:MM)" field={`${prefixKey} Close`} placeholder="19:00" form={form} setForm={setForm} />
        </div>
    </div>
);

const SettingsTab = () => {
    const [form, setForm] = useState({
        phone: '',
        whatsapp: '',
        instagram: '',
        address: '',
        logoUrl: '',
        logoUrlLight: '',
        logoUrlDark: '',
        bannerUrl: '',
        bannerUrlLight: '',
        bannerUrlDark: '',
        menuTitle: '',
        heroTitle: '',
        heroSubtitle: '',
        weekdaysLabel: 'Segunda a Sexta',
        weekdaysOpen: '09:00',
        weekdaysClose: '19:00',
        saturdaysLabel: 'Sábados',
        saturdaysOpen: '09:00',
        saturdaysClose: '15:00',
        sundaysLabel: 'Domingos',
        sundaysOpen: '',
        sundaysClose: '',
    });
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({ logo: false, banner: false });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*');
            if (data) {
                const contact = data.find(s => s.key_name === 'contact')?.value || {};
                const hours = data.find(s => s.key_name === 'operating_hours')?.value || {};
                const branding = data.find(s => s.key_name === 'branding')?.value || {};

                setForm(f => ({
                    ...f,
                    phone: contact.phone || '',
                    whatsapp: contact.whatsapp || '',
                    instagram: contact.instagram || '',
                    address: contact.address || '',
                    logoUrl: branding.logoUrl || '',
                    logoUrlLight: branding.logoUrlLight || '',
                    logoUrlDark: branding.logoUrlDark || '',
                    bannerUrl: branding.bannerUrl || '',
                    bannerUrlLight: branding.bannerUrlLight || '',
                    bannerUrlDark: branding.bannerUrlDark || '',
                    menuTitle: branding.menuTitle || '',
                    heroTitle: branding.heroTitle || '',
                    heroSubtitle: branding.heroSubtitle || '',
                    weekdaysLabel: hours.weekdays?.label || 'Segunda a Sexta',
                    weekdaysOpen: hours.weekdays?.open || '',
                    weekdaysClose: hours.weekdays?.close || '',
                    saturdaysLabel: hours.saturdays?.label || 'Sábados',
                    saturdaysOpen: hours.saturdays?.open || '',
                    saturdaysClose: hours.saturdays?.close || '',
                    sundaysLabel: hours.sundays?.label || 'Domingos',
                    sundaysOpen: hours.sundays?.open || '',
                    sundaysClose: hours.sundays?.close || '',
                }));
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const save = async () => {
        const contactPayload = { phone: form.phone, whatsapp: form.whatsapp, instagram: form.instagram, address: form.address };
        const hoursPayload = {
            weekdays: { label: form.weekdaysLabel, open: form.weekdaysOpen, close: form.weekdaysClose },
            saturdays: { label: form.saturdaysLabel, open: form.saturdaysOpen, close: form.saturdaysClose },
            sundays: { label: form.sundaysLabel, open: form.sundaysOpen, close: form.sundaysClose }
        };
        const brandingPayload = {
            logoUrl: form.logoUrl,
            logoUrlLight: form.logoUrlLight,
            logoUrlDark: form.logoUrlDark,
            bannerUrl: form.bannerUrl,
            bannerUrlLight: form.bannerUrlLight,
            bannerUrlDark: form.bannerUrlDark,
            menuTitle: form.menuTitle,
            heroTitle: form.heroTitle,
            heroSubtitle: form.heroSubtitle
        };

        const { error } = await supabase.from('settings').upsert([
            { key_name: 'contact', value: contactPayload },
            { key_name: 'operating_hours', value: hoursPayload },
            { key_name: 'branding', value: brandingPayload }
        ], { onConflict: 'key_name' });

        if (error) {
            console.error('Error saving settings:', error);
            return alert('Erro ao salvar configurações: ' + error.message);
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(prev => ({ ...prev, [field]: true }));
        try {
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const fileName = `brand/${field}_${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setForm(f => ({ ...f, [field]: publicUrl }));
        } catch (error) {
            console.error(`Error uploading ${field}: `, error);
            alert(error.message || `Erro ao carregar ${field}.`);
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    if (loading) return <div className="admin-loading">Carregando configurações...</div>;

    return (
        <div className="fade-in">
            <h2 className="admin-section-title">Configurações Base</h2>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', color: 'var(--color-primary)' }}>🎨 Identidade Visual (Logo e Banner)</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '20px' }}>
                    {/* Logos Section */}
                    <div>
                        <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '15px' }}>Logos por Tema</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Logo Light */}
                            <div className="form-group glass-panel" style={{ padding: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '10px' }}>Logo - Modo Claro</label>
                                {form.logoUrlLight ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                                            <img src={form.logoUrlLight} alt="Logo Light preview" style={{ height: '60px', objectFit: 'contain' }} />
                                        </div>
                                        <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, logoUrlLight: '' }))} type="button">Remover</button>
                                    </div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrlLight')} disabled={uploading.logoUrlLight} className="form-input" />
                                )}
                            </div>

                            {/* Logo Dark */}
                            <div className="form-group glass-panel" style={{ padding: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '10px' }}>Logo - Modo Escuro</label>
                                {form.logoUrlDark ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'center', border: '1px solid #1e293b' }}>
                                            <img src={form.logoUrlDark} alt="Logo Dark preview" style={{ height: '60px', objectFit: 'contain' }} />
                                        </div>
                                        <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, logoUrlDark: '' }))} type="button">Remover</button>
                                    </div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrlDark')} disabled={uploading.logoUrlDark} className="form-input" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Banners Section */}
                    <div>
                        <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '15px' }}>Backgrounds (Hero) por Tema</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Banner Light */}
                            <div className="form-group glass-panel" style={{ padding: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '10px' }}>Banner - Modo Claro</label>
                                {form.bannerUrlLight ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <img src={form.bannerUrlLight} alt="Banner Light preview" style={{ height: '80px', width: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                        <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, bannerUrlLight: '' }))} type="button">Remover</button>
                                    </div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'bannerUrlLight')} disabled={uploading.bannerUrlLight} className="form-input" />
                                )}
                            </div>

                            {/* Banner Dark */}
                            <div className="form-group glass-panel" style={{ padding: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '10px' }}>Banner - Modo Escuro</label>
                                {form.bannerUrlDark ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <img src={form.bannerUrlDark} alt="Banner Dark preview" style={{ height: '80px', width: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                        <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, bannerUrlDark: '' }))} type="button">Remover</button>
                                    </div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'bannerUrlDark')} disabled={uploading.bannerUrlDark} className="form-input" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>Textos Base</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    <SettingsField label="Título no Menu Superior" field="menuTitle" placeholder="Ex: BARBEARIA CLÁSSICA" form={form} setForm={setForm} />
                    <SettingsField label="Título Principal (Banner)" field="heroTitle" placeholder="Ex: BARBEARIA CLÁSSICA" form={form} setForm={setForm} />
                    <SettingsField label="Subtítulo / Slogan" field="heroSubtitle" placeholder="Ex: Estilo Clássico. Atendimento Premium." form={form} setForm={setForm} />
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', color: 'var(--color-primary)' }}>📞 Contato & Info</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <SettingsField label="Telefone" field="phone" form={form} setForm={setForm} />
                    <SettingsField label="WhatsApp (apenas números)" field="whatsapp" placeholder="5531971129936" form={form} setForm={setForm} />
                </div>
                <SettingsField label="Instagram (link)" field="instagram" form={form} setForm={setForm} />
                <SettingsField label="Endereço Completo" field="address" form={form} setForm={setForm} />
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', color: 'var(--color-primary)' }}>🕐 Horários de Funcionamento</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 15 }}>Deixe "Abre" e "Fecha" em branco para dias em que a barbearia estiver fechada.</p>
                <SettingsTimeField labelPrefix="Dias úteis" prefixKey="weekdays" form={form} setForm={setForm} />
                <SettingsTimeField labelPrefix="Finais de semana 1" prefixKey="saturdays" form={form} setForm={setForm} />
                <SettingsTimeField labelPrefix="Finais de semana 2" prefixKey="sundays" form={form} setForm={setForm} />
            </div>

            <button className="admin-btn-primary neon-glow" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }} onClick={save}>
                {saved ? '✅ Salvo com sucesso!' : <><Save size={18} style={{ marginRight: 8 }} />Salvar Configurações</>}
            </button>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// FINANCES TAB
// ══════════════════════════════════════════════════════════════════════════════

const FinancesTab = () => {
    const [finances, setFinances] = useState({
        faturamentoReal: 0,
        faturamentoPrevisto: 0,
        valoresPerdidos: 0,
        depositosRecebidos: 0
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFinances = useCallback(async () => {
        setLoading(true);
        // 1. Get appointments
        const { data: appointmentsData } = await supabase.from('appointments').select(`
            *,
            customers(name),
            services(name)
        `).order('date', { ascending: false });

        // 2. Get direct finances (new table)
        const { data: finData } = await supabase.from('finances').select('*').order('date', { ascending: false });

        if (appointmentsData) {
            let real = 0;
            let previsto = 0;
            let perdidos = 0;
            let depositos = 0;
            let txs = [];

            appointmentsData.forEach(app => {
                const sPrice = parseFloat(app.session_price) || 0;
                const dPrice = parseFloat(app.deposit_price) || 0;
                const clientName = app.client_name || app.customers?.name || 'Cliente';
                const serviceName = app.service_name || app.services?.name || 'Serviço';

                if (app.status === 'cancelled') {
                    perdidos += sPrice;
                    txs.push({ id: `canc-${app.id}`, date: app.date, desc: `Cancelamento: ${serviceName} (${clientName})`, amount: -sPrice, type: 'expense' });
                } else if (app.status === 'finished') {
                    // Entire session is realized
                    real += sPrice;
                    const remaining = sPrice - (app.deposit_status === 'paid' ? dPrice : 0);

                    if (app.deposit_status === 'paid') {
                        depositos += dPrice;
                        txs.push({ id: `dep-${app.id}`, date: app.date, desc: `Sinal: ${serviceName} (${clientName})`, amount: dPrice, type: 'income' });
                    }
                    if (remaining > 0) {
                        txs.push({ id: `ses-${app.id}`, date: app.date, desc: `Sessão Finalizada: ${serviceName} (${clientName})`, amount: remaining, type: 'income' });
                    } else if (remaining === 0 && app.deposit_status !== 'paid' && sPrice > 0) {
                        txs.push({ id: `ses-${app.id}`, date: app.date, desc: `Sessão Finalizada: ${serviceName} (${clientName})`, amount: sPrice, type: 'income' });
                    }
                } else {
                    // Pending or Confirmed
                    previsto += sPrice;
                    if (app.deposit_status === 'paid') {
                        real += dPrice;
                        depositos += dPrice;
                        txs.push({ id: `dep-${app.id}`, date: app.date, desc: `Sinal: ${serviceName} (${clientName})`, amount: dPrice, type: 'income' });
                    }
                }
            });

            // Merge finances table data
            if (finData) {
                finData.forEach(f => {
                    const amount = parseFloat(f.amount) || 0;
                    if (f.type === 'income') {
                        real += amount;
                        txs.push({ id: `fin-${f.id}`, date: f.date, desc: f.description, amount: amount, type: 'income' });
                    } else {
                        real -= amount;
                        txs.push({ id: `fin-${f.id}`, date: f.date, desc: f.description, amount: amount, type: 'expense' });
                    }
                });
            }

            // Sort by date descending
            txs = txs.sort((a, b) => new Date(b.date) - new Date(a.date));

            setFinances({
                faturamentoReal: real,
                faturamentoPrevisto: previsto,
                valoresPerdidos: perdidos,
                depositosRecebidos: depositos
            });

            setRecentTransactions(txs.slice(0, 15)); // Top 15 recent transactions
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchFinances(); }, [fetchFinances]);

    const exportToExcel = () => {
        if (recentTransactions.length === 0) return alert('Nenhum dado para exportar.');

        // Format data for Excel
        const exportData = recentTransactions.map(t => ({
            'Data': t.date.split('-').reverse().join('/'),
            'Descrição': t.desc,
            'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
            'Valor (R$)': t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount)
        }));

        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Adjust column widths
        const wscols = [
            { wch: 15 }, // Data
            { wch: 50 }, // Descrição
            { wch: 15 }, // Tipo
            { wch: 15 }  // Valor
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Financeiro");

        // Format Date for filename
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const fileName = `financeiro - barbearia - ${yyyy}-${mm}-${dd}.xlsx`;

        // Export
        XLSX.writeFile(workbook, fileName);
    };

    if (loading) return <div className="admin-loading">Carregando dados financeiros...</div>;

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Financeiro</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="admin-refresh-btn" onClick={exportToExcel} style={{ color: '#10B981', borderColor: '#10B981' }}>
                        <Download size={16} /> Exportar Excel
                    </button>
                    <button className="admin-refresh-btn" onClick={fetchFinances}>
                        <RefreshCw size={16} /> Atualizar
                    </button>
                </div>
            </div>

            <div className="admin-stats-grid" style={{ marginBottom: '30px' }}>
                <StatCard icon="💰" label="Faturamento Real" value={`R$ ${finances.faturamentoReal.toFixed(2)} `} color="#4ade80" />
                <StatCard icon="📅" label="Faturamento Previsto" value={`R$ ${finances.faturamentoPrevisto.toFixed(2)} `} color="#60a5fa" />
                <StatCard icon="📉" label="Valores Cancelados" value={`R$ ${finances.valoresPerdidos.toFixed(2)} `} color="#ef4444" />
                <StatCard icon="💎" label="Sinais Recebidos" value={`R$ ${finances.depositosRecebidos.toFixed(2)} `} color="var(--color-primary)" />
            </div>

            <div className="admin-table-wrap glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-primary)' }}>Transações Recentes</h3>
                {recentTransactions.length === 0 ? <p className="text-muted">Nenhuma transação encontrada.</p> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map(t => (
                                <tr key={t.id}>
                                    <td>{t.date.split('-').reverse().join('/')}</td>
                                    <td>{t.desc}</td>
                                    <td style={{ color: t.type === 'expense' ? '#ef4444' : '#4ade80', fontWeight: 'bold' }}>
                                        {t.type === 'expense' ? '-' : '+'} R$ {Math.abs(t.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
const CategoriesTab = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ id: null, name: '' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('gallery_categories').select('*').order('name');
        setCategories(data || []);
        setSelectedIds([]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const openNew = () => { setForm({ id: null, name: '' }); setShowModal(true); };

    const openEdit = (cat) => { setForm(cat); setShowModal(true); };

    const save = async () => {
        if (!form.name.trim()) return alert('O nome da categoria é obrigatório.');

        if (form.id) {
            await supabase.from('gallery_categories').update({ name: form.name }).eq('id', form.id);
        } else {
            const { error } = await supabase.from('gallery_categories').insert([{ name: form.name }]);
            if (error && error.code === '23505') return alert('Esta categoria já existe.');
        }
        setShowModal(false);
        fetchCategories();
    };

    const remove = async (id) => {
        if (!confirm('Excluir esta categoria? Isso pode afetar imagens na galeria.')) return;
        const { error } = await supabase.from('gallery_categories').delete().eq('id', id);
        if (error) alert('Não foi possível excluir a categoria. Talvez existam fotos vinculadas a ela.');
        setCategories(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(categories.map(c => c.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        if (bulkAction === 'delete') {
            if (!confirm(`ATENÇÃO: Excluir ${selectedIds.length} categoria(s) pode afetar imagens na galeria.\n\nTem certeza que deseja continuar?`)) return;
            const { error } = await supabase.from('gallery_categories').delete().in('id', selectedIds);
            if (error) alert('Ocorreu um erro ao excluir algumas categorias. Talvez existam fotos vinculadas a elas.');
            setCategories(prev => prev.filter(c => !selectedIds.includes(c.id)));
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Categorias da Galeria</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="admin-refresh-btn" onClick={fetchCategories}><RefreshCw size={16} /> <span>Atualizar</span></button>
                    <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Nova Categoria</span></button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="admin-bulk-actions glass-panel">
                    <span style={{ fontWeight: 'bold' }}>{selectedIds.length} selecionado(s)</span>
                    <select className="form-input" style={{ width: 'auto', padding: '8px', flex: 1, maxWidth: '250px' }} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                        <option value="">Escolha uma ação...</option>
                        <option value="delete">Excluir Selecionados</option>
                    </select>
                    <button className="admin-btn-primary" style={{ padding: '8px 16px' }} onClick={handleBulkAction} disabled={!bulkAction}>Aplicar</button>
                    <button className="admin-btn-secondary" style={{ padding: '8px 16px', marginLeft: 'auto' }} onClick={() => setSelectedIds([])}><X size={14} /> Limpar Seleção</button>
                </div>
            )}

            {loading ? <div className="admin-loading">Carregando categorias...</div> : (
                <div className="admin-table-wrap glass-panel">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === categories.length && categories.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Nome da Categoria</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id} style={selectedIds.includes(cat.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(cat.id)}
                                            onChange={() => toggleSelectOne(cat.id)}
                                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td>{cat.name}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button className="action-btn edit" onClick={() => openEdit(cat)} title="Editar"><Pencil size={18} /></button>
                                            <button className="action-btn delete" onClick={() => remove(cat.id)} title="Excluir"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhuma categoria cadastrada.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <Modal title={form.id ? "Editar Categoria" : "Nova Categoria"} onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Nome da Categoria *</label>
                            <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// GALLERY TAB
// ══════════════════════════════════════════════════════════════════════════════
const GalleryTab = () => {
    const { fetchImagesAndContext: fetchContext } = useContext(SiteContext);
    const [images, setImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [form, setForm] = useState({ image_url: '', category_id: '', featured: false });

    const fetchImages = useCallback(async () => {
        setLoading(true);
        const [imgsRes, catsRes] = await Promise.all([
            supabase.from('gallery').select('*, gallery_categories(name)').order('featured', { ascending: false }).order('created_at', { ascending: false }),
            supabase.from('gallery_categories').select('*').order('name')
        ]);
        setImages(imgsRes.data || []);
        setCategories(catsRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchImages(); }, [fetchImages]);

    const fetchImagesAndContext = () => {
        fetchImages();
        fetchContext();
    };

    const openNew = () => { setForm({ image_url: '', category_id: '', featured: false }); setShowModal(true); };

    const save = async () => {
        if (!form.image_url) return alert('É necessário fazer o upload de uma imagem');
        if (!form.category_id) return alert('A categoria da foto é obrigatória');

        const { error } = await supabase.from('gallery').insert([{
            image_url: form.image_url,
            category_id: form.category_id,
            featured: form.featured
        }]);

        if (error) {
            console.error('Error saving gallery image:', error);
            return alert('Erro ao salvar no banco de dados: ' + error.message);
        }

        setShowModal(false);
        fetchImagesAndContext();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            // Optimize image via WebP before uploading
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const fileName = `gallery/${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setForm(f => ({ ...f, image_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading:', error);
            alert(error.message || 'Erro ao processar/upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const remove = async (id) => {
        if (!confirm('Excluir esta foto da galeria?')) return;
        await supabase.from('gallery').delete().eq('id', id);
        fetchImagesAndContext();
    };

    const toggleFeatured = async (img) => {
        await supabase.from('gallery').update({ featured: !img.featured }).eq('id', img.id);
        fetchImagesAndContext();
    };

    const openLightbox = (img, index) => {
        setSelectedImage(img);
        setCurrentIndex(index);
    };

    const nextImage = (e) => {
        e.stopPropagation();
        const nextIdx = (currentIndex + 1) % images.length;
        setSelectedImage(images[nextIdx]);
        setCurrentIndex(nextIdx);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        const prevIdx = (currentIndex - 1 + images.length) % images.length;
        setSelectedImage(images[prevIdx]);
        setCurrentIndex(prevIdx);
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Galeria de Cortes</h2>
                <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Nova Foto</span></button>
            </div>

            {loading ? <div className="admin-loading">Carregando galeria...</div> : (
                <div className="admin-gallery-grid">
                    {images.map((img, idx) => (
                        <div key={img.id} className="glass-panel portfolio-item" onClick={() => openLightbox(img, idx)}>
                            <img src={img.image_url} alt="Galeria" className="portfolio-image" style={{ height: '160px' }} />

                            <div className="portfolio-item-overlay">
                                <Maximize2 size={18} color="#FFF" />
                            </div>

                            <div className="gallery-item-info">
                                <span className="gallery-item-category">{img.gallery_categories?.name || 'Sem Categoria'}</span>
                            </div>

                            <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); remove(img.id); }}
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>
                                <Trash2 size={14} />
                            </button>
                            <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); toggleFeatured(img); }} title={img.featured ? "Remover Destaque" : "Destacar Imagem"}
                                style={{ position: 'absolute', top: '8px', right: '40px', background: 'rgba(0,0,0,0.6)', color: img.featured ? '#facc15' : '#ccc', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>
                                <Trophy size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Lightbox Modal ── */}
            {selectedImage && (
                <div className="lightbox-overlay" onClick={() => setSelectedImage(null)}>
                    <button className="lightbox-close" onClick={() => setSelectedImage(null)}>
                        <X size={32} />
                    </button>

                    <button className="lightbox-nav prev" onClick={prevImage}>
                        <ChevronLeft size={48} />
                    </button>

                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <img src={selectedImage.image_url} alt="Expanded" className="lightbox-image" />
                    </div>

                    <button className="lightbox-nav next" onClick={nextImage}>
                        <ChevronRight size={48} />
                    </button>
                </div>
            )}

            {showModal && (
                <Modal title="Nova Foto para Galeria" onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Foto da Galeria</label>
                            {form.image_url ? (
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Pré-visualização:</p>
                                        <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, image_url: '' }))} type="button" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                            Remover / Trocar
                                        </button>
                                    </div>
                                    <img src={form.image_url} alt="preview" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                            ) : (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="form-input"
                                />
                            )}
                            {uploading && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Otimizando p/ WebP e transferindo para nuvem...</div>}
                        </div>
                        <div className="form-group">
                            <label>Categoria do Corte *</label>
                            <select className="form-input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                <option value="">Selecione uma categoria...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            <label htmlFor="featured" style={{ cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>Marcar como Destaque</label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Admin;
