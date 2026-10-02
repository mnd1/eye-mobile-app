export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Use POST",
    });
  }

  try {
    const invoice = req.body?.invoice;

    if (!invoice || typeof invoice !== "object") {
      return res.status(400).json({
        ok: false,
        error: "لا توجد فاتورة صالحة للحفظ",
      });
    }

    if (!Array.isArray(invoice.items)) {
      return res.status(400).json({
        ok: false,
        error: "قائمة أصناف الفاتورة غير صالحة",
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        ok: false,
        error: "إعدادات Supabase غير موجودة على Vercel",
      });
    }

    const row = {
      supplier: invoice.supplier || null,

      invoice_number:
        invoice.invoice_number ||
        invoice.invoice_name ||
        null,

      invoice_date:
        invoice.invoice_date ||
        invoice.date ||
        null,

      currency: invoice.currency || null,

      total_quantity:
        invoice.total_quantity ?? null,

      total_amount:
        invoice.total_amount ??
        invoice.grand_total ??
        null,

      // The items JSON is stored in the same insert as the invoice, so the
      // invoice cannot be reported as saved without its parts.
      items: invoice.items,

      raw_data: invoice,
    };

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/invoices`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(row),
      }
    );

    const responseText = await response.text();
    let savedRows = [];

    if (responseText) {
      try {
        savedRows = JSON.parse(responseText);
      } catch {
        console.error("Invalid Supabase response:", responseText);
      }
    }

    if (!response.ok) {
      const details = savedRows?.message || savedRows?.details;
      console.error("Supabase insert error:", savedRows || responseText);

      return res.status(502).json({
        ok: false,
        error: details
          ? `تعذر حفظ الفاتورة: ${details}`
          : "تعذر حفظ الفاتورة في قاعدة البيانات",
      });
    }

    const savedInvoice = Array.isArray(savedRows)
      ? savedRows[0]
      : savedRows;

    return res.status(200).json({
      ok: true,
      message: "تم الحفظ",
      invoice: savedInvoice,
      saved_items_count: invoice.items.length,
    });

  } catch (error) {
    console.error(
      "Save invoice error:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "حدث خطأ أثناء حفظ الفاتورة",
    });
  }
}
