export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Use POST"
    });
  }

  try {
    const { image } = req.body || {};

    if (!image) {
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

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: "gpt-5.6-luna",

          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `
أنت نظام متخصص بقراءة فواتير قطع غيار الهواتف.

اقرأ صورة الفاتورة بدقة شديدة.

المطلوب استخراج جميع الأصناف الموجودة في الفاتورة
من أول صنف إلى آخر صنف بدون حذف أي سطر.

أرجع JSON فقط بدون Markdown وبدون أي شرح.

استخدم هذا الشكل بالضبط:

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

قواعد مهمة جداً:
- لا تخمن أي معلومة غير واضحة.
- حافظ على أسماء الموديلات كما تظهر في الفاتورة.
- استخرج كل الأصناف بدون استثناء.
- quantity و unit_price و total يجب أن تكون أرقاماً عندما تكون واضحة.
- إذا كان رقم غير واضح استخدم null.
- total لكل صنف هو المجموع الموجود في الفاتورة وليس رقماً مخمناً.
- لا تضع أي نص قبل أو بعد JSON.
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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(response.status).json({
        ok: false,
        error:
          data?.error?.message ||
          "حدث خطأ أثناء قراءة الفاتورة"
      });
    }

    const text =
      data.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n")
        ?.trim() || "";

    if (!text) {
      return res.status(500).json({
        ok: false,
        error: "لم يتم استلام نتيجة من الذكاء الاصطناعي"
      });
    }

    let invoice;

    try {
      const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      invoice = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("AI output:", text);

      return res.status(500).json({
        ok: false,
        error: "تمت قراءة الفاتورة ولكن تعذر تنظيم البيانات",
        raw: text
      });
    }

    return res.status(200).json({
      ok: true,
      invoice
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message || "حدث خطأ في الخادم"
    });
  }
}
