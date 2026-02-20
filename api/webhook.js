export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde a OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Responde a GET também (para teste da Asaas)
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'webhook ativo' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { event, payment } = req.body;

  console.log('Webhook recebido:', event, payment);

  try {
    if (event === 'PAYMENT_CONFIRMED') {
      console.log(`Pagamento confirmado: ${payment.id}`);
    }

    if (event === 'PAYMENT_RECEIVED') {
      console.log(`Pagamento recebido: ${payment.id}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
