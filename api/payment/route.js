export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const body = req.body;

  // 1. Criar ou buscar o cliente (Customer)
  // 2. Criar a cobrança (Payment)
  
  const response = await fetch(`${process.env.ASAAS_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': process.env.ASAAS_API_KEY,
    },
    body: JSON.stringify({
      customer: "cus_000005047491", // Id do cliente retornado pelo Asaas
      billingType: "PIX",
      value: body.amount,
      dueDate: "2026-12-31",
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
