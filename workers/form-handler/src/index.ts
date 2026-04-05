/**
 * Hercules Form Handler Worker
 *
 * Centralized form handling for:
 * - Contact form submissions
 * - Newsletter signups
 * - Quote/quantity requests
 *
 * Integrations:
 * - Brevo (email sending)
 * - Google Sheets (data storage via Apps Script)
 */

interface Env {
  // Secrets (set via wrangler secret put)
  BREVO_API_KEY: string;
  GOOGLE_APPS_SCRIPT_URL: string;
  WEBHOOK_SECRET: string;

  // R2 Bucket for file uploads
  FORM_UPLOADS: R2Bucket;

  // Variables (set in wrangler.toml)
  SENDER_EMAIL: string;
  SENDER_NAME: string;
  COMPANY_EMAIL: string;
  R2_PUBLIC_URL: string;
  PRODUCT_SYNC_URL: string; // Product sync worker URL for fetching product configs
}

// File upload data structure
interface UploadedFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

interface UploadedFileResult {
  name: string;
  url: string;
  size: number;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ============================================================================
// TRACKING FIELD PARSERS
// ============================================================================

/**
 * Parse user agent string to extract browser name and version
 */
function parseBrowser(userAgent: string): string {
  if (!userAgent) return 'Unknown';

  // Check for common browsers (order matters for accuracy)
  if (userAgent.includes('Edg/')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    return `Edge ${match?.[1] || ''}`.trim();
  }
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) {
    const match = userAgent.match(/OPR\/(\d+)/);
    return `Opera ${match?.[1] || ''}`.trim();
  }
  if (userAgent.includes('Chrome/') && !userAgent.includes('Chromium')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return `Chrome ${match?.[1] || ''}`.trim();
  }
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    return `Safari ${match?.[1] || ''}`.trim();
  }
  if (userAgent.includes('Firefox/')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    return `Firefox ${match?.[1] || ''}`.trim();
  }

  return 'Other';
}

/**
 * Parse user agent string to extract OS name
 */
function parseOS(userAgent: string): string {
  if (!userAgent) return 'Unknown';

  if (userAgent.includes('Windows NT 10')) return 'Windows 10/11';
  if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
  if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Linux')) return 'Linux';

  return 'Unknown';
}

/**
 * Determine device type from screen dimensions and user agent
 */
function parseDeviceType(screenWidth: string, userAgent: string): string {
  const width = parseInt(screenWidth, 10);

  // First check user agent for mobile/tablet indicators
  if (userAgent) {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') && !userAgent.includes('Tablet')) {
      return 'Mobile';
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return 'Tablet';
    }
  }

  // Fall back to screen width
  if (!isNaN(width)) {
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'Desktop';
  }

  return 'Unknown';
}

// ============================================================================
// BREVO EMAIL FUNCTIONS
// ============================================================================

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface BrevoAttachment {
  name: string;
  content: string; // base64 encoded
}

interface SendEmailParams {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  replyTo?: EmailRecipient;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: BrevoAttachment[];
}

async function sendEmail(
  env: Env,
  params: SendEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: env.SENDER_NAME,
          email: env.SENDER_EMAIL,
        },
        to: params.to,
        cc: params.cc,
        replyTo: params.replyTo,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
        ...(params.attachment && params.attachment.length > 0 ? { attachment: params.attachment } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Brevo API error:', errorData);
      return { success: false, error: `Brevo API error: ${response.status} - ${errorData}` };
    }

    const result = (await response.json()) as { messageId?: string };
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Brevo send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// GOOGLE SHEETS FUNCTIONS
// ============================================================================

