import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { 
    DollarSign, ArrowUpCircle, ArrowDownCircle, Filter, 
    Download, Plus, Trash2, Calendar, User, 
    Calculator, Receipt, RefreshCw, ChevronRight,
    TrendingUp, Package, Users, BarChart3, AlertCircle, ChevronDown, Star
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { myConfirm, myAlert } from '../../lib/utils';

// Standardized helpers are now imported from ../../lib/utils


// ── Mini Progress Bar ──
const ProgressBar = ({ value, max, color = 'var(--color-primary)' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '6px', overflow: 'hidden', flex: 1 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.8s ease-out' }} />
        </div>
    );
};


const FinancesTab = ({ cachedData, refreshAll }) => {
    const [finances, setFinances] = useState(cachedData?.finances || []);
    const [artists, setArtists] = useState(cachedData?.artists || []);
    const [appointments, setAppointments] = useState(cachedData?.appointments || []);
    const [stockConsumption, setStockConsumption] = useState([]);
    const [loading, setLoading] = useState(!cachedData?.finances);
    const [activeView, setActiveView] = useState('overview'); // 'overview' | 'transactions' | 'profitability'
    const [expandedArtist, setExpandedArtist] = useState(null);
    const [filterDate, setFilterDate] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    // Commission Calculator State
    const [selectedArtist, setSelectedArtist] = useState('');
    const [comissionPeriod, setComissionPeriod] = useState(new Date().toISOString().substring(0, 7));
    
    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0], category: 'Serviços' });

    const fetchData = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];

        // Se for o período padrão e tivermos dados no cache, usamos eles e evitamos fetch redundante
        const isDefaultPeriod = filterDate.start === defaultStart && filterDate.end === today;
        
        if (isDefaultPeriod && cachedData?.finances?.length > 0) {
            console.log("[Finances] Usando cache global (30 dias)");
            setFinances(cachedData.finances);
            setArtists(cachedData.artists);
            setAppointments(cachedData.appointments.filter(a => a.status === 'completed' || a.status === 'finished'));
            setLoading(false);
        } else {
            // Se mudou o filtro de data ou não tem cache, buscamos do banco
            setLoading(true);
            try {
                const [finRes, artRes, appRes] = await Promise.all([
                    supabase.from('finances').select('*').gte('date', filterDate.start).lte('date', filterDate.end).order('date', { ascending: false }),
                    supabase.from('artists').select('*').order('name'),
                    supabase.from('appointments').select('*, artists(name, commission_percentage)').in('status', ['completed', 'finished']).gte('date', filterDate.start).lte('date', filterDate.end)
                ]);
                
                if (finRes.data) setFinances(finRes.data);
                if (artRes.data) setArtists(artRes.data);
                if (appRes.data) setAppointments(appRes.data);
            } catch (error) {
                console.error("Finance fetch error:", error);
            } finally {
                setLoading(false);
            }
        }

        // Always fetch stock consumption (not in main cache)
        try {
            const { data: usageLogs } = await supabase
                .from('barber_usage_logs')
                .select('*, artists(name), products(name, cost)')
                .gte('created_at', filterDate.start + 'T00:00:00')
                .lte('created_at', filterDate.end + 'T23:59:59');
            setStockConsumption(usageLogs || []);
        } catch (err) {
            console.error("Stock consumption fetch error:", err);
            setStockConsumption([]);
        }
    }, [filterDate, cachedData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Totals ──
    const totals = useMemo(() => {
        const income = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
        const expense = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
        return { income, expense, balance: income - expense };
    }, [finances]);

    // ── Profitability per Artist ──
    const profitabilityData = useMemo(() => {
        const artistMap = {};

        artists.forEach(a => {
            artistMap[a.id] = {
                id: a.id,
                name: a.name,
                photo: a.photo_url,
                commission_pct: a.commission_percentage || 0,
                revenue: 0,
                commission_value: 0,
                material_cost: 0,
                services_count: 0,
                phone: a.phone || a.whatsapp || ''
            };
        });

        // Sum revenue from completed appointments
        if (Array.isArray(appointments)) {
            appointments.forEach(app => {
                const barberId = app.artist_id;
                if (barberId && artistMap[barberId]) {
                    artistMap[barberId].revenue += Number(app.price || 0);
                    artistMap[barberId].services_count += 1;
                }
            });
        }

        // Calculate commission
        Object.values(artistMap).forEach(a => {
            a.commission_value = (a.revenue * a.commission_pct) / 100;
        });

        // Sum material cost from barber_usage_logs
        if (Array.isArray(stockConsumption)) {
            stockConsumption.forEach(log => {
                const barberId = log.artist_id;
                if (barberId && artistMap[barberId]) {
                    const cost = Number(log.cost_at_time || (log.products && !Array.isArray(log.products) ? log.products.cost : 0) || 0);
                    const qty = Number(log.quantity_used || 0);
                    artistMap[barberId].material_cost += cost * qty;
                }
            });
        }

        // Calculate net profit
        const result = Object.values(artistMap)
            .map(a => ({
                ...a,
                net_profit: a.revenue - a.commission_value - a.material_cost
            }))
            .filter(a => a.revenue > 0 || a.material_cost > 0)
            .sort((a, b) => b.revenue - a.revenue);
        
        return result;
    }, [artists, appointments, stockConsumption]);

    // ── Top Services Analysis ──
    const topServices = useMemo(() => {
        if (!Array.isArray(appointments)) return [];
        const map = {};
        appointments.forEach(app => {
            // Se o join falhou ou o dado está incompleto, usamos fallback seguro
            const serviceName = app.service_name || (app.services && !Array.isArray(app.services) ? app.services.name : null);
            const name = serviceName || 'Serviço Geral / Outros';
            if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
            map[name].revenue += Number(app.price || 0);
            map[name].count += 1;
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [appointments]);

    const revenueByArtist = useMemo(() => {
        const map = {};
        if (!Array.isArray(appointments)) return [];
        appointments.forEach(a => {
            if (a.status !== 'completed' && a.status !== 'confirmed') return;
            const artistId = a.artist_id;
            const artistName = artists.find(p => p.id === artistId)?.name || 'Desconhecido';
            if (!map[artistId]) map[artistId] = { id: artistId, name: artistName, total: 0, count: 0 };
            map[artistId].total += Number(a.price || 0);
            map[artistId].count += 1;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [appointments, artists]);

    // ── Stock Consumption per Artist ──
    const consumptionByArtist = useMemo(() => {
        const map = {};
        stockConsumption.forEach(log => {
            const name = log.artists?.name || 'Desconhecido';
            const product = log.products?.name || 'Produto';
            const cost = Number(log.cost_at_time || log.products?.cost || 0) * Number(log.quantity_used || 0);
            if (!map[name]) map[name] = { name, total_cost: 0, products: {} };
            map[name].total_cost += cost;
            map[name].products[product] = (map[name].products[product] || 0) + Number(log.quantity_used || 0);
        });
        return Object.values(map).sort((a, b) => b.total_cost - a.total_cost);
    }, [stockConsumption]);

    // ── Commission Calculator ──
    const comissionResult = useMemo(() => {
        if (!selectedArtist) return null;
        const artist = artists.find(a => a.id === selectedArtist);
        const artistApps = appointments.filter(a => 
            a.artist_id === selectedArtist && 
            a.date?.startsWith(comissionPeriod)
        );
        const totalServices = artistApps.reduce((sum, a) => sum + Number(a.price || 0), 0);
        const perc = artist?.commission_percentage || 0;
        const value = (totalServices * perc) / 100;

        // Material cost for this artist
        const materialCost = stockConsumption
            .filter(log => log.artist_id === selectedArtist)
            .reduce((sum, log) => sum + (Number(log.cost_at_time || log.products?.cost || 0) * Number(log.quantity_used || 0)), 0);
        
        return { 
            totalServices, 
            count: artistApps.length, 
            value, 
            percentage: perc,
            materialCost,
            netProfit: totalServices - value - materialCost
        };
    }, [selectedArtist, comissionPeriod, artists, appointments, stockConsumption]);

    const handleSave = async () => {
        if (!form.description || !form.amount) return alert('Campos obrigatórios: Descrição e Valor');
        const { error } = await supabase.from('finances').insert([form]);
        if (error) alert(error.message);
        else {
            setShowAddModal(false);
            fetchData();
        }
    };

    const handleDelete = async (id) => {
        if (!(await myConfirm('Deseja excluir este registro financeiro?'))) return;
        await supabase.from('finances').delete().eq('id', id);
        fetchData();
    };

    const handleLaunchExpense = async () => {
        if (!comissionResult || !selectedArtist) return;
        const artist = artists.find(a => a.id === selectedArtist);
        if (!(await myConfirm(`Lançar comissão de R$ ${comissionResult.value.toFixed(2)} para ${artist?.name} como saída?`))) return;
        
        const { error } = await supabase.from('finances').insert([{
            description: `Comissão - ${artist?.name} (${comissionPeriod})`,
            amount: comissionResult.value,
            type: 'expense',
            date: new Date().toISOString().split('T')[0],
            category: 'Comissões'
        }]);
        
        if (error) {
            Swal.fire('Erro', error.message, 'error');
        } else {
            Swal.fire({ title: 'Lançado!', text: `Comissão de R$ ${comissionResult.value.toFixed(2)} registrada.`, icon: 'success', timer: 2000, showConfirmButton: false });
            fetchData();
        }
    };

    const exportToExcel = () => {
        const data = finances.map(f => ({
            Data: f.date,
            Descrição: f.description,
            Tipo: f.type === 'income' ? 'Entrada' : 'Saída',
            Categoria: f.category,
            Valor: `R$ ${Number(f.amount).toFixed(2)}`
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
        XLSX.writeFile(wb, `Financeiro_StudioFlow_${filterDate.start}_a_${filterDate.end}.xlsx`);
    };

    const maxRevenue = Math.max(...profitabilityData.map(a => a.revenue), 1);

    return (
        <div className="finances-v2 fade-in">
            {/* ── View Toggle ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                    { id: 'overview', icon: <BarChart3 size={16} />, label: 'Visão Geral' },
                    { id: 'transactions', icon: <Receipt size={16} />, label: 'Transações' },
                    { id: 'profitability', icon: <TrendingUp size={16} />, label: 'Lucro por Profissional' },
                ].map(v => (
                    <button
                        key={v.id}
                        onClick={() => setActiveView(v.id)}
                        className={`admin-tab-btn ${activeView === v.id ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', border: '1px solid', borderColor: activeView === v.id ? 'var(--color-primary)' : 'var(--color-border)', background: activeView === v.id ? 'rgba(255,122,0,0.1)' : 'rgba(255,255,255,0.03)', color: activeView === v.id ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: activeView === v.id ? 700 : 500, fontSize: '0.88rem', transition: 'all 0.2s' }}
                    >
                        {v.icon} {v.label}
                    </button>
                ))}
            </div>

            {/* ═══ TOP STATS CARDS (always visible) ═══ */}
            <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="glass-panel stat-card-finance" style={{ padding: '22px', borderRadius: '18px', borderLeft: '5px solid #4ade80' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>Total Entradas</p>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <ArrowUpCircle size={28} color="#4ade80" className="hide-xs" />
                    </div>
                </div>
                <div className="glass-panel stat-card-finance" style={{ padding: '22px', borderRadius: '18px', borderLeft: '5px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>Total Saídas</p>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <ArrowDownCircle size={28} color="#ef4444" className="hide-xs" />
                    </div>
                </div>
                <div className="glass-panel stat-card-finance" style={{ padding: '22px', borderRadius: '18px', borderLeft: `5px solid ${totals.balance >= 0 ? 'var(--color-primary)' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>Saldo no Período</p>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: totals.balance >= 0 ? 'var(--color-primary)' : '#ef4444', margin: 0 }}>R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <DollarSign size={28} color="var(--color-primary)" className="hide-xs" />
                    </div>
                </div>

                {/* Progress toward a goal (Example: R$ 10k/month) */}
                <div className="glass-panel stat-card-finance" style={{ padding: '22px', borderRadius: '18px', borderLeft: '5px solid #a78bfa', background: 'linear-gradient(135deg, rgba(167,139,250,0.05) 0%, transparent 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: '2px' }}>Meta Mensal Estimada</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>{Math.round((totals.income / 15000) * 100)}%</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>de R$ 15.000</span>
                            </div>
                        </div>
                        <TrendingUp size={24} color="#a78bfa" className="hide-xs" />
                    </div>
                    <ProgressBar value={totals.income} max={15000} color="#a78bfa" />
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                VIEW: OVERVIEW (Commission Calculator + Stock Consumption)
               ══════════════════════════════════════════════════ */}
            {activeView === 'overview' && (
                <div className="finances-main-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
                    
                    {/* Commission Calculator */}
                    <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Calculator size={20} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Calculadora de Comissões</h3>
                        </div>

                        <div className="admin-form" style={{ padding: 0 }}>
                            <div className="form-group">
                                <label>Selecionar Profissional</label>
                                <select className="app-form-control" value={selectedArtist} onChange={e => setSelectedArtist(e.target.value)}>
                                    <option value="">Escolha um barbeiro...</option>
                                    {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mês de Referência</label>
                                <input type="month" className="app-form-control" value={comissionPeriod} onChange={e => setComissionPeriod(e.target.value)} />
                            </div>
                        </div>

                        {comissionResult && (
                            <div className="fade-in" style={{ marginTop: '16px', padding: '20px', background: 'rgba(255,122,0,0.06)', borderRadius: '16px', border: '1px solid rgba(255,122,0,0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Atendimentos</span>
                                    <span style={{ fontWeight: 700 }}>{comissionResult.count}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Faturamento Bruto</span>
                                    <span style={{ fontWeight: 700, color: '#4ade80' }}>R$ {comissionResult.totalServices.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Comissão ({comissionResult.percentage}%)</span>
                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>- R$ {comissionResult.value.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={14} /> Material Consumido</span>
                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>- R$ {comissionResult.materialCost.toFixed(2)}</span>
                                </div>
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>Lucro Líquido</span>
                                    <span style={{ fontWeight: 800, fontSize: '1.3rem', color: comissionResult.netProfit >= 0 ? 'var(--color-primary)' : '#ef4444' }}>R$ {comissionResult.netProfit.toFixed(2)}</span>
                                </div>
                                
                                <button className="admin-btn-primary neon-glow" style={{ width: '100%', marginTop: '18px', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleLaunchExpense}>
                                    <Receipt size={16} /> Lançar Comissão como Saída
                                </button>
                            </div>
                        )}
                        
                        {!selectedArtist && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                <User size={40} strokeWidth={1} style={{ marginBottom: '10px', opacity: 0.4 }} />
                                <p style={{ fontSize: '0.88rem' }}>Selecione um profissional para<br />calcular o fechamento mensal.</p>
                            </div>
                        )}
                    </div>

                    {/* Professional Performance */}
                    <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <TrendingUp size={20} color="#4ade80" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Faturamento por Profissional</h3>
                        </div>

                        {revenueByArtist.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                                <User size={40} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                <p style={{ fontSize: '0.88rem' }}>Sem dados de faturamento para este período.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {revenueByArtist.map((artist, idx) => (
                                    <div key={idx} style={{ 
                                        padding: '16px', 
                                        background: 'rgba(255,122,0,0.03)', 
                                        borderRadius: '16px', 
                                        border: '1px solid rgba(255,122,0,0.1)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{artist.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{artist.count} atendimentos concluídos</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4ade80' }}>R$ {artist.total.toFixed(2)}</div>
                                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Faturamento</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stock Consumption by Artist */}
                    <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Package size={20} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Consumo de Estoque por Profissional</h3>
                        </div>

                        {consumptionByArtist.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                                <Package size={40} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                <p style={{ fontSize: '0.88rem' }}>Nenhum consumo registrado no período.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {consumptionByArtist.map((item, idx) => (
                                    <div key={idx} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Users size={14} /> {item.name}
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#ef4444' }}>R$ {item.total_cost.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {Object.entries(item.products).slice(0, 5).map(([product, qty]) => (
                                                <span key={product} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,122,0,0.1)', color: 'var(--color-primary)' }}>
                                                    {product}: {typeof qty === 'number' && qty % 1 ? qty.toFixed(1) : qty}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <hr style={{ margin: '24px 0', opacity: 0.1 }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Star size={20} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Serviços Mais Rentáveis</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topServices.map((s, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>{i+1}</div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.name}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80' }}>R$ {s.revenue.toFixed(2)}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{s.count} vezes</div>
                                    </div>
                                </div>
                            ))}
                            {topServices.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sem dados suficientes.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                VIEW: TRANSACTIONS
               ══════════════════════════════════════════════════ */}
            {activeView === 'transactions' && (
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 className="admin-section-title" style={{ margin: 0, fontSize: '1.2rem' }}>Transações</h2>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button className="admin-btn-secondary" onClick={exportToExcel}><Download size={16} /> Exportar</button>
                            <button className="admin-btn-primary neon-glow" onClick={() => setShowAddModal(true)}><Plus size={16} /> Novo Registro</button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="search-filter-bar glass-panel" style={{ padding: '14px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Calendar size={18} className="text-primary" />
                            <input type="date" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} className="app-form-control" style={{ width: 'auto' }} />
                            <span style={{ color: 'var(--color-text-muted)' }}>até</span>
                            <input type="date" value={filterDate.end} onChange={e => setFilterDate({...filterDate, end: e.target.value})} className="app-form-control" style={{ width: 'auto' }} />
                        </div>
                        <button className="admin-btn-secondary" onClick={fetchData}><RefreshCw size={16} /></button>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Categoria</th>
                                    <th>Valor</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {finances.map(f => (
                                    <tr key={f.id} className="fade-in">
                                        <td data-label="Data">{new Date(f.date).toLocaleDateString('pt-BR')}</td>
                                        <td data-label="Descrição">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {f.type === 'income' ? <ArrowUpCircle size={14} color="#4ade80" /> : <ArrowDownCircle size={14} color="#ef4444" />}
                                                {f.description}
                                            </div>
                                        </td>
                                        <td data-label="Categoria"><span className="badge-category">{f.category || 'Geral'}</span></td>
                                        <td data-label="Valor" style={{ fontWeight: 700, color: f.type === 'income' ? '#4ade80' : '#ef4444' }}>
                                            {f.type === 'income' ? '+' : '-'} R$ {Number(f.amount).toFixed(2)}
                                        </td>
                                        <td data-label="Ações">
                                            <button className="action-btn delete" onClick={() => handleDelete(f.id)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {finances.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="admin-empty">Nenhum registro encontrado para este período.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                VIEW: PROFITABILITY DASHBOARD
               ══════════════════════════════════════════════════ */}
            {activeView === 'profitability' && (
                <div className="fade-in">
                    <div className="admin-section-header" style={{ marginBottom: '20px' }}>
                        <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp className="text-primary" size={22} /> Dashboard de Lucro Real por Profissional
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={16} className="text-primary" />
                                <input type="date" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} className="app-form-control" style={{ width: 'auto', padding: '8px 12px' }} />
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>até</span>
                                <input type="date" value={filterDate.end} onChange={e => setFilterDate({...filterDate, end: e.target.value})} className="app-form-control" style={{ width: 'auto', padding: '8px 12px' }} />
                            </div>
                        </div>
                    </div>

                    {profitabilityData.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', borderRadius: '20px' }}>
                            <AlertCircle size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.4, marginBottom: '12px' }} />
                            <p style={{ color: 'var(--color-text-muted)' }}>Nenhum dado de faturamento no período selecionado.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {profitabilityData.map((artist, idx) => (
                                <div key={artist.id} className="glass-panel" style={{ padding: '24px', borderRadius: '18px', borderLeft: `5px solid ${artist.net_profit >= 0 ? '#4ade80' : '#ef4444'}`, transition: 'transform 0.2s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-primary)', flexShrink: 0 }}>
                                                {artist.photo ? <img src={artist.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={20} />}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{artist.name}</h4>
                                                    {artist.phone && (
                                                        <a 
                                                            href={`https://wa.me/55${artist.phone.replace(/\D/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="whatsapp-chip-btn"
                                                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                                            title="Enviar WhatsApp"
                                                        >
                                                            WhatsApp
                                                        </a>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{artist.services_count} atendimento{artist.services_count !== 1 ? 's' : ''} · Comissão: {artist.commission_pct}%</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>Lucro Líquido</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: artist.net_profit >= 0 ? '#4ade80' : '#ef4444' }}>
                                                R$ {artist.net_profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setExpandedArtist(expandedArtist === artist.id ? null : artist.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '5px' }}
                                        >
                                            {expandedArtist === artist.id ? 'Ocultar Detalhes' : 'Ver Materiais'}
                                            <ChevronDown size={16} style={{ transform: expandedArtist === artist.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                                        </button>
                                    </div>
                                    
                                    {/* Revenue bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', minWidth: '100px' }}>Faturamento</span>
                                        <ProgressBar value={artist.revenue} max={maxRevenue} color="#4ade80" />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80', minWidth: '80px', textAlign: 'right' }}>R$ {artist.revenue.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', minWidth: '100px' }}>Comissão</span>
                                        <ProgressBar value={artist.commission_value} max={maxRevenue} color="#f59e0b" />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', minWidth: '80px', textAlign: 'right' }}>R$ {artist.commission_value.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', minWidth: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={12} /> Material</span>
                                        <ProgressBar value={artist.material_cost} max={maxRevenue} color="#ef4444" />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', minWidth: '80px', textAlign: 'right' }}>R$ {artist.material_cost.toFixed(2)}</span>
                                    </div>

                                    {/* Detalhamento de Materiais (Expandível) */}
                                    {expandedArtist === artist.id && (
                                        <div className="fade-in" style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h5 style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhamento de Consumo</h5>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {stockConsumption.filter(log => log.artist_id === artist.id).length === 0 ? (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Nenhum consumo registrado.</span>
                                                ) : (
                                                    stockConsumption.filter(log => log.artist_id === artist.id).map((log, lIdx) => (
                                                        <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                                                                <span>{log.products?.name || 'Produto'}</span>
                                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>(x{log.quantity_used})</span>
                                                            </div>
                                                            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>R$ {(Number(log.cost_at_time || log.products?.cost || 0) * Number(log.quantity_used)).toFixed(2)}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal de Adicionar Registro ── */}
            {showAddModal && createPortal(
                <div className="admin-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="admin-modal glass-panel" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
                            <h3 style={{ margin: 0 }}>Novo Registro Financeiro</h3>
                        </div>
                        <div className="admin-modal-body" style={{ padding: '20px' }}>
                            <div className="admin-form" style={{ padding: 0 }}>
                                <div className="form-group">
                                    <label>Descrição *</label>
                                    <input type="text" className="app-form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Pagamento Aluguel" />
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Valor (R$) *</label>
                                        <input type="number" className="app-form-control" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Tipo</label>
                                        <select className="app-form-control" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                            <option value="income">Entrada (Receita)</option>
                                            <option value="expense">Saída (Despesa)</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Data</label>
                                        <input type="date" className="app-form-control" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Categoria</label>
                                        <select className="app-form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                            <option value="Serviços">Serviços</option>
                                            <option value="Produtos">Produtos</option>
                                            <option value="Aluguel/Fixo">Aluguel/Fixo</option>
                                            <option value="Comissões">Comissões</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={handleSave}>Salvar Lançamento</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};

export default FinancesTab;
