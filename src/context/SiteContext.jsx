import { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const SiteContext = createContext();

export const SiteProvider = ({ children }) => {
    const [siteData, setSiteData] = useState({
        logo: 'https://via.placeholder.com/400x150?text=StudioFlow',
        contact: {
            phone: '',
            whatsapp: '',
            instagram: '',
            address: ''
        },
        operatingHours: {
            weekdays: { label: 'Segunda a Sábado', hours: '14:00 - 22:00' },
            specialDays: { label: 'Domingos', hours: 'Fechado' },
            weekend: { label: 'Feriados', hours: 'Fechado' }
        },
        services: [],
        barbers: [], // mapped from artists
        gallery: [],
        galleryCategories: [],
        plans: [],
        promotions: []
    });

    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('app-theme') || 'dark';
    });

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        const fetchSiteData = async () => {
            try {
                // Fetch Settings
                const { data: settingsData } = await supabase.from('settings').select('*');
                let contact = {};
                let hours = {};
                let branding = {};

                if (settingsData) {
                    contact = settingsData.find(s => s.key_name === 'contact')?.value || {};
                    branding = settingsData.find(s => s.key_name === 'branding')?.value || {};
                    const ops = settingsData.find(s => s.key_name === 'operating_hours')?.value || {};
                    hours = {
                        weekdays: { label: ops.weekdays?.label || 'Segunda a Sexta', hours: ops.weekdays?.open ? `${ops.weekdays.open} - ${ops.weekdays.close}` : 'Fechado' },
                        specialDays: { label: ops.saturdays?.label || 'Sábados', hours: ops.saturdays?.open ? `${ops.saturdays.open} - ${ops.saturdays.close}` : 'Fechado' },
                        weekend: { label: ops.sundays?.label || 'Domingos', hours: ops.sundays?.open ? `${ops.sundays.open} - ${ops.sundays.close}` : 'Fechado' }
                    };
                }

                // Fetch Services
                const { data: servicesData } = await supabase.from('services').select('*').order('name');
                const services = (servicesData || []).map(s => ({
                    id: s.id,
                    name: s.name,
                    desc: s.description,
                    price: parseFloat(s.price),
                    duration: `${s.duration_mins}min`,
                    isFeatured: s.is_featured
                }));

                // Fetch Artists (mapped as barbers for compatibility)
                const { data: artistsData } = await supabase.from('artists').select('*').eq('active', true).order('name');
                const barbers = (artistsData || []).map(a => ({
                    id: a.id,
                    name: a.name,
                    specialty: a.specialty,
                    photo: a.photo_url || 'https://via.placeholder.com/150?text=Professional',
                    instagram: a.instagram
                }));

                // Fetch Gallery and Categories
                const [galleryRes, categoriesRes, plansRes, promosRes] = await Promise.all([
                    supabase.from('gallery').select('*, gallery_categories(name)').order('featured', { ascending: false }).order('created_at', { ascending: false }),
                    supabase.from('gallery_categories').select('*').order('name'),
                    supabase.from('plans').select('*').order('price'),
                    supabase.from('promotions').select('*').order('created_at', { ascending: false })
                ]);

                setSiteData({
                    logo: branding.logoUrl || branding.logoUrlLight || '',
                    banner: branding.bannerUrl || branding.bannerUrlLight || '',
                    logoUrl: branding.logoUrl || branding.logoUrlLight || '', // Helper field
                    bannerUrl: branding.bannerUrl || branding.bannerUrlLight || '', // Helper field
                    menuTitle: branding.menuTitle || 'BARBEARIA CLÁSSICA',
                    heroTitle: branding.heroTitle || 'BARBEARIA CLÁSSICA',
                    heroSubtitle: branding.heroSubtitle || 'Estilo Clássico. Atendimento Premium.',
                    contact: {
                        phone: contact.phone || '(11)93940-7229',
                        whatsapp: contact.whatsapp || '5511939407229',
                        instagram: contact.instagram || 'https://instagram.com/barbeariaclassica',
                        address: contact.address || 'Rua. Centro, 159 - Centro'
                    },
                    operatingHours: hours.weekdays ? hours : {
                        weekdays: { label: 'Segunda a Sábado', hours: '14:00 - 22:00' },
                        specialDays: { label: 'Domingos', hours: 'Fechado' },
                        weekend: { label: 'Feriados', hours: 'Fechado' }
                    },
                    services,
                    barbers,
                    gallery: galleryRes.data || [],
                    galleryCategories: categoriesRes.data || [],
                    plans: plansRes.data || [],
                    promotions: promosRes.data || []
                });
            } catch (error) {
                console.error("Error fetching site configuration", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSiteData();
    }, [theme]); // Added theme here so it re-fetches if theme-specific logic were ever needed, but mainly for sync

    const updateSiteData = async () => {
        // Simple trick to re-trigger the useEffect: change state or re-fetch manually
        // For now, let's just re-fetch everything
        setLoading(true);
        // Wait for a small delay to ensure DB is updated
        setTimeout(async () => {
            const fetchEvent = new CustomEvent('refreshSiteData');
            window.dispatchEvent(fetchEvent);
        }, 500);
    };

    useEffect(() => {
        const handleRefresh = () => {
            // Logic to re-fetch
            const fetchSiteData = async () => {
                try {
                    const { data: settingsData } = await supabase.from('settings').select('*');
                    const { data: servicesData } = await supabase.from('services').select('*').order('name');
                    const { data: artistsData } = await supabase.from('artists').select('*').eq('active', true).order('name');
                    const [galleryRes, categoriesRes, plansRes, promosRes] = await Promise.all([
                        supabase.from('gallery').select('*, gallery_categories(name)').order('featured', { ascending: false }).order('created_at', { ascending: false }),
                        supabase.from('gallery_categories').select('*').order('name'),
                        supabase.from('plans').select('*').order('price'),
                        supabase.from('promotions').select('*').order('created_at', { ascending: false })
                    ]);

                    let contact = settingsData?.find(s => s.key_name === 'contact')?.value || {};
                    let branding = settingsData?.find(s => s.key_name === 'branding')?.value || {};
                    let ops = settingsData?.find(s => s.key_name === 'operating_hours')?.value || {};

                    setSiteData(prev => ({
                        ...prev,
                        logo: branding.logoUrl || '',
                        banner: branding.bannerUrl || '',
                        logoUrl: branding.logoUrl || '',
                        bannerUrl: branding.bannerUrl || '',
                        menuTitle: branding.menuTitle || 'BARBEARIA CLÁSSICA',
                        heroTitle: branding.heroTitle || 'BARBEARIA CLÁSSICA',
                        heroSubtitle: branding.heroSubtitle || 'Estilo Clássico. Atendimento Premium.',
                        contact: {
                            ...prev.contact,
                            phone: contact.phone || prev.contact.phone,
                            whatsapp: contact.whatsapp || prev.contact.whatsapp,
                            instagram: contact.instagram || prev.contact.instagram,
                            address: contact.address || prev.contact.address
                        },
                        services: (servicesData || []).map(s => ({
                            id: s.id,
                            name: s.name,
                            desc: s.description,
                            price: parseFloat(s.price),
                            duration: `${s.duration_mins}min`,
                            isFeatured: s.is_featured
                        })),
                        plans: plansRes.data || [],
                        promotions: promosRes.data || []
                    }));
                } finally {
                    setLoading(false);
                }
            };
            fetchSiteData();
        };

        window.addEventListener('refreshSiteData', handleRefresh);
        return () => window.removeEventListener('refreshSiteData', handleRefresh);
    }, []);

    return (
        <SiteContext.Provider value={{ siteData, updateSiteData, loading, theme, toggleTheme }}>
            {children}
        </SiteContext.Provider>
    );
};
