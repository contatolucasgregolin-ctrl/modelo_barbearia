import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext';
import { MapPin, Star, Info, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import '../styles/Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { siteData } = useContext(SiteContext);

    // Modal State
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [loadingPlan, setLoadingPlan] = useState(false);

    // Extract active plans and promotions from context
    const activePlans = (siteData?.plans || []).filter(p => p.active);
    const activePromotions = (siteData?.promotions || []).filter(p => p.active);

    // Filter normal services
    const availableServices = siteData?.services || [];

    // Tatuagem service list
    const hardcodedServices = [
        { id: 'fline', name: 'FINE LINE', desc: 'Traços finos e minimalistas', priceText: 'a partir de R$ 180' },
        { id: 'oschool', name: 'OLD SCHOOL', desc: 'Estilo tradicional americano', priceText: 'a partir de R$ 250' },
        { id: 'real', name: 'REALISMO', desc: 'Tatuagens detalhadas e realistas', priceText: 'a partir de R$ 400' },
        { id: 'bwork', name: 'BLACKWORK', desc: 'Arte em preto sólido', priceText: 'a partir de R$ 300' },
        { id: 'fbra', name: 'FECHAMENTO DE BRAÇO', desc: 'Projeto completo', priceText: 'a partir de R$ 2500' },
        { id: 'cover', name: 'COBERTURA (COVER UP)', desc: 'Cobertura de tatuagens antigas', priceText: 'a partir de R$ 350' },
        { id: 'perso', name: 'TATUAGEM PERSONALIZADA', desc: 'Projeto exclusivo criado pelo artista', priceText: 'valor sob consulta' },
    ];

    const heroStyle = siteData?.banner ? {
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 1) 100%), url(${siteData.banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    } : {};

    const handlePlanSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.phone) return alert('Por favor, preencha todos os campos.');
        setLoadingPlan(true);

        try {
            // 1. Check if customer exists by phone
            let customerId = null;
            const cleanPhone = form.phone.replace(/\D/g, '');
            const { data: existingCustomers } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', cleanPhone)
                .limit(1);

            if (existingCustomers && existingCustomers.length > 0) {
                customerId = existingCustomers[0].id;
                // Update name if changed
                await supabase.from('customers').update({ name: form.name }).eq('id', customerId);
            } else {
                // Create new customer
                const { data: newCustomer, error: insertError } = await supabase
                    .from('customers')
                    .insert([{ name: form.name, phone: cleanPhone }])
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                customerId = newCustomer.id;
            }

            // 2. Register Plan Subscription Intention
            await supabase.from('plan_subscriptions').insert([{
                customer_id: customerId,
                plan_id: selectedPlan.id,
                status: 'pending' // Admin must activate
            }]);

            // 3. Redirect to WhatsApp
            const msg = encodeURIComponent(`Olá! Me chamo ${form.name} e tenho interesse no plano "${selectedPlan.title}" do sistema de gestão.`);
            window.open(`https://wa.me/${siteData.contact.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank');

            // Close modal
            setSelectedPlan(null);
            setForm({ name: '', phone: '' });

        } catch (error) {
            console.error('Error submitting plan:', error);
            alert('Não foi possível registrar o interesse no momento. Tente novamente.');
        } finally {
            setLoadingPlan(false);
        }
    };

    return (
        <div className="home-app">

            {/* 1️⃣ HERO (Topo) */}
            <section className="app-hero" style={heroStyle}>
                <h1 className="app-title-font app-hero-title">{siteData?.heroTitle || 'INK HAVEN TATTOO'}</h1>
                <p className="app-hero-subtitle">{siteData?.heroSubtitle || 'Arte na pele. Histórias eternizadas.'}</p>
                {siteData?.contact?.instagram && (
                    <a href={siteData.contact.instagram.startsWith('http') ? siteData.contact.instagram : `https://instagram.com/${siteData.contact.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="app-hero-insta">
                        @{siteData.contact.instagram.split('/').pop().replace('@', '')}
                    </a>
                )}

                <button className="btn-app-primary" onClick={() => navigate('/agendamento')}>
                    AGENDAR SESSÃO
                </button>
            </section>

            <div className="app-container">

                {/* PROMOTION OF THE WEEK */}
                {activePromotions.length > 0 && (
                    <div className="app-promotions-container fade-in" style={{ marginTop: '20px' }}>
                        {activePromotions.map(promo => (
                            <div key={promo.id} className="app-promo-card neon-glow" style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', background: 'rgba(20, 20, 20, 0.95)', border: '1px solid var(--color-primary)' }}>
                                {promo.image_url && (
                                    <img src={promo.image_url} alt={promo.title} style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
                                )}
                                <div style={{ padding: '24px', textAlign: 'center' }}>
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--color-primary)', color: '#000', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>PROMOÇÃO</div>
                                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '1.4rem', color: '#fff', marginBottom: '8px', textTransform: 'uppercase' }}>{promo.title}</h3>
                                    <p style={{ color: '#ccc', fontSize: '1rem', whiteSpace: 'pre-line', marginBottom: '20px', lineHeight: '1.5' }}>{promo.description}</p>
                                    <button className="btn-app-primary" style={{ width: '100%' }} onClick={() => {
                                        const msg = encodeURIComponent(`Olá! Gostaria de aproveitar a oferta "${promo.title}". Poderia me dar mais informações?`);
                                        window.open(`https://wa.me/${siteData.contact.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                    }}>
                                        APROVEITAR PROMOÇÃO
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2️⃣ STATUS */}
                <div className="app-status-banner">
                    <div className="status-open">
                        <span style={{ fontSize: '10px' }}>🟢</span> Aberto Agora
                    </div>
                    <div>14:00 - 22:00</div>
                </div>

                {/* 3️⃣ QUICK INFO */}
                <div className="app-info-grid">
                    <div className="app-info-card">
                        <MapPin size={20} color="#888" />
                        <div className="app-info-label">Localização</div>
                        <div className="app-info-value">{siteData?.contact?.address || 'Av. Central, 520'}</div>
                    </div>
                    <div className="app-info-card">
                        <Star size={20} color="#888" />
                        <div className="app-info-label">Avaliação</div>
                        <div className="app-info-value">4.9 (680+)</div>
                    </div>
                </div>

                {/* 4️⃣ SESSION PLANS */}
                <div className="app-section-header">
                    <h2 className="app-title-font app-section-title">💈 PLANOS DE SESSÃO</h2>
                    <p className="app-section-subtitle">Sessões planejadas para quem está fazendo tatuagens maiores.</p>
                </div>

                {activePlans.length > 0 ? (
                    <div className="app-plan-grid">
                        {activePlans.map(plan => (
                            <div key={plan.id} className={`app-plan-card ${plan.is_popular ? 'highlight' : ''}`}>
                                {plan.is_popular && <div className="plan-badge">MAIS POPULAR</div>}
                                <div className="plan-title">{plan.title}</div>
                                <div className="plan-price-block">
                                    <div className="plan-price">R${plan.price}</div>
                                    <div className="plan-period">{plan.period}</div>
                                </div>
                                <ul className="plan-features">
                                    {(plan.features || []).map((feat, idx) => (
                                        <li key={idx}>{feat}</li>
                                    ))}
                                </ul>
                                <div className="plan-action">
                                    <button className={plan.is_popular ? "btn-app-small-solid" : "btn-app-small"} style={{ width: '100%' }} onClick={() => setSelectedPlan(plan)}>
                                        ASSINAR PLANO
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        Nenhum plano disponível no momento.
                    </div>
                )}

                {/* 5️⃣ IMPORTANT INFO */}
                <div className="app-info-box">
                    <div className="info-box-title">
                        <Info size={16} /> INFORMAÇÕES ÚTEIS
                    </div>
                    <p className="info-box-desc">
                        A solução ideal para quem quer fazer tatuagens com planejamento e tranquilidade.
                    </p>
                    <div className="info-box-title" style={{ fontSize: '0.8rem', color: '#888', marginTop: '16px', marginBottom: '8px' }}>
                        ★ VANTAGENS
                    </div>
                    <ul className="plan-features">
                        <li style={{ color: '#888' }}>organização de sessões</li>
                        <li style={{ color: '#888' }}>planejamento artístico</li>
                        <li style={{ color: '#888' }}>garantia de horário reservado</li>
                        <li style={{ color: '#888' }}>acompanhamento do projeto</li>
                    </ul>
                </div>

                {/* 6️⃣ SERVICES LIST (Estilos de Tatuagem) */}
                <div className="app-section-header" style={{ textAlign: 'left', marginTop: '24px' }}>
                    <h2 className="app-title-font app-section-title">ESTILOS DE TATUAGEM</h2>
                </div>

                <div className="app-service-list">
                    {hardcodedServices.map(service => (
                        <div key={service.id} className="app-service-item">
                            <div className="service-item-content">
                                <div className="service-item-title">{service.name}</div>
                                <div className="service-item-desc">{service.desc}</div>
                            </div>
                            <div className="service-item-action">
                                <div className="service-item-price">{service.priceText}</div>
                                <button className="btn-app-small" onClick={() => navigate('/agendamento')}>
                                    AGENDAR
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {/* PLAN SUBSCRIPTION MODAL */}
            {selectedPlan && (
                <div className="modal-overlay" onClick={() => !loadingPlan && setSelectedPlan(null)}>
                    <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ background: '#111', color: '#fff', border: '1px solid var(--color-primary)' }}>
                        <div className="modal-header">
                            <h3>Contratar {selectedPlan.title}</h3>
                            <button className="modal-close" onClick={() => !loadingPlan && setSelectedPlan(null)}><X size={20} color="#fff" /></button>
                        </div>
                        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
                            Para iniciarmos o processo, precisamos de alguns dados antes de direcionar você para o WhatsApp de atendimento.
                        </p>
                        <form onSubmit={handlePlanSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Nome Completo*</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                    disabled={loadingPlan}
                                    style={{ background: '#222', color: '#fff', border: '1px solid #333' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>WhatsApp c/ DDD*</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    required
                                    disabled={loadingPlan}
                                    placeholder="Ex: 11999999999"
                                    style={{ background: '#222', color: '#fff', border: '1px solid #333' }}
                                />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '24px' }}>
                                <button type="button" className="btn-app-secondary" onClick={() => setSelectedPlan(null)} disabled={loadingPlan}>Cancelar</button>
                                <button type="submit" className="btn-app-primary" disabled={loadingPlan}>
                                    {loadingPlan ? 'Processando...' : 'Continuar para WhatsApp'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
