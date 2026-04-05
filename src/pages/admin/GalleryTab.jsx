import React, { useState, useEffect, useCallback, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext';
import { supabase, uploadStorageFile, compressToWebP } from '../../lib/supabase';
import { myConfirm } from '../../lib/utils';
import {
    Plus, Trash2, Save, X, ChevronLeft, ChevronRight, Maximize2, Trophy, RefreshCw
} from 'lucide-react';
import { Modal } from '../Admin';

// ══════════════════════════════════════════════════════════════════════════════
// GALLERY TAB
// ══════════════════════════════════════════════════════════════════════════════
const GalleryTab = () => {
    const { updateSiteData: fetchContext } = useContext(SiteContext);
    const [images, setImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [form, setForm] = useState({ image_url: '', category_id: '', featured: false });

    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            const [imgsRes, catsRes] = await Promise.all([
                supabase.from('gallery').select('*, gallery_categories(name)').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(20),
                supabase.from('gallery_categories').select('*').order('name')
            ]);
            setImages(imgsRes.data || []);
            setCategories(catsRes.data || []);
        } catch (err) {
            console.error("Error fetching gallery images:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchImages(); }, [fetchImages]);

    // Real-time listener for gallery images
    useEffect(() => {
        const channel = supabase.channel('realtime-gallery-images')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
                fetchImages();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchImages]);

    const fetchImagesAndContext = () => {
        fetchImages();
        fetchContext(); // correctly aliased to updateSiteData
    };

    const openNew = () => { setForm({ image_url: '', category_id: '', featured: false }); setShowModal(true); };

    const save = async () => {
        if (!form.image_url) return alert('É necessário fazer o upload de uma imagem');
        if (!form.category_id) return alert('A categoria da foto é obrigatória');

        const { error } = await supabase.from('gallery').insert([{
            image_url: form.image_url,
            category_id: form.category_id,
            featured: form.featured
        }]);

        if (error) {
            console.error('Error saving gallery image:', error);
            return alert('Erro ao salvar no banco de dados: ' + error.message);
        }

        setShowModal(false);
        fetchImagesAndContext();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            // Optimize image via WebP before uploading
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const fileName = `gallery/${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setForm(f => ({ ...f, image_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading:', error);
            alert(error.message || 'Erro ao processar/upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const remove = async (id) => {
        if (!(await myConfirm('Excluir esta foto da galeria?'))) return;
        await supabase.from('gallery').delete().eq('id', id);
        fetchImagesAndContext();
    };

    const toggleFeatured = async (img) => {
        await supabase.from('gallery').update({ featured: !img.featured }).eq('id', img.id);
        fetchImagesAndContext();
    };

    const openLightbox = (img, index) => {
        setSelectedImage(img);
        setCurrentIndex(index);
    };

    const nextImage = (e) => {
        e.stopPropagation();
        const nextIdx = (currentIndex + 1) % images.length;
        setSelectedImage(images[nextIdx]);
        setCurrentIndex(nextIdx);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        const prevIdx = (currentIndex - 1 + images.length) % images.length;
        setSelectedImage(images[prevIdx]);
        setCurrentIndex(prevIdx);
    };

    return (
        <div className="fade-in">
            <div className="admin-section-header">
                <h2 className="admin-section-title">Galeria de Cortes</h2>
                <button className="admin-add-btn neon-glow" onClick={openNew}><Plus size={16} /> <span>Nova Foto</span></button>
            </div>

            {loading ? <div className="admin-loading" style={{ padding: '60px', textAlign: 'center' }}>
                <RefreshCw size={40} className="spin-animation" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
                <p>Revelando sua galeria...</p>
            </div> : (
                <div className="admin-gallery-grid">
                    {images.map((img, idx) => (
                        <div key={img.id} className="glass-panel portfolio-item" onClick={() => openLightbox(img, idx)}>
                            <img src={img.image_url} alt="Galeria" className="portfolio-image" style={{ height: '160px' }} />

                            <div className="portfolio-item-overlay">
                                <Maximize2 size={18} color="#FFF" />
                            </div>

                            <div className="gallery-item-info">
                                <span className="gallery-item-category">{img.gallery_categories?.name || 'Sem Categoria'}</span>
                            </div>

                            <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); remove(img.id); }}
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>
                                <Trash2 size={14} />
                            </button>
                            <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); toggleFeatured(img); }} title={img.featured ? "Remover Destaque" : "Destacar Imagem"}
                                style={{ position: 'absolute', top: '8px', right: '40px', background: 'rgba(0,0,0,0.6)', color: img.featured ? '#facc15' : '#ccc', border: 'none', padding: '6px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>
                                <Trophy size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Lightbox Modal ── */}
            {selectedImage && (
                <div className="lightbox-overlay" onClick={() => setSelectedImage(null)}>
                    <button className="lightbox-close" onClick={() => setSelectedImage(null)}>
                        <X size={32} />
                    </button>

                    <button className="lightbox-nav prev" onClick={prevImage}>
                        <ChevronLeft size={48} />
                    </button>

                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <img src={selectedImage.image_url} alt="Expanded" className="lightbox-image" />
                    </div>

                    <button className="lightbox-nav next" onClick={nextImage}>
                        <ChevronRight size={48} />
                    </button>
                </div>
            )}

            {showModal && (
                <Modal title="Nova Foto para Galeria" onClose={() => setShowModal(false)}>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Foto da Galeria</label>
                            {form.image_url ? (
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Pré-visualização:</p>
                                        <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, image_url: '' }))} type="button" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                            Remover / Trocar
                                        </button>
                                    </div>
                                    <img src={form.image_url} alt="preview" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                            ) : (
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="form-input"
                                />
                            )}
                            {uploading && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Otimizando p/ WebP e transferindo para nuvem...</div>}
                        </div>
                        <div className="form-group">
                            <label>Categoria do Corte *</label>
                            <select className="form-input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                <option value="">Selecione uma categoria...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                            <label htmlFor="featured" style={{ cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>Marcar como Destaque</label>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={save}><Save size={16} /> Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GalleryTab;
