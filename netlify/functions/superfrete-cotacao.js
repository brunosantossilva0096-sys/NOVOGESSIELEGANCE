export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) {
    return { statusCode: 500, body: "Missing SUPERFRETE_TOKEN env var" };
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const {
    from_postal_code,
    to_postal_code,
    services = "1,2,17",
    options = {
      own_hand: false,
      receipt: false,
      insurance_value: 0,
      use_insurance_value: false
    },
    products
  } = input;

  if (!from_postal_code || !to_postal_code) {
    return { statusCode: 400, body: "from_postal_code and to_postal_code are required" };
  }
  if (!Array.isArray(products) || products.length === 0) {
    return { statusCode: 400, body: "products must be a non-empty array" };
  }

  const payload = {
    from: { postal_code: String(from_postal_code).replace(/\D/g, "") },
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

  const text = await resp.text();

  return {
    statusCode: resp.status,
    headers: {
      "Content-Type": resp.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store"
    },
    body: text
  };
}
