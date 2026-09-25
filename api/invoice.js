export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, currency = "USD" } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "Invoice image is required" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `اقرأ صورة هذه الفاتورة الخاصة بقطع الهواتف.
استخرج اسم كل قطعة، الموديل، الكمية، سعر الوحدة والمجموع إن وجد.
عملة الفاتورة هي ${currency}.
رتب النتيجة بشكل واضح ولا تخمّن أي معلومة غير ظاهرة في الصورة.`,
              },
              {
                type: "input_image",
                image_url: image,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed",
      });
    }

    return res.status(200).json({
      text: data.output_text || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error",
    });
  }
}
