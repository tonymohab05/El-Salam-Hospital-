/**
 * Types representing ER Medical Supplies and Receipt Structures
 * for the Egyptian Hospital ER Billing Assistant
 */

export interface MedicalItem {
  id: string;
  name_ar: string;
  name_en: string;
  unit_price: number; // In EGP
  category_ar: string;
  category_en: string;
  stock: number; // Stock count for Egyptian ER
  expiry_date?: string; // Optional expiration date YYYY-MM-DD
}

export interface ReceptionOperator {
  email: string;
  username?: string;
  fullName?: string;
  role?: "SUPER_ADMIN" | "RECEPTION";
  isActive: boolean;
  joined_at: string;
}

export interface InvoiceLine {
  item_id: string;
  item_name: string; // The selected local name (determined by active language when exported or stored)
  item_name_ar: string; // Keep both translations preserved
  item_name_en: string;
  unit_price: number;
  quantity: number;
  line_total: number; // Must strictly equal unit_price * quantity
}

export interface InvoicePayload {
  id?: string;
  patient_name: string;
  receipt_number: string;
  invoice_lines: InvoiceLine[];
  grand_total: number; // Must strictly equal sum of line_totals
  billing_officer_email: string;
  hospital_branch_ar: string;
  hospital_branch_en: string;
  created_at: string;
  motor_numbers?: string; // Associated motor or engine numbers for client/invoice
}

export type Language = "ar" | "en";

/**
 * Utility function to sanitize and deduplicate invoice lines.
 * Prevents item duplication bugs caused by repeat edits, multi-match database fetches, or UI double-clicks.
 */
export function sanitizeInvoiceLines(
  lines: InvoiceLine[],
  targetGrandTotal?: number
): InvoiceLine[] {
  if (!lines || lines.length === 0) return [];

  // Filter out any zero or negative quantity lines if valid positive lines exist
  const positiveLines = lines.filter((l) => Number(l.quantity) > 0);
  const candidates = positiveLines.length > 0 ? positiveLines : lines;

  // Group lines by unique item key
  const keyMap = new Map<string, InvoiceLine[]>();
  for (const line of candidates) {
    const itemIdStr = line.item_id ? String(line.item_id).trim() : "";
    const key =
      itemIdStr !== ""
        ? itemIdStr
        : `${line.item_name_ar || line.item_name || line.item_name_en}_${line.unit_price}`;

    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key)!.push(line);
  }

  let hasDuplicates = false;
  for (const group of keyMap.values()) {
    if (group.length > 1) {
      hasDuplicates = true;
      break;
    }
  }

  // If no duplicate items exist, return normalized lines
  if (!hasDuplicates) {
    return candidates.map((l) => {
      const q = Number(l.quantity || 1);
      const p = Number(l.unit_price || 0);
      return {
        ...l,
        quantity: q,
        unit_price: p,
        line_total: Number(l.line_total) || q * p,
      };
    });
  }

  // Duplicates exist!
  // Case 1: Test if taking the LATEST entry for each key matches targetGrandTotal
  const latestLines: InvoiceLine[] = [];
  for (const group of keyMap.values()) {
    const line = group[group.length - 1]; // latest row
    const q = Number(line.quantity || 1);
    const p = Number(line.unit_price || 0);
    latestLines.push({
      ...line,
      quantity: q,
      unit_price: p,
      line_total: q * p,
    });
  }

  if (targetGrandTotal !== undefined && targetGrandTotal > 0) {
    const latestSum = latestLines.reduce((sum, l) => sum + l.line_total, 0);
    if (Math.abs(latestSum - targetGrandTotal) <= 1.0) {
      return latestLines;
    }

    // Test if taking the FIRST entry for each key matches targetGrandTotal
    const firstLines: InvoiceLine[] = [];
    for (const group of keyMap.values()) {
      const line = group[0]; // first row
      const q = Number(line.quantity || 1);
      const p = Number(line.unit_price || 0);
      firstLines.push({
        ...line,
        quantity: q,
        unit_price: p,
        line_total: q * p,
      });
    }

    const firstSum = firstLines.reduce((sum, l) => sum + l.line_total, 0);
    if (Math.abs(firstSum - targetGrandTotal) <= 1.0) {
      return firstLines;
    }

    // Try finding combination across groups that matches targetGrandTotal
    const keys = Array.from(keyMap.keys());
    let bestMatch: InvoiceLine[] | null = null;
    let minDiff = Infinity;

    const findCombo = (idx: number, current: InvoiceLine[], sum: number) => {
      if (idx === keys.length) {
        const diff = Math.abs(sum - targetGrandTotal);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = [...current];
        }
        return;
      }
      const group = keyMap.get(keys[idx])!;
      for (const line of group) {
        const q = Number(line.quantity || 1);
        const p = Number(line.unit_price || 0);
        const lt = q * p;
        findCombo(idx + 1, [...current, { ...line, quantity: q, unit_price: p, line_total: lt }], sum + lt);
      }
    };

    findCombo(0, [], 0);

    if (bestMatch && minDiff <= 1.0) {
      return bestMatch;
    }
  }

  // Fallback: Return latest entry for each key without artificially multiplying quantities
  return latestLines;
}

