import { useContext } from 'react';
import { SiteContext } from '../context/SiteContext';
import { Sun, Moon } from 'lucide-react';
import '../styles/Header.css';

const Header = () => {
    const { siteData, theme, toggleTheme } = useContext(SiteContext);

    return (
        <header className="app-header">
            <div className="container header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ width: '40px' }}></div> {/* Spacer for centering */}

                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    {siteData.logo ? (
                        <img src={siteData.logo} alt="Studio Logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />
                    ) : (
                        <h2 style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: '24px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--color-primary)' }}>
                            {siteData.menuTitle || 'BARBEARIA CLÁSSICA'}
                        </h2>
                    )}
                </div>

                <button onClick={toggleTheme} className="theme-toggle-btn" title="Alternar Tema">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
