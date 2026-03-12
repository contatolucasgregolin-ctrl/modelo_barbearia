import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext';
import { MapPin, Star, Info } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { siteData } = useContext(SiteContext);

    // Extract active plans and promotions from context
    const activePlans = (siteData?.plans || []).filter(p => p.active);
    const activePromotions = (siteData?.promotions || []).filter(p => p.active);

    // Filter normal services
    const availableServices = siteData?.services || [];

    // Barbershop service list
    const hardcodedServices = [
        { id: 'corte', name: 'CORTE CLÁSSICO', desc: 'Tesoura, navalha e acabamento perfeito', priceText: 'R$ 60' },
        { id: 'degradê', name: 'DEGRADÊ E DRY', desc: 'Degrade moderno com secagem e styling', priceText: 'R$ 70' },
        { id: 'barba', name: 'BARBA COMPLETA', desc: 'Alinhamento + toalha quente + massagem', priceText: 'R$ 50' },
        { id: 'combo', name: 'CORTE & BARBA', desc: 'O combo completo para o seu visual', priceText: 'R$ 100' },
        { id: 'sobrancelha', name: 'DESIGN DE SOBRANCELHA', desc: 'Alinhamento e definição das sobrancelhas', priceText: 'R$ 30' },
        { id: 'tratamento', name: 'TRATAMENTO CAPILAR', desc: 'Hidratação profunda e limpeza do couro', priceText: 'R$ 80' },
    ];

    const heroStyle = siteData?.banner ? {
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 1) 100%), url(${siteData.banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    } : {};


    return (
        <div className="home-app">

            {/* 1️⃣ HERO (Topo) */}
            <section className="app-hero" style={heroStyle}>
                <h1 className="app-title-font app-hero-title">{siteData?.heroTitle || 'BARBEARIA CLÁSSICA'}</h1>
                <p className="app-hero-subtitle">{siteData?.heroSubtitle || 'Estilo Clássico. Atendimento Premium.'}</p>
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
                        <div className="app-info-value">{siteData?.contact?.address || 'Rua. Centro, 159 - Centro'}</div>
                    </div>
                    <div className="app-info-card">
                        <Star size={20} color="#888" />
                        <div className="app-info-label">Avaliação</div>
                        <div className="app-info-value">4.9 (680+)</div>
                    </div>
                </div>

                {/* 4️⃣ SESSION PLANS */}
                <div className="app-section-header">
                    <h2 className="app-title-font app-section-title">💈 PLANOS DE MENSALISTA</h2>
                    <p className="app-section-subtitle">Cortes e barbas ilimitados com condições especiais para clientes do plano.</p>

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
                                    <button
                                        className={plan.is_popular ? "btn-app-small-solid" : "btn-app-small"}
                                        style={{ width: '100%' }}
                                        onClick={() => {
                                            const phone = (siteData?.contact?.whatsapp || '5511939407229').replace(/\D/g, '');
                                            const msg = plan.whatsapp_message || `Olá! Gostaria de assinar o plano ${plan.title}. Como podemos prosseguir?`;
                                            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                    >
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
                        A solução ideal para quem quer cortes de qualidade com economia e praticidade.
                    </p>
                    <div className="info-box-title" style={{ fontSize: '0.8rem', color: '#888', marginTop: '16px', marginBottom: '8px' }}>
                        ★ VANTAGENS
                    </div>
                    <ul className="plan-features">
                        <li style={{ color: '#888' }}>cortes e barba a qualquer hora</li>
                        <li style={{ color: '#888' }}>prioridade no agendamento</li>
                        <li style={{ color: '#888' }}>horário reservado garantido</li>
                        <li style={{ color: '#888' }}>desconto exclusivo em produtos</li>
                    </ul>
                </div>

                {/* 6️⃣ SERVICES LIST (Estilos de Tatuagem) */}
                <div className="app-section-header" style={{ textAlign: 'left', marginTop: '24px' }}>
                    <h2 className="app-title-font app-section-title">✂️ NOSSOS SERVIÇOS</h2>
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

                {/* 7️⃣ GALLERY PREVIEW (Estilos de Corte) */}
                <div className="app-section-header" style={{ textAlign: 'left', marginTop: '32px' }}>
                    <h2 className="app-title-font app-section-title">🖼️ GALERIA DE ESTILOS</h2>
                    <button
                        className="btn-link"
                        onClick={() => navigate('/portifolio')}
                        style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        Ver todos →
                    </button>
                </div>

                <div className="home-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px' }}>
                    {siteData?.gallery?.slice(0, 4).map(img => (
                        <div key={img.id} className="home-gallery-item glass-panel" onClick={() => navigate('/portifolio')} style={{ borderRadius: '12px', overflow: 'hidden', height: '140px' }}>
                            <img src={img.image_url} alt="Corte" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ))}
                    {(!siteData?.gallery || siteData.gallery.length === 0) && (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.9rem' }}>
                            Acompanhe nossos trabalhos recentes.
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button className="btn-app-secondary" style={{ width: '100%' }} onClick={() => navigate('/portifolio')}>
                        GALERIA COMPLETA
                    </button>
                </div>

            </div>

        </div>
    );
};

export default Home;
