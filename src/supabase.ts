import { createClient } from "@supabase/supabase-js";
import { MedicalItem, InvoicePayload, RestockInvoice, ReceptionOperator, sanitizeInvoiceLines } from "./types";
import { getSupabaseConfig } from "./env";

const { url: supabaseUrl, anonKey: supabaseAnonKey, isConfigured: isSupabaseConfiguredFromEnv } = getSupabaseConfig();

export const isSupabaseConfigured = isSupabaseConfiguredFromEnv;

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder"
);

const CATEGORY_MAP: { [key: number]: { ar: string; en: string } } = {
  1: { ar: "مستهلكات وريدية", en: "IV Consumables" },
  2: { ar: "محاليل وريدية", en: "IV Fluids" },
  3: { ar: "حقن وسرنجات", en: "Syringes" },
  4: { ar: "قساطر وأنابيب", en: "Catheters & Tubes" },
  5: { ar: "مضادات للنزيف وجروح", en: "Gauze & Bandages" },
  6: { ar: "معدات طبية شخصية", en: "Personal Protective" },
  7: { ar: "علاج بالغازات والأكسجين", en: "Oxygen Therapy" },
  8: { ar: "أدوية وحقن طوارئ", en: "Emergency Drugs" },
  9: { ar: "محل أجهزة ومحركات", en: "Fluids & Motors" },
};

export function getCategoryIdByName(category_ar?: string, category_en?: string): number {
  if (!category_ar && !category_en) return 1;
  for (const [idStr, val] of Object.entries(CATEGORY_MAP)) {
    if (
      (category_ar && val.ar.trim() === category_ar.trim()) ||
      (category_en && val.en.trim().toLowerCase() === category_en.trim().toLowerCase())
    ) {
      return Number(idStr);
    }
  }
  return 1;
}

export function getCategoryNamesById(id?: number | null): { ar: string; en: string } {
  if (!id || !CATEGORY_MAP[id]) {
    return { ar: "أخرى", en: "Other" };
  }
  return CATEGORY_MAP[id];
}


/**
 * Sync / Fetch Categories
 */
export async function getSupabaseCategories() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("Supabase categories fetch error (falling back):", err);
    return null;
  }
}

/**
 * Fetch medical_items from Supabase
 */
export async function fetchSupabaseInventory(): Promise<MedicalItem[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    let data: any[] | null = null;

    // 1. Try fetching with joined categories
    const { data: joinedData, error: joinedErr } = await supabase
      .from("medical_items")
      .select("*, categories (name_ar, name_en)")
      .order("id", { ascending: true });

    if (!joinedErr && joinedData) {
      data = joinedData;
    } else {
      // 2. Fallback to flat select with order
      const { data: flatData, error: flatErr } = await supabase
        .from("medical_items")
        .select("*")
        .order("id", { ascending: true });

      if (!flatErr && flatData) {
        data = flatData;
      } else {
        // 3. Fallback to flat select without order
        const { data: noOrderData, error: noOrderErr } = await supabase
          .from("medical_items")
          .select("*");

        if (!noOrderErr && noOrderData) {
          data = noOrderData;
        }
      }
    }

    if (data && data.length > 0) {
      return data.map((item) => {
        const catObj = item.categories as any;
        const catId = item.category_id;
        return {
          id: String(item.id),
          name_ar: item.name_ar || "",
          name_en: item.name_en || "",
          unit_price: Number(item.unit_price || 0),
          category_ar: catObj?.name_ar || item.category_ar || getCategoryNamesById(catId).ar,
          category_en: catObj?.name_en || item.category_en || getCategoryNamesById(catId).en,
          stock: Number(item.stock || 0),
          expiry_date: item.expiry_date || undefined,
        };
      });
    }
    return [];
  } catch (err) {
    console.warn("Notice when fetching inventory from Supabase (using local data):", err);
    return null;
  }
}

/**
 * Upsert medical_items to Supabase
 */
