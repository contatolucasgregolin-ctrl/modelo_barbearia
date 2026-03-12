import { motion } from 'framer-motion';
import {
    Sparkles,
    Droplet,
    Wind,
    Pill,
    Waves,
    Scissors,
    Leaf,
    Gift,
    ShoppingBag
} from 'lucide-react';
import '../styles/Products.css';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } }
};

const categories = [
    {
        icon: Sparkles,
        name: 'Pomadas e Finalizadores',
        desc: 'Pomadas modeladoras, ceras e sprays para o acabamento perfeito.',
        products: ['Pomada Efeito Matte', 'Cera de Fixação Forte', 'Spray de Brilho'],
        soon: true,
    },
    {
        icon: Droplet,
        name: 'Cuidados para Barba',
        desc: 'Óleos, balms e shampoos específicos para manter a barba macia.',
        products: ['Óleo Hidratante', 'Balm Modelador', 'Shampoo de Barba'],
        soon: true,
    },
    {
        icon: Scissors,
        name: 'Barbear Clássico',
        desc: 'Cremes de barbear e pós-barba para uma pele sem irritação.',
        products: ['Creme de Barbear', 'Loção Pós-Barba', 'Gel de Barbear'],
        soon: true,
    },
    {
        icon: Wind,
        name: 'Cabelo e Couro Cabeludo',
        desc: 'Shampoos terapêuticos e tônicos para saúde capilar.',
        products: ['Shampoo Anticaspa', 'Tônico Fortificante', 'Condicionador'],
        soon: true,
    },
    {
        icon: Gift,
        name: 'Vestuário & Merch',
        shortName: 'Merch Oficial',
        desc: 'Camisetas e acessórios exclusivos da nossa barbearia.',
        products: ['Camiseta Oficial', 'Boné Bordado', 'Caneca Vintage', 'Stickers'],
        soon: true,
    }
];

const Products = () => {
    return (
        <motion.div
            className="page products-page container"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <motion.div className="products-header" variants={fadeInUp}>
                <h2 className="page-title">Produtos</h2>
                <p className="products-subtitle">
                    Curadoria especial para o seu cuidado diário.
                </p>
                <div className="coming-soon-banner">
                    <ShoppingBag size={24} className="banner-icon" />
                    <div>
                        <strong>Loja em desenvolvimento</strong>
                        <p>Em breve você poderá comprar direto aqui. Fique ligado!</p>
                    </div>
                </div>
            </motion.div>

            {/* Product Categories Grid */}
            <motion.div
                className="products-grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
            >
                {categories.map((cat, idx) => (
                    <motion.div
                        key={idx}
                        className="product-category-card"
                        variants={fadeInUp}
                        whileHover={{ scale: 1.02 }}
                    >
                        {/* Soon badge */}
                        {cat.soon && (
                            <div className="soon-badge">Em breve</div>
                        )}

                        {/* Category info */}
                        <div className="product-category-header">
                            <div className="product-icon-wrapper">
                                <cat.icon size={28} />
                            </div>
                            <div>
                                <h3>{cat.shortName || cat.name}</h3>
                                <p className="product-desc">{cat.desc}</p>
                            </div>
                        </div>

                        {/* Product list preview */}
                        <ul className="product-preview-list">
                            {cat.products.map((product, i) => (
                                <li key={i} className="product-preview-item">
                                    <div className="product-dot" />
                                    <span>{product}</span>
                                    <span className="product-tag">Em breve</span>
                                </li>
                            ))}
                        </ul>

                        {/* Notify CTA */}
                        <button
                            className="btn-notify"
                            onClick={() => window.open(`https://wa.me/${siteData.contact.whatsapp.replace(/\D/g, '')}?text=Olá! Tenho interesse nos produtos de ${cat.name}. Pode me avisar quando estiver disponível?`, '_blank')}
                        >
                            🔔 Me avise quando tiver
                        </button>
                    </motion.div>
                ))}
            </motion.div>


            {/* Bottom CTA */}
            <motion.div
                className="products-bottom-cta"
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
            >
                <p>Quer sugerir um produto?</p>
                <button
                    className="btn btn-primary"
                    onClick={() => window.open(`https://wa.me/${siteData.contact.whatsapp.replace(/\D/g, '')}?text=Olá! Gostaria de sugerir um produto para a barbearia.`, '_blank')}
                >
                    💬 Falar com a equipe
                </button>
            </motion.div>
        </motion.div>
    );
};

export default Products;
