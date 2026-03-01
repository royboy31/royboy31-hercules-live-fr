// Cloudflare Pages Function - Proxies to Form Handler Worker
// Handles contact form submissions including file uploads to R2

interface Env {
  FORM_HANDLER_URL?: string;
}

interface FileData {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

const FORM_HANDLER_URL = 'https://hercules-form-handler-fr.gilles-86d.workers.dev';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max per file
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB max total

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request } = context;

  try {
    // Parse form data
    const formData = await request.formData();

    // Collect files with their data (base64 encoded)
    const files: FileData[] = [];
    let totalSize = 0;

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File && value.size > 0) {
        // Validate file size
        if (value.size > MAX_FILE_SIZE) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `File "${value.name}" is too large. Maximum size: 10MB`,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        totalSize += value.size;
        if (totalSize > MAX_TOTAL_SIZE) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Total file size exceeds 25MB',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        // Read file and convert to base64
        const arrayBuffer = await value.arrayBuffer();
        const base64Data = arrayBufferToBase64(arrayBuffer);

        files.push({
          name: value.name,
          type: value.type || 'application/octet-stream',
          size: value.size,
          data: base64Data,
        });
      }
    }

    // Build JSON payload with text fields
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        payload[key] = value;
      }
    }

    // Add Cloudflare tracking headers (server-side)
    payload.ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
    payload.country = request.headers.get('CF-IPCountry') || '';
    payload.city = request.headers.get('CF-IPCity') || ''; // Requires Cloudflare Pro+
    payload.region = request.headers.get('CF-IPRegion') || '';

    // Add files array to payload (will be processed by worker)
    if (files.length > 0) {
      payload.uploadFiles = files;
    }

    // Forward to Form Handler Worker
    const response = await fetch(`${FORM_HANDLER_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Contact form proxy error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};
