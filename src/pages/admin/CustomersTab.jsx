import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import { StatusBadge, Modal } from '../Admin';
import {
    Plus, Trash2, Save, Pencil, X, CalendarDays, RefreshCw, MessageCircle
} from 'lucide-react';
import MiniTutorial from '../../components/MiniTutorial';
import Swal from 'sweetalert2';

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS TAB (CRM)
// ══════════════════════════════════════════════════════════════════════════════
const CustomersTab = ({ cachedData, refreshAll }) => {
    const customers = cachedData?.customers || [];
    const loading = !cachedData?.customers && !cachedData?.lastUpdate;
    
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerHistory, setCustomerHistory] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    // For add/edit modal
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', instagram: '', birthday: '', observations: '' });
    const [saving, setSaving] = useState(false);

    const filteredCustomers = customers.filter(c => 
        !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
    );

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

    const handleSave = async () => {
        if (!form.name) return alert('Nome é obrigatório');
        setSaving(true);
        
        // Limpar dados: campos vazios devem ser null para não quebrar constraints do banco (especialmente data)
        const payload = { 
            name: form.name,
            phone: form.phone ? form.phone.replace(/\D/g, '') : null,
            email: form.email || null,
            instagram: form.instagram || null,
            birthday: form.birthday || null,
            observations: form.observations || null
        };

        try {
            if (editing) {
                const { error } = await supabase.from('customers').update(payload).eq('id', form.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('customers').insert([payload]);
                if (error) throw error;
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: `Cliente ${editing ? 'atualizado' : 'cadastrado'} com sucesso.`,
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--color-bg-dark)',
                color: 'var(--color-text)'
            });
            
            setShowModal(false);
            if (refreshAll) await refreshAll();
        } catch (err) {
            console.error("Erro ao salvar cliente:", err);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao salvar',
                text: err.message?.includes('unique') ? "Este telefone já está cadastrado para outro cliente." : (err.message || "Verifique os dados e tente novamente."),
                background: 'var(--color-bg-dark)',
                color: 'var(--color-text)'
            });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id) => {
        if (!(await myConfirm('Tem certeza que deseja excluir este cliente?'))) return;
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) alert('Erro ao excluir: ' + error.message);
        else refreshAll();
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
            if (!(await myConfirm(`ATENÇÃO: Excluir um cliente pode excluir ou quebrar seus agendamentos.\n\nTem certeza que deseja excluir ${selectedIds.length} cliente(s)?`))) return;
            const { error } = await supabase.from('customers').delete().in('id', selectedIds);
            if (error) alert('Erro ao excluir alguns clientes.');
            refreshAll();
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <MiniTutorial 
                id="customers_crm_guide" 
                title="Relacionamento é Lucro" 
                text="Aqui está o seu CRM. Veja o histórico de cada cliente, anote preferências e use os dados para ações de marketing direcionadas (como aniversariantes do mês)." 
            />
            <div className="admin-section-header">
                <h2 className="admin-section-title">Clientes (CRM)</h2>
                <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Adicionar Cliente</span></button>
            </div>

            <div className="admin-filters glass-panel">
                <input type="text" className="admin-filter-input" placeholder="Buscar por nome ou telefone..."
                    value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
                <button className="admin-refresh-btn" onClick={() => refreshAll()}><RefreshCw size={16} /></button>
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
                                    <input type="checkbox" checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0} onChange={toggleSelectAll} style={{ transform: 'scale(0.95)', cursor: 'pointer' }} />
                                </th>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Instagram</th>
                                <th>Nascimento</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(c => (
                                <tr key={c.id} style={selectedIds.includes(c.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td data-label="Selecionar" style={{ textAlign: 'center' }}>
                                        <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelectOne(c.id)} style={{ transform: 'scale(0.95)', cursor: 'pointer' }} />
                                    </td>
                                    <td data-label="Nome" style={{ fontWeight: 'bold' }}>{c.name}</td>
                                    <td data-label="Telefone">{c.phone || '-'}</td>
                                    <td data-label="Instagram">{c.instagram || '-'}</td>
                                    <td data-label="Nascimento">{c.birthday ? c.birthday.split('-').reverse().join('/') : '-'}</td>
                                    <td data-label="Ações">
                                        <div className="table-actions">
                                            <button className="action-btn" title="Ver Histórico" onClick={() => viewHistory(c)} style={{ color: 'var(--color-primary)' }}><CalendarDays size={16} /></button>
                                            {c.phone && (
                                                <button 
                                                    className="action-btn" 
                                                    title="Conversar no WhatsApp" 
                                                    onClick={() => {
                                                        const cleanStr = (c.phone || '').replace(/\D/g, '');
                                                        window.open(`https://wa.me/55${cleanStr}`, '_blank');
                                                    }}
                                                    style={{ color: '#25d366' }}
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                            )}
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
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 15 }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button 
                                className={`admin-btn-primary neon-glow ${saving ? 'loading' : ''}`} 
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Salvando...' : <><Save size={16} /> Salvar</>}
                            </button>
                        </div>
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

export default CustomersTab;
