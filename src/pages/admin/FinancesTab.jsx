import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    DollarSign, ArrowUpCircle, ArrowDownCircle, Filter, 
    Download, Plus, Trash2, Calendar, User, 
    Calculator, Receipt, RefreshCw, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const myConfirm = async (msg) => {
  const result = await Swal.fire({
    title: 'Atenção',
    text: msg,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, confirmar',
    cancelButtonText: 'Cancelar',
    background: 'var(--bg-glass)',
    color: 'var(--text-color)'
  });
  return result.isConfirmed;
};



const FinancesTab = ({ cachedData, refreshAll }) => {
    const [finances, setFinances] = useState(cachedData?.finances || []);
    const [artists, setArtists] = useState(cachedData?.artists || []);
    const [appointments, setAppointments] = useState(cachedData?.appointments || []);
    const [loading, setLoading] = useState(!cachedData?.finances);
    const [filterDate, setFilterDate] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    // Comission Calculator State
    const [selectedArtist, setSelectedArtist] = useState('');
    const [comissionPeriod, setComissionPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    
    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0], category: 'Serviços' });

    const fetchData = useCallback(async () => {
        // Só faz fetch se o filtro for diferente dos últimos 30 dias (já em cache)
        const isCurrentMonth = filterDate.start.substring(0, 7) === new Date().toISOString().substring(0, 7);
        if (isCurrentMonth && cachedData?.finances?.length > 0) {
            setFinances(cachedData.finances);
            setArtists(cachedData.artists);
            setAppointments(cachedData.appointments.filter(a => a.status === 'completed'));
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [finRes, artRes, appRes] = await Promise.all([
                supabase.from('finances')
                    .select('*')
                    .gte('date', filterDate.start)
                    .lte('date', filterDate.end)
                    .order('date', { ascending: false }),
                supabase.from('artists').select('*').order('name'),
                supabase.from('appointments')
                    .select('*, artists(name, commission_percentage)')
                    .eq('status', 'completed')
                    .gte('date', filterDate.start)
                    .lte('date', filterDate.end)
            ]);

            setFinances(finRes.data || []);
            setArtists(artRes.data || []);
            setAppointments(appRes.data || []);
        } catch (error) {
            console.error("Finance fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [filterDate, cachedData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Totals calculation
    const totals = useMemo(() => {
        const income = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
        const expense = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
        return { income, expense, balance: income - expense };
    }, [finances]);

    // Comission logic
    const comissionResult = useMemo(() => {
        if (!selectedArtist) return null;
        
        const artist = artists.find(a => a.id === selectedArtist);
        const artistApps = appointments.filter(a => 
            a.barber_id === selectedArtist && 
            a.date.startsWith(comissionPeriod)
        );
        
        const totalServices = artistApps.reduce((sum, a) => sum + Number(a.price || 0), 0);
        const perc = artist?.commission_percentage || 0;
        const value = (totalServices * perc) / 100;
        
        return { totalServices, count: artistApps.length, value, percentage: perc };
    }, [selectedArtist, comissionPeriod, artists, appointments]);

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

    return (
        <div className="finances-v2 fade-in">
            {/* Top Stats Cards */}
            <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="glass-panel stat-card-finance" style={{ padding: '24px', borderRadius: '20px', borderLeft: '6px solid #4ade80' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Total de Entradas</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80' }}>R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <ArrowUpCircle size={32} color="#4ade80" />
                    </div>
                </div>
                <div className="glass-panel stat-card-finance" style={{ padding: '24px', borderRadius: '20px', borderLeft: '6px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Total de Saídas</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <ArrowDownCircle size={32} color="#ef4444" />
                    </div>
                </div>
                <div className="glass-panel stat-card-finance" style={{ padding: '24px', borderRadius: '20px', borderLeft: `6px solid ${totals.balance >= 0 ? 'var(--color-primary)' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '5px' }}>Saldo no Período</p>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: totals.balance >= 0 ? 'var(--color-primary)' : '#ef4444' }}>R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <DollarSign size={32} color="var(--color-primary)" />
                    </div>
                </div>
            </div>

            <div className="finances-main-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                
                {/* Left Column: Transaction List */}
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 className="admin-section-title" style={{ margin: 0, fontSize: '1.2rem' }}>Transações</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="admin-btn-secondary" onClick={exportToExcel}><Download size={16} /> Exportar</button>
                            <button className="admin-btn-primary neon-glow" onClick={() => setShowAddModal(true)}><Plus size={16} /> Novo Registro</button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="search-filter-bar glass-panel" style={{ padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} className="text-primary" />
                            <input type="date" value={filterDate.start} onChange={e => setFilterDate({...filterDate, start: e.target.value})} className="app-form-control" style={{ width: 'auto' }} />
                            <span style={{ color: '#666' }}>até</span>
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
                                        <td>{new Date(f.date).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {f.type === 'income' ? <ArrowUpCircle size={14} color="#4ade80" /> : <ArrowDownCircle size={14} color="#ef4444" />}
                                                {f.description}
                                            </div>
                                        </td>
                                        <td><span className="badge-category">{f.category || 'Geral'}</span></td>
                                        <td style={{ fontWeight: 700, color: f.type === 'income' ? '#4ade80' : '#ef4444' }}>
                                            {f.type === 'income' ? '+' : '-'} R$ {Number(f.amount).toFixed(2)}
                                        </td>
                                        <td>
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

                {/* Right Column: Commission Calculator */}
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Calculator size={20} className="text-primary" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Calculadora de Comissões</h3>
                    </div>

                    <div className="admin-form">
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
                        <div className="comission-result-panel fade-in" style={{ marginTop: '20px', padding: '20px', background: 'rgba(var(--color-primary-rgb), 0.1)', borderRadius: '15px', border: '1px border var(--color-primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Atendimentos Concluídos</span>
                                <span style={{ fontWeight: 700 }}>{comissionResult.count}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Faturamento Total</span>
                                <span style={{ fontWeight: 700 }}>R$ {comissionResult.totalServices.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Porcentagem de Comissão</span>
                                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{comissionResult.percentage}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total a Pagar</span>
                                <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-primary)' }}>R$ {comissionResult.value.toFixed(2)}</span>
                            </div>
                            
                            <button className="admin-btn-primary neon-glow" style={{ width: '100%', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                <Receipt size={16} /> Lançar como Saída
                            </button>
                        </div>
                    )}
                    
                    {!selectedArtist && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', color: '#666', textAlign: 'center' }}>
                            <User size={48} strokeWidth={1} style={{ marginBottom: '10px', opacity: 0.5 }} />
                            <p style={{ fontSize: '0.9rem' }}>Selecione um profissional para<br />calcular o fechamento mensal.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal de Adicionar Registro */}
            {showAddModal && (
                <div className="admin-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="admin-modal glass-panel" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header" style={{ padding: '20px', borderBottom: '1px solid #333' }}>
                            <h3 style={{ margin: 0 }}>Novo Registro Financeiro</h3>
                        </div>
                        <div className="admin-modal-body" style={{ padding: '20px' }}>
                            <div className="admin-form">
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
                                            <option value="Marketing">Marketing</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="admin-modal-footer" style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="admin-btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                            <button className="admin-btn-primary neon-glow" onClick={handleSave}>Salvar Lançamento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancesTab;
