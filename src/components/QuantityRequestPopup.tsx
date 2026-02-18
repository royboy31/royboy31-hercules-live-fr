import { useState, useRef, useEffect } from 'react';

interface QuantityRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  selectedAttributes: Record<string, string>;
  selectedAddons: Record<number, string | string[]>;
  maxQuantity: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  files: File[];
}

export default function QuantityRequestPopup({
  isOpen,
  onClose,
  productId,
  productName,
  selectedAttributes,
  selectedAddons,
  maxQuantity
}: QuantityRequestPopupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
        setFormData({ firstName: '', lastName: '', email: '', phone: '', message: '', files: [] });
        setIsSuccess(false);
        setError(null);
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

    // Check file count
    if (formData.files.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    // Check file types and total size
    let totalSize = formData.files.reduce((sum, f) => sum + f.size, 0);
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPG, PNG and PDF allowed.`);
        return false;
      }
      totalSize += file.size;
      if (totalSize > maxTotalSize) {
        setError('Maximum total size of 20 MB exceeded.');
        return false;
      }
      return true;
    });

    setFormData(prev => ({ ...prev, files: [...prev.files, ...validFiles] }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('Please fill in all required fields marked with *');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Format attributes as readable string (e.g., "farbe: rot, größe: XL")
      const attributesStr = Object.entries(selectedAttributes)
        .filter(([_, value]) => value && value.toLowerCase() !== 'default')
        .map(([key, value]) => `${key.replace(/^pa_/, '')}: ${value}`)
        .join(', ');

      // Format addons as readable string
      const addonsStr = Object.entries(selectedAddons)
        .filter(([_, value]) => value)
        .map(([id, value]) => {
          const valueStr = Array.isArray(value) ? value.join(', ') : value;
          return `Addon ${id}: ${valueStr}`;
        })
        .join(', ');

      const submitData = new FormData();
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('message', formData.message);
      submitData.append('date', new Date().toLocaleDateString('en-GB'));
      submitData.append('time', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      submitData.append('pageUrl', window.location.href);
      submitData.append('productId', String(productId));
      submitData.append('productName', productName);
      submitData.append('quantity', String(maxQuantity));
      submitData.append('attributes', attributesStr);
      submitData.append('addons', addonsStr);
      submitData.append('formType', 'quantity_request');

      // Add files
      formData.files.forEach((file, index) => {
        submitData.append(`file_${index}`, file);
      });

      // Submit to API
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setIsSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Popup Overlay */}
      <div
        className="kd-quantity-popup-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={popupRef}
          className="kd-quantity-popup-inner"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="kd-quantity-popup-close"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {!isSuccess ? (
            <>
              <h4>CUSTOM QUANTITY REQUEST</h4>
              <p>
                You have selected a quantity above the standard maximum.
                Please contact us to arrange a custom order
                or receive an urgent quote.
              </p>

              <form onSubmit={handleSubmit}>
                {/* First Name & Last Name Row */}
                <div className="kd-row">
                  <div className="kd-col-50">
                    <label>
                      First Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="kd-col-50">
                    <label>
                      Last Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Email & Phone Row */}
                <div className="kd-row">
                  <div className="kd-col-50">
                    <label>
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="kd-col-50">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="kd-row">
                  <div className="kd-col-100">
                    <label>Message</label>
                    <textarea
                      name="message"
                      placeholder="Your Message"
                      value={formData.message}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="kd-col-100 kd-file-upload-section">
                  <label>
                    Attach Files (JPG, PNG, PDF — max. 10 files, 20 MB total)
                  </label>
                  <div className="kd-file-upload-wrapper">
                    <input
                      type="file"
                      id="quantity-files"
                      ref={fileInputRef}
                      accept=".jpg,.jpeg,.png,.pdf"
                      multiple
                      onChange={handleFileChange}
                      className="kd-file-input-hidden"
                    />
                    <label htmlFor="quantity-files" className="kd-file-upload-button">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Select Files</span>
                    </label>
                    <span className="kd-file-hint">Max. 20 MB total</span>
                  </div>
                  {formData.files.length > 0 && (
                    <div className="kd-selected-files">
                      {formData.files.map((file, index) => (
                        <div key={index} className="kd-file-item">
                          <span>✔ {file.name}</span>
                          <button type="button" onClick={() => removeFile(index)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="kd-quantity-error">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="kd-quantity-buttons">
                  <button
                    type="button"
                    onClick={onClose}
                    className="kd-quantity-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="kd-quantity-submit-btn"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success Message */
            <div className="kd-quantity-success">
              <div className="kd-quantity-success-icon">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h4>Thank you for contacting us!</h4>
              <p>
                Your enquiry has been successfully submitted. One of our team members will get back to you as soon as possible.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="kd-quantity-submit-btn"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* Popup Overlay */
        .kd-quantity-popup-overlay {
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
          animation: kdFadeIn 0.2s ease-out;
        }

        @keyframes kdFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes kdSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Popup Container */
        .kd-quantity-popup-inner {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 640px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          position: relative;
          padding: 40px;
          animation: kdSlideUp 0.3s ease-out;
        }

        @media (max-width: 640px) {
          .kd-quantity-popup-inner {
            padding: 30px 20px;
            border-radius: 15px;
          }
        }

        /* Close Button */
        .kd-quantity-popup-close {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #253461;
          cursor: pointer;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .kd-quantity-popup-close:hover {
          background: #f5f5f5;
          color: #469ADC;
        }

        /* Title */
        .kd-quantity-popup-inner h4 {
          font-family: 'Jost', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #253461;
          margin: 0 0 15px 0;
          text-transform: uppercase;
        }

        /* Description */
        .kd-quantity-popup-inner > p {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #253461;
          margin: 0 0 25px 0;
          line-height: 1.5;
        }

        /* Form Rows */
        .kd-quantity-popup-inner .kd-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        @media (max-width: 640px) {
          .kd-quantity-popup-inner .kd-row {
            flex-direction: column;
          }
        }

        .kd-quantity-popup-inner .kd-col-50 {
          width: 50%;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 640px) {
          .kd-quantity-popup-inner .kd-col-50 {
            width: 100%;
          }
        }

        .kd-quantity-popup-inner .kd-col-100 {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Labels */
        .kd-quantity-popup-inner label {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #253461;
          margin-bottom: 8px;
        }

        /* Inputs */
        .kd-quantity-popup-inner input[type="text"],
        .kd-quantity-popup-inner input[type="email"],
        .kd-quantity-popup-inner input[type="tel"],
        .kd-quantity-popup-inner textarea {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          padding: 12px 15px;
          border: 1px solid #DCDCDC;
          border-radius: 10px;
          background: #fff;
          color: #253461;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
          box-sizing: border-box;
        }

        .kd-quantity-popup-inner input::placeholder,
        .kd-quantity-popup-inner textarea::placeholder {
          color: #253461;
          font-size: 14px;
          font-weight: 400;
          opacity: 0.5;
        }

        .kd-quantity-popup-inner input:focus,
        .kd-quantity-popup-inner textarea:focus {
          outline: none;
          border-color: #10C99E;
          box-shadow: 0 0 0 3px rgba(16, 201, 158, 0.1);
        }

        .kd-quantity-popup-inner textarea {
          min-height: 80px;
          resize: vertical;
        }

        /* File Upload */
        .kd-file-upload-section {
          margin-top: 15px;
        }

        .kd-file-upload-wrapper {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .kd-file-input-hidden {
          display: none;
        }

        .kd-file-upload-button {
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

        .kd-file-upload-button:hover {
          background: #e8e8e8;
          border-color: #469ADC;
          color: #469ADC;
        }

        .kd-file-hint {
          font-family: 'Jost', sans-serif;
          font-size: 12px;
          color: #8D8D8D;
        }

        .kd-selected-files {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .kd-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 8px;
          font-family: 'Jost', sans-serif;
          font-size: 13px;
          color: #253461;
        }

        .kd-file-item button {
          background: none;
          border: none;
          color: #e74c3c;
          font-size: 18px;
          cursor: pointer;
          padding: 0 5px;
          line-height: 1;
        }

        /* Error Message */
        .kd-quantity-error {
          padding: 12px 15px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          margin-top: 15px;
        }

        /* Buttons */
        .kd-quantity-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          justify-content: center;
        }

        .kd-quantity-cancel-btn {
          padding: 10px 30px;
          background: transparent;
          color: #10C99E;
          border: 1px solid #10C99E;
          border-radius: 25px;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .kd-quantity-cancel-btn:hover {
          background: #10C99E;
          color: white;
        }

        .kd-quantity-submit-btn {
          padding: 10px 30px;
          background: #10C99E;
          color: white;
          border: none;
          border-radius: 25px;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .kd-quantity-submit-btn:hover:not(:disabled) {
          background: #0eb58d;
        }

        .kd-quantity-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Success State */
        .kd-quantity-success {
          text-align: center;
          padding: 20px 0;
        }

        .kd-quantity-success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #10C99E;
        }

        .kd-quantity-success h4 {
          margin-bottom: 15px;
        }

        .kd-quantity-success p {
          margin-bottom: 25px;
        }
      `}</style>
    </>
  );
}
