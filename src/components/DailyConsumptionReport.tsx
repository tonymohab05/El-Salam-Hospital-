import React, { useState, useMemo } from "react";
import { TrendingUp, Calendar, ArrowRight, ArrowLeft, Inbox, Coins, ClipboardList, Printer } from "lucide-react";
import { InvoicePayload, Language, HOSPITAL_INVENTORY } from "../types";
import { formatCurrency, formatArabicDigits } from "../utils";
import HospitalLogo from "./HospitalLogo";

interface DailyConsumptionReportProps {
  lang: Language;
  history: InvoicePayload[];
}

export default function DailyConsumptionReport({
  lang,
  history,
}: DailyConsumptionReportProps) {
  // Calendar date state: initialized to today (using local timezone)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Parse state date
  const selectedDateObj = useMemo(() => {
    const parts = selectedDate.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  }, [selectedDate]);

  // Navigate day-by-day
  const shiftDay = (days: number) => {
    const newD = new Date(selectedDateObj);
    newD.setDate(newD.getDate() + days);
    const year = newD.getFullYear();
    const month = String(newD.getMonth() + 1).padStart(2, "0");
    const day = String(newD.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Format date display nicely in Arabic/English
  const formattedSelectedDateText = useMemo(() => {
    return selectedDateObj.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDateObj, lang]);

  // Analyze consumption metrics
  const aggregatedData = useMemo(() => {
    const targetY = selectedDateObj.getFullYear();
    const targetM = selectedDateObj.getMonth();
    const targetD = selectedDateObj.getDate();

    // Filter relevant invoices
    const dailyInvoices = history.filter((inv) => {
      const invDate = new Date(inv.created_at);
      return (
        invDate.getFullYear() === targetY &&
        invDate.getMonth() === targetM &&
        invDate.getDate() === targetD
      );
    });

    // Populate aggregates
    const itemsMap: Record<
      string,
      {
        id: string;
        name_ar: string;
        name_en: string;
        category_ar: string;
        category_en: string;
        unit_price: number;
        qty: number;
        total: number;
      }
    > = {};

    dailyInvoices.forEach((inv) => {
      inv.invoice_lines.forEach((line) => {
        const invItem = HOSPITAL_INVENTORY.find((it) => it.id === line.item_id);
        const category_ar = invItem?.category_ar || "أخرى";
        const category_en = invItem?.category_en || "Other Items";

        if (!itemsMap[line.item_id]) {
          itemsMap[line.item_id] = {
            id: line.item_id,
            name_ar: line.item_name_ar,
            name_en: line.item_name_en,
            category_ar,
            category_en,
            unit_price: line.unit_price,
            qty: 0,
            total: 0,
          };
        }
        itemsMap[line.item_id].qty += line.quantity;
        itemsMap[line.item_id].total += line.line_total;
      });
    });

    const itemsList = Object.values(itemsMap).sort((a, b) => b.qty - a.qty);
    const grandQty = itemsList.reduce((acc, it) => acc + it.qty, 0);
    const grandCost = itemsList.reduce((acc, it) => acc + it.total, 0);

    return {
      items: itemsList,
      invoiceCount: dailyInvoices.length,
      totalQuantity: grandQty,
      totalCost: grandCost,
    };
  }, [history, selectedDateObj]);

  return (
    <div id="printable-consumption-report" className="flex flex-col gap-4 sm:gap-5 animate-fadeIn w-full">
      {/* Printable-only Header with Logo matching standard hospital header */}
      <div className="hidden print:block w-full font-sans mb-3">
        <div className="grid grid-cols-3 items-center text-slate-900 pb-2">
          {/* Left visually in RTL (English text) */}
          <div className="text-left font-sans">
            <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 leading-tight">
              EL-SALAM HOSPITAL
            </h2>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">
              76 Ahmed Esmat , Ain Shams
            </p>
          </div>

          {/* Center visually: Hospital Logo */}
          <div className="flex justify-center">
            <HospitalLogo className="w-12 h-12 shrink-0 aspect-square" />
          </div>

          {/* Right visually in RTL (Arabic text) */}
          <div className="text-right font-arabic">
            <h2 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
              مستشفى السلام
            </h2>
            <p className="text-[11px] sm:text-xs font-bold text-slate-600 mt-0.5">
              76 احمد عصمت عين شمس
            </p>
          </div>
        </div>
        <div className="border-b-2 border-slate-900 w-full my-2" />
      </div>

      {/* Printable-only Date Badge */}
      <div className="hidden print:flex items-center justify-start my-2">
        <div className="inline-flex items-center gap-2 border-2 border-emerald-600 bg-emerald-50/70 text-emerald-800 font-bold px-4 py-1.5 rounded-2xl text-xs sm:text-sm font-arabic shadow-2xs">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>{formattedSelectedDateText}</span>
        </div>
      </div>

      {/* Date Switcher Ribbon - Mobile First */}
      <div className="bg-white border border-slate-250 p-3.5 sm:p-4 rounded-2xl sm:rounded-xl shadow-3xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-lg flex items-center justify-center border border-emerald-100 shadow-3xs shrink-0">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div className={`${lang === "ar" ? "text-right" : "text-left"}`}>
            <h2 className="text-xs sm:text-sm font-black text-slate-800 font-arabic">
              {lang === "ar" ? "تقرير الاستهلاك وجرد المستلزمات اليومي" : "ED Supplies Operations & Audit Desk"}
            </h2>
            <p className="text-[10px] sm:text-[10.5px] text-slate-400 font-arabic mt-0.5">
              {lang === "ar" ? "تابع إجمالي الكميات المنصرفة والتكلفة المالية اليومية بالتفصيل" : "Audit overall quantities and economic metrics day-by-day"}
            </p>
          </div>
        </div>

        {/* Calendar control bar - Touch friendly on mobile */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 font-sans select-none border-t border-slate-100 pt-3 md:pt-0 md:border-0">
          {/* Print Button - Placed first so in RTL layout it appears on the right before the date */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 border border-slate-800 bg-slate-900 hover:bg-black active:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs shrink-0 min-h-[38px]"
            title={lang === "ar" ? "طباعة تقرير اليوم" : "Print Today's Report"}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="font-arabic">{lang === "ar" ? "طباعة" : "Print"}</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none justify-center">
            <button
              type="button"
              onClick={() => shiftDay(lang === "ar" ? 1 : -1)}
              className="p-2 sm:p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title={lang === "ar" ? "اليوم التالي" : "Previous Day"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Date Picker Input */}
            <div className="relative flex-1 sm:flex-none min-w-0">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="flex items-center justify-center gap-2 border border-slate-250 px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-50/50 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition-all font-arabic truncate min-h-[38px]">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">{formattedSelectedDateText}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => shiftDay(lang === "ar" ? -1 : 1)}
              className="p-2 sm:p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title={lang === "ar" ? "اليوم السابق" : "Next Day"}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 print:grid print:grid-cols-3">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl sm:rounded-xl border border-slate-250 p-3.5 sm:p-4 shadow-3xs flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-sky-500" />
          <div className={`${lang === "ar" ? "text-right" : "text-left"}`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight font-arabic">
              {lang === "ar" ? "جلسات و فواتير مسجلة" : "Daily Completed Receipts"}
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-0.5 sm:mt-1">
              {formatArabicDigits(aggregatedData.invoiceCount, lang)}{" "}
              <span className="text-xs font-bold text-slate-500 font-arabic">
                {lang === "ar" ? "فواتير" : "Vouchers"}
              </span>
            </p>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl sm:rounded-xl border border-slate-250 p-3.5 sm:p-4 shadow-3xs flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
          <div className={`${lang === "ar" ? "text-right" : "text-left"}`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight font-arabic">
              {lang === "ar" ? "إجمالي المستهلكات المنصرفة" : "Disbursed Supplies"}
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-0.5 sm:mt-1">
              {formatArabicDigits(aggregatedData.totalQuantity, lang)}{" "}
              <span className="text-xs font-bold text-slate-500 font-arabic">
                {lang === "ar" ? "وحدة طبية" : "Units"}
              </span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl sm:rounded-xl border border-slate-250 p-3.5 sm:p-4 shadow-3xs flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
          <div className={`${lang === "ar" ? "text-right" : "text-left"}`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight font-arabic">
              {lang === "ar" ? "إجمالي المبلغ في الدرج" : "Total Cash Drawer Amount"}
            </span>
            <p className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-0.5 sm:mt-1">
              {formatCurrency(aggregatedData.totalCost, lang)}
            </p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Consumption Breakdown Container */}
      <div className="bg-white rounded-2xl sm:rounded-xl border border-slate-250 shadow-3xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 sm:p-4 flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 font-arabic flex items-center gap-1.5">
            📋 {lang === "ar" ? "بيان تفصيلي بالمستلزمات المستهلكة" : "Supplies Consumption Ledger"}
          </span>
          <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-500 font-mono select-none">
            {lang === "ar"
              ? `عدد الأصناف: ${formatArabicDigits(aggregatedData.items.length, lang)}`
              : `Total items: ${aggregatedData.items.length}`}
          </span>
        </div>

        {aggregatedData.items.length > 0 ? (
          <>
            {/* Mobile View: Clean Responsive Cards (Hidden in print) */}
            <div className="block sm:hidden print:hidden divide-y divide-slate-100">
              {aggregatedData.items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="p-3.5 hover:bg-slate-50/80 transition-colors space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{formatArabicDigits(index + 1, lang)}
                    </span>
                    <span className="text-[10px] font-bold font-arabic px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md border border-sky-100">
                      {lang === "ar" ? item.category_ar : item.category_en}
                    </span>
                  </div>

                  <div className="text-right">
                    <h4 className="font-bold text-slate-900 font-arabic text-xs leading-snug">
                      {lang === "ar" ? item.name_ar : item.name_en}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                      كود الصنف: {item.id}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-150 grid grid-cols-3 gap-2 text-center items-center">
                    <div>
                      <span className="text-[9px] text-slate-400 font-arabic block font-medium">
                        {lang === "ar" ? "سعر المفرد" : "Tariff"}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700 mt-0.5 block">
                        {formatCurrency(item.unit_price, lang)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 font-arabic block font-medium">
                        {lang === "ar" ? "المنصرف" : "Consumed"}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-full font-black text-xs bg-emerald-100/80 text-emerald-800 font-mono mt-0.5">
                        {formatArabicDigits(item.qty, lang)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 font-arabic block font-medium">
                        {lang === "ar" ? "الإجمالي" : "Total"}
                      </span>
                      <span className="font-mono text-xs font-extrabold text-slate-900 mt-0.5 block">
                        {formatCurrency(item.total, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Print View: Full data table */}
            <div className="hidden sm:block print:block overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-750 font-bold border-b border-slate-250 font-arabic select-none">
                    <th className="py-3 px-4 border-r border-slate-200 w-12 text-center">#</th>
                    <th className="py-3 px-4 border-r border-slate-200">{lang === "ar" ? "الصنف الطبي" : "Medical Item"}</th>
                    <th className="py-3 px-4 border-r border-slate-200">{lang === "ar" ? "التصنيف" : "Category"}</th>
                    <th className="py-3 px-4 border-r border-slate-200 text-center w-24">{lang === "ar" ? "سعر المفرد" : "Unit Price"}</th>
                    <th className="py-3 px-4 border-r border-slate-200 text-center w-28">{lang === "ar" ? "الكمية المستهلكة" : "Consumed Qty"}</th>
                    <th className="py-3 px-4 text-left">{lang === "ar" ? "إجمالي المالية" : "Total Price"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {aggregatedData.items.map((item, index) => (
                    <tr key={`${item.id}-${index}`} className="text-slate-850 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 border-r border-slate-150 font-mono text-center text-slate-400 font-bold">
                        {formatArabicDigits(index + 1, lang)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-150 text-right">
                        <div className="font-bold text-slate-900 font-arabic text-xs leading-snug">
                          {lang === "ar" ? item.name_ar : item.name_en}
                        </div>
                        <span className="text-[9.5px] text-slate-400 font-mono block mt-0.5">{item.id}</span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-150 text-slate-650 font-arabic font-bold text-[10.5px]">
                        {lang === "ar" ? item.category_ar : item.category_en}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-150 text-center font-mono font-medium text-slate-700">
                        {formatCurrency(item.unit_price, lang)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-150 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-black text-xs bg-emerald-50 text-emerald-750 font-mono">
                          {formatArabicDigits(item.qty, lang)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                        {formatCurrency(item.total, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 sm:p-12 text-center text-slate-400">
            <Inbox className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-300 mb-2.5" />
            <h4 className="text-xs sm:text-sm font-black text-slate-750 font-arabic leading-relaxed">
              {lang === "ar" ? "لم تجرى أي مبيعات أو سحوبات اليوم" : "No Consumption Recorded"}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-450 font-arabic mt-1 leading-relaxed max-w-sm mx-auto">
              {lang === "ar"
                ? "حدد تاريخاً آخر من شريط التقويم بالأعلى، أو قم بتسجيل فواتير جديدة في بوابة الاستقبال لتظهر هنا."
                : "Select another calendar date or register medical item sales inside the entrance desk."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
