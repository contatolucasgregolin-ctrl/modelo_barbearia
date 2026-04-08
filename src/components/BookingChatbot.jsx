import { useState, useEffect, useRef, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { SiteContext } from '../context/SiteContext';
import '../styles/BookingChatbot.css';

// ─── ICONS ──────────────────────────────────────────────────────────────────
const BotIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8" y2="16" strokeLinecap="round" strokeWidth="3" />
        <line x1="12" y1="16" x2="12" y2="16" strokeLinecap="round" strokeWidth="3" />
        <line x1="16" y1="16" x2="16" y2="16" strokeLinecap="round" strokeWidth="3" />
    </svg>
);

const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
);

const SpeakerIcon = ({ muted }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: muted ? 0.5 : 1 }}>
        {muted ? (
            <>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
            </>
        ) : (
            <>
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </>
        )}
    </svg>
);

const MicIcon = ({ listening }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={listening ? "var(--color-primary)" : "none"} stroke="currentColor" strokeWidth="2" className={listening ? "pulse-icon" : ""}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const ScissorsIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
);

// ─── FLOW STEPS ──────────────────────────────────────────────────────────────
const STEPS = {
    GREETING: 'greeting',
    INTENT_SELECTION: 'intent_selection',
    ASK_NAME: 'ask_name',
    ASK_PHONE: 'ask_phone',
    ASK_PHONE_PLAN: 'ask_phone_plan',
    ASK_PHONE_PROMO: 'ask_phone_promo',
    ASK_SERVICE: 'ask_service',
    ASK_BARBER: 'ask_barber',
    ASK_DATE: 'ask_date',
    ASK_TIME: 'ask_time',
    CONFIRM: 'confirm',
    DONE: 'done',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const getDayInfo = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    if (day === 0) return { closed: true, label: 'Domingo' };
    if (day === 6) return { closed: false, label: 'Sábado', close: 18 };
    if (day === 3) return { closed: false, label: 'Quarta-feira', close: 18 };
    const labels = ['', 'Segunda-feira', 'Terça-feira', '', 'Quinta-feira', 'Sexta-feira'];
    return { closed: false, label: labels[day], close: 19.5 };
};

const ALL_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

