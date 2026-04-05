import { createContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export const SiteContext = createContext();

export const SiteProvider = ({ children }) => {
    const [siteData, setSiteData] = useState({
        logo: '',
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
        barbers: [],
        gallery: [],
        galleryCategories: [],
        plans: [],
        promotions: []
    });

    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('app-theme') || 'dark';
    });
    const fetchRef = useRef(null);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const fetchSiteData = async () => {
        try {
            console.log('[SiteContext] Fetching all site data...');
            
            const safeFetch = async (query) => {
                try {
                    const result = await query;
                    if (result.error) throw result.error;
                    return result;
                } catch (err) {
                    console.error("[SiteContext] DB Fetch Error:", err);
                    return { data: [], error: err };
                }
            };

            // Fetch ALL data in parallel, individual catch prevents entire failure
            const [settingsRes, servicesRes, artistsRes, galleryRes, categoriesRes, plansRes, promosRes] = await Promise.all([
                safeFetch(supabase.from('settings').select('*')),
                safeFetch(supabase.from('services').select('*').order('name')),
                safeFetch(supabase.from('artists').select('*').eq('active', true).order('name')),
                safeFetch(supabase.from('gallery').select('*, gallery_categories(name)').order('featured', { ascending: false }).order('created_at', { ascending: false })),
                safeFetch(supabase.from('gallery_categories').select('*').order('name')),
                safeFetch(supabase.from('plans').select('*').order('price')),
                safeFetch(supabase.from('promotions').select('*').order('created_at', { ascending: false }))
            ]);

            const settingsData = settingsRes.data;
            const servicesData = servicesRes.data;
            const artistsData = artistsRes.data;

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

            const services = (servicesData || []).map(s => ({
                id: s.id,
                name: s.name,
                desc: s.description,
                price: parseFloat(s.price) || 0,
                duration: `${s.duration_mins || 0}min`,
                isFeatured: s.is_featured
            }));

            const barbers = (artistsData || []).map(a => ({
                id: a.id,
                name: a.name,
                specialty: a.specialty,
                photo: a.photo_url || 'https://via.placeholder.com/150?text=Professional',
                instagram: a.instagram
            }));

            const newData = {
                logo: branding.logoUrl || branding.logoUrlLight || '',
                banner: branding.bannerUrl || branding.bannerUrlLight || '',
                logoUrl: branding.logoUrl || branding.logoUrlLight || '',
                bannerUrl: branding.bannerUrl || branding.bannerUrlLight || '',
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
            };

            console.log('[SiteContext] Data loaded:', {
                services: (services || []).length,
                plans: (plansRes?.data || []).length,
                promotions: (promosRes?.data || []).length,
                gallery: (galleryRes?.data || []).length
            });

            setSiteData(prev => ({
                ...prev,
                ...newData
            }));
        } catch (error) {
            console.error("[SiteContext] Error fetching site configuration:", error);
        } finally {
            setLoading(false);
        }
    };

    // Salvar referência para reutilizar
    fetchRef.current = fetchSiteData;

    // Fetch inicial — apenas uma vez, sem depender do tema
    useEffect(() => {
        fetchSiteData();

        let debounceTimer;
        const debouncedFetch = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchRef.current?.();
            }, 300);
        };

        // Real-time listeners para atualizar dados automaticamente
        const settingsChannel = supabase.channel('site-settings-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
                console.log('[SiteContext] Settings changed, refreshing...');
                debouncedFetch();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
                console.log('[SiteContext] Services changed, refreshing...');
                debouncedFetch();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
                console.log('[SiteContext] Plans changed, refreshing...');
                debouncedFetch();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => {
                console.log('[SiteContext] Promotions changed, refreshing...');
                debouncedFetch();
            })
            .subscribe();

        return () => {
            clearTimeout(debounceTimer);
            supabase.removeChannel(settingsChannel);
        };
    }, []); // Sem dependência de "theme" — não há razão para re-fetch ao mudar tema

    const updateSiteData = useCallback(async () => {
        setLoading(true);
        await fetchRef.current?.();
    }, []);

    const contextValue = useMemo(() => ({
        siteData, updateSiteData, loading, theme, toggleTheme
    }), [siteData, updateSiteData, loading, theme, toggleTheme]);

    return (
        <SiteContext.Provider value={contextValue}>
            {children}
        </SiteContext.Provider>
    );
};
