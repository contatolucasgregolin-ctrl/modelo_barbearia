import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isRegister, setIsRegister] = useState(false);
    const [success, setSuccess] = useState(null);

    const { user, role, loading: authLoading, signOut } = useAuth();

    useEffect(() => {
        if (!authLoading && user && !isRegister) {
            if (role === 'admin') {
                navigate('/admin');
            } else if (role === 'barber') {
                navigate('/barbeiro');
            }
            // Se role é null, o usuário não tem permissão — fica na tela de login
        }
    }, [user, role, authLoading, navigate, isRegister]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (isRegister) {
                const normalizedEmail = email.toLowerCase().trim();

                // SEGURANÇA: Verificar se o e-mail foi pré-autorizado pelo admin
                const { data: preAuth, error: preAuthError } = await supabase
                    .from('user_roles')
                    .select('id, role')
                    .eq('email', normalizedEmail)
                    .maybeSingle();

                if (preAuthError) {
                    console.error('Erro ao verificar autorização:', preAuthError);
                }

                if (!preAuth) {
                    setError('⚠️ Este e-mail não foi autorizado pelo administrador. Solicite ao seu gestor que cadastre seu e-mail no sistema antes de criar a conta.');
                    return;
                }

                // E-mail pré-autorizado — pode criar a conta
                const { error: signUpError, data } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                });

                if (signUpError) throw signUpError;

                // Verificar se o e-mail já está em uso
                if (data?.user && data.user.identities && data.user.identities.length === 0) {
                    setError('Este e-mail já está em uso.');
                    return;
                }

                // Vincular o user_id ao registro de role existente E forçar a role autorizada
                if (data?.user?.id) {
                    await supabase
                        .from('user_roles')
                        .update({ user_id: data.user.id, role: preAuth.role })
                        .eq('id', preAuth.id);
                }

                setSuccess(`✅ Conta criada com sucesso! Você foi registrado como "${preAuth.role === 'admin' ? 'Administrador' : 'Barbeiro'}". Faça login para continuar.`);
                setIsRegister(false);
                setEmail('');
                setPassword('');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: email.toLowerCase().trim(),
                    password,
                });

                if (signInError) {
                    console.log("[Login] Erro no login oficial, tentando validação de PIN...");
                    
                    // FALLBACK: Verificar login via PIN na tabela user_roles
                    const { data: pinAuth, error: pinError } = await supabase
                        .from('user_roles')
                        .select('email, role, access_pin')
                        .eq('email', email.toLowerCase().trim())
                        .eq('access_pin', password)
                        .maybeSingle();

                    if (pinError || !pinAuth) {
                        throw new Error(signInError.message || "E-mail ou Senha incorretos.");
                    }

                    // PIN VÁLIDO! Salvar sessão manual e recarregar
                    console.log("[Login] Login via PIN bem-sucedido para:", pinAuth.email);
                    localStorage.setItem('barber_pin_auth', JSON.stringify({
                        email: pinAuth.email,
                        role: pinAuth.role,
                        ts: Date.now()
                    }));
                    
                    // Forçar recarregamento para o AuthContext ler o localStorage
                    window.location.reload();
                    return;
                }
            }
        } catch (error) {
            setError(error.message || 'Erro ao processar. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    // Mostrar mensagem se o usuário está logado mas não tem permissão
    const showNoAccess = !authLoading && user && !role;

    return (
        <div className="page container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '30px', borderRadius: 'var(--radius-lg)' }}>
                <h2 className="page-title neon-text" style={{ textAlign: 'center', marginBottom: '25px', fontSize: '2rem' }}>
                    {(isRegister && !user) ? 'Criar Acesso' : 'Área Restrita'}
                </h2>

                {authLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div className="spin-animation" style={{ display: 'inline-block', marginBottom: '16px' }}>
                           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                               <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                           </svg>
                        </div>
                        <h3 style={{ color: 'var(--color-text)', fontSize: '1.1rem', marginBottom: '8px' }}>Validando Acesso Seguro</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Conectando ao StudioFlow...</p>
                    </div>
                ) : (
                    <>
                        {showNoAccess && (
                            <div className="fade-in" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', textAlign: 'center', lineHeight: '1.5' }}>
                                🔒 Sua conta não possui permissão de acesso. Entre em contato com o administrador para que ele configure suas permissões.
                                <div style={{ marginTop: '10px' }}>
                                    <button
                                        onClick={async () => {
                                            await signOut();
                                        }}
                                        style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Sair desta conta
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="fade-in" style={{ background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="fade-in" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                                {success}
                            </div>
                        )}

                        {!showNoAccess && (
                            <form className="fade-in" onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="form-group">
                                    <label style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>E-mail</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Seu e-mail"
                                        required
                                    />
                                </div>

                        <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Senha</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Sua senha"
                                required
                                minLength={6}
                            />
                        </div>

                        <Button type="submit" className="neon-glow" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                            {loading ? 'Processando...' : (isRegister ? 'Cadastrar' : 'Entrar')}
                        </Button>
                    </form>
                )}

                {isRegister && !showNoAccess && (
                    <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', padding: '12px', borderRadius: '8px', marginTop: '15px', fontSize: '0.8rem', color: '#facc15', textAlign: 'center', lineHeight: '1.4' }}>
                        ⚠️ Apenas e-mails pré-autorizados pelo administrador podem criar conta. Se você é um novo colaborador, peça ao seu gestor para cadastrar seu e-mail primeiro.
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button 
                        onClick={() => { setIsRegister(!isRegister); setError(null); setSuccess(null); }} 
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
                    >
                        {isRegister ? 'Já tenho uma conta. Fazer Login.' : 'Sou Novo? Criar Acesso'}
                    </button>
                </div>
                </>
                )}
            </div>
        </div>
    );
};

export default Login;
