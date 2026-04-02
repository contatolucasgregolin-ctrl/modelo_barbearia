import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SecurityShield = ({ children }) => {
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Se estiver em modo de desenvolvimento, podemos querer pular essas proteções, 
        // mas o usuário pediu segurança pesada. Vou aplicar sempre pelo plano.
        // Se precisar desativar em dev, descomente abaixo:
        // if (import.meta.env.DEV) return;

        // 1. Anti console.log (Sobrescrita)
        const noop = () => {};
        const consoleMethods = ['log', 'debug', 'info', 'warn', 'error', 'dir', 'dirxml', 'trace', 'profile'];
        const originalConsole = { ...console };
        
        // Desativamos os logs, exceto se estivermos na página de Admin (para facilitar a vida do administrador)
        if (!location.pathname.startsWith('/admin')) {
            consoleMethods.forEach(method => {
                console[method] = noop;
            });
        }

        // 2. Bloqueio de clique direito
        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };

        // 3. Bloqueio de atalhos de desenvolvedor e teclas de cópia
        const handleKeyDown = (e) => {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I, J, C, U
            if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'U'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (Ver código-fonte) / Ctrl+S (Salvar) / Ctrl+P (Imprimir)
            if (e.ctrlKey && ['U', 'S', 'P'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                return false;
            }
            // Bloqueio de copiar/colar e selecionar tudo (Ctrl+C, Ctrl+V, Ctrl+A)
            if (e.ctrlKey && ['C', 'V', 'A'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                return false;
            }
            // Detecção de Print Screen (Aviso apenas, tentar bloquear é muito difícil nativamente)
            if (e.key === 'PrintScreen') {
                navigator.clipboard.writeText(''); // Limpa o clipboard se possível
                alert("Captura de tela não autorizada neste ambiente protegido.");
            }
        };

        // 4. Detecção de DevTools pelo tamanho da janela (com tolerância)
        const detectDevTools = () => {
            // Se estiver rodando localmente (sua máquina), NÃO bloqueia para você poder trabalhar
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return;
            }

            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;
            // Aumentando a tolerância para 250px para evitar falsos positivos com zoom
            if (widthDiff > 250 || heightDiff > 250) {
                setIsDevToolsOpen(true);
            } else {
                setIsDevToolsOpen(false);
            }
        };
        const devToolsInterval = setInterval(detectDevTools, 1000);
        window.addEventListener('resize', detectDevTools);

        // 5. Anti-debugger (loop infinito para travar quem tentar debugar)
        let debuggerInterval;
        if (!location.pathname.startsWith('/admin') && window.location.hostname !== 'localhost') {
            debuggerInterval = setInterval(() => {
                const before = new Date().getTime();
                // eslint-disable-next-line no-debugger
                debugger;
                const after = new Date().getTime();
                if (after - before > 100) {
                    setIsDevToolsOpen(true);
                }
            }, 1000);
        }

        // 6. Prevenção de colar/copiar através de eventos normais
        const preventCopyPaste = (e) => {
            e.preventDefault();
            return false;
        };

        // Adicionando listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);

        // Cleanup
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
            clearInterval(devToolsInterval);
            if (debuggerInterval) clearInterval(debuggerInterval);
            window.removeEventListener('resize', detectDevTools);
            // Restaura o console
            consoleMethods.forEach(method => {
                console[method] = originalConsole[method];
            });
        };
    }, [location.pathname]);

    if (isDevToolsOpen) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                background: '#000', color: '#0f0', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', zIndex: 9999,
                fontFamily: 'monospace', textAlign: 'center'
            }}>
                <h1>Acesso Negado</h1>
                <p>O uso de ferramentas de desenvolvedor é proibido neste ambiente.</p>
                <p>Por favor, feche o DevTools e atualize a página.</p>
            </div>
        );
    }

    return <>{children}</>;
};

export default SecurityShield;
