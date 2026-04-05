import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Minus, X, Save, Search, CheckCircle, AlertTriangle, Scissors } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MiniTutorial from '../../components/MiniTutorial';
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
// BARBER USAGE MODAL — Registro manual de consumo por atendimento
// Chamado pelo barbeiro ao finalizar um atendimento
// ══════════════════════════════════════════════════════════════

const BarberUsageModal = ({ appointment, onClose, onSaved }) => {
  const [products, setProducts] = useState([]);
  const [serviceProducts, setServiceProducts] = useState([]); // produtos sugeridos pelo serviço
  const [usageList, setUsageList] = useState([]); // produtos que o barbeiro marcou como usados
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Buscar produtos disponíveis e os vinculados ao serviço
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [allProdsRes, serviceProdsRes] = await Promise.all([
      supabase.from('products').select('*, product_categories(name, icon)').eq('active', true).order('name'),
      appointment?.service_id
        ? supabase.from('service_products')
            .select('*, products(id, name, sku, cost, quantity, unit, product_categories(name, icon))')
            .eq('service_id', appointment.service_id)
        : { data: [] },
    ]);

    const allProds = allProdsRes.data || [];
    const svcProds = serviceProdsRes.data || [];

    setProducts(allProds);

    // Pré-preencher lista de uso com os produtos vinculados ao serviço
    const preloaded = svcProds
      .filter(sp => sp.products)
      .map(sp => ({
        product_id: sp.products.id,
        name: sp.products.name,
        unit: sp.products.unit,
        cost: sp.products.cost,
        available: sp.products.quantity,
        quantity: sp.quantity_used || 1,
        icon: sp.products.product_categories?.icon || '📦',
        fromService: true, // indica que veio do serviço automaticamente
      }));

    setServiceProducts(svcProds);
    setUsageList(preloaded);
    setLoading(false);
  }, [appointment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtrar produtos para a busca (excluindo os já na lista)
  const usedIds = new Set(usageList.map(u => u.product_id));
  const filteredProducts = products.filter(p =>
    !usedIds.has(p.id) &&
    (search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  );

  const addProduct = (product) => {
    setUsageList(prev => [...prev, {
      product_id: product.id,
      name: product.name,
      unit: product.unit,
      cost: product.cost,
      available: product.quantity,
      quantity: 1,
      icon: product.product_categories?.icon || '📦',
      fromService: false,
    }]);
    setSearch('');
  };

  const removeProduct = (product_id) => {
    setUsageList(prev => prev.filter(u => u.product_id !== product_id));
  };

  const updateQty = (product_id, delta) => {
    setUsageList(prev => prev.map(u =>
      u.product_id === product_id
        ? { ...u, quantity: Math.max(0.5, parseFloat((u.quantity + delta).toFixed(1))) }
        : u
    ));
  };

  const totalCost = usageList.reduce((acc, u) => acc + (u.cost * u.quantity), 0);

  const save = async () => {
    if (usageList.length === 0) {
      if (!(await myConfirm('Nenhum produto registrado. Confirmar atendimento sem consumo?'))) return;
    }

    setSaving(true);

    try {
      for (const item of usageList) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;

        const qty = parseFloat(item.quantity);
        const prevStock = product.quantity;
        const newStock = Math.max(0, prevStock - Math.ceil(qty));

        // 1. Registrar log de uso do barbeiro
        await supabase.from('barber_usage_logs').insert([{
          artist_id: appointment.artist_id,
          product_id: item.product_id,
          appointment_id: appointment.id,
          service_id: appointment.service_id,
          quantity_used: qty,
          cost_at_time: item.cost,
        }]);

        // 2. Registrar movimentação de estoque
        await supabase.from('stock_movements').insert([{
          product_id: item.product_id,
          type: 'out',
          quantity: qty,
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Atendimento: ${appointment.customer_name || 'Cliente'} — ${appointment.service_name || 'Serviço'} (manual)`,
          reference_type: 'appointment',
          reference_id: appointment.id,
          artist_id: appointment.artist_id,
          created_by: 'barber',
        }]);

        // 3. Atualizar estoque do produto
        await supabase.from('products').update({
          quantity: newStock,
          updated_at: new Date().toISOString(),
        }).eq('id', item.product_id);

        // 4. Gerar alerta se estoque baixo
        if (newStock <= (product.min_stock || 5)) {
          await supabase.from('stock_alerts').insert([{
            product_id: item.product_id,
            alert_type: newStock === 0 ? 'out_of_stock' : 'low_stock',
            message: newStock === 0
              ? `⚠️ ESGOTADO: ${item.name} — Repor imediatamente!`
              : `⚠️ Estoque baixo: ${item.name} — Restam ${newStock} ${item.unit}`,
            current_quantity: newStock,
            min_stock: product.min_stock || 5,
          }]);
        }
      }

      setDone(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1800);
    } catch (err) {
      alert('Erro ao salvar consumo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal glass-panel fade-in" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '600px' }}>

        {/* Header */}
        <div className="admin-modal-header" style={{ background: 'rgba(255,122,0,0.06)', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} style={{ color: 'var(--color-primary)' }} />
              Registrar Consumo de Produtos
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>
              <Scissors size={12} style={{ verticalAlign: 'middle' }} /> {appointment.service_name || 'Serviço'} &nbsp;|&nbsp;
              👤 {appointment.customer_name || 'Cliente'}
            </p>
          </div>
          <button className="admin-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Carregando produtos...</div>
        ) : done ? (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <CheckCircle size={60} style={{ color: '#10b981', marginBottom: '16px' }} />
            <h3 style={{ color: '#10b981', marginBottom: '8px' }}>Consumo registrado!</h3>
            <p style={{ color: '#888' }}>Estoque atualizado com sucesso.</p>
          </div>
        ) : (
          <>
            {/* INJEÇÃO DO TUTORIAL CONTEXTUAL */}
            <div style={{ padding: '20px 20px 0' }}>
                <MiniTutorial 
                    id="barber_usage_explanation"
                    title="Por que registrar o consumo?"
                    text="Marcar os produtos usados (ex: 5ml de gel) permite que o sistema calcule o LUCRO REAL da barbearia. Isso ajuda o dono a saber quais serviços dão mais dinheiro e garante que o estoque nunca acabe no meio do dia!"
                />
            </div>

            {/* Produtos sugeridos pelo serviço */}
            {serviceProducts.length > 0 && (
              <div style={{ padding: '16px 20px', background: 'rgba(255,122,0,0.04)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                  ✅ Produtos sugeridos pelo serviço (pré-selecionados)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {serviceProducts.filter(sp => sp.products).map(sp => (
                    <span key={sp.id} style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem',
                      background: 'rgba(255,122,0,0.12)', border: '1px solid rgba(255,122,0,0.3)',
                      color: 'var(--color-primary)',
                    }}>
                      {sp.products.product_categories?.icon || '📦'} {sp.products.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de itens usados */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginBottom: '10px' }}>
                📋 O QUE FOI USADO NESTE ATENDIMENTO:
              </div>

              {usageList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.85rem' }}>
                  Nenhum produto selecionado ainda. Use a busca abaixo para adicionar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {usageList.map(item => (
                    <div key={item.product_id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px', borderRadius: '12px',
                      background: item.fromService ? 'rgba(255,122,0,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${item.fromService ? 'rgba(255,122,0,0.2)' : 'var(--color-border)'}`,
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          Custo: R$ {(item.cost * item.quantity).toFixed(2)} &nbsp;·&nbsp;
                          {item.available} {item.unit} disponíveis
                          {item.available <= 0 && (
                            <span style={{ color: '#ef4444', marginLeft: '6px' }}>⚠️ Esgotado!</span>
                          )}
                        </div>
                      </div>
                      {/* Controle de quantidade */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQty(item.product_id, -0.5)} style={{
                          width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--color-border)',
                          background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#aaa', fontSize: '1.1rem',
                        }}><Minus size={14} /></button>
                        <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 700 }}>
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQty(item.product_id, 0.5)} style={{
                          width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--color-border)',
                          background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#aaa',
                        }}><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removeProduct(item.product_id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px',
                      }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Busca para adicionar mais produtos */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginBottom: '8px' }}>
                  ➕ Adicionar produto não listado:
                </div>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                  <input
                    className="admin-filter-input"
                    style={{ width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }}
                    placeholder="Buscar produto pelo nome ou SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {search && filteredProducts.length > 0 && (
                  <div style={{
                    maxHeight: '180px', overflowY: 'auto', borderRadius: '10px',
                    border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)',
                  }}>
                    {filteredProducts.slice(0, 10).map(p => (
                      <button key={p.id} onClick={() => addProduct(p)} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderBottom: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left',
                        color: 'var(--color-text)',
                      }}>
                        <span>{p.product_categories?.icon || '📦'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#888' }}>
                            SKU: {p.sku || '-'} &nbsp;·&nbsp; Estoque: {p.quantity} {p.unit}
                          </div>
                        </div>
                        <Plus size={16} style={{ color: 'var(--color-primary)' }} />
                      </button>
                    ))}
                  </div>
                )}
                {search && filteredProducts.length === 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#666', padding: '8px', textAlign: 'center' }}>
                    Nenhum produto encontrado.
                  </div>
                )}
              </div>
            </div>

            {/* Resumo de custo + botões */}
            <div style={{
              padding: '16px 20px', borderTop: '1px solid var(--color-border)',
              background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>Custo total dos produtos usados:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>
                  R$ {totalCost.toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="admin-btn-secondary" onClick={onClose} disabled={saving}>
                  Pular (sem consumo)
                </button>
                <button className="admin-btn-primary neon-glow" onClick={save} disabled={saving}>
                  <Save size={16} /> {saving ? 'Salvando...' : 'Confirmar Consumo'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BarberUsageModal;
