import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ContactFormPopupProps {
  triggerType?: 'button' | 'icon' | 'link';
  triggerText?: string;
  triggerClassName?: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  files: File[];
}

export default function ContactFormPopup({
  triggerType = 'button',
  triggerText = 'Contact',
  triggerClassName = ''
}: ContactFormPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    files: []
  });
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePopup();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

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

  const openPopup = () => {
    setIsOpen(true);
    setIsSuccess(false);
    setError(null);
  };

  const closePopup = () => {
    setIsOpen(false);
    // Reset form after animation
    setTimeout(() => {
      setFormData({ name: '', email: '', phone: '', message: '', files: [] });
      setIsSuccess(false);
      setError(null);
      setSubmittedData(null);
    }, 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size: 10MB`);
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
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('message', formData.message);
      submitData.append('date', new Date().toLocaleDateString('en-GB'));
      submitData.append('time', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      submitData.append('pageTitle', document.title);
      submitData.append('pageUrl', window.location.href);

      // Tracking fields
      submitData.append('referrer', document.referrer || '(direct)');
      submitData.append('userAgent', navigator.userAgent);
      submitData.append('screenWidth', String(window.screen.width));
      submitData.append('screenHeight', String(window.screen.height));
      submitData.append('language', navigator.language || '');

      // Add files
      formData.files.forEach((file, index) => {
        submitData.append(`file_${index}`, file);
      });

      // Submit to Google Sheets API
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setSubmittedData({ ...formData });
      setIsSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger button/link/icon
  const renderTrigger = () => {
    const baseClasses = triggerClassName || '';

    if (triggerType === 'icon') {
      return (
        <button
          type="button"
          onClick={openPopup}
          className={`contact-trigger-icon ${baseClasses}`}
          aria-label="Contact"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 512 512" fill="currentColor">
            <path d="M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm0 48v40.805c-22.422 18.259-58.168 46.651-134.587 106.49-16.841 13.247-50.201 45.072-73.413 44.701-23.208.375-56.579-31.459-73.413-44.701C106.18 199.465 70.425 171.067 48 152.805V112h416zM48 400V214.398c22.914 18.251 55.409 43.862 104.938 82.646 21.857 17.205 60.134 55.186 103.062 54.955 42.717.231 80.509-37.199 103.053-54.947 49.528-38.783 82.032-64.401 104.947-82.653V400H48z"/>
          </svg>
        </button>
      );
    }

    if (triggerType === 'link') {
      return (
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); openPopup(); }}
          className={`contact-trigger-link ${baseClasses}`}
        >
          {triggerText}
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={openPopup}
        className={`contact-trigger-button ${baseClasses}`}
      >
        {triggerText}
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {/* Popup Overlay - rendered via Portal to escape stacking context */}
      {isOpen && createPortal(
        <div
          className="contact-popup-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePopup();
          }}
        >
          <div
            ref={popupRef}
            className="contact-popup-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-form-title"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closePopup}
              className="contact-popup-close"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {!isSuccess ? (
              /* Contact Form */
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="contact-form-fields">
                  {/* Name & Email Row */}
                  <div className="contact-form-row">
                    <div className="contact-field contact-field-half">
                      <label htmlFor="contact-name" className="contact-label">
                        Full Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="contact-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        required
                        className="contact-input"
                      />
                    </div>
                    <div className="contact-field contact-field-half">
                      <label htmlFor="contact-email" className="contact-label">
                        Email <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        id="contact-email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Email"
                        required
                        className="contact-input"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="contact-field">
                    <label htmlFor="contact-phone" className="contact-label">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="contact-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone Number"
                      className="contact-input"
                    />
                  </div>

                  {/* Message */}
                  <div className="contact-field">
                    <label htmlFor="contact-message" className="contact-label">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Message"
                      rows={4}
                      className="contact-textarea"
                    />
                  </div>

                  {/* File Upload */}
                  <div className="contact-field">
                    <label htmlFor="contact-files" className="contact-label">
                      Upload File
                    </label>
                    <div className="contact-file-upload">
                      <input
                        type="file"
                        id="contact-files"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        className="contact-file-input"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      />
                      <label htmlFor="contact-files" className="contact-file-label">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>Select Files</span>
                      </label>
                      <span className="contact-file-hint">Max. 10MB per file</span>
                    </div>

                    {/* File List */}
                    {formData.files.length > 0 && (
                      <div className="contact-file-list">
                        {formData.files.map((file, index) => (
                          <div key={index} className="contact-file-item">
                            <span className="contact-file-name">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="contact-file-remove"
                              aria-label={`Remove ${file.name}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="contact-error">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="contact-submit"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="contact-spinner" width="20" height="20" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.416" strokeDashoffset="10" />
                        </svg>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Message */
              <div className="contact-success">
                <div className="contact-success-icon">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h2 className="contact-success-title">
                  Thank you for<br />contacting us!
                </h2>
                <p className="contact-success-text">
                  Your enquiry has been successfully submitted. One of our team members will get back to you as soon as possible.
                </p>
                {submittedData && (
                  <div className="contact-success-details">
                    <p><strong>Name:</strong> {submittedData.name}</p>
                    <p><strong>Email:</strong> {submittedData.email}</p>
                    {submittedData.phone && <p><strong>Phone:</strong> {submittedData.phone}</p>}
                  </div>
                )}
                <button
                  type="button"
                  onClick={closePopup}
                  className="contact-success-close"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        /* Popup Overlay */
        .contact-popup-overlay {
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
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
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
        .contact-popup-container {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 640px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          position: relative;
          padding: 40px;
          animation: slideUp 0.3s ease-out;
        }

        @media (max-width: 640px) {
          .contact-popup-container {
            padding: 30px 20px;
            border-radius: 15px;
          }
        }

        /* Close Button */
        .contact-popup-close {
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

        .contact-popup-close:hover {
          background: #f5f5f5;
          color: #469ADC;
        }

        /* Form Fields */
        .contact-form-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .contact-form-row {
          display: flex;
          gap: 15px;
        }

        @media (max-width: 640px) {
          .contact-form-row {
            flex-direction: column;
          }
        }

        .contact-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .contact-field-half {
          flex: 1;
        }

        .contact-label {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #253461;
        }

        .contact-label .required {
          color: #e74c3c;
        }

        .contact-input,
        .contact-textarea {
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

        .contact-input:focus,
        .contact-textarea:focus {
          outline: none;
          border-color: #10C99E;
          box-shadow: 0 0 0 3px rgba(16, 201, 158, 0.1);
        }

        .contact-input::placeholder,
        .contact-textarea::placeholder {
          color: #8D8D8D;
        }

        .contact-textarea {
          resize: vertical;
          min-height: 100px;
        }

        /* File Upload */
        .contact-file-upload {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .contact-file-input {
          display: none;
        }

        .contact-file-label {
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

        .contact-file-label:hover {
          background: #e8e8e8;
          border-color: #469ADC;
          color: #469ADC;
        }

        .contact-file-hint {
          font-family: 'Jost', sans-serif;
          font-size: 12px;
          color: #8D8D8D;
        }

        .contact-file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .contact-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .contact-file-name {
          font-family: 'Jost', sans-serif;
          font-size: 13px;
          color: #253461;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: calc(100% - 40px);
        }

        .contact-file-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: none;
          border: none;
          color: #8D8D8D;
          cursor: pointer;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .contact-file-remove:hover {
          background: #e74c3c;
          color: #fff;
        }

        /* Error Message */
        .contact-error {
          padding: 12px 15px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
        }

        /* Submit Button */
        .contact-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 15px 30px;
          background: #10C99E;
          border: 1px solid #10C99E;
          border-radius: 50px;
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 15px;
          font-weight: 500;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-submit:hover:not(:disabled) {
          background: transparent;
          color: #10C99E;
        }

        .contact-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .contact-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Success State */
        .contact-success {
          text-align: center;
          padding: 20px 0;
        }

        .contact-success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #10C99E;
        }

        .contact-success-title {
          font-family: 'Jost', sans-serif;
          font-size: 28px;
          font-weight: 600;
          color: #253461;
          margin: 0 0 15px;
          line-height: 1.3;
        }

        .contact-success-text {
          font-family: 'Jost', sans-serif;
          font-size: 16px;
          color: #5F5F5F;
          margin: 0 0 20px;
          line-height: 1.5;
        }

        .contact-success-details {
          background: #f5f5f5;
          border-radius: 10px;
          padding: 15px 20px;
          margin-bottom: 20px;
          text-align: left;
        }

        .contact-success-details p {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          color: #253461;
          margin: 0 0 5px;
        }

        .contact-success-details p:last-child {
          margin-bottom: 0;
        }

        .contact-success-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 30px;
          background: #253461;
          border: 1px solid #253461;
          border-radius: 50px;
          color: #fff;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-success-close:hover {
          background: transparent;
          color: #253461;
        }

        /* Trigger Styles - matching WordPress LIVE site exactly */
        .contact-trigger-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 152px;
          padding: 10px 30px;
          background-color: #10C99E !important;
          color: #FFFFFF !important;
          font-family: 'Jost', Sans-serif;
          font-size: 15px;
          font-weight: 500;
          line-height: 1;
          text-transform: uppercase;
          text-decoration: none;
          border-style: solid;
          border-width: 1px;
          border-color: #10C99E;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.25s ease-in-out;
        }

        .contact-trigger-button:hover {
          background: #0eb58d !important;
          color: #FFFFFF !important;
        }

        .contact-trigger-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #10C99E;
          color: #FFFFFF;
          border: 1px solid #10C99E;
          border-radius: 5px;
          padding: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-trigger-icon:hover {
          background: #FFFFFF;
          color: #10C99E;
          border-color: #10C99E;
        }

        .contact-trigger-icon svg {
          fill: currentColor;
        }

        .contact-trigger-link {
          color: inherit;
          text-decoration: none;
          cursor: pointer;
        }

        .contact-trigger-link:hover {
          color: #469ADC;
        }
      `}</style>
    </>
  );
}
