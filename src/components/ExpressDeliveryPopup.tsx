import { useState, useRef, useEffect } from 'react';

interface ProductConfig {
  product_id: number;
  product_name: string;
  attributes: Record<string, {
    terms: Array<{ slug: string; name: string }>;
    display_title: string;
  }>;
  addons?: Array<{
    id: number;
    title: string;
    name?: string;
    options: Array<{ name: string }>;
  }>;
}

interface ExpressDeliveryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  selectedAttributes: Record<string, string>;
  selectedAddons: Record<number, string | string[]>;
  quantity: number;
  pricePerPiece: number;
  currentLeadTime: string;
  config: ProductConfig;
  currencySymbol?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  desiredDate: string;
  message: string;
  files: File[];
}

export default function ExpressDeliveryPopup({
  isOpen,
  onClose,
  productId,
  productName,
  selectedAttributes,
  selectedAddons,
  quantity,
  pricePerPiece,
  currentLeadTime,
  config,
  currencySymbol = '€'
}: ExpressDeliveryPopupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    desiredDate: '',
    message: '',
    files: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when popup closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', desiredDate: '', message: '', files: [] });
        setIsSuccess(false);
      }, 300);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 10;
    const maxTotalSize = 20 * 1024 * 1024; // 20MB total
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (formData.files.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    let totalSize = formData.files.reduce((sum, f) => sum + f.size, 0);
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPG, PNG or PDF files are allowed.');
        return false;
      }
      totalSize += file.size;
      if (totalSize > maxTotalSize) {
        alert('Total file size must be less than 20 MB.');
        return false;
      }
      return true;
    });

    setFormData(prev => ({ ...prev, files: [...prev.files, ...validFiles] }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get addon display name
  const getAddonName = (addonId: number): string => {
    const addon = config?.addons?.find(a => a.id === addonId);
    return addon?.name || addon?.title || `Addon #${addonId}`;
  };

  // Resolve attribute slug to human-readable label
  const getAttributeLabel = (attrKey: string, slug: string): string => {
    const attr = config?.attributes?.[attrKey];
    if (!attr) return slug;
    const term = attr.terms.find(t => t.slug === slug);
    return term?.name || slug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.desiredDate || !formData.desiredDate.trim()) {
      alert('Veuillez sélectionner une date de livraison.');
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      alert('Veuillez entrer votre nom.');
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      alert('Veuillez entrer votre adresse e-mail.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      alert('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build attributes string
      const attributesStr = Object.entries(selectedAttributes)
        .filter(([_, value]) => value.toLowerCase() !== 'default')
        .map(([key, value]) => `${key.replace(/^pa_/, '')}: ${value}`)
        .join(', ');

      const SKIP_ADDON_VALUES = ['aucun', 'none', 'n/a', '-', ''];
      // Build addons string
      const addonsStr = [...new Set(
        Object.entries(selectedAddons)
          .filter(([_, value]) => value)
          .map(([id, value]) => {
            const valueStr = Array.isArray(value) ? value.join(', ') : value as string;
            if (SKIP_ADDON_VALUES.includes(valueStr.toLowerCase().trim())) return null;
            const name = getAddonName(Number(id));
            const isGeneric = /^Addon\s+\d+$/i.test(name);
            return (!isGeneric && name !== valueStr) ? `${name}: ${valueStr}` : valueStr;
          })
          .filter(Boolean)
      )].join('\n');

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('message', formData.message || '');
      submitData.append('date', new Date().toLocaleDateString('fr-FR'));
      submitData.append('time', new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      submitData.append('pageUrl', window.location.href);
      submitData.append('pageTitle', productName);
      submitData.append('formType', 'expressdelivery');
      submitData.append('productName', productName);
      submitData.append('productId', String(productId));
      submitData.append('quantity', String(quantity));
      submitData.append('pricePerPiece', `${pricePerPiece.toFixed(2).replace('.', ',')} ${currencySymbol}`);
      const [dy, dm, dd] = formData.desiredDate.split('-');
      submitData.append('desiredDate', `${dd}-${dm}-${dy}`);
      submitData.append('attributes', attributesStr);
      submitData.append('addons', addonsStr);

      // Add files for R2 upload (using file_${index} pattern)
      formData.files.forEach((file, index) => {
        submitData.append(`file_${index}`, file);
      });

      const response = await fetch('/api/contact', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Urgent request failed:', err);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="urgent-popup-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={popupRef}
          className="urgent-popup"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="urgent-popup-close"
            aria-label="Fermer"
          >
            ×
          </button>

          {isSuccess ? (
            /* Success Message */
            <div className="success-content" style={{ textAlign: 'center', padding: '20px 0' }}>
              <h3 style={{ marginBottom: '20px' }}>MERCI DE NOUS AVOIR CONTACTÉS !</h3>
              <p style={{ marginBottom: '30px' }}>
                Votre demande a bien été envoyée. Un membre de notre équipe vous répondra dans les plus brefs délais.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', maxWidth: '300px', margin: '0 auto 30px' }}>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#253461" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Nom : {formData.name}</span>
                </li>
                <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#253461" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>E-mail : {formData.email}</span>
                </li>
                {formData.phone && (
                  <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#253461" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>Téléphone : {formData.phone}</span>
                  </li>
                )}
              </ul>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#10c99e',
                  borderRadius: '25px',
                  color: 'white',
                  padding: '10px 40px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 500
                }}
              >
                Fermer
              </button>
            </div>
          ) : (
            /* Form Content */
            <>
          <h3>DEMANDE DE LIVRAISON URGENTE</h3>
          <p>Veuillez sélectionner votre date de livraison souhaitée et nous vous recontacterons.</p>

          {/* Product Summary - Simple UL with bullets */}
          <ul style={{ marginTop: '15px' }}>
            {Object.entries(selectedAttributes)
              .filter(([_, value]) => value.toLowerCase() !== 'default')
              .map(([key, value]) => {
                const attr = config?.attributes?.[key];
                const title = attr?.display_title || key.replace(/^pa_/, '');
                const label = getAttributeLabel(key, value);
                return (
                  <li key={key} style={{ textTransform: 'capitalize' }}>
                    {title}: {label}
                  </li>
                );
              })}
            {Object.entries(selectedAddons).map(([id, value]) => {
              if (!value) return null;
              const valueStr = Array.isArray(value) ? value.join(', ') : value;
              if (['aucun', 'none', 'n/a', '-'].includes(valueStr.toLowerCase().trim())) return null;
              const name = getAddonName(Number(id));
              const isGeneric = /^Addon\s+\d+$/i.test(name);
              return (
                <li key={id}>
                  {(!isGeneric && name !== valueStr) ? `${name}: ${valueStr}` : valueStr}
                </li>
              );
            })}
            <li>Quantité : {quantity}</li>
            <li>Prix par pièce : {pricePerPiece.toFixed(2).replace('.', ',')} {currencySymbol}</li>
          </ul>

          <form onSubmit={handleSubmit}>
            {/* Row 1: Date | Name */}
            <div className="kd-row">
              <div className="kd-col-50">
                <label>
                  Date<span style={{ color: 'red' }}> *</span>
                </label>
                <input
                  type="date"
                  name="desiredDate"
                  value={formData.desiredDate}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  style={{ marginTop: '10px', padding: '5px', width: '100%' }}
                />
              </div>
              <div className="kd-col-50">
                <label>
                  Nom<span style={{ color: 'red' }}> *</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Votre nom"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{ marginTop: '10px', padding: '5px', width: '100%' }}
                />
              </div>
            </div>

            {/* Row 2: Phone | Email */}
            <div className="kd-row">
              <div className="kd-col-50">
                <label>Numéro de téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Numéro de téléphone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={{ marginTop: '10px', padding: '5px', width: '100%' }}
                />
              </div>
              <div className="kd-col-50">
                <label>
                  E-mail<span style={{ color: 'red' }}> *</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Adresse e-mail"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{ marginTop: '10px', padding: '5px', width: '100%' }}
                />
              </div>
            </div>

            {/* Row 3: Message */}
            <div className="kd-row">
              <div className="kd-col-100">
                <label>Message</label>
                <textarea
                  name="message"
                  placeholder="Votre message"
                  value={formData.message}
                  onChange={handleInputChange}
                  style={{
                    marginTop: '10px',
                    padding: '5px',
                    width: '100%',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Row 4: File Upload */}
            <div className="kd-col-100" style={{ marginTop: '15px' }}>
              <label>Joindre des fichiers (max. 10, 20 Mo au total)</label>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  id="urgent-files"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={handleFileChange}
                  className="urgent-file-input"
                />
                <label htmlFor="urgent-files" className="urgent-file-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Sélectionner des fichiers</span>
                </label>
                <span className="urgent-file-hint">JPG, PNG, PDF uniquement</span>
              </div>
              {formData.files.length > 0 && (
                <div className="urgent-file-list">
                  {formData.files.map((file, index) => (
                    <div key={index} className="urgent-file-item">
                      <span>✔ {file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons - Right aligned */}
            <div style={{ marginTop: '15px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  marginRight: '10px',
                  borderColor: '#10c99e',
                  borderRadius: '25px',
                  color: '#10c99e',
                  padding: '6px 30px',
                  background: 'transparent',
                  border: '1px solid #10c99e',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: isSubmitting ? '#ccc' : '#10c99e',
                  borderRadius: '25px',
                  color: 'white',
                  padding: '6px 30px',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .urgent-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .urgent-popup {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 640px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          position: relative;
          padding: 30px;
        }

        .urgent-popup-close {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #253461;
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
        }

        .urgent-popup-close:hover {
          color: #469ADC;
        }

        .urgent-popup h3 {
          font-family: 'Jost', sans-serif;
          font-size: 35px;
          font-weight: 600;
          color: #253461;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          text-align: center;
        }

        .urgent-popup p,
        .urgent-popup ul {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #253461;
        }

        .urgent-popup ul {
          margin: 0 0 20px 0;
          padding-left: 20px;
          list-style-type: disc;
        }

        .urgent-popup ul li {
          margin-bottom: 4px;
        }

        .urgent-popup label {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #253461;
        }

        .urgent-popup input,
        .urgent-popup textarea {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          color: #253461;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-sizing: border-box;
        }

        .urgent-popup input::placeholder,
        .urgent-popup textarea::placeholder {
          color: #253461;
          opacity: 0.5;
        }

        .urgent-popup input:focus,
        .urgent-popup textarea:focus {
          outline: none;
          border-color: #10c99e;
        }

        .kd-row {
          display: flex;
          column-gap: 15px;
          margin-bottom: 15px;
        }

        .kd-col-50 {
          width: calc(50% - 8px);
        }

        .kd-col-100 {
          width: 100%;
        }

        @media (max-width: 640px) {
          .urgent-popup {
            padding: 20px;
          }

          .kd-row {
            flex-direction: column;
            gap: 15px;
          }

          .kd-col-50 {
            width: 100%;
          }
        }

        /* File Upload Styling */
        .urgent-file-input {
          display: none;
        }

        .urgent-file-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f5f5f5;
          border: 1px dashed #DCDCDC;
          border-radius: 10px;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          color: #253461;
          cursor: pointer;
          transition: all 0.2s;
        }

        .urgent-file-label:hover {
          background: #e8e8e8;
          border-color: #469ADC;
          color: #469ADC;
        }

        .urgent-file-hint {
          font-family: 'Jost', sans-serif;
          font-size: 12px;
          color: #8D8D8D;
        }

        .urgent-file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .urgent-file-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 8px;
          font-family: 'Jost', sans-serif;
          font-size: 13px;
          color: #253461;
        }
      `}</style>
    </>
  );
}
