export async function calcularFrete({ to_postal_code, products }) {
  const r = await fetch("/api/superfrete/cotacao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to_postal_code,
      services: "1,2,17",
      products
    })
  });

  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();

  if (!r.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}
