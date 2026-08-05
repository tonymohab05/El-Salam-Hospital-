import React from "react";
import { Plus, Zap } from "lucide-react";
import { MedicalItem, Language, InvoiceLine } from "../types";
import { formatCurrency } from "../utils";

interface QuickAddTrayProps {
  currentLang: Language;
  inventory: MedicalItem[];
  onAddItem: (item: MedicalItem) => void;
  invoiceLines: InvoiceLine[];
}

// Select specific core ER medical items for the quick access list
const QUICK_ITEMS_IDS = [
  "med_002", // Pink cannula
  "med_004", // Normal saline
  "med_008", // 5ml syringe
  "med_016", // Gloves
  "med_018", // Painkiller
  "med_019", // Ceftriaxone
];

export default function QuickAddTray({
  currentLang,
  inventory,
  onAddItem,
  invoiceLines,
}: QuickAddTrayProps) {
  const quickItems = inventory.filter((item) =>
    QUICK_ITEMS_IDS.includes(item.id)
  );

  return (
    <div className="bg-slate-50 border border-slate-300 rounded p-3 shadow-3xs mt-3">
      <div className={`flex items-center gap-2 mb-2.5 ${currentLang === "ar" ? "justify-start" : "justify-start flex-row-reverse"}`}>
        <Zap className="w-4 h-4 text-hospital-blue" />
        <h3 className="text-xs font-bold text-slate-700 font-arabic">
          {currentLang === "ar"
            ? "الوصول السريع للمستلزمات الأكثر طلباً بقسم الطوارئ"
            : "High-Demand ER Fast Intake Supplies"}
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {quickItems.map((item, idx) => {
          const matchedLine = invoiceLines.find((l) => l.item_id === item.id);
          const selectedQty = matchedLine ? matchedLine.quantity : 0;
          const isSelected = selectedQty > 0;
          return (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => onAddItem(item)}
              title={currentLang === "ar" ? item.name_ar : item.name_en}
              className={`group relative flex flex-col justify-between p-2 rounded border text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-sky-50/80 border-hospital-blue shadow-4xs scale-101"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-4xs"
              }`}
            >
              {/* Category indicator line */}
              <div
                className={`absolute top-0 left-0 right-0 h-0.5 rounded-t ${
                  item.id.includes("med_018") || item.id.includes("med_019")
                    ? "bg-red-500"
                    : item.id.includes("med_004")
                    ? "bg-sky-400"
                    : "bg-hospital-blue"
                }`}
              />
              
              <div className="pt-1.5 min-h-[40px] mb-1.5">
                <p className="text-[10.5px] font-bold text-slate-700 line-clamp-2 leading-tight font-arabic">
                  {currentLang === "ar" ? item.name_ar : item.name_en}
                </p>
                <span className="text-[8.5px] text-slate-400 block mt-0.5 font-medium uppercase tracking-wider">
                  {currentLang === "ar" ? item.category_ar : item.category_en}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1 w-full">
                <span className="text-xs font-bold text-hospital-blue font-mono">
                  {formatCurrency(item.unit_price, currentLang)}
                </span>
                <div className="flex items-center gap-1">
                  {isSelected && (
                    <span className="px-1 py-0.5 bg-rose-500 text-white font-mono text-[9px] font-black rounded shadow-3xs animate-fadeIn">
                      x{selectedQty}
                    </span>
                  )}
                  <span className={`p-0.5 rounded transition-colors ${
                    isSelected 
                      ? "bg-sky-200 text-sky-900" 
                      : "bg-slate-100 text-slate-500 group-hover:bg-hospital-blue group-hover:text-white"
                  }`}>
                    <Plus className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
