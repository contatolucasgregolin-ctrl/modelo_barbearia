import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, ShoppingBag, Phone, Image } from 'lucide-react';
import '../styles/Navbar.css';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <nav className="bottom-nav">
            <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                <Home size={24} />
                <span>Início</span>
            </Link>
            <Link to="/agendamento" className={`nav-item ${isActive('/agendamento') ? 'active' : ''}`}>
                <Calendar size={24} />
                <span>Agendar</span>
            </Link>
            <Link to="/produtos" className={`nav-item ${isActive('/produtos') ? 'active' : ''}`}>
                <ShoppingBag size={24} />
                <span>Produtos</span>
            </Link>
            <Link to="/portifolio" className={`nav-item ${isActive('/portifolio') ? 'active' : ''}`}>
                <Image size={24} />
                <span>Galeria</span>
            </Link>
            <Link to="/contato" className={`nav-item ${isActive('/contato') ? 'active' : ''}`}>
                <Phone size={24} />
                <span>Contato</span>
            </Link>
        </nav>
    );
};

export default Navbar;
