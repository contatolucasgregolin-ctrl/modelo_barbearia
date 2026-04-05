import React, { useState, useEffect, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { SiteContext } from '../../context/SiteContext';
import { supabase } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import { Modal } from '../Admin';
import {
    Plus, Trash2, Save, Pencil, X, RefreshCw
} from 'lucide-react';
import MiniTutorial from '../../components/MiniTutorial';

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
const CategoriesTab = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ id: null, name: '' });
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('gallery_categories').select('*').order('name');
            setCategories(data || []);
            setSelectedIds([]);
        } catch (err) {
            console.error("Error fetching categories:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    // Real-time listener for gallery categories
    useEffect(() => {
        const channel = supabase.channel('realtime-gallery-categories')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_categories' }, () => {
                fetchCategories();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchCategories]);

    const openNew = () => { setForm({ id: null, name: '' }); setShowModal(true); };

    const openEdit = (cat) => { setForm(cat); setShowModal(true); };

    const save = async () => {
        if (!form.name.trim()) return alert('O nome da categoria é obrigatório.');

        if (form.id) {
            await supabase.from('gallery_categories').update({ name: form.name }).eq('id', form.id);
        } else {
            const { error } = await supabase.from('gallery_categories').insert([{ name: form.name }]);
            if (error && error.code === '23505') return alert('Esta categoria já existe.');
        }
        setShowModal(false);
        fetchCategories();
    };

    const remove = async (id) => {
        if (!(await myConfirm('Excluir esta categoria? Isso pode afetar imagens na galeria.'))) return;
        const { error } = await supabase.from('gallery_categories').delete().eq('id', id);
        if (error) alert('Não foi possível excluir a categoria. Talvez existam fotos vinculadas a ela.');
        setCategories(prev => prev.filter(c => c.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(categories.map(c => c.id));
        else setSelectedIds([]);
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        if (bulkAction === 'delete') {
            if (!(await myConfirm(`ATENÇÃO: Excluir ${selectedIds.length} categoria(s) pode afetar imagens na galeria.\n\nTem certeza que deseja continuar?`))) return;
            const { error } = await supabase.from('gallery_categories').delete().in('id', selectedIds);
            if (error) alert('Ocorreu um erro ao excluir algumas categorias. Talvez existam fotos vinculadas a elas.');
            setCategories(prev => prev.filter(c => !selectedIds.includes(c.id)));
        }

        setSelectedIds([]);
        setBulkAction('');
    };

    return (
        <div className="fade-in">
            <MiniTutorial 
                id="categories_guide" 
                title="Sua Vitrine de Trabalhos" 
                text="Organize sua galeria por categorias (Cortes, Barbas, etc). Isso ajuda o cliente a encontrar o estilo que mais gosta na hora de agendar." 
            />
            <div className="admin-section-header">
                <h2 className="admin-section-title">Categorias da Galeria</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="admin-refresh-btn" onClick={fetchCategories}><RefreshCw size={16} /> <span>Atualizar</span></button>
                    <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Nova Categoria</span></button>
                </div>
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

            {loading ? <div className="admin-loading" style={{ padding: '60px', textAlign: 'center' }}>
                <RefreshCw size={40} className="spin-animation" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
                <p>Sincronizando categorias...</p>
            </div> : (
                <div className="admin-table-wrap glass-panel">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === categories.length && categories.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                </th>
                                <th>Nome da Categoria</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id} style={selectedIds.includes(cat.id) ? { backgroundColor: 'var(--color-glow)' } : {}}>
                                    <td data-label="Selecionar" style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(cat.id)}
                                            onChange={() => toggleSelectOne(cat.id)}
                                            style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td data-label="Nome da Categoria">{cat.name}</td>
                                    <td data-label="Ações" style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button className="action-btn edit" onClick={() => openEdit(cat)} title="Editar"><Pencil size={18} /></button>
                                            <button className="action-btn delete" onClick={() => remove(cat.id)} title="Excluir"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Nenhuma categoria cadastrada.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <Modal title={form.id ? "Editar Categoria" : "Nova Categoria"} onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Nome da Categoria *</label>
                            <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CategoriesTab;
