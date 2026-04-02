import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MiniTutorial = ({ id, title, text }) => {
  const [visible, setVisible] = useState(false);
  const [dontShowThis, setDontShowThis] = useState(false);

  useEffect(() => {
    // Verificar se todos os tutoriais estão desativados globalmente
    const globalDisable = localStorage.getItem('studioflow_disable_all_tutorials') === 'true';
    // Verificar se este tutorial específico foi desativado
    const thisDisable = localStorage.getItem(`studioflow_tutorial_${id}_disabled`) === 'true';

    if (!globalDisable && !thisDisable) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [id]);

  const handleDontShowThis = () => {
    localStorage.setItem(`studioflow_tutorial_${id}_disabled`, 'true');
    setVisible(false);
  };

  const handleDisableAll = () => {
    localStorage.setItem('studioflow_disable_all_tutorials', 'true');
    // Forçar atualização da página ou evento global para sumir com os outros
    window.dispatchEvent(new Event('storage'));
    setVisible(false);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      if (localStorage.getItem('studioflow_disable_all_tutorials') === 'true') {
        setVisible(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'rgba(255,122,0,0.1)',
          border: '1px solid var(--color-primary)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="glass-panel"
      >
        <div style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Info size={18} />
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Tutorial: {title}
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#ccc', lineHeight: '1.5' }}>
            {text}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={handleDontShowThis}
              style={{ background: 'none', border: '1px solid rgba(255,122,0,0.3)', borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', color: '#888', cursor: 'pointer', transition: '0.2s' }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,122,0,0.1)'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              Não mostrar mais este
            </button>
            <button 
              onClick={handleDisableAll}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', color: '#666', cursor: 'pointer' }}
            >
              Não quero ver mais nenhum tutorial
            </button>
          </div>
        </div>

        <button 
          onClick={() => setVisible(false)}
          style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default MiniTutorial;