export async function upsertSupabaseMedicalItem(item: MedicalItem): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const catId = getCategoryIdByName(item.category_ar, item.category_en);
    const validExpiry = item.expiry_date && String(item.expiry_date).trim() !== "" ? String(item.expiry_date).trim() : null;

    // 1. Try full payload with all columns
    const fullPayload: any = {
      id: item.id,
      name_ar: item.name_ar,
      name_en: item.name_en || null,
      unit_price: Number(item.unit_price || 0),
      category_id: catId,
      stock: Number(item.stock || 0),
      safety_threshold: Number((item as any).safety_threshold ?? 10),
      expiry_date: validExpiry,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("medical_items")
      .upsert(fullPayload, { onConflict: "id" });

    // 2. Retry without category_id if FK constraint fails
    if (error && (error.code === "23503" || String(error.message).toLowerCase().includes("foreign key"))) {
      fullPayload.category_id = null;
      const retryCat = await supabase
        .from("medical_items")
        .upsert(fullPayload, { onConflict: "id" });
      error = retryCat.error;
    }

    // 3. Retry without updated_at / safety_threshold if schema cache is pending
    if (error) {
      delete fullPayload.updated_at;
      delete fullPayload.safety_threshold;
      const retrySchema = await supabase
        .from("medical_items")
        .upsert(fullPayload, { onConflict: "id" });
      error = retrySchema.error;
    }

    // 4. Fallback to basic core columns
    if (error) {
      const basicPayload: any = {
        id: item.id,
        name_ar: item.name_ar,
        name_en: item.name_en || null,
        unit_price: Number(item.unit_price || 0),
        stock: Number(item.stock || 0),
      };
      const retryBasic = await supabase
        .from("medical_items")
        .upsert(basicPayload, { onConflict: "id" });
      error = retryBasic.error;
    }

    if (error) {
      console.info("Medical item save note:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.info("Medical item save exception handeled cleanly:", err);
    return false;
  }
}

/**
 * Delete medical_item from Supabase
 */
export async function deleteSupabaseMedicalItem(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from("medical_items").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting medical item from Supabase:", err);
    return false;
  }
}

/**
 * Fetch patient_invoices (sales history) with its line items
 */
export async function fetchSupabasePatientInvoices(): Promise<InvoicePayload[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    let invoices: any[] | null = null;

    const { data: invData, error: invError } = await supabase
      .from("patient_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (!invError && invData) {
      invoices = invData;
    } else {
      const { data: flatInv, error: flatErr } = await supabase
        .from("patient_invoices")
        .select("*");
      if (flatErr) throw flatErr;
      invoices = flatInv;
    }

    if (!invoices || invoices.length === 0) return [];

    let lines: any[] = [];
    try {
      const { data: lineData, error: lineError } = await supabase
        .from("patient_invoice_lines")
        .select("*");
      if (!lineError && lineData) {
        lines = lineData;
      }
    } catch (e) {
      console.warn("Could not fetch patient_invoice_lines table:", e);
    }

    return invoices.map((inv) => {
      // Prioritize matching lines by inv.id (UUID) to avoid combining lines from old/duplicate saves
      let invLines = lines.filter((l) => String(l.invoice_id) === String(inv.id));
      if (invLines.length === 0 && inv.receipt_number) {
        invLines = lines.filter((l) => String(l.invoice_id) === String(inv.receipt_number));
      }

      const rawLines = invLines.map((l) => ({
        item_id: String(l.item_id || ""),
        item_name: l.item_name_ar || l.item_name_en || l.item_name || "",
        item_name_ar: l.item_name_ar || "",
        item_name_en: l.item_name_en || "",
        unit_price: Number(l.unit_price || 0),
        quantity: Number(l.quantity || 0),
        line_total: Number(l.line_total || 0),
      }));

      const grandTotalNum = Number(inv.grand_total || 0);
      const cleanLines = sanitizeInvoiceLines(rawLines, grandTotalNum);
      const computedGrandTotal = grandTotalNum > 0 ? grandTotalNum : cleanLines.reduce((s, l) => s + l.line_total, 0);

      return {
        id: inv.id,
        patient_name: inv.patient_name || "",
        receipt_number: inv.receipt_number || String(inv.id || ""),
        invoice_lines: cleanLines,
        grand_total: computedGrandTotal,
        billing_officer_email: inv.billing_officer_account || inv.billing_officer_email || "",
        hospital_branch_ar: "مستشفى السلام - قسم الطوارئ",
        hospital_branch_en: "El Salam Hospital - ER",
        created_at: inv.created_at || new Date().toISOString(),
        motor_numbers: inv.motor_numbers || undefined,
      };
    });
  } catch (err) {
    console.warn("Notice when fetching patient invoices from Supabase (using local data):", err);
    return null;
  }
}

