export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { amount, email, name, type } = req.body;
  const apiKey = process.env.ASAAS_API_KEY;
  const apiUrl = 'https://api.asaas.com/v3';

  try {
    // Primeiro, cria ou busca o cliente
    const customerResponse = await fetch(`${apiUrl}/customers`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        email: email,
        phone: '11999999999' // Opcional
      })
    });

    const customerData = await customerResponse.json();
    
    if (!customerResponse.ok && customerData.errors) {
      // Se o cliente já existe, pega o ID do erro
      const customerId = customerData.errors[0]?.customerId || null;
      if (!customerId) {
        return res.status(400).json({ error: 'Erro ao criar cliente' });
      }
    }

    const customerId = customerData.id || customerData.errors?.[0]?.customerId;

    // Agora cria o pagamento
    const paymentBody = {
      customerId: customerId,
      billingType: type.toUpperCase(), // CREDIT_CARD, BOLETO, PIX
      value: parseFloat(amount),
      dueDate: new Date().toISOString().split('T')[0],
      description: 'Pagamento via site'
    };

    // Adiciona dados específicos por tipo
    if (type === 'CREDIT_CARD') {
      paymentBody.creditCard = {
        holderName: name,
        number: req.body.cardNumber,
        expiryMonth: req.body.expiryMonth,
        expiryYear: req.body.expiryYear,
        ccv: req.body.cvv
      };
      paymentBody.creditCardHolderInfo = {
        name: name,
        email: email,
        cpfCnpj: req.body.cpf,
        phone: req.body.phone
      };
    }

    const paymentResponse = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentBody)
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return res.status(400).json({ error: paymentData });
    }

    return res.status(200).json(paymentData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
