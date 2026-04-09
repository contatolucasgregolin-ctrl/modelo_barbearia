import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import { StatusBadge, Modal } from '../Admin';
import {
    Plus, Trash2, Save, Pencil, X, Check, RefreshCw, Eye, User, TrendingUp
} from 'lucide-react';
import MiniTutorial from '../../components/MiniTutorial';
import Swal from 'sweetalert2';

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS (MENSALISTAS) TAB
// ══════════════════════════════════════════════════════════════════════════════
const SubscriptionsTab = ({ cachedData, refreshAll }) => {
    const subscriptions = cachedData?.subscriptions || [];
    const loading = !cachedData?.subscriptions && !cachedData?.lastUpdate;
    const artists = cachedData?.artists || [];

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const handleEdit = (sub) => {
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
                artist_id: selectedSub.artist_id
            })
            .eq('id', selectedSub.id);

        if (!error) {
            refreshAll();
            setIsEditModalOpen(false);
        } else {
            alert('Erro ao salvar assinante.');
        }
    };

    const handleRecordSignal = async (sub) => {
        const { value: amount } = await Swal.fire({
            title: 'Registrar Sinal',
            text: `Digite o valor do SINAL pago por ${sub.customer?.name || 'este cliente'}:`,
            input: 'number',
            inputAttributes: { step: '0.01', min: '0' },
            showCancelButton: true,
            confirmButtonColor: 'var(--color-primary)',
            background: 'var(--color-bg-dark)',
            color: 'var(--color-text)'
        });

        if (!amount || isNaN(parseFloat(amount))) return;

        try {
            const { error: finError } = await supabase
                .from('finances')
                .insert([{
                    description: `Sinal Assinatura: ${sub.plan?.title || 'Plano'} (${sub.customer?.name || 'Cliente'})`,
                    amount: parseFloat(amount),
                    type: 'income',
                    category: 'Serviços',
                    date: new Date().toISOString().split('T')[0],
                    reference_id: sub.id
                }]);

            if (finError) throw finError;

            await supabase.from('plan_subscriptions').update({
                notes: `${sub.notes || ''}\n[Sistema] Sinal de R$ ${amount} registrado em ${new Date().toLocaleDateString('pt-BR')}`
            }).eq('id', sub.id);

            Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: 'Sinal registrado com sucesso no financeiro!',
                background: 'var(--color-bg-dark)',
                color: 'var(--color-text)',
                confirmButtonColor: 'var(--color-primary)'
            });
            refreshAll();
        } catch (error) {
            Swal.fire('Erro', error.message, 'error');
        }
    };

    const handleApproveSubscription = async (sub) => {
        const clientName = sub.customer?.name || 'Cliente';
        if (!(await myConfirm(`Confirmar pagamento TOTAL e ativar o plano ${sub.plan?.title || 'Plano'} para ${clientName}?`))) return;

        try {
            const now = new Date();
            const expiresAt = new Date();
            expiresAt.setDate(now.getDate() + 30);

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

            const { error: finError } = await supabase
                .from('finances')
                .insert([{
                    description: `Mensalidade: ${sub.plan?.title || 'Plano'} (${clientName})`,
                    amount: sub.plan?.price || 0,
                    type: 'income',
                    category: 'Serviços'
                }]);

            if (finError) throw finError;

            alert('Plano ativado e faturamento registrado com sucesso!');
            refreshAll();
        } catch (error) {
            console.error('Error approving sub:', error);
            alert('Erro ao processar aprovação: ' + error.message);
        }
    };

    const handleRenew = async (sub) => {
        const clientName = sub.customer?.name || 'Cliente';
        if (!(await myConfirm(`Gerar nova oferta de renovação para ${clientName}? Uma nova entrada pendente será criada.`))) return;

        try {
            const { error } = await supabase
                .from('plan_subscriptions')
                .insert([{
                    customer_id: sub.customer_id,
                    plan_id: sub.plan_id,
                    artist_id: sub.artist_id,
                    status: 'pending',
                    notes: `[Sistema] Oferta de renovação baseada na assinatura anterior (${sub.id}).`,
                    start_month: sub.start_month,
                    features_usage: {}
                }]);

            if (error) throw error;

            alert('Nova oferta de renovação criada como "Pendente"!');

            const phone = (sub.customer?.phone || '').replace(/\D/g, '');
            const msg = encodeURIComponent(`Olá ${sub.customer?.name}! Geramos uma nova oferta de renovação para o seu plano "${sub.plan?.title}". Assim que realizar o pagamento, me avise para ativarmos seu novo período!`);
            window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');

            refreshAll();
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
        if (!(await myConfirm('Tem certeza que deseja excluir esta assinatura?'))) return;
        const { error } = await supabase.from('plan_subscriptions').delete().eq('id', id);
        if (error) alert('Erro ao excluir: ' + error.message);
        else refreshAll();
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
            if (!(await myConfirm(`Tem certeza que deseja excluir ${selectedIds.length} assinatura(s)?`))) return;
            const { error } = await supabase.from('plan_subscriptions').delete().in('id', selectedIds);
            if (error) alert('Erro ao excluir algumas assinaturas.');
            refreshAll();
        } else {
            if (!(await myConfirm(`Tem certeza que deseja alterar o status de ${selectedIds.length} assinatura(s) para '${bulkAction}'?`))) return;
            const { error } = await supabase.from('plan_subscriptions').update({ status: bulkAction }).in('id', selectedIds);
            if (error) alert('Erro ao atualizar algumas assinaturas.');
            refreshAll();
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <MiniTutorial 
                id="subscriptions_guide" 
                title="Sua Máquina de Receita Recurrente" 
                text="Gerencie seus planos de assinatura e mensalistas aqui. Acompanhe o consumo de cortes no mês e garanta que ninguém fique com o pagamento pendente!" 
            />
            <div className="admin-section-header">
                <div>
                    <h2 className="admin-section-title">Mensalistas</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>Gerencie clientes que assinaram planos recorrentes ou pacotes de sessões.</p>
                </div>
                <button className="admin-refresh-btn" onClick={() => refreshAll()}><RefreshCw size={16} /> Atualizar</button>
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
                                    <input type="checkbox" checked={selectedIds.length === subscriptions.length && subscriptions.length > 0} onChange={toggleSelectAll} style={{ transform: 'scale(0.95)', cursor: 'pointer' }} />
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
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Nenhuma assinatura registrada.</td></tr>
                            ) : subscriptions.map(sub => (
                                <tr key={sub.id} style={selectedIds.includes(sub.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td data-label="Selecionar" style={{ textAlign: 'center' }}>
                                        <input type="checkbox" checked={selectedIds.includes(sub.id)} onChange={() => toggleSelectOne(sub.id)} style={{ transform: 'scale(0.95)', cursor: 'pointer' }} />
                                    </td>
                                    <td data-label="Data">
                                        <div>{new Date(sub.created_at).toLocaleDateString('pt-BR')}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(sub.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td data-label="Cliente">
                                        <strong>{sub.customer?.name || 'Cliente Removido'}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{sub.customer?.phone}</div>
                                    </td>
                                    <td data-label="Plano">
                                        <strong>{sub.plan?.title || 'Plano Removido'}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>R$ {sub.plan?.price} / {sub.plan?.period}</div>
                                    </td>
                                    <td data-label="Preferências">
                                        <div style={{ fontSize: '0.85rem' }}><strong>Profissional:</strong> {sub.artist?.name || 'Qualquer'}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#888' }}><strong>Início:</strong> {sub.start_month || 'Imediato'}</div>
                                    </td>
                                    <td data-label="Status / Validade">
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
                                    <td data-label="Consumo / Notas" className="admin-td-notes">
                                        {sub.status === 'active' && (
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                {['cortes', 'barbas', 'bebidas'].map((key, idx) => {
                                                    const icons = ['✂️', '🧔', '🥃'];
                                                    const labels = ['Corte', 'Barba', 'Bebida'];
                                                    return (
                                                        <div key={key} className="table-usage-badge">
                                                            <span className="usage-icon">{icons[idx]}</span>
                                                            <button
                                                                className="usage-minus-btn"
                                                                onClick={() => {
                                                                    const newUsage = { ...sub.features_usage, [key]: Math.max(0, (sub.features_usage?.[key] || 0) - 1) };
                                                                    supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => refreshAll());
                                                                }}
                                                                disabled={!(sub.features_usage?.[key] > 0)}
                                                                title={`Reduzir Uso de ${labels[idx]}`}
                                                            >-</button>
                                                            <span className="usage-numbers">
                                                                {sub.features_usage?.[key] || 0}/{sub.plan?.usage_limits?.[key] || 0}
                                                            </span>
                                                            <button
                                                                className="usage-plus-btn"
                                                                onClick={() => {
                                                                    const newUsage = { ...sub.features_usage, [key]: (sub.features_usage?.[key] || 0) + 1 };
                                                                    supabase.from('plan_subscriptions').update({ features_usage: newUsage }).eq('id', sub.id).then(() => refreshAll());
                                                                }}
                                                                title={`Registrar Uso de ${labels[idx]}`}
                                                            >+</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <div className="table-notes-text">{sub.notes || '-'}</div>
                                    </td>
                                    <td data-label="Ações" style={{ textAlign: 'right' }}>
                                        {sub.status === 'pending' && (
                                            <>
                                                <button className="admin-action-btn confirm" onClick={() => handleRecordSignal(sub)} title="Registrar Sinal de Pagamento" style={{ marginRight: 8, background: 'rgba(255,122,0,0.1)', color: 'var(--color-primary)' }}>
                                                    <TrendingUp size={16} />
                                                </button>
                                                <button className="admin-action-btn confirm" onClick={() => handleApproveSubscription(sub)} title="Aprovar Pagamento TOTAL e Ativar" style={{ marginRight: 8, background: '#4ade8022', color: '#4ade80' }}>
                                                    <Check size={16} />
                                                </button>
                                            </>
                                        )}
                                        {sub.status === 'active' && (
                                            <button className="admin-action-btn" onClick={() => handleRenew(sub)} title="Enviar Oferta de Renovação" style={{ marginRight: 8, background: '#facc1522', color: '#facc15' }}>
                                                <RefreshCw size={16} />
                                            </button>
                                        )}
                                        <button className="admin-action-btn" onClick={() => { setSelectedSub(sub); setIsDetailsModalOpen(true); }} title="Ver Detalhes"><Eye size={16} /></button>
                                        <button className="admin-action-btn" onClick={() => handleEdit(sub)} title="Editar"><Pencil size={16} /></button>
                                        <button className="admin-action-btn delete" onClick={() => handleDelete(sub.id)} title="Excluir"><Trash2 size={16} /></button>
                                        {sub.customer?.phone && sub.customer.phone !== '00000000000' && (
                                            <button className="whatsapp-chip-btn" title="Conversar no WhatsApp" onClick={() => {
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
                            <select className="app-form-control" value={selectedSub.status} onChange={e => setSelectedSub({ ...selectedSub, status: e.target.value })}>
                                <option value="pending">Pendente</option>
                                <option value="active">Ativo (Em andamento)</option>
                                <option value="completed">Concluído</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label>Profissional Preferido</label>
                            <select className="app-form-control" value={selectedSub.artist_id || ''} onChange={e => setSelectedSub({ ...selectedSub, artist_id: e.target.value })}>
                                <option value="">Qualquer um</option>
                                {artists?.map(artist => (
                                    <option key={artist.id} value={artist.id}>{artist.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label>Controle de Consumo (Mês Atual)</label>
                            <div className="usage-card">
                                {[['cortes', '✂️ Cortes Utilizados'], ['barbas', '🧔 Barbas Utilizadas'], ['bebidas', '🥃 Bebidas Cortesia']].map(([key, label]) => (
                                    <div key={key} className="usage-item">
                                        <div className="usage-label">
                                            <span>{label}</span>
                                            <span className="usage-limit-info">Limite: {selectedSub.plan?.usage_limits?.[key] || 0}</span>
                                        </div>
                                        <div className="usage-controls">
                                            <button type="button" className="usage-btn" onClick={() => incrementUsage(key, -1)}>-</button>
                                            <span className="usage-value">{selectedSub.features_usage?.[key] || 0}</span>
                                            <button type="button" className="usage-btn" onClick={() => incrementUsage(key, 1)}>+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <small style={{ color: '#888', marginTop: '8px', display: 'block' }}>
                                Atente-se aos limites definidos no plano (ex: VIP = 2 cortes, 1 barba).
                            </small>
                        </div>
                        <div className="admin-form-group">
                            <label>Anotações Gerais</label>
                            <textarea className="app-form-control" rows="3" placeholder="Notas adicionais..." value={selectedSub.notes || ''} onChange={e => setSelectedSub({ ...selectedSub, notes: e.target.value })} />
                            <small style={{ color: '#888', display: 'block', marginTop: '4px' }}>Fica registrado todo o histórico da assinatura na linha do tempo.</small>
                        </div>
                        <div className="admin-form-group">
                            <label>Mês de Início (Referência)</label>
                            <input type="text" className="app-form-control" placeholder="Ex: Abril de 2026" value={selectedSub.start_month || ''} onChange={e => setSelectedSub({ ...selectedSub, start_month: e.target.value })} />
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
                            <div style={{ marginTop: '4px' }}><StatusBadge status={selectedSub.status} /></div>
                        </div>
                        <div>
                            <strong style={{ color: '#aaa', fontSize: '0.85rem' }}>Anotações / Observações</strong>
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', minHeight: '60px', whiteSpace: 'pre-wrap', color: '#ddd' }}>
                                {selectedSub.notes || 'Nenhuma observação.'}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '24px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                         {selectedSub.status === 'pending' && (
                            <button className="admin-btn-primary" style={{ background: 'var(--color-primary)' }} onClick={() => handleRecordSignal(selectedSub)}>Registrar Sinal</button>
                        )}
                        <button className="admin-btn-secondary" onClick={() => setIsDetailsModalOpen(false)}>Fechar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SubscriptionsTab;