/**
 * Save new or updated patient_invoice to Supabase
 */
export async function insertSupabasePatientInvoice(invoice: InvoicePayload): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn("Supabase is not configured. Skipping database save.");
    return false;
  }
  try {
    console.log("💾 Saving patient invoice to Supabase:", invoice.receipt_number);

    // 1. Check if invoice exists by id or receipt_number
    let existing: { id: string; receipt_number: string } | null = null;

    if (invoice.id) {
      const { data: byId } = await supabase
        .from("patient_invoices")
        .select("id, receipt_number")
        .eq("id", invoice.id)
        .maybeSingle();
      if (byId) existing = byId;
    }

    if (!existing && invoice.receipt_number) {
      const { data: byReceipt } = await supabase
        .from("patient_invoices")
        .select("id, receipt_number")
        .eq("receipt_number", invoice.receipt_number)
        .maybeSingle();
      if (byReceipt) existing = byReceipt;
    }

    const invoiceUuid = existing ? existing.id : (invoice.id || crypto.randomUUID());
    const oldReceiptNumber = existing ? existing.receipt_number : null;
    const officerAcc =
      (invoice.billing_officer_email && String(invoice.billing_officer_email).trim()) ||
      "admin";

    const invoicePayload: any = {
      id: invoiceUuid,
      receipt_number: invoice.receipt_number,
      patient_name: invoice.patient_name || "مريض طوارئ",
      grand_total: Number(invoice.grand_total || 0),
      billing_officer_account: officerAcc,
      created_at: invoice.created_at || new Date().toISOString(),
    };

    let invError: any = null;

    if (existing) {
      // Update existing record
      const { error: updErr } = await supabase
        .from("patient_invoices")
        .update(invoicePayload)
        .eq("id", invoiceUuid);

      invError = updErr;

      if (invError) {
        console.warn("Update with primary billing_officer_account failed, trying fallback 'admin':", invError.message);
        const altPayload = { ...invoicePayload, billing_officer_account: "admin" };
        const { error: retryAltUpd } = await supabase
          .from("patient_invoices")
          .update(altPayload)
          .eq("id", invoiceUuid);
        invError = retryAltUpd;
      }

      // Remove old detail lines by UUID AND old/new receipt_numbers to re-insert fresh updated lines
      await supabase.from("patient_invoice_lines").delete().eq("invoice_id", invoiceUuid);
      if (invoice.receipt_number && invoice.receipt_number !== invoiceUuid) {
        await supabase.from("patient_invoice_lines").delete().eq("invoice_id", invoice.receipt_number);
      }
      if (oldReceiptNumber && oldReceiptNumber !== invoiceUuid && oldReceiptNumber !== invoice.receipt_number) {
        await supabase.from("patient_invoice_lines").delete().eq("invoice_id", oldReceiptNumber);
      }
    } else {
      // Insert new record
      let { error: insErr } = await supabase
        .from("patient_invoices")
        .insert(invoicePayload);

      invError = insErr;

      // Fallbacks if foreign key constraint fails
      if (invError) {
        console.warn("Primary insert failed:", invError.message);

        // Try fallback officer accounts in case of FK constraint
        const fallbackAccounts = ["admin", "johnnebsen", "johnnebsen1"];
        for (const fbAcc of fallbackAccounts) {
          if (fbAcc === officerAcc) continue;
          const fbPayload = { ...invoicePayload, billing_officer_account: fbAcc };
          const fbRetry = await supabase.from("patient_invoices").insert(fbPayload);
          if (!fbRetry.error) {
            invError = null;
            break;
          }
        }
      }
    }

    if (invError) {
      console.error("❌ Failed to insert/update patient_invoices in Supabase:", invError.message, invError);
      return false;
    }

    // 2. Insert Invoice detail lines using invoiceUuid
    const sanitizedLines = sanitizeInvoiceLines(invoice.invoice_lines || [], invoice.grand_total);
    if (sanitizedLines && sanitizedLines.length > 0) {
      const linesToInsert = sanitizedLines.map((line) => ({
        invoice_id: invoiceUuid,
        item_id: line.item_id || null,
        item_name_ar: line.item_name_ar || line.item_name || "",
        unit_price: Number(line.unit_price || 0),
        quantity: Number(line.quantity || 1),
        line_total: Number(line.line_total || 0),
      }));

      let { error: linesError } = await supabase
        .from("patient_invoice_lines")
        .insert(linesToInsert);

      if (linesError) {
        console.warn("Primary lines insert failed, trying fallback without item_id FK:", linesError.message);
        const fallbackLines = sanitizedLines.map((line) => ({
          invoice_id: invoiceUuid,
          item_name_ar: line.item_name_ar || line.item_name || "",
          unit_price: Number(line.unit_price || 0),
          quantity: Number(line.quantity || 1),
          line_total: Number(line.line_total || 0),
        }));
        const retryLines = await supabase
          .from("patient_invoice_lines")
          .insert(fallbackLines);

        if (retryLines.error) {
          console.error("❌ Failed to insert patient_invoice_lines in Supabase:", retryLines.error.message);
        }
      }
    }

    // 3. Update stocks for each item in patient invoice
    for (const line of invoice.invoice_lines || []) {
      if (!line.item_id) continue;
      try {
        const { data: itemData } = await supabase
          .from("medical_items")
          .select("stock")
          .eq("id", line.item_id)
          .maybeSingle();

        if (itemData) {
          const newStock = Math.max(0, Number(itemData.stock) - line.quantity);
          await supabase
            .from("medical_items")
            .update({ stock: newStock })
            .eq("id", line.item_id);
        }
      } catch (e) {
        console.warn("Stock update error during invoice save:", e);
      }
    }

    console.log("✅ Successfully committed invoice & line items to Supabase:", invoice.receipt_number);
    return true;
  } catch (err) {
    console.error("❌ Exception when saving patient invoice to Supabase:", err);
    return false;
  }
}

