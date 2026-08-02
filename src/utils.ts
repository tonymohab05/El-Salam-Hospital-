/**
 * Administrative utilities for Cairo Urgent Care Hospital
 * ER Billing Assistant.
 */

/**
 * Strips formatting and returns a cleanly rounded float to 2 decimal places
 */
export function roundPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a currency value with Egyptian pound localization
 */
export function formatCurrency(value: number, lang: "ar" | "en"): string {
  const rounded = roundPrice(value);
  if (lang === "ar") {
    // Standard Egyptian billing syntax
    return `${rounded.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م`;
  }
  return `${rounded.toLocaleString("en-US", { minimumFractionDigits: 2 })} EGP`;
}

/**
 * Localizes a number to Eastern Arabic numerals if language is Arabic
 */
export function formatArabicDigits(num: number | string, lang: string): string {
  if (lang !== "ar") return String(num);
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

/**
 * Simplistic, localized Number-to-Words (Tafqeet/تفقيط) utility for Egyptian Pounds (EGP)
 * Specifically configured for typical ER billing amounts (1 to 20,000 EGP).
 */
export function translateNumberToCurrencyWords(amount: number, lang: "ar" | "en"): string {
  const integerPart = Math.floor(amount);
  const piastresPart = Math.round((amount - integerPart) * 100);

  if (lang === "en") {
    const words = translateEnglishNumber(integerPart);
    const centsText = piastresPart > 0 ? ` and ${translateEnglishNumber(piastresPart)} Piastres` : "";
    return `Only ${words} Egyptian Pounds${centsText} Centered`;
  } else {
    const words = translateArabicNumber(integerPart);
    const centsText = piastresPart > 0 ? ` و ${translateArabicNumber(piastresPart)} قرشاً` : "";
    return `فقط ${words} جنيهاً مصرياً لا غير${centsText}`;
  }
}

// Simple English translation helper
function translateEnglishNumber(num: number): string {
  if (num === 0) return "Zero";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const thousands = ["", "Thousand", "Million"];

  let words = "";

  if (num >= 1000) {
    const thous = Math.floor(num / 1000);
    words += translateEnglishNumber(thous) + " Thousand ";
    num %= 1000;
  }

  if (num >= 100) {
    const hunds = Math.floor(num / 100);
    words += ones[hunds] + " Hundred ";
    num %= 100;
  }

  if (num > 0) {
    if (words !== "") words += "and ";
    if (num < 20) {
      words += ones[num];
    } else {
      const tenPart = Math.floor(num / 10);
      const unitsPart = num % 10;
      words += tens[tenPart] + (unitsPart > 0 ? "-" + ones[unitsPart] : "");
    }
  }

  return words.trim();
}

// Highly authentic Arabic Tafqeet numbers dictionary
function translateArabicNumber(num: number): string {
  if (num === 0) return "صفر";
  
  const onesAr = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  const teensAr = ["عشر", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tensAr = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundredsAr = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  let words = "";

  // Millions / Thousands (up to 999,999)
  if (num >= 1000) {
    const thous = Math.floor(num / 1000);
    if (thous === 1) {
      words += "ألف";
    } else if (thous === 2) {
      words += "ألفان";
    } else if (thous >= 3 && thous <= 10) {
      words += `${onesAr[thous]} آلاف`;
    } else {
      words += `${translateArabicNumber(thous)} ألف`;
    }
    num %= 1000;
    if (num > 0) words += " و ";
  }

  if (num >= 100) {
    const hunds = Math.floor(num / 100);
    words += hundredsAr[hunds];
    num %= 100;
    if (num > 0) words += " و ";
  }

  if (num > 0) {
    if (num <= 10) {
      words += onesAr[num];
    } else if (num < 20) {
      words += teensAr[num - 10];
    } else {
      const tenPart = Math.floor(num / 10);
      const unitPart = num % 10;
      if (unitPart > 0) {
        words += `${onesAr[unitPart]} و ${tensAr[tenPart]}`;
      } else {
        words += tensAr[tenPart];
      }
    }
  }

  return words.trim();
}

/**
 * Maps corporate emails to professional human names for billing officer slots.
 */
export function getUserName(
  emailOrUsername: string,
  lang: "ar" | "en",
  operatorsList?: any[]
): string {
  if (!emailOrUsername) return lang === "ar" ? "أخصائي الحسابات" : "Billing Specialist";
  const normalized = emailOrUsername.trim().toLowerCase();

  // Try looking up in passed operatorsList or local cache
  let list = operatorsList;
  if (!list || !Array.isArray(list) || list.length === 0) {
    try {
      const cached = localStorage.getItem("el_salam_er_operators_v1");
      if (cached) list = JSON.parse(cached);
    } catch (e) {
      // ignore
    }
  }

  if (list && Array.isArray(list)) {
    const found = list.find((op: any) => {
      const u = op.username ? String(op.username).trim().toLowerCase() : "";
      const e = op.email ? String(op.email).trim().toLowerCase() : "";
      return u === normalized || e === normalized;
    });
    if (found && found.fullName && String(found.fullName).trim() !== "") {
      return String(found.fullName).trim();
    }
  }

  if (normalized === "admin" || normalized === "antonymohab@gmail.com" || normalized === "super_admin") {
    return lang === "ar" ? "مدير النظام" : "System Administrator";
  }

  if (
    normalized === "reception" ||
    normalized === "reception1" ||
    normalized === "receptionist" ||
    normalized === "opr" ||
    normalized === "operator"
  ) {
    return lang === "ar" ? "مسؤول الاستقبال والطوارئ" : "Emergency Receptionist Desk";
  }

  const namePart = normalized.includes("@") ? normalized.split("@")[0] : normalized;
  return namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, " ");
}

