import { useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext';
import Button from '../components/Button';
import { ArrowLeft, X } from 'lucide-react';
import '../styles/Portfolio.css';

const CategoryGallery = () => {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const { siteData } = useContext(SiteContext);

    const category = siteData.galleryCategories.find(c => c.id === categoryId);

    // For fullscreen image viewing
    const [selectedImage, setSelectedImage] = useState(null);

    if (!category) {
        return (
            <div className="page container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <h2>Categoria não encontrada</h2>
                <Button onClick={() => navigate('/portifolio')} style={{ marginTop: '20px' }}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="page portfolio-page container fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/portifolio')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '16px' }}
                >
                    <ArrowLeft size={20} /> Voltar
                </button>
            </div>

            <h2 className="page-title" style={{ marginBottom: '10px' }}>{category.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Clique nas fotos para ampliar</p>

            <div className="portfolio-grid">
                {category.images.map((img, idx) => (
                    <div
                        key={idx}
                        className="portfolio-item"
                        onClick={() => setSelectedImage(img)}
                    >
                        <div className="portfolio-image" style={{ backgroundImage: `url(${img})` }}></div>
                    </div>
                ))}

                {category.images.length === 0 && (
                    <div style={{ padding: '40px', gridColumn: '1 / -1', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        Nenhuma foto adicionada ainda.
                    </div>
                )}
            </div>

            {/* Modal for full screen view */}
            {selectedImage && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', zIndex: 9999,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Zoomed"
                        style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
                        onClick={(e) => e.stopPropagation()} // Prevent click from closing when clicking the image itself
                    />
                </div>
            )}
        </div>
    );
};

export default CategoryGallery;