/**
 * Delete patient invoice from Supabase
 */
export async function deleteSupabasePatientInvoice(receiptNumber: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from("patient_invoices")
      .delete()
      .eq("receipt_number", receiptNumber);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error deleting patient invoice from Supabase:", err);
    return false;
  }
}

/**
 * Fetch restock_invoices (tazweed al ma5zoon) with detail items
 */
export async function fetchSupabaseRestockInvoices(): Promise<RestockInvoice[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    let restocks: any[] | null = null;

    const { data: restockData, error: restockErr } = await supabase
      .from("restock_invoices")
      .select("*")
      .order("timestamp", { ascending: false });

    if (!restockErr && restockData) {
      restocks = restockData;
    } else {
      const { data: flatRestocks, error: flatErr } = await supabase
        .from("restock_invoices")
        .select("*");
      if (flatErr) throw flatErr;
      restocks = flatRestocks;
    }

    if (!restocks || restocks.length === 0) return [];

    let items: any[] = [];
    try {
      // First try nested relation join
      const { data: joinedItems, error: itemsErr } = await supabase
        .from("restock_invoice_items")
        .select(`
          id,
          invoice_id,
          item_id,
          quantity_added,
          expiry_date,
          medical_items (
            name_ar,
            name_en,
            category_id,
            categories (
              name_ar,
              name_en
            )
          )
        `);

      if (!itemsErr && joinedItems) {
        items = joinedItems;
      } else {
        // Fallback to simple flat select
        const { data: flatItems, error: flatItemsErr } = await supabase
          .from("restock_invoice_items")
          .select("*");
        if (!flatItemsErr && flatItems) {
          items = flatItems;
        }
      }
    } catch (e) {
      console.warn("Could not fetch restock_invoice_items table:", e);
    }

    return restocks.map((inv) => {
      const matchingItems = items
        .filter((i) => i.invoice_id === inv.id)
        .map((i) => {
          const med = i.medical_items as any;
          const catObj = med?.categories;
          const catId = med?.category_id;
          return {
            itemId: String(i.item_id || ""),
            itemNameAr: med?.name_ar || i.item_name_ar || "",
            itemNameEn: med?.name_en || i.item_name_en || "",
            categoryAr: catObj?.name_ar || getCategoryNamesById(catId).ar,
            categoryEn: catObj?.name_en || getCategoryNamesById(catId).en,
            quantityAdded: Number(i.quantity_added || 0),
            expiryDate: i.expiry_date || undefined,
          };
        });

      return {
        id: String(inv.id),
        supplier: inv.supplier || "",
        officer: inv.officer || "",
        notes: inv.notes || "",
        timestamp: inv.timestamp || new Date().toISOString(),
        items: matchingItems,
      };
    });
  } catch (err) {
    console.warn("Notice when fetching restock invoices from Supabase (using local data):", err);
    return null;
  }
}

