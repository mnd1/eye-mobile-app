export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Use POST"
    });
  }

  return res.status(200).json({
    ok: true,
    message: "Invoice API is working"
  });
}
