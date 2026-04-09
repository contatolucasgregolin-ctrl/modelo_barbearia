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

const normalizeBRPhone = (text) => {
    if (!text) return "";
    // Extract only digits to handle spoken numbers like "onze nove..."
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) return "";
    
    // Standard BR formatting
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    // Limit to 11 digits (DDD + 9 digits)
    const d = digits.slice(0, 11);
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
};

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
    const [stepHistory, setStepHistory]   = useState([]);

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
    const [isProcessing, setIsProcessing]       = useState(false);

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
            if (services.length > 0 && barbers.length > 0) return;
            try {
                if (services.length === 0) {
                    const { data: sData } = await supabase.from('services').select('*').order('name');
                    if (sData) setServices(sData);
                }
                if (barbers.length === 0) {
                    const { data: bData } = await supabase.from('artists').select('*').eq('active', true).order('name');
                    if (bData) setBarbers(bData);
                }
            } catch (err) {
                console.error("Error loading fallback data:", err);
            }
        };
        loadFallback();
    }, [services.length, barbers.length]);

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
            ), 800);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ── Audio Engine ──────────────────────────────────────────────────────
    const keepAliveRef = useRef(null); // Chrome TTS keep-alive timer

    const stripHTML = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let text = doc.body.textContent || "";
        return text.replace(/[!?.]{2,}/g, '.');
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            try { 
                recognitionRef.current.onend = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.abort(); 
            } catch(e) {}
        }
        setIsListening(false);
    };

    const startListening = (isBargeIn = false) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        // Block if bot is currently talking or processing
        if (isProcessing && !isBargeIn) return;
        if (isListening && !isBargeIn) return;

        stopListening();

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart if voice mode is still active and NOT processing
            if (isVoiceModeRef.current && isOpenRef.current && !isProcessing) {
                setTimeout(() => {
                    if (isVoiceModeRef.current && isOpenRef.current && !window.speechSynthesis.speaking) {
                        startListening();
                    }
                }, 500);
            }
        };

        // NOTE: onsoundstart barge-in removed. It was canceling TTS on ambient noise.
        // Barge-in only works via actual recognized speech (onresult handler).

        recognition.onresult = (event) => {
            if (event.results[0].isFinal) {
                const transcript = event.results[0][0].transcript;
                if (!transcript.trim()) return;
                
                // If bot is still talking, cancel the speech (user barge-in via actual words)
                if (window.speechSynthesis.speaking) {
                    console.log("[Chatbot] User barge-in via speech:", transcript.slice(0, 30));
                    window.speechSynthesis.cancel();
                    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
                    setIsProcessing(false);
                }
                
                stopListening();
                handleTextSubmit(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.warn("[Chatbot STT Error]", event.error);
            // Don't restart on 'aborted' — that's intentional
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                setIsListening(false);
            }
        };

        try { recognition.start(); } catch(e) {
            console.error("Recognition start error:", e);
        }
    };

    const speakText = (text) => {
        if (!isAudioEnabled) return;
        
        // Ensure STT is OFF while bot starts speaking
        stopListening();
        window.speechSynthesis.cancel();
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        
        const cleanText = stripHTML(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt-BR') && (v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Masculine')));
        if (ptVoice) utterance.voice = ptVoice;
        
        utterance.rate = 1.05;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            setIsProcessing(true);
            // Chrome Keep-Alive: without this, Chrome kills utterances > ~15s
            keepAliveRef.current = setInterval(() => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000);
        };

        utterance.onend = () => {
            if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
            utteranceRef.current = null;
            setIsProcessing(false);
            // Resume listening only if voice mode is still active
            if (isVoiceModeRef.current && isOpenRef.current) {
                setTimeout(() => {
                    startListening();
                }, 400);
            }
        };

        utterance.onerror = (event) => {
            console.error("[Chatbot TTS Error]", event.error);
            if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
            utteranceRef.current = null;
            setIsProcessing(false);
            // Try to resume listening even if TTS fails
            if (isVoiceModeRef.current && isOpenRef.current) {
                setTimeout(() => startListening(), 400);
            }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // Clean up keep-alive on unmount
    useEffect(() => {
        return () => {
            if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        };
    }, []);

    const handleAudioToggle = () => {
        const nextState = !isAudioEnabled;
        setIsAudioEnabled(nextState);
        if (nextState) {
            setIsVoiceMode(true);
            speakText("Modo de voz ativado.");
        } else {
            setIsVoiceMode(false);
            stopListening();
            window.speechSynthesis.cancel();
            if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        }
    };

    // ── Bot message helper ────────────────────────────────────────────────
    const botSay = (text, nextStep = null) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { from: 'bot', text }]);
            speakText(text);
            if (nextStep) {
                setStepHistory(prev => [...prev, stepRef.current]);
                setStep(nextStep);
                stepRef.current = nextStep;
            }
        }, 400);
    };

    const userSay = (text) => {
        setMessages(prev => [...prev, { from: 'user', text }]);
    };

    // ── Handle text input submission ──────────────────────────────────────
    const handleTextSubmit = (overrideVal = null) => {
        const rawVal = typeof overrideVal === 'string' ? overrideVal : inputValue;
        const val = rawVal.trim();
        if (!val) return;
        
        setInputValue('');
        const currentStep = stepRef.current;

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
            const formatted = normalizeBRPhone(val);
            if (formatted.replace(/\D/g, '').length < 10) {
                userSay(val);
                botSay(`Hmm, esse número parece estar incompleto. Pode me dizer com o DDD completo, por favor?`);
                return;
            }
            userSay(formatted);
            setClientPhone(formatted);
            botSay(
                `Perfeito! Agora, qual desses <strong>serviços</strong> você gostaria de agendar hoje?`,
                STEPS.ASK_SERVICE
            );
            return;
        }

        if (currentStep === STEPS.ASK_PHONE_PLAN || currentStep === STEPS.ASK_PHONE_PROMO) {
            const formatted = normalizeBRPhone(val);
            if (formatted.replace(/\D/g, '').length < 10) {
                userSay(val);
                botSay(`Esse número parece curto demais. Poderia dizer com o DDD?`);
                return;
            }
            userSay(formatted);
            
            const topic = currentStep === STEPS.ASK_PHONE_PROMO ? 'Promoções' : 'Planos de Assinatura';

            const persistInterest = async () => {
                try {
                    let customerId = null;
                    const { data: existing } = await supabase.from('customers').select('id').eq('phone', formatted).maybeSingle();
                    if (existing) {
                        customerId = existing.id;
                    } else {
                        const { data: newCust } = await supabase.from('customers').insert([{ name: clientName || 'Interessado Chatbot', phone: formatted }]).select('id').single();
                        if (newCust) customerId = newCust.id;
                    }

                    if (!customerId) return;

                    if (currentStep === STEPS.ASK_PHONE_PROMO) {
                        const { data: firstPromo } = await supabase.from('promotions').select('id').eq('active', true).limit(1).maybeSingle();
                        if (firstPromo) {
                            await supabase.from('promotion_interests').insert([{
                                customer_id: customerId,
                                promotion_id: firstPromo.id,
                                status: 'pending',
                                notes: 'Solicitado via Assistente Virtual'
                            }]);
                        }
                    } else {
                        const { data: firstPlan } = await supabase.from('plans').select('id').eq('active', true).limit(1).maybeSingle();
                        if (firstPlan) {
                            await supabase.from('plan_subscriptions').insert([{
                                customer_id: customerId,
                                plan_id: firstPlan.id,
                                status: 'pending',
                                notes: 'Interesse via Assistente Virtual'
                            }]);
                        }
                    }
                } catch (e) {
                    console.error("[Chatbot Persistence Error]", e);
                }
            };
            
            persistInterest();

            botSay(`Fechado! O time já foi avisado. Em breve, enviaremos todas as novidades sobre ${topic} direto no seu celular!`, STEPS.DONE);
            
            const phone = (siteData?.contact?.whatsapp || '').replace(/\D/g, '');
            let msg = `Olá, estava usando o Assistente Virtual e gostaria de saber os detalhes comerciais sobre *${topic}*!`;
            if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
            return;
        }
    };

    // ── Navigation ────────────────────────────────────────────────────────
    const handleBack = () => {
        if (stepHistory.length === 0) return;
        
        // Stop any current speech or listening
        window.speechSynthesis.cancel();
        stopListening();
        setIsProcessing(false);

        const newHistory = [...stepHistory];
        const prevStep = newHistory.pop();
        setStepHistory(newHistory);
        
        if (step === STEPS.ASK_TIME) setSelectedTime('');
        if (step === STEPS.ASK_DATE) setSelectedDate('');
        if (step === STEPS.ASK_BARBER) setSelectedBarber(null);
        if (step === STEPS.ASK_SERVICE) setSelectedService(null);
        if (step === STEPS.ASK_PHONE) setClientPhone('');
        if (step === STEPS.ASK_NAME) setClientName('');
        
        setStep(prevStep);
        stepRef.current = prevStep;
        
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const backMsg = "Entendido! Vamos voltar um passo.";
            setMessages(prev => [...prev, { from: 'bot', text: backMsg }]);
            speakText(backMsg);
        }, 150);
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
    const handleDateSelect = async (date) => {
        const dayInfo = getDayInfo(date);
        if (dayInfo?.closed) {
            setSelectedDate(date);
            botSay(`Olha, infelizmente não atendemos aos domingos. Você teria outro dia de preferência?`);
            return;
        }

        setIsTyping(true);
        try {
            const { data: booked } = await supabase
                .from('appointments').select('time')
                .eq('date', date)
                .eq('artist_id', selectedBarber.id)
                .in('status', ['pending', 'confirmed', 'finished']);

            const bookedTimesOnDate = booked ? booked.map(a => (a.time || '').slice(0, 5)) : [];
            const todayStr = getTodayStr();
            const now = new Date();
            const nowHour = now.getHours() + (now.getMinutes() / 60);
            
            const availableSlots = ALL_SLOTS.filter(time => {
                const [h, min] = time.split(':').map(Number);
                const slotHour = h + (min / 60);
                const isBooked = bookedTimesOnDate.includes(time);
                const isPast = date === todayStr && slotHour <= nowHour;
                const isAfterClose = dayInfo ? slotHour >= dayInfo.close : false;
                return !(isBooked || isPast || isAfterClose);
            });

            setIsTyping(false);
            if (availableSlots.length === 0) {
                botSay(`Poxa, para o dia <strong>${formatDate(date)}</strong> a agenda do profissional <strong>${selectedBarber.name}</strong> já está lotada. Você poderia escolher <strong>outra data</strong>?`);
                return;
            }

            userSay(`📅 ${formatDate(date)}`);
            setSelectedDate(date);
            setBookedTimes(bookedTimesOnDate);
            botSay(`Data anotada! E qual seria o melhor <strong>horário</strong> para você?`, STEPS.ASK_TIME);
        } catch (error) {
            setIsTyping(false);
            userSay(`📅 ${formatDate(date)}`);
            setSelectedDate(date);
            botSay(`Certo! Vamos conferir os horários disponíveis para esse dia:`, STEPS.ASK_TIME);
        }
    };

    // ── Handle time selection ─────────────────────────────────────────────
    const handleTimeSelect = (time) => {
        userSay(`⏰ ${time}`);
        setSelectedTime(time);
        const summary = `
            <strong>Resumo do Agendamento:</strong><br/><br/>
            👤 <strong>Cliente:</strong> ${clientName}<br/>
            📱 <strong>WhatsApp:</strong> ${clientPhone}<br/>
            ✂️ <strong>Serviço:</strong> ${selectedService?.name} (R$ ${selectedService?.price})<br/>
            💈 <strong>Profissional:</strong> ${selectedBarber?.name}<br/>
            📅 <strong>Data:</strong> ${formatDate(selectedDate)} às ${time}<br/><br/>
            <strong>Tudo certo! Podemos confirmar agora?</strong>
        `;
        botSay(summary, STEPS.CONFIRM);
    };

    // ── Confirm booking ───────────────────────────────────────────────────
    const handleConfirm = async () => {
        setIsSubmitting(true);
        userSay('✅ Sim, confirmar!');
        try {
            let customerId = null;
            const { data: existing } = await supabase.from('customers').select('id').eq('phone', clientPhone).maybeSingle();
            if (existing) {
                customerId = existing.id;
            } else {
                const { data: newCust } = await supabase.from('customers').insert([{ name: clientName, phone: clientPhone }]).select('id').single();
                customerId = newCust.id;
            }

            await supabase.from('appointments').insert([{
                customer_id: customerId,
                artist_id: selectedBarber.id,
                service_id: selectedService.id,
                date: selectedDate,
                time: selectedTime,
                session_price: selectedService.price,
                status: 'pending',
            }]);

            const phone = (siteData?.contact?.whatsapp || '').replace(/\D/g, '');
            let whatsappMsg = `*Novo Agendamento* ✂️\n`;
            whatsappMsg += `----------------------------\n`;
            whatsappMsg += `*Cliente:* ${clientName}\n`;
            whatsappMsg += `*WhatsApp:* ${clientPhone}\n`;
            whatsappMsg += `----------------------------\n`;
            whatsappMsg += `*Serviço:* ${selectedService.name} (R$ ${selectedService.price})\n`;
            whatsappMsg += `*Profissional:* ${selectedBarber.name}\n`;
            whatsappMsg += `*Data:* ${formatDate(selectedDate)}\n`;
            whatsappMsg += `*Horário:* ${selectedTime}\n`;

            if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMsg)}`, '_blank');

            botSay(`🎉 <strong>Agendamento confirmado!</strong><br/><br/>Até logo, <strong>${clientName}</strong>! 💈`, STEPS.DONE);
        } catch (err) {
            botSay(`❌ Ocorreu um erro ao salvar. Tente novamente.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        userSay('❌ Cancelar');
        setIsVoiceMode(false);
        botSay(`Sem problemas. Se mudar de ideia, é só me chamar!`, STEPS.DONE);
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
        setTimeout(() => botSay(`👋 Olá novamente! O que deseja fazer?`, STEPS.INTENT_SELECTION), 500);
    };

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

    return (
        <>
            <button
                id="chatbot-toggle-btn"
                className={`chatbot-fab ${isOpen ? 'open' : ''}`}
                onClick={() => { setIsOpen(o => !o); setShowBadge(false); }}
                aria-label="Agendar com assistente"
            >
                {isOpen ? <CloseIcon /> : <BotIcon />}
                {!isOpen && showBadge && <span className="chatbot-fab-badge">1</span>}
            </button>

            <div className={`chatbot-window ${isOpen ? 'visible' : ''}`} role="dialog" aria-label="Assistente de Agendamento">
                <div className="chatbot-header">
                    <div className="header-top-row">
                        <div className="header-left">
                            {step !== STEPS.GREETING && step !== STEPS.DONE && (
                                <button className="chatbot-header-back-btn" onClick={handleBack} aria-label="Voltar">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Voltar
                                </button>
                            )}
                            <div className="chatbot-header-avatar"><BotIcon /></div>
                            <div className="chatbot-header-info">
                                <span className="chatbot-header-name">
                                    <ScissorsIcon /> Assistente Virtual
                                </span>
                                <span className="chatbot-header-status">
                                    <span className="chatbot-online-dot" />
                                    Online agora
                                </span>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="chatbot-header-audio" onClick={handleAudioToggle} aria-label={isAudioEnabled ? "Mutar voz" : "Ativar voz"}>
                                <SpeakerIcon muted={!isAudioEnabled} />
                            </button>
                            <button className="chatbot-header-close" onClick={() => setIsOpen(false)} aria-label="Fechar chat">
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
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
