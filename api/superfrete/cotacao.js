export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) return res.status(500).send("Missing SUPERFRETE_TOKEN env var");

  const {
    to_postal_code,
    services = "1,2,17",
    options = {
      own_hand: false,
      receipt: false,
      insurance_value: 0,
      use_insurance_value: false
    },
    products
  } = req.body || {};

  if (!to_postal_code) {
    return res.status(400).send("to_postal_code is required");
  }
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).send("products must be a non-empty array");
  }

  const payload = {
    from: { postal_code: "65058619" },
    to: { postal_code: String(to_postal_code).replace(/\D/g, "") },
    services,
    options,
    products
  };

  const resp = await fetch("https://sandbox.superfrete.com/api/v0/calculator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
    },
    body: JSON.stringify(payload)
  });

  const contentType = resp.headers.get("content-type") || "application/json";
  const text = await resp.text();

  res.status(resp.status);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-store");
  return res.send(text);
}
