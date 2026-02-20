/**
 * Netlify Function: Asaas API Proxy
 * Routes requests to Asaas API securely — token never exposed to frontend.
 */
const ASAAS_API_URL = 'https://api.asaas.com/v3';
// Token carregado via variável de ambiente (seguro) ou fallback para produção
const ASAAS_TOKEN = process.env.ASAAS_API_TOKEN || 'cb44adc0-3e19-4e11-b8e6-7c1a378642da';

exports.handler = async (event) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    try {
        // Extract endpoint from query string: ?endpoint=/customers
        const params = new URLSearchParams(event.rawQuery || '');
        const endpoint = params.get('endpoint') || '/payments';
        const url = `${ASAAS_API_URL}${endpoint}`;

        const fetchOptions = {
            method: event.httpMethod,
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_TOKEN,
                'User-Agent': 'GessiElegance/1.0',
            },
        };

        if (event.body && ['POST', 'PUT', 'PATCH'].includes(event.httpMethod)) {
            fetchOptions.body = event.body;
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        return {
            statusCode: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Asaas proxy error:', error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Erro interno ao processar pagamento', details: error.message }),
        };
    }
};
