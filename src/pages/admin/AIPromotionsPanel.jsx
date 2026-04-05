import React, { useState, useCallback } from 'react';
import {
  Sparkles, TrendingDown, Calendar, Gift, RefreshCw, Copy, Check, Zap,
  Target, MessageCircle, Instagram, Printer, Archive, ChevronDown,
  ChevronUp, X, Share2, Star, Users, Clock, Package, Megaphone, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MiniTutorial from '../../components/MiniTutorial';

// ══════════════════════════════════════════════════════════════
// AI PROMOTIONS PANEL — Sugestões com Ações Reais
// ══════════════════════════════════════════════════════════════

// ─── Componente de Modal de Ação ──────────────────────────────
const ActionModal = ({ suggestion, onClose, updateSiteData }) => {
  const [copied, setCopied] = useState(null);
  const [archived, setArchived] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const publishToMain = async () => {
    if (!suggestion.title || !suggestion.suggestion) {
      return alert('Erro: Dados da sugestão incompletos para publicação.');
    }
    setPublishing(true);
    try {
      const { error } = await supabase.from('promotions').insert([{
        title: suggestion.title,
        description: suggestion.suggestion,
        active: true,
        image_url: null, // AI Promos are currently text-only
      }]);

      if (error) throw error;

      alert('⭐ Campanha publicada com sucesso na página principal!');
      if (updateSiteData) await updateSiteData();
      onClose();
    } catch (err) {
      console.error('[AIPromotionsPanel] Error publishing promotion:', err);
      alert('Erro ao publicar promoção: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setPublishing(false);
    }
  };

  if (!suggestion) return null;

  const msgWhatsApp = encodeURIComponent(
    `*${suggestion.title}*\n\n${suggestion.suggestion}\n\n📲 Agende já! Clique no link abaixo.`
  );
  const waLink = `https://wa.me/?text=${msgWhatsApp}`;

  const msgInstagram = `${suggestion.icon} ${suggestion.title}\n\n${suggestion.suggestion}\n\n#barbearia #corte #promocao #barber`;

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  const print = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Promoção</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: auto; }
        h1 { font-size: 24px; } p { font-size: 16px; line-height: 1.6; }
        .box { border: 2px dashed #333; padding: 20px; border-radius: 12px; margin-top: 20px; }
      </style></head><body>
      <h1>${suggestion.icon} ${suggestion.title}</h1>
      <p>${suggestion.description}</p>
      <div class="box"><strong>Mensagem para divulgar:</strong><br/><br/>${suggestion.suggestion}</div>
      <p style="margin-top:30px;font-size:12px;color:#999;">Gerado por sistema de IA — ${new Date().toLocaleDateString('pt-BR')}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const btnStyle = (color = '#fff') => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
    borderRadius: '12px', border: `1px solid rgba(255,255,255,0.1)`, cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)', color, fontSize: '0.9rem', fontWeight: 600,
    transition: 'all 0.2s ease', width: '100%', textAlign: 'left',
  });

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal glass-panel" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', borderRadius: '20px' }}>
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>{suggestion.icon}</span>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{suggestion.title}</h3>
          </div>
          <button className="admin-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Mensagem gerada */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>💡 Mensagem pronta para divulgar:</div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '12px',
            fontSize: '0.9rem', lineHeight: 1.6, position: 'relative',
          }}>
            {suggestion.suggestion}
          </div>
        </div>

        {/* Ações */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            O que deseja fazer?
          </div>

          {/* WhatsApp */}
          <a href={waLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ ...btnStyle('#25D366'), background: 'rgba(37,211,102,0.08)', borderColor: 'rgba(37,211,102,0.3)' }}>
              <MessageCircle size={20} />
              Enviar pelo WhatsApp
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7 }}>Abre o app</span>
            </button>
          </a>

          {/* Copiar para Instagram */}
          <button onClick={() => copy(msgInstagram, 'insta')} style={{ ...btnStyle('#E1306C'), background: 'rgba(225,48,108,0.08)', borderColor: 'rgba(225,48,108,0.3)' }}>
            <Instagram size={20} />
            Copiar legenda p/ Instagram
            {copied === 'insta' && <Check size={16} style={{ marginLeft: 'auto', color: '#10b981' }} />}
          </button>

          {/* Copiar mensagem */}
          <button onClick={() => copy(suggestion.suggestion, 'msg')} style={{ ...btnStyle() }}>
            <Copy size={20} />
            Copiar mensagem genérica
            {copied === 'msg' && <Check size={16} style={{ marginLeft: 'auto', color: '#10b981' }} />}
          </button>

          {/* Imprimir */}
          <button onClick={print} style={btnStyle()}>
            <Printer size={20} />
            Imprimir / Gerar PDF
          </button>

          {/* Marcar como implementada */}
          <button
            onClick={() => { setArchived(true); setTimeout(onClose, 1200); }}
            style={{ ...btnStyle(archived ? '#10b981' : '#f59e0b'), background: archived ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)', borderColor: archived ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }}>
            <Archive size={20} />
            {archived ? '✅ Marcada como implementada!' : 'Marcar como implementada'}
          </button>

          {/* Publicar Real */}
          <button
            disabled={publishing}
            onClick={publishToMain}
            style={{ 
              ...btnStyle('#fff'), 
              background: 'linear-gradient(135deg, var(--color-primary), #ff9500)', 
              borderColor: 'rgba(255,122,0,0.5)',
              marginTop: '10px',
              justifyContent: 'center'
            }}>
            {publishing ? <RefreshCw size={20} className="spin-animation" /> : <Megaphone size={20} />}
            {publishing ? 'Publicando...' : 'Publicar na Página Principal'}
          </button>
        </div>

        {/* Como implementar */}
        <div style={{
          margin: '0 20px 20px', padding: '14px', borderRadius: '12px',
          background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700, marginBottom: '8px' }}>
            📋 Como implementar esta promoção:
          </div>
          <ol style={{ fontSize: '0.82rem', color: '#aaa', paddingLeft: '16px', margin: 0, lineHeight: 1.8 }}>
            {suggestion.steps?.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      </div>
    </div>
  );
};


