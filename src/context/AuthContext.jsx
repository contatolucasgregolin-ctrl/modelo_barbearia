import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserRole = useCallback(async (authUser) => {
        if (!authUser) {
            setLoading(false);
            return;
        }
        
        try {
            const normalizedEmail = authUser.email?.toLowerCase();
            console.log("[AuthContext] Validando acesso para:", normalizedEmail);

            // 🔥 GOD MODE: Acesso total para os administradores mestres
            const masterEmails = [
                'lucasgregolin0@gmail.com', 
                'lucasgregolin@gmail.com', 
                'lucasgregolin95@gmail.com', 
                'admin@admin.com.br'
            ];

            if (masterEmails.includes(normalizedEmail)) {
                console.log("[AuthContext] Admin Master (" + normalizedEmail + ") detectado como redundância.");
                // We DON'T return early here anymore. We still call get_my_role to sync user_id!
                setRole('admin');
            }

            // Tentar buscar via RPC (Seguro contra recursão RLS)
            const { data: roleData, error: rpcError } = await supabase.rpc('get_my_role');

            if (!rpcError && roleData && roleData !== 'none') {
                setRole(roleData);
            } else {
                // If RPC fails but we are a master email, we force 'admin'
                if (masterEmails.includes(normalizedEmail)) {
                    setRole('admin');
                } else {
                    // Tentar busca direta na tabela (Fallback se o RPC falhar)
                    const { data: directData } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('email', normalizedEmail)
                        .maybeSingle();
                    
                    if (directData) setRole(directData.role);
                    else setRole(null);
                }
            }
        } catch (err) {
            console.error("[AuthContext] Erro ao buscar role:", err);
            // Default robusto para o admin se houver erro crítico
            if (authUser.email === 'lucasgregolin0@gmail.com') setRole('admin');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const handleSession = async (session) => {
            if (!session) {
                // FALLBACK: Verificar se há um login via PIN (Barbeiro)
                const pinAuth = localStorage.getItem('barber_pin_auth');
                if (pinAuth) {
                    try {
                        const { email, role: savedRole } = JSON.parse(pinAuth);
                        console.log("[AuthContext] Login via PIN detectado:", email);
                        setRole(savedRole);
                        setUser({ email, id: 'pin-user' });
                    } catch (e) {
                        localStorage.removeItem('barber_pin_auth');
                        setUser(null);
                        setRole(null);
                    }
                } else {
                    setUser(null);
                    setRole(null);
                }
                setLoading(false);
                return;
            }
            
            setUser(session.user);
            await fetchUserRole(session.user);
        };

        const initialize = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!active) return;
                await handleSession(session);
            } catch (err) {
                console.error("[AuthContext] Init error:", err);
                if (active) setLoading(false);
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!active) return;
            if (event === 'INITIAL_SESSION') return;
            await handleSession(session);
        });

        const failSafe = setTimeout(() => {
            if (active && loading) {
                console.warn("[AuthContext] Fail-safe triggered after 8s.");
                setLoading(false);
            }
        }, 8000);

        return () => {
            active = false;
            subscription.unsubscribe();
            clearTimeout(failSafe);
        };
    }, [fetchUserRole]);

    const signOut = useCallback(async () => {
        console.log("[AuthContext] Signing out...");
        localStorage.removeItem('barber_pin_auth');
        setUser(null);
        setRole(null);
        setLoading(false);
        await supabase.auth.signOut();
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user, 
            role, 
            loading, 
            signOut, 
            isAdmin: role === 'admin' 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
