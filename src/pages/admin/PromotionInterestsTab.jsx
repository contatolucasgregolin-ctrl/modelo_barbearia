import React, { useState, useEffect, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { SiteContext } from '../../context/SiteContext';
import { supabase } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import { StatusBadge } from '../Admin';
import {
    Trash2, X, RefreshCw, Megaphone, Sparkles, Brain, MessageCircle, Clock, User, TrendingUp
} from 'lucide-react';
import Swal from 'sweetalert2';

// ══════════════════════════════════════════════════════════════════════════════
// PROMOTION INTERESTS TAB (CRM Kanban)
// ══════════════════════════════════════════════════════════════════════════════
const PromotionInterestsTab = ({ cachedData, refreshAll }) => {
    const { siteData } = useContext(SiteContext);
    const interests = cachedData?.promotion_interests || [];
    const loading = !cachedData?.promotion_interests && !cachedData?.lastUpdate;
    
    const [filterStatus, setFilterStatus] = useState('all');
    const [scriptModal, setScriptModal] = useState(null);
    const [scriptCopied, setScriptCopied] = useState(false);
    
    // Modal de Finalização / Sinal
    const [finishModal, setFinishModal] = useState(null);
    const [finishForm, setFinishForm] = useState({ price: 0, deposit: 0, notes: '' });

    const updateStatus = async (id, status) => {
        const { error } = await supabase.from('promotion_interests').update({ status }).eq('id', id);
        if (error) alert(error.message);
        else refreshAll();
    };

    const [isFinishing, setIsFinishing] = useState(false);

    const handleFinishSale = async () => {
        if (!finishModal || isFinishing) return;
        
        setIsFinishing(true);
        try {
            // 1. Atualizar o lead
            const { error: leadErr } = await supabase.from('promotion_interests').update({ 
                status: 'completed',
                notes: `Venda finalizada: R$ ${finishForm.price} (Sinal: R$ ${finishForm.deposit}). ${finishForm.notes}`
            }).eq('id', finishModal.id);

            if (leadErr) throw leadErr;

            // 2. Registrar no financeiro se houver sinal
            if (parseFloat(finishForm.deposit) > 0) {
                const { error: finErr } = await supabase.from('finances').insert([{
                    description: `Sinal: ${finishModal.customer_name} (${finishModal.promotion?.title || 'Promoção'})`,
                    amount: parseFloat(finishForm.deposit),
                    type: 'income',
                    category: 'Serviços',
                    date: new Date().toISOString().split('T')[0],
                    reference_id: finishModal.id,
                    reference_type: 'promotion'
                }]);
                if (finErr) throw finErr;
            }

            Swal.fire({
                icon: 'success',
                title: 'Venda Concluída!',
                text: 'A venda foi finalizada e o sinal registrado.',
                background: 'var(--color-bg-dark)',
                color: 'var(--color-text)',
                confirmButtonColor: 'var(--color-primary)',
                timer: 2000
            });
            
            setFinishModal(null);
            refreshAll();
        } catch (err) {
            console.error("Erro ao finalizar venda:", err);
            Swal.fire('Erro', err.message, 'error');
        } finally {
            setIsFinishing(false);
        }
    };

    const removeInterest = async (id) => {
        if (!(await myConfirm('Deseja excluir este registro?'))) return;
        await supabase.from('promotion_interests').delete().eq('id', id);
        refreshAll();
    };

    const generateScript = (interest, tone) => {
        const promoTitle = interest.promotion?.title || 'nossa promoção';
        const firstName = interest.customer_name ? interest.customer_name.split(' ')[0] : 'amigo(a)';
        const phone = (interest.customer_phone || '').replace(/\D/g, '');

        let msg = '';
        if (tone === 'friendly') {
            msg = `Fala ${firstName}! Tudo bem? 😊\n\nVi que você curtiu a nossa oferta exclusiva *"${promoTitle}"*. Bora aproveitar e já deixar seu horário reservado para dar aquele talento no visual? ✂️💈\n\nQual dia fica melhor para você?`;
        } else if (tone === 'urgent') {
            msg = `Opa ${firstName}! 🚀\n\nNossa lista para a campanha *"${promoTitle}"* está disparando rápido. Estou passando só pra te lembrar e *garantir o seu horário antes que os slots acabem*.\n\nQual dia fica melhor para você? Responda agora e já garanto! 💪`;
        } else if (tone === 'formal') {
            msg = `Olá ${firstName}, como vai?\n\nRecebemos seu interesse na campanha *"${promoTitle}"*. Gostaríamos de confirmar um horário para seu atendimento nesta semana.\n\nFicaremos felizes em recebê-lo(a). Qual seria o melhor dia e horário para o senhor(a)?`;
        } else {
            msg = `Olá ${firstName}! 👋\n\nComo podemos ajudar hoje? Estamos à disposição!`;
        }

        return { msg, phone };
    };

    const handleWhatsApp = (interest, tone = 'friendly') => {
        const { msg, phone } = generateScript(interest, tone);

        if (!phone && tone !== 'custom') {
            setScriptModal({ text: msg, phone: '' });
            if (interest.status === 'pending') updateStatus(interest.id, 'contacted');
            return;
        }

        if (!phone) {
            alert('Este registro não tem um número de WhatsApp cadastrado.');
            return;
        }

        setScriptCopied(false);
        setScriptModal({ text: msg, phone, interestId: interest.id, interestStatus: interest.status });
        if (interest.status === 'pending') updateStatus(interest.id, 'contacted');
    };

    const sendWhatsApp = () => {
        if (!scriptModal?.phone) return;
        const encodedMsg = encodeURIComponent(scriptModal.text);
        window.open(`https://wa.me/55${scriptModal.phone}?text=${encodedMsg}`, '_blank');
        setScriptModal(null);
    };

    const copyScript = async () => {
        try {
            await navigator.clipboard.writeText(scriptModal?.text || '');
            setScriptCopied(true);
            setTimeout(() => setScriptCopied(false), 2000);
        } catch {
            const el = document.createElement('textarea');
            el.value = scriptModal?.text || '';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setScriptCopied(true);
            setTimeout(() => setScriptCopied(false), 2000);
        }
    };
    
    // Config do Kanban
    const COLUMNS = [
        { id: 'pending', title: 'Recentes', color: '#ffb300' },
        { id: 'contacted', title: 'Em Conversa', color: '#3b82f6' },
        { id: 'completed', title: 'Agendados', color: '#10b981' },
        { id: 'cancelled', title: 'Mornos', color: '#94a3b8' }
    ];

    const [mobileActiveCol, setMobileActiveCol] = useState('pending');

    if (loading) return <div className="admin-loading">Carregando interesses...</div>;

    const filteredInterests = interests.filter(i => filterStatus === 'all' || i.status === filterStatus);

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Interessados em Ofertas</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="admin-filter-select glass-panel">
                        <option value="all">Todos os Status</option>
                        <option value="pending">Pendentes</option>
                        <option value="contacted">Contatados</option>
                        <option value="completed">Concluídos</option>
                        <option value="cancelled">Cancelados</option>
                    </select>
                    <button className="admin-refresh-btn neon-glow" onClick={() => refreshAll()} title="Atualizar">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {interests.length === 0 ? (
                <div className="admin-empty-state glass-panel">
                    <Megaphone size={40} className="muted-icon" />
                    <p>Nenhum interesse registrado.</p>
                </div>
            ) : (
                <>
                {/* Mobile Column Switcher */}
                <div className="kanban-mobile-tabs glass-panel" style={{ marginBottom: '20px' }}>
                    {COLUMNS.map(col => (
                        <button 
                            key={col.id} 
                            className={`kanban-tab-btn ${mobileActiveCol === col.id ? 'active' : ''}`}
                            onClick={() => setMobileActiveCol(col.id)}
                            style={{ position: 'relative' }}
                        >
                            {col.title}
                            {interests.filter(i => i.status === col.id).length > 0 && (
                                <span className="tab-badge">{interests.filter(i => i.status === col.id).length}</span>
                            )}
                            {mobileActiveCol === col.id && <div className="tab-indicator" style={{ background: col.color }}></div>}
                        </button>
                    ))}
                </div>

                <div className={`admin-kanban-board ${filterStatus !== 'all' ? 'filtered-mode' : ''}`}>
                    {COLUMNS.filter(col => filterStatus === 'all' || filterStatus === col.id).map(col => {
                        const colLeads = interests.filter(item => item.status === col.id);
                        const isHiddenOnMobile = filterStatus === 'all' && mobileActiveCol !== col.id;
                        
                        return (
                        <div key={col.id} className={`kanban-column glass-panel ${isHiddenOnMobile ? 'mobile-hidden' : 'mobile-visible'}`} style={{ background: `${col.color}05` }}>
                            <div className="kanban-col-header" style={{ borderBottomColor: col.color, background: `${col.color}10` }}>
                                <h3 style={{ color: col.color, fontWeight: 800 }}>{col.title.toUpperCase()} <span className="kanban-count" style={{ background: col.color }}>{colLeads.length}</span></h3>
                            </div>
                            <div className="kanban-col-body">
                                {colLeads.map(item => (
                                    <div key={item.id} className="admin-lead-card card-glow kanban-card">
                                        <div className="lead-card-header">
                                            <div className="lead-date">🗓️ {new Date(item.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>

                                        <div className="lead-card-content">
                                            <div className="lead-info-main">
                                                <div className="lead-name" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)' }}>{item.customer_name}</div>
                                                <div className="lead-phone" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{item.customer_phone || <span style={{color:'#888',fontSize:'0.75rem'}}>Sem telefone</span>}</div>
                                            </div>
                                            <div className="lead-offer-box" style={{ background: 'var(--color-primary-soft)', borderLeft: '3px solid var(--color-primary)' }}>
                                                <div className="lead-offer-label" style={{ opacity: 0.7 }}>Campanha:</div>
                                                <div className="lead-offer-title" style={{ fontWeight: 700 }}>{item.promotion?.title || 'Lead Orgânico'}</div>
                                            </div>
                                        </div>

                                        <div className="lead-marketing-actions ai-scripts-box" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', marginTop: '12px' }}>
                                            <div className="marketing-label" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                                <Brain size={12} style={{marginRight:4, verticalAlign: 'middle'}}/> Roteiros de Conversão IA
                                            </div>
                                            <div className="marketing-btns" style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                                                gap: '8px' 
                                            }}>
                                                <button className="mkt-btn btn-ai-friendly" style={{ fontSize: '0.7rem', padding: '8px 4px' }} onClick={() => handleWhatsApp(item, 'friendly')}>
                                                    <Sparkles size={11} /> <span className="hide-xs">Amigável</span><span className="show-xs">S1</span>
                                                </button>
                                                <button className="mkt-btn btn-ai-urgent" style={{ fontSize: '0.7rem', padding: '8px 4px' }} onClick={() => handleWhatsApp(item, 'urgent')}>
                                                    <Clock size={11} /> <span className="hide-xs">Urgência</span><span className="show-xs">S2</span>
                                                </button>
                                                <button className="mkt-btn btn-ai-formal" style={{ fontSize: '0.7rem', padding: '8px 4px' }} onClick={() => handleWhatsApp(item, 'formal')}>
                                                    <User size={11} /> <span className="hide-xs">Formal</span><span className="show-xs">S3</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="lead-card-footer">
                                            <select
                                                value={item.status}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'completed') {
                                                        setFinishModal(item);
                                                        setFinishForm({ price: 0, deposit: 0, notes: '' });
                                                    } else {
                                                        updateStatus(item.id, val);
                                                    }
                                                }}
                                                className="admin-status-select-minimal"
                                            >
                                                <option value="pending">Pendente</option>
                                                <option value="contacted">Em Conversa</option>
                                                <option value="completed">✓ Concluir / Agendar</option>
                                                <option value="cancelled">✗ Lead Perdido</option>
                                            </select>

                                            <div className="lead-main-actions">
                                                <button className="admin-action-btn whatsapp-btn" title="Enviar mensagem no WhatsApp" onClick={() => handleWhatsApp(item, 'custom')}>
                                                    <MessageCircle size={16} /> Wpp
                                                </button>
                                                <button className="admin-action-btn delete-btn" onClick={() => removeInterest(item.id)} title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {colLeads.length === 0 && (
                                    <div className="kanban-empty-col">Nenhum cliente aqui.</div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
                </>
            )}

            {/* Modal de Finalização (Sinal) */}
            {finishModal && createPortal(
                <div className="admin-modal-overlay" onClick={() => setFinishModal(null)}>
                    <div className="admin-modal glass-panel fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="admin-modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={20} style={{ color: '#10b981' }} />
                                Finalizar Venda / Sinal
                            </h3>
                            <button className="admin-modal-close" onClick={() => setFinishModal(null)}><X size={20} /></button>
                        </div>
                        <div className="admin-modal-body" style={{ padding: '24px' }}>
                            <div className="lead-info-summary" style={{ marginBottom: '24px', padding: '16px', background: 'var(--color-primary-soft)', borderRadius: '16px', border: '1px solid rgba(255,122,0,0.1)' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '4px' }}>{finishModal.customer_name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', opacity: 0.8, fontWeight: 500 }}>
                                    🎯 {finishModal.promotion?.title || 'Interesse em Oferta'}
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="admin-form-group">
                                    <label>Preço Acordado (R$)</label>
                                    <input 
                                        type="number" 
                                        className="admin-input" 
                                        value={finishForm.price}
                                        onChange={e => setFinishForm({...finishForm, price: e.target.value})}
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Sinal Pago (R$)</label>
                                    <input 
                                        type="number" 
                                        className="admin-input" 
                                        style={{ borderColor: '#10b981' }}
                                        value={finishForm.deposit}
                                        onChange={e => setFinishForm({...finishForm, deposit: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="admin-form-group">
                                <label>Observações</label>
                                <textarea 
                                    className="admin-input" 
                                    rows={2}
                                    placeholder="Ex: Pagou no PIX, marcou para sábado..."
                                    value={finishForm.notes}
                                    onChange={e => setFinishForm({...finishForm, notes: e.target.value})}
                                />
                            </div>
                            
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                * Ao confirmar, o sinal será registrado automaticamente no Financeiro.
                            </p>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button className="admin-btn-secondary" onClick={() => setFinishModal(null)} disabled={isFinishing}>Voltar</button>
                                <button className="admin-btn-primary neon-glow" onClick={handleFinishSale} style={{ background: '#10b981' }} disabled={isFinishing}>
                                    {isFinishing ? 'Salvando...' : 'Confirmar e Concluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Preview do Script IA */}
            {scriptModal && createPortal(
                <div className="admin-modal-overlay" onClick={() => setScriptModal(null)}>
                    <div className="admin-modal glass-panel fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="admin-modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                                Roteiro Gerado pela IA
                            </h3>
                            <button className="admin-modal-close" onClick={() => setScriptModal(null)}><X size={20} /></button>
                        </div>
                        <div className="admin-modal-body">
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                                Revise e edite o texto abaixo antes de enviar:
                            </p>
                            <textarea
                                value={scriptModal.text}
                                onChange={e => setScriptModal(m => ({ ...m, text: e.target.value }))}
                                rows={8}
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--color-border)', borderRadius: '10px',
                                    padding: '14px', color: 'var(--color-text)', fontSize: '0.9rem',
                                    lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
                                <button className="admin-btn-secondary" onClick={() => setScriptModal(null)}>Cancelar</button>
                                <button
                                    className="admin-btn-secondary"
                                    onClick={copyScript}
                                    style={{ borderColor: scriptCopied ? '#4ade80' : undefined, color: scriptCopied ? '#4ade80' : undefined }}
                                >
                                    {scriptCopied ? '✅ Copiado!' : '📋 Copiar Texto'}
                                </button>
                                {scriptModal.phone ? (
                                    <button className="admin-btn-primary neon-glow" onClick={sendWhatsApp}
                                        style={{ background: '#25D366', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}>
                                        <MessageCircle size={16} style={{ marginRight: '6px' }} /> Enviar no WhatsApp
                                    </button>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        ⚠️ Sem número cadastrado — envie manualmente.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PromotionInterestsTab;