// ─── Componente de Card de Sugestão ─────────────────────────
const SuggestionCard = ({ s, idx, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const quickCopy = () => {
    navigator.clipboard.writeText(s.suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{
      borderRadius: '16px', overflow: 'hidden',
      borderLeft: `4px solid ${s.impactColor}`,
      transition: 'all 0.25s ease',
    }}>
      {/* Header do card */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 2px' }}>{s.title}</h3>
              <span style={{ fontSize: '0.7rem', color: s.impactColor, fontWeight: 600, textTransform: 'uppercase' }}>
                {s.type === 'schedule' ? '📅 Agenda' : s.type === 'service' ? '✂️ Serviço' : s.type === 'product' ? '📦 Produto' : s.type === 'retention' ? '👤 Retenção' : s.type === 'loyalty' ? '⭐ Fidelidade' : 'ℹ️ Info'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
              background: `${s.impactColor}20`, color: s.impactColor
            }}>
              Impacto: {s.impact}
            </span>
          </div>
        </div>
        <p style={{ color: '#aaa', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{s.description}</p>
      </div>

      {/* Mensagem sugerida (colapsável) */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '14px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <button onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.82rem', padding: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Ocultar mensagem' : 'Ver mensagem pronta'}
        </button>

        {expanded && (
          <div style={{ marginTop: '10px', position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)', fontSize: '0.9rem', lineHeight: 1.6, paddingRight: '80px' }}>
              {s.suggestion}
            </div>
            <button onClick={quickCopy} style={{
              position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--color-border)', borderRadius: '8px', padding: '5px 9px',
              cursor: 'pointer', color: copied ? '#10b981' : '#888', fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              {copied ? <><Check size={12} /> OK!</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => onAction(s)} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
          background: `linear-gradient(135deg, ${s.impactColor}, ${s.impactColor}99)`, color: 'white',
          boxShadow: `0 4px 12px ${s.impactColor}40`, transition: 'all 0.2s ease',
        }}>
          <Zap size={14} /> Realizar esta ação
        </button>
        <button onClick={quickCopy} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
          borderRadius: '10px', border: '1px solid var(--color-border)', cursor: 'pointer',
          fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', color: '#aaa',
        }}>
          {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar rápido</>}
        </button>
      </div>
    </div>
  );
};


// ─── Componente Principal ─────────────────────────────────────
const AIPromotionsPanel = ({ updateSiteData }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [filter, setFilter] = useState('all');

  const analyze = useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setAnalyzed(false);

    try {
      const [aptsRes, servicesRes, productsRes, customersRes] = await Promise.all([
        supabase.from('appointments').select('*, services(name, price), artists(name), customers(name)')
          .order('date', { ascending: false }).limit(500),
        supabase.from('services').select('*').order('name'),
        supabase.from('products').select('*, product_categories(name)').eq('active', true),
        supabase.from('customers').select('*'),
      ]);

      if (aptsRes.error) throw aptsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;

      const apts = aptsRes.data || [];
      const services = servicesRes.data || [];
      const products = productsRes.data || [];
      const customers = customersRes.data || [];
      const results = [];

    // ════ ANÁLISE 1: Dias fracos ════
    const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    apts.forEach(a => { const day = new Date(a.date + 'T12:00:00').getDay(); dayCount[day]++; });
    const avgPerDay = Object.values(dayCount).reduce((a, b) => a + b, 0) / 7;
    const weakDays = Object.entries(dayCount)
      .filter(([_, count]) => count < avgPerDay * 0.6 && count > 0)
      .map(([day]) => dayNames[parseInt(day)]);

    if (weakDays.length > 0) {
      results.push({
        type: 'schedule', icon: '📅', impact: 'Alto', impactColor: '#10b981',
        title: `Promoção de Dia Fraco: ${weakDays[0]}`,
        description: `Os dias ${weakDays.join(', ')} têm menos agendamentos que a média. Ofereça desconto para equilibrar a agenda e aumentar o faturamento nesses dias.`,
        suggestion: `🔥 "${weakDays[0]} de Desconto na Barbearia!" — Hoje é ${weakDays[0]} e você ganha 15% OFF em qualquer serviço! Apenas por hoje. Agende agora 👇`,
        steps: [
          'Salve esta mensagem no celular',
          'Envie para seus contatos no WhatsApp às 8h da manhã',
          'Publique nos Stories do Instagram com uma foto da barbearia',
          'Monitore os agendamentos durante o dia',
        ],
      });
    }

    // ════ ANÁLISE 2: Serviço menos utilizado ════
    const serviceUsage = {};
    services.forEach(s => { serviceUsage[s.id] = { name: s.name, price: s.price, count: 0 }; });
    apts.forEach(a => { if (a.service_id && serviceUsage[a.service_id]) serviceUsage[a.service_id].count++; });
    const avgUsage = Object.values(serviceUsage).reduce((a, b) => a + b.count, 0) / Math.max(1, services.length);
    const underUsed = Object.values(serviceUsage).filter(s => s.count < avgUsage * 0.4 && s.count > 0).sort((a, b) => a.count - b.count);

    if (underUsed.length > 0) {
      const top = underUsed[0];
      const comboPrice = (top.price * 1.5).toFixed(0);
      results.push({
        type: 'service', icon: '✂️', impact: 'Médio', impactColor: '#f59e0b',
        title: `Impulsionar Serviço: "${top.name}"`,
        description: `"${top.name}" tem apenas ${top.count} agendamentos, bem abaixo da média (${Math.round(avgUsage)}). Crie um combo irresistível para atrair clientes para este serviço.`,
        suggestion: `💈 Combo Especial: ${top.name} + Corte por apenas R$ ${comboPrice},00! Economia garantida. Válido esta semana. Agende pelo WhatsApp! 📲`,
        steps: [
          `Anuncie o combo "${top.name} + Corte" nas suas redes`,
          'Treine os barbeiros para oferecer este combo ao finalizar o atendimento',
          'Crie um card no Canva com o preço em destaque',
          'Monitore os agendamentos por 7 dias',
        ],
      });
    }

    // ════ ANÁLISE 3: Produto com estoque alto (venda) ════
    const highStock = products.filter(p => p.price > 0 && p.quantity > p.min_stock * 3).sort((a, b) => b.quantity - a.quantity);
    if (highStock.length > 0) {
      const prod = highStock[0];
      const discPrice = (prod.price * 0.75).toFixed(2);
      results.push({
        type: 'product', icon: '📦', impact: 'Médio', impactColor: '#8b5cf6',
        title: `Liquidação de Estoque: ${prod.name}`,
        description: `Estoque alto (${prod.quantity} un.) do produto "${prod.name}". Venda o excesso para liberar capital de giro e evitar vencimento.`,
        suggestion: `🛍️ PROMOÇÃO RELÂMPAGO! ${prod.name} — De R$ ${parseFloat(prod.price).toFixed(2)} por apenas R$ ${discPrice}! Só na barbearia, enquanto durar o estoque. Corre! 🏃`,
        steps: [
          'Coloque o produto em destaque no balcão',
          'Peça aos barbeiros para oferecer durante o atendimento',
          'Publique nos Stories com o produto na mão',
          'Ofereça brinde para quem levar 2 unidades',
        ],
      });
    }

    // ════ ANÁLISE 4: Clientes inativos ════
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const activeIds = new Set(apts.filter(a => a.date >= thirtyDaysAgo).map(a => a.customer_id));
    const inactiveCount = customers.filter(c => !activeIds.has(c.id)).length;
    if (inactiveCount > 3) {
      results.push({
        type: 'retention', icon: '👤', impact: 'Alto', impactColor: '#10b981',
        title: `Resgatar ${inactiveCount} Clientes Inativos`,
        description: `${inactiveCount} clientes não agendaram nos últimos 30 dias. Uma campanha personalizada pode recuperar até 30% desses clientes.`,
        suggestion: `💌 "Ei, sentimos sua falta! 🙁" Faz um tempinho que não te vemos por aqui. Que tal uma visita? Temos um desconto especial de 20% esperando por você. Válido até o fim do mês! Agende agora 👇`,
        steps: [
          'Filtre os clientes inativos na aba Clientes',
          'Copie os números de WhatsApp',
          'Envie esta mensagem individualmente (mais pessoal) ou em broadcast',
          'Aguarde 2 dias e faça follow-up com quem não respondeu',
        ],
      });
    }

    // ════ ANÁLISE 5: Happy Hour ════
    const hourCount = {};
    apts.forEach(a => {
      if (a.time) {
        const hour = parseInt(a.time.split(':')[0]);
        hourCount[hour] = (hourCount[hour] || 0) + 1;
      }
    });
    const hourEntries = Object.entries(hourCount).sort((a, b) => a[1] - b[1]);
    if (hourEntries.length >= 4) {
      const slowHour = hourEntries[0];
      results.push({
        type: 'schedule', icon: '🕐', impact: 'Médio', impactColor: '#f59e0b',
        title: `Happy Hour às ${slowHour[0]}h`,
        description: `O horário das ${slowHour[0]}h tem apenas ${slowHour[1]} agendamentos, muito abaixo da média. Preencha esse horário ocioso com um desconto atrativo.`,
        suggestion: `⏰ HAPPY HOUR NA BARBEARIA! Agende entre ${slowHour[0]}h e ${parseInt(slowHour[0]) + 1}h e ganhe 10% de desconto em qualquer serviço. Todo dia! Aproveite! 🔥`,
        steps: [
          'Publique nos Stories diariamente nesse horário',
          'Coloque um cartaz impresso na vitrine da barbearia',
          'Adicione esse horário como destaque no WhatsApp Business',
          'Após 2 semanas, avalie se o horário preencheu',
        ],
      });
    }

    // ════ ANÁLISE 6: Programa de fidelidade ════
    const customerVisits = {};
    apts.filter(a => a.status === 'finished').forEach(a => {
      customerVisits[a.customer_id] = (customerVisits[a.customer_id] || 0) + 1;
    });
    const loyalCustomers = Object.values(customerVisits).filter(v => v >= 5).length;
    const totalWithVisits = Object.keys(customerVisits).length;
    if (totalWithVisits > 5 && loyalCustomers < totalWithVisits * 0.3) {
      results.push({
        type: 'loyalty', icon: '⭐', impact: 'Alto', impactColor: '#f59e0b',
        title: 'Lançar Programa de Fidelidade',
        description: `Apenas ${loyalCustomers} de ${totalWithVisits} clientes voltaram 5+ vezes. Um programa de fidelidade pode aumentar a recorrência em até 40% e elevar o ticket médio.`,
        suggestion: `🏆 NOVIDADE: Cartão Fidelidade Digital! A cada 5 cortes, o 6º é GRÁTIS! Simples assim. Pergunte ao seu barbeiro como participar. Comece a contar hoje! 💈`,
        steps: [
          'Crie um cartão simples no celular (app Canva)',
          'Carimbe digitalmente via WhatsApp a cada visita',
          'Na 5ª visita, lembre o cliente que o próximo é grátis',
          'Depois de 30 dias, analise se clientes voltaram mais rápido',
        ],
      });
    }

    // ════ ANÁLISE 7: Campanha de indicação ════
    results.push({
      type: 'loyalty', icon: '🤝', impact: 'Alto', impactColor: '#60a5fa',
      title: 'Campanha "Traga um Amigo"',
      description: 'Marketing boca a boca é o mais eficiente para barbearias. Uma campanha de indicação pode trazer novos clientes com custo zero.',
      suggestion: `🤝 GANHE DESCONTOS! Indique um amigo que nunca veio aqui. Quando ele agendar, você ganha R$ 15,00 de desconto na próxima visita — e ele também! Válido sempre. 🎉`,
      steps: [
        'Defina o valor do desconto (recomendado: R$ 10 a R$ 20)',
        'Informe todos os clientes ao finalizar o atendimento',
        'Crie um código exclusivo por cliente para rastrear indicações',
        'Monitore quantos novos clientes chegaram por indicação',
      ],
    });

    if (results.length === 0) {
      results.push({
        type: 'info', icon: '✅', impact: 'Info', impactColor: '#60a5fa',
        title: 'Tudo equilibrado!',
        description: 'Com os dados atuais, o negócio está bem equilibrado. Continue monitorando.',
        suggestion: 'Dica: Cadastre mais atendimentos para que a IA tenha mais dados para analisar!',
        steps: ['Continue cadastrando atendimentos regularmente', 'Volte em 7 dias para novas análises'],
      });
    }

    // ════ RANDOM MARKETING IDEAS (Garante ideias frescas sempre) ════
    const outOfBoxPromos = [
      {
        type: 'service', icon: '🎯', impact: 'Alto', impactColor: '#ef4444',
        title: 'Campanha "Cliente Cobaia"',
        description: 'Ofereça um serviço diferente que não seja corte convencional, focando na experiência.',
        suggestion: `Estiloso por um dia! Topa ser nossa "cobaia" para um platinado/luzes com 40% OFF? Tendo você como modelo e a gente tirando altas fotos! Chama que tem só 2 vagas 💇‍♂️🔥`,
        steps: ['Grave os stories explicando a proposta de forma bem humorada', 'Faça antes e depois em vídeo']
      },
      {
        type: 'loyalty', icon: '🍻', impact: 'Médio', impactColor: '#f59e0b',
        title: 'Promoção Amigo de Bar',
        description: 'Faça permuta: Feche com o bar ao lado/próximo e ofereça um chopp.',
        suggestion: `Cortou com a gente quinta ou sexta, já entra no clima: A primeira breja premium é por NOSSA CONTA! Só mostrar o comprovante de agendamento aqui no balcão 🍻💈 Agende pra garantir.`,
        steps: ['Compre um fardo de 12 para ter de reserva', 'Tire foto da geladeira', 'Faça broadcast pros melhores clientes']
      },
      {
         type: 'retention', icon: '💸', impact: 'Alto', impactColor: '#10b981',
         title: 'Pix Premiado Diário',
         description: 'Quem gosta de roleta adora isso. Um pequeno desconto em forma de cashback direto num sorteio diário.',
         suggestion: `Pix da Sorte 🤑! Todo dia a gente sorteia R$ 20,00 de volta via PIX pra um cliente que cortou no dia! Vem renovar o visual e tente a sorte. Ah, na sexta o prêmio dobra 👀📲`,
         steps: ['Crie um grupo "Lista VIP"', 'A cada fim de expedediente grave um rápido spinning de sorteio', 'Mande o Pix e poste o print de comprovação']
      },
       {
         type: 'schedule', icon: '🌧️', impact: 'Médio', impactColor: '#3b82f6',
         title: 'Desconto Dia de Chuva',
         description: 'Dias chuvosos derrubam as vendas em até 40%.',
         suggestion: `Choveu, mas a régua não pode falhar! 🌧️☔ Correlação do clima: Mostre esse print HOJE na barbearia e ganhe de brinde o design da sobrancelha de graça junto com seu corte de cabelo. #VemCortar🔥`,
         steps: ['Guarde essa mensagem e poste sempre que chover do nada', 'Promove escassez: "Valendo pras próximas 2 horas"']
       }
    ];

    // Pick 1 to 2 creative
    const shuffledOut = outOfBoxPromos.sort(() => 0.5 - Math.random());
    const selectedOut = shuffledOut.slice(0, Math.random() > 0.6 ? 2 : 1);
    
    // Combine and shuffle everything slightly to mix deterministic with creative
    const mixPromos = [...results.filter(r => r.type !== 'info'), ...selectedOut]
                      .sort(() => 0.5 - Math.random());

    // Fallback if still empty (rare but possible)
    if (mixPromos.length === 0) {
       mixPromos.push(results[0]); 
    }

    setSuggestions(mixPromos);
    setAnalyzed(true);
    } catch (err) {
      console.error("[AIPromotionsPanel] Error analyzing data:", err);
      alert("Erro ao analisar dados para promoções: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.type === filter);

  const typeCounts = suggestions.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <MiniTutorial 
        id="ai_promos_guide" 
        title="Seu Consultor de Marketing 24h" 
        text="Esta IA analisa quem parou de vir, quais produtos estão parados e quais dias estão vazios. Clique em 'Gerar' e receba mensagens prontas para enviar no WhatsApp e lotar sua agenda!" 
      />
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex', padding: '16px', borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))',
          marginBottom: '16px',
        }}>
          <Sparkles size={40} style={{ color: '#f59e0b' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>🤖 Central de Promoções IA</h2>
        <p style={{ color: '#888', maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
          A inteligência analisa seus dados de agendamentos, clientes e produtos para gerar sugestões de promoções com mensagens prontas para copiar e enviar.
        </p>
      </div>

      {/* Botão principal */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <button className="admin-btn-primary neon-glow" onClick={analyze} disabled={loading}
          style={{ padding: '16px 40px', fontSize: '1.1rem', borderRadius: '16px' }}>
          {loading
            ? <><RefreshCw size={20} className="spin-animation" /> Analisando seus dados...</>
            : analyzed
              ? <><RefreshCw size={18} /> Re-analisar agora</>
              : <><Zap size={20} /> Gerar Sugestões de Promoções</>
          }
        </button>
        {analyzed && (
          <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#10b981' }}>
            ✅ {suggestions.length} sugestões geradas com base nos seus dados
          </div>
        )}
      </div>

      {/* Filtros por tipo */}
      {analyzed && suggestions.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', justifyContent: 'center' }}>
          {[
            { key: 'all', label: `Todas (${suggestions.length})` },
            { key: 'schedule', label: `📅 Agenda (${typeCounts.schedule || 0})` },
            { key: 'service', label: `✂️ Serviço (${typeCounts.service || 0})` },
            { key: 'retention', label: `👤 Retenção (${typeCounts.retention || 0})` },
            { key: 'loyalty', label: `⭐ Fidelidade (${typeCounts.loyalty || 0})` },
            { key: 'product', label: `📦 Produto (${typeCounts.product || 0})` },
          ].filter(f => f.key === 'all' || typeCounts[f.key] > 0).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '7px 15px', borderRadius: '20px', border: '1px solid',
              borderColor: filter === f.key ? 'var(--color-primary)' : 'var(--color-border)',
              background: filter === f.key ? 'rgba(255,122,0,0.15)' : 'rgba(255,255,255,0.03)',
              color: filter === f.key ? 'var(--color-primary)' : '#aaa',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
            }}>{f.label}</button>
          ))}
        </div>
      )}

      {/* Cards de sugestão */}
      {analyzed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((s, idx) => (
            <SuggestionCard key={idx} s={s} idx={idx} onAction={setActiveAction} />
          ))}
        </div>
      )}

      {/* Modal de ação */}
      {activeAction && (
        <ActionModal 
          suggestion={activeAction} 
          onClose={() => setActiveAction(null)} 
          updateSiteData={updateSiteData}
        />
      )}
    </div>
  );
};

export default AIPromotionsPanel;
