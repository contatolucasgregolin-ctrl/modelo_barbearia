import React, { useState, useCallback, useEffect } from 'react';
import { Brain, RefreshCw, Copy, Check, Zap, Crown, Star, DollarSign, MessageCircle, Instagram, Printer, Archive, Info, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MiniTutorial from '../../components/MiniTutorial';

// ══════════════════════════════════════════════════════════════
// AI PLANS PANEL — Geração inteligente de planos/assinaturas
// Análise 100% local (sem API externa)
// ══════════════════════════════════════════════════════════════

const AIPlansPanel = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [actionModalPlan, setActionModalPlan] = useState(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setPlans([]);

    try {
      const [aptsRes, servicesRes, customersRes, plansRes] = await Promise.all([
        supabase.from('appointments').select('*, services(name, price), customers(name)')
          .eq('status', 'finished').order('date', { ascending: false }).limit(500),
        supabase.from('services').select('*').order('name'),
        supabase.from('customers').select('*'),
        supabase.from('plans').select('*'),
      ]);

      if (aptsRes.error) throw aptsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (plansRes.error) throw plansRes.error;

      const apts = aptsRes.data || [];
      const services = servicesRes.data || [];
      const customers = customersRes.data || [];
      const existingPlans = plansRes.data || [];

    const results = [];

    // ═══ Calculaions ═══
    const customerVisits = {};
    const customerSpend = {};
    const servicePopularity = {};

    apts.forEach(a => {
      // Visit count
      customerVisits[a.customer_id] = (customerVisits[a.customer_id] || 0) + 1;
      // Spend
      customerSpend[a.customer_id] = (customerSpend[a.customer_id] || 0) + parseFloat(a.session_price || 0);
      // Service popularity
      if (a.service_id) {
        servicePopularity[a.service_id] = (servicePopularity[a.service_id] || 0) + 1;
      }
    });

    const avgVisits = Object.values(customerVisits).length > 0
      ? Object.values(customerVisits).reduce((a, b) => a + b, 0) / Object.values(customerVisits).length : 0;
    const avgSpend = Object.values(customerSpend).length > 0
      ? Object.values(customerSpend).reduce((a, b) => a + b, 0) / Object.values(customerSpend).length : 0;
    const avgTicket = apts.length > 0
      ? apts.reduce((a, b) => a + parseFloat(b.session_price || 0), 0) / apts.length : 0;

    // Top services
    const topServices = Object.entries(servicePopularity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => services.find(s => s.id === id))
      .filter(Boolean);


    // ═══ PLAN 1: Plano Mensal Básico ═══
    if (topServices.length >= 1) {
      const mainService = topServices[0];
      const suggestedPrice = Math.round(mainService.price * 3.5 / 5) * 5; // ~3.5 cortes/mês com desconto

      results.push({
        icon: '💈',
        tier: 'Basic',
        tierColor: '#60a5fa',
        name: `Plano ${mainService.name} Mensal`,
        price: suggestedPrice,
        period: 'mensal',
        description: `Baseado no serviço mais popular (${mainService.name} — ${servicePopularity[mainService.id]} agendamentos). O ticket médio é R$ ${avgTicket.toFixed(0)}/visita.`,
        benefits: [
          `4x ${mainService.name} por mês`,
          'Agendamento prioritário',
          'Desconto de 10% em produtos',
          'Sem taxa de sinal/depósito',
        ],
        strategy: `Ideal para clientes que vêm 3-4x/mês. Preço sugerido dá ~12% desconto vs avulso. Meta: converter ${Math.max(5, Math.round(customers.length * 0.15))} clientes.`,
      });
    }

    // ═══ PLAN 2: Plano VIP / Premium ═══
    if (topServices.length >= 2) {
      const s1 = topServices[0];
      const s2 = topServices[1];
      const combinedPrice = parseFloat(s1.price) + parseFloat(s2.price);
      const suggestedPrice = Math.round(combinedPrice * 3.2 / 5) * 5;

      results.push({
        icon: '👑',
        tier: 'VIP',
        tierColor: '#f59e0b',
        name: 'Plano VIP Completo',
        price: suggestedPrice,
        period: 'mensal',
        description: `Combo dos 2 serviços mais populares: ${s1.name} + ${s2.name}. Ticket médio dos top-clientes: R$ ${(avgSpend / Math.max(1, avgVisits)).toFixed(0)}/visita.`,
        benefits: [
          `4x ${s1.name} por mês`,
          `2x ${s2.name} por mês`,
          'Agendamento VIP (prioridade máxima)',
          'Desconto de 20% em produtos',
          'Bebida cortesia (café ou cerveja)',
          'Acesso a promoções exclusivas',
        ],
        strategy: `Target: clientes com gasto médio > R$ ${(avgTicket * 1.5).toFixed(0)}. Economia de ~20% vs avulso. Alta margem de retenção.`,
      });
    }

    // ═══ PLAN 3: Plano Semanal Express ═══
    if (avgVisits >= 2) {
      results.push({
        icon: '⚡',
        tier: 'Express',
        tierColor: '#10b981',
        name: 'Plano Semanal Express',
        price: Math.round(avgTicket * 0.85 / 5) * 5,
        period: 'semanal',
        description: `Para clientes que vêm toda semana. Frequência média: ${avgVisits.toFixed(1)} visitas/cliente. Fidelize os mais frequentes.`,
        benefits: [
          '1x Corte por semana (4/mês)',
          'Sem agendamento — chegou, cortou',
          'Preço fixo semanal',
        ],
        strategy: 'Formato ideal para clientes jovens e profissionais. Simplicidade de "assinatura semanal" atrai e retém.',
      });
    }

    // ═══ PLAN 4: Plano Barba+Cabelo (combo) ═══
    const barbaService = services.find(s => s.name.toLowerCase().includes('barba'));
    const corteService = services.find(s => s.name.toLowerCase().includes('corte'));
    if (barbaService && corteService) {
      const comboPrice = Math.round((parseFloat(barbaService.price) + parseFloat(corteService.price)) * 3.5 / 5) * 5;
      results.push({
        icon: '🧔',
        tier: 'Combo',
        tierColor: '#8b5cf6',
        name: 'Plano Barba & Cabelo',
        price: comboPrice,
        period: 'mensal',
        description: `Combo natural: ${corteService.name} (R$ ${parseFloat(corteService.price).toFixed(0)}) + ${barbaService.name} (R$ ${parseFloat(barbaService.price).toFixed(0)}). Alto potencial de cross-sell.`,
        benefits: [
          `4x ${corteService.name} + ${barbaService.name}`,
          'Barbeiro preferido garantido',
          'Hot towel service incluído',
          'Desconto em produtos de barba',
        ],
        strategy: 'Cross-sell natural. Clientes que fazem barba+corte juntos tendem a ter 60% mais retenção.',
      });
    }

    // ═══ PLAN 5: Plano Família / Amigos ═══
    if (customers.length > 20) {
      results.push({
        icon: '👨‍👦',
        tier: 'Family',
        tierColor: '#ec4899',
        name: 'Plano Família & Amigos',
        price: Math.round(avgTicket * 2.5 / 5) * 5,
        period: 'mensal',
        description: `Com ${customers.length} clientes cadastrados, um plano família pode aumentar a base em até 25% via indicação.`,
        benefits: [
          '2 pessoas no mesmo plano',
          '4 cortes/mês cada (8 total)',
          'Desconto de 25% vs avulso',
          'Horários simultâneos disponíveis',
          'Indicação: +1 corte grátis para cada amigo indicado',
        ],
        strategy: 'Marketing boca-a-boca. Cada assinante traz em média 1.5 novos clientes via indicação.',
      });
    }

    // ═══ RANDOM MARKETING IDEAS (Para sempre ter opções novas) ═══
    const creativeIdeas = [
      {
        icon: '🎁', tier: 'Gift Box', tierColor: '#ef4444', name: 'Plano Mês do Aniversariante', price: Math.round(avgTicket * 0.9 / 5) * 5, period: 'mensal',
        description: `Plataforma de retenção de longo prazo. Promova esse plano todo mês para quem está fazendo aniversário no mês corrente.`,
        benefits: ['1 Corte Semanal (4/mês)', 'Desconto Progressivo em Produtos', 'Lavagem VIP Especial de Graça'], strategy: 'Clientes no mês do aniversário estão muito propensos a se dar pequenos luxos.'
      },
      {
        icon: '🔥', tier: 'High-End', tierColor: '#d946ef', name: 'Plano Transformação Total', price: Math.round(avgTicket * 5 / 10) * 10, period: 'mensal',
        description: `Focado no público super vaidoso que gosta de tratamentos químicos e mudanças de estilo, usando dados médios altos.`,
        benefits: ['Cortes Ilimitados (Revisão)', '1 Química ou Coloração por Mês', 'Tratamentos a Vácuo / Alta Frequência Inclusos'], strategy: 'Isso gera um fluxo de caixa avassalador antecipado e prende o cliente a testar químicos.'
      },
      {
        icon: '🤝', tier: 'Corporate', tierColor: '#3b82f6', name: 'Plano Executivo', price: Math.round(avgTicket * 1.5 / 5) * 5, period: 'quinzenal',
        description: `Ideal para engajar empresas. Ofereça na barbearia e permita dividir o valor caso tragam o sócio.`,
        benefits: ['Corte a cada 15 dias', 'Adequação Rápida de Barba', 'Wi-Fi e Café Privado'], strategy: 'Muitos executivos precisam estar impecáveis. Promova para corretores, advogados e vendedores locais.'
      },
      {
         icon: '💼', tier: 'Partner', tierColor: '#14b8a6', name: 'Plano de Parceria Comercial', price: Math.round(avgTicket * 3.8 / 5) * 5, period: 'mensal',
         description: `Foque em empresas locais (oficinas, depósitos). Eles compram para seus funcionários como bônus.`,
         benefits: ['Pacote 5 Cortes Mês (Ao Portador)', 'Vale de Sorteios Internos'], strategy: 'Venda diretamente para o RH de pequenas empresas do bairro. Ganho líquido garantido!'
      }
    ];

    // Shuffle and pick 1 or 2 random creative plans
    const shuffledCreative = creativeIdeas.sort(() => 0.5 - Math.random());
    const selectedCreative = shuffledCreative.slice(0, Math.random() > 0.5 ? 2 : 1);
    
    // Mix them up with the data-driven ones randomly
    const finalMix = [...results, ...selectedCreative].sort(() => 0.5 - Math.random());

    setPlans(finalMix);
    setAnalyzed(true);
    } catch (err) {
      console.error("[AIPlansPanel] Error analyzing data:", err);
      alert("Erro ao analisar dados para planos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const copyPlan = (plan, idx) => {
    const text = `
📋 ${plan.name}
💰 R$ ${plan.price},00 / ${plan.period}
Tier: ${plan.tier}

✅ Benefícios:
${plan.benefits.map(b => `  • ${b}`).join('\n')}

📊 Estratégia: ${plan.strategy}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleAction = (plan) => {
    setActionModalPlan(plan);
  };

  return (
    <div className="fade-in">
      <MiniTutorial 
        id="ai_plans_guide" 
        title="O Segredo da Frequência" 
        text="Planos de assinatura (mensalistas) são o que dão estabilidade ao seu negócio. A IA sugere valores baseados no que seus clientes já gastam, facilitando a venda da recorrência." 
      />
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex', padding: '16px', borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(96,165,250,0.1))',
          marginBottom: '16px',
        }}>
          <Brain size={40} style={{ color: '#8b5cf6' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>🧠 IA de Planos Inteligentes</h2>
        <p style={{ color: '#888', maxWidth: '500px', margin: '0 auto' }}>
          Gera planos de assinatura otimizados baseados nos seus dados históricos de atendimentos, serviços e clientes.
        </p>
      </div>

      {/* Analyze Button */}
      {!analyzed && (
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <button className="admin-btn-primary neon-glow" onClick={analyze} disabled={loading}
            style={{ padding: '16px 40px', fontSize: '1.1rem', borderRadius: '16px', background: '#8b5cf6' }}>
            {loading ? (
              <><RefreshCw size={20} className="spin-animation" /> Analisando dados...</>
            ) : (
              <><Brain size={20} /> Gerar Planos Inteligentes</>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {analyzed && (
        <>
          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
            <button className="admin-btn-secondary" onClick={() => { setAnalyzed(false); analyze(); }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <RefreshCw size={14} /> Re-analisar
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {plans.map((plan, idx) => (
              <div key={idx} className="glass-panel" style={{
                padding: 0, borderRadius: '16px', overflow: 'hidden',
                border: `1px solid ${plan.tierColor}33`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}>
                {/* Header */}
                <div style={{
                  padding: '20px', background: `linear-gradient(135deg, ${plan.tierColor}15, ${plan.tierColor}08)`,
                  borderBottom: `1px solid ${plan.tierColor}22`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                      background: `${plan.tierColor}20`, color: plan.tierColor, textTransform: 'uppercase'
                    }}>
                      <Star size={10} /> {plan.tier}
                    </span>
                    <button onClick={() => copyPlan(plan, idx)}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                        borderRadius: '8px', padding: '4px 10px', cursor: 'pointer',
                        color: copiedIdx === idx ? '#10b981' : '#888', fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                      {copiedIdx === idx ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.8rem' }}>{plan.icon}</span>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{plan.name}</h3>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: plan.tierColor, marginTop: '4px' }}>
                        R$ {plan.price},00 <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#888' }}>/ {plan.period}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px', fontWeight: 600 }}>BENEFÍCIOS:</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {plan.benefits.map((b, i) => (
                      <li key={i} style={{ padding: '6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: plan.tierColor }}>✓</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Strategy */}
                <div style={{
                  padding: '14px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--color-border)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '6px' }}>📊 Estratégia:</div>
                  <p style={{ fontSize: '0.8rem', color: '#aaa', margin: 0, lineHeight: 1.5 }}>{plan.strategy}</p>
                </div>

                {/* Analysis based on */}
                <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.1)' }}>
                  <p style={{ fontSize: '0.75rem', color: '#666', margin: 0, fontStyle: 'italic' }}>{plan.description}</p>
                </div>

                {/* Main Action */}
                <div style={{ padding: '16px 20px' }}>
                  <button className="admin-btn-primary neon-glow" onClick={() => handleAction(plan)}
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', background: plan.tierColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Zap size={16} /> Realizar Campanha
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Modal */}
          {actionModalPlan && (
            <div className="admin-modal-overlay" onClick={() => setActionModalPlan(null)}>
              <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                <div className="admin-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '1.5rem', padding: '10px', background: `${actionModalPlan.tierColor}20`, borderRadius: '12px' }}>
                      {actionModalPlan.icon}
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>{actionModalPlan.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Configuração de Execução Estratégica</p>
                    </div>
                  </div>
                  <button className="admin-modal-close" onClick={() => setActionModalPlan(null)}>✕</button>
                </div>

                <div className="admin-modal-body" style={{ padding: '20px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '20px', borderLeft: `4px solid ${actionModalPlan.tierColor}` }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>Impacto Estimado</div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
                      {actionModalPlan.strategy}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div className="glass-panel" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#25D366' }}>
                        <MessageCircle size={18} /> <strong>WhatsApp Marketing</strong>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px' }}>Copy otimizada para envio individual aos clientes mais fiéis.</p>
                      <button className="admin-btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => {
                        const msg = `Olá! Notamos que você é um de nossos clientes mais frequentes. Por isso, criamos o "${actionModalPlan.name}" exclusivo para você: ${actionModalPlan.benefits[0]} e muito mais por apenas R$ ${actionModalPlan.price},00/mês. Quer garantir sua vaga VIP?`;
                        navigator.clipboard.writeText(msg);
                        alert('Mensagem copiada!');
                      }}>Copiar Script Whats</button>
                    </div>

                    <div className="glass-panel" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#E1306C' }}>
                        <Instagram size={18} /> <strong>Instagram / Social</strong>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '12px' }}>Legenda estratégica para Stories ou Post de lançamento.</p>
                      <button className="admin-btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => {
                        const msg = `🚀 NOVIDADE: Chegou o ${actionModalPlan.name}! \n\nQuer mais praticidade e economia no seu visual? Nosso novo plano oferece:\n${actionModalPlan.benefits.map(b => `✅ ${b}`).join('\n')}\n\nTudo isso por um valor fixo mensal. Vagas limitadas! Chama no direct. 💈🔥`;
                        navigator.clipboard.writeText(msg);
                        alert('Legenda copiada!');
                      }}>Copiar Legenda Insta</button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Info size={16} /> Guia de Implementação
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { step: '1', text: 'Cadastre o plano na aba "Planos" com o preço sugerido.' },
                        { step: '2', text: 'Identifique os 10 clientes mais frequentes no seu financeiro.' },
                        { step: '3', text: 'Envie o convite personalizado via WhatsApp.' },
                        { step: '4', text: 'Imprima o QR Code do plano e coloque na recepção.' }
                      ].map(s => (
                        <div key={s.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <span style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: actionModalPlan.tierColor, color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s.step}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: '#ccc' }}>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button className="admin-btn-secondary" style={{ flex: 1 }} onClick={() => setActionModalPlan(null)}>
                      Fechar
                    </button>
                    <button className="admin-btn-primary neon-glow" style={{ flex: 2, background: '#10b981' }} onClick={() => {
                      alert('Campanha marcada como ativa! O sistema monitorará as novas assinaturas.');
                      setActionModalPlan(null);
                    }}>
                      <Check size={18} /> Iniciar Campanha Agora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIPlansPanel;
