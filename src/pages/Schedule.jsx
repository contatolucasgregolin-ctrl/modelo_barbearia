import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteContext } from '../context/SiteContext';
import { supabase } from '../lib/supabase';
import { Check } from 'lucide-react';
import Button from '../components/Button';
import '../styles/Schedule.css';

const Schedule = () => {
    const { siteData } = useContext(SiteContext);
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedBarber, setSelectedBarber] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState(null);
    const [bookedTimes, setBookedTimes] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [dbServices, setDbServices] = useState([]);
    const [dbArtists, setDbArtists] = useState([]);

    // Client Details State
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientDescription, setClientDescription] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: sData } = await supabase.from('services').select('*').order('name');
            if (sData) setDbServices(sData);

            const { data: aData } = await supabase.from('artists').select('*').eq('active', true).order('name');
            if (aData) {
                setDbArtists(aData);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        // Check for service in URL (e.g., /agendamento?service=1)
        const params = new URLSearchParams(window.location.search);
        const serviceId = params.get('service');
        if (serviceId && dbServices.length > 0) {
            const service = dbServices.find(s => s.id === serviceId);
            if (service) {
                setSelectedService(service);
                setStep(1); // Keep it on step 1 but it's pre-selected
            }
        }
    }, [dbServices]);

    const fetchBookedTimes = useCallback(async () => {
        if (!selectedDate || !selectedBarber) return;
        // Block slots per date AND ARTIST.
        // Includes 'pending' so a just-submitted request immediately reserves the slot.
        const { data, error } = await supabase
            .from('appointments')
            .select('time')
            .eq('date', selectedDate)
            .eq('artist_id', selectedBarber.id)
            .in('status', ['pending', 'confirmed', 'finished']);

        if (!error && data) {
            // Normalize DB time format (HH:mm:ss) to match UI slot labels (HH:mm)
            setBookedTimes(data.map(app => (app.time || '').slice(0, 5)));
        }
    }, [selectedDate, selectedBarber]);

    useEffect(() => {
        if (selectedDate && selectedBarber) {
            fetchBookedTimes();
        } else {
            setBookedTimes([]);
        }
    }, [fetchBookedTimes, selectedDate, selectedBarber]);

    // Clear selected time if barber or date changes to avoid ghost selections
    useEffect(() => {
        setSelectedTime(null);
    }, [selectedBarber, selectedDate]);

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            finishScheduling();
        }
    };

    const finishScheduling = () => {
        // Build WhatsApp URL FIRST — must be synchronous to avoid popup blocker
        const phoneNumber = siteData.contact.whatsapp;
        let message = `*Novo Agendamento Barbearia* ✂️\n`;
        message += `---------------------------\n`;
        message += `*Cliente:* ${clientName}\n`;
        message += `*Contato:* ${clientPhone}\n`;
        message += `---------------------------\n`;
        message += `*Serviço:* ${selectedService.name} (R$ ${selectedService.price})\n`;
        message += `*Profissional:* ${selectedBarber.name}\n`;
        message += `*Data:* ${selectedDate.split('-').reverse().join('/')}\n`;
        message += `*Horário:* ${selectedTime}\n`;
        if (clientDescription) message += `*Descrição da tatuagem:* ${clientDescription}\n`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        // Open WhatsApp immediately (synchronous — not blocked by browser)
        window.open(whatsappUrl, '_blank');

        // Show Success Modal — stays visible until the user explicitly closes it
        setShowSuccessModal(true);

        // Save to Supabase in background (fire-and-forget)
        (async () => {
            try {
                // 1. Upsert Customer by Phone
                let customerId = null;
                const { data: existing } = await supabase.from('customers').select('id').eq('phone', clientPhone).limit(1);

                if (existing && existing.length > 0) {
                    customerId = existing[0].id;
                } else {
                    const { data: newCust } = await supabase.from('customers').insert([{
                        name: clientName,
                        phone: clientPhone
                    }]).select('id').single();
                    if (newCust) customerId = newCust.id;
                }

                // 2. Insert Appointment
                if (customerId) {
                    const { error: appError } = await supabase.from('appointments').insert([{
                        customer_id: customerId,
                        artist_id: selectedBarber.id,
                        service_id: selectedService.id,
                        date: selectedDate,
                        time: selectedTime,
                        description: clientDescription,
                        session_price: selectedService.price,
                        status: 'pending'
                    }]);

                    if (appError) {
                        console.error('Supabase appointment insert failed:', appError);
                    }
                } else {
                    console.error('Failure: customerId is null, cannot insert appointment');
                }
            } catch (err) {
                console.warn('Supabase save failed:', err);
            }
        })();
    };

    const isStepValid = () => {
        if (step === 1) return !!selectedService;
        if (step === 2) return !!selectedBarber;
        if (step === 3) return !!selectedDate && !!selectedTime;
        if (step === 4) return clientName && clientPhone && !isSubmitting;
        return false;
    };

    return (
        <div className="page schedule-page container">
            <h2 className="page-title" style={{ color: 'var(--color-primary)' }}>Agendamento</h2>

            {/* Progress Steps */}
            <div className="steps-indicator">
                <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                <div className="step-line"></div>
                <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                <div className="step-line"></div>
                <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                <div className="step-line"></div>
                <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>4</div>
            </div>

            {step === 1 && (
                <div className="step-content fade-in">
                    <h3>Escolha o Serviço</h3>
                    <div className="selection-list">
                        {dbServices.map(service => {
                            const isCombo = service.is_featured;
                            return (
                                <div
                                    key={service.id}
                                    className={`selection-card glass-panel ${selectedService?.id === service.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedService(service)}
                                    style={isCombo ? {
                                        border: selectedService?.id === service.id
                                            ? '2px solid var(--color-primary)'
                                            : '2px solid var(--color-border)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        position: 'relative',
                                        overflow: 'visible'
                                    } : {}}
                                >
                                    {isCombo && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-11px',
                                            left: '14px',
                                            background: 'var(--color-primary)',
                                            color: 'var(--color-bg)',
                                            fontSize: '0.55rem',
                                            fontWeight: '800',
                                            fontFamily: 'Montserrat',
                                            letterSpacing: '1px',
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            🔥 MAIS PEDIDO
                                        </div>
                                    )}
                                    <div className="info">
                                        <h4 style={isCombo ? { color: 'var(--color-primary)' } : {}}>{service.name}</h4>
                                        <span className="duration">{service.duration}</span>
                                    </div>
                                    <span className="price">R$ {service.price}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="step-content fade-in">
                    <h3>Escolha o Profissional</h3>
                    <div className="selection-grid">
                        {dbArtists.map(barber => (
                            <div
                                key={barber.id}
                                className={`selection-card-grid glass-panel ${selectedBarber?.id === barber.id ? 'selected' : ''}`}
                                onClick={() => setSelectedBarber(barber)}
                            >
                                <div className="barber-photo" style={{ backgroundImage: `url(${barber.photo_url || barber.photo || 'https://via.placeholder.com/150?text=Professional'})` }}></div>
                                <h4>{barber.name}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (() => {
                // Determine the day of week for the selected date
                const getHoursForDate = (dateStr) => {
                    if (!dateStr) return null;
                    // Use UTC to avoid timezone shifts on day calculation
                    const [y, m, d] = dateStr.split('-').map(Number);
                    const day = new Date(y, m - 1, d).getDay(); // 0=Sun, 1=Mon...6=Sat
                    if (day === 0) return { closed: true, label: 'Domingo', hours: null, close: null };
                    if (day === 3 || day === 6) return { closed: false, label: day === 3 ? 'Quarta-feira' : 'Sábado', hours: '08:00 – 18:00', close: 18 };
                    const labels = ['', 'Segunda-feira', 'Terça-feira', '', 'Quinta-feira', 'Sexta-feira'];
                    return { closed: false, label: labels[day], hours: '08:00 – 19:30', close: 19.5 };
                };

                const dayInfo = getHoursForDate(selectedDate);
                const isSundaySelected = dayInfo?.closed;
                const todayStr = new Date().toISOString().split('T')[0];
                const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

                const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

                return (
                    <div className="step-content fade-in">
                        <h3>Escolha a Data e o Horário</h3>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Data</label>
                            <input
                                type="date"
                                className="form-input"
                                value={selectedDate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const [y, m, d] = val.split('-').map(Number);
                                    const day = new Date(y, m - 1, d).getDay();
                                    if (day === 0) {
                                        // Sunday — clear selection and let the warning show
                                        setSelectedDate(val);
                                        setSelectedTime(null);
                                    } else {
                                        setSelectedDate(val);
                                        setSelectedTime(null);
                                    }
                                }}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Sunday closed warning */}
                        {selectedDate && isSundaySelected && (
                            <div style={{
                                background: 'rgba(255,60,60,0.1)',
                                border: '1px solid rgba(255,60,60,0.4)',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                marginBottom: '16px',
                                fontFamily: 'Montserrat',
                                fontSize: '0.85rem',
                                color: '#ff6b6b'
                            }}>
                                🚫 <strong>Domingo</strong> — A barbearia está <strong>fechada</strong> aos domingos. Escolha outro dia.
                            </div>
                        )}

                        {/* Day info badge */}
                        {selectedDate && !isSundaySelected && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '14px',
                                fontFamily: 'Montserrat',
                                fontSize: '0.8rem',
                                color: 'var(--color-text-muted)'
                            }}>
                                <span style={{ color: '#4caf50', fontSize: '0.75rem' }}>●</span>
                                <span><strong style={{ color: 'var(--color-text)' }}>{dayInfo?.label}</strong> · {dayInfo?.hours}</span>
                            </div>
                        )}

                        {/* Time grid */}
                        {!isSundaySelected && (
                            <div className="time-selection-container">
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '15px' }}>
                                    {selectedDate ? 'Horários disponíveis:' : 'Selecione uma data para ver os horários:'}
                                </p>
                                <div className="time-grid" style={{ minHeight: '100px' }}>
                                    {allSlots.map(time => {
                                        const [h, min] = time.split(':').map(Number);
                                        const slotHour = h + min / 60;

                                        const isBooked = bookedTimes.includes(time);
                                        const isAfterClose = dayInfo ? slotHour >= dayInfo.close : false;
                                        const isPast = selectedDate === todayStr && slotHour <= nowHour;
                                        const isDisabled = !selectedDate || isBooked || isPast || isAfterClose;

                                        // Reason label for clarity
                                        const reasonLabel = !selectedDate ? '' : isAfterClose ? 'Fechado' : isBooked ? 'Ocupado' : isPast ? 'Passado' : '';

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                className={`time-btn ${selectedTime === time ? 'selected' : ''}`}
                                                onClick={() => setSelectedTime(time)}
                                                disabled={isDisabled}
                                                title={reasonLabel}
                                                style={{
                                                    opacity: isDisabled ? 0.28 : 1,
                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    border: selectedTime === time ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                    position: 'relative'
                                                }}
                                            >
                                                {time}
                                                {isAfterClose && (
                                                    <span style={{ display: 'block', fontSize: '0.5rem', color: 'rgba(59,130,246,0.7)', marginTop: '2px' }}>fechado</span>
                                                )}
                                                {isBooked && !isAfterClose && (
                                                    <span style={{ display: 'block', fontSize: '0.5rem', color: 'rgba(200,200,200,0.5)', marginTop: '2px' }}>ocupado</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {step === 4 && (
                <div className="step-content fade-in">
                    <h3>Seus Dados</h3>
                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: João da Silva"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>WhatsApp</label>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="Ex: 11 99999-9999"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Descrição da tatuagem/serviço</label>
                        <textarea
                            className="form-input"
                            placeholder="Descreva a ideia da sua tatuagem, local do corpo, e referências..."
                            value={clientDescription}
                            onChange={(e) => setClientDescription(e.target.value)}
                            rows={3}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                    <p className="summary-text">
                        Ao confirmar, você será redirecionado para o WhatsApp para finalizar o agendamento.
                    </p>
                </div>
            )}

            <div className="action-bar">
                {step > 1 && (
                    <Button
                        variant="outline"
                        onClick={() => setStep(step - 1)}
                        className="btn-back"
                    >
                        Voltar
                    </Button>
                )}
                <Button
                    disabled={!isStepValid()}
                    onClick={handleNext}
                    className="btn-next"
                >
                    {step === 4 ? (isSubmitting ? 'Salvando...' : 'Confirmar Agendamento') : 'Próximo'}
                </Button>
            </div>

            {/* Success Modal Overlay */}
            {showSuccessModal && (
                <div className="success-modal-overlay fade-in">
                    <div className="success-modal">
                        <div className="success-icon">
                            <Check size={40} />
                        </div>
                        <h2 className="success-title">Agendamento Iniciado!</h2>
                        <p className="success-message">
                            Você acaba de ser redirecionado para o WhatsApp para finalizar seu agendamento.<br /><br />
                            <strong>Estamos te aguardando!</strong>
                        </p>
                        <button className="success-button" onClick={() => navigate('/')}>
                            Voltar para o Início
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
