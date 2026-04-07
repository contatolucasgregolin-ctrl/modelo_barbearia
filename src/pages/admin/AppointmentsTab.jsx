import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import {
    CalendarDays, Plus, Trash2, X, Check, Ban, Trophy, RefreshCw, Eye, DollarSign
} from 'lucide-react';
import { StatusBadge } from '../Admin';
import BarberUsageModal from './BarberUsageModal';
import MiniTutorial from '../../components/MiniTutorial';
import Swal from 'sweetalert2';

// ── Appointment Details Modal (Premium) ──
const AppointmentDetailsModal = ({ appointment, onClose, onUpdateStatus }) => {
    if (!appointment) return null;

    const cleanPhone = (appointment.customer?.phone || '').replace(/\D/g, '');
    const clientName = appointment.customer?.name || 'Cliente Sem Nome';
    const serviceName = appointment.service?.name || 'Serviço Personalizado';
    const professionalName = appointment.artist?.name || 'Não atribuído';
    const professionalPhoto = appointment.artist?.photo_url;

    return createPortal(
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal glass-panel fade-in" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                
                {/* Header Premium */}
                <div className="admin-modal-header" style={{ borderBottom: '1px solid var(--color-border)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', borderRadius: '6px', textTransform: 'uppercase' }}>
                                Ref: #{appointment.id.split('-')[0]}
                            </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                            Detalhes do Agendamento
                        </h3>
                    </div>
                    <button className="admin-modal-close" onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={22} />
                    </button>
                </div>

                <div className="admin-modal-body" style={{ padding: '0 32px 32px', overflowY: 'auto', maxHeight: '70vh' }}>
                    
                    {/* Status & Valor Hero */}
                    <div style={{ 
                        marginTop: '24px',
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '16px',
                        marginBottom: '32px'
                    }}>
                        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CalendarDays size={24} className="text-primary" />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Status Atual</div>
                                <StatusBadge status={appointment.status} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Valor do Serviço</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>R$ {parseFloat(appointment.session_price || 0).toFixed(2)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Sinal</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: appointment.deposit_status === 'paid' ? '#4ade80' : 'var(--color-text-muted)' }}>
                                    {appointment.deposit_price > 0 ? `R$ ${parseFloat(appointment.deposit_price).toFixed(2)}` : 'R$ 0.00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '40px' }}>
                        
                        {/* Coluna da Esquerda: Dados Principais */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            
                            {/* Bloco Cliente */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                    {clientName.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Cliente</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{clientName}</div>
                                    {cleanPhone && (
                                        <button 
                                            className="whatsapp-chip-btn" 
                                            onClick={() => window.open(`https://wa.me/55${cleanPhone}`, '_blank')}
                                            style={{ marginTop: '8px', padding: '4px 12px', fontSize: '0.75rem' }}
                                        >
                                            WhatsApp
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Detalhes Técnicos */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="info-item" style={{ background: 'transparent', padding: 0 }}>
                                    <div className="info-label" style={{ marginBottom: '6px' }}>📅 Data e Horário</div>
                                    <div className="info-value" style={{ fontSize: '1rem', fontWeight: 600 }}>
                                        {new Date(appointment.date).toLocaleDateString('pt-BR')} <br/>
                                        <span style={{ color: 'var(--color-primary)' }}>{appointment.time}</span>
                                    </div>
                                </div>
                                <div className="info-item" style={{ background: 'transparent', padding: 0 }}>
                                    <div className="info-label" style={{ marginBottom: '6px' }}>✂️ Serviço</div>
                                    <div className="info-value" style={{ fontSize: '1rem', fontWeight: 600 }}>{serviceName}</div>
                                </div>
                                <div className="info-item" style={{ background: 'transparent', padding: 0, gridColumn: 'span 2' }}>
                                    <div className="info-label" style={{ marginBottom: '10px' }}>👥 Profissional Atribuído</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-primary-soft)' }}>
                                            <img src={professionalPhoto || 'https://via.placeholder.com/36'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={professionalName} />
                                        </div>
                                        <div style={{ fontWeight: 600 }}>{professionalName}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna da Direita: Jornada & Ações */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 20px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    📈 Jornada do Atendimento
                                </h4>
                                <div className="status-timeline premium-timeline">
                                    <div className={`timeline-step ${(appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'finished') ? 'active' : ''}`}>
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">Solicitado</div>
                                        </div>
                                    </div>
                                    <div className={`timeline-step ${(appointment.status === 'confirmed' || appointment.status === 'finished') ? 'active' : ''}`}>
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">Confirmado</div>
                                        </div>
                                    </div>
                                    <div className={`timeline-step ${appointment.status === 'finished' ? 'active' : ''}`}>
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-content">
                                            <div className="timeline-title">Concluído</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Finance Summary for this Appt */}
                            <div style={{ 
                                padding: '20px', 
                                background: 'rgba(64, 255, 122, 0.03)', 
                                borderRadius: '24px', 
                                border: '1px solid rgba(64, 255, 122, 0.1)' 
                            }}>
                                <h4 style={{ fontSize: '0.85rem', color: '#4ade80', margin: '0 0 16px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    💳 Resumo Financeiro
                                </h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Valor Total:</span>
                                    <span style={{ fontWeight: 700 }}>R$ {parseFloat(appointment.session_price || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Sinal Recebido:</span>
                                    <span style={{ fontWeight: 700, color: appointment.deposit_status === 'paid' ? '#4ade80' : 'var(--color-text-muted)' }}>
                                        R$ {parseFloat(appointment.deposit_price || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800 }}>
                                    <span>Saldo Restante:</span>
                                    <span style={{ color: 'var(--color-primary)' }}>
                                        R$ {Math.max(0, (appointment.session_price || 0) - (appointment.deposit_status === 'paid' ? (appointment.deposit_price || 0) : 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="admin-modal-footer" style={{ borderTop: '1px solid var(--color-border)', padding: '24px 32px', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(255,255,255,0.01)' }}>
                    <button className="admin-btn-secondary" onClick={onClose}>Fechar</button>
                    {appointment.deposit_status !== 'paid' && appointment.status !== 'cancelled' && (
                        <button className="admin-btn-primary" 
                            style={{ background: 'rgba(64, 255, 122, 0.1)', color: '#4ade80', border: '1px solid rgba(64, 255, 122, 0.2)' }}
                            onClick={() => { onRegisterDeposit(appointment); onClose(); }}
                        >
                            <DollarSign size={16} /> Registrar Sinal
                        </button>
                    )}
                    {appointment.status !== 'finished' && appointment.status !== 'cancelled' && (
                        <>
                            <button className="admin-btn-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => { onUpdateStatus(appointment.id, 'cancelled'); onClose(); }}>
                                Cancelar
                            </button>
                            <button className="admin-btn-primary neon-glow" onClick={() => { onUpdateStatus(appointment.id, 'confirmed'); onClose(); }}>
                                <Check size={16} /> Confirmar Vaga
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS TAB
// ══════════════════════════════════════════════════════════════════════════════
const AppointmentsTab = ({ appointments: allAppointments, loading: globalLoading, refreshAll }) => {
    const [filters, setFilters] = useState({ date: '', status: '', service: '' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [usageModalApp, setUsageModalApp] = useState(null);
    const [detailsModalApp, setDetailsModalApp] = useState(null);
    const [showNewApptModal, setShowNewApptModal] = useState(false);
    const [newApptForm, setNewApptForm] = useState({ customer_name: '', customer_phone: '', service_id: '', artist_id: '', date: '', time: '', notes: '', status: 'confirmed' });
    const [newApptServices, setNewApptServices] = useState([]);
    const [newApptArtists, setNewApptArtists] = useState([]);
    const [newApptSaving, setNewApptSaving] = useState(false);

    // Carrega serviços e profissionais para o modal de novo agendamento
    useEffect(() => {
        supabase.from('services').select('id, name, price, duration_mins').order('name').then(({ data }) => setNewApptServices(data || []));
        supabase.from('artists').select('id, name').order('name').then(({ data }) => setNewApptArtists(data || []));
    }, []);

    const openNewAppt = () => {
        const today = new Date().toISOString().split('T')[0];
        setNewApptForm({ customer_name: '', customer_phone: '', service_id: '', artist_id: '', date: today, time: '10:00', notes: '', status: 'confirmed' });
        setShowNewApptModal(true);
    };

    const saveNewAppt = async () => {
        if (!newApptForm.customer_name || !newApptForm.service_id || !newApptForm.date || !newApptForm.time) {
            return alert('Preencha pelo menos: Nome do Cliente, Serviço, Data e Horário.');
        }
        setNewApptSaving(true);
        try {
            // 1. Encontra ou cria o cliente
            let customerId = null;
            const cleanPhone = newApptForm.customer_phone.replace(/\D/g, '');
            if (cleanPhone) {
                const { data: existing } = await supabase.from('customers').select('id').eq('phone', cleanPhone).maybeSingle();
                if (existing) {
                    customerId = existing.id;
                } else {
                    const { data: created } = await supabase.from('customers').insert([{ name: newApptForm.customer_name, phone: cleanPhone }]).select('id').single();
                    customerId = created?.id;
                }
            } else {
                const { data: created } = await supabase.from('customers').insert([{ name: newApptForm.customer_name }]).select('id').single();
                customerId = created?.id;
            }

            // 2. Obtém o preço do serviço
            const selectedService = newApptServices.find(s => s.id === newApptForm.service_id);

            // 3. Cria o agendamento
            const { error } = await supabase.from('appointments').insert([{
                customer_id: customerId,
                service_id: newApptForm.service_id,
                artist_id: newApptForm.artist_id || null,
                date: newApptForm.date,
                time: newApptForm.time,
                status: newApptForm.status,
                session_price: selectedService?.price || 0,
                description: newApptForm.notes || null,
            }]);

            if (error) throw error;

            setShowNewApptModal(false);
            refreshAll();
        } finally {
            setNewApptSaving(false);
        }
    };

    const handleRegisterDeposit = async (app) => {
        const { value: amount } = await Swal.fire({
            title: 'Registrar Sinal',
            text: `Informe o valor do sinal recebido para o serviço de ${app.service?.name}:`,
            input: 'number',
            inputAttributes: { step: '0.01', min: '0' },
            showCancelButton: true,
            confirmButtonText: 'Registrar',
            cancelButtonText: 'Cancelar'
        });

        if (amount && parseFloat(amount) >= 0) {
            const val = parseFloat(amount);
            // 1. Atualiza o agendamento
            const { error: updErr } = await supabase.from('appointments').update({
                deposit_price: val,
                deposit_status: 'paid'
            }).eq('id', app.id);

            if (updErr) return Swal.fire('Erro', updErr.message, 'error');

            // 2. Insere na tabela de finanças
            await supabase.from('finances').insert([{
                amount: val,
                description: `Sinal: Agendamento de ${app.customer?.name} (${app.service?.name})`,
                category: 'Serviços',
                type: 'income',
                date: new Date().toISOString().split('T')[0],
                reference_id: app.id
            }]);

            Swal.fire('Sucesso', 'Sinal registrado com sucesso e lançado no financeiro.', 'success');
            refreshAll();
        }
    };

    // Client-side filtering for instant response and reliability
    const appointments = useMemo(() => {
        return allAppointments.filter(app => {
            const matchDate = !filters.date || app.date === filters.date;
            const matchStatus = !filters.status || app.status === filters.status;
            const matchService = !filters.service || 
                (app.service?.name || '').toLowerCase().includes(filters.service.toLowerCase()) ||
                (app.customer?.name || '').toLowerCase().includes(filters.service.toLowerCase());
            return matchDate && matchStatus && matchService;
        });
    }, [allAppointments, filters]);

    const updateStatus = async (id, status) => {
        // Ao finalizar, abrir modal para o barbeiro registrar o consumo
        if (status === 'finished') {
            const app = appointments.find(a => a.id === id);
            if (app) {
                const enriched = {
                    ...app,
                    customer_name: app.customer?.name || 'Cliente',
                    service_name: app.service?.name || 'Serviço',
                    barber_name: app.artist?.name || '',
                };
                setUsageModalApp(enriched);
                return;
            }
        }
        await supabase.from('appointments').update({ status }).eq('id', id);
        refreshAll();
    };

    const finalizeAppointment = async (app) => {
        await supabase.from('appointments').update({ status: 'finished' }).eq('id', app.id);
        setUsageModalApp(null);
        refreshAll();
    };

    const deleteAppointment = async (id) => {
        if (!(await myConfirm('Excluir este agendamento?'))) return;
        await supabase.from('appointments').delete().eq('id', id);
        refreshAll();
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
            if (!(await myConfirm(`Tem certeza que deseja excluir ${selectedIds.length} agendamento(s)?`))) return;
            await supabase.from('appointments').delete().in('id', selectedIds);
            refreshAll();
        } else {
            // It's a status update
            if (!(await myConfirm(`Tem certeza que deseja alterar o status de ${selectedIds.length} agendamento(s) para '${bulkAction}'?`))) return;
            await supabase.from('appointments').update({ status: bulkAction }).in('id', selectedIds);
            refreshAll();
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <MiniTutorial 
                id="appointments_guide" 
                title="Dominando sua Agenda" 
                text="Gerencie todos os cortes marcados. Você pode confirmar, cancelar ou finalizar um atendimento para dar baixa no estoque automaticamente." 
            />
            <div className="admin-section-header">
                <h2 className="admin-section-title">Agendamentos</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="admin-add-btn neon-glow" onClick={openNewAppt}>
                        <Plus size={16} /> <span>Novo Agendamento</span>
                    </button>
                    <button className="admin-refresh-btn" onClick={refreshAll}><RefreshCw size={16} /> Atualizar</button>
                </div>
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

            {globalLoading ? (
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
                                    <td data-label="Selecionar" style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(app.id)}
                                            onChange={() => toggleSelectOne(app.id)}
                                            style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td data-label="Data / Hora">
                                        <strong>{app.date?.split('-').reverse().join('/')}</strong>
                                        <br /><span className="table-muted">{app.time}</span>
                                    </td>
                                    <td data-label="Cliente / Contato">
                                        <strong>{app.customer?.name || 'Cliente'}</strong>
                                        <br /><span className="table-muted">{app.customer?.phone || '-'}</span>
                                    </td>
                                    <td data-label="Serviço e Valores (Sinal)">
                                        <strong>{app.service?.name || 'Serviço'}</strong>
                                        <br /><span className="table-muted">Total: R$ {parseFloat(app.session_price || 0).toFixed(2)}</span>
                                        {app.deposit_price > 0 && (
                                            <div style={{ fontSize: '0.8rem', marginTop: '4px', color: app.deposit_status === 'paid' ? '#4ade80' : '#facc15' }}>
                                                Sinal: R$ {parseFloat(app.deposit_price).toFixed(2)} ({app.deposit_status === 'paid' ? 'Pago' : 'Pendente'})
                                            </div>
                                        )}
                                    </td>
                                    <td data-label="Profissional">{app.artist?.name || '-'}</td>
                                    <td data-label="Status"><StatusBadge status={app.status} /></td>
                                    <td data-label="Ações">
                                        <div className="table-actions">
                                            <button className="action-btn" title="Ver Detalhes" onClick={() => setDetailsModalApp(app)} style={{ color: 'var(--color-primary)' }}><Eye size={16} /></button>
                                            {app.deposit_status !== 'paid' && app.status !== 'cancelled' && (
                                                <button className="action-btn" title="Registrar Sinal" onClick={() => handleRegisterDeposit(app)} style={{ color: '#4ade80' }}><DollarSign size={14} /></button>
                                            )}
                                            <button className="action-btn confirm" title="Confirmar" onClick={() => updateStatus(app.id, 'confirmed')}><Check size={14} /></button>
                                            <button className="action-btn finish" title="Finalizar" onClick={() => updateStatus(app.id, 'finished')}><Trophy size={14} /></button>
                                            <button className="action-btn cancel" title="Cancelar" onClick={() => updateStatus(app.id, 'cancelled')}><Ban size={14} /></button>
                                            <button className="action-btn delete" title="Excluir" onClick={() => deleteAppointment(app.id)}><Trash2 size={14} /></button>
                                            
                                            {app.customer?.phone && app.customer.phone !== '00000000000' && (
                                                <button 
                                                    className="whatsapp-chip-btn" 
                                                    title="Conversar no WhatsApp" 
                                                    onClick={() => {
                                                        const cleanPhone = (app.customer.phone || '').replace(/\D/g, '');
                                                        window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                                                    }}
                                                >
                                                    Wpp
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* BarberUsageModal — aparece ao finalizar o atendimento */}
            {usageModalApp && (
                <BarberUsageModal
                    appointment={usageModalApp}
                    onClose={() => setUsageModalApp(null)}
                    onSaved={() => finalizeAppointment(usageModalApp)}
                />
            )}

            {/* AppointmentDetailsModal — Detalhes completos e lucratividade */}
            {detailsModalApp && (
                <AppointmentDetailsModal
                    appointment={detailsModalApp}
                    onClose={() => setDetailsModalApp(null)}
                    onUpdateStatus={updateStatus}
                    onRegisterDeposit={handleRegisterDeposit}
                />
            )}

            {/* Modal de Novo Agendamento Manual */}
            {showNewApptModal && createPortal(
                <div className="admin-modal-overlay" onClick={() => setShowNewApptModal(false)}>
                    <div className="admin-modal glass-panel fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="admin-modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CalendarDays size={20} style={{ color: 'var(--color-primary)' }} />
                                Novo Agendamento Manual
                            </h3>
                            <button className="admin-modal-close" onClick={() => setShowNewApptModal(false)}><X size={20} /></button>
                        </div>
                        <div className="admin-modal-body">
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '20px', padding: '10px 14px', background: 'rgba(255,122,0,0.06)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                                ✏️ Use esta função para registrar um agendamento de um cliente que entrou em contato por telefone, presencialmente ou pelo WhatsApp.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Nome do Cliente *</label>
                                    <input className="form-input" value={newApptForm.customer_name}
                                        onChange={e => setNewApptForm(f => ({ ...f, customer_name: e.target.value }))}
                                        placeholder="Ex: João Silva" />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Telefone / WhatsApp</label>
                                    <input className="form-input" value={newApptForm.customer_phone}
                                        onChange={e => setNewApptForm(f => ({ ...f, customer_phone: e.target.value }))}
                                        placeholder="(31) 99999-9999" />
                                    <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Se o número já estiver no sistema, o cliente será vinculado automaticamente.</small>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Serviço *</label>
                                    <select className="form-input" value={newApptForm.service_id}
                                        onChange={e => setNewApptForm(f => ({ ...f, service_id: e.target.value }))}>
                                        <option value="">Selecione o serviço...</option>
                                        {newApptServices.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} — R$ {parseFloat(s.price).toFixed(2)} ({s.duration_mins} min)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Profissional</label>
                                    <select className="form-input" value={newApptForm.artist_id}
                                        onChange={e => setNewApptForm(f => ({ ...f, artist_id: e.target.value }))}>
                                        <option value="">Qualquer profissional</option>
                                        {newApptArtists.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Data *</label>
                                    <input type="date" className="form-input" value={newApptForm.date}
                                        onChange={e => setNewApptForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Horário *</label>
                                    <input type="time" className="form-input" value={newApptForm.time}
                                        onChange={e => setNewApptForm(f => ({ ...f, time: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Status Inicial</label>
                                    <select className="form-input" value={newApptForm.status}
                                        onChange={e => setNewApptForm(f => ({ ...f, status: e.target.value }))}>
                                        <option value="pending">Pendente</option>
                                        <option value="confirmed">Confirmado</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Observações</label>
                                    <textarea className="form-input" rows={2} value={newApptForm.notes}
                                        onChange={e => setNewApptForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Preferências, alergias, detalhes do serviço..." />
                                </div>
                            </div>

                            {newApptForm.service_id && (() => {
                                const svc = newApptServices.find(s => s.id === newApptForm.service_id);
                                return svc ? (
                                    <div style={{ background: 'rgba(255,122,0,0.07)', border: '1px solid rgba(255,122,0,0.2)', borderRadius: '10px', padding: '12px 16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Resumo do Serviço</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{svc.name} ({svc.duration_mins} min)</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Valor</span>
                                            <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.2rem' }}>R$ {parseFloat(svc.price).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button className="admin-btn-secondary" onClick={() => setShowNewApptModal(false)}>Cancelar</button>
                                <button className="admin-btn-primary neon-glow" onClick={saveNewAppt} disabled={newApptSaving}>
                                    {newApptSaving ? 'Salvando...' : <><CalendarDays size={16} style={{ marginRight: '6px' }} /> Agendar Cliente</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AppointmentsTab;
