import { createClient } from "@supabase/supabase-js";

function fail(res, status, stage, error) {
  return res.status(status).json({ ok: false, stage, error });
}

function getSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!rawUrl || !key) {
    throw new Error("MISSING_CONFIG");
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_URL");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("INVALID_URL");
  }

  // createClient builds REST/Auth URLs from this value. Query strings, hashes,
  // whitespace, or a copied dashboard path can produce Safari's vague
  // "The string did not match the expected pattern" error downstream.
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");

  if (url.pathname && url.pathname !== "/") {
    throw new Error("INVALID_URL");
  }

  return { url: url.origin, key };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "request-method", "استخدم طلب POST");
  }

  const invoice = req.body?.invoice;
  if (!invoice || typeof invoice !== "object" || Array.isArray(invoice)) {
    return fail(res, 400, "request-validation", "لا توجد فاتورة صالحة للحفظ");
  }

  let config;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    const reason = error.message === "INVALID_URL" ? "invalid-url" : "missing";
    console.error("Save invoice configuration error", { reason });
    return fail(
      res,
      500,
      "server-configuration",
      reason === "invalid-url"
        ? "عنوان Supabase غير صالح؛ يجب أن يكون عنوان HTTPS الأساسي للمشروع"
        : "إعدادات Supabase غير مكتملة على الخادم"
    );
  }

  const row = {
    supplier: invoice.supplier || null,
    invoice_number: invoice.invoice_number || invoice.invoice_name || null,
    invoice_date: invoice.invoice_date || invoice.date || null,
    currency: invoice.currency || null,
    total_quantity: invoice.total_quantity ?? null,
    total_amount: invoice.total_amount ?? invoice.grand_total ?? null,
    items: Array.isArray(invoice.items) ? invoice.items : [],
    raw_data: invoice,
  };

  try {
    const supabase = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("invoices")
      .insert([row])
      .select()
      .single();

    if (error) {
      // Log only operational metadata. Never log the key, invoice, or request.
      console.error("Supabase insert failed", {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return fail(res, 502, "database-insert", "رفضت قاعدة البيانات حفظ الفاتورة");
    }

    return res.status(200).json({
      ok: true,
      message: "تم حفظ الفاتورة بنجاح",
      invoice: data,
    });
  } catch (error) {
    console.error("Save invoice request failed", {
      name: error?.name,
      message: error?.message,
    });
    return fail(res, 502, "database-request", "تعذر الاتصال بقاعدة البيانات");
  }
}
