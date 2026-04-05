import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Plus, Search, RefreshCw, Trash2, Pencil, Save, X, Download,
  AlertTriangle, TrendingDown, TrendingUp, ArrowUpCircle, ArrowDownCircle,
  BarChart3, Filter, ChevronDown, ChevronUp, Eye, Box, ShoppingCart,
  Users, Layers, Activity, HelpCircle, Info, Calculator
} from 'lucide-react';
import MiniTutorial from '../../components/MiniTutorial';
import { supabase, uploadStorageFile, compressToWebP } from '../../lib/supabase';
import { sanitizeInput, validateNumeric, validateInteger, sanitizeObject, validateSKU } from '../../lib/SecurityUtils';
import { myConfirm, myAlert } from '../../lib/utils';
import Swal from 'sweetalert2';

// Standardized helpers are now imported from ../../lib/utils




// ══════════════════════════════════════════════════════════════
// STOCK TAB — Controle de Estoque Completo
// ══════════════════════════════════════════════════════════════

// Sub-navigation items
const STOCK_SUBTABS = [
  { id: 'products', icon: <Package size={16} />, label: 'Produtos' },
  { id: 'movements', icon: <Activity size={16} />, label: 'Movimentações' },
  { id: 'reports', icon: <BarChart3 size={16} />, label: 'Relatórios' },
  { id: 'alerts', icon: <AlertTriangle size={16} />, label: 'Alertas' },
];

// ── Stock Badge Component ──
const StockBadge = ({ quantity, minStock }) => {
  let color, bg, text;
  if (quantity === 0) {
    color = '#ef4444'; bg = 'rgba(239,68,68,0.15)'; text = 'Esgotado';
  } else if (quantity <= minStock) {
    color = '#f59e0b'; bg = 'rgba(245,158,11,0.15)'; text = 'Baixo';
  } else {
    color = '#10b981'; bg = 'rgba(16,185,129,0.15)'; text = 'OK';
  }
  return (
    <span style={{
      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem',
      fontWeight: 700, color, background: bg, display: 'inline-flex',
      alignItems: 'center', gap: '4px'
    }}>
      {quantity === 0 && <AlertTriangle size={12} />}
      {text} ({quantity})
    </span>
  );
};

// ── Movement Type Badge ──
const MovementBadge = ({ type }) => {
  const config = {
    in: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: '📥 Entrada', icon: <ArrowUpCircle size={14} /> },
    out: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: '📤 Saída', icon: <ArrowDownCircle size={14} /> },
    adjustment: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', label: '🔄 Ajuste', icon: null },
    loss: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: '⚠️ Perda', icon: null },
  };
  const c = config[type] || config.adjustment;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem',
      fontWeight: 700, color: c.color, background: c.bg, display: 'inline-flex',
      alignItems: 'center', gap: '4px'
    }}>
      {c.icon} {c.label}
    </span>
  );
};

// ── Mini Stat Card ──
const MiniStat = ({ icon, label, value, color = 'var(--color-primary)' }) => (
  <div className="admin-stat-card" style={{ flex: 1, minWidth: '200px' }}>
    <div className="stat-icon-wrapper" style={{ background: `${color}20`, color }}>
      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
    </div>
    <div>
      <h3 style={{ color, fontSize: '1.3rem', margin: '0 0 2px' }}>{value}</h3>
      <p style={{ margin: 0 }}>{label}</p>
    </div>
  </div>
);

// ── AnimatedBar for reports ──
const AnimatedBar = ({ label, value, maxValue, color = 'var(--color-primary)', suffix = '' }) => {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value}{suffix}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: '8px', transition: 'width 1s ease-out',
        }} />
      </div>
    </div>
  );
};


