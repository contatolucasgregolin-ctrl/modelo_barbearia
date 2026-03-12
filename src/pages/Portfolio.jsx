import { useContext, useState, useEffect } from 'react';
import { SiteContext } from '../context/SiteContext';
import '../styles/Portfolio.css';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

const Portfolio = () => {
    const { siteData } = useContext(SiteContext);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const categories = siteData.galleryCategories || [];
    const gallery = siteData.gallery || [];

    const filteredGallery = activeFilter === 'all'
        ? gallery
        : gallery.filter(img => img.category_id === activeFilter);

    const openLightbox = (img, index) => {
        setSelectedImage(img);
        setCurrentIndex(index);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    };

    const closeLightbox = () => {
        setSelectedImage(null);
        document.body.style.overflow = 'auto';
    };

    const nextImage = (e) => {
        e.stopPropagation();
        const nextIdx = (currentIndex + 1) % filteredGallery.length;
        setSelectedImage(filteredGallery[nextIdx]);
        setCurrentIndex(nextIdx);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        const prevIdx = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
        setSelectedImage(filteredGallery[prevIdx]);
        setCurrentIndex(prevIdx);
    };

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeLightbox();
            if (selectedImage) {
                if (e.key === 'ArrowRight') nextImage(e);
                if (e.key === 'ArrowLeft') prevImage(e);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, currentIndex, filteredGallery]);

    return (
        <div className="page portfolio-page container fade-in">
            <h2 className="page-title">Nosso Portfólio</h2>
            <p className="portfolio-desc">
                Conheça algumas das nossas tatuagens separadas por estilos
            </p>

            {categories.length > 0 && (
                <div className="portfolio-filter-bar hide-scroll">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                    >
                        Todos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveFilter(cat.id)}
                            className={`filter-btn ${activeFilter === cat.id ? 'active' : ''}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {filteredGallery.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px' }}>Nenhuma foto encontrada para esta categoria.</p>
            ) : (
                <div className="portfolio-grid">
                    {filteredGallery.map((img, idx) => (
                        <div key={img.id} className="glass-panel portfolio-item"
                            onClick={() => openLightbox(img, idx)}>
                            <img src={img.image_url} alt="Galeria Tatuagem" className="portfolio-image" />

                            <div className="portfolio-item-overlay">
                                <Maximize2 size={24} color="#FFF" />
                            </div>

                            {img.featured && (
                                <div className="featured-chip">
                                    Destaque
                                </div>
                            )}

                            {img.gallery_categories?.name && (
                                <div className="portfolio-item-caption">
                                    <span>{img.gallery_categories.name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Lightbox Modal ── */}
            {selectedImage && (
                <div className="lightbox-overlay" onClick={closeLightbox}>
                    <button className="lightbox-close" onClick={closeLightbox}>
                        <X size={32} />
                    </button>

                    <button className="lightbox-nav prev" onClick={prevImage}>
                        <ChevronLeft size={48} />
                    </button>

                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <img src={selectedImage.image_url} alt="Expanded view" className="lightbox-image" />
                        <div className="lightbox-info">
                            <h3>{selectedImage.gallery_categories?.name || 'Projeto'}</h3>
                            {selectedImage.featured && <span className="featured-tag">Destaque</span>}
                        </div>
                    </div>

                    <button className="lightbox-nav next" onClick={nextImage}>
                        <ChevronRight size={48} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
