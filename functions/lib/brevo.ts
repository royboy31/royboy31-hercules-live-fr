// Brevo (Sendinblue) Email Utility for Cloudflare Pages Functions

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = 'info@hercules-merchandise.co.uk';
const SENDER_NAME = 'Hercules Merchandise UK';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(apiKey: string, params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL
        },
        to: params.to,
        cc: params.cc,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Brevo API error:', errorData);
      return { success: false, error: `Brevo API error: ${response.status} - ${errorData}` };
    }

    const result = await response.json() as { messageId?: string };
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Brevo send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Email templates

export function getContactFormEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  time: string;
  pageTitle: string;
  pageUrl: string;
  files: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #253461; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #253461; display: block; margin-bottom: 5px; }
    .field-value { background: white; padding: 10px; border-radius: 5px; border: 1px solid #eee; }
    .footer { background: #253461; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
    .highlight { color: #469ADC; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Contact Request</h1>
    </div>
    <div class="content">
      <p>Thank you for your message! We have received the following enquiry:</p>

      <div class="field">
        <span class="field-label">Name:</span>
        <div class="field-value">${escapeHtml(data.name)}</div>
      </div>

      <div class="field">
        <span class="field-label">Email:</span>
        <div class="field-value">${escapeHtml(data.email)}</div>
      </div>

      ${data.phone ? `
      <div class="field">
        <span class="field-label">Phone:</span>
        <div class="field-value">${escapeHtml(data.phone)}</div>
      </div>
      ` : ''}

      ${data.message ? `
      <div class="field">
        <span class="field-label">Message:</span>
        <div class="field-value">${escapeHtml(data.message)}</div>
      </div>
      ` : ''}

      ${data.files ? `
      <div class="field">
        <span class="field-label">Attached Files:</span>
        <div class="field-value">${escapeHtml(data.files)}</div>
      </div>
      ` : ''}

      <div class="field">
        <span class="field-label">Page:</span>
        <div class="field-value"><a href="${escapeHtml(data.pageUrl)}">${escapeHtml(data.pageTitle)}</a></div>
      </div>

      <div class="field">
        <span class="field-label">Date/Time:</span>
        <div class="field-value">${escapeHtml(data.date)} at ${escapeHtml(data.time)}</div>
      </div>

      <p style="margin-top: 20px;">We will get back to you as soon as possible.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Hercules Merchandise. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function getQuantityRequestEmailHtml(data: {
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
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #253461; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .product-box { background: #E0F9F3; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .product-name { font-size: 18px; font-weight: bold; color: #253461; margin-bottom: 10px; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #253461; display: block; margin-bottom: 5px; }
    .field-value { background: white; padding: 10px; border-radius: 5px; border: 1px solid #eee; }
    .price { font-size: 20px; color: #10C99E; font-weight: bold; }
    .footer { background: #253461; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Quote Request</h1>
    </div>
    <div class="content">
      <p>Thank you for your quote request! Here are the details:</p>

      <div class="product-box">
        <div class="product-name">${escapeHtml(data.productName)}</div>
        <p><strong>Quantity:</strong> ${escapeHtml(data.quantity)} pieces</p>
        <p><strong>Price per piece:</strong> <span class="price">${escapeHtml(data.pricePerPiece)}</span></p>
        ${data.desiredDate ? `<p><strong>Desired delivery date:</strong> ${escapeHtml(data.desiredDate)}</p>` : ''}
      </div>

      ${data.attributes ? `
      <div class="field">
        <span class="field-label">Selected Options:</span>
        <div class="field-value">${escapeHtml(data.attributes)}</div>
      </div>
      ` : ''}

      ${data.addons ? `
      <div class="field">
        <span class="field-label">Add-on Options:</span>
        <div class="field-value">${escapeHtml(data.addons)}</div>
      </div>
      ` : ''}

      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

      <div class="field">
        <span class="field-label">Contact Details:</span>
        <div class="field-value">
          <strong>${escapeHtml(data.name)}</strong><br>
          Email: ${escapeHtml(data.email)}<br>
          ${data.phone ? `Phone: ${escapeHtml(data.phone)}` : ''}
        </div>
      </div>

      ${data.message ? `
      <div class="field">
        <span class="field-label">Additional Message:</span>
        <div class="field-value">${escapeHtml(data.message)}</div>
      </div>
      ` : ''}

      <div class="field">
        <span class="field-label">Product Link:</span>
        <div class="field-value"><a href="${escapeHtml(data.pageUrl)}">${escapeHtml(data.pageUrl)}</a></div>
      </div>

      <div class="field">
        <span class="field-label">Date/Time:</span>
        <div class="field-value">${escapeHtml(data.date)} at ${escapeHtml(data.time)}</div>
      </div>

      <p style="margin-top: 20px;">We will get back to you with a quote as soon as possible.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Hercules Merchandise. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

export function getNewsletterNotificationEmailHtml(data: {
  email: string;
  date: string;
  time: string;
  source: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10C99E; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .email-box { background: #E0F9F3; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
    .email-address { font-size: 18px; font-weight: bold; color: #253461; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #253461; }
    .footer { background: #253461; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Newsletter Sign-up</h1>
    </div>
    <div class="content">
      <p>A new person has signed up for the newsletter:</p>

      <div class="email-box">
        <div class="email-address">${escapeHtml(data.email)}</div>
      </div>

      <p><span class="field-label">Date:</span> ${escapeHtml(data.date)} at ${escapeHtml(data.time)}</p>
      <p><span class="field-label">Source:</span> ${escapeHtml(data.source)}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Hercules Merchandise. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