export const HOSPITAL_INVENTORY: MedicalItem[] = [
  {
    id: "med_001",
    name_ar: "كانيولا وريدية مقاس 18 (خضراء)",
    name_en: "IV Cannula 18G (Green)",
    unit_price: 35.0,
    category_ar: "مستهلكات وريدية",
    category_en: "IV Consumables",
    stock: 55
  },
  {
    id: "med_002",
    name_ar: "كانيولا وريدية مقاس 20 (وردية)",
    name_en: "IV Cannula 20G (Pink)",
    unit_price: 30.0,
    category_ar: "مستهلكات وريدية",
    category_en: "IV Consumables",
    stock: 40
  },
  {
    id: "med_003",
    name_ar: "كانيولا وريدية مقاس 22 (زرقاء)",
    name_en: "IV Cannula 22G (Blue)",
    unit_price: 30.0,
    category_ar: "مستهلكات وريدية",
    category_en: "IV Consumables",
    stock: 30
  },
  {
    id: "med_004",
    name_ar: "محلول ملح فسيولوجي 0.9% (500 مل)",
    name_en: "Normal Saline 0.9% (500ml)",
    unit_price: 45.0,
    category_ar: "محاليل وريدية",
    category_en: "IV Fluids",
    stock: 120
  },
  {
    id: "med_005",
    name_ar: "محلول رينجر لاكتات (500 مل)",
    name_en: "Ringer's Lactate Solution (500ml)",
    unit_price: 55.0,
    category_ar: "محاليل وريدية",
    category_en: "IV Fluids",
    stock: 85
  },
  {
    id: "med_006",
    name_ar: "محلول جلوكوز 5% (500 مل)",
    name_en: "Glucose 5% Solution (500ml)",
    unit_price: 40.0,
    category_ar: "محاليل وريدية",
    category_en: "IV Fluids",
    stock: 90
  },
  {
    id: "med_007",
    name_ar: "سرنجة معقمة 3 سم",
    name_en: "Sterile Syringe 3ml",
    unit_price: 6.0,
    category_ar: "حقن وسرنجات",
    category_en: "Syringes",
    stock: 300
  },
  {
    id: "med_008",
    name_ar: "سرنجة معقمة 5 سم",
    name_en: "Sterile Syringe 5ml",
    unit_price: 8.0,
    category_ar: "حقن وسرنجات",
    category_en: "Syringes",
    stock: 250
  },
  {
    id: "med_009",
    name_ar: "سرنجة معقمة 10 سم",
    name_en: "Sterile Syringe 10ml",
    unit_price: 12.0,
    category_ar: "حقن وسرنجات",
    category_en: "Syringes",
    stock: 150
  },
  {
    id: "med_010",
    name_ar: "جهاز إعطاء محاليل بالفلاتر",
    name_en: "IV Infusion Set with Filter",
    unit_price: 25.0,
    category_ar: "مستهلكات وريدية",
    category_en: "IV Consumables",
    stock: 110
  },
  {
    id: "med_011",
    name_ar: "قسطرة بولية معقمة (فولي - مقاس 16)",
    name_en: "Foley Urinary Catheter (12Fr-16Fr)",
    unit_price: 75.0,
    category_ar: "قساطر وأنابيب",
    category_en: "Catheters & Tubes",
    stock: 45
  },
  {
    id: "med_012",
    name_ar: "كيس جمع بول معقم 2 لتر",
    name_en: "Urinary Drainage Bag 2L",
    unit_price: 35.0,
    category_ar: "قساطر وأنابيب",
    category_en: "Catheters & Tubes",
    stock: 70
  },
  {
    id: "med_013",
    name_ar: "رابط شاش معقم (10 سم * 4 م)",
    name_en: "Sterile Gauze Bandage (10cm * 4m)",
    unit_price: 15.0,
    category_ar: "مضادات للنزيف وجروح",
    category_en: "Gauze & Bandages",
    stock: 180
  },
  {
    id: "med_014",
    name_ar: "رابط ضاغط للكسور (مقاس 10 سم)",
    name_en: "Elastic Crepe Bandage (10cm)",
    unit_price: 45.0,
    category_ar: "مضادات للنزيف وجروح",
    category_en: "Gauze & Bandages",
    stock: 120
  },
  {
    id: "med_015",
    name_ar: "بلاستر حريري جراحي (متوسط)",
    name_en: "Surgical Silk Tape (Medium)",
    unit_price: 20.0,
    category_ar: "مضادات للنزيف وجروح",
    category_en: "Gauze & Bandages",
    stock: 95
  },
  {
    id: "med_016",
    name_ar: "قفازات جراحية معقمة (زوج)",
    name_en: "Pair of Sterile Surgical Gloves",
    unit_price: 22.0,
    category_ar: "معدات طبية شخصية",
    category_en: "Personal Protective",
    stock: 400
  },
  {
    id: "med_017",
    name_ar: "ماسك أكسجين للكبار بالخرطوم",
    name_en: "Oxygen Therapy Mask (Adult)",
    unit_price: 50.0,
    category_ar: "علاج بالغازات والأكسجين",
    category_en: "Oxygen Therapy",
    stock: 65
  },
  {
    id: "med_018",
    name_ar: "أمبول مسكن قوي (ديكلوفيناك الصوديوم)",
    name_en: "Diclofenac Sodium Ampoule (Analgesic)",
    unit_price: 18.0,
    category_ar: "أدوية وحقن طوارئ",
    category_en: "Emergency Drugs",
    stock: 140
  },
  {
    id: "med_019",
    name_ar: "فيال مضاد حيوي سيفوتراكسون 1 جم",
    name_en: "Ceftriaxone 1g Injection (Antibiotic)",
    unit_price: 65.0,
    category_ar: "أدوية وحقن طوارئ",
    category_en: "Emergency Drugs",
    stock: 115
  },
  {
    id: "med_020",
    name_ar: "أنبوبة حنجرية معقمة مقاس 7.5",
    name_en: "Endotracheal Tube Sterile Size 7.5",
    unit_price: 110.0,
    category_ar: "علاج بالغازات والأكسجين",
    category_en: "Oxygen Therapy",
    stock: 25
  }
];

export interface RestockInvoiceItem {
  itemId: string;
  itemNameAr: string;
  itemNameEn: string;
  categoryAr: string;
  categoryEn: string;
  quantityAdded: number;
  expiryDate?: string;
}

export interface RestockInvoice {
  id: string; // e.g., "RST-INV-101"
  supplier: string;
  officer: string;
  notes: string;
  timestamp: string;
  items: RestockInvoiceItem[];
}
