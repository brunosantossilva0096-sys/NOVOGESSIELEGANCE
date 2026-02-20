export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { event, payment } = req.body;

  console.log('Webhook recebido:', event);

  try {
    // Eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, etc
    if (event === 'PAYMENT_CONFIRMED') {
      console.log(`Pagamento confirmado: ${payment.id}`);
      // Atualiza seu banco de dados, envia email, etc
    }

    if (event === 'PAYMENT_RECEIVED') {
      console.log(`Pagamento recebido: ${payment.id}`);
      // Libera acesso ao produto/serviço
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
