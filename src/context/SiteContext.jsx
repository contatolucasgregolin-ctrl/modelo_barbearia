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

    const fetchSiteData = async (targetTable = null) => {
        try {
            console.log(`[SiteContext] Fetching ${targetTable || 'all'} data...`);
            
            const safeFetch = async (query) => {
                const { data, error } = await query;
                if (error) throw error;
                return { data: data || [] };
            };

            const queries = {
                settings: supabase.from('settings').select('*'),
                services: supabase.from('services').select('*').order('name'),
                artists: supabase.from('artists').select('*').eq('active', true).order('name'),
                gallery: supabase.from('gallery').select('*, gallery_categories(name)').order('featured', { ascending: false }).order('created_at', { ascending: false }),
                galleryCategories: supabase.from('gallery_categories').select('*').order('name'),
                plans: supabase.from('plans').select('*').order('price'),
                promotions: supabase.from('promotions').select('*').order('created_at', { ascending: false })
            };

            let results = {};
            if (targetTable && queries[targetTable]) {
                const res = await safeFetch(queries[targetTable]);
                results[targetTable] = res.data;
            } else {
                const keys = Object.keys(queries);
                const fetched = await Promise.all(Object.values(queries).map(q => safeFetch(q)));
                keys.forEach((key, i) => results[key] = fetched[i].data);
            }

            setSiteData(prev => {
                const newData = { ...prev };
                
                if (results.settings) {
                    const contact = results.settings.find(s => s.key_name === 'contact')?.value || {};
                    const branding = results.settings.find(s => s.key_name === 'branding')?.value || {};
                    const ops = results.settings.find(s => s.key_name === 'operating_hours')?.value || {};
                    
                    newData.contact = {
                        phone: contact.phone || '(11)93940-7229',
                        whatsapp: contact.whatsapp || '5511939407229',
                        instagram: contact.instagram || '',
                        address: contact.address || ''
                    };
                    newData.logo = branding.logoUrl || '';
                    newData.operatingHours = {
                        weekdays: { label: ops.weekdays?.label || 'Segunda a Sábado', hours: ops.weekdays?.open ? `${ops.weekdays.open} - ${ops.weekdays.close}` : '14:00 - 22:00' },
                        specialDays: { label: ops.saturdays?.label || 'Domingos', hours: ops.saturdays?.open ? `${ops.saturdays.open} - ${ops.saturdays.close}` : 'Fechado' },
                        weekend: { label: ops.sundays?.label || 'Feriados', hours: ops.sundays?.open ? `${ops.sundays.open} - ${ops.sundays.close}` : 'Fechado' }
                    };
                }

                if (results.services) {
                    newData.services = results.services.map(s => ({
                        id: s.id,
                        name: s.name,
                        desc: s.description,
                        price: parseFloat(s.price) || 0,
                        duration: `${s.duration_mins || 0}min`,
                        isFeatured: s.is_featured
                    }));
                }

                if (results.artists) {
                    newData.barbers = results.artists.map(a => ({
                        id: a.id,
                        name: a.name,
                        specialty: a.specialty,
                        photo: a.photo_url || 'https://via.placeholder.com/150',
                        instagram: a.instagram
                    }));
                }

                if (results.gallery) newData.gallery = results.gallery;
                if (results.galleryCategories) newData.galleryCategories = results.galleryCategories;
                if (results.plans) newData.plans = results.plans;
                if (results.promotions) newData.promotions = results.promotions;

                return newData;
            });
        } catch (error) {
            console.error("[SiteContext] Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Salvar referência para reutilizar
    fetchRef.current = fetchSiteData;

    // Fetch inicial — apenas uma vez, sem depender do tema
    useEffect(() => {
        fetchSiteData();

        const debounceTimers = {};
        const debouncedFetch = (table) => {
            if (debounceTimers[table]) clearTimeout(debounceTimers[table]);
            debounceTimers[table] = setTimeout(() => {
                fetchRef.current?.(table);
                delete debounceTimers[table];
            }, 500);
        };

        const settingsChannel = supabase.channel('site-settings-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => debouncedFetch('settings'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => debouncedFetch('services'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => debouncedFetch('plans'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => debouncedFetch('promotions'))
            .subscribe();

        return () => {
            Object.values(debounceTimers).forEach(t => clearTimeout(t));
            supabase.removeChannel(settingsChannel);
        };
    }, []);
 // Sem dependência de "theme" — não há razão para re-fetch ao mudar tema

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
