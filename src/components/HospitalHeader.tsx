import React, { useState, useEffect } from "react";
import { Shield, Languages, User, Clock, MapPin, LogOut, Menu, X } from "lucide-react";
import { Language } from "../types";
import { getUserName } from "../utils";
import HospitalLogo from "./HospitalLogo";

interface HospitalHeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  loggedInUserEmail?: string | null;
  loggedInRole?: "SUPER_ADMIN" | "RECEPTION" | null;
  onLogout?: () => void;
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
}

export default function HospitalHeader({
  currentLang,
  onLanguageChange,
  loggedInUserEmail,
  loggedInRole,
  onLogout,
  mobileNavOpen = false,
  onToggleMobileNav,
}: HospitalHeaderProps) {
  const [time, setTime] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = () => {
    if (currentLang === "ar") {
      const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const monthsAr = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      const dayName = daysAr[time.getDay()];
      const dayNum = time.getDate();
      const monthName = monthsAr[time.getMonth()];
      const yearNum = time.getFullYear();
      
      let hours = time.getHours();
      const minutes = String(time.getMinutes()).padStart(2, "0");
      const seconds = String(time.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "م" : "ص";
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      const toArabicIndic = (numStr: string | number) => {
        const dict: { [key: string]: string } = {
          "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
          "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩"
        };
        return String(numStr).split("").map(c => dict[c] || c).join("");
      };
      
      const datePart = `${dayName}، ${toArabicIndic(dayNum)} ${monthName} ${toArabicIndic(yearNum)}`;
      const timePart = `${toArabicIndic(hours)}:${toArabicIndic(minutes)}:${toArabicIndic(seconds)} ${ampm}`;
      return `${datePart} في ${timePart}`;
    } else {
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      return time.toLocaleDateString("en-US", options);
    }
  };

  return (
    <header 
      dir={currentLang === "ar" ? "rtl" : "ltr"}
      className="bg-white border-b-2 border-hospital-blue shadow-xs px-3 md:px-6 py-2.5 flex flex-row items-center justify-between gap-3 transition-all shrink-0 print:hidden"
    >
      {/* Brand Logo, Dept info & Hamburger Menu Button */}
      <div className="flex items-center gap-2.5">
        {onToggleMobileNav && (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="bg-[#0f172a] hover:bg-slate-800 text-white p-2.5 rounded-xl flex items-center justify-center cursor-pointer shadow-xs shrink-0 transition-transform active:scale-95"
            aria-label="Toggle Menu"
            title={currentLang === "ar" ? "قائمة الصفحات" : "Pages Menu"}
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5 text-rose-400" />
            ) : (
              <Menu className="w-5 h-5 text-sky-400" />
            )}
          </button>
        )}

        <HospitalLogo className="w-11 h-11 md:w-12 md:h-12 shrink-0 filter drop-shadow-sm" />
        <div className="text-start min-w-0">
          <h1 className="text-sm md:text-lg font-bold text-slate-800 tracking-tight font-arabic leading-tight truncate">
            {currentLang === "ar" ? "مستشفى السلام" : "El-Salam Hospital"}
          </h1>
          <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 justify-start font-arabic truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {currentLang === "ar"
              ? "٧٦ احمد عصمت عين شمس"
              : "76 Ahmed Esmat , Ain Shams"}
          </p>
        </div>
      </div>

      {/* Clock & User Profile */}
      <div className="flex flex-row items-center gap-2 md:gap-3">
        {/* Live Clock Info (hidden on very tiny screens to keep header clean) */}
        <div className="hidden sm:flex items-center gap-1.5 md:gap-2 text-slate-650 text-[10.5px] md:text-[11px] font-bold bg-slate-50/50 hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs transition-all">
          <Clock className="w-3.5 h-3.5 text-hospital-blue shrink-0" />
          <span className="font-arabic">{formatDate()}</span>
        </div>

        {/* User Profile Avatar with dropdown */}
        {loggedInUserEmail && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 focus:outline-none p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="User Profile"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-50 border-2 border-hospital-blue flex items-center justify-center text-hospital-blue font-bold shadow-3xs overflow-hidden relative">
                <User className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse" />
              </div>
            </button>

            {showDropdown && (
              <>
                {/* Backdrop clicks close dropdown */}
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                
                {/* Floating Dropdown Card */}
                <div className={`absolute ${currentLang === "ar" ? "left-0" : "right-0"} mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 animate-fadeIn font-sans py-2.5 text-right`}>
                  <div className={`px-4 py-2 border-b border-slate-100 ${currentLang === "ar" ? "text-right" : "text-left"}`}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight font-arabic">
                      {currentLang === "ar" ? "الحساب المستخدم حالياً:" : "Current User Profile:"}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 font-arabic mt-1">
                      {getUserName(loggedInUserEmail, currentLang)}
                    </h4>
                    <p className="text-[9.5px] text-slate-450 font-mono mt-0.5 break-all">{loggedInUserEmail}</p>
                  </div>
                  
                  <div className={`px-4 py-2 bg-slate-50/55 border-b border-slate-100 ${currentLang === "ar" ? "text-right" : "text-left"}`}>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">
                      {currentLang === "ar" ? "درجة الوصول بالمنظومة:" : "System Role Permission:"}
                    </span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      loggedInRole === "SUPER_ADMIN" ? "bg-red-50 text-red-700 border border-red-200" : "bg-sky-50 text-[#0284c7] border border-sky-200"
                    } font-arabic`}>
                      {loggedInRole === "SUPER_ADMIN" 
                        ? (currentLang === "ar" ? "🔑 مدير النظام الأعلى" : "SUPER ADMIN")
                        : (currentLang === "ar" ? "🩺 مسؤول العيادات والتحصيل" : "RECEPTION OPERATOR")
                      }
                    </span>
                  </div>

                  <div className="mt-1 px-2">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        if (onLogout) onLogout();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ${currentLang === "ar" ? "flex-row-reverse text-right" : "text-left"}`}
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-arabic">{currentLang === "ar" ? "تسجيل الخروج الآمن" : "Sign Out Securely"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
