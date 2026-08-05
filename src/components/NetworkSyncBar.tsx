import React from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudUpload } from "lucide-react";
import { Language } from "../types";

interface NetworkSyncBarProps {
  currentLang: Language;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncSuccessMessage: string | null;
  onManualSync: () => void;
}

export default function NetworkSyncBar({
  currentLang,
  isOnline,
  pendingCount,
  isSyncing,
  syncSuccessMessage,
  onManualSync,
}: NetworkSyncBarProps) {
  // If online, no pending items, no syncing, and no success message to display, don't take up space
  if (isOnline && pendingCount === 0 && !isSyncing && !syncSuccessMessage) {
    return null;
  }

  return (
    <div
      dir={currentLang === "ar" ? "rtl" : "ltr"}
      className="w-full shrink-0 z-40 transition-all font-sans print:hidden"
    >
      {/* 1. Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-3 md:px-6 py-2 shadow-sm border-b border-amber-600 flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-amber-600 rounded-lg shrink-0 shadow-3xs animate-pulse">
              <WifiOff className="w-5 h-5 text-amber-100" />
            </div>
            <div className="text-start">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs md:text-sm font-arabic tracking-tight">
                  {currentLang === "ar"
                    ? "⚠️ أنتم الآن غير متصلين بالإنترنت (وضع أوفلاين)"
                    : "⚠️ Offline Mode - Working Offline"}
                </span>
                {pendingCount > 0 && (
                  <span className="bg-amber-950/40 text-amber-100 border border-amber-300/40 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold font-mono">
                    {currentLang === "ar"
                      ? `${pendingCount} إيصال/تعديل في انتظار المزامنة`
                      : `${pendingCount} items pending sync`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-100 font-arabic mt-0.5 leading-tight">
                {currentLang === "ar"
                  ? "يمكنكم تسجيل وإصدار الروشتات والإيصالات بمرونة كاملة وبدون أي بطء. يتم الحفظ محلياً وسيتماثل تلقائياً فور عودة الإنترنت!"
                  : "Prescriptions and receipts are saved locally without delay. They will automatically sync as soon as internet is back!"}
              </p>
            </div>
          </div>

          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className="shrink-0 bg-white hover:bg-amber-50 text-amber-900 font-bold px-3 py-1.5 rounded-lg text-xs font-arabic transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 border border-amber-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{currentLang === "ar" ? "إعادة محاولة الاتصال" : "Retry Sync"}</span>
          </button>
        </div>
      )}

      {/* 2. Syncing in progress banner (when online) */}
      {isOnline && isSyncing && (
        <div className="bg-sky-600 text-white px-3 md:px-6 py-2 shadow-xs border-b border-sky-700 flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-sky-100 animate-spin shrink-0" />
            <span className="font-bold text-xs md:text-sm font-arabic">
              {currentLang === "ar"
                ? "🔄 تم استعادة الاتصال! جاري رفع الإيصالات والبيانات المحفوظة أوفلاين تلقائياً إلى السيرفر..."
                : "🔄 Internet restored! Automatically syncing offline saved receipts to server..."}
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-sky-800 text-sky-100 text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono shrink-0">
              {pendingCount} left
            </span>
          )}
        </div>
      )}

      {/* 3. Sync restored success banner */}
      {isOnline && !isSyncing && syncSuccessMessage && (
        <div className="bg-emerald-600 text-white px-3 md:px-6 py-2 shadow-xs border-b border-emerald-700 flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            <span className="font-bold text-xs md:text-sm font-arabic">
              {syncSuccessMessage}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-700/60 text-emerald-100 px-2 py-0.5 rounded font-mono font-bold shrink-0">
            {currentLang === "ar" ? "مُتصل ومُتزامن" : "Connected & Synced"}
          </span>
        </div>
      )}

      {/* 4. Online with unsynced pending items alert */}
      {isOnline && !isSyncing && !syncSuccessMessage && pendingCount > 0 && (
        <div className="bg-sky-700 text-white px-3 md:px-6 py-1.5 shadow-xs border-b border-sky-800 flex items-center justify-between gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <CloudUpload className="w-4 h-4 text-sky-200 shrink-0 animate-bounce" />
            <span className="font-bold text-xs font-arabic">
              {currentLang === "ar"
                ? `يوجد ${pendingCount} إيصال/تحديث أوفلاين جاهز للمزامنة مع قاعدة البيانات.`
                : `There are ${pendingCount} offline items ready to sync.`}
            </span>
          </div>
          <button
            onClick={onManualSync}
            className="bg-white hover:bg-sky-50 text-sky-900 font-bold px-2.5 py-1 rounded text-xs font-arabic transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
          >
            <RefreshCw className="w-3 h-3 text-sky-700" />
            <span>{currentLang === "ar" ? "مزامنة الآن" : "Sync Now"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
