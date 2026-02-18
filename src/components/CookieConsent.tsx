import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [preferences, setPreferences] = useState({
    functional: true,
    statistics: false,
    marketing: false,
  });

  useEffect(() => {
    const consentGiven = localStorage.getItem('cmplz_consent_given');
    if (!consentGiven) {
      // Delay showing the cookie banner to let the page load first
      const timer = setTimeout(() => {
        setIsVisible(true);
        document.body.style.overflow = 'hidden';
      }, 1500); // 1.5 second delay
      return () => clearTimeout(timer);
    } else {
      try {
        const savedPrefs = JSON.parse(localStorage.getItem('cmplz_preferences') || '{}');
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      } catch (e) {}
    }
    return () => { document.body.style.overflow = ''; };
  }, []);

  const saveConsent = (acceptAll: boolean, denyAll: boolean = false) => {
    let newPreferences = { ...preferences };
    if (acceptAll) {
      newPreferences = { functional: true, statistics: true, marketing: true };
    } else if (denyAll) {
      newPreferences = { functional: true, statistics: false, marketing: false };
    }
    localStorage.setItem('cmplz_consent_given', 'true');
    localStorage.setItem('cmplz_preferences', JSON.stringify(newPreferences));
    localStorage.setItem('cmplz_policy_id', '34');
    document.cookie = `cmplz_functional=allow;path=/;max-age=${365*24*60*60};SameSite=Lax`;
    document.cookie = `cmplz_statistics=${newPreferences.statistics ? 'allow' : 'deny'};path=/;max-age=${365*24*60*60};SameSite=Lax`;
    document.cookie = `cmplz_marketing=${newPreferences.marketing ? 'allow' : 'deny'};path=/;max-age=${365*24*60*60};SameSite=Lax`;
    setPreferences(newPreferences);
    setIsVisible(false);
    document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('cmplz_consent_updated', { detail: newPreferences }));
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="cmplz-overlay" />
      <div className="cmplz-cookiebanner" role="dialog" aria-modal="true" aria-labelledby="cmplz-header" aria-describedby="cmplz-message">
        {/* Header - Centered logo and title, no close button */}
        <div className="cmplz-header">
          <div className="cmplz-logo">
            <img
              width="50"
              height="22"
              src="/images/hercules-logo-small.webp"
              alt="Hercules Merchandise UK"
            />
          </div>
          <div className="cmplz-title" id="cmplz-header">Cookie Settings</div>
        </div>

        <div className="cmplz-divider"></div>

        {/* Body */}
        <div className="cmplz-body">
          <div className="cmplz-message" id="cmplz-message">
            <p>We use cookies to provide you with the best shopping experience. This includes cookies for site operation, analytics and personalised content.</p>
          </div>

          {/* Categories - shown when "Einstellungen" is clicked */}
          {showCategories && (
            <div className="cmplz-categories cmplz-fade-in">
              {/* Functional */}
              <details className="cmplz-category cmplz-functional" open>
                <summary>
                  <span className="cmplz-category-header">
                    <span className="cmplz-category-title">Necessary</span>
                    <span className="cmplz-always-active">
                      <span className="cmplz-banner-checkbox">
                        <input type="checkbox" checked disabled className="cmplz-consent-checkbox cmplz-functional" />
                        <label className="cmplz-label"></label>
                      </span>
                      Always active
                    </span>
                    <span className="cmplz-icon cmplz-open">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" height="18">
                        <path d="M224 416c-8.188 0-16.38-3.125-22.62-9.375l-192-192c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L224 338.8l169.4-169.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-192 192C240.4 412.9 232.2 416 224 416z"/>
                      </svg>
                    </span>
                  </span>
                </summary>
                <div className="cmplz-description">
                  These cookies are required for basic site functionality such as shopping cart and login.
                </div>
              </details>

              {/* Statistics */}
              <details className="cmplz-category cmplz-statistics">
                <summary>
                  <span className="cmplz-category-header">
                    <span className="cmplz-category-title">Statistics</span>
                    <span className="cmplz-banner-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={preferences.statistics}
                        onChange={() => setPreferences(p => ({...p, statistics: !p.statistics}))}
                        className="cmplz-consent-checkbox cmplz-statistics"
                      />
                      <label className="cmplz-label"></label>
                    </span>
                    <span className="cmplz-icon cmplz-open">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" height="18">
                        <path d="M224 416c-8.188 0-16.38-3.125-22.62-9.375l-192-192c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L224 338.8l169.4-169.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-192 192C240.4 412.9 232.2 416 224 416z"/>
                      </svg>
                    </span>
                  </span>
                </summary>
                <div className="cmplz-description">
                  Help us understand how visitors interact with the website.
                </div>
              </details>

              {/* Marketing */}
              <details className="cmplz-category cmplz-marketing">
                <summary>
                  <span className="cmplz-category-header">
                    <span className="cmplz-category-title">Marketing</span>
                    <span className="cmplz-banner-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={() => setPreferences(p => ({...p, marketing: !p.marketing}))}
                        className="cmplz-consent-checkbox cmplz-marketing"
                      />
                      <label className="cmplz-label"></label>
                    </span>
                    <span className="cmplz-icon cmplz-open">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" height="18">
                        <path d="M224 416c-8.188 0-16.38-3.125-22.62-9.375l-192-192c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L224 338.8l169.4-169.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-192 192C240.4 412.9 232.2 416 224 416z"/>
                      </svg>
                    </span>
                  </span>
                </summary>
                <div className="cmplz-description">
                  Used to display relevant advertising.
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Buttons - GDPR compliant: Accept and Reject must be equally visible */}
        <div className="cmplz-buttons">
          <button className="cmplz-btn cmplz-accept" onClick={() => saveConsent(true)}>
            Accept All
          </button>
          <button className="cmplz-btn cmplz-deny" onClick={() => saveConsent(false, true)}>
            Necessary Only
          </button>
        </div>
        <div className="cmplz-settings-link">
          {!showCategories ? (
            <button className="cmplz-link-btn" onClick={() => setShowCategories(true)}>
              Customise Settings
            </button>
          ) : (
            <button className="cmplz-link-btn" onClick={() => saveConsent(false)}>
              Save Selection
            </button>
          )}
        </div>
      </div>

      <style>{`
        .cmplz-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.65);
          z-index: 99998;
          backdrop-filter: blur(2px);
        }

        .cmplz-cookiebanner {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 480px;
          max-width: calc(100vw - 40px);
          max-height: calc(100vh - 40px);
          background: #ffffff;
          border-radius: 16px;
          padding: 24px 28px;
          z-index: 99999;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-family: 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-sizing: border-box;
          overflow: hidden;
          animation: cmplz-slideIn 0.3s ease-out;
        }

        @keyframes cmplz-slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        .cmplz-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }

        .cmplz-logo img {
          max-height: 45px;
          width: auto;
        }

        .cmplz-title {
          font-size: 18px;
          font-weight: 600;
          color: #253461;
          text-align: center;
        }

        .cmplz-divider {
          margin-left: -28px;
          margin-right: -28px;
          border-bottom: 1px solid #e5e7eb;
        }

        .cmplz-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          max-height: 50vh;
        }

        .cmplz-body::-webkit-scrollbar {
          width: 5px;
        }

        .cmplz-body::-webkit-scrollbar-thumb {
          background-color: #10c99e;
          border-radius: 10px;
        }

        .cmplz-message {
          font-size: 14px;
          line-height: 1.6;
          color: #4b5563;
          text-align: center;
        }

        .cmplz-message p {
          margin: 0;
        }

        .cmplz-categories {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cmplz-categories.cmplz-fade-in {
          animation: cmplz-fadeIn 0.3s ease;
        }

        @keyframes cmplz-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cmplz-category {
          background-color: rgba(239, 239, 239, 0.5);
          border-radius: 4px;
        }

        .cmplz-category summary {
          list-style: none;
          cursor: pointer;
          display: block;
        }

        .cmplz-category summary::-webkit-details-marker {
          display: none;
        }

        .cmplz-category-header {
          display: grid;
          grid-template-columns: 1fr auto 15px;
          align-items: center;
          gap: 10px;
          padding: 10px;
        }

        .cmplz-category-title {
          font-size: 14px;
          font-weight: 500;
          color: #253461;
        }

        .cmplz-always-active {
          font-size: 12px;
          font-weight: 500;
          color: green;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .cmplz-always-active .cmplz-banner-checkbox {
          display: none;
        }

        .cmplz-icon.cmplz-open {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }

        .cmplz-icon.cmplz-open svg {
          fill: #253461;
        }

        .cmplz-category[open] .cmplz-icon.cmplz-open {
          transform: rotate(180deg);
        }

        .cmplz-description {
          font-size: 12px;
          color: #253461;
          padding: 0 10px 10px;
          line-height: 1.5;
        }

        /* Toggle Switch */
        .cmplz-banner-checkbox {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cmplz-consent-checkbox {
          opacity: 0;
          position: absolute;
          cursor: pointer;
          width: 40px;
          height: 20px;
          z-index: 1;
          margin: 0;
        }

        .cmplz-label {
          position: relative;
          padding-left: 30px;
          cursor: pointer;
          display: block;
          height: 15px;
        }

        .cmplz-label:before {
          content: "";
          display: block;
          position: absolute;
          left: 0;
          top: 0;
          width: 28px;
          height: 15px;
          background-color: #F56E28;
          border-radius: 10px;
          transition: background-color 0.3s;
        }

        .cmplz-label:after {
          content: "";
          display: block;
          position: absolute;
          left: 4px;
          top: 2px;
          width: 11px;
          height: 11px;
          background: #ffffff;
          border-radius: 50%;
          transition: left 0.3s;
        }

        .cmplz-consent-checkbox:checked + .cmplz-label:before {
          background-color: #1e73be;
        }

        .cmplz-consent-checkbox:checked + .cmplz-label:after {
          left: 14px;
        }

        .cmplz-buttons {
          display: flex;
          gap: 12px;
        }

        .cmplz-btn {
          flex: 1;
          height: 48px;
          padding: 12px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          text-align: center;
          border: 2px solid;
          font-family: inherit;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .cmplz-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* GDPR Compliant: Both buttons must be equally visible and styled */
        .cmplz-btn.cmplz-accept {
          background-color: #10c99e;
          border-color: #10c99e;
          color: #ffffff;
        }

        .cmplz-btn.cmplz-accept:hover {
          background-color: #0eb38c;
          border-color: #0eb38c;
        }

        .cmplz-btn.cmplz-deny {
          background-color: #253461;
          border-color: #253461;
          color: #ffffff;
        }

        .cmplz-btn.cmplz-deny:hover {
          background-color: #1a2547;
          border-color: #1a2547;
        }

        .cmplz-settings-link {
          text-align: center;
          margin-top: -4px;
        }

        .cmplz-link-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 8px;
          transition: color 0.2s ease;
        }

        .cmplz-link-btn:hover {
          color: #253461;
        }

        @media (max-width: 768px) {
          .cmplz-cookiebanner {
            width: calc(100% - 32px);
            max-width: 400px;
            padding: 20px 24px;
          }

          .cmplz-buttons {
            flex-direction: column;
            gap: 10px;
          }

          .cmplz-btn {
            height: 50px;
          }
        }

        @media (max-width: 425px) {
          .cmplz-cookiebanner {
            width: calc(100% - 24px);
            padding: 18px 20px;
          }

          .cmplz-title {
            font-size: 16px;
          }

          .cmplz-message {
            font-size: 13px;
          }

          .cmplz-category-header {
            grid-template-columns: 1fr !important;
            gap: 5px;
          }
        }
      `}</style>
    </>
  );
}