async function saveToGoogleSheets(
  env: Env,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  if (!env.GOOGLE_APPS_SCRIPT_URL) {
    return { success: false, error: 'Google Apps Script URL not configured' };
  }

  try {
    const params = new URLSearchParams(data);
    const urlWithParams = `${env.GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`;

    const response = await fetch(urlWithParams, {
      method: 'GET',
      redirect: 'follow',
    });

    const responseText = await response.text();
    const success = responseText.includes('success') || responseText.includes('Data saved') || response.ok;

    return { success };
  } catch (error) {
    console.error('Google Sheets error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// R2 FILE UPLOAD FUNCTIONS
// ============================================================================

/**
 * Convert base64 string to Uint8Array for R2 upload
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a unique filename for R2 storage
 * Format: YYYY/MM/DD/timestamp-randomid-originalname
 */
function generateR2Key(originalName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime();
  const randomId = Math.random().toString(36).substring(2, 8);

  // Sanitize filename - keep extension, remove special chars
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/__+/g, '_');

  return `${year}/${month}/${day}/${timestamp}-${randomId}-${sanitizedName}`;
}

/**
 * Upload files to R2 bucket and return public URLs
 */
async function uploadFilesToR2(
  env: Env,
  files: UploadedFile[]
): Promise<{ success: boolean; files: UploadedFileResult[]; error?: string }> {
  if (!env.FORM_UPLOADS) {
    console.error('R2 bucket FORM_UPLOADS not configured');
    return { success: false, files: [], error: 'File storage not configured' };
  }

  const uploadedFiles: UploadedFileResult[] = [];

  try {
    for (const file of files) {
      const key = generateR2Key(file.name);
      const data = base64ToUint8Array(file.data);

      // Upload to R2
      await env.FORM_UPLOADS.put(key, data, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Generate public URL
      const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

      uploadedFiles.push({
        name: file.name,
        url: publicUrl,
        size: file.size,
      });

      console.log(`Uploaded file: ${file.name} -> ${publicUrl}`);
    }

    return { success: true, files: uploadedFiles };
  } catch (error) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      files: uploadedFiles,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// ============================================================================
// EMAIL TEMPLATES (Matching WordPress Pearl Plugin Style)
// ============================================================================

const SITE_URL = 'https://hercules-merchandising.fr';
const LOGO_URL = 'https://hercules-merchandising.fr/wp-content/plugins/pearl-wc-steps-variation/includes/mail_templates/img/logo.png';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getEmailHeader(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 10px 0;">
      <tr>
        <td style="width:50%; padding:20px 0;">
          <img src="${LOGO_URL}" alt="Hercules Merchandising" style="max-width:180px; display:block;">
        </td>
        <td style="width:50%; text-align:right; padding:20px 0; font-size:14px; color:#444;">
          <span style="display:inline-block; margin-right:8px;">📧</span>
          <a href="mailto:info@hercules-merchandising.fr" style="color:#253461; text-decoration:none;">info@hercules-merchandising.fr</a><br>
          <span style="display:inline-block; margin-right:8px;">☎</span>
          <a href="tel:+33973030295" style="color:#253461; text-decoration:none;">09 73 03 02 95</a>
        </td>
      </tr>
    </table>
  `;
}

function getEmailFooter(): string {
  return `
    <div style="background:#f5f5f5; font-size:13px; color:#777; text-align:center; padding:20px 40px; line-height:1.6; margin-top:30px;">
      <p>Si vous avez des questions, répondez simplement à cet e-mail ou <a href="${SITE_URL}/contactez-nous/" style="color:#253461; text-decoration:none;">contactez-nous ici</a>.</p>
      <div style="margin-top:0; font-size:12px; text-align:center; color:#999;">
        <p>
          <a href="${SITE_URL}" style="color:#253461; text-decoration:none;"><strong>Hercules Merchandising</strong></a>
          <strong style="color:#000;"> | </strong>
          <a href="${SITE_URL}/conditions-generales-dutilisation/" style="color:#253461; text-decoration:none;"><strong>Conditions générales</strong></a>
          <strong style="color:#000;"> | </strong>
          <a href="${SITE_URL}/mon-compte/" style="color:#253461; text-decoration:none;"><strong>Mon compte</strong></a><br>
          📧 <a href="mailto:info@hercules-merchandising.fr" style="color:#253461; text-decoration:none;">info@hercules-merchandising.fr</a><br>
          ☎ <a href="tel:+33973030295" style="color:#253461; text-decoration:none;">09 73 03 02 95</a><br>
          🌐 <a href="${SITE_URL}" style="color:#253461; text-decoration:none;">${SITE_URL}</a>
        </p>
      </div>
    </div>
  `;
}

function getContactFormEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  time: string;
  pageTitle: string;
  pageUrl: string;
  files: string;
  uploadedFiles?: UploadedFileResult[];
}): string {
  // Generate file links HTML
  let filesHtml = '';
  if (data.uploadedFiles && data.uploadedFiles.length > 0) {
    const fileLinks = data.uploadedFiles.map(file => {
      const sizeKB = Math.round(file.size / 1024);
      const sizeDisplay = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
      return `<a href="${escapeHtml(file.url)}" target="_blank" style="color:#469ADC; text-decoration:none;">📎 ${escapeHtml(file.name)}</a> <span style="color:#888; font-size:12px;">(${sizeDisplay})</span>`;
    });
    filesHtml = `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Fichiers joints :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${fileLinks.join('<br>')}</td>
      </tr>
    `;
  } else if (data.files) {
    filesHtml = `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Fichiers joints :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.files)}</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Demande de contact - Hercules Merchandising</title>
  <style>
    body { margin:0; padding:0; background:#ffffff; color:#000; font-family:Arial,sans-serif; font-size:13px; }
    .container { max-width:700px; margin:0 auto; padding:20px 16px; }
    a { color:#253461; text-decoration:none; }
    .btn { display:inline-block; padding:10px 20px; font-weight:bold; text-decoration:none; border-radius:80px; min-width:130px; text-align:center; }
    .btn-green { background:#10C99E; color:#fff !important; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader()}

    <p>Bonjour <strong>${escapeHtml(data.name)}</strong>,</p>
    <p>Merci pour votre demande de contact chez <strong>Hercules Merchandising</strong>. Nous avons bien reçu le message suivant :</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 20px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Nom :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.name)}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>E-mail :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.email)}</td>
      </tr>
      ${data.phone ? `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Téléphone :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.phone)}</td>
      </tr>
      ` : ''}
      ${data.message ? `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc; vertical-align:top;"><strong>Message :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.message).replace(/\n/g, '<br>')}</td>
      </tr>
      ` : ''}
      ${filesHtml}
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Page :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><a href="${escapeHtml(data.pageUrl)}">${escapeHtml(data.pageTitle)}</a></td>
      </tr>
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Date/Heure :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.date)} à ${escapeHtml(data.time)}</td>
      </tr>
    </table>

    <p>Nous vous répondrons dans les plus brefs délais.</p>

    ${getEmailFooter()}
  </div>
