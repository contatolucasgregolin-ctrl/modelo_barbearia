import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if already logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/admin');
            }
        });
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            navigate('/admin');
        } catch (error) {
            setError(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page container fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '30px', borderRadius: 'var(--radius-lg)' }}>
                <h2 className="page-title neon-text" style={{ textAlign: 'center', marginBottom: '25px', fontSize: '2rem' }}>
                    Admin Login
                </h2>

                {error && (
                    <div style={{ background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group">
                        <label style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>E-mail</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Seu e-mail"
                            required
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff' }}
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
                            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff' }}
                        />
                    </div>

                    <Button type="submit" className="neon-glow" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Login;
