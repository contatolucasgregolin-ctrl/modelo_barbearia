import React, { useState, useEffect, useCallback } from 'react';
import { supabase, uploadStorageFile, compressToWebP } from '../../lib/supabase';
import { Modal } from '../Admin';
import AIPromotionsPanel from './AIPromotionsPanel';
import AIPlansPanel from './AIPlansPanel';
import {
    Plus, Trash2, Save, Pencil, Megaphone, Sparkles, Brain
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════════
// PLANS & PROMOTIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
const PlansPromosTab = ({ cachedData, refreshAll }) => {
    const [viewMode, setViewMode] = useState('manual');
    const [plans, setPlans] = useState(cachedData?.plans || []);
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(!cachedData?.plans);

    // Plan Modal
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planForm, setPlanForm] = useState({ id: null, title: '', description: '', price: 0, period: 'por sessão', usage_limits: { cortes: 0, barbas: 0, bebidas: 0 }, is_popular: false, active: true, whatsapp_message: '' });

    // Promo Modal
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoForm, setPromoForm] = useState({ id: null, title: '', description: '', image_url: '', active: true });
    const [uploading, setUploading] = useState(false);

    // Inline delete confirmations
    const [confirmDeletePromoId, setConfirmDeletePromoId] = useState(null);
    const [confirmDeletePlanId, setConfirmDeletePlanId] = useState(null);

    const fetchPromos = useCallback(async () => {
        const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
        setPromotions(data || []);
        setLoading(false);
    }, []);

    const fetchLocalData = useCallback(async () => {
        const [plansRes, promosRes] = await Promise.all([
            supabase.from('plans').select('*').order('price'),
            supabase.from('promotions').select('*').order('created_at', { ascending: false })
        ]);
        setPlans(plansRes.data || []);
        setPromotions(promosRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (cachedData?.plans) setPlans(cachedData.plans);
        fetchPromos();
    }, [cachedData, fetchPromos]);

    const openPlan = (plan = null) => {
        if (plan) {
            const usage_limits = plan.usage_limits || { cortes: 0, barbas: 0, bebidas: 0 };
            setPlanForm({ ...plan, usage_limits, whatsapp_message: plan.whatsapp_message || '' });
        } else {
            setPlanForm({ id: null, title: '', description: '', price: 0, period: 'por mês', usage_limits: { cortes: 0, barbas: 0, bebidas: 0 }, is_popular: false, active: true, whatsapp_message: '' });
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
            description: planForm.description,
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
        fetchLocalData();
        if (refreshAll) refreshAll();
    };

    const deletePlan = async (id) => {
        try {
            const { error } = await supabase.from('plans').delete().eq('id', id);
            if (error) {
                console.error("Error deleting plan:", error);
                alert(`Erro ao excluir plano: ${error.message}`);
            } else {
                setConfirmDeletePlanId(null);
                fetchLocalData();
                if (refreshAll) refreshAll();
            }
        } catch (err) {
            console.error("Exception deleting plan:", err);
            alert("Ocorreu um erro inesperado ao excluir o plano.");
        }
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
        fetchLocalData();
        if (refreshAll) refreshAll();
    };

    const deletePromo = async (id) => {
        try {
            const { error } = await supabase.from('promotions').delete().eq('id', id);
            if (error) {
                console.error("Error deleting promotion:", error);
                alert(`Erro ao excluir: ${error.message}`);
            } else {
                setConfirmDeletePromoId(null);
                fetchLocalData();
                if (refreshAll) refreshAll();
            }
        } catch (err) {
            console.error("Exception deleting promotion:", err);
            alert("Ocorreu um erro inesperado ao excluir a promoção.");
        }
    };

    return (
        <div className="fade-in">
            {/* ── Mode Toggle ── */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                    onClick={() => setViewMode('manual')}
                    className={`nav-link ${viewMode === 'manual' ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: '1px solid', borderColor: viewMode === 'manual' ? 'var(--color-primary)' : 'var(--color-border)', background: viewMode === 'manual' ? 'rgba(255,122,0,0.1)' : 'rgba(255,255,255,0.05)', color: viewMode === 'manual' ? 'var(--color-primary)' : '#aaa', cursor: 'pointer' }}
                >
                    <Megaphone size={18} /> Gestão Manual
                </button>
                <button 
                    onClick={() => setViewMode('ai_promos')}
                    className={`nav-link ${viewMode === 'ai_promos' ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: '1px solid', borderColor: viewMode === 'ai_promos' ? '#f59e0b' : 'var(--color-border)', background: viewMode === 'ai_promos' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)', color: viewMode === 'ai_promos' ? '#f59e0b' : '#aaa', cursor: 'pointer' }}
                >
                    <Sparkles size={18} /> IA: Promoções Prontas
                </button>
                <button 
                    onClick={() => setViewMode('ai_plans')}
                    className={`nav-link ${viewMode === 'ai_plans' ? 'active' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '12px', border: '1px solid', borderColor: viewMode === 'ai_plans' ? '#8b5cf6' : 'var(--color-border)', background: viewMode === 'ai_plans' ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.05)', color: viewMode === 'ai_plans' ? '#8b5cf6' : '#aaa', cursor: 'pointer' }}
                >
                    <Brain size={18} /> IA: Planos VIP
                </button>
            </div>

            {viewMode === 'ai_promos' && <AIPromotionsPanel updateSiteData={refreshAll} />}
            {viewMode === 'ai_plans' && <AIPlansPanel updateSiteData={refreshAll} />}

            <div style={{ display: viewMode === 'manual' ? 'block' : 'none' }}>
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
                                <div style={{ display: 'flex', gap: '8px', zIndex: 10, position: 'relative' }}>
                                    <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); openPromo(promo); }}><Pencil size={16} /></button>
                                    {confirmDeletePromoId === promo.id ? (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); deletePromo(promo.id); }}>Sim</button>
                                            <button style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setConfirmDeletePromoId(null); }}>Não</button>
                                        </div>
                                    ) : (
                                        <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); setConfirmDeletePromoId(promo.id); }}><Trash2 size={16} /></button>
                                    )}
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
                                <div style={{ display: 'flex', gap: '8px', zIndex: 10, position: 'relative' }}>
                                    <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); openPlan(plan); }}><Pencil size={16} /></button>
                                    {confirmDeletePlanId === plan.id ? (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <button style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}>Sim</button>
                                            <button style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setConfirmDeletePlanId(null); }}>Não</button>
                                        </div>
                                    ) : (
                                        <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); setConfirmDeletePlanId(plan.id); }}><Trash2 size={16} /></button>
                                    )}
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
                        <div className="form-group">
                            <label>Descrição curta (Opcional)</label>
                            <textarea className="app-form-control" rows={2} placeholder="Ex: Acesso ilimitado a cortes e barbas com benefícios exclusivos..." value={planForm.description || ''} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} />
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
                                {[['cortes', '✂️ Cortes'], ['barbas', '🧔 Barbas'], ['bebidas', '🥃 Bebidas']].map(([key, label]) => (
                                    <div key={key} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '8px' }}>{label}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px' }}>
                                            <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, [key]: Math.max(0, planForm.usage_limits[key] - 1) } })}>-</button>
                                            <span style={{ fontWeight: 'bold' }}>{planForm.usage_limits[key]}</span>
                                            <button type="button" className="usage-btn" onClick={() => setPlanForm({ ...planForm, usage_limits: { ...planForm.usage_limits, [key]: planForm.usage_limits[key] + 1 } })}>+</button>
                                        </div>
                                    </div>
                                ))}
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
        </div>
    );
};

export default PlansPromosTab;