const getTodayStr = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const validatePhone = (p) => p.replace(/\D/g, '').length >= 10;

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => (
    <div className={`chatbot-message ${msg.from}`}>
        {msg.from === 'bot' && (
            <div className="chatbot-bot-avatar"><BotIcon /></div>
        )}
        <div className={`chatbot-bubble ${msg.from}`}>
            {msg.typing ? (
                <span className="chatbot-typing-dots">
                    <span /><span /><span />
                </span>
            ) : (
                <span dangerouslySetInnerHTML={{ __html: msg.text }} />
            )}
        </div>
    </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const BookingChatbot = () => {
    const { siteData } = useContext(SiteContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [step, setStep] = useState(STEPS.GREETING);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showBadge, setShowBadge] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [voicesLoaded, setVoicesLoaded] = useState(false);

    // Booking data
    const [clientName, setClientName]   = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [services, setServices]       = useState([]);
    const [barbers, setBarbers]         = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedBarber, setSelectedBarber]   = useState(null);
    const [selectedDate, setSelectedDate]       = useState('');
    const [selectedTime, setSelectedTime]       = useState('');
    const [bookedTimes, setBookedTimes]         = useState([]);
    const [isSubmitting, setIsSubmitting]       = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);
    const utteranceRef   = useRef(null); // Fix Chrome GC Voice bug
    const recognitionRef = useRef(null); // Fix Chrome GC STT bug
    
    // Stable refs for STT loop 
    const stepRef = useRef(step);
    const isVoiceModeRef = useRef(isVoiceMode);
    const isOpenRef = useRef(isOpen);
    
    useEffect(() => { stepRef.current = step; }, [step]);
    useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    // ── Fetch services & barbers from Context or DB ─────────────────────────
    useEffect(() => {
        if (siteData?.services?.length > 0) {
            setServices(siteData.services.map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                duration_mins: parseInt(s.duration) || 0
            })));
        }
        if (siteData?.barbers?.length > 0) {
            setBarbers(siteData.barbers.map(b => ({
                id: b.id,
                name: b.name,
                photo_url: b.photo,
                specialty: b.specialty
            })));
        }
    }, [siteData]);

    // Fallback load if context is empty
    useEffect(() => {
        const loadFallback = async () => {
            if (services.length > 0) return;
            const { data: sData } = await supabase.from('services').select('*').order('name');
            if (sData) setServices(sData);
            const { data: aData } = await supabase.from('artists').select('*').eq('active', true).order('name');
            if (aData) setBarbers(aData);
        };
        loadFallback();
    }, [services.length]);

    // ── Voice Initialization ──────────────────────────────────────────────
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) setVoicesLoaded(true);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // ── Fetch booked times when date + barber change ─────────────────────────
    useEffect(() => {
        const fetch = async () => {
            if (!selectedDate || !selectedBarber) return;
            const { data } = await supabase
                .from('appointments').select('time')
                .eq('date', selectedDate).eq('artist_id', selectedBarber.id)
                .in('status', ['pending', 'confirmed', 'finished']);
            if (data) setBookedTimes(data.map(a => (a.time || '').slice(0, 5)));
        };
        fetch();
    }, [selectedDate, selectedBarber]);

    // ── Auto-scroll ─────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // ── Focus input ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen, step]);

    // ── Greeting on open ────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setTimeout(() => botSay(
                `👋 Olá! Sou o assistente virtual da Barbearia.<br/><br/>Posso te ajudar com <strong>Agendamentos</strong>, conferir <strong>Promoções</strong>, ou explicar nossos <strong>Planos de Assinatura</strong>. O que você deseja fazer hoje?`,
                STEPS.INTENT_SELECTION
            ), 400);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ── Audio Engine ──────────────────────────────────────────────────────
    const stripHTML = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let text = doc.body.textContent || "";
        // Remove common emojis and symbols to keep speech objective
        return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    };

    const speakText = (text, delay = 0) => {
        if (!isAudioEnabled || !window.speechSynthesis) return;

        setTimeout(() => {
            window.speechSynthesis.cancel();
            
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }

            const plainText = stripHTML(text);
            const utterance = new SpeechSynthesisUtterance(plainText);
            utteranceRef.current = utterance; // Prevent Garage Collection hook silence
            
            const voices = window.speechSynthesis.getVoices();
            
            const mascNames = ['Google português do Brasil', 'Daniel Natural', 'Guilherme', 'Felipe', 'Ricardo'];
            const ptVoice = voices.find(v => v.lang.includes('pt') && mascNames.some(name => v.name.includes(name))) ||
                            voices.find(v => v.lang.includes('pt-BR')) || 
                            voices.find(v => v.lang.startsWith('pt'));

            if (ptVoice) utterance.voice = ptVoice;
            utterance.lang = 'pt-BR';
            utterance.rate = 1.0; // Professional, fluid pace
            utterance.pitch = 0.9; // Deeper, more authoritative tone

            // Hands-free loop: trigger mic after bot finishes speaking
            utterance.onend = () => {
                if (isVoiceModeRef.current && isOpenRef.current) {
                    console.log("[Chatbot] Bot finished speaking, auto-restarting mic in 500ms...");
                    setTimeout(() => {
                        // Double check if we are still in voice mode and open
                        if (isVoiceModeRef.current && isOpenRef.current && !window.speechSynthesis.speaking) {
                            startListening();
                        }
                    }, 500);
                }
            };

            window.speechSynthesis.speak(utterance);
        }, delay);
    };

    const handleAudioToggle = () => {
        const nextState = !isAudioEnabled;
        setIsAudioEnabled(nextState);
        if (nextState) {
            setIsVoiceMode(true); // Automatically enable voice loop if speaker is on
            speakText("Modo de voz e escuta automática ativados.", 100);
        } else {
            setIsVoiceMode(false);
            window.speechSynthesis.cancel();
            if (recognitionRef.current) recognitionRef.current.stop();
        }
    };

    // ── Speech Recognition (STT) ──────────────────────────────────────────
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        // Ensure we don't have multiple instances
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }

        setIsVoiceMode(true);
        if (!isAudioEnabled) setIsAudioEnabled(true);

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition; // Prevent GC
        
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
        };
        recognition.onerror = (event) => {
            console.error("[STT Error]", event.error);
            setIsListening(false);
            recognitionRef.current = null;
            // If it was a network or no-speech error, we might want to retry later, 
            // but for now let's just reset state.
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            
            // Force clear input field during voice interaction to avoid "typing" glitch
            setInputValue('');
            setIsListening(false);
            
            // Auto-submit tightly coupled to the exact step we were on when speaking
            setTimeout(() => {
                handleTextSubmit(transcript);
            }, 250);
        };

        recognition.start();
    };

    // ── Bot message helper ────────────────────────────────────────────────
    const botSay = (text, nextStep = null) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { from: 'bot', text }]);
            speakText(text); // Trigger audio
            if (nextStep) {
                setStep(nextStep);
                stepRef.current = nextStep; // synchronous update
            }
        }, 900);
    };

    const userSay = (text) => {
        setMessages(prev => [...prev, { from: 'user', text }]);
    };

    // ── Handle text input submission ──────────────────────────────────────
    const handleTextSubmit = (overrideVal = null) => {
        const rawVal = typeof overrideVal === 'string' ? overrideVal : inputValue;
        const val = rawVal.trim();
        if (!val) return;
        
        // Always reset input when submitting, especially when coming from voice (overrideVal)
        setInputValue('');

        const currentStep = stepRef.current; // GUARANTEED LATEST STATE

        if (currentStep === STEPS.INTENT_SELECTION) {
            userSay(val);
            const lower = val.toLowerCase();
            if (lower.includes('agendar') || lower.includes('marcar') || lower.includes('corte') || lower.includes('horário') || lower.includes('agendamento')) {
                botSay(`Ótimo! Vamos marcar o seu horário. Para começarmos sua reserva, como eu posso te chamar?`, STEPS.ASK_NAME);
            } 
            else if (lower.includes('plano') || lower.includes('assinatura') || lower.includes('clube') || lower.includes('mensal')) {
                botSay(`Legal! Nossos planos de assinatura oferecem cortes ilimitados. Qual o seu WhatsApp com o DDD para um especialista te chamar?`, STEPS.ASK_PHONE_PLAN);
            }
            else if (lower.includes('promo') || lower.includes('desconto') || lower.includes('oferta') || lower.includes('cupom')) {
                 botSay(`Temos várias ofertas exclusivas acontecendo! Me diga o seu WhatsApp com o DDD para eu te enviar a lista VIP de benefícios?`, STEPS.ASK_PHONE_PROMO);
            }
            else {
                botSay(`Desculpe, não entendi bem. Você gostaria de fazer um Agendamento, conferir Promoções ou saber dos Planos?`, STEPS.INTENT_SELECTION);
            }
            return;
        }

        if (currentStep === STEPS.ASK_NAME) {
            userSay(val);
            setClientName(val);
            botSay(
                `Muito prazer, <strong>${val}</strong>!<br/>Para continuarmos, você poderia me informar seu <strong>WhatsApp</strong> com o DDD?`,
                STEPS.ASK_PHONE
            );
            return;
        }

        if (currentStep === STEPS.ASK_PHONE) {
            if (!validatePhone(val)) {
                userSay(val);
                botSay(`Hmm, esse número parece estar muito curto. Pode me dizer com o DDD de novo, por favor?`);
                return;
            }
            userSay(val);
            setClientPhone(val);
            botSay(
                `Perfeito! Agora, qual desses <strong>serviços</strong> você gostaria de agendar hoje?`,
                STEPS.ASK_SERVICE
            );
            return;
        }

        if (currentStep === STEPS.ASK_PHONE_PLAN || currentStep === STEPS.ASK_PHONE_PROMO) {
            if (!validatePhone(val)) {
                userSay(val);
                botSay(`Esse número me pareceu incompleto. Me diga seu WhatsApp com o DDD e o número completo, por favor?`);
                return;
            }
            userSay(val);
            setClientPhone(val);
            const topic = currentStep === STEPS.ASK_PHONE_PLAN ? "Planos" : "Promoções";
            botSay(`Fechado! O time já foi avisado. Em breve, enviaremos todas as novidades sobre ${topic} diretor no seu celular!`, STEPS.DONE);
            
            // Redirect to whatsapp
            const phone = (siteData?.contact?.whatsapp || '').replace(/\D/g, '');
            let msg = `Olá, estava usando o Assistente Virtual e gostaria de saber os detalhes comerciais sobre *${topic}*!`;
            if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
            return;
        }
    };

    // ── Handle service selection ──────────────────────────────────────────
    const handleServiceSelect = (service) => {
        userSay(`✂️ ${service.name}`);
        setSelectedService(service);
        botSay(
            `Ótima escolha! E com qual de nossos <strong>profissionais</strong> você prefere ser atendido?`,
            STEPS.ASK_BARBER
        );
    };

    // ── Handle barber selection ───────────────────────────────────────────
    const handleBarberSelect = (barber) => {
        userSay(`💈 ${barber.name}`);
        setSelectedBarber(barber);
        botSay(
            `Certo! Agora pode escolher a <strong>data</strong> que fica melhor para o seu atendimento:`,
            STEPS.ASK_DATE
        );
    };

    // ── Handle date selection ─────────────────────────────────────────────
    const handleDateSelect = (date) => {
        const dayInfo = getDayInfo(date);
        if (dayInfo?.closed) {
            setSelectedDate(date);
            botSay(`Olha, infelizmente não atendemos aos domingos. Você teria outro dia de preferência?`);
            return;
        }
        userSay(`📅 ${formatDate(date)}`);
        setSelectedDate(date);
        botSay(
            `Data anotada! E qual seria o melhor <strong>horário</strong> para você?`,
            STEPS.ASK_TIME
        );
    };

    // ── Handle time selection ─────────────────────────────────────────────
    const handleTimeSelect = (time) => {
        userSay(`⏰ ${time}`);
        setSelectedTime(time);

        const summary = `
            👤 ${clientName}<br/>
            📱 ${clientPhone}<br/>
            ✂️ ${selectedService?.name}<br/>
            💈 ${selectedBarber?.name}<br/>
            📅 ${formatDate(selectedDate)} às ${time}<br/><br/>
            <strong>Tudo certo! Podemos confirmar o seu agendamento agora?</strong>
        `;
        botSay(summary, STEPS.CONFIRM);
    };

    // ── Confirm booking ───────────────────────────────────────────────────
    const handleConfirm = async () => {
        setIsSubmitting(true);
        userSay('✅ Sim, confirmar!');

        try {
            // 1. Upsert customer
            let customerId = null;
            const { data: existing } = await supabase
                .from('customers').select('id')
                .eq('phone', clientPhone).maybeSingle();

            if (existing) {
                customerId = existing.id;
            } else {
                const { data: newCust, error: custErr } = await supabase
                    .from('customers')
                    .insert([{ name: clientName, phone: clientPhone }])
                    .select('id').single();
                if (custErr) throw custErr;
                customerId = newCust.id;
            }

            // 2. Insert appointment
            const { error: appErr } = await supabase.from('appointments').insert([{
                customer_id: customerId,
                artist_id: selectedBarber.id,
                service_id: selectedService.id,
                date: selectedDate,
                time: selectedTime,
                session_price: selectedService.price,
                status: 'pending',
            }]);
            if (appErr) throw appErr;

            // 3. Build WhatsApp message
            const phone = (siteData?.contact?.whatsapp || '').replace(/\D/g, '');
            let msg = `*Novo Agendamento* ✂️\n`;
            msg += `----------------------------\n`;
            msg += `*Cliente:* ${clientName}\n`;
            msg += `*WhatsApp:* ${clientPhone}\n`;
            msg += `----------------------------\n`;
            msg += `*Serviço:* ${selectedService.name} (R$ ${selectedService.price})\n`;
            msg += `*Profissional:* ${selectedBarber.name}\n`;
            msg += `*Data:* ${formatDate(selectedDate)}\n`;
            msg += `*Horário:* ${selectedTime}\n`;

            if (phone) {
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
            }

            botSay(
                `🎉 <strong>Agendamento confirmado!</strong><br/><br/>Você foi redirecionado para o WhatsApp para finalizar com nossa equipe.<br/><br/>Até logo, <strong>${clientName}</strong>! 💈`,
                STEPS.DONE
            );

        } catch (err) {
            console.error(err);
            botSay(`❌ Ocorreu um erro ao salvar: <em>${err.message}</em>. Tente novamente ou ligue para nós.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Cancel / restart ──────────────────────────────────────────────────
    const handleCancel = () => {
        userSay('❌ Cancelar');
        setIsVoiceMode(false);
        botSay(`Sem problemas. Se mudar de ideia ou precisar de outra coisa, é só me chamar!`, STEPS.DONE);
    };

    const handleRestart = () => {
        setMessages([]);
        setStep(STEPS.GREETING);
        setClientName('');
        setClientPhone('');
        setSelectedService(null);
        setSelectedBarber(null);
        setSelectedDate('');
        setSelectedTime('');
        setBookedTimes([]);
        setIsVoiceMode(false);
        // Trigger greeting again
        setTimeout(() => botSay(
            `👋 Olá novamente! Posso te ajudar com Agendamentos, Promoções, ou com Planos de Assinatura. O que deseja?`,
            STEPS.INTENT_SELECTION
        ), 500);
    };

    // ── Available time slots ───────────────────────────────────────────────
    const getAvailableSlots = () => {
        const todayStr = getTodayStr();
        const now = new Date();
        const nowHour = now.getHours() + now.getMinutes() / 60;
        const dayInfo = getDayInfo(selectedDate);

        return ALL_SLOTS.map(time => {
            const [h, min] = time.split(':').map(Number);
            const slotHour = h + min / 60;
            const isBooked = bookedTimes.includes(time);
            const isPast = selectedDate === todayStr && slotHour <= nowHour;
            const isAfterClose = dayInfo ? slotHour >= dayInfo.close : false;
            return { time, disabled: isBooked || isPast || isAfterClose, isBooked, isPast, isAfterClose };
        });
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <>
            {/* Floating Button */}
            <button
                id="chatbot-toggle-btn"
                className={`chatbot-fab ${isOpen ? 'open' : ''}`}
                onClick={() => {
                    setIsOpen(o => !o);
                    setShowBadge(false);
                }}
                aria-label="Agendar com assistente"
            >
                {isOpen ? <CloseIcon /> : <BotIcon />}
                {!isOpen && showBadge && (
                    <span className="chatbot-fab-badge">1</span>
                )}
            </button>

            {/* Chat Window */}
            <div className={`chatbot-window ${isOpen ? 'visible' : ''}`} role="dialog" aria-label="Assistente de Agendamento">
                {/* Header */}
                <div className="chatbot-header">
                    <div className="chatbot-header-avatar">
                        <BotIcon />
                    </div>
                    <div className="chatbot-header-info">
                        <span className="chatbot-header-name">
                            <ScissorsIcon /> Assistente Virtual
                        </span>
                        <span className="chatbot-header-status">
                            <span className="chatbot-online-dot" />
                            Online agora
                        </span>
                    </div>
                    <button className="chatbot-header-audio" onClick={handleAudioToggle} aria-label={isAudioEnabled ? "Mutar voz" : "Ativar voz"}>
                        <SpeakerIcon muted={!isAudioEnabled} />
                    </button>
                    <button className="chatbot-header-close" onClick={() => setIsOpen(false)} aria-label="Fechar chat">
                        <CloseIcon />
                    </button>
                </div>

                {/* Progress steps indicator - Only relevant for booking flow */}
                {[STEPS.ASK_NAME, STEPS.ASK_SERVICE, STEPS.ASK_BARBER, STEPS.ASK_DATE, STEPS.ASK_TIME, STEPS.CONFIRM].includes(step) && (
                    <div className="chatbot-progress">
                        {[
                            { key: STEPS.ASK_NAME, label: 'Dados' },
                            { key: STEPS.ASK_SERVICE, label: 'Serviço' },
                            { key: STEPS.ASK_BARBER, label: 'Profissional' },
                            { key: STEPS.ASK_DATE, label: 'Data' },
                            { key: STEPS.ASK_TIME, label: 'Horário' },
                            { key: STEPS.CONFIRM, label: 'Confirmar' },
                        ].map((s, i, arr) => {
                            const order = Object.values(STEPS);
                            const currentIdx = order.indexOf(step);
                            const stepIdx = order.indexOf(s.key);
                            const isDone = currentIdx > stepIdx;
                            const isActive = currentIdx === stepIdx;
                            return (
                                <div key={s.key} className="chatbot-prog-item">
                                    <div className={`chatbot-prog-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                                        {isDone ? '✓' : i + 1}
                                    </div>
                                    <span className={`chatbot-prog-label ${isActive ? 'active' : ''}`}>{s.label}</span>
                                    {i < arr.length - 1 && <div className={`chatbot-prog-line ${isDone ? 'done' : ''}`} />}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Messages area */}
                <div className="chatbot-messages" id="chatbot-messages-container">
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} msg={msg} />
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="chatbot-message bot">
                            <div className="chatbot-bot-avatar"><BotIcon /></div>
                            <div className="chatbot-bubble bot">
                                <span className="chatbot-typing-dots">
                                    <span /><span /><span />
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ─── INTERACTIVE ELEMENTS PER STEP ─────────────────── */}

                    {/* Service selection */}
                    {step === STEPS.ASK_SERVICE && !isTyping && (
                        <div className="chatbot-options-grid service-grid">
                            {services.map(s => (
                                <button
                                    key={s.id}
                                    className="chatbot-option-card"
                                    onClick={() => handleServiceSelect(s)}
                                >
                                    <span className="option-name">{s.name}</span>
                                    <span className="option-meta">{s.duration_mins} min · <strong>R$ {s.price}</strong></span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Barber selection */}
                    {step === STEPS.ASK_BARBER && !isTyping && (
                        <div className="chatbot-options-grid barber-grid">
                            {barbers.map(b => (
                                <button
                                    key={b.id}
                                    className="chatbot-option-card barber-card"
                                    onClick={() => handleBarberSelect(b)}
                                >
                                    <div
                                        className="barber-avatar-img"
                                        style={{ backgroundImage: `url(${b.photo_url || b.photo || ''})` }}
                                    >
                                        {!b.photo_url && !b.photo && b.name.charAt(0)}
                                    </div>
                                    <span className="option-name">{b.name}</span>
                                    {b.specialty && <span className="option-meta">{b.specialty}</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Date selection */}
                    {step === STEPS.ASK_DATE && !isTyping && (
                        <div className="chatbot-date-picker">
                            <input
                                type="date"
                                className="chatbot-date-input"
                                min={getTodayStr()}
                                onChange={e => handleDateSelect(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Time selection */}
                    {step === STEPS.ASK_TIME && !isTyping && selectedDate && (
                        <div className="chatbot-time-grid">
                            {getAvailableSlots().map(({ time, disabled, isBooked, isAfterClose }) => (
                                <button
                                    key={time}
                                    className={`chatbot-time-btn ${disabled ? 'disabled' : ''}`}
                                    onClick={() => !disabled && handleTimeSelect(time)}
                                    disabled={disabled}
                                    title={isBooked ? 'Ocupado' : isAfterClose ? 'Fechado' : ''}
                                >
                                    {time}
                                    {isBooked && <span className="slot-label">ocupado</span>}
                                    {isAfterClose && <span className="slot-label">fechado</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Confirm / Cancel */}
                    {step === STEPS.CONFIRM && !isTyping && (
                        <div className="chatbot-confirm-btns">
                            <button
                                className="chatbot-btn-confirm"
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? '⏳ Salvando...' : '✅ Confirmar e ir para WhatsApp'}
                            </button>
                            <button className="chatbot-btn-cancel" onClick={handleCancel}>
                                ❌ Cancelar
                            </button>
                        </div>
                    )}

                    {/* Restart */}
                    {step === STEPS.DONE && !isTyping && (
                        <div className="chatbot-confirm-btns">
                            <button className="chatbot-btn-confirm" onClick={handleRestart}>
                                🔄 Fazer novo agendamento
                            </button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area (only for text steps) */}
                {([STEPS.INTENT_SELECTION, STEPS.ASK_NAME, STEPS.ASK_PHONE, STEPS.ASK_PHONE_PLAN, STEPS.ASK_PHONE_PROMO].includes(step)) && !isTyping && (
                    <div className={`chatbot-input-area ${isVoiceModeRef.current ? 'voice-active' : ''}`}>
                        {isListening ? (
                            <div className="listening-indicator">
                                <div className="voice-wave">
                                    <span /><span /><span /><span /><span />
                                </div>
                                Ouvindo você...
                            </div>
                        ) : (
                            <>
                                <input
                                    ref={inputRef}
                                    type={step.includes('phone') ? 'tel' : 'text'}
                                    className="chatbot-input"
                                    placeholder={
                                        step === STEPS.INTENT_SELECTION 
                                            ? 'Diga ou digite o que você precisa...'
                                            : step === STEPS.ASK_NAME
                                            ? 'Digite seu nome completo...'
                                            : 'Ex: (11) 99999-9999'
                                    }
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                                    autoComplete="off"
                                    maxLength={step === STEPS.ASK_PHONE ? 20 : 60}
                                />
                                <button
                                    className="chatbot-send-btn"
                                    onClick={handleTextSubmit}
                                    disabled={!inputValue.trim()}
                                    aria-label="Enviar"
                                >
                                    <SendIcon />
                                </button>
                            </>
                        )}
                        <button
                            className={`chatbot-mic-btn ${isListening ? 'active' : ''}`}
                            onClick={isListening ? () => { if (recognitionRef.current) recognitionRef.current.stop(); } : startListening}
                            title={isListening ? "Parar de ouvir" : "Falar por voz"}
                            type="button"
                        >
                            <MicIcon listening={isListening} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default BookingChatbot;
