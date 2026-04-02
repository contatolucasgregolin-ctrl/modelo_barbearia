import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, CheckCircle2, LayoutDashboard, Calendar, Package, Brain, GraduationCap, DollarSign, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOUR_STEPS = [
  {
    id: 'welcome',
    icon: <Sparkles size={40} className="neon-text" />,
    title: 'Bem-vindo ao StudioFlow! 🚀',
    description: 'Parabéns por levar sua barbearia para o próximo nível. Preparamos este guia rápido para você dominar sua nova ferramenta em 1 minuto.',
    btnText: 'Vamos Começar!',
    target: null
  },
  {
    id: 'appointments',
    icon: <Calendar size={32} color="var(--color-primary)" />,
    title: 'Agendamentos Inteligentes',
    description: 'Aqui você controla sua agenda. Quando um cliente marca pelo site, ele aparece aqui na hora. Você também pode desmarcar ou confirmar horários com um clique.',
    btnText: 'Entendi, Próximo',
    target: 'appointments'
  },
  {
    id: 'crm',
    icon: <Users size={32} color="#60a5fa" />,
    title: 'CRM e Fidelização',
    description: 'Conheça seus clientes de verdade! Veja quem são os mais fiéis e quem parou de vir para enviar aquela mensagem de resgate no WhatsApp e lotar a agenda.',
    btnText: 'Gostei!',
    target: 'customers'
  },
  {
    id: 'stock',
    icon: <Package size={32} color="#4ade80" />,
    title: 'Estoque e Custos Reais',
    description: 'Cadastre seus produtos e o sistema dirá o lucro real de cada corte, descontando automaticamente o custo de cada ml de gel ou pomada usado.',
    btnText: 'Sensacional!',
    target: 'stock'
  },
  {
    id: 'finances',
    icon: <DollarSign size={32} color="#10b981" />,
    title: 'Bússola Financeira',
    description: 'Esqueça as planilhas. Aqui você vê o faturamento e, mais importante, o LUCRO LIMPO, já descontando custos e comissões dos barbeiros.',
    btnText: 'Uau, Próximo!',
    target: 'finances'
  },
  {
    id: 'ai',
    icon: <Brain size={32} color="#a78bfa" />,
    title: 'I.A. e Marketing',
    description: 'Precisa de uma promoção para hoje? Nossa Inteligência Artificial analisa seus dados e cria textos persuasivos para você atrair novos clientes via WhatsApp.',
    btnText: 'Mágico!',
    target: 'ai'
  },
  {
    id: 'academy',
    icon: <GraduationCap size={32} color="#fbbf24" />,
    title: 'StudioFlow Academy',
    description: 'Acesse dicas exclusivas de marketing, fotos e gestão. O "Aprenda a Usar" é o seu portal para escalar seu negócio e faturar mais!',
    btnText: 'Finalizar Tour',
    target: 'academy'
  }
];

const OnboardingTour = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompletedTour = localStorage.getItem('studioflow_onboarding_completed');
    if (!hasCompletedTour) {
      // Pequeno delay para a página carregar
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    localStorage.setItem('studioflow_onboarding_completed', 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="onboarding-overlay"
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)'
        }}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="glass-panel"
          style={{
            maxWidth: '450px', padding: '40px', borderRadius: '32px',
            border: '2px solid var(--color-primary)', boxShadow: '0 0 50px rgba(255,122,0,0.2)',
            textAlign: 'center', position: 'relative'
          }}
        >
          <button 
            onClick={completeTour} 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <div style={{ marginBottom: '24px' }}>
            {step.icon}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 16px' }}>
            {step.title}
          </h2>

          <p style={{ color: '#ccc', lineHeight: '1.6', marginBottom: '32px', fontSize: '1rem' }}>
            {step.description}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="admin-btn-primary neon-glow" 
              onClick={handleNext}
              style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1rem' }}
            >
              {step.btnText} <ArrowRight size={18} />
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              {TOUR_STEPS.map((_, i) => (
                <div key={i} style={{ 
                  width: i === currentStep ? '24px' : '8px', 
                  height: '8px', 
                  borderRadius: '10px', 
                  background: i === currentStep ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