// ════════════════════════════════════════════════════════════
// PRODUCTS SUB-TAB
// ════════════════════════════════════════════════════════════
const ProductsSubTab = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', category_id: '',
    cost: '', price: '', quantity: '', min_stock: '5', unit: 'un', active: true, photo_url: '',
    purchase_price: '', package_size: ''
  });
  const [showTutorial, setShowTutorial] = useState(null); // 'cost' | 'usage' | null

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const [prodsRes, catsRes] = await Promise.all([
      supabase.from('products').select('*, product_categories(name, icon)').order('name'),
      supabase.from('product_categories').select('*').order('name')
    ]);
    setProducts(prodsRes.data || []);
    setCategories(catsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Real-time
  useEffect(() => {
    const ch = supabase.channel('rt-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && 
          !(p.sku || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
      if (filterStatus === 'low' && p.quantity > p.min_stock) return false;
      if (filterStatus === 'out' && p.quantity > 0) return false;
      if (filterStatus === 'ok' && p.quantity <= p.min_stock) return false;
      return true;
    });
  }, [products, search, filterCategory, filterStatus]);

  const openNew = () => {
    setEditing(null);
    setForm({ 
      name: '', sku: '', description: '', category_id: '', cost: '', price: '', 
      quantity: '', min_stock: '5', unit: 'un', active: true, photo_url: '',
      purchase_price: '', package_size: ''
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku || '', description: p.description || '',
      category_id: p.category_id || '', cost: p.cost, price: p.price,
      quantity: p.quantity, min_stock: p.min_stock, unit: p.unit || 'un',
      active: p.active, photo_url: p.photo_url || '',
      purchase_price: p.purchase_price || '', package_size: p.package_size || ''
    });
    setShowModal(true);
  };

  // Cálculo automático do custo por unidade de medida
  useEffect(() => {
    const price = parseFloat(form.purchase_price);
    const size = parseFloat(form.package_size);
    if (price > 0 && size > 0) {
      const unitCost = price / size;
      setForm(f => ({ ...f, cost: unitCost.toFixed(3) }));
    }
  }, [form.purchase_price, form.package_size]);

  const save = async () => {
    if (!form.name) return alert('Nome do produto é obrigatório');
    if (form.sku && !validateSKU(form.sku)) return alert('SKU inválido. Use letras, números e hífens (3-20 chars)');

    const payload = {
      ...sanitizeObject({ name: form.name, sku: form.sku || null, description: form.description }),
      category_id: form.category_id || null,
      cost: validateNumeric(form.cost),
      price: validateNumeric(form.price),
      quantity: validateInteger(form.quantity),
      min_stock: validateInteger(form.min_stock, { min: 0 }),
      unit: form.unit || 'un',
      active: form.active,
      photo_url: form.photo_url || null,
      package_size: form.package_size ? parseFloat(form.package_size) : null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
    };

    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert([payload]);

    if (error) {
      console.error('Error saving product:', error);
      if (error.code === '23505') return alert('Este SKU já está em uso. Escolha outro.');
      return alert('Erro ao salvar: ' + error.message);
    }
    setShowModal(false);
    fetchProducts();
  };

  const handleQuickAdjust = async (product, delta) => {
    const newQty = Math.max(0, product.quantity + delta);
    if (newQty === product.quantity) return;

    // 1. Update product
    const { error } = await supabase.from('products').update({ 
      quantity: newQty, 
      updated_at: new Date().toISOString() 
    }).eq('id', product.id);

    if (error) return alert('Erro ao ajustar estoque: ' + error.message);

    // 2. Register movement
    await supabase.from('stock_movements').insert([{
      product_id: product.id,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      previous_stock: product.quantity,
      new_stock: newQty,
      reason: `Ajuste rápido (+/-) via painel`,
      reference_type: 'manual',
    }]);

    // 3. Check for alerts
    if (newQty <= (product.min_stock || 5)) {
        await supabase.from('stock_alerts').insert([{
            product_id: product.id,
            alert_type: newQty === 0 ? 'out_of_stock' : 'low_stock',
            message: newQty === 0 ? `🚫 ESGOTADO: ${product.name}` : `⚠️ Estoque baixo: ${product.name} (${newQty})`,
            current_quantity: newQty,
            min_stock: product.min_stock || 5
        }]);
    }

    fetchProducts();
  };

  const remove = async (id) => {
    if (!(await myConfirm('Excluir este produto? Movimentações serão perdidas.'))) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const optimized = await compressToWebP(file, 5, 0.8);
      const sanitizedName = optimized.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const fileName = `products/${Date.now()}_${sanitizedName}`;
      const publicUrl = await uploadStorageFile('uploads', fileName, optimized);
      setForm(f => ({ ...f, photo_url: publicUrl }));
    } catch (err) {
      alert(err.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const stats = useMemo(() => {
    const total = products.length;
    const low = products.filter(p => p.quantity > 0 && p.quantity <= (p.min_stock || 0)).length;
    const out = products.filter(p => (p.quantity || 0) <= 0).length;
    const value = products.reduce((acc, p) => acc + ((Number(p.quantity) || 0) * (Number(p.cost) || 0)), 0);
    return { total, low, out, value };
  }, [products]);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <MiniStat icon="📦" label="Total de Produtos" value={stats.total} color="#60a5fa" />
        <MiniStat icon="⚠️" label="Estoque Baixo" value={stats.low} color="#f59e0b" />
        <MiniStat icon="🚫" label="Esgotados" value={stats.out} color="#ef4444" />
        <MiniStat icon="💰" label="Valor em Estoque" value={`R$ ${stats.value.toFixed(2)}`} color="#10b981" />
      </div>

      {/* Filters */}
      <div className="admin-filters glass-panel" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input type="text" className="admin-filter-input" placeholder="Buscar produto ou SKU..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%' }} />
          </div>
          <select className="admin-filter-select glass-panel" value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="all">Todas Categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select className="admin-filter-select glass-panel" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: '140px' }}>
            <option value="all">Todos Status</option>
            <option value="ok">✅ OK</option>
            <option value="low">⚠️ Estoque Baixo</option>
            <option value="out">🚫 Esgotado</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="admin-refresh-btn" onClick={fetchProducts}><RefreshCw size={16} /></button>
          <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Novo Produto</span></button>
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="admin-loading">Carregando produtos...</div> : (
        <div className="admin-table-wrap glass-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Foto</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Custo</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={p.quantity <= p.min_stock ? { borderLeft: `3px solid ${p.quantity === 0 ? '#ef4444' : '#f59e0b'}` } : {}}>
                  <td data-label="Foto">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} style={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        {p.product_categories?.icon || '📦'}
                      </div>
                    )}
                  </td>
                  <td data-label="Produto">
                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: '0.75rem', color: '#888' }}>{p.description}</div>}
                  </td>
                  <td data-label="SKU" style={{ color: '#888', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || '-'}</td>
                  <td data-label="Categoria">{p.product_categories ? `${p.product_categories.icon} ${p.product_categories.name}` : '-'}</td>
                  <td data-label="Custo">R$ {(Number(p.cost) || 0).toFixed(2)}</td>
                  <td data-label="Preço">{p.price > 0 ? `R$ ${(Number(p.price) || 0).toFixed(2)}` : <span style={{ color: '#666' }}>Uso interno</span>}</td>
                  <td data-label="Estoque">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'inherit' }}>
                      <button className="action-btn" onClick={() => handleQuickAdjust(p, -1)} 
                        style={{ padding: '2px', minWidth: '24px', height: '24px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)' }}>
                        <ChevronDown size={14} color="#ef4444" />
                      </button>
                      <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{p.quantity}</span>
                      <button className="action-btn" onClick={() => handleQuickAdjust(p, 1)}
                        style={{ padding: '2px', minWidth: '24px', height: '24px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)' }}>
                        <ChevronUp size={14} color="#10b981" />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>{p.unit}</div>
                  </td>
                  <td data-label="Status"><StockBadge quantity={p.quantity} minStock={p.min_stock} /></td>
                  <td data-label="Ações" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button className="action-btn edit" onClick={() => openEdit(p)} title="Editar"><Pencil size={16} /></button>
                      <button className="action-btn delete" onClick={() => remove(p.id)} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="9" className="text-center text-muted">Nenhum produto encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="admin-modal-header">
              <h3>{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-form">
              {/* Photo */}
              <div className="form-group">
                <label>Foto do Produto</label>
                {form.photo_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <img src={form.photo_url} alt="preview" style={{ width: 60, height: 60, borderRadius: '8px', objectFit: 'cover' }} />
                    <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, photo_url: '' }))} type="button" style={{ padding: '6px 12px', fontSize: '12px' }}>Trocar</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="form-input" />
                )}
                {uploading && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Enviando...</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Nome do Produto *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Pomada Modeladora" />
                </div>
                <div className="form-group">
                  <label>SKU</label>
                  <input className="form-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} placeholder="POM-001" style={{ fontFamily: 'monospace' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes do produto..." rows={2} />
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <select className="form-input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              <div style={{ background: 'rgba(255, 122, 0, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 122, 0, 0.2)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-primary)' }}>
                  <Calculator size={18} />
                  <span style={{ fontWeight: 600 }}>Assistente de Custos e Medidas</span>
                  <HelpCircle size={16} style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.6 }} onClick={() => setShowTutorial('cost')} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Preço que Pagou (R$)</label>
                    <input type="number" className="form-input" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="Ex: 50.00" step="0.01" />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Tamanho da Embalagem</label>
                    <input type="number" className="form-input" value={form.package_size} onChange={e => setForm(f => ({ ...f, package_size: e.target.value }))} placeholder="Ex: 500" />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Medida</label>
                    <select className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                      <option value="un">Unidade (un)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="g">Gramas (g)</option>
                      <option value="dose">Doses</option>
                    </select>
                  </div>
                </div>

                {form.cost > 0 && (
                  <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.85rem', color: '#ccc', textAlign: 'center' }}>
                    💡 Cada <strong>{form.unit}</strong> custa para você: <span style={{ color: '#4ade80', fontWeight: 600 }}>R$ {parseFloat(form.cost).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Preço Sugerido Venda (R$)</label>
                  <input type="number" className="form-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" step="0.01" />
                  <small style={{ color: '#666' }}>Deixe 0 se for apenas para uso interno.</small>
                </div>
                <div className="form-group">
                  <label>Estoque Total ({form.unit})</label>
                  <input type="number" className="form-input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Ex: 500" />
                  <small style={{ color: '#666' }}>Ex: Se tem 2 potes de 500ml, coloque 1000.</small>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <input type="checkbox" id="product_active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                <label htmlFor="product_active" style={{ cursor: 'pointer', margin: 0 }}>Produto Ativo no Sistema</label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="button" className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar Produto</button>
              </div>
            </div>
          </div>
          
          {/* Tutorial Popovers */}
          {showTutorial === 'cost' && (
            <div className="admin-modal-overlay" style={{ zIndex: 10001 }} onClick={() => setShowTutorial(null)}>
              <div className="tutorial-popover glass-panel" style={{ maxWidth: '400px', padding: '24px', border: '2px solid var(--color-primary)' }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <HelpCircle size={40} color="var(--color-primary)" />
                  <h3 style={{ marginTop: '12px' }}>Como Calcular seus Custos?</h3>
                </div>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#ccc' }}>
                  Para produtos fracionados (como Gel ou Pomada), preencha o valor que você pagou pela embalagem inteira e o tamanho dela (ml ou gramas).
                </p>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', margin: '16px 0', fontSize: '0.85rem' }}>
                  <strong>Exemplo Prático:</strong><br/>
                  - Você pagou <strong>R$ 50,00</strong> num pote.<br/>
                  - O pote tem <strong>500ml</strong>.<br/>
                  - O sistema dirá que cada ml custa <strong>R$ 0,10</strong>.
                </div>
                <button className="admin-btn-primary" style={{ width: '100%' }} onClick={() => setShowTutorial(null)}>Entendi, Obrigado!</button>
              </div>
            </div>
          )}
        </div>, document.body
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════
// MOVEMENTS SUB-TAB
// ════════════════════════════════════════════════════════════
const MovementsSubTab = () => {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ product_id: '', type: 'in', quantity: '', reason: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [movRes, prodRes, artRes] = await Promise.all([
      supabase.from('stock_movements').select('*, products(name, sku), artists(name)')
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('id, name, sku, quantity').order('name'),
      supabase.from('artists').select('id, name').eq('active', true).order('name')
    ]);
    setMovements(movRes.data || []);
    setProducts(prodRes.data || []);
    setArtists(artRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel('rt-movements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (filterType === 'all') return movements;
    return movements.filter(m => m.type === filterType);
  }, [movements, filterType]);

  const saveMovement = async () => {
    if (!form.product_id || !form.quantity) return alert('Selecione o produto e informe a quantidade.');
    const qty = validateNumeric(form.quantity, { min: 0.001, decimals: 3 });
    if (qty <= 0) return alert('Quantidade deve ser maior que zero.');

    const product = products.find(p => p.id === form.product_id);
    if (!product) return alert('Produto não encontrado.');

    const prevStock = product.quantity;
    let newStock;
    if (form.type === 'in') {
      newStock = prevStock + Math.ceil(qty);
    } else {
      newStock = Math.max(0, prevStock - Math.ceil(qty));
    }

    // 1. Insert movement
    const { error: movError } = await supabase.from('stock_movements').insert([{
      product_id: form.product_id,
      type: form.type,
      quantity: qty,
      previous_stock: prevStock,
      new_stock: newStock,
      reason: sanitizeInput(form.reason) || (form.type === 'in' ? 'Entrada manual de estoque' : 'Saída manual de estoque'),
      reference_type: 'manual',
      created_by: 'admin'
    }]);

    if (movError) return alert('Erro ao registrar: ' + movError.message);

    // 2. Update product stock
    await supabase.from('products').update({ quantity: newStock, updated_at: new Date().toISOString() }).eq('id', form.product_id);

    // 3. Check alerts
    if (newStock <= (product.min_stock || 5)) {
      await supabase.from('stock_alerts').insert([{
        product_id: form.product_id,
        alert_type: newStock === 0 ? 'out_of_stock' : 'low_stock',
        message: newStock === 0
          ? `⚠️ ESGOTADO: ${product.name} — Sem estoque!`
          : `⚠️ Estoque baixo: ${product.name} — Restam ${newStock} unidades`,
        current_quantity: newStock,
        min_stock: product.min_stock || 5
      }]);
    }

    setShowModal(false);
    setForm({ product_id: '', type: 'in', quantity: '', reason: '' });
    fetchData();
  };

  return (
    <div>
      <div className="admin-section-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select className="admin-filter-select glass-panel" value={filterType}
            onChange={e => setFilterType(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="all">Todas Movimentações</option>
            <option value="in">📥 Entradas</option>
            <option value="out">📤 Saídas</option>
            <option value="adjustment">🔄 Ajustes</option>
            <option value="loss">⚠️ Perdas</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="admin-refresh-btn" onClick={fetchData}><RefreshCw size={16} /></button>
          <button className="admin-add-btn neon-glow" onClick={() => setShowModal(true)}><Plus size={16} /> <span>Nova Movimentação</span></button>
        </div>
      </div>

      {loading ? <div className="admin-loading">Carregando movimentações...</div> : (
        <div className="admin-table-wrap glass-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Qtd</th>
                <th>Estoque Anterior</th>
                <th>Estoque Novo</th>
                <th>Motivo</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td data-label="Data/Hora" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    {' '}
                    <span style={{ color: '#888' }}>
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td data-label="Produto">
                    <div style={{ fontWeight: 'bold' }}>{m.products?.name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>{m.products?.sku}</div>
                  </td>
                  <td data-label="Tipo"><MovementBadge type={m.type} /></td>
                  <td data-label="Qtd" style={{ fontWeight: 'bold' }}>{parseFloat(m.quantity).toFixed(m.quantity % 1 ? 3 : 0)}</td>
                  <td data-label="Estoque Anterior" style={{ color: '#888' }}>{m.previous_stock ?? '-'}</td>
                  <td data-label="Estoque Novo" style={{ fontWeight: 'bold', color: m.type === 'in' ? '#10b981' : '#ef4444' }}>{m.new_stock ?? '-'}</td>
                  <td data-label="Motivo" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.reason || '-'}</td>
                  <td data-label="Origem">
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', background: m.reference_type === 'appointment' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)', color: m.reference_type === 'appointment' ? '#60a5fa' : '#888' }}>
                      {m.reference_type === 'appointment' ? '🔄 Auto' : '✋ Manual'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="8" className="text-center text-muted">Nenhuma movimentação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* New Movement Modal */}
      {showModal && createPortal(
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h3>Nova Movimentação de Estoque</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-form">
              <div className="form-group">
                <label>Produto *</label>
                <select className="form-input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Selecione um produto...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'sem SKU'}) — Estoque: {p.quantity}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Tipo *</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="in">📥 Entrada</option>
                    <option value="out">📤 Saída</option>
                    <option value="adjustment">🔄 Ajuste</option>
                    <option value="loss">⚠️ Perda</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantidade *</label>
                  <input type="number" className="form-input" value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" step="1" min="1" />
                </div>
              </div>

              <div className="form-group">
                <label>Motivo / Observação</label>
                <textarea className="form-input" value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Ex: Compra do fornecedor, perda por validade..." rows={2} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="admin-btn-primary neon-glow" onClick={saveMovement}>
                  <Save size={16} /> Registrar
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════
// REPORTS SUB-TAB
// ════════════════════════════════════════════════════════════
const ReportsSubTab = () => {
  const [dashboard, setDashboard] = useState(null);
  const [consumption, setConsumption] = useState([]);
  const [barberStats, setBarberStats] = useState([]);
  const [profitability, setProfitability] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const [dashRes, consRes, barberRes, profRes] = await Promise.all([
      supabase.rpc('fn_stock_consumption_report'),
      supabase.from('stock_movements').select('*, products(name)').eq('type', 'out')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('barber_usage_logs').select('*, artists(name), products(name, cost)')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('products').select('id, name, quantity, cost, min_stock, product_categories(name)')
        .eq('active', true).order('quantity', { ascending: true })
    ]);

    // Process consumption by product
    const consumptionMap = {};
    (consRes.data || []).forEach(m => {
      const name = m.products?.name || 'Desconhecido';
      consumptionMap[name] = (consumptionMap[name] || 0) + parseFloat(m.quantity);
    });
    const consumptionArr = Object.entries(consumptionMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
    setConsumption(consumptionArr);

    // Process barber stats
    const barberMap = {};
    (barberRes.data || []).forEach(log => {
      const name = log.artists?.name || 'Desconhecido';
      if (!barberMap[name]) barberMap[name] = { name, qty: 0, cost: 0 };
      barberMap[name].qty += parseFloat(log.quantity_used);
      barberMap[name].cost += parseFloat(log.cost_at_time || 0) * parseFloat(log.quantity_used);
    });
    setBarberStats(Object.values(barberMap).sort((a, b) => b.cost - a.cost));

    // Dashboard summary from products
    const prods = profRes.data || [];
    setDashboard({
      total: prods.length,
      lowStock: prods.filter(p => p.quantity > 0 && p.quantity <= p.min_stock).length,
      outOfStock: prods.filter(p => p.quantity === 0).length,
      totalValue: prods.reduce((acc, p) => acc + (p.quantity * p.cost), 0),
      totalUnits: prods.reduce((acc, p) => acc + p.quantity, 0),
    });
    setProfitability(prods);

    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return <div className="admin-loading">Gerando relatórios...</div>;

  const maxConsumption = consumption.length > 0 ? consumption[0].qty : 1;
  const maxBarberCost = barberStats.length > 0 ? barberStats[0].cost : 1;

  return (
    <div>
      {/* Summary Cards */}
      {dashboard && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <MiniStat icon="📦" label="Produtos Ativos" value={dashboard.total} color="#60a5fa" />
          <MiniStat icon="📊" label="Unidades em Estoque" value={dashboard.totalUnits} color="#8b5cf6" />
          <MiniStat icon="💰" label="Valor em Estoque" value={`R$ ${dashboard.totalValue.toFixed(2)}`} color="#10b981" />
          <MiniStat icon="⚠️" label="Precisam Repor" value={dashboard.lowStock + dashboard.outOfStock} color="#f59e0b" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Top Consumed Products */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px', fontSize: '1rem' }}>
            🏆 Produtos Mais Consumidos (30 dias)
          </h3>
          {consumption.length === 0 ? (
            <p className="text-muted">Nenhum consumo registrado ainda.</p>
          ) : (
            consumption.map(c => (
              <AnimatedBar key={c.name} label={c.name} value={c.qty} maxValue={maxConsumption} suffix=" un" color="#f59e0b" />
            ))
          )}
        </div>

        {/* Barber Consumption */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px', fontSize: '1rem' }}>
            ✂️ Custo por Barbeiro (30 dias)
          </h3>
          {barberStats.length === 0 ? (
            <p className="text-muted">Nenhum dado de consumo por barbeiro.</p>
          ) : (
            barberStats.map(b => (
              <AnimatedBar key={b.name} label={b.name} value={parseFloat(b.cost.toFixed(2))} maxValue={maxBarberCost}
                suffix={` (R$ ${b.cost.toFixed(2)})`} color="#60a5fa" />
            ))
          )}
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', marginTop: '24px' }}>
        <h3 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '1rem' }}>
          🚨 Produtos que Precisam de Reposição
        </h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Estoque Atual</th>
                <th>Mínimo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {profitability.filter(p => p.quantity <= p.min_stock).map(p => (
                <tr key={p.id}>
                  <td data-label="Produto" style={{ fontWeight: 'bold' }}>{p.name}</td>
                  <td data-label="Categoria">{p.product_categories?.name || '-'}</td>
                  <td data-label="Estoque Atual" style={{ fontWeight: 'bold', color: p.quantity === 0 ? '#ef4444' : '#f59e0b' }}>{p.quantity}</td>
                  <td data-label="Mínimo">{p.min_stock}</td>
                  <td data-label="Status"><StockBadge quantity={p.quantity} minStock={p.min_stock} /></td>
                </tr>
              ))}
              {profitability.filter(p => p.quantity <= p.min_stock).length === 0 && (
                <tr><td colSpan="5" className="text-center text-muted">✅ Todos os produtos estão com estoque adequado!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// ════════════════════════════════════════════════════════════
// ALERTS SUB-TAB
// ════════════════════════════════════════════════════════════
const AlertsSubTab = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('stock_alerts').select('*, products(name, sku, quantity, min_stock)')
      .order('created_at', { ascending: false });
    if (!showResolved) query = query.eq('resolved', false);
    const { data } = await query;
    setAlerts(data || []);
    setLoading(false);
  }, [showResolved]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    const ch = supabase.channel('rt-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_alerts' }, () => fetchAlerts())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAlerts]);

  const resolveAlert = async (id) => {
    await supabase.from('stock_alerts').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
    fetchAlerts();
  };

  const resolveAll = async () => {
    if (!(await myConfirm('Marcar todos os alertas como resolvidos?'))) return;
    await supabase.from('stock_alerts').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('resolved', false);
    fetchAlerts();
  };

  return (
    <div>
      <div className="admin-section-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }} />
            Mostrar resolvidos
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="admin-refresh-btn" onClick={fetchAlerts}><RefreshCw size={16} /></button>
          {alerts.filter(a => !a.resolved).length > 0 && (
            <button className="admin-btn-secondary" onClick={resolveAll} style={{ fontSize: '0.85rem' }}>
              ✅ Resolver Todos
            </button>
          )}
        </div>
      </div>

      {loading ? <div className="admin-loading">Carregando alertas...</div> : alerts.length === 0 ? (
        <div className="admin-empty-state glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: '#10b981', marginBottom: '12px' }} />
          <p>✅ Nenhum alerta pendente! Estoque em dia.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map(a => (
            <div key={a.id} className="glass-panel" style={{
              padding: '16px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '16px',
              borderLeft: `4px solid ${a.alert_type === 'out_of_stock' ? '#ef4444' : '#f59e0b'}`,
              opacity: a.resolved ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ fontSize: '1.5rem' }}>{a.alert_type === 'out_of_stock' ? '🚫' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{a.products?.name || 'Produto'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{a.message}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                    {new Date(a.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                  {a.current_quantity}/{a.min_stock}
                </span>
                {!a.resolved && (
                  <button className="admin-btn-secondary" onClick={() => resolveAlert(a.id)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    ✅ Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════
// MAIN STOCK TAB SHELL
// ════════════════════════════════════════════════════════════
const StockTab = () => {
  const [activeSubTab, setActiveSubTab] = useState('products');

  return (
    <div className="fade-in">
      <div className="admin-section-header">
        <h2 className="admin-section-title">📦 Controle de Estoque</h2>
      </div>

      {/* Sub-navigation */}
      <div className="stock-subtabs glass-panel" style={{
        display: 'flex', gap: '4px', padding: '6px', borderRadius: '12px', marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {STOCK_SUBTABS.map(tab => (
          <button
            key={tab.id}
            className={`stock-subtab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
              background: activeSubTab === tab.id ? 'var(--color-primary)' : 'transparent',
              color: activeSubTab === tab.id ? 'white' : 'var(--color-text-muted)',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content  */}
      {activeSubTab === 'products' && <ProductsSubTab />}
      {activeSubTab === 'movements' && <MovementsSubTab />}
      {activeSubTab === 'reports' && <ReportsSubTab />}
      {activeSubTab === 'alerts' && <AlertsSubTab />}
    </div>
  );
};

export default StockTab;
