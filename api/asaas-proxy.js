/**
 * Vercel Serverless Function — Proxy seguro para a API Asaas
 *
 * URL de uso: /api/asaas-proxy?endpoint=/customers
 *
 * O token é lido da variável de ambiente ASAAS_API_TOKEN
 * configurada no painel da Vercel (Settings > Environment Variables).
 */

const ASAAS_API_URL = 'https://api.asaas.com/v3';

export default async function handler(req, res) {
    // CORS headers — permite chamadas do próprio domínio Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const token = process.env.ASAAS_API_TOKEN;
    if (!token) {
        return res.status(500).json({
            error: 'ASAAS_API_TOKEN não configurado nas variáveis de ambiente da Vercel.'
        });
    }

    // Endpoint destino, ex: ?endpoint=/payments
    const endpoint = req.query.endpoint || '/payments';
    const url = `${ASAAS_API_URL}${endpoint}`;

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'access_token': token,
                'User-Agent': 'GessiElegance/1.0',
            },
        };

        // Repassa o body para POST/PUT
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[asaas-proxy] Erro:', error);
        return res.status(500).json({
            error: 'Erro interno ao processar pagamento',
            details: error.message,
        });
    }
}
