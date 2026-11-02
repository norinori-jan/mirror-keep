// OPTIONAL: safer Cloudflare Worker proxy template. Configure JQUANTS_API_KEY as a Worker secret.
// Frontend direct-key mode works without this Worker, but sends the key from your browser to api.jquants.com.
export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const origin = request.headers.get('Origin') || '';
    const headers = {
      'Access-Control-Allow-Origin': allowedOrigin === '*' ? '*' : (origin === allowedOrigin ? allowedOrigin : 'null'),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers });
    if (!env.JQUANTS_API_KEY) return new Response('JQUANTS_API_KEY secret is missing', { status: 503, headers });
    const incoming = new URL(request.url);
    const code = incoming.searchParams.get('code') || '';
    const from = incoming.searchParams.get('from') || '';
    const to = incoming.searchParams.get('to') || '';
    if (!/^\d{5}$/.test(code) || !/^\d{8}$/.test(from) || !/^\d{8}$/.test(to) || from > to) {
      return new Response('Invalid code/from/to', { status: 400, headers });
    }
    const upstream = new URL('https://api.jquants.com/v2/equities/bars/daily');
    upstream.searchParams.set('code', code);
    upstream.searchParams.set('from', from);
    upstream.searchParams.set('to', to);
    const page = incoming.searchParams.get('pagination_key');
    if (page) upstream.searchParams.set('pagination_key', page);
    const response = await fetch(upstream, { headers: { 'x-api-key': env.JQUANTS_API_KEY } });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