</body>
</html>
`;
}

function getQuantityRequestEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  time: string;
  productName: string;
  productId: string;
  quantity: string;
  pricePerPiece: string;
  desiredDate: string;
  attributes: string;
  addons: string;
  pageUrl: string;
  formType?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Demande de devis - Hercules Merchandising</title>
  <style>
    body { margin:0; padding:0; background:#ffffff; color:#000; font-family:Arial,sans-serif; font-size:13px; }
    .container { max-width:700px; margin:0 auto; padding:20px 16px; }
    a { color:#253461; text-decoration:none; }
    .divider { display:block; width:100%; margin:8px 0; border:2px solid #000; }
    .btn { display:inline-block; padding:10px 20px; font-weight:bold; text-decoration:none; border-radius:80px; min-width:130px; text-align:center; }
    .btn-grey { background:#e0e0e0; color:#333 !important; }
    .btn-green { background:#10C99E; color:#fff !important; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader()}

    <p>Bonjour <strong>${escapeHtml(data.name)}</strong>,</p>
    <p>Merci pour votre demande de devis chez <strong>Hercules Merchandising</strong>.</p>

    <!-- Customer Details -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 20px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Nom :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.name)}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>E-mail :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.email)}</td>
      </tr>
      ${data.phone ? `
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Téléphone :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.phone)}</td>
      </tr>
      ` : ''}
    </table>

    <!-- Product Section -->
    <h3 style="font-size:16px; margin:24px 0 10px;">${escapeHtml(data.productName)}</h3>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
            ${data.attributes ? `
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Options sélectionnées</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;">${escapeHtml(data.attributes)}</td>
            </tr>
            ` : ''}
            ${data.addons ? `
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Options supplémentaires</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;">${escapeHtml(data.addons).replace(/\n/g, '<br>')}</td>
            </tr>
            ` : ''}
            ${data.formType === 'expressdelivery' || data.formType === 'express_delivery' ? `
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Quantité</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;">${escapeHtml(data.quantity)}</td>
            </tr>
            ` : ''}
            ${data.desiredDate ? `
            <tr>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc;">Date de livraison souhaitée</td>
              <td style="padding:4px 6px; border-bottom:1px solid #ccc; text-align:right;">${(() => { const m = data.desiredDate.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}-${m[2]}-${m[1].slice(2)}` : escapeHtml(data.desiredDate); })()}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <span class="divider"></span>

    ${data.message ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:15px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc; vertical-align:top;"><strong>Message supplémentaire :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.message).replace(/\n/g, '<br>')}</td>
      </tr>
    </table>
    ` : ''}

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:15px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Lien produit :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><a href="${escapeHtml(data.pageUrl)}">${escapeHtml(data.pageUrl)}</a></td>
      </tr>
      <tr>
        <td style="padding:6px 8px;"><strong>Date/Heure :</strong></td>
        <td style="padding:6px 8px;">${escapeHtml(data.date)} à ${escapeHtml(data.time)}</td>
      </tr>
    </table>

    <!-- CTAs -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td style="text-align:right;">
          <a class="btn btn-green" href="${SITE_URL}/contactez-nous/" style="margin-left:10px;">Nous contacter</a>
        </td>
      </tr>
    </table>

    <br>
    <p style="text-align:center; color:#253461; margin:0;">
      Nous vous enverrons un devis dans les plus brefs délais.<br>
      Les conditions générales de vente d'Hercules Merchandising s'appliquent.
    </p>

    ${getEmailFooter()}
  </div>
</body>
</html>
`;
}

function getNewsletterNotificationEmailHtml(data: {
  email: string;
  date: string;
  time: string;
  source: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nouvel abonnement à la newsletter - Hercules Merchandising</title>
  <style>
    body { margin:0; padding:0; background:#ffffff; color:#000; font-family:Arial,sans-serif; font-size:13px; }
    .container { max-width:700px; margin:0 auto; padding:20px 16px; }
    a { color:#253461; text-decoration:none; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader()}

    <h2 style="color:#10C99E; margin:20px 0 10px;">Nouvel abonnement à la newsletter</h2>
    <p>Une nouvelle personne s'est abonnée à la newsletter :</p>

    <div style="background:#E0F9F3; padding:20px; border-radius:10px; text-align:center; margin:20px 0;">
      <div style="font-size:18px; font-weight:bold; color:#253461;">${escapeHtml(data.email)}</div>
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:20px 0;">
      <tr>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;"><strong>Date :</strong></td>
        <td style="padding:6px 8px; border-bottom:1px solid #ccc;">${escapeHtml(data.date)} à ${escapeHtml(data.time)}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;"><strong>Source :</strong></td>
        <td style="padding:6px 8px;">${escapeHtml(data.source)}</td>
      </tr>
    </table>

    ${getEmailFooter()}
  </div>
</body>
</html>
`;
}

