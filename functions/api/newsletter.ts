// Cloudflare Pages Function - Proxies to Form Handler Worker

interface Env {
  FORM_HANDLER_URL?: string;
}

const FORM_HANDLER_URL = 'https://hercules-form-handler-uk-production.gilles-86d.workers.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request } = context;

  try {
    // Parse form data and convert to JSON
    const formData = await request.formData();
    const email = formData.get('email') as string || '';
    const source = request.headers.get('Referer') || 'Unknown';

    // Forward to Form Handler Worker
    const response = await fetch(`${FORM_HANDLER_URL}/newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, source }),
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
    console.error('Newsletter proxy error:', error);
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