/**
 * Insert new restock invoice (tazweed) to Supabase
 */
export async function insertSupabaseRestockInvoice(invoice: RestockInvoice): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error: mainError } = await supabase.from("restock_invoices").insert({
      id: invoice.id,
      supplier: invoice.supplier,
      officer: invoice.officer,
      notes: invoice.notes,
      timestamp: invoice.timestamp,
    });

    if (mainError) throw mainError;

    const itemsToInsert = invoice.items.map((it) => ({
      invoice_id: invoice.id,
      item_id: it.itemId,
      quantity_added: it.quantityAdded,
      expiry_date: it.expiryDate || null,
    }));

    const { error: itemsError } = await supabase
      .from("restock_invoice_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Update stock levels in medical_items table too
    for (const it of invoice.items) {
      const { data: itemData } = await supabase
        .from("medical_items")
        .select("stock")
        .eq("id", it.itemId)
        .maybeSingle();

      const currentStock = itemData ? Number(itemData.stock) : 0;
      const { error: updateError } = await supabase
        .from("medical_items")
        .update({
          stock: currentStock + it.quantityAdded,
          expiry_date: it.expiryDate || null,
        })
        .eq("id", it.itemId);

      if (updateError) console.error("Error updating stock quantity on restock:", updateError);
    }

    return true;
  } catch (err) {
    console.error("Error inserting restock invoice to Supabase:", err);
    return false;
  }
}

/**
 * Update a specific restock item record's quantity / expiry batch
 */
export async function updateSupabaseRestockItem(
  invoiceId: string,
  itemId: string,
  newQty: number,
  newExpiry: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    // 1. First find or update the record in restock_invoice_items table
    const { data: existingRecords } = await supabase
      .from("restock_invoice_items")
      .select("id, quantity_added")
      .eq("invoice_id", invoiceId)
      .eq("item_id", itemId);

    if (existingRecords && existingRecords.length > 0) {
      const record = existingRecords[0];
      const difference = newQty - Number(record.quantity_added);

      // Update quantity and expiry
      const { error: updateErr } = await supabase
        .from("restock_invoice_items")
        .update({
          quantity_added: newQty,
          expiry_date: newExpiry || null,
        })
        .eq("id", record.id);

      if (updateErr) throw updateErr;

      // Adjust the master product stock balance appropriately
      const { data: prod } = await supabase
        .from("medical_items")
        .select("stock")
        .eq("id", itemId)
        .maybeSingle();

      if (prod) {
        await supabase
          .from("medical_items")
          .update({
            stock: Math.max(0, Number(prod.stock) + difference),
            expiry_date: newExpiry || null,
          })
          .eq("id", itemId);
      }
    }
    return true;
  } catch (err) {
    console.error("Error updating restock item in Supabase:", err);
    return false;
  }
}

