import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    Users, Plus, Pencil, Trash2, Shield, Key, 
    Check, X, Save, RefreshCw, Star, Mail, Phone,
    UserPlus, UserCheck, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { supabase, uploadStorageFile, compressToWebP } from '../../lib/supabase';
import { myConfirm, myAlert } from '../../lib/utils';
import Swal from 'sweetalert2';

// Standardized helpers are now imported from ../../lib/utils


const TeamManagementTab = ({ isAdmin, cachedData, refreshAll }) => {
    const [activeSubTab, setActiveSubTab] = useState('professionals');
    const [loading, setLoading] = useState(!cachedData?.artists);
    const [professionals, setProfessionals] = useState(cachedData?.artists || []);
    const [accessList, setAccessList] = useState(cachedData?.user_roles || []);
    
    // Modal state
    const [showProfModal, setShowProfModal] = useState(false);
    const [editingProf, setEditingProf] = useState(null);
    const [profForm, setProfForm] = useState({
        name: '', photo_url: '', instagram: '', specialty: '', 
        active: true, commission_percentage: 0, email: '', pin: '',
        phone: ''
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Sync with global cache
    useEffect(() => {
        if (cachedData) {
            setProfessionals(cachedData.artists || []);
            setAccessList(cachedData.user_roles || []);
            setLoading(false);
        }
    }, [cachedData]);

    const handleProfSave = async () => {
        if (!profForm.name) return Swal.fire('Erro', 'Nome é obrigatório', 'error');
        setSaving(true);

        try {
            const payload = {
                name: profForm.name,
                photo_url: profForm.photo_url,
                instagram: profForm.instagram,
                specialty: profForm.specialty,
                active: profForm.active,
                commission_percentage: parseFloat(profForm.commission_percentage) || 0,
                phone: profForm.phone
            };

            let artistId = editingProf?.id;

            if (editingProf) {
                const { error } = await supabase.from('artists').update(payload).eq('id', editingProf.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('artists').insert([payload]).select().single();
                if (error) throw error;
                artistId = data.id;
            }

            // Sync with user_roles if email is provided
            if (profForm.email.trim()) {
                const { error: roleError } = await supabase.from('user_roles').upsert({
                    email: profForm.email.toLowerCase().trim(),
                    role: 'barber',
                    access_pin: profForm.pin,
                    artist_id: artistId
                }, { onConflict: 'email' });
                
                if (roleError) console.error('Role sync error:', roleError);
            }

            setShowProfModal(false);
            refreshAll();
            Swal.fire({
                title: 'Sucesso!',
                text: editingProf ? 'Profissional atualizado.' : 'Profissional cadastrado.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Save error:', error);
            Swal.fire('Erro', error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const fileName = `artists/${Date.now()}_${optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setProfForm(f => ({ ...f, photo_url: publicUrl }));
        } catch (error) {
            console.error('Upload error:', error);
            Swal.fire('Erro', 'Falha no upload da foto.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const removeProf = async (id) => {
        if (!(await myConfirm('Tem certeza que deseja excluir este profissional? Isso não removerá o histórico de serviços, mas ele não aparecerá mais nos filtros.'))) return;
        const { error } = await supabase.from('artists').delete().eq('id', id);
        if (error) Swal.fire('Erro', 'Não foi possível excluir: ' + error.message, 'error');
        else refreshAll();
    };

    const openEdit = async (prof) => {
        setEditingProf(prof);
        const userData = accessList.find(u => u.artist_id === prof.id);
        setProfForm({
            name: prof.name,
            photo_url: prof.photo_url || '',
            instagram: prof.instagram || '',
            specialty: prof.specialty || '',
            active: prof.active ?? true,
            commission_percentage: prof.commission_percentage || 0,
            email: userData?.email || '',
            pin: userData?.access_pin || '',
            phone: prof.phone || ''
        });
        setShowProfModal(true);
    };

    const openNewAccess = () => {
        setEditingProf(null);
        setProfForm({
            name: '', photo_url: '', instagram: '', specialty: '', 
            active: true, commission_percentage: 0, email: '', pin: ''
        });
        setShowProfModal(true);
    };

    return (
        <div className="team-management-v2 fade-in">
            {/* Header section */}
            <div className="admin-section-header" style={{ marginBottom: '25px' }}>
                <div>
                    <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users className="text-primary" /> Equipe e Acesso
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '5px 0 0' }}>
                        Gerencie seus colaboradores e níveis de permissão do sistema.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="admin-btn-secondary" onClick={() => refreshAll()}><RefreshCw size={16} /> Atualizar</button>
                    <button className="admin-btn-primary neon-glow" onClick={openNewAccess}><Plus size={16} /> Novo Colaborador</button>
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="admin-tabs-nav glass-panel" style={{ padding: '5px', borderRadius: '15px', marginBottom: '25px', display: 'inline-flex', gap: '5px' }}>
                <button 
                    className={`admin-tab-btn ${activeSubTab === 'professionals' ? 'active' : ''}`} 
                    onClick={() => setActiveSubTab('professionals')}
                >
                    <Star size={16} /> Barbeiros / Profissionais
                </button>
                <button 
                    className={`admin-tab-btn ${activeSubTab === 'access' ? 'active' : ''}`} 
                    onClick={() => setActiveSubTab('access')}
                >
                    <ShieldCheck size={16} /> Contas e Acessos
                </button>
            </div>

            {loading ? (
                <div className="admin-loading-container">
                    <RefreshCw className="spin-animation" size={40} />
                    <p>Sincronizando equipe...</p>
                </div>
            ) : (
                <>
                    {activeSubTab === 'professionals' && (
                        <div className="professionals-grid">
                            {professionals.length === 0 ? (
                                <div className="admin-empty-state glass-panel">
                                    <Users size={48} className="muted-icon" />
                                    <p>Nenhum profissional cadastrado.</p>
                                    <button className="admin-btn-primary" onClick={openNewAccess}>Cadastrar Primeiro</button>
                                </div>
                            ) : (
                                <div className="admin-cards-grid">
                                    {professionals.map(prof => {
                                        const access = accessList.find(u => u.artist_id === prof.id);
                                        return (
                                            <div key={prof.id} className={`glass-panel prof-card ${!prof.active ? 'inactive' : ''}`}>
                                                <div className="prof-card-image">
                                                    {prof.photo_url ? (
                                                        <img src={prof.photo_url} alt={prof.name} />
                                                    ) : (
                                                        <div className="prof-avatar-placeholder"><Users size={32} /></div>
                                                    )}
                                                    <div className={`status-pill ${prof.active ? 'active' : 'inactive'}`}>
                                                        {prof.active ? 'Ativo' : 'Pausado'}
                                                    </div>
                                                </div>
                                                <div className="prof-card-content">
                                                    <h3>{prof.name}</h3>
                                                    <p className="specialty">{prof.specialty || 'Barbeiro Profissional'}</p>
                                                    
                                                    <div className="prof-stats-mini">
                                                        <div className="stat-item">
                                                            <span className="label">Comissão</span>
                                                            <span className="value text-primary">{prof.commission_percentage}%</span>
                                                        </div>
                                                        <div className="stat-item">
                                                            <span className="label">Acesso</span>
                                                            <span className="value">
                                                                {access ? (
                                                                    <ShieldCheck size={14} color="#4ade80" title="Possui acesso ao sistema" />
                                                                ) : (
                                                                    <ShieldAlert size={14} color="#ef4444" title="Sem acesso configurado" />
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="prof-card-actions">
                                                        <button className="action-btn edit" onClick={() => openEdit(prof)}><Pencil size={16} /> Editar</button>
                                                        <button className="action-btn delete" onClick={() => removeProf(prof.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeSubTab === 'access' && (
                        <div className="access-management-table glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
                            <div className="table-header-box" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Gerenciamento de Credenciais</h3>
                            </div>
                            
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Colaborador</th>
                                            <th>E-mail</th>
                                            <th>Cargo</th>
                                            <th>PIN/Senha</th>
                                            <th style={{ textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accessList.map(item => {
                                            if (!item) return null;
                                            const prof = professionals.find(p => p.id === item.artist_id);
                                            return (
                                                <tr key={item.id || Math.random()}>
                                                    <td data-label="Colaborador">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {prof?.photo_url ? (
                                                                <img src={prof.photo_url} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={14} /></div>
                                                            )}
                                                            {prof?.name || 'Acesso sem Profissional'}
                                                        </div>
                                                    </td>
                                                    <td data-label="E-mail">{item.email}</td>
                                                    <td data-label="Cargo">
                                                        <span className={`badge-role ${item.role || 'barber'}`}>
                                                            {item.role === 'admin' ? 'Administrador' : item.role === 'manager' ? 'Gerente' : 'Barbeiro'}
                                                        </span>
                                                    </td>
                                                    <td data-label="PIN/Senha"><code>{item.access_pin || '---'}</code></td>

                                                    <td data-label="Ações" style={{ textAlign: 'right' }}>
                                                        <button 
                                                            className="action-btn edit" 
                                                            onClick={() => {
                                                                if (prof) openEdit(prof);
                                                                else openNewAccess(); // Fallback
                                                            }}
                                                        ><Key size={16} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal de Cadastro/Edição de Profissional e Acesso */}
            {showProfModal && createPortal(
                <div className="admin-modal-overlay" onClick={() => setShowProfModal(false)}>
                    <div className="admin-modal glass-panel" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header" style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ margin: 0 }}>{editingProf ? 'Editar Equipe' : 'Cadastrar na Equipe'}</h3>
                            <button onClick={() => setShowProfModal(false)} className="close-btn"><X size={20} /></button>
                        </div>
                        
                        <div className="admin-modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="admin-form">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {/* Link de Foto */}
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label>Foto de Perfil</label>
                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                            <div className="prof-preview-circle">
                                                {profForm.photo_url ? <img src={profForm.photo_url} /> : <Users size={32} />}
                                            </div>
                                            <input type="file" onChange={handleFileUpload} disabled={uploading} className="form-input" accept="image/*" />
                                        </div>
                                        {uploading && <small className="text-primary">Otimizando imagem...</small>}
                                    </div>

                                    {/* Campos Básicos */}
                                    <div className="form-group">
                                        <label>Nome Completo *</label>
                                        <input type="text" className="form-input" value={profForm.name} onChange={e => setProfForm({...profForm, name: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Especialidade</label>
                                        <input type="text" className="form-input" value={profForm.specialty} onChange={e => setProfForm({...profForm, specialty: e.target.value})} placeholder="Ex: Cortes Modernos & Barboterapia" />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>WhatsApp / Celular</label>
                                        <input type="text" className="form-input" value={profForm.phone} onChange={e => setProfForm({...profForm, phone: e.target.value})} placeholder="ex: 11999999999" />
                                    </div>
                                    <div className="form-group">
                                        <label>Instagram (@...)</label>
                                        <input type="text" className="form-input" value={profForm.instagram} onChange={e => setProfForm({...profForm, instagram: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Comissão (%)</label>
                                        <input type="number" className="form-input" value={profForm.commission_percentage} onChange={e => setProfForm({...profForm, commission_percentage: e.target.value})} />
                                    </div>
                                </div>

                                {/* Seção de Acesso */}
                                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h4 style={{ margin: '0 0 15px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Key size={18} className="text-primary" /> Credenciais de Login
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-group">
                                            <label>E-mail de Acesso</label>
                                            <input 
                                                type="email" 
                                                className="form-input" 
                                                value={profForm.email} 
                                                onChange={e => setProfForm({...profForm, email: e.target.value})} 
                                                placeholder="colaborador@studioflow.com"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Senha / PIN</label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                value={profForm.pin} 
                                                onChange={e => setProfForm({...profForm, pin: e.target.value})} 
                                                placeholder="Mínimo 4 caracteres"
                                            />
                                        </div>
                                    </div>
                                    <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '10px' }}>
                                        O colaborador usará este e-mail e PIN para acessar o painel restrito.
                                    </small>
                                </div>

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                                    <input 
                                        type="checkbox" 
                                        id="active" 
                                        checked={profForm.active} 
                                        onChange={e => setProfForm({...profForm, active: e.target.checked})} 
                                        style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)' }}
                                    />
                                    <label htmlFor="active" style={{ cursor: 'pointer', margin: 0 }}>Profissional está Ativo (Disponível para agendamentos)</label>
                                </div>
                            </div>
                        </div>

                        <div className="admin-modal-footer" style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowProfModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={handleProfSave} disabled={saving}>
                                {saving ? <RefreshCw className="spin-animation" size={16} /> : <Save size={16} />} 
                                {editingProf ? 'Salvar Alterações' : 'Concluir Cadastro'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            <style>{`
                .prof-card {
                    overflow: hidden;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .prof-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    border-color: var(--color-primary);
                }
                .prof-card.inactive {
                    opacity: 0.6;
                    filter: grayscale(0.5);
                }
                .prof-card-image {
                    height: 180px;
                    position: relative;
                    background: rgba(0,0,0,0.2);
                }
                .prof-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .prof-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.2);
                }
                .status-pill {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-pill.active { background: #4ade80; color: #000; }
                .status-pill.inactive { background: #ef4444; color: #fff; }
                
                .prof-card-content {
                    padding: 20px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .prof-card-content h3 { margin: 0 0 5px; font-size: 1.2rem; }
                .prof-card-content .specialty { color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 20px; }
                
                .prof-stats-mini {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                    padding: 10px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 10px;
                }
                .stat-item { display: flex; flex-direction: column; gap: 2px; }
                .stat-item .label { font-size: 0.7rem; color: var(--color-text-muted); text-transform: uppercase; }
                .stat-item .value { font-weight: 800; font-size: 1rem; }
                
                .prof-card-actions {
                    margin-top: auto;
                    display: flex;
                    gap: 10px;
                }
                .prof-card-actions .action-btn {
                    flex: 1;
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: transparent;
                    color: var(--color-text);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .prof-card-actions .action-btn.edit:hover { background: var(--color-primary); color: #000; }
                .prof-card-actions .action-btn.delete:hover { background: #ef4444; color: #fff; }
                
                .badge-role {
                    padding: 3px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                }
                .badge-role.admin { background: rgba(74,222,128,0.1); color: #4ade80; }
                .badge-role.manager { background: rgba(96,165,250,0.1); color: #60a5fa; }
                .badge-role.barber { background: rgba(167,139,250,0.1); color: #a78bfa; }
                
                .prof-preview-circle {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid var(--color-primary);
                }
                .prof-preview-circle img { width: 100%; height: 100%; object-fit: cover; }
            `}</style>
        </div>
    );
};

export default TeamManagementTab;
