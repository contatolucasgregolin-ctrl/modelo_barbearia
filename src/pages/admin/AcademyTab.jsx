import React, { useState } from 'react';
import { 
  PlayCircle, Lightbulb, TrendingUp, Users, Target, 
  MessageSquare, BookOpen, Star, ShieldCheck, Zap, 
  Instagram, Share2, Award, DollarSign, Calculator, Sparkles,
  ChevronRight, Laptop, Smartphone, LineChart, HelpCircle
} from 'lucide-react';

const AcademyCard = ({ icon, title, description, badge, onClick, color = 'var(--color-primary)' }) => (
  <div className="glass-panel academy-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', cursor: 'pointer' }}>
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
      {React.cloneElement(icon, { size: 100 })}
    </div>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ background: `${color}20`, color, padding: '12px', borderRadius: '12px' }}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      {badge && (
        <span style={{ background: badge === 'Novo' ? '#ef4444' : 'var(--color-primary)', color: 'white', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '20px', fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </div>

    <div>
      <h3 style={{ margin: '8px 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa', lineHeight: '1.5' }}>{description}</p>
    </div>

    <button className="admin-btn-secondary" style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem' }} onClick={onClick}>
      <PlayCircle size={16} /> Assistir Aula
    </button>
  </div>
);

const VideoModal = ({ isOpen, onClose, videoTitle }) => {
  if (!isOpen) return null;
  return (
    <div className="admin-modal-overlay" onClick={onClose} style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="admin-modal glass-panel" style={{ maxWidth: '800px', width: '90%', padding: '0', overflow: 'hidden', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{videoTitle}</h3>
          <button className="admin-modal-close" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
            <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexDirection: 'column', gap: '15px' }}>
                <PlayCircle size={60} style={{ opacity: 0.5 }} />
                <p>Vídeo Tutorial: {videoTitle}</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>(O link real do vídeo seria carregado aqui)</p>
            </div>
        </div>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
            Este tutorial faz parte da trilha de especialização do StudioFlow. Assista até o final para ganhar o selo de proficiência e configurar corretamente sua plataforma.
          </p>
        </div>
      </div>
    </div>
  );
};

const AcademyTab = () => {
    const [selectedVideo, setSelectedVideo] = useState(null);

    const openVideo = (title) => setSelectedVideo(title);

  return (
    <div className="academy-container fade-in" style={{ paddingBottom: '100px' }}>
      <VideoModal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} videoTitle={selectedVideo} />

      {/* Hero Section */}
      <div className="glass-panel" style={{ padding: '40px', borderRadius: '24px', marginBottom: '32px', background: 'linear-gradient(135deg, rgba(255,122,0,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(255,122,0,0.2)' }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 12px' }}>
             Academia <span className="neon-text">StudioFlow</span> 🎓
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#ccc', lineHeight: '1.6', margin: '0 0 24px' }}>
            Transforme sua barbearia em um negócio profissional. Aqui você aprende a dominar o sistema, atrair clientes inativos e gerenciar sua equipe.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '30px' }}>
              <ShieldCheck size={18} color="#4ade80" /> Certificado de Proficiência
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '30px' }}>
              <TrendingUp size={18} color="#facc15" /> Foco em Escala e Lucro
            </div>
          </div>
        </div>
      </div>

      {/* Trilha 1: Dominando a Plataforma */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Laptop style={{ color: 'var(--color-primary)' }} /> Dominando a Plataforma
                </h2>
                <p style={{ color: '#888', margin: '4px 0 0' }}>Tudo o que você precisa saber para configurar seu painel de controle.</p>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>APRENDA A USAR</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          <AcademyCard 
            icon={<Zap />} 
            title="Setup Inicial em 5 min" 
            description="Aprenda a configurar seus horários, serviços e categorias para seu site ficar impecável rapidamente."
            badge="Essencial"
            onClick={() => openVideo("Setup Inicial em 5 min")}
          />
          <AcademyCard 
            icon={<Calculator />} 
            title="Gestão de Custo por Uso" 
            description="Configuração avançada de produtos. Aprenda a vincular ml/g aos serviços para saber seu lucro real."
            badge="Recomendado"
            color="#4ade80"
            onClick={() => openVideo("Gestão de Custo por Uso")}
          />
          <AcademyCard 
            icon={<Users />} 
            title="Painel de Mensalistas" 
            description="Como criar planos de assinatura e manter um faturamento recorrente garantido todo mês."
            badge="Estratégico"
            color="#60a5fa"
            onClick={() => openVideo("Painel de Mensalistas")}
          />
        </div>
      </div>

      {/* Trilha 2: Marketing & Crescimento */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Target style={{ color: '#f87171' }} /> Marketing & Crescimento
                </h2>
                <p style={{ color: '#888', margin: '4px 0 0' }}>Estratégias validadas para lotar sua agenda e expandir sua marca.</p>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>DICAS DE EXPERTS</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          <AcademyCard 
            icon={<Instagram />} 
            title="Instagram de Atração" 
            description="Fotos que vendem: aprenda a registrar seus cortes e usar Stories para preencher horários vazios."
            color="#e1306c"
            onClick={() => openVideo("Instagram de Atração")}
          />
          <AcademyCard 
            icon={<MessageSquare />} 
            title="Resgate via WhatsApp" 
            description="Recupere clientes inativos com scripts de mensagens prontos que funcionam de verdade."
            color="#25d366"
            onClick={() => openVideo("Resgate via WhatsApp")}
          />
          <AcademyCard 
            icon={<Sparkles />} 
            title="I.A. para Promoções" 
            description="Como usar nosso gerador de promoções IA para criar campanhas irresistíveis em segundos."
            badge="Novo"
            color="#a78bfa"
            onClick={() => openVideo("I.A. para Promoções")}
          />
        </div>
      </div>

      {/* Seção de Dicas Rápidas */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lightbulb style={{ color: '#fbbf24' }} /> Dicas de Alta Performance
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center', borderLeft: '4px solid #facc15' }}>
            <div style={{ background: 'rgba(250,204,21,0.1)', color: '#facc15', padding: '15px', borderRadius: '50%' }}><Star size={24} /></div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>Dica de Gestão: Aumente o Ticket Médio</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Ofereça sempre uma hidratação ou higienização facial ao finalizar o corte. 70% dos clientes aceitam se a oferta for feita no momento certo.</p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center', borderLeft: '4px solid #4ade80' }}>
            <div style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '15px', borderRadius: '50%' }}><LineChart size={24} /></div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>Dica de Finanças: Análise de Recorrência</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Foque em clientes que vêm a cada 15 dias. Use o CRM para identificar quem está 'vencendo' o tempo de corte e envie um lembrete personalizado.</p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center', borderLeft: '4px solid #60a5fa' }}>
            <div style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '15px', borderRadius: '50%' }}><Smartphone size={24} /></div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>Dica de Marketing: Google Meu Negócio</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Tenha certeza que o seu subdomínio StudioFlow está no Google Meu Negócio. Clientes que encontram você pelo mapa convertem 3x mais rápido.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Suporte */}
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.03 }}>
            <HelpCircle size={200} />
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Precisa de uma mãozinha?</h3>
        <p style={{ color: '#aaa', maxWidth: '500px', margin: '0 auto 24px' }}>Nosso time de especialistas está pronto para te ajudar a configurar qualquer parte da sua barbearia.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="admin-btn-primary neon-glow" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} /> Suporte via WhatsApp
            </button>
            <button className="admin-btn-secondary" style={{ padding: '12px 24px' }}>
                Perguntas Frequentes
            </button>
        </div>
      </div>
    </div>
  );
};

export default AcademyTab;
