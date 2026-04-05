import React, { useState, useEffect, useContext } from 'react';
import { SiteContext } from '../../context/SiteContext';
import { supabase, uploadStorageFile, compressToWebP } from '../../lib/supabase';
import { Save } from 'lucide-react';
import Swal from 'sweetalert2';

// ── Local Sub-Components ──
const SettingsField = ({ label, field, type = 'text', placeholder, form, setForm }) => (
    <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>{label}</label>
        <input
            type={type}
            className="form-input"
            placeholder={placeholder}
            value={form[field] || ''}
            onChange={e => setForm({ ...form, [field]: e.target.value })}
            style={{ width: '100%' }}
        />
    </div>
);

const SettingsTimeField = ({ labelPrefix, prefixKey, form, setForm }) => (
    <div style={{ marginBottom: 15 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
            <SettingsField label={`Rótulo (${labelPrefix})`} field={`${prefixKey}Label`} form={form} setForm={setForm} />
            <SettingsField label="Abre (HH:MM)" field={`${prefixKey}Open`} placeholder="09:00" form={form} setForm={setForm} />
            <SettingsField label="Fecha (HH:MM)" field={`${prefixKey}Close`} placeholder="19:00" form={form} setForm={setForm} />
        </div>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════
const SettingsTab = () => {
    const { updateSiteData } = useContext(SiteContext);

    const [form, setForm] = useState({
        phone: '',
        whatsapp: '',
        instagram: '',
        address: '',
        logoUrl: '',
        bannerUrl: '',
        menuTitle: '',
        heroTitle: '',
        heroSubtitle: '',
        weekdaysLabel: 'Segunda a Sexta',
        weekdaysOpen: '09:00',
        weekdaysClose: '19:00',
        saturdaysLabel: 'Sábados',
        saturdaysOpen: '09:00',
        saturdaysClose: '15:00',
        sundaysLabel: 'Domingos',
        sundaysOpen: '',
        sundaysClose: '',
    });
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({ logo: false, banner: false });

    useEffect(() => {
        let isActive = true;
        
        const fetchSettings = async () => {
            if (!isActive) return;
            setLoading(true);
            
            // Timeout guard: force loading=false if DB hangs
            const timeoutGuard = setTimeout(() => {
                if (isActive) {
                    console.warn("Settings fetch timed out. Forcing UI visible.");
                    setLoading(false);
                }
            }, 6000);

            try {
                const { data, error } = await supabase.from('settings').select('*');
                if (!isActive) return;
                if (error) throw error;
                
                // Ensure data is array
                const rows = Array.isArray(data) ? data : [];
                
                const contact = rows.find(s => s.key_name === 'contact')?.value || {};
                const hours = rows.find(s => s.key_name === 'operating_hours')?.value || {};
                const branding = rows.find(s => s.key_name === 'branding')?.value || {};

                setForm(f => ({
                    ...f,
                    phone: contact.phone || '',
                    whatsapp: contact.whatsapp || '',
                    instagram: contact.instagram || '',
                    address: contact.address || '',
                    logoUrl: branding.logoUrl || branding.logoUrlLight || '',
                    bannerUrl: branding.bannerUrl || branding.bannerUrlLight || '',
                    menuTitle: branding.menuTitle || '',
                    heroTitle: branding.heroTitle || '',
                    heroSubtitle: branding.heroSubtitle || '',
                    weekdaysLabel: hours.weekdays?.label || 'Segunda a Sexta',
                    weekdaysOpen: hours.weekdays?.open || '',
                    weekdaysClose: hours.weekdays?.close || '',
                    saturdaysLabel: hours.saturdays?.label || 'Sábados',
                    saturdaysOpen: hours.saturdays?.open || '',
                    saturdaysClose: hours.saturdays?.close || '',
                    sundaysLabel: hours.sundays?.label || 'Domingos',
                    sundaysOpen: hours.sundays?.open || '',
                    sundaysClose: hours.sundays?.close || '',
                }));
            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                clearTimeout(timeoutGuard);
                if (isActive) setLoading(false);
            }
        };
        
        fetchSettings();

        // Real-time sync for settings
        const channel = supabase.channel('realtime-settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
                fetchSettings();
            })
            .subscribe();

        return () => { 
            isActive = false;
            supabase.removeChannel(channel); 
        };
    }, []);

    const save = async () => {
        if (saving) return;
        setSaving(true);
        
        try {
            console.log("[SettingsTab] Iniciando salvamento das configurações...");
            
            const contactPayload = { phone: form.phone, whatsapp: form.whatsapp, instagram: form.instagram, address: form.address };
            const hoursPayload = {
                weekdays: { label: form.weekdaysLabel, open: form.weekdaysOpen, close: form.weekdaysClose },
                saturdays: { label: form.saturdaysLabel, open: form.saturdaysOpen, close: form.saturdaysClose },
                sundays: { label: form.sundaysLabel, open: form.sundaysOpen, close: form.sundaysClose }
            };
            const brandingPayload = {
                logoUrl: form.logoUrl,
                bannerUrl: form.bannerUrl,
                menuTitle: form.menuTitle,
                heroTitle: form.heroTitle,
                heroSubtitle: form.heroSubtitle
            };

            const payloads = [
                { key_name: 'contact', value: contactPayload },
                { key_name: 'operating_hours', value: hoursPayload },
                { key_name: 'branding', value: brandingPayload }
            ];

            // Executar salvamentos em paralelo para maior rapidez
            const savePromises = payloads.map(item => 
                supabase.from('settings').upsert({ 
                    key_name: item.key_name, 
                    value: item.value
                }, { onConflict: 'key_name' })
            );

            const results = await Promise.all(savePromises);
            const errors = results.filter(r => r.error).map(r => r.error);

            if (errors.length > 0) {
                console.error("[SettingsTab] Erros ao salvar:", errors);
                throw new Error(errors[0].message || "Erro desconhecido ao salvar no banco de dados.");
            }

            // Notificar contexto global para atualizar cache
            if (updateSiteData) {
                await updateSiteData();
            }
            
            setSaved(true);
            Swal.fire({
                icon: 'success',
                title: 'Configurações Salvas!',
                text: 'As alterações foram aplicadas e já estão visíveis para todos os clientes.',
                timer: 2500,
                showConfirmButton: false,
                background: 'var(--color-bg-dark)',
                color: 'var(--color-text)',
                confirmButtonColor: 'var(--color-primary)'
            });
            
            setTimeout(() => setSaved(false), 3000);
            
        } catch (err) {
            console.error("[SettingsTab] Erro crítico no save:", err);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao Salvar',
                text: `Não foi possível gravar os dados: ${err.message || 'Erro de conexão ou permissão.'}`,
                background: 'var(--color-bg-dark)',
                color: 'var(--color-text)',
                confirmButtonColor: 'var(--color-primary)'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(prev => ({ ...prev, [field]: true }));
        try {
            const optimizedFile = await compressToWebP(file, 5, 0.8);
            const sanitizedName = optimizedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
            const fileName = `brand/${field}_${Date.now()}_${sanitizedName}`;
            const publicUrl = await uploadStorageFile('uploads', fileName, optimizedFile);
            setForm(f => ({ ...f, [field]: publicUrl }));
        } catch (error) {
            console.error(`Error uploading ${field}: `, error);
            alert(error.message || `Erro ao carregar ${field}.`);
        } finally {
            setUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    if (loading) return <div className="admin-loading">Carregando configurações...</div>;

    return (
        <div className="fade-in">
            <h2 className="admin-section-title">Configurações Base</h2>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', color: 'var(--color-primary)' }}>🎨 Identidade Visual (Logo e Banner)</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '20px' }}>
                    <div className="form-group">
                        <label>Logotipo Principal</label>
                        {form.logoUrl ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}>
                                    <img src={form.logoUrl} alt="Logo preview" style={{ height: '80px', objectFit: 'contain' }} />
                                </div>
                                <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} type="button">Remover / Trocar</button>
                            </div>
                        ) : (
                            <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logoUrl')} disabled={uploading.logoUrl} className="form-input" />
                        )}
                        {uploading.logoUrl && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Enviando...</div>}
                    </div>

                    <div className="form-group">
                        <label>Fundo da Home (Banner Hero)</label>
                        {form.bannerUrl ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <img src={form.bannerUrl} alt="Banner preview" style={{ height: '110px', width: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                <button className="admin-btn-secondary" onClick={() => setForm(f => ({ ...f, bannerUrl: '' }))} type="button">Remover / Trocar</button>
                            </div>
                        ) : (
                            <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'bannerUrl')} disabled={uploading.bannerUrl} className="form-input" />
                        )}
                        {uploading.bannerUrl && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '5px' }}>Enviando...</div>}
                    </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>Textos Base</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    <SettingsField label="Título no Menu Superior" field="menuTitle" placeholder="Ex: BARBEARIA CLÁSSICA" form={form} setForm={setForm} />
                    <SettingsField label="Título Principal (Banner)" field="heroTitle" placeholder="Ex: BARBEARIA CLÁSSICA" form={form} setForm={setForm} />
                    <SettingsField label="Subtítulo / Slogan" field="heroSubtitle" placeholder="Ex: Estilo Clássico. Atendimento Premium." form={form} setForm={setForm} />
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', color: 'var(--color-primary)' }}>📞 Contato & Info</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    <SettingsField label="Telefone" field="phone" form={form} setForm={setForm} />
                    <SettingsField label="WhatsApp (apenas números)" field="whatsapp" placeholder="5531971129936" form={form} setForm={setForm} />
                </div>
                <SettingsField label="Instagram (link)" field="instagram" form={form} setForm={setForm} />
                <SettingsField label="Endereço Completo" field="address" form={form} setForm={setForm} />
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', color: 'var(--color-primary)' }}>🕐 Horários de Funcionamento</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 15 }}>Deixe "Abre" e "Fecha" em branco para dias em que a barbearia estiver fechada.</p>
                <SettingsTimeField labelPrefix="Dias úteis" prefixKey="weekdays" form={form} setForm={setForm} />
                <SettingsTimeField labelPrefix="Finais de semana 1" prefixKey="saturdays" form={form} setForm={setForm} />
                <SettingsTimeField labelPrefix="Finais de semana 2" prefixKey="sundays" form={form} setForm={setForm} />
            </div>

            <button 
                className={`admin-btn-primary neon-glow ${saving ? 'loading' : ''}`} 
                style={{ width: '100%', padding: '15px', fontSize: '1.1rem', marginBottom: 30 }} 
                onClick={save}
                disabled={saving}
            >
                {saving ? 'Guardando alterações...' : (saved ? '✅ Salvo com sucesso!' : <><Save size={18} style={{ marginRight: 8 }} />Salvar Configurações</>)}
            </button>
        </div>
    );
};

export default SettingsTab;