// ============================================================================
// REQUEST HANDLERS
// ============================================================================

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  time: string;
  pageTitle: string;
  pageUrl: string;
  files: string;
  formType: string;
  productName: string;
  productId: string;
  quantity: string;
  pricePerPiece: string;
  desiredDate: string;
  attributes: string;
  addons: string;
  // Tracking fields
  referrer: string;
  browser: string;
  os: string;
  deviceType: string;
  ip: string;
  country: string;
  city: string;
  language: string;
}

async function parseRequestBody(request: Request): Promise<Partial<ContactFormData> & { uploadFiles?: UploadedFile[]; _files?: File[] }> {
  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const body: Record<string, any> = {};

    // Extract all text fields
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        body[key] = value;
      }
    }

    // Extract files (file_0, file_1, ...) and convert to base64
    const uploadFiles: UploadedFile[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File && value.size > 0) {
        const arrayBuffer = await value.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64 = btoa(binary);
        uploadFiles.push({ name: value.name, type: value.type, size: value.size, data: base64 });
      }
    }
    if (uploadFiles.length > 0) {
      body.uploadFiles = uploadFiles;
    }
    return body;
  }

  return await request.json() as Partial<ContactFormData> & { uploadFiles?: UploadedFile[] };
}

function cleanAddons(raw: string): string {
  if (!raw) return '';
  return raw
    .split(/,\s*|\n/)
    .map(part => part.replace(/^Addon\s+#?\d+:\s*/i, '').trim())
    .filter(v => v !== '')
    .join('\n');
}

async function enrichAddons(rawAddons: string, pageUrl: string, productSyncUrl?: string): Promise<string> {
  if (!rawAddons) return '';

  const values = rawAddons.split('\n').filter(v => v.trim());

  // Extract product slug from page URL (e.g. /products/casquette-de-baseball)
  const slugMatch = pageUrl.match(/\/products\/([^/?#]+)/i);
  if (!slugMatch) {
    return values.join('\n');
  }

  const slug = slugMatch[1];
  let addonsConfig: any[] = [];
  try {
    const syncUrl = productSyncUrl || 'https://hercules-product-sync-fr-prod.gilles-86d.workers.dev';
    const resp = await fetch(`${syncUrl}/product-config/${slug}`);
    if (resp.ok) {
      const cfg = await resp.json() as any;
      addonsConfig = cfg.addons || [];
    }
  } catch { /* return best-effort on error */ }

  const result: string[] = [];
  for (const val of values) {
    const trimmed = val.trim();
    if (!trimmed) continue;

    // Already formatted as "addonName: value" by the frontend — keep as-is but translate None
    const colonIdx = trimmed.indexOf(': ');
    if (colonIdx > 0 && addonsConfig.some((a: any) => (a.name || a.title) === trimmed.substring(0, colonIdx))) {
      const valPart = trimmed.substring(colonIdx + 2);
      const displayVal = valPart.toLowerCase() === 'none' ? 'Aucun' : valPart;
      result.push(`${trimmed.substring(0, colonIdx)}: ${displayVal}`);
      continue;
    }

    // Translate "None" to French
    const displayValue = trimmed.toLowerCase() === 'none' ? 'Aucun' : trimmed;

    // Find the addon whose options include this value
    let found = false;
    for (const addon of addonsConfig) {
      const addonName: string = addon.name || addon.title || '';
      if (!addonName || !Array.isArray(addon.options)) continue;
      if (addon.options.some((o: any) => o.name === trimmed)) {
        result.push(`${addonName}: ${displayValue}`);
        found = true;
        break;
      }
    }
    if (!found) result.push(displayValue);
  }

  return result.join('\n');
}

async function handleContactForm(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseRequestBody(request);

    // Build name from firstName + lastName if provided
    const firstName = (body as any).firstName || '';
    const lastName = (body as any).lastName || '';
    const name = firstName && lastName ? `${firstName} ${lastName}` : body.name || '';

    // Get current date/time in French format
    const now = new Date();
    const date = body.date || now.toLocaleDateString('fr-FR');
    const time = body.time || now.toLocaleTimeString('fr-FR');

    // Process file uploads to R2 if present
    let uploadedFiles: UploadedFileResult[] = [];
    let fileUploadError = '';

    if (body.uploadFiles && body.uploadFiles.length > 0) {
      console.log(`Processing ${body.uploadFiles.length} file(s) for upload`);
      const uploadResult = await uploadFilesToR2(env, body.uploadFiles);
      uploadedFiles = uploadResult.files;

      if (!uploadResult.success) {
        fileUploadError = uploadResult.error || 'File upload failed';
        console.error('File upload error:', fileUploadError);
      }
    }

    // Generate files string for backwards compatibility (with URLs if available)
    let filesString = body.files || '';
    if (uploadedFiles.length > 0) {
      filesString = uploadedFiles.map(f => `${f.name}: ${f.url}`).join('\n');
    }

    // Parse tracking fields from request
    const userAgent = (body as any).userAgent || '';
    const screenWidth = (body as any).screenWidth || '';

    const contactData: ContactFormData = {
      name,
      email: body.email || '',
      phone: body.phone || '',
      message: body.message || '',
      date,
      time,
      pageTitle: body.pageTitle || 'Unknown',
      pageUrl: body.pageUrl || 'Unknown',
      files: filesString,
      formType: body.formType || 'contact',
      productName: body.productName || '',
      productId: body.productId || '',
      quantity: body.quantity || '',
      pricePerPiece: body.pricePerPiece || '',
      desiredDate: body.desiredDate || '',
      attributes: body.attributes || '',
      addons: await enrichAddons(cleanAddons(body.addons || ''), body.pageUrl || '', env.PRODUCT_SYNC_URL),
      // Tracking fields - parsed from request
      referrer: (body as any).referrer || '(direct)',
      browser: parseBrowser(userAgent),
      os: parseOS(userAgent),
      deviceType: parseDeviceType(screenWidth, userAgent),
      ip: (body as any).ip || '',
      country: (body as any).country || '',
      city: (body as any).city || '',
      language: (body as any).language || '',
    };

    // Validate required fields
    if (!contactData.name || !contactData.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Track results
    let googleSheetsSuccess = false;
    let emailSuccess = false;
    let emailError = '';

    // 1. Save to Google Sheets (with file URLs and tracking fields)
    // Use formType as the type for proper sheet routing (quantity_request, expressdelivery, or contact)
    const sheetsResult = await saveToGoogleSheets(env, {
      type: contactData.formType || 'contact',
      name: contactData.name,
      // Also send firstName and lastName separately for quantity_request forms
      firstName: firstName,
      lastName: lastName,
      email: contactData.email,
      phone: contactData.phone,
      message: contactData.message,
      date: contactData.date,
      time: contactData.time,
      pageTitle: contactData.pageTitle,
      pageUrl: contactData.pageUrl,
      files: contactData.files, // Now contains URLs
      formType: contactData.formType,
      productName: contactData.productName,
      productId: contactData.productId,
      quantity: contactData.quantity,
      pricePerPiece: contactData.pricePerPiece,
      desiredDate: contactData.desiredDate,
      attributes: contactData.attributes,
      addons: contactData.addons,
      // Tracking fields
      referrer: contactData.referrer,
      browser: contactData.browser,
      os: contactData.os,
      deviceType: contactData.deviceType,
      ip: contactData.ip,
      country: contactData.country,
      city: contactData.city,
      language: contactData.language,
    });
    googleSheetsSuccess = sheetsResult.success;

    // 2. Send Email via Brevo (with clickable file links)
    if (env.BREVO_API_KEY) {
      try {
        const formType = contactData.formType;
        let subject: string;
        let htmlContent: string;

        if (formType === 'quantity' || formType === 'quantity_request' || contactData.productName) {
          // Quantity request / Product inquiry
          subject = `Demande de devis : ${contactData.productName || 'Produit'}`;
          htmlContent = getQuantityRequestEmailHtml({
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            message: contactData.message,
            date: contactData.date,
            time: contactData.time,
            productName: contactData.productName,
            productId: contactData.productId,
            quantity: contactData.quantity,
            pricePerPiece: contactData.pricePerPiece,
            desiredDate: contactData.desiredDate,
            attributes: contactData.attributes,
            addons: contactData.addons,
            pageUrl: contactData.pageUrl,
            formType: formType,
          });
        } else {
          // General contact form (with file URLs)
          subject = `Demande de contact de ${contactData.name}`;
          htmlContent = getContactFormEmailHtml({
            name: contactData.name,
            email: contactData.email,
            phone: contactData.phone,
            message: contactData.message,
            date: contactData.date,
            time: contactData.time,
            pageTitle: contactData.pageTitle,
            pageUrl: contactData.pageUrl,
            files: contactData.files,
            uploadedFiles: uploadedFiles, // Pass uploaded files for clickable links
          });
        }

        // Build Brevo file attachments from uploaded files (base64 data)
        const brevoAttachments: BrevoAttachment[] = [];
        if (body.uploadFiles && body.uploadFiles.length > 0) {
          for (const file of body.uploadFiles) {
            if (file.name && file.data) {
              brevoAttachments.push({
                name: file.name,
                content: file.data,
              });
            }
          }
          if (brevoAttachments.length > 0) {
            console.log(`[Brevo] Attaching ${brevoAttachments.length} file(s) to email`);
          }
        }

        // Send email based on form type (matching WordPress flow)
        // - Contact Form: TO admin, CC customer
        // - Express Delivery: TO admin only, Reply-To customer
        // - Quantity Request: TO admin, Reply-To customer
        let emailParams: SendEmailParams;

        if (formType === 'expressdelivery' || formType === 'express_delivery') {
          // Express delivery: TO admin, CC info, Reply-To customer
          emailParams = {
            to: [{ email: env.COMPANY_EMAIL, name: 'Hercules Merchandising' }],
            cc: [{ email: 'info@hercules-merchandise.com', name: 'Hercules Merchandise' }],
            replyTo: { email: contactData.email, name: contactData.name },
            subject: `Demande urgente de devis - ${contactData.productName || 'Express'}`,
            htmlContent,
            attachment: brevoAttachments.length > 0 ? brevoAttachments : undefined,
          };
        } else if (formType === 'quantity' || formType === 'quantity_request' || contactData.productName) {
          // Quantity request: TO admin, CC info, Reply-To customer
          emailParams = {
            to: [{ email: env.COMPANY_EMAIL, name: 'Hercules Merchandising' }],
            cc: [{ email: 'info@hercules-merchandise.com', name: 'Hercules Merchandise' }],
            replyTo: { email: contactData.email, name: contactData.name },
            subject,
            htmlContent,
            attachment: brevoAttachments.length > 0 ? brevoAttachments : undefined,
          };
        } else {
          // General contact form: TO admin, CC customer, Reply-To customer
          emailParams = {
            to: [{ email: env.COMPANY_EMAIL, name: 'Hercules Merchandising' }],
            cc: [{ email: contactData.email, name: contactData.name }],
            replyTo: { email: contactData.email, name: contactData.name },
            subject,
            htmlContent,
            attachment: brevoAttachments.length > 0 ? brevoAttachments : undefined,
          };
        }

        const emailResult = await sendEmail(env, emailParams);

        emailSuccess = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error || 'Unknown email error';
        }
      } catch (error) {
        emailError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Return response
    if (googleSheetsSuccess || emailSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Message sent successfully',
          details: { googleSheets: googleSheetsSuccess, email: emailSuccess, emailError: emailError || undefined },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message could not be sent',
          details: { googleSheets: googleSheetsSuccess, email: emailSuccess, emailError },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

async function handleNewsletter(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email?: string; source?: string };
    const email = body.email || '';

    // Validate email
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter a valid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get current date/time in French format
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const time = now.toLocaleTimeString('fr-FR');
    const source = body.source || 'Unknown';

    // Track results
    let googleSheetsSuccess = false;
    let emailSuccess = false;
    let emailError = '';

    // 1. Save to Google Sheets
    const sheetsResult = await saveToGoogleSheets(env, {
      type: 'newsletter',
      email,
      date,
      time,
      source,
    });
    googleSheetsSuccess = sheetsResult.success;

    // 2. Send notification email to company via Brevo
    if (env.BREVO_API_KEY) {
      try {
        const htmlContent = getNewsletterNotificationEmailHtml({ email, date, time, source });

        const emailResult = await sendEmail(env, {
          to: [{ email: env.COMPANY_EMAIL, name: 'Hercules Merchandising' }],
          replyTo: { email },
          subject: `Nouvel abonnement newsletter : ${email}`,
          htmlContent,
        });

        emailSuccess = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error || 'Unknown email error';
        }
      } catch (error) {
        emailError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Return response
    if (googleSheetsSuccess || emailSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Newsletter subscription successful',
          details: { googleSheets: googleSheetsSuccess, email: emailSuccess, emailError: emailError || undefined },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Subscription could not be processed',
          details: { googleSheets: googleSheetsSuccess, email: emailSuccess, emailError },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error('Newsletter form error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

async function handleStatus(env: Env): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      version: '1.3.0',
      config: {
        brevoConfigured: !!env.BREVO_API_KEY,
        googleSheetsConfigured: !!env.GOOGLE_APPS_SCRIPT_URL,
        r2Configured: !!env.FORM_UPLOADS,
        senderEmail: env.SENDER_EMAIL,
        companyEmail: env.COMPANY_EMAIL,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

/**
 * Serve files from R2 bucket publicly
 * URL format: /files/YYYY/MM/DD/timestamp-randomid-filename
 */
async function handleFileServe(request: Request, env: Env, key: string): Promise<Response> {
  if (!env.FORM_UPLOADS) {
    return new Response('File storage not configured', { status: 503 });
  }

  try {
    const object = await env.FORM_UPLOADS.get(key);

    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    headers.set('Access-Control-Allow-Origin', '*');

    // Get original filename from metadata for Content-Disposition
    const originalName = object.customMetadata?.originalName || key.split('/').pop() || 'file';
    headers.set('Content-Disposition', `inline; filename="${originalName}"`);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('File serve error:', error);
    return new Response('Error serving file', { status: 500 });
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Route handling (support both /contact and /api/contact)
    if ((path === '/contact' || path === '/api/contact') && request.method === 'POST') {
      return handleContactForm(request, env);
    }

    if ((path === '/newsletter' || path === '/api/newsletter') && request.method === 'POST') {
      return handleNewsletter(request, env);
    }

    if ((path === '/status' || path === '/api/status') && request.method === 'GET') {
      return handleStatus(env);
    }

    // Serve files from R2 - URL format: /files/YYYY/MM/DD/timestamp-randomid-filename
    if ((path.startsWith('/files/') || path.startsWith('/api/files/')) && request.method === 'GET') {
      const key = path.startsWith('/api/files/') ? path.substring(11) : path.substring(7);
      return handleFileServe(request, env, key);
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found', availableEndpoints: ['/contact', '/newsletter', '/status', '/files/*'] }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  },
};