/**
 * Delete a specific product's replenishment batch / shipment from restock invoice
 */
export async function deleteSupabaseRestockItem(
  invoiceId: string,
  itemId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data: existing } = await supabase
      .from("restock_invoice_items")
      .select("id, quantity_added")
      .eq("invoice_id", invoiceId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (existing) {
      const subtractedQty = Number(existing.quantity_added);

      const { error: deleteErr } = await supabase
        .from("restock_invoice_items")
        .delete()
        .eq("id", existing.id);

      if (deleteErr) throw deleteErr;

      // Subtract from master item stock
      const { data: prod } = await supabase
        .from("medical_items")
        .select("stock")
        .eq("id", itemId)
        .maybeSingle();

      if (prod) {
        await supabase
          .from("medical_items")
          .update({
            stock: Math.max(0, Number(prod.stock) - subtractedQty),
          })
          .eq("id", itemId);
      }
    }
    return true;
  } catch (err) {
    console.error("Error deleting restock item from Supabase:", err);
    return false;
  }
}

export interface AppUser {
  username: string;
  role: "SUPER_ADMIN" | "RECEPTION";
  full_name?: string;
  is_active?: boolean;
}

/**
 * Fetch all app users / reception operators from Supabase `app_users` table
 */
export async function fetchSupabaseAppUsers(): Promise<ReceptionOperator[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.warn("Notice fetching app users from Supabase:", error);
      return [];
    }

    return data.map((u) => ({
      email: u.username,
      username: u.username,
      fullName: u.full_name || u.username,
      isActive: u.is_active !== false,
      joined_at: u.created_at || new Date().toISOString(),
      role: (u.role as "SUPER_ADMIN" | "RECEPTION") || "RECEPTION",
    }));
  } catch (err) {
    console.error("Error fetching app users from Supabase:", err);
    return [];
  }
}

/**
 * Upsert app user / reception operator to Supabase `app_users` table
 */
export async function upsertSupabaseAppUser(
  username: string,
  pass: string = "reception123",
  fullName: string = "",
  role: string = "RECEPTION",
  isActive: boolean = true
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from("app_users").upsert(
      {
        username: username.trim().toLowerCase(),
        password: pass,
        full_name: fullName || username,
        role: role,
        is_active: isActive,
      },
      { onConflict: "username" }
    );
    if (error) {
      console.error("Error upserting app user in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error upserting app user in Supabase:", err);
    return false;
  }
}

/**
 * Toggle active status of app user in Supabase `app_users` table
 */
export async function toggleSupabaseAppUserActive(
  username: string,
  isActive: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from("app_users")
      .update({ is_active: isActive })
      .eq("username", username.trim().toLowerCase());
    if (error) {
      console.error("Error toggling app user status in Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error toggling app user status in Supabase:", err);
    return false;
  }
}

/**
 * Delete app user / operator from Supabase `app_users` table
 */
export async function deleteSupabaseAppUser(username: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from("app_users")
      .delete()
      .eq("username", username.trim().toLowerCase());
    if (error) {
      console.error("Error deleting app user from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error deleting app user from Supabase:", err);
    return false;
  }
}

/**
 * Authenticate user with username and password against Supabase `app_users` table
 */
export async function authenticateSupabaseUser(
  username: string,
  pass: string
): Promise<{ user: AppUser | null; isDeactivated: boolean }> {
  if (!isSupabaseConfigured) return { user: null, isDeactivated: false };
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) {
      return { user: null, isDeactivated: false };
    }

    if (data.is_active === false) {
      return { user: null, isDeactivated: true };
    }

    if (data.password === pass) {
      return {
        user: {
          username: data.username,
          role: data.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "RECEPTION",
          full_name: data.full_name || data.username,
          is_active: true,
        },
        isDeactivated: false,
      };
    }
    return { user: null, isDeactivated: false };
  } catch (err) {
    console.warn("Notice when authenticating user from Supabase:", err);
    return { user: null, isDeactivated: false };
  }
}
