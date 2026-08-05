import React from "react";
import { History, Search, ArrowUpRight, Trash2, Calendar, ShoppingBag, Database, FileText, Pencil, Printer, Download, FileDown, FileSpreadsheet, SlidersHorizontal, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import { InvoicePayload, Language } from "../types";
import { formatCurrency, getUserName } from "../utils";

interface SuitesHistoryProps {
  currentLang: Language;
  history: InvoicePayload[];
  onReload: (index: number) => void;
  onDelete: (index: number) => void;
  onPrint: (index: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeIndex: number | null;
  onViewDetail: (index: number) => void;
  onPrintBatch?: (filteredList: InvoicePayload[]) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
}

export default function SuitesHistory({
  currentLang,
  history,
  onReload,
  onDelete,
  onPrint,
  searchQuery,
  onSearchChange,
  activeIndex,
  onViewDetail,
  onPrintBatch,
  startDate: propsStartDate,
  onStartDateChange,
  endDate: propsEndDate,
  onEndDateChange,
}: SuitesHistoryProps) {
  // Helper for today's date in YYYY-MM-DD local timezone format
  const getTodayDateString = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  };

  // Advanced Filter Local States
  // Controlled date props with local state fallback
  const [internalStartDate, setInternalStartDate] = React.useState<string>(getTodayDateString());
  const [internalEndDate, setInternalEndDate] = React.useState<string>(getTodayDateString());

  const startDate = propsStartDate !== undefined ? propsStartDate : internalStartDate;
  const endDate = propsEndDate !== undefined ? propsEndDate : internalEndDate;

  const setStartDate = (val: string) => {
    if (onStartDateChange) onStartDateChange(val);
    setInternalStartDate(val);
  };

  const setEndDate = (val: string) => {
    if (onEndDateChange) onEndDateChange(val);
    setInternalEndDate(val);
  };

  const [startTime, setStartTime] = React.useState<string>("");
  const [endTime, setEndTime] = React.useState<string>("");
  const [minAmount, setMinAmount] = React.useState<string>("");
  const [maxAmount, setMaxAmount] = React.useState<string>("");
  const [showFilters, setShowFilters] = React.useState<boolean>(false);

  // States for checkbox batch selection and options modals
  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState<string[]>([]);
  const [showPrintOptions, setShowPrintOptions] = React.useState<boolean>(false);

  // Excel Export Handler for selected or filtered invoices
  const handleExportInvoicesToExcel = (targets: InvoicePayload[]) => {
    try {
      const wb = XLSX.utils.book_new();
      const todayStr = new Date().toLocaleDateString("ar-EG");
      const timeStr = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

      // Sheet 1: كشف فواتير المرضى (إجمالي)
      const summaryAOA: any[][] = [
        ["مستشفى السلام - كشف فواتير وإيصالات المرضى والمستلزمات المنصرفة"],
        [`تاريخ ووقت التصدير: ${todayStr} - ${timeStr} | إجمالي عدد الفواتير: ${targets.length}`],
        [], // Empty row spacer
        [
          "م",
          "اسم المريض",
          "رقم الإيصال / المرجع",
          "تاريخ ووقت المعاملة",
          "بيان المستلزمات والكميات والأسعار",
          "إجمالي عدد القطع",
          "إجمالي قيمة الفاتورة (ج.م)",
          "منفذ الصرف المالي (اسم الحساب)",
          "تنسيق وتظليل الصف"
        ]
      ];

      targets.forEach((record, index) => {
        const itemsDetail = record.invoice_lines
          .map(
            (l) =>
              `${l.item_name_ar || l.item_name_en} (${l.unit_price} ج.م × ${l.quantity} = ${l.line_total} ج.م)`
          )
          .join(" | ");

        const totalQty = record.invoice_lines.reduce((s, l) => s + l.quantity, 0);

        const formattedDate = record.created_at
          ? new Date(record.created_at).toLocaleString("ar-EG")
          : "غير محدد";

        const officerName = getUserName(record.billing_officer_email, currentLang) || record.billing_officer_email || "-";
        const alternatingLabel = index % 2 === 0 ? "صف عادي (أبيض)" : "صف مضلل (رمادي فاتح)";

        summaryAOA.push([
          index + 1,
          record.patient_name || "بدون اسم",
          record.receipt_number || "-",
          formattedDate,
          itemsDetail,
          totalQty,
          record.grand_total,
          officerName,
          alternatingLabel
        ]);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(summaryAOA);
      ws1["!cols"] = [
        { wch: 6 },  // م
        { wch: 25 }, // اسم المريض
        { wch: 20 }, // رقم الإيصال
        { wch: 24 }, // تاريخ ووقت المعاملة
        { wch: 55 }, // بيان المستلزمات
        { wch: 16 }, // إجمالي عدد القطع
        { wch: 22 }, // إجمالي قيمة الفاتورة
        { wch: 28 }, // منفذ الصرف المالي
        { wch: 22 }, // تنسيق الصف
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "كشف فواتير المرضى");

      // Sheet 2: تفاصيل بنود فواتير المرضى (Itemized)
      const itemizedAOA: any[][] = [
        ["مستشفى السلام - تفاصيل البنود والكميات المصروفة بالفواتير"],
        [`تاريخ ووقت التصدير: ${todayStr} - ${timeStr}`],
        [], // Empty row spacer
        [
          "م",
          "رقم الإيصال",
          "اسم المريض",
          "تاريخ ووقت المعاملة",
          "كود المستلزم",
          "اسم المستلزم الطبي",
          "سعر المفرد (ج.م)",
          "الكمية المصروفة",
          "إجمالي البند (ج.م)",
          "منفذ الصرف المالي (اسم الحساب)",
          "تنسيق وتظليل الصف"
        ]
      ];

      let rowIdx = 1;
      targets.forEach((record) => {
        const formattedDate = record.created_at
          ? new Date(record.created_at).toLocaleString("ar-EG")
          : "غير محدد";
        const officerName = getUserName(record.billing_officer_email, currentLang) || record.billing_officer_email || "-";

        record.invoice_lines.forEach((line) => {
          const alternatingLabel = rowIdx % 2 === 0 ? "صف مضلل (رمادي فاتح)" : "صف عادي (أبيض)";
          itemizedAOA.push([
            rowIdx++,
            record.receipt_number || "-",
            record.patient_name || "بدون اسم",
            formattedDate,
            line.item_id,
            line.item_name_ar || line.item_name_en,
            line.unit_price,
            line.quantity,
            line.line_total,
            officerName,
            alternatingLabel
          ]);
        });
      });

      const ws2 = XLSX.utils.aoa_to_sheet(itemizedAOA);
      ws2["!cols"] = [
        { wch: 6 },  // م
        { wch: 18 }, // رقم الإيصال
        { wch: 25 }, // اسم المريض
        { wch: 24 }, // تاريخ المعاملة
        { wch: 14 }, // كود المستلزم
        { wch: 32 }, // اسم المستلزم
        { wch: 16 }, // سعر المفرد
        { wch: 16 }, // الكمية المصروفة
        { wch: 18 }, // إجمالي البند
        { wch: 28 }, // منفذ الصرف المالي
        { wch: 22 }, // تنسيق الصف
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "تفاصيل بنود الفواتير");

      const fileDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `فواتير_المرضى_مستشفى_السلام_${fileDate}.xlsx`);
    } catch (err) {
      console.error("Error exporting invoices to excel:", err);
    }
  };

  // Find maximum amount in history dynamically to establish the upper bound of the dual range slider
  const sliderMaxCeiling = React.useMemo(() => {
    if (history.length === 0) return 3000;
    const maxVal = Math.max(...history.map((h) => h.grand_total), 500);
    return Math.ceil(maxVal);
  }, [history]);

  // Filter count indicator
  const activeFiltersCount = 
    (startDate ? 1 : 0) + 
    (endDate ? 1 : 0) + 
    (startTime ? 1 : 0) + 
    (endTime ? 1 : 0) + 
    (minAmount ? 1 : 0) + 
    (maxAmount ? 1 : 0);

  const adjustDay = (amount: number) => {
    const baseDate = startDate ? new Date(startDate) : new Date();
    if (isNaN(baseDate.getTime())) return;
    baseDate.setDate(baseDate.getDate() + amount);
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;
    setStartDate(formatted);
    setEndDate(formatted);
  };

  const getFormattedDatePillText = (dateString: string) => {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;
    
    const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const monthsAr = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const dayName = daysAr[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthName = monthsAr[dateObj.getMonth()];
    const yearNum = dateObj.getFullYear();
    
    const toArabicIndic = (numStr: string | number) => {
      const dict: { [key: string]: string } = {
        "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
        "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩"
      };
      return String(numStr).split("").map(c => dict[c] || c).join("");
    };
    
    if (currentLang === "ar") {
      return `${dayName}، ${toArabicIndic(dayNum)} ${monthName} ${toArabicIndic(yearNum)}`;
    } else {
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      return dateObj.toLocaleDateString("en-US", options);
    }
  };

  // Filter history list based on search term and advanced parameters
  const filteredHistory = history.filter((invoice) => {
    // 1. Core keyword text search
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      invoice.patient_name.toLowerCase().includes(q) ||
      invoice.receipt_number.toLowerCase().includes(q);
    
    if (!matchesSearch) return false;

    // Parse the invoice's creation timestamp
    const invoiceDate = new Date(invoice.created_at);
    
    // Format helper YYYY-MM-DD
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyymmdd = `${invoiceDate.getFullYear()}-${pad(invoiceDate.getMonth() + 1)}-${pad(invoiceDate.getDate())}`;
    
    // Format helper HH:MM
    const hhmm = `${pad(invoiceDate.getHours())}:${pad(invoiceDate.getMinutes())}`;

    // 2. Date ranges filtering
    if (startDate && yyyymmdd < startDate) return false;
    if (endDate && yyyymmdd > endDate) return false;

    // 3. Time ranges filtering
    if (startTime && hhmm < startTime) return false;
    if (endTime && hhmm > endTime) return false;

    // 4. Grand Total amount min-max range limitation
    if (minAmount) {
      const minVal = parseFloat(minAmount);
      if (!isNaN(minVal) && invoice.grand_total < minVal) return false;
    }
    if (maxAmount) {
      const maxVal = parseFloat(maxAmount);
      if (!isNaN(maxVal) && invoice.grand_total > maxVal) return false;
    }

    return true;
  });

  // Checkbox Selection state managers
  const isAllSelected = filteredHistory.length > 0 && filteredHistory.every(inv => selectedInvoiceIds.includes(inv.receipt_number));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all filtered
      const filteredRefs = filteredHistory.map(inv => inv.receipt_number);
      setSelectedInvoiceIds(prev => prev.filter(ref => !filteredRefs.includes(ref)));
    } else {
      // Select all filtered
      const filteredRefs = filteredHistory.map(inv => inv.receipt_number);
      setSelectedInvoiceIds(prev => {
        const merged = [...prev];
        filteredRefs.forEach(ref => {
          if (!merged.includes(ref)) merged.push(ref);
        });
        return merged;
      });
    }
  };

  const toggleSelectInvoice = (receiptNumber: string) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(receiptNumber)
        ? prev.filter(ref => ref !== receiptNumber)
        : [...prev, receiptNumber]
    );
  };

  // Export receipt history inside Database records archive panel
  const handleExportCSV = () => {
    // Columns headers matching Arabic or English translation context
    const headers = currentLang === "ar" ? [
      "رقم الإيصال",
      "اسم المريض",
      "التاريخ والوقت",
      "المستلزمات الطبية",
      "أعداد المستلزمات",
      "إجمالي سعر المستلزم",
      "إجمالي الفاتورة",
      "منفذ الصرف"
    ] : [
      "Receipt Number",
      "Patient Name",
      "Date & Time",
      "Medical Supplies",
      "Supply Quantities",
      "Total Price per Product",
      "Invoice Grand Total",
      "Dispatcher"
    ];

    const rows = filteredHistory.map(invoice => {
      // 1. المستلزمات الطبية list names (e.g., item1 | item2)
      const itemsSummary = invoice.invoice_lines
        .map((li) => `${currentLang === "ar" ? li.item_name_ar : li.item_name_en}`)
        .join(" | ");

      // 2. أعداد المستلزمات list quantities (e.g., 1 | 2)
      const quantitiesSummary = invoice.invoice_lines
        .map((li) => li.quantity)
        .join(" | ");

      // 3. إجمالي سعر المستلزم line totals (e.g., 20 ج.م | 30 ج.م)
      const lineTotalsSummary = invoice.invoice_lines
        .map((li) => {
          const totalLinePrice = li.quantity * li.unit_price;
          return currentLang === "ar" ? `${totalLinePrice} ج.م` : `${totalLinePrice} LE`;
        })
        .join(" | ");

      const formattedDate = new Date(invoice.created_at).toLocaleString(
        currentLang === "ar" ? "ar-EG" : "en-US",
        { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }
      );

      const totalFormatted = currentLang === "ar"
        ? `${invoice.grand_total.toFixed(2)} ج.م`
        : `${invoice.grand_total.toFixed(2)} LE`;

      // Ensure proper escape sequence for standard Excel spreadsheet readers
      return [
        invoice.receipt_number,
        invoice.patient_name,
        formattedDate,
        itemsSummary,
        quantitiesSummary,
        lineTotalsSummary,
        totalFormatted,
        invoice.billing_officer_email
      ].map(val => {
        const stringVal = String(val || "").replace(/"/g, '""');
        return `"${stringVal}"`;
      });
    });

    const csvContent = [headers.map(h => `"${h}"`).join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Prepend UTF-8 BOM so Excel opens non-ASCII Arabic content in CSV natively without encoding problems
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `El_Salam_Hospital_Receipts_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded p-4.5 shadow-2xs mt-4">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4 ${
        currentLang === "ar" ? "text-right" : "text-left"
      }`} dir={currentLang === "ar" ? "rtl" : "ltr"}>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-sky-50 text-hospital-blue rounded-xl mt-1 shrink-0">
            <History className="w-5 h-5 text-hospital-blue" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 font-arabic">
              {currentLang === "ar" ? "أرشيف السجلات المعتمدة (قاعدة البيانات)" : "Committed Receipts Ledger"}
            </h3>
            <div className="mt-1 space-y-0.5">
              <p className="text-[11.5px] text-slate-500 font-bold leading-none font-arabic">
                {currentLang === "ar"
                  ? `إجمالي المستندات المدخلة اليوم: ${filteredHistory.length}`
                  : `Total shift records inserted today: ${filteredHistory.length}`}
              </p>
              <p className="text-[10px] text-slate-400 font-bold leading-none mt-1 font-arabic">
                {currentLang === "ar" ? "إيصال مالي" : "Financial Receipts"}
              </p>
            </div>
          </div>
        </div>

        {/* Day-by-day navigation arrows and date display (Screenshot 1) */}
        <div className="flex items-center gap-2 shrink-0 select-none" dir="ltr">
          <button
            type="button"
            onClick={() => adjustDay(-1)}
            className="p-1.5 md:p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-hospital-blue rounded-xl transition-all cursor-pointer shadow-3xs focus:outline-none"
            title={currentLang === "ar" ? "اليوم السابق" : "Previous Day"}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 px-3 md:px-4 py-2 border-2 border-emerald-600 rounded-xl text-emerald-700 bg-emerald-500/5 shadow-3xs hover:bg-emerald-500/10 transition-all font-bold">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-black font-arabic whitespace-nowrap">
              {getFormattedDatePillText(startDate || getTodayDateString())}
            </span>
          </div>

          <button
            type="button"
            onClick={() => adjustDay(1)}
            className="p-1.5 md:p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-hospital-blue rounded-xl transition-all cursor-pointer shadow-3xs focus:outline-none"
            title={currentLang === "ar" ? "اليوم التالي" : "Next Day"}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* Search Filter and Export Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full justify-between mt-3 mb-5" dir={currentLang === "ar" ? "rtl" : "ltr"}>
          <div className="flex flex-wrap items-center gap-2">
            {filteredHistory.length > 0 && (
              <button
                type="button"
                id="print-all-pdf-btn"
                onClick={() => {
                  setShowPrintOptions(true);
                }}
                className="px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-colors font-arabic cursor-pointer shrink-0 shadow-3xs"
                title={currentLang === "ar" ? "طباعة الفواتير المحددة أو تنزيلها كـ PDF" : "Print collective invoices or save/download as PDF"}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{currentLang === "ar" ? "طباعة الفواتير مجمعة (PDF)" : "Print Collective (PDF)"}</span>
              </button>
            )}

            {/* Advanced Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 text-xs rounded border transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold font-arabic shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? "bg-sky-50 text-hospital-blue border-sky-300 ring-1 ring-sky-200"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
              }`}
              title={currentLang === "ar" ? "تصفية الفواتير بالتاريخ والوقت والقيمة" : "Filter by date, time and amount range"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{currentLang === "ar" ? "تصفية متقدمة" : "Filters"}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-sky-600 text-white text-[9.5px] px-1.5 py-0.5 rounded-full font-bold font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input inside History */}
          <div className="relative flex-1 max-w-md w-full">
            <span className={`absolute inset-y-0 ${currentLang === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center text-slate-400 pointer-events-none`}>
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                currentLang === "ar"
                  ? "ابحث باسم المريض أو رقم الإيصال..."
                  : "Search archive by name or ID..."
              }
              className={`w-full py-1.5 text-xs border border-slate-200 rounded focus:border-hospital-blue outline-none text-slate-800 transition-all font-arabic ${
                currentLang === "ar" ? "pr-8 pl-3 text-right" : "pl-8 pr-3 text-left"
              }`}
            />
          </div>
        </div>

      {/* Bulk Action / Floating Selection Banner right above filters */}
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-emerald-50/75 border border-emerald-250 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-right animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold font-arabic text-slate-700">
              {currentLang === "ar"
                ? `تم تحديد عدد (${selectedInvoiceIds.length}) فاتورة مخصصة للإجراءات مجمعة`
                : `Selected (${selectedInvoiceIds.length}) specific invoices for batch actions`}
            </span>
            <button
              type="button"
              onClick={() => setSelectedInvoiceIds([])}
              className="text-[10.5px] text-rose-600 hover:text-rose-800 font-bold font-arabic underline cursor-pointer"
            >
              {currentLang === "ar" ? "إلغاء التحديد" : "Clear selection"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPrintOptions(true)}
            className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all font-arabic cursor-pointer shadow-md shadow-emerald-100 uppercase"
          >
            <Printer className="w-4 h-4" />
            <span>
              {currentLang === "ar" ? "طباعة الفواتير أو تنزيلها كـ PDF" : "Print Invoices or Download PDF"}
            </span>
          </button>
        </div>
      )}

      {/* Collapsible Advanced Filters Panel */}
      {showFilters && (
        <div className="border border-slate-200 bg-slate-50/55 rounded-xl p-3.5 mb-4 animate-fadeIn space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hospital-blue animate-pulse" />
              <h4 className="text-xs font-black text-slate-700 font-arabic">
                {currentLang === "ar" ? "خيارات فرز وفلترة المستندات التخصصية" : "Advanced Filtering Panel"}
              </h4>
            </div>
            {(activeFiltersCount > 0 || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setStartTime("");
                  setEndTime("");
                  setMinAmount("");
                  setMaxAmount("");
                }}
                className="text-[10.5px] text-rose-600 hover:text-rose-800 font-bold font-arabic cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>{currentLang === "ar" ? "إعادة تعيين الفلاتر" : "Reset Filters"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-right font-arabic">
            {/* Range of Dates */}
            <div className="space-y-2 border-r border-slate-200/80 pr-3.5">
              <span className="block text-[11px] font-black text-slate-800">
                {currentLang === "ar" ? "📅 تحديد النطاق الزمني للتاريخ:" : "Range of Dates:"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500">
                    {currentLang === "ar" ? "من تاريخ:" : "From Date:"}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-hospital-blue bg-white font-mono text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500">
                    {currentLang === "ar" ? "إلى تاريخ:" : "To Date:"}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-hospital-blue bg-white font-mono text-center"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = getTodayDateString();
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  className="text-[10px] text-hospital-blue hover:text-sky-850 font-extrabold bg-sky-50 px-2.5 py-1 rounded"
                >
                  {currentLang === "ar" ? "📅 فواتير اليوم فقط" : "Today Only"}
                </button>
              </div>
            </div>

            {/* Range of Hours */}
            <div className="space-y-2 border-r border-slate-200/80 pr-3.5">
              <span className="block text-[11px] font-black text-slate-800">
                {currentLang === "ar" ? "⏰ تحديد النطاق الزمني للساعات:" : "Range of Hours:"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500">
                    {currentLang === "ar" ? "من ساعة:" : "From Hour:"}
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-hospital-blue bg-white font-mono text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500">
                    {currentLang === "ar" ? "إلى ساعة:" : "To Hour:"}
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded outline-none focus:border-hospital-blue bg-white font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Amount Slider exactly styled like screenshot 1 */}
            <div className="space-y-2 lg:col-span-1 border-r border-slate-200/80 pr-3.5 flex flex-col justify-between">
              <div>
                <span className="block text-[11px] font-black text-slate-800 mb-1">
                  {currentLang === "ar" ? "💰 فلترة القيمة الكلية للفواتير:" : "Total Price Filter:"}
                </span>
                
                {/* CSS Styled Multi-range inputs inside an explicit LTR container to avoid RTL Mirroring */}
                <div dir="ltr" className="relative w-full">
                  <style dangerouslySetInnerHTML={{ __html: `
                    .custom-range::-webkit-slider-thumb {
                      pointer-events: auto !important;
                      appearance: none !important;
                      -webkit-appearance: none !important;
                      width: 26px !important;
                      height: 26px !important;
                      border-radius: 50% !important;
                      background: transparent !important;
                      cursor: pointer !important;
                      border: none !important;
                    }
                    .custom-range::-moz-range-thumb {
                      pointer-events: auto !important;
                      width: 26px !important;
                      height: 26px !important;
                      border-radius: 50% !important;
                      background: transparent !important;
                      cursor: pointer !important;
                      border: none !important;
                    }
                    .custom-range {
                      -webkit-appearance: none;
                      -moz-appearance: none;
                      background: transparent;
                    }
                  ` }} />

                  {/* Visual Dual Slider Track */}
                  <div className="relative w-full h-8 flex items-center mb-1.5 mt-5 px-1">
                    {/* Native Inputs Overlaid */}
                    <input
                      type="range"
                      min="0"
                      max={sliderMaxCeiling}
                      value={minAmount ? parseFloat(minAmount) : 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const currentMax = maxAmount ? parseFloat(maxAmount) : sliderMaxCeiling;
                        if (val <= currentMax) {
                          setMinAmount(val.toString());
                        }
                      }}
                      className={`absolute inset-x-0 w-full h-1 bg-transparent pointer-events-none appearance-none outline-none custom-range ${
                        parseFloat(minAmount || "0") > (sliderMaxCeiling / 2) ? "z-30" : "z-20"
                      }`}
                      style={{ WebkitAppearance: "none" }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={sliderMaxCeiling}
                      value={maxAmount ? parseFloat(maxAmount) : sliderMaxCeiling}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const currentMin = minAmount ? parseFloat(minAmount) : 0;
                        if (val >= currentMin) {
                          setMaxAmount(val.toString());
                        }
                      }}
                      className={`absolute inset-x-0 w-full h-1 bg-transparent pointer-events-none appearance-none outline-none custom-range ${
                        parseFloat(minAmount || "0") > (sliderMaxCeiling / 2) ? "z-20" : "z-30"
                      }`}
                      style={{ WebkitAppearance: "none" }}
                    />
                    
                    {/* Clean Visual representation */}
                    <div className="relative w-full h-2.5 bg-slate-200 rounded-full z-10">
                      {/* Active green/emerald track based on exact mathematically accurate values */}
                      <div
                        className="absolute h-full bg-emerald-500 rounded-full"
                        style={{
                          left: `${((minAmount ? parseFloat(minAmount) : 0) / sliderMaxCeiling) * 100}%`,
                          width: `${(((maxAmount ? parseFloat(maxAmount) : sliderMaxCeiling) - (minAmount ? parseFloat(minAmount) : 0)) / sliderMaxCeiling) * 100}%`
                        }}
                      />
                      
                      {/* Tooltip dynamic tags */}
                      <div
                        className="absolute -top-7 -translate-x-1/2 z-35"
                        style={{
                          left: `${((minAmount ? parseFloat(minAmount) : 0) / sliderMaxCeiling) * 100}%`
                        }}
                      >
                        <span className="bg-slate-800 text-white text-[9.5px] px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap shadow-md relative after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                          {currentLang === "ar" ? `${minAmount || "0"} ج.م` : `${minAmount || "0"} LE`}
                        </span>
                      </div>

                      <div
                        className="absolute -top-7 -translate-x-1/2 z-35"
                        style={{
                          left: `${((maxAmount ? parseFloat(maxAmount) : sliderMaxCeiling) / sliderMaxCeiling) * 100}%`
                        }}
                      >
                        <span className="bg-slate-800 text-white text-[9.5px] px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap shadow-md relative after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-800">
                          {currentLang === "ar" ? `${maxAmount || Math.round(sliderMaxCeiling)} ج.م` : `${maxAmount || Math.round(sliderMaxCeiling)} LE`}
                        </span>
                      </div>

                      {/* Left and Right Glowing premium emerald thumbs mimicking screenshot 2 */}
                      <div
                        className="absolute w-5.5 h-5.5 bg-emerald-500 border-2.5 border-white rounded-full -top-1.25 shadow-md -ml-2.75 z-25 pointer-events-none flex items-center justify-center transition-transform hover:scale-110 active:scale-120"
                        style={{
                          left: `${((minAmount ? parseFloat(minAmount) : 0) / sliderMaxCeiling) * 100}%`
                        }}
                      >
                        {/* Subtly colored center indicator inside the knob */}
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                      
                      <div
                        className="absolute w-5.5 h-5.5 bg-emerald-500 border-2.5 border-white rounded-full -top-1.25 shadow-md -ml-2.75 z-25 pointer-events-none flex items-center justify-center transition-transform hover:scale-110 active:scale-120"
                        style={{
                          left: `${((maxAmount ? parseFloat(maxAmount) : sliderMaxCeiling) / sliderMaxCeiling) * 100}%`
                        }}
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Lower Boundary Label Numbers (0 ... Ceiling) */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold px-1 mt-1 mb-2">
                    <span>{currentLang === "ar" ? "0 ج.م" : "0 LE"}</span>
                    <span className="text-emerald-500 font-extrabold text-[12px]">●</span>
                    <span>{currentLang === "ar" ? `${Math.round(sliderMaxCeiling)} ج.م` : `${Math.round(sliderMaxCeiling)} LE`}</span>
                  </div>
                </div>
              </div>

              {/* Exact side-by-side text input fields separated by a hyphen '-' as shown in the requested layout */}
              <div className="flex items-center justify-center gap-3" dir="ltr">
                <div className="relative flex-grow">
                  <input
                    type="number"
                    placeholder="min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full text-xs py-1.5 px-3 border border-slate-350 rounded-lg outline-none focus:border-green-500 bg-white text-center font-mono font-bold text-slate-800 shadow-3xs placeholder:text-slate-300"
                  />
                </div>
                <span className="text-slate-400 font-bold px-1 text-xs">-</span>
                <div className="relative flex-grow">
                  <input
                    type="number"
                    placeholder="max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full text-xs py-1.5 px-3 border border-slate-350 rounded-lg outline-none focus:border-green-500 bg-white text-center font-mono font-bold text-slate-800 shadow-3xs placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          <Database className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          <p className="text-xs font-medium font-arabic leading-relaxed">
            {searchQuery || startDate || endDate || startTime || endTime || minAmount || maxAmount
              ? currentLang === "ar"
                ? "لم يتم العثور على سجلات مطابقة للبحث أو خيارات الفرز الحالية بالتاريخ والوقت."
                : "No matching archived records found for active filters."
              : currentLang === "ar"
              ? "سجل البيانات فارغ حالياً. قم بملء الفاتورة على اليمين ثم اضغط 'تنفيذ وحفظ' لإدراج المعاملات."
              : "Transactions archive is empty. Complete receipt details and click 'Commit' to pop entries."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                <th className="py-2 px-3 text-center w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded text-hospital-blue focus:ring-hospital-blue w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3 text-slate-500 font-bold font-arabic text-right">
                  {currentLang === "ar" ? "اسم المريض" : "Patient Name"}
                </th>
                <th className="py-2 px-3 text-slate-500 font-bold font-arabic text-center">
                  {currentLang === "ar" ? "رقم الإيصال" : "Receipt No."}
                </th>
                <th className="py-2 px-3 text-slate-500 font-bold font-arabic text-center">
                  {currentLang === "ar" ? "تاريخ الحفظ" : "Committed Date"}
                </th>
                <th className="py-2 px-3 text-slate-500 font-bold font-arabic text-center">
                  {currentLang === "ar" ? "المسؤول المالي" : "Billing Officer"}
                </th>
                <th className="py-2 px-3 text-hospital-blue font-bold font-arabic text-center">
                  {currentLang === "ar" ? "القيمة الكلية" : "Grand Total"}
                </th>
                <th className="py-2 px-3 text-slate-500 font-bold font-arabic text-center">
                  {currentLang === "ar" ? "خيارات الإجراء" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((invoice, index) => {
                // Find actual original index in primary history array
                const originalIndex = history.findIndex(
                  (h) => h.receipt_number === invoice.receipt_number && h.created_at === invoice.created_at
                );

                const linesSummary = invoice.invoice_lines
                  .map((li) => `${li.quantity}x ${currentLang === "ar" ? li.item_name_ar : li.item_name_en}`)
                  .join(" ، ");

                const isCurrentlyActive = activeIndex === originalIndex;

                return (
                  <tr
                    key={`${invoice.receipt_number}-${invoice.created_at}-${index}`}
                    className={`hover:bg-slate-50/80 transition-colors group ${
                      isCurrentlyActive ? "bg-sky-50/45" : ""
                    }`}
                  >
                    {/* Select box column */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(invoice.receipt_number)}
                        onChange={() => toggleSelectInvoice(invoice.receipt_number)}
                        className="rounded text-hospital-blue focus:ring-hospital-blue w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>

                    {/* Patient Context */}
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => onViewDetail(originalIndex)}
                        className="font-bold text-hospital-blue hover:text-sky-800 hover:underline text-xs font-arabic leading-tight text-right transition-colors cursor-pointer block"
                      >
                        {invoice.patient_name}
                      </button>
                    </td>

                    {/* Receipt Number */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 text-[11px]">
                      {invoice.receipt_number}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-center text-slate-500 text-[10.5px]">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {new Date(invoice.created_at).toLocaleTimeString(
                            currentLang === "ar" ? "ar-EG" : "en-US",
                            { hour: "2-digit", minute: "2-digit", second: "2-digit" }
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Billing Officer */}
                    <td className="py-2.5 px-3 text-center font-arabic text-[11px]">
                      <span className="inline-block bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded border border-sky-200">
                        {getUserName(invoice.billing_officer_email, currentLang)}
                      </span>
                    </td>

                    {/* Financial value */}
                    <td className="py-2.5 px-3 text-center font-bold text-hospital-blue font-mono text-[10.5px]">
                      {formatCurrency(invoice.grand_total, currentLang)}
                    </td>

                    {/* Action controls */}
                    <td className="py-2 px-1 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View/Edit button */}
                        <button
                          onClick={() => onReload(originalIndex)}
                          className="px-2 py-1 rounded text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-500 border border-amber-250 hover:border-amber-500 transition-all font-semibold flex items-center gap-1 cursor-pointer"
                          title={currentLang === "ar" ? "تعديل الإيصال ومراجعته" : "View/Edit receipt"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="font-arabic text-[10px]">
                            {currentLang === "ar" ? "تعديل" : "Edit"}
                          </span>
                        </button>

                        {/* Print button */}
                        <button
                          onClick={() => onPrint(originalIndex)}
                          className="p-1 rounded text-slate-705 hover:text-white bg-slate-50 hover:bg-slate-805 border border-slate-200 hover:border-slate-805 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title={currentLang === "ar" ? "طباعة الإيصال الحراري" : "Print thermal slip"}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => onDelete(originalIndex)}
                          className="p-1 rounded text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-thin border-rose-100 hover:border-rose-600 transition-all cursor-pointer"
                          title={currentLang === "ar" ? "حذف السجل نهائياً" : "Delete archived entry"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Choice Prompt Wizard Overlay Modal for Multiple Printing/Saving as Excel */}
      {showPrintOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-150 overflow-hidden text-right font-arabic">
            <div className="bg-hospital-blue text-white p-4.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPrintOptions(false)}
                className="text-white/80 hover:text-white transition-opacity cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <span>
                  {currentLang === "ar" ? "خيارات طباعة وتصدير الفواتير" : "Print Invoices or Export to Excel"}
                </span>
              </h3>
            </div>

            <div className="p-5.5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {currentLang === "ar"
                  ? `لقد قمت باختيار عدد (${
                      selectedInvoiceIds.length > 0 ? selectedInvoiceIds.length : filteredHistory.length
                    }) فاتورة. يرجى اختيار الإجراء المطلوب تنفيذه:`
                  : `You selected (${
                      selectedInvoiceIds.length > 0 ? selectedInvoiceIds.length : filteredHistory.length
                    }) invoices. Please select the format option you want to proceed with:`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Direct print output */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintOptions(false);
                    if (onPrintBatch) {
                      const targets = selectedInvoiceIds.length > 0
                        ? history.filter(h => selectedInvoiceIds.includes(h.receipt_number))
                        : filteredHistory;
                      onPrintBatch(targets);
                    }
                  }}
                  className="p-4 border-2 border-slate-200 hover:border-hospital-blue hover:bg-sky-55/30 rounded-xl transition-all text-center flex flex-col items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-sky-50 text-hospital-blue rounded-full group-hover:bg-hospital-blue group-hover:text-white transition-colors">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-800">
                      {currentLang === "ar" ? "إرسال للطابعة مباشرة" : "Direct Printer Output"}
                    </span>
                    <span className="block text-[10.5px] text-slate-400 mt-0.5">
                      {currentLang === "ar" ? "طباعة الفواتير وراء بعضها" : "Batch print system"}
                    </span>
                  </div>
                </button>

                {/* Option 2: Save / Export to Excel */}
                <button
                  type="button"
                  id="choice-download-excel"
                  onClick={() => {
                    setShowPrintOptions(false);
                    const targets = selectedInvoiceIds.length > 0
                      ? history.filter(h => selectedInvoiceIds.includes(h.receipt_number))
                      : filteredHistory;
                    handleExportInvoicesToExcel(targets);
                  }}
                  className="p-4 border-2 border-emerald-250 hover:border-emerald-500 hover:bg-emerald-50/15 rounded-xl transition-all text-center flex flex-col items-center gap-2.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-800">
                      {currentLang === "ar" ? "تصدير كـ ملف Excel" : "Export to Excel (.xlsx)"}
                    </span>
                    <span className="block text-[10.5px] text-slate-400 mt-0.5">
                      {currentLang === "ar" ? "تحميل كشف فواتير المرضى بالتفصيل" : "Download invoices spreadsheet"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-4.5 py-3 border-t border-slate-100 flex justify-start">
              <button
                type="button"
                onClick={() => setShowPrintOptions(false)}
                className="px-4 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold rounded-lg transition-colors cursor-pointer"
              >
                {currentLang === "ar" ? "إلغاء النافذة" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
