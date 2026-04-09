import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext';
import { supabase } from '../lib/supabase';
import { MapPin, Star, Info, X, CheckCircle } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { siteData } = useContext(SiteContext);

    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [artists, setArtists] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subFormData, setSubFormData] = useState({
        name: '',
        phone: '',
        artist_id: '',
        start_month: '',
        observation: ''
    });

    // -- Separate state for Promo modal --
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [promoFormData, setPromoFormData] = useState({ name: '', phone: '', preferred_barber: '' });

    // Populate artists for the dropdown
    useEffect(() => {
        const fetchArtists = async () => {
            const { data } = await supabase.from('artists').select('*').eq('active', true);
            if (data) setArtists(data);
        };
        fetchArtists();
    }, []);

    // Extract active plans and promotions from context
    const activePlans = (siteData?.plans || []).filter(p => p.active);
    const activePromotions = (siteData?.promotions || []).filter(p => p.active);

    // Filter normal services
    const availableServices = siteData?.services || [];

    const getHeroStyle = () => {
        const banner = siteData?.banner || siteData?.bannerUrl || '';
        if (!banner) return {};
        return {
            backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.4) 0%, rgba(10, 10, 10, 0.9) 100%), url(${banner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        };
    };

    const openPromoModal = (promo) => {
        setSelectedPromo(promo);
        setPromoFormData({ name: '', phone: '', preferred_barber: '' });
        setIsPromoModalOpen(true);
    };

    return (
        <div className="home-app">

            {/* 1️⃣ HERO (Topo) */}
            <section className="app-hero" style={getHeroStyle()}>
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
                    <div className="app-promotions-container fade-in">
                        {activePromotions.map(promo => (
                            <div key={promo.id} className="app-promo-card">
                                {promo.image_url && (
                                    <div className="promo-image-wrapper">
                                        <div className="promo-badge">PROMOÇÃO</div>
                                        <img src={promo.image_url} alt={promo.title} />
                                    </div>
                                )}
                                <div className="promo-content">
                                    {!promo.image_url && <div className="promo-badge">PROMOÇÃO</div>}
                                    <h3 className="promo-title">{promo.title}</h3>
                                    <p className="promo-description">{promo.description}</p>
                                    <button
                                        type="button"
                                        className="promo-action-btn"
                                        onClick={() => openPromoModal(promo)}
                                    >
                                        APROVEITAR ESTA OFERTA
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
                    <div className="app-info-card" onClick={() => document.getElementById('testimonials').scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
                        <Star size={20} color="var(--color-primary)" />
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
                                        <li key={idx}>✅ {feat}</li>
                                    ))}
                                </ul>
                                <button
                                    className="btn-app-primary"
                                    onClick={() => {
                                        setSelectedPlan(plan);
                                        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                                        const nextMonth = new Date();
                                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                                        setSubFormData({ 
                                            name: '', 
                                            phone: '', 
                                            artist_id: '', 
                                            start_month: monthNames[nextMonth.getMonth()] + ' de ' + nextMonth.getFullYear(), 
                                            observation: '' 
                                        });
                                        setIsPlanModalOpen(true);
                                    }}
                                >
                                    ASSINAR AGORA
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="app-empty">Nenhum plano disponível no momento.</div>
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

                {/* 6️⃣ SERVICES LIST */}
                <div className="app-section-header" style={{ textAlign: 'left', marginTop: '24px' }}>
                    <h2 className="app-title-font app-section-title">✂️ NOSSOS SERVIÇOS</h2>
                </div>

                <div className="app-service-list">
                    {availableServices.map(service => (
                        <div key={service.id} className="app-service-item">
                            <div className="service-item-content">
                                <div className="service-item-title">{service.name}</div>
                                <div className="service-item-desc">{service.desc}</div>
                            </div>
                            <div className="service-item-action">
                                <div className="service-item-price">R$ {service.price}</div>
                                <button className="btn-app-small" onClick={() => navigate('/agendamento')}>
                                    AGENDAR
                                </button>
                            </div>
                        </div>
                    ))}
                    {availableServices.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888', gridColumn: 'span 2' }}>Carregando serviços...</p>
                    )}
                </div>

                {/* 7️⃣ GALLERY PREVIEW */}
                <div className="app-section-header" style={{ textAlign: 'left', marginTop: '32px' }}>
                    <h2 className="app-title-font app-section-title">🖼️ GALERIA DE ESTILOS</h2>
                    <button className="btn-link" onClick={() => navigate('/portifolio')} style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Ver todos →
                    </button>
                </div>

                <div className="home-gallery-grid">
                    {siteData?.gallery?.slice(0, 4).map(img => (
                        <div key={img.id} className="home-gallery-item glass-panel" onClick={() => navigate('/portifolio')}>
                            <img src={img.image_url} alt="Corte" />
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button className="btn-app-secondary" style={{ width: '100%' }} onClick={() => navigate('/portifolio')}>
                        GALERIA COMPLETA
                    </button>
                </div>

                {/* 8️⃣ TESTIMONIALS */}
                <div id="testimonials" className="app-section-header" style={{ textAlign: 'left', marginTop: '32px' }}>
                    <h2 className="app-title-font app-section-title">⭐ O QUE DIZEM NOSSOS CLIENTES</h2>
                    <p className="app-section-subtitle">A opinião de quem confia no nosso trabalho.</p>
                </div>

                <div className="app-testimonials-container">
                    {[
                        { name: 'Lucas Gregolin', text: 'Excelente atendimento! O barbeiro super atencioso e o corte ficou perfeito.', rating: 5 },
                        { name: 'Rodrigo Silva', text: 'Melhor barbearia da região. Ambiente agradável e profissionalismo nota 10.', rating: 5 },
                        { name: 'Marcos Pereira', text: 'Sempre saio satisfeito. O sistema de agendamento facilita muito!', rating: 5 }
                    ].map((t, i) => (
                        <div key={i} className="testimonial-card">
                            <div className="testimonial-header">
                                <div className="testimonial-author">
                                    <div className="author-avatar">{t.name.charAt(0)}</div>
                                    <div className="author-info">
                                        <span className="author-name">{t.name}</span>
                                        <span className="author-status"><CheckCircle size={10} /> Cliente Verificado</span>
                                    </div>
                                </div>
                                <div className="testimonial-stars">
                                    {[...Array(t.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                </div>
                            </div>
                            <p className="testimonial-text">"{t.text}"</p>
                        </div>
                    ))}
                </div>

                {/* 9️⃣ GOOGLE REVIEW CTA */}
                <div className="google-review-box">
                    <div className="google-review-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="google-review-title">Gostou da experiência?</h3>
                        <p className="google-review-desc">Sua avaliação no Google nos ajuda a continuar entregando o melhor serviço!</p>
                    </div>
                    <a 
                        href="https://www.google.com/search?q=barbearia+local&oq=barbearia+local&aqs=chrome..69i57j0i512l9.1867j0j7&sourceid=chrome&ie=UTF-8#lrd=0x0:0x0,3" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-google-review"
                    >
                        <span className="google-g-logo">G</span>
                        AVALIAR NO GOOGLE
                    </a>
                </div>

            </div>

            {/* 📋 MODALS (Top Level) */}
            {isPlanModalOpen && (
                <div className="modal-overlay fade-in">
                    <div className="modal-content slide-up">
                        <div className="modal-header">
                            <h3 className="app-title-font">ASSINAR: {selectedPlan?.title}</h3>
                            <button className="modal-close" onClick={() => setIsPlanModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <p style={{marginBottom: '20px', color: '#888', fontSize: '0.9rem'}}>Seja um de nossos mensalistas e tenha benefícios exclusivos!</p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (isSubmitting) return;
                            setIsSubmitting(true);
                            try {
                                // 1. Find or create customer
                                let customerId;
                                const { data: existing } = await supabase
                                    .from('customers')
                                    .select('id')
                                    .eq('phone', subFormData.phone.trim());
                                    
                                if (existing && existing.length > 0) {
                                    customerId = existing[0].id;
                                } else {
                                    const { data: newCust, error: newErr } = await supabase
                                        .from('customers')
                                        .insert([{ name: subFormData.name, phone: subFormData.phone }])
                                        .select('id')
                                        .single();
                                    if (newErr) throw newErr;
                                    customerId = newCust.id;
                                }

                                // 2. Insert subscription
                                const { error } = await supabase.from('plan_subscriptions').insert([{
                                    plan_id: selectedPlan.id,
                                    customer_id: customerId,
                                    artist_id: subFormData.artist_id || null,
                                    start_month: subFormData.start_month,
                                    notes: subFormData.observation,
                                    status: 'pending'
                                }]);

                                if (error) throw error;

                                await Swal.fire({
                                    title: 'Solicitação Enviada!',
                                    text: 'Agora vamos finalizar sua assinatura no WhatsApp.',
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });

                                const msg = encodeURIComponent(`Olá! Gostaria de assinar o plano "${selectedPlan.title}". Meu nome é ${subFormData.name}.`);
                                const waUrl = `https://wa.me/${(siteData.contact.whatsapp || '').replace(/\D/g, '')}?text=${msg}`;
                                window.open(waUrl, '_blank');
                                setIsPlanModalOpen(false);
                            } catch (error) {
                                console.error('Error saving subscription:', error);
                                Swal.fire('Erro', 'Não foi possível processar sua solicitação: ' + error.message, 'error');
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}>
                            <div className="modal-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Seu Nome *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Seu nome completo"
                                            value={subFormData.name}
                                            onChange={e => setSubFormData({ ...subFormData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>WhatsApp (DDD + Número) *</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            placeholder="(11) 99999-9999"
                                            value={subFormData.phone}
                                            onChange={e => setSubFormData({ ...subFormData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Barbeiro de Preferência</label>
                                        <select
                                            className="form-input"
                                            value={subFormData.artist_id || ''}
                                            onChange={e => setSubFormData({ ...subFormData, artist_id: e.target.value })}
                                        >
                                            <option value="">Qualquer um</option>
                                            {artists?.map(artist => (
                                                <option key={artist.id} value={artist.id}>{artist.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Mês de Início</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={subFormData.start_month}
                                            onChange={e => setSubFormData({ ...subFormData, start_month: e.target.value })}
                                            placeholder="Ex: Abril 2026"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Observações (Opcional)</label>
                                    <textarea
                                        rows="2"
                                        className="form-input"
                                        placeholder="Alguma restrição, alergia, ou dúvida específica?"
                                        value={subFormData.observation}
                                        onChange={e => setSubFormData({ ...subFormData, observation: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '10px' }}>
                                    <button type="submit" className="btn-app-primary" style={{ padding: '14px 20px', width: '100%', maxWidth: '300px', fontSize: '0.9rem' }} disabled={isSubmitting}>
                                        {isSubmitting ? 'PROCESSANDO...' : 'CONFIRMAR E IR PARA O WHATSAPP'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPromoModalOpen && (
                <div className="modal-overlay fade-in">
                    <div className="modal-content slide-up">
                        <div className="modal-header">
                            <h3 className="app-title-font">QUERO ESTA OFERTA!</h3>
                            <button className="modal-close" onClick={() => setIsPromoModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <p style={{marginBottom: '20px', color: '#888', fontSize: '0.9rem'}}>Confirme seus dados para aproveitar a oferta <strong>{selectedPromo?.title}</strong>.</p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (isSubmitting) return;
                            setIsSubmitting(true);
                            try {
                                const { error } = await supabase.from('promotion_interests').insert([{
                                    promotion_id: selectedPromo.id,
                                    customer_name: promoFormData.name,
                                    customer_phone: promoFormData.phone,
                                    notes: promoFormData.preferred_barber ? `Profissional de preferência: ${promoFormData.preferred_barber}` : null,
                                    status: 'pending'
                                }]);

                                if (error) throw error;

                                await Swal.fire({
                                    title: 'Interesse Registrado!',
                                    text: 'Agora vamos falar no WhatsApp para agendar seu horário.',
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });

                                const msg = encodeURIComponent(`Olá! Gostaria de aproveitar a oferta "${selectedPromo.title}". Meu nome é ${promoFormData.name}. Poderia me dar mais informações?`);
                                const waUrl = `https://wa.me/${(siteData.contact.whatsapp || '').replace(/\D/g, '')}?text=${msg}`;
                                window.open(waUrl, '_blank');
                                setIsPromoModalOpen(false);
                            } catch (error) {
                                console.error('Error saving promo interest:', error);
                                Swal.fire('Erro', 'Não foi possível registrar seu interesse: ' + error.message, 'error');
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}>
                            <div className="modal-form">
                                <div className="form-group">
                                    <label>Seu Nome *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Como devemos lhe chamar?"
                                        value={promoFormData.name}
                                        onChange={e => setPromoFormData({ ...promoFormData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp (DDD + Número) *</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="(11) 99999-9999"
                                        value={promoFormData.phone}
                                        onChange={e => setPromoFormData({ ...promoFormData, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Profissional Preferido (Opcional)</label>
                                    <select
                                        className="form-input"
                                        value={promoFormData.preferred_barber || ''}
                                        onChange={e => setPromoFormData({ ...promoFormData, preferred_barber: e.target.value })}
                                    >
                                        <option value="">Qualquer um</option>
                                        {artists?.map(artist => (
                                            <option key={artist.id} value={artist.name}>{artist.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '10px' }}>
                                    <button type="submit" className="btn-app-primary" style={{ padding: '14px 20px', width: '100%', maxWidth: '300px', fontSize: '0.9rem' }} disabled={isSubmitting}>
                                        {isSubmitting ? 'PROCESSANDO...' : 'CONFIRMAR E IR PARA O WHATSAPP'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
