import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    TrendingUp, Users, Calendar, DollarSign, 
    ChevronUp, ChevronDown, Activity, Star,
    Percent, ShoppingBag, Clock
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const StatCard = ({ icon: Icon, label, value, subValue, trend, color }) => (
    <div className="admin-stat-card glass-panel fade-in" style={{ borderTop: `4px solid ${color || 'var(--color-primary)'}` }}>
        <div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-icon-wrapper" style={{ background: `${color}22`, padding: '10px', borderRadius: '12px' }}>
                <Icon size={24} style={{ color }} />
            </div>
            {trend && (
                <div className={`stat-trend ${trend > 0 ? 'up' : 'down'}`} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: trend > 0 ? '#4ade80' : '#ef4444' }}>
                    {trend > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="stat-card-body" style={{ marginTop: '15px' }}>
            <p className="stat-label" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{label}</p>
            <h3 className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{value}</h3>
            {subValue && <p className="stat-subvalue" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{subValue}</p>}
        </div>
    </div>
);

const DashboardTab = React.memo(({ cachedData, refreshAll }) => {
    const [loading, setLoading] = useState(!cachedData?.appointments?.length);
    const [stats, setStats] = useState({
        revenue: 0,
        appointments: 0,
        customers: 0,
        ticket: 0,
        retention: 0,
        activeSubs: 0
    });
    const [revenueData, setRevenueData] = useState([]);
    const [servicesData, setServicesData] = useState([]);
    const [barbersData, setBarbersData] = useState([]);

    const processData = useCallback(async (appointments = [], finances = [], subsCount = 0) => {
        try {
            const dailyRevenue = {};
            const serviceCounts = {};
            const barberStats = {};
            let totalRev = 0;
            const customerIds = new Set();

            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();
            last7Days.forEach(date => dailyRevenue[date] = 0);

            finances.forEach(f => {
                const amt = Number(f.amount) || 0;
                totalRev += amt;
                if (dailyRevenue[f.date] !== undefined) {
                    dailyRevenue[f.date] += amt;
                }
            });

            appointments.forEach(a => {
                const sName = a.service_name || a.service?.name || 'Outros';
                serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;

                const bName = a.barber_name || a.artist?.name || 'N/A';
                if (!barberStats[bName]) barberStats[bName] = { name: bName, atendimentos: 0, faturamento: 0 };
                barberStats[bName].atendimentos += 1;
                barberStats[bName].faturamento += Number(a.price || 0);

                if (a.customer_id) customerIds.add(a.customer_id);
            });

            setRevenueData(last7Days.map(date => ({
                name: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
                valor: dailyRevenue[date]
            })));

            setServicesData(Object.entries(serviceCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
            );

            setBarbersData(Object.values(barberStats).sort((a, b) => b.atendimentos - a.atendimentos));

            setStats({
                revenue: totalRev,
                appointments: appointments.length,
                customers: customerIds.size,
                ticket: appointments.length > 0 ? totalRev / appointments.length : 0,
                retention: customerIds.size ? Math.round((appointments.length / customerIds.size) * 10) / 10 : 0,
                activeSubs: Number(subsCount) || 0
            });
        } catch (e) { console.error("[Dashboard] Error processing data:", e); }
    }, []);

    useEffect(() => {
        // Se as listas existem (mesmo vazias), processamos e liberamos o loading
        if (cachedData?.appointments && cachedData?.finances) {
            processData(cachedData.appointments, cachedData.finances, cachedData.activeSubs || 0);
            setLoading(false);
        }
        
        // Fail-safe para não travar a tela se os dados demorarem ou vierem nulos
        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);
        
        return () => clearTimeout(timer);
    }, [cachedData, processData]);

    if (loading && !stats.revenue) return <div className="admin-loading">Gerando insights estratégicos...</div>;

    return (
        <div className="dashboard-v2 fade-in">
            <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard 
                    icon={DollarSign} 
                    label="Faturamento (30d)" 
                    value={`R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    subValue="Total processado no período"
                    trend={12}
                    color="#4ade80"
                />
                <StatCard 
                    icon={Clock} 
                    label="Ticket Médio" 
                    value={`R$ ${stats.ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    subValue="Valor médio por cliente"
                    trend={5}
                    color="#38bdf8"
                />
                <StatCard 
                    icon={Users} 
                    label="Recorrência" 
                    value={`${stats.retention}x`} 
                    subValue="Média de visitas por cliente"
                    trend={8}
                    color="#a78bfa"
                />
                <StatCard 
                    icon={Star} 
                    label="Mensalistas Ativos" 
                    value={stats.activeSubs} 
                    subValue="Receita recorrente garantida"
                    trend={15}
                    color="#facc15"
                />
            </div>

            <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="glass-panel chart-container" style={{ padding: '24px', borderRadius: '20px' }}>
                    <div className="chart-header" style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Evolução de Receita (7d)</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Desempenho financeiro diário</p>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                                <Tooltip 
                                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#38bdf8' }}
                                />
                                <Area type="monotone" dataKey="valor" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-panel chart-container" style={{ padding: '24px', borderRadius: '20px' }}>
                    <div className="chart-header" style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mix de Serviços</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Serviços mais procurados</p>
                    </div>
                    <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={servicesData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {servicesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                                />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Performance por Barbeiro</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Volume de atendimentos vs Faturamento estimado</p>
                </div>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <BarChart data={barbersData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                            />
                            <Legend />
                            <Bar dataKey="atendimentos" name="Atendimentos" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});

export default DashboardTab;
