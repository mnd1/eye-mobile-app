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
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
أنت مساعد متخصص في قراءة فواتير قطع غيار الهواتف.

اقرأ صورة الفاتورة بدقة واستخرج:
- اسم المورد إن وجد
- التاريخ إن وجد
- أسماء القطع
- الماركة
- الموديل
- الكمية
- سعر الوحدة
- المجموع
- العملة

لا تخمن أي معلومة غير واضحة.

أعد النتيجة بالعربية بشكل مرتب وواضح.
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
    ?.trim();

return res.status(200).json({
  ok: true,
  message: text || "تم تحليل الفاتورة ولكن لم يتم إرجاع نص."
});
      
      
        

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message || "حدث خطأ في الخادم"
    });
  }
}
