import { createClient } from "@supabase/supabase-js";

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

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
        },
      }
    );

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

      items:
        Array.isArray(invoice.items)
          ? invoice.items
          : [],

      raw_data: invoice,
    };

    const { data, error } = await supabase
      .from("invoices")
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error(
        "Supabase insert error:",
        error
      );

      return res.status(500).json({
        ok: false,
        error: `Supabase: ${error.message}`,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "تم حفظ الفاتورة بنجاح",
      invoice: data,
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
