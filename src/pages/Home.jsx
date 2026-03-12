import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext';
import { supabase } from '../lib/supabase';
import { MapPin, Star, Info, X } from 'lucide-react';
import '../styles/Home.css';

const Home = () => {
    const navigate = useNavigate();
    const { siteData } = useContext(SiteContext);

    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [artists, setArtists] = useState([]);
    const [subFormData, setSubFormData] = useState({
        name: '',
        phone: '',
        artist_id: '',
        start_month: '',
        observation: ''
    });

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
                                            setSelectedPlan(plan);
                                            // Pre-fill next month by default
                                            const nextMonth = new Date();
                                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                                            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

                                            setSubFormData(prev => ({
                                                ...prev,
                                                start_month: monthNames[nextMonth.getMonth()] + ' de ' + nextMonth.getFullYear()
                                            }));
                                            setIsPlanModalOpen(true);
                                        }}
                                    >
                                        ASSINAR PLANO
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ textAlign: 'center', color: '#888', marginTop: '30px' }}>Nenhum plano disponível no momento.</p>
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

            {/* PLAN SUBSCRIPTION MODAL */}
            {isPlanModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 99999 }}>
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3>Assinar Plano</h3>
                            <button
                                className="modal-close"
                                type="button"
                                onClick={() => setIsPlanModalOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '16px', marginTop: '-8px' }}>
                            Preencha os dados abaixo para reservar sua assinatura.
                            Você será redirecionado para o WhatsApp para finalizar.
                        </p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!subFormData.name || !subFormData.phone || !selectedPlan) {
                                alert("Por favor, preencha nome e WhatsApp.");
                                return;
                            }

                            const cleanPhone = subFormData.phone.replace(/\D/g, '');

                            try {
                                // 1. Look up existing customer or create
                                let { data: customer } = await supabase
                                    .from('customers')
                                    .select('id')
                                    .eq('phone', cleanPhone)
                                    .maybeSingle();

                                let customerId = customer?.id;

                                if (!customerId) {
                                    const { data: newCust } = await supabase
                                        .from('customers')
                                        .insert([{ name: subFormData.name, phone: cleanPhone }])
                                        .select('id')
                                        .single();
                                    customerId = newCust?.id;
                                }

                                // 2. Create subscription request
                                if (customerId) {
                                    const combinedNotes = subFormData.observation
                                        ? `Assinatura solicitada via site (${selectedPlan.title})\n\nObservação do cliente:\n${subFormData.observation}`
                                        : `Assinatura solicitada via site (${selectedPlan.title})`;

                                    await supabase.from('plan_subscriptions').insert([{
                                        customer_id: customerId,
                                        plan_id: selectedPlan.id,
                                        status: 'pending',
                                        artist_id: subFormData.artist_id || null,
                                        start_month: subFormData.start_month,
                                        notes: combinedNotes
                                    }]);
                                }
                            } catch (err) {
                                console.error("Erro ao registrar plano:", err);
                            }

                            // 3. Redirect to WhatsApp
                            const studioPhone = (siteData?.contact?.whatsapp || '5511939407229').replace(/\D/g, '');
                            const barberName = artists.find(a => a.id === subFormData.artist_id)?.name || 'Qualquer profissional';
                            let msg = `Olá! Gostaria de assinar o plano *${selectedPlan.title}*.\n\n`;
                            msg += `*Meus Dados:*\nNome: ${subFormData.name}\n`;
                            msg += `*Preferências:*\nProfissional: ${barberName}\nMês de Início: ${subFormData.start_month}\n`;
                            if (subFormData.observation) {
                                msg += `\n*Observação:*\n${subFormData.observation}\n`;
                            }
                            msg += `\nComo fazemos para concluir a assinatura?`;

                            window.open(`https://api.whatsapp.com/send?phone=${studioPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                            setIsPlanModalOpen(false);
                            setSubFormData({ name: '', phone: '', artist_id: '', start_month: '', observation: '' });
                        }}>
                            <div className="modal-form">
                                <div className="form-group">
                                    <label>Plano Escolhido</label>
                                    <select
                                        className="app-form-control"
                                        value={selectedPlan?.id || ''}
                                        onChange={(e) => setSelectedPlan(activePlans.find(p => p.id === e.target.value))}
                                        required
                                    >
                                        {activePlans.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} - R${p.price}/{p.period}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div className="form-group">
                                        <label>Nome Completo *</label>
                                        <input
                                            type="text"
                                            className="app-form-control"
                                            placeholder="Ex: João Silva"
                                            value={subFormData.name}
                                            onChange={e => setSubFormData({ ...subFormData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>WhatsApp *</label>
                                        <input
                                            type="tel"
                                            className="app-form-control"
                                            placeholder="(11) 99999-9999"
                                            value={subFormData.phone}
                                            onChange={e => setSubFormData({ ...subFormData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div className="form-group">
                                        <label>Profissional Preferido</label>
                                        <select
                                            className="app-form-control"
                                            value={subFormData.preferred_barber}
                                            onChange={e => setSubFormData({ ...subFormData, preferred_barber: e.target.value })}
                                        >
                                            <option value="">Qualquer um</option>
                                            {artists?.map(artist => (
                                                <option key={artist.id} value={artist.name}>{artist.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Mês de Início</label>
                                        <input
                                            type="text"
                                            className="app-form-control"
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
                                        className="app-form-control"
                                        placeholder="Alguma restrição, alergia, ou dúvida específica?"
                                        value={subFormData.observation}
                                        onChange={e => setSubFormData({ ...subFormData, observation: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
                                    <button type="submit" className="btn-app-primary" style={{ padding: '14px 36px', width: 'auto', minWidth: '220px', fontSize: '0.95rem' }}>
                                        Confirmar e Ir para o WhatsApp
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
