import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import { Modal } from '../Admin';
import {
    Plus, Trash2, Save, Pencil, X, Link2
} from 'lucide-react';
import ServiceProductsManager from './ServiceProductsManager';
import MiniTutorial from '../../components/MiniTutorial';

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES TAB
// ══════════════════════════════════════════════════════════════════════════════
const ServicesTab = ({ services = [], loading = false, refresh, updateSiteData }) => {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', duration_mins: '', is_featured: false });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [serviceForProducts, setServiceForProducts] = useState(null);

    const fetchServices = refresh;

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
        if (updateSiteData) updateSiteData();
    };

    const remove = async (id) => {
        if (!(await myConfirm('Excluir este serviço? Isso pode afetar agendamentos existentes.'))) return;
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
            if (!(await myConfirm(`Tem certeza que deseja excluir ${selectedIds.length} serviço(s)? Isso pode afetar agendamentos existentes.`))) return;
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
            <MiniTutorial 
                id="services_setup_guide" 
                title="Configuração de Lucratividade" 
                text="Cadastre seus serviços e use o ícone de 'corrente' para vincular produtos. Assim, o sistema desconta do estoque e calcula seu lucro real por corte!" 
            />
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
                                    <td data-label="Selecionar" style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(s.id)}
                                            onChange={() => toggleSelectOne(s.id)}
                                            style={{ transform: 'scale(0.95)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td data-label="Nome">
                                        <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{s.description}</div>
                                    </td>
                                    <td data-label="Preço">R$ {parseFloat(s.price).toFixed(2)}</td>
                                    <td data-label="Duração">{s.duration_mins} min</td>
                                    <td data-label="Destaque">{s.is_featured ? <span style={{ color: 'var(--color-primary)' }}>★ Sim</span> : <span style={{ color: '#555' }}>Não</span>}</td>
                                    <td data-label="Ações" style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button className="action-btn" onClick={() => setServiceForProducts(s)} title="Produtos Vinculados" style={{ color: '#f59e0b' }}><Link2 size={18} /></button>
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

            {/* Service Products Manager Modal */}
            {serviceForProducts && (
                <ServiceProductsManager
                    service={serviceForProducts}
                    onClose={() => setServiceForProducts(null)}
                />
            )}
        </div>
    );
};

export default ServicesTab;
