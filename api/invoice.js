export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { image } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        ok: false,
        error: "لم يتم إرسال صورة الفاتورة"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY غير موجود"
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
اقرأ فاتورة قطع غيار الهواتف بدقة شديدة.

استخرج جميع الأصناف من أول سطر إلى آخر سطر.

أرجع JSON فقط بهذا الشكل:

{
  "supplier": "اسم المورد أو غير محدد",
  "invoice_name": "الاسم الظاهر أو غير محدد",
  "date": "التاريخ أو غير محدد",
  "currency": "العملة أو غير محدد",
  "items": [
    {
      "model": "اسم القطعة أو الموديل",
      "brand": "الماركة",
      "quantity": 0,
      "unit_price": 0,
      "total": 0
    }
  ],
  "total_quantity": 0,
  "grand_total": 0
}

لا تخمن المعلومات غير الواضحة.
استخدم null للأرقام غير الواضحة.
لا تكتب Markdown أو أي شرح خارج JSON.
`
              },
              {
                type: "input_image",
                image_url: image
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        ok: false,
        error:
          data?.error?.message ||
          "حدث خطأ أثناء قراءة الفاتورة"
      });
    }

    const text = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text || "")
      .join("\n")
      .trim();

    if (!text) {
      return res.status(500).json({
        ok: false,
        error: "لم يتم استلام نتيجة من الذكاء الاصطناعي"
      });
    }

    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let invoice;

    try {
      invoice = JSON.parse(cleaned);
    } catch (error) {
      console.error("JSON parse error:", error);
      console.error("AI output:", text);

      return res.status(500).json({
        ok: false,
        error: "تمت قراءة الفاتورة ولكن تعذر تنظيم البيانات"
      });
    }

    return res.status(200).json({
      ok: true,
      invoice
    });

  } catch (error) {
    console.error("Invoice API error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "حدث خطأ في الخادم"
    });
  }
}
