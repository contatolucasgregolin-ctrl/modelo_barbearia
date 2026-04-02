import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="page container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="admin-loading-spinner" style={{ marginBottom: '16px' }}></div>
                    <p style={{ color: 'var(--color-primary)' }}>Autenticando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Se o usuário não tem role definida, redirecionar para login
    if (!role) {
        return <Navigate to="/login" replace />;
    }

    // Redirecionamento baseado no cargo se o acesso não for permitido
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return <Navigate to={role === 'admin' ? "/admin" : "/barbeiro"} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
