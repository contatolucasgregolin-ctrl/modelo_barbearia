import { useContext } from 'react';
import { SiteContext } from '../context/SiteContext';
import { MapPin, Phone, Mail, Instagram, MessageCircle, Clock } from 'lucide-react';
import Button from '../components/Button';
import '../styles/Contact.css';

const Contact = () => {
    const { siteData } = useContext(SiteContext);

    return (
        <div className="page contact-page container">
            <h2 className="page-title">Contato</h2>

            <div className="contact-info">
                <div className="info-item">
                    <MapPin className="text-primary" />
                    <div>
                        <p className="contact-label">📍 LOCALIZAÇÃO</p>
                        <p>{siteData.contact.address || 'Av. Central, 520 – Centro'}</p>
                    </div>
                </div>
                <div className="info-item">
                    <Phone className="text-primary" />
                    <div>
                        <p className="contact-label">📞 CONTATO</p>
                        <p>{siteData.contact.phone}</p>
                        {siteData.contact.instagram && (
                            <p style={{ color: 'var(--color-primary)' }}>{siteData.contact.instagram.replace('https://instagram.com/', '@')}</p>
                        )}
                    </div>
                </div>
                <div className="info-item">
                    <Clock className="text-primary" />
                    <div>
                        <p className="contact-label">🕒 FUNCIONAMENTO</p>
                        <p>{siteData.operatingHours?.weekdays?.label}: {siteData.operatingHours?.weekdays?.hours}</p>
                        <p>{siteData.operatingHours?.specialDays?.label}: {siteData.operatingHours?.specialDays?.hours}</p>
                        <p className="text-muted">{siteData.operatingHours?.weekend?.label}: {siteData.operatingHours?.weekend?.hours}</p>
                    </div>
                </div>
            </div>

            <div className="social-links">
                {siteData.contact.instagram && (
                    <a href={siteData.contact.instagram} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <Button variant="outline"><Instagram size={20} /> Instagram</Button>
                    </a>
                )}
                <a href={`https://wa.me/55${siteData.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <Button variant="outline"><MessageCircle size={20} /> WhatsApp</Button>
                </a>
            </div>

            <div className="map-container">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3753.8821438965705!2d-43.88647!3d-19.76104!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDQ1JzM5LjciUyA0M8KwNTMnMTEuMyJX!5e0!3m2!1spt-BR!2sbr!4v1708530000000!5m2!1spt-BR!2sbr"
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Localização StudioFlow"
                ></iframe>
            </div>
        </div>
    );
};

export default Contact;
