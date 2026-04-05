import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Save, X, Package, Link2, Hash, HelpCircle, Info, Calculator, Gauge } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validateNumeric } from '../../lib/SecurityUtils';
import Swal from 'sweetalert2';

const myConfirm = async (msg) => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const result = await Swal.fire({
    title: 'Atenção',
    text: msg,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, confirmar',
    cancelButtonText: 'Cancelar',
    background: isDark ? '#1e2433' : '#ffffff',
    color: isDark ? '#f8fafc' : '#1e293b',
    iconColor: '#ff7a00',
    customClass: {
      popup: 'admin-swal-popup',
      confirmButton: 'admin-swal-confirm',
      cancelButton: 'admin-swal-cancel',
    },
    buttonsStyling: false
  });
  return result.isConfirmed;
};



// ══════════════════════════════════════════════════════════════
// SERVICE PRODUCTS MANAGER
// Modal para vincular produtos a um serviço
// ══════════════════════════════════════════════════════════════

const ServiceProductsManager = ({ service, onClose }) => {
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState({ product_id: '', quantity_used: '1' });
  const [serviceCost, setServiceCost] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [linkedRes, productsRes] = await Promise.all([
      supabase.from('service_products').select('*, products(name, sku, cost, unit, photo_url, product_categories(icon))')
        .eq('service_id', service.id),
      supabase.from('products').select('id, name, sku, cost, unit, quantity, photo_url, product_categories(icon)')
        .eq('active', true).order('name')
    ]);
    const linked = linkedRes.data || [];
    setLinkedProducts(linked);
    setAllProducts(productsRes.data || []);
    
    // Calculate cost
    const cost = linked.reduce((acc, sp) => acc + (parseFloat(sp.quantity_used) * parseFloat(sp.products?.cost || 0)), 0);
    setServiceCost(cost);
    setLoading(false);
  }, [service.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableProducts = allProducts.filter(p => !linkedProducts.some(lp => lp.product_id === p.id));

  const addLink = async () => {
    if (!newLink.product_id) return alert('Selecione um produto.');
    const qty = validateNumeric(newLink.quantity_used, { min: 0.001, decimals: 3 });
    if (qty <= 0) return alert('Quantidade deve ser maior que zero.');

    const { error } = await supabase.from('service_products').insert([{
      service_id: service.id,
      product_id: newLink.product_id,
      quantity_used: qty,
    }]);

    if (error) {
      if (error.code === '23505') return alert('Este produto já está vinculado ao serviço.');
      return alert('Erro: ' + error.message);
    }

    setShowAddForm(false);
    setNewLink({ product_id: '', quantity_used: '1' });
    fetchData();
  };

  const updateQuantity = async (spId, newQty) => {
    const qty = validateNumeric(newQty, { min: 0.001, decimals: 3 });
    if (qty <= 0) return;
    await supabase.from('service_products').update({ quantity_used: qty }).eq('id', spId);
    fetchData();
  };

  const removeLink = async (spId) => {
    if (!(await myConfirm('Desvincular este produto do serviço?'))) return;
    await supabase.from('service_products').delete().eq('id', spId);
    fetchData();
  };

  const profit = service.price - serviceCost;
  const margin = service.price > 0 ? ((profit / service.price) * 100).toFixed(1) : 0;

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="admin-modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link2 size={20} style={{ color: 'var(--color-primary)' }} />
            Produtos: {service.name}
          </h3>
          <button className="admin-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Cost Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px',
          marginBottom: '20px', padding: '16px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Preço do Serviço</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>R$ {parseFloat(service.price).toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Custo Produtos</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>R$ {serviceCost.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Lucro ({margin}%)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: profit >= 0 ? 'var(--color-primary)' : '#ef4444' }}>
              R$ {profit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Linked Products */}
        {loading ? <div className="admin-loading">Carregando...</div> : (
          <div style={{ marginBottom: '16px' }}>
            {linkedProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                <Package size={36} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <p>Nenhum produto vinculado a este serviço.</p>
                <p style={{ fontSize: '0.8rem' }}>Vincule produtos para que o estoque seja deduzido automaticamente quando um atendimento for finalizado.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {linkedProducts.map(sp => (
                  <div key={sp.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{sp.products?.product_categories?.icon || '📦'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{sp.products?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        Custo: R$ {parseFloat(sp.products?.cost || 0).toFixed(2)} / {sp.products?.unit}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="number" value={sp.quantity_used} min="0.001" step="0.5"
                        onChange={e => updateQuantity(sp.id, e.target.value)}
                        style={{
                          width: '70px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                          borderRadius: '8px', padding: '6px', color: 'var(--color-text)', textAlign: 'center',
                          fontSize: '0.9rem', fontWeight: 'bold'
                        }} />
                      <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '25px' }}>{sp.products?.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-primary)', minWidth: '80px', textAlign: 'right' }}>
                      R$ {(parseFloat(sp.quantity_used) * parseFloat(sp.products?.cost || 0)).toFixed(2)}
                    </div>
                    <button onClick={() => removeLink(sp.id)}
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Link Form */}
        {showAddForm ? (
          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,122,0,0.05)', border: '1px dashed var(--color-primary)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-primary)' }}>
              <Gauge size={18} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Vincular Novo Insumo</span>
              <HelpCircle size={14} style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.6 }} onClick={() => setShowTutorial(true)} />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', display: 'block' }}>Produto</label>
                <select className="form-input" value={newLink.product_id} onChange={e => setNewLink(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', display: 'block' }}>Uso p/ serv.</label>
                <input type="number" className="form-input" value={newLink.quantity_used}
                    onChange={e => setNewLink(f => ({ ...f, quantity_used: e.target.value }))} min="0.001" step="0.5" />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="admin-btn-primary" onClick={addLink} style={{ padding: '10px 16px' }}>
                  <Save size={14} />
                </button>
                <button className="admin-btn-secondary" onClick={() => setShowAddForm(false)} style={{ padding: '10px' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {newLink.product_id && (
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#ccc', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                💰 Custo estimado: <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  R$ {(parseFloat(newLink.quantity_used || 0) * parseFloat(allProducts.find(p => p.id === newLink.product_id)?.cost || 0)).toFixed(2)}
                </span> por execução.
              </div>
            )}
          </div>
        ) : (
          <button className="admin-btn-secondary" onClick={() => setShowAddForm(true)}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderStyle: 'dashed' }}>
            <Plus size={16} /> Vincular Produto
          </button>
        )}

        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button className="admin-btn-secondary" onClick={onClose}>Fechar</button>
        </div>

        {/* Tutorial Overlay */}
        {showTutorial && (
          <div className="admin-modal-overlay" style={{ zIndex: 10002 }} onClick={() => setShowTutorial(false)}>
            <div className="tutorial-popover glass-panel" style={{ maxWidth: '400px', padding: '24px', border: '2px solid var(--color-primary)' }} onClick={e => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Gauge size={40} color="var(--color-primary)" />
                <h3 style={{ marginTop: '12px' }}>Como medir o uso de insumos?</h3>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.6' }}>
                <p>Para o sistema descontar o estoque corretamente em cada serviço, informe quanto você usa:</p>
                <ul style={{ paddingLeft: '20px', margin: '15px 0' }}>
                  <li><strong>Lâmina (un):</strong> 1.0 (usa 1 inteira)</li>
                  <li><strong>Gola (un):</strong> 1.0 (usa 1 inteira)</li>
                  <li><strong>Gel (ml):</strong> Média de 5.0 a 10.0 ml</li>
                  <li><strong>Pomada (g):</strong> Média de 3.0 a 5.0 gramas</li>
                </ul>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  💡 Dica do StudioFlow: Pesar um pote novo e um pote após 10 serviços ajuda a descobrir a média exata!
                </div>
              </div>
              <button className="admin-btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowTutorial(false)}>Entendi, vou configurar!</button>
            </div>
          </div>
        )}
      </div>
    </div>, document.body
  );
};

export default ServiceProductsManager;
