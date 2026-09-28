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

    if (!invoice) {
      return res.status(400).json({
        ok: false,
        error: "لا توجد فاتورة لحفظها",
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        ok: false,
        error: "إعدادات Supabase غير موجودة",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          supplier: invoice.supplier || null,
          invoice_number: invoice.invoice_number || null,
          invoice_date: invoice.invoice_date || null,
          currency: invoice.currency || null,
          total_quantity: invoice.total_quantity || null,
          total_amount: invoice.total_amount || null,
          items: invoice.items || [],
          raw_data: invoice,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      message: "تم حفظ الفاتورة بنجاح",
      invoice: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message || "حدث خطأ أثناء حفظ الفاتورة",
    });
  }
}
