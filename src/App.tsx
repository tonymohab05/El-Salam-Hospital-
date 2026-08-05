import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
  Info,
  Activity,
  Layers,
  Sparkles,
  Plus,
  HeartPulse,
  Shield,
  Users,
  Printer,
  Coins,
  TrendingUp,
  UserCheck,
  UserX,
  FileText,
  Bell,
  Mail,
  Volume2,
  VolumeX,
  Inbox,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Sliders,
  Database,
  ClipboardList,
  Eye,
  ArrowRight,
  ShieldAlert,
  Edit,
  ArrowLeft,
  X,
  Menu,
  Download,
  Save,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  MedicalItem,
  InvoiceLine,
  InvoicePayload,
  Language,
  ReceptionOperator,
  HOSPITAL_INVENTORY,
  RestockInvoice,
  RestockInvoiceItem,
} from "./types";

import {
  isSupabaseConfigured,
  fetchSupabaseInventory,
  upsertSupabaseMedicalItem,
  deleteSupabaseMedicalItem,
  fetchSupabasePatientInvoices,
  insertSupabasePatientInvoice,
  deleteSupabasePatientInvoice,
  fetchSupabaseRestockInvoices,
  insertSupabaseRestockInvoice,
  updateSupabaseRestockItem,
  deleteSupabaseRestockItem,
  authenticateSupabaseUser,
  fetchSupabaseAppUsers,
  upsertSupabaseAppUser,
  toggleSupabaseAppUserActive,
  deleteSupabaseAppUser,
} from "./supabase";

export interface DispatchedEmail {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  body_html: string;
  triggered_by_item_id: string;
  triggered_by_item_name: string;
  previous_stock: number;
  current_stock: number;
  threshold: number;
  sent_at: string;
  status: "Sent" | "Delivered / Dispatched" | "Pending";
  is_read: boolean;
}
import {
  formatCurrency,
  translateNumberToCurrencyWords,
  roundPrice,
  formatArabicDigits,
} from "./utils";

import HospitalHeader from "./components/HospitalHeader";
import SuitesHistory from "./components/SuitesHistory";
import HospitalLogo from "./components/HospitalLogo";
import DailyConsumptionReport from "./components/DailyConsumptionReport";
import NetworkSyncBar from "./components/NetworkSyncBar";
import { getUserName } from "./utils";
import {
  getPendingQueueCount,
  queuePendingInvoice,
  queuePendingDeletedInvoice,
  queuePendingItem,
  queuePendingDeletedItem,
  queuePendingRestock,
  processPendingSyncQueue,
} from "./utils/offlineSync";

// Session interface for multiple open "kasema" (receipt sessions)
interface ReceiptSession {
  id: string;
  patientName: string;
  receiptNumber: string;
  invoiceLines: InvoiceLine[];
  motorNumbers?: string;
}

// Initial patient & receipt number state preset
const INITIAL_PATIENT = "";
const INITIAL_RECEIPT = "";
const INITIAL_LINES: InvoiceLine[] = [];

interface StagedRestockItem {
  id: string;
  name_ar: string;
  name_en: string;
  category_ar: string;
  category_en: string;
  quantity: number | ""; // allow empty string when typing!
  expiryDate: string;
}

interface ShipmentRowProps {
  key?: any;
  invoice: RestockInvoice;
  item: any;
  lang: string;
  onSave: (invoiceId: string, qty: number, expiry: string) => void;
  onDelete: (invoiceId: string) => void;
}

function ShipmentRow({ invoice, item, lang, onSave, onDelete }: ShipmentRowProps) {
  const [qty, setQty] = useState<number | "">(item.quantityAdded || 0);
  const [expiry, setExpiry] = useState<string>(item.expiryDate || "");

  // Update internal states if the prop changes
  useEffect(() => {
    setQty(item.quantityAdded || 0);
    setExpiry(item.expiryDate || "");
  }, [item.quantityAdded, item.expiryDate]);

  return (
    <tr className="border-b border-slate-150 hover:bg-slate-50 transition-colors">
      <td className="py-2.5 px-3 font-mono text-xs text-right border-l border-slate-205">
        <div className="font-bold text-slate-800">{invoice.id}</div>
        <div className="text-[10px] text-slate-500 font-arabic mt-0.5">{invoice.supplier}</div>
      </td>
      <td className="py-2.5 px-3 text-center border-l border-slate-205 font-mono text-slate-600 text-xs">
        {new Date(invoice.timestamp).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
      </td>
      <td className="py-2.5 px-3 text-center border-l border-slate-205">
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-20 text-xs font-mono text-center p-1 border border-slate-350 rounded outline-none focus:border-sky-500 text-slate-905"
        />
      </td>
      <td className="py-2.5 px-3 text-center border-l border-slate-205">
        <input
          type="date"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="w-full max-w-[130px] text-xs font-mono p-1 border border-slate-350 rounded outline-none focus:border-sky-500 text-center text-slate-905"
        />
      </td>
      <td className="py-2.5 px-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => onSave(invoice.id, qty === "" ? 0 : qty, expiry)}
            className="bg-sky-600 hover:bg-sky-750 text-white font-extrabold px-2.5 py-1 rounded transition-colors text-[10.5px] font-arabic cursor-pointer shadow-3xs"
          >
            {lang === "ar" ? "حفظ" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(invoice.id)}
            className="border border-rose-100 hover:bg-rose-50 text-rose-600 font-black px-1.5 py-1 rounded transition-all text-[10.5px] font-arabic cursor-pointer"
            title={lang === "ar" ? "حذف" : "Delete"}
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function App() {
  // Locale State (Default: Arabic)
  const [lang, setLang] = useState<Language>("ar");

  // Operational Mode State: RECEPTION (billing) vs SUPER_ADMIN (admin dash)
  const [mode, setMode] = useState<"RECEPTION" | "SUPER_ADMIN">("RECEPTION");

  // Persistent State for Managed Inventory (with Stock and Price levels)
  const [inventory, setInventory] = useState<MedicalItem[]>(() => {
    const cached = localStorage.getItem("el_salam_er_inventory_v1");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse cached inventory", e);
      }
    }
    return HOSPITAL_INVENTORY;
  });

  // Persistent State for reception operator account list
  const [operators, setOperators] = useState<ReceptionOperator[]>(() => {
    const cached = localStorage.getItem("el_salam_er_operators_v1");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse cached operators", e);
      }
    }
    return [
      {
        email: "Antonymohab@gmail.com",
        isActive: true,
        joined_at: new Date().toISOString(),
      },
    ];
  });

  // Receipt States
  const [patientName, setPatientName] = useState<string>(INITIAL_PATIENT);
  const [receiptNumber, setReceiptNumber] = useState<string>(INITIAL_RECEIPT);
  const [invoiceLines, setInvoiceLines] =
    useState<InvoiceLine[]>(INITIAL_LINES);
  const [motorNumbers, setMotorNumbers] = useState<string>("");

  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(false);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<"connected" | "error" | "offline">("offline");

  // Offline / Online sync states
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() =>
    getPendingQueueCount()
  );
  const [isSyncingPending, setIsSyncingPending] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Multiple sessions / kasema states
  const [sessions, setSessions] = useState<ReceiptSession[]>([
    { id: "sess-1", patientName: "", receiptNumber: "", invoiceLines: [], motorNumbers: "" },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>("sess-1");
  const [amountPaid, setAmountPaid] = useState<number | "">("");

  // States for Batch PDF Printing
  const [printMode, setPrintMode] = useState<"single" | "batch">("single");
  const [batchInvoices, setBatchInvoices] = useState<InvoicePayload[]>([]);

  // States for isolated historical reprinting (retains active inputs during reprint)
  const [tempPrintRecord, setTempPrintRecord] = useState<InvoicePayload | null>(
    null,
  );

  // States for deleting history with soft confirmation dialogue modal
  const [deleteHistoryPendingIndex, setDeleteHistoryPendingIndex] = useState<
    number | null
  >(null);

  // Dynamically sync fields of the active session tab whenever fields change
  useEffect(() => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, patientName, receiptNumber, invoiceLines, motorNumbers }
          : s,
      ),
    );
  }, [patientName, receiptNumber, invoiceLines, motorNumbers, activeSessionId]);

  // Session Action handlers
  const handleReceiptNumberChange = (val: string) => {
    let letterCount = 0;
    let result = "";
    for (const char of val) {
      if (/[\p{L}]/u.test(char)) {
        if (letterCount < 3) {
          letterCount++;
          result += char;
        }
      } else {
        result += char;
      }
    }
    setReceiptNumber(result);
  };

  const handleSwitchSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setActiveSessionId(sessionId);
      setPatientName(target.patientName);
      setReceiptNumber(target.receiptNumber);
      setInvoiceLines(target.invoiceLines);
      setMotorNumbers(target.motorNumbers || "");
      setAmountPaid("");
    }
  };

  const handleNewSession = () => {
    // Generate an invoice ID if necessary, but request says they are blank by default
    const newSessId = "sess-" + Date.now();
    const newSess: ReceiptSession = {
      id: newSessId,
      patientName: "",
      receiptNumber: "",
      invoiceLines: [],
      motorNumbers: "",
    };
    setSessions((prev) => [...prev, newSess]);
    setActiveSessionId(newSessId);
    setPatientName("");
    setReceiptNumber("");
    setInvoiceLines([]);
    setMotorNumbers("");
    setAmountPaid("");
  };

  const handleCloseSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionClosePendingId(sessionId);
  };

  const confirmCloseSession = (sessionId: string) => {
    if (sessions.length <= 1) {
      // Just clear the single existing session
      setPatientName("");
      setReceiptNumber("");
      setInvoiceLines([]);
      setAmountPaid("");
      setSessions([
        { id: "sess-1", patientName: "", receiptNumber: "", invoiceLines: [] },
      ]);
      setActiveSessionId("sess-1");
      setSessionClosePendingId(null);
      return;
    }

    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);

    if (activeSessionId === sessionId) {
      const firstSess = updated[0];
      setActiveSessionId(firstSess.id);
      setPatientName(firstSess.patientName);
      setReceiptNumber(firstSess.receiptNumber);
      setInvoiceLines(firstSess.invoiceLines);
      setAmountPaid("");
    }
    setSessionClosePendingId(null);
  };

  // Selector Navigation states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  // History system
  const [history, setHistory] = useState<InvoicePayload[]>([]);
  const [historySearch, setHistorySearch] = useState<string>("");
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number | null>(
    null,
  );

  // Feedback notifications
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null,
  );
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [pendingSaveConfirmation, setPendingSaveConfirmation] =
    useState<boolean>(false);
  const [sessionClosePendingId, setSessionClosePendingId] = useState<
    string | null
  >(null);

  // Daily auto-backup prompt state
  const [showBackupPrompt, setShowBackupPrompt] = useState<boolean>(false);

  // Active page: ENTRANCE (Main Intake Desk) vs ARCHIVE (Database Records) vs DETAIL (Patient Receipt Details) vs CONSUMPTION (Daily report) vs ADMIN (Super Admin workspace) vs OPERATORS (Authorize operators) vs RESTOCK (Replenish stocks)
  const [activePage, setActivePage] = useState<
    | "ENTRANCE"
    | "ARCHIVE"
    | "DETAIL"
    | "CONSUMPTION"
    | "ADMIN"
    | "OPERATORS"
    | "RESTOCK"
    | "ADD_PRODUCT"
    | "RESTOCK_DETAIL"
    | "PRODUCT_DETAIL"
  >("ENTRANCE");
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const [selectedRestockInvoice, setSelectedRestockInvoice] = useState<RestockInvoice | null>(null);

  // Active Admin Sub Tab: "MASTER" | "EXPIRIES" | "SHORTAGES"
  const [activeAdminTab, setActiveAdminTab] = useState<"MASTER" | "EXPIRIES" | "SHORTAGES">("MASTER");

  // Tab state within Add Product/Category screen
  const [addItemTab, setAddItemTab] = useState<"PRODUCT" | "CATEGORY">("PRODUCT");
  const [customCategories, setCustomCategories] = useState<{ ar: string; en: string; }[]>([]);
  const [newCatNameAr, setNewCatNameAr] = useState<string>("");
  const [newCatNameEn, setNewCatNameEn] = useState<string>("");

  // Selected Product ID for PRODUCT_DETAIL page
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // States for PRODUCT_DETAIL editing
  const [detailId, setDetailId] = useState<string>("");
  const [detailNameAr, setDetailNameAr] = useState<string>("");
  const [detailNameEn, setDetailNameEn] = useState<string>("");
  const [detailCategoryAr, setDetailCategoryAr] = useState<string>("");
  const [detailCategoryEn, setDetailCategoryEn] = useState<string>("");
  const [detailStock, setDetailStock] = useState<number | "">("");
  const [detailUnitPrice, setDetailUnitPrice] = useState<number | "">("");
  const [detailThreshold, setDetailThreshold] = useState<number | "">("");
  const [detailExpiryDate, setDetailExpiryDate] = useState<string>("");

  const [overriddenStocks, setOverriddenStocks] = useState<string[]>(() => {
    const cached = localStorage.getItem("el_salam_er_overridden_stocks_v1");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse overridden stocks", e);
      }
    }
    return [];
  });
  const [isCustomCategoryInEdit, setIsCustomCategoryInEdit] = useState<boolean>(false);

  const [saveConfirm, setSaveConfirm] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);

  // Master Inventory Row Inline Editing States
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string>("");
  const [editNameAr, setEditNameAr] = useState<string>("");
  const [editNameEn, setEditNameEn] = useState<string>("");
  const [editCategoryAr, setEditCategoryAr] = useState<string>("");
  const [editCategoryEn, setEditCategoryEn] = useState<string>("");
  const [editStock, setEditStock] = useState<number | "">("");
  const [editUnitPrice, setEditUnitPrice] = useState<number | "">("");
  const [editThreshold, setEditThreshold] = useState<number | "">("");
  const [editExpiryDate, setEditExpiryDate] = useState<string>("");
  const [masterSearchQuery, setMasterSearchQuery] = useState<string>("");
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>("");

  // Pending stock adjustments state (+ / -)
  const [pendingStockAdjustments, setPendingStockAdjustments] = useState<Record<string, number>>({});
  const [isConfirmStockSaveOpen, setIsConfirmStockSaveOpen] = useState<boolean>(false);

  // New Item creation form state parameters
  const [newItemId, setNewItemId] = useState<string>("");
  const [newItemNameAr, setNewItemNameAr] = useState<string>("");
  const [newItemNameEn, setNewItemNameEn] = useState<string>("");
  const [newItemCategoryType, setNewItemCategoryType] = useState<"existing" | "new">("existing");
  const [newItemCategoryAr, setNewItemCategoryAr] = useState<string>("");
  const [newItemCategoryEn, setNewItemCategoryEn] = useState<string>("");
  const [newItemUnitPrice, setNewItemUnitPrice] = useState<string>("");
  const [newItemInitialStock, setNewItemInitialStock] = useState<string>("0");
  const [selectedDetailInvoiceIndex, setSelectedDetailInvoiceIndex] = useState<
    number | null
  >(null);

  // In-Place Invoice Editor modal state
  const [editingInvoiceIndex, setEditingInvoiceIndex] = useState<number | null>(null);
  const [editingInvoicePatientName, setEditingInvoicePatientName] = useState<string>("");
  const [editingInvoiceLines, setEditingInvoiceLines] = useState<InvoiceLine[]>([]);
  const [editingInvoiceSearchQuery, setEditingInvoiceSearchQuery] = useState<string>("");
  const [editingSelectedNewItem, setEditingSelectedNewItem] = useState<MedicalItem | null>(null);
  const [editingNewItemQty, setEditingNewItemQty] = useState<number>(1);



  // Active expanded Restock Invoice details row ID
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
    null,
  );

  // Restock operations history logs (grouped as Invoices/Batches)
  const [restockInvoices, setRestockInvoices] = useState<RestockInvoice[]>(
    () => {
      const cachedNew = localStorage.getItem("el_salam_er_restock_invoices_v1");
      if (cachedNew) {
        try {
          return JSON.parse(cachedNew);
        } catch (e) {
          console.error("Failed to parse restock invoices", e);
        }
      }

      // Try backwards compatibility with old restock history cache
      const cachedOld = localStorage.getItem("el_salam_er_restock_history_v1");
      if (cachedOld) {
        try {
          const parsed = JSON.parse(cachedOld);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // If already in the new format
            if ("items" in parsed[0]) {
              return parsed;
            }
            // Convert old flat format to grouped invoices
            return parsed.map((oldLog: any) => ({
              id: oldLog.id.startsWith("RST-INV-")
                ? oldLog.id
                : `RST-INV-${oldLog.id.replace("RST-", "")}`,
              supplier: oldLog.supplier || "جهة توريد غير مصنفة",
              officer: oldLog.officer || "Antonymohab@gmail.com",
              notes: oldLog.notes || "",
              timestamp: oldLog.timestamp || new Date().toISOString(),
              items: [
                {
                  itemId: oldLog.itemId,
                  itemNameAr: oldLog.itemNameAr,
                  itemNameEn: oldLog.itemNameEn,
                  categoryAr: oldLog.category_ar || "عام",
                  categoryEn: oldLog.category_en || "General",
                  quantityAdded: oldLog.quantityAdded,
                  expiryDate: oldLog.expiryDate,
                },
              ],
            }));
          }
        } catch (e) {
          console.error("Failed to parse fallback restock history", e);
        }
      }

      // Default state when no cached/database restock invoices exist
      return [];
    },
  );

  const saveRestockInvoicesToCache = (updatedList: RestockInvoice[]) => {
    setRestockInvoices(updatedList);
    localStorage.setItem(
      "el_salam_er_restock_invoices_v1",
      JSON.stringify(updatedList),
    );

    if (isSupabaseConfigured) {
      (async () => {
        try {
          const addedRestocks = updatedList.filter((r) => !restockInvoices.some((o) => o.id === r.id));
          for (const r of addedRestocks) {
            if (navigator.onLine) {
              const ok = await insertSupabaseRestockInvoice(r);
              if (!ok) queuePendingRestock(r);
            } else {
              queuePendingRestock(r);
            }
          }

          for (const r of updatedList) {
            const old = restockInvoices.find((o) => o.id === r.id);
            if (old) {
              for (const item of r.items) {
                const oldItem = old.items.find((oi) => oi.itemId === item.itemId);
                if (!oldItem || oldItem.quantityAdded !== item.quantityAdded || oldItem.expiryDate !== item.expiryDate) {
                  await updateSupabaseRestockItem(r.id, item.itemId, item.quantityAdded, item.expiryDate || "");
                }
              }
              const deletedItems = old.items.filter((oi) => !r.items.some((ni) => ni.itemId === oi.itemId));
              for (const di of deletedItems) {
                await deleteSupabaseRestockItem(r.id, di.itemId);
              }
            }
          }
          setPendingSyncCount(getPendingQueueCount());
        } catch (err) {
          console.error("Error syncing restocks in background with Supabase:", err);
          setPendingSyncCount(getPendingQueueCount());
        }
      })();
    }
  };

  // Persistent stock range thresholds for dynamic color badges (red, orange, green)
  const [stockThresholds, setStockThresholds] = useState<{
    red: number;
    orange: number;
  }>(() => {
    const cached = localStorage.getItem("el_salam_er_stock_thresholds_v2");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse stock thresholds", e);
      }
    }
    return { red: 15, orange: 50 }; // Default values
  });

  const getStockBadgeColor = (stock: number) => {
    if (stock <= 0) {
      return {
        bg: "bg-slate-50",
        text: "text-rose-600 font-extrabold outline-dashed outline-1 outline-rose-200",
        border: "border-slate-300",
        label: lang === "ar" ? "نفذ الرصيد" : "Out of Stock",
      };
    }
    if (stock <= stockThresholds.red) {
      return {
        bg: "bg-rose-50",
        text: "text-rose-600 font-bold",
        border: "border-rose-200",
        label:
          lang === "ar"
            ? `متاح: ${formatArabicDigits(stock, lang)} وحدة`
            : `Stock: ${stock}`,
      };
    }
    if (stock <= stockThresholds.orange) {
      return {
        bg: "bg-amber-50",
        text: "text-amber-600 font-bold",
        border: "border-amber-200",
        label:
          lang === "ar"
            ? `متاح: ${formatArabicDigits(stock, lang)} وحدة`
            : `Stock: ${stock}`,
      };
    }
    return {
      bg: "bg-[#ecfdf5]",
      text: "text-[#10b981] font-bold",
      border: "border-emerald-250",
      label:
        lang === "ar"
          ? `متاح: ${formatArabicDigits(stock, lang)} وحدة`
          : `Stock: ${stock}`,
    };
  };

  // Super Admin state variables
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>("");
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>("ALL");
  const [adminSubTab, setAdminSubTab] = useState<
    "INVENTORY" | "ALERTS" | "OPERATORS"
  >("INVENTORY");
  const [newOperatorFullName, setNewOperatorFullName] = useState<string>("");
  const [newOperatorEmail, setNewOperatorEmail] = useState<string>("");
  const [newOperatorPassword, setNewOperatorPassword] = useState<string>("");
  const [newOperatorRole, setNewOperatorRole] = useState<"RECEPTION" | "SUPER_ADMIN">("RECEPTION");

  // Super Restock state variables
  const [restockItemId, setRestockItemId] = useState<string>("");
  const [restockQuantity, setRestockQuantity] = useState<number>(50);
  const [restockSupplier, setRestockSupplier] = useState<string>("");
  const [restockNotes, setRestockNotes] = useState<string>("");
  const [restockExpiryDate, setRestockExpiryDate] = useState<string>("");
  const [restockSearchQuery, setRestockSearchQuery] = useState<string>("");
  const [stagedRestockItems, setStagedRestockItems] = useState<
    StagedRestockItem[]
  >([]);

  // Authentication states
  const [currentUser, setCurrentUser] = useState<{
    email?: string;
    username?: string;
    role: "SUPER_ADMIN" | "RECEPTION";
  } | null>(null);

  const [loginRole, setLoginRole] = useState<"SUPER_ADMIN" | "RECEPTION">(
    "RECEPTION",
  );
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginUsername, setLoginUsername] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Persistent Custom stock threshold level mapping
  const [itemThresholds, setItemThresholds] = useState<Record<string, number>>(
    () => {
      const cached = localStorage.getItem("el_salam_er_thresholds_v1");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Failed to parse thresholds", e);
        }
      }
      // Default fallback is 12 units for all stock lines
      const defaults: Record<string, number> = {};
      HOSPITAL_INVENTORY.forEach((it) => {
        defaults[it.id] = 12;
      });
      return defaults;
    },
  );

  // Persistent Simulated Email Outbox archive
  const [dispatchedEmails, setDispatchedEmails] = useState<DispatchedEmail[]>(
    () => {
      const cached = localStorage.getItem("el_salam_er_dispatched_emails_v1");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error("Failed to parse email archive cache", e);
        }
      }
      return [];
    },
  );

  // Audio Alerts state toggle
  const [isAudioNotificationsEnabled, setIsAudioNotificationsEnabled] =
    useState<boolean>(() => {
      const cached = localStorage.getItem("el_salam_er_audio_enabled_v1");
      return cached !== "false";
    });

  // View active log email detail inside inbox popup modal
  const [activeEmailDetailId, setActiveEmailDetailId] = useState<string | null>(
    null,
  );

  // View active stock breakdown by expiry dates modal state
  const [selectedStockBreakdownItem, setSelectedStockBreakdownItem] = useState<MedicalItem | null>(null);

  // Quick Global Threshold overrider helper
  const [globalThresholdInput, setGlobalThresholdInput] =
    useState<string>("12");

  // Helper: Play elegant medical dual-chord beep directly in browser
  const playHospitalBeep = () => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // Pitch A5
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1109.73, ctx.currentTime); // Major third chord interval

      gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn(
        "AudioContext playback blocked / not supported by window client",
        e,
      );
    }
  };

  // Helper: Formulates low stock email layouts
  const generateLowStockEmailHtml = (
    item: MedicalItem,
    oldStock: number,
    newStock: number,
    threshold: number,
    mailId: string,
  ) => {
    return `
      <div style="font-family: system-ui, -apple-system, sgoe-ui, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #991b1b; padding: 20px; text-align: center; color: #ffffff;">
          <span style="background-color: rgba(255,255,255,0.25); font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 9999px; display: inline-block; margin-bottom: 6px;">Automated SMTP Service</span>
          <h2 style="margin: 0; font-size: 18px; font-weight: 800;">CRITICAL WAREHOUSE DEPLETION ALARM</h2>
          <p style="margin: 3px 0 0 0; font-size: 11px; opacity: 0.85;">El-Salam Hospital Emergency & Critical Care Logistics</p>
        </div>
        
        <div style="background-color: #f8fafc; border-bottom: 1px solid #edf2f7; padding: 10px 16px; display: flex; justify-content: space-between; font-size: 10.5px; color: #64748b; font-family: monospace;">
          <div><strong>SMTP STATUS:</strong> <span style="color: #10b981; font-weight: 800;">● DISPATCHED</span></div>
          <div><strong>MAIL PATH TRACE:</strong> ${mailId}</div>
        </div>
        
        <div style="padding: 20px; text-align: left;">
          <p style="font-size: 13.5px; color: #1e293b; margin: 0 0 12px 0;">Dear Primary Administrator (<strong>Antonymohab@gmail.com</strong>),</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
            This automated alert was dispatched in real-time. The active checkout ledger session has recorded stock consumption that breaches your safety parameters:
          </p>
          
          <div style="background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
            <strong style="color: #c05621; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 2px;">LOGISTICS CRITICAL ANOMALY DETECTED</strong>
            <span style="font-size: 14px; font-weight: bold; color: #2d3748; display: block;">${item.name_en}</span>
            <span style="font-size: 12px; color: #718096; display: block; margin-bottom: 10px;">${item.name_ar}</span>
            
            <table style="width: 100%; font-size: 11.5px; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding: 6px 0; color: #718096;">Supply Reference ID:</td>
                <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold; color: #2d3748;">${item.id}</td>
              </tr>
              <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding: 6px 0; color: #718096;">Pre-Transaction Volume:</td>
                <td style="padding: 6px 0; text-align: right; color: #4a5568;">${oldStock} Units</td>
              </tr>
              <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="padding: 6px 0; color: #718096;">Custom Threshold Level Rule:</td>
                <td style="padding: 6px 0; text-align: right; color: #3182ce; font-weight: 700;">${threshold} Units</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #e53e3e; font-weight: bold;">Current Available Stock:</td>
                <td style="padding: 6px 0; text-align: right; color: #e53e3e; font-weight: 900; font-size: 13px;">${item.stock} Units</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #f1f5f9; border-radius: 6px; padding: 10px; text-align: center; font-size: 11.5px; color: #475569; margin-bottom: 18px;">
            💡 <strong>Logistics Advice:</strong> Reordering <strong>150 units</strong> is highly recommended to restore standard surgical triage margins.
          </div>
          
          <p style="font-size: 11px; color: #94a3b8; line-height: 1.4; margin: 0; text-align: center; border-top: 1px solid #edf2f7; padding-top: 14px;">
            This email was sent via Cairo Al-Salam automated logistics pipeline under SMTP Port 587 TLS configurations. To alter trigger thresholds, navigate to the Control panel inside the administrator dashboard.
          </p>
        </div>
      </div>
    `;
  };

  // Automated checker: evaluated whenever stock modifications commit
  const checkForThresholdBreaches = (
    prev: MedicalItem[],
    next: MedicalItem[],
  ) => {
    const breachesDetected: {
      item: MedicalItem;
      oldStock: number;
      newStock: number;
      threshold: number;
    }[] = [];

    next.forEach((newItem) => {
      const oldItem = prev.find((it) => it.id === newItem.id);
      const oldStock = oldItem ? oldItem.stock : newItem.stock;
      const threshold =
        itemThresholds[newItem.id] !== undefined
          ? itemThresholds[newItem.id]
          : 12;

      // Breach if crossed boundary: old was safe >= threshold, new is breached < threshold
      if (newItem.stock < threshold && oldStock >= threshold) {
        breachesDetected.push({
          item: newItem,
          oldStock,
          newStock: newItem.stock,
          threshold,
        });
      }
    });

    if (breachesDetected.length > 0) {
      if (isAudioNotificationsEnabled) {
        playHospitalBeep();
      }

      // Generate prominent banner alerts
      const isAr = lang === "ar";
      const bannerTexts = breachesDetected.map((b) =>
        isAr
          ? `⚠️ انخفاض رصيد "${b.item.name_ar}" إلى (${b.item.stock}) وحدة (أقل من حد الأمان المُخصّص: ${b.threshold})`
          : `⚠️ Supply Deficit: "${b.item.name_en}" dropped to (${b.item.stock}) (Below rules limit: ${b.threshold})`,
      );

      setSaveSuccessMessage(bannerTexts.join(" | "));

      // Create outgoing SMTP dispatch email logs
      const generatedMails: DispatchedEmail[] = breachesDetected.map((b) => {
        const mailId =
          "SMTP-LOG-" + Math.floor(100000 + Math.random() * 900000);
        const subject = `🚨 URGENT: El-Salam Stock Alert - "${b.item.name_en}" Below Critical Level!`;
        const body_html = generateLowStockEmailHtml(
          b.item,
          b.oldStock,
          b.item.stock,
          b.threshold,
          mailId,
        );

        return {
          id: mailId,
          recipient: "Antonymohab@gmail.com",
          sender: "logistics-alerts@el-salam-er.gov.eg",
          subject,
          body_html,
          triggered_by_item_id: b.item.id,
          triggered_by_item_name: b.item.name_en,
          previous_stock: b.oldStock,
          current_stock: b.item.stock,
          threshold: b.threshold,
          sent_at: new Date().toISOString(),
          status: "Delivered / Dispatched",
          is_read: false,
        };
      });

      setDispatchedEmails((prevEmails) => {
        const updated = [...generatedMails, ...prevEmails];
        localStorage.setItem(
          "el_salam_er_dispatched_emails_v1",
          JSON.stringify(updated),
        );
        return updated;
      });
    }
  };

  // Scroll Ref for category slider
  const categoryTabRef = useRef<HTMLDivElement>(null);
  const productsContainerRef = useRef<HTMLDivElement>(null);
  const masterTableContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollCategories = (dirScroll: "left" | "right") => {
    if (categoryTabRef.current) {
      const scrollAmount = 180;
      categoryTabRef.current.scrollBy({
        left: dirScroll === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleScrollProducts = (direction: "up" | "down") => {
    if (productsContainerRef.current) {
      const scrollAmount = 140;
      productsContainerRef.current.scrollBy({
        top: direction === "up" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleScrollMasterTable = (direction: "up" | "down") => {
    if (masterTableContainerRef.current) {
      const scrollAmount = 180;
      masterTableContainerRef.current.scrollBy({
        top: direction === "up" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Cache syncer hooks with automated threshold interception
  const saveInventoryToCache = (newInv: MedicalItem[]) => {
    checkForThresholdBreaches(inventory, newInv);
    setInventory(newInv);
    localStorage.setItem("el_salam_er_inventory_v1", JSON.stringify(newInv));

    if (isSupabaseConfigured) {
      (async () => {
        try {
          // Find deleted items to remove from Supabase
          const deletedItems = inventory.filter((item) => !newInv.some((n) => n.id === item.id));
          for (const item of deletedItems) {
            if (navigator.onLine) {
              const ok = await deleteSupabaseMedicalItem(item.id);
              if (!ok) queuePendingDeletedItem(item.id);
            } else {
              queuePendingDeletedItem(item.id);
            }
          }

          // Find upserted/modified items
          const upsertedItems = newInv.filter((item) => {
            const old = inventory.find((o) => o.id === item.id);
            return !old || JSON.stringify(old) !== JSON.stringify(item);
          });
          for (const item of upsertedItems) {
            if (navigator.onLine) {
              const ok = await upsertSupabaseMedicalItem(item);
              if (!ok) queuePendingItem(item);
            } else {
              queuePendingItem(item);
            }
          }
          setPendingSyncCount(getPendingQueueCount());
        } catch (err) {
          console.error("Error syncing inventory in background with Supabase:", err);
          setPendingSyncCount(getPendingQueueCount());
        }
      })();
    }
  };

  const saveOperatorsToCache = (newOps: ReceptionOperator[]) => {
    setOperators(newOps);
    localStorage.setItem("el_salam_er_operators_v1", JSON.stringify(newOps));
  };

  const loadAllDatabase = async () => {
    if (!isSupabaseConfigured) {
      setSupabaseSyncStatus("offline");
      return;
    }

    setSupabaseLoading(true);
    try {
      console.log("Connecting to Supabase and pulling latest data...");
      
      // 1. Fetch Inventory
      const dbInventory = await fetchSupabaseInventory();
      if (dbInventory !== null && dbInventory.length > 0) {
        setInventory(dbInventory);
        localStorage.setItem("el_salam_er_inventory_v1", JSON.stringify(dbInventory));
      } else if (dbInventory !== null && dbInventory.length === 0) {
        const cachedInv = localStorage.getItem("el_salam_er_inventory_v1");
        const localItems: MedicalItem[] = cachedInv ? JSON.parse(cachedInv) : HOSPITAL_INVENTORY;
        if (localItems && localItems.length > 0) {
          console.log("Supabase inventory is empty. Syncing local inventory to Supabase...");
          for (const item of localItems) {
            await upsertSupabaseMedicalItem(item);
          }
          setInventory(localItems);
        }
      }

      // 2. Fetch Patient Invoices History
      const dbHistory = await fetchSupabasePatientInvoices();
      if (dbHistory !== null && dbHistory.length > 0) {
        setHistory(dbHistory);
        localStorage.setItem("cairo_er_ledger_history_v1", JSON.stringify(dbHistory));
      } else if (dbHistory !== null && dbHistory.length === 0) {
        const cachedLedger = localStorage.getItem("cairo_er_ledger_history_v1");
        if (cachedLedger) {
          try {
            const localHistory: InvoicePayload[] = JSON.parse(cachedLedger);
            if (localHistory && localHistory.length > 0) {
              console.log("Supabase history is empty. Syncing local history to Supabase...");
              for (const inv of localHistory) {
                await insertSupabasePatientInvoice(inv);
              }
              setHistory(localHistory);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 3. Fetch Restock Invoices
      const dbRestocks = await fetchSupabaseRestockInvoices();
      if (dbRestocks !== null && dbRestocks.length > 0) {
        setRestockInvoices(dbRestocks);
        localStorage.setItem("el_salam_er_restock_invoices_v1", JSON.stringify(dbRestocks));
      }

      // 4. Fetch App Users / Reception Operators
      const dbOperators = await fetchSupabaseAppUsers();
      if (dbOperators !== null && dbOperators.length > 0) {
        setOperators(dbOperators);
        localStorage.setItem("el_salam_er_operators_v1", JSON.stringify(dbOperators));
      }

      setSupabaseSyncStatus("connected");
    } catch (err) {
      console.error("Critical error syncing with Supabase database:", err);
      setSupabaseSyncStatus("error");
    } finally {
      setSupabaseLoading(false);
    }
  };

  const triggerAutoSync = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setSupabaseSyncStatus("offline");
      return;
    }
    if (!isSupabaseConfigured) return;

    setIsSyncingPending(true);
    try {
      const result = await processPendingSyncQueue();
      setPendingSyncCount(result.remainingCount);

      if (result.syncedCount > 0 && result.remainingCount === 0) {
        setSupabaseSyncStatus("connected");
        setSyncSuccessMessage(
          lang === "ar"
            ? "✓ تم استعادة الاتصال بالسيرفر ومزامنة جميع الإيصالات والتعديلات المحفوظة أوفلاين تلقائياً بنجاح!"
            : "✓ Connection restored! All offline saved receipts synced automatically."
        );
        setTimeout(() => setSyncSuccessMessage(null), 5000);
        await loadAllDatabase();
      } else if (result.remainingCount > 0) {
        setSupabaseSyncStatus("offline");
      } else {
        setSupabaseSyncStatus("connected");
      }
    } catch (err) {
      console.error("Auto sync error:", err);
      setSupabaseSyncStatus("offline");
    } finally {
      setIsSyncingPending(false);
    }
  };

  // Online / Offline Network listener & database load on startup
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSupabaseSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial load from local cache first for instant response
    const cachedLedger = localStorage.getItem("cairo_er_ledger_history_v1");
    if (cachedLedger) {
      try {
        setHistory(JSON.parse(cachedLedger));
      } catch (e) {
        console.error("Local storage log parse error:", e);
      }
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      setSupabaseSyncStatus("offline");
    } else {
      loadAllDatabase();
      if (getPendingQueueCount() > 0) {
        triggerAutoSync();
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update localStorage when logs modify
  const saveHistoryToCache = (newHistory: InvoicePayload[]) => {
    setHistory(newHistory);
    localStorage.setItem(
      "cairo_er_ledger_history_v1",
      JSON.stringify(newHistory),
    );

    if (isSupabaseConfigured) {
      (async () => {
        try {
          // Identify deleted invoices to remove from Supabase
          const deletedInvoices = history.filter((inv) => !newHistory.some((n) => n.receipt_number === inv.receipt_number));
          for (const inv of deletedInvoices) {
            if (navigator.onLine) {
              const ok = await deleteSupabasePatientInvoice(inv.receipt_number);
              if (!ok) queuePendingDeletedInvoice(inv.receipt_number);
            } else {
              queuePendingDeletedInvoice(inv.receipt_number);
            }
          }

          // Upsert all items in newHistory so new or modified invoices update Supabase
          for (const inv of newHistory) {
            if (navigator.onLine) {
              const ok = await insertSupabasePatientInvoice(inv);
              if (!ok) queuePendingInvoice(inv);
            } else {
              queuePendingInvoice(inv);
            }
          }
          setPendingSyncCount(getPendingQueueCount());
        } catch (err) {
          console.error("Error syncing invoices in background with Supabase:", err);
          setPendingSyncCount(getPendingQueueCount());
        }
      })();
    }
  };

  // Daily auto-backup check hook
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const lastBackupDate = localStorage.getItem("el_salam_last_backup_date");

    if (lastBackupDate !== today) {
      const timer = setTimeout(() => {
        setShowBackupPrompt(true);
      }, 2000); // 2-second elegant delay so it doesn't disturb immediately on load
      return () => clearTimeout(timer);
    }
  }, []);

  const triggerBackupDownload = () => {
    const today = new Date().toISOString().split("T")[0];
    const backupData = {
      backupVersion: "1.0",
      generatedAt: new Date().toISOString(),
      hospitalBranchAr: "مستشفى السلام - ٧٦ احمد عصمت عين شمس",
      hospitalBranchEn: "El-Salam Hospital - 76 Ahmed Esmat , Ain Shams",
      inventory,
      history,
      operators,
      itemThresholds,
      stockThresholds,
    };

    // 1. Save JSON database backup
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `el_salam_hospital_backup_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 2. Save Multi-sheet Excel workbook (.xlsx)
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: سجلات وإيصالات المرضى
      const sheet1Data = history.map((record, index) => {
        const itemsText = record.invoice_lines
          .map((l) => `${l.item_name_ar || l.item_name} (x${l.quantity})`)
          .join(" | ");

        const formattedDate = record.created_at
          ? new Date(record.created_at).toLocaleString("ar-EG")
          : "غير محدد";

        return {
          "م": index + 1,
          "اسم المريض": record.patient_name || "بدون اسم",
          "رقم الإيصال": record.receipt_number || "-",
          "تاريخ ووقت الحفظ": formattedDate,
          "المستلزمات المطلوبة بالفاتورة": itemsText,
          "سعر الفاتورة / الإجمالي (ج.م)": record.grand_total,
          "المسؤول المالي (اسم الحساب)": getUserName(record.billing_officer_email, lang) || record.billing_officer_email || "-",
        };
      });

      const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
      XLSX.utils.book_append_sheet(wb, ws1, "سجلات وإيصالات المرضى");

      // Sheet 2: دفتر الاستهلاك اليومي
      const totalInvoices = history.length;
      const totalDispatchedUnits = history.reduce(
        (sum, r) => sum + r.invoice_lines.reduce((s, l) => s + l.quantity, 0),
        0
      );
      const totalCost = history.reduce((sum, r) => sum + r.grand_total, 0);

      const consumptionMap: Record<
        string,
        {
          id: string;
          name_ar: string;
          category_ar: string;
          unit_price: number;
          total_qty: number;
          total_amount: number;
        }
      > = {};

      history.forEach((record) => {
        record.invoice_lines.forEach((line) => {
          if (!consumptionMap[line.item_id]) {
            const inv = inventory.find((i) => i.id === line.item_id);
            consumptionMap[line.item_id] = {
              id: line.item_id,
              name_ar: line.item_name_ar || line.item_name,
              category_ar: inv ? inv.category_ar : "-",
              unit_price: line.unit_price,
              total_qty: 0,
              total_amount: 0,
            };
          }
          consumptionMap[line.item_id].total_qty += line.quantity;
          consumptionMap[line.item_id].total_amount += line.line_total;
        });
      });

      const sheet2Summary = [
        {
          "بيان الملخص اليومي": "عدد فواتير التحصيل المسجلة",
          "القيمة / الإجمالي": totalInvoices,
        },
        {
          "بيان الملخص اليومي": "إجمالي المستهلكات المنصرفة (وحدة)",
          "القيمة / الإجمالي": totalDispatchedUnits,
        },
        {
          "بيان الملخص اليومي": "إجمالي تكلفة المستلزمات (ج.م)",
          "القيمة / الإجمالي": totalCost,
        },
      ];

      const sheet2Details = Object.values(consumptionMap).map((item, idx) => ({
        "م": idx + 1,
        "كود الصنف (ID)": item.id,
        "اسم الصنف المستهلك": item.name_ar,
        "القسم / التصنيف": item.category_ar,
        "سعر المفرد (ج.م)": item.unit_price,
        "الكمية المستهلكة": item.total_qty,
        "إجمالي القيمة المالية (ج.م)": item.total_amount,
      }));

      const ws2 = XLSX.utils.json_to_sheet(sheet2Summary);
      XLSX.utils.sheet_add_json(
        ws2,
        [{}, { "بيان الملخص اليومي": "بيان تفصيلي بالمستلزمات المستهلكة:" }],
        { origin: -1 }
      );
      XLSX.utils.sheet_add_json(ws2, sheet2Details, { origin: -1 });

      XLSX.utils.book_append_sheet(wb, ws2, "دفتر الاستهلاك اليومي");

      // Sheet 3: جرد وأسعار المخزون
      const sheet3Data = inventory.map((item, index) => {
        const threshold =
          itemThresholds[item.id] !== undefined
            ? itemThresholds[item.id]
            : stockThresholds[item.id] !== undefined
            ? stockThresholds[item.id]
            : 10;

        return {
          "م": index + 1,
          "ID الصنف": item.id,
          "اسم الصنف (عربي)": item.name_ar,
          "اسم الصنف (إنجليزي)": item.name_en,
          "القسم / الفئة": item.category_ar,
          "الرصيد المتاح بالمخزن": item.stock,
          "سعر المفرد (ج.م)": item.unit_price,
          "حد الأمان / إعادة الطلب": threshold,
        };
      });

      const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
      XLSX.utils.book_append_sheet(wb, ws3, "جرد وأسعار المخزون");

      // Save Excel file
      XLSX.writeFile(wb, `نسخة_احتياطية_مستشفى_السلام_${today}.xlsx`);
    } catch (err) {
      console.error("Error exporting Excel backup:", err);
    }

    // Persist today's backup date
    localStorage.setItem("el_salam_last_backup_date", today);
    setShowBackupPrompt(false);
  };

  const dismissBackupPrompt = () => {
    const today = new Date().toISOString().split("T")[0];
    // Persist today's dismiss date to avoid disrupting the user's workload multiple times today
    localStorage.setItem("el_salam_last_backup_date", today);
    setShowBackupPrompt(false);
  };

  // Get distinct categories in active language from managed state
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    inventory.forEach((item) => {
      list.add(lang === "ar" ? item.category_ar : item.category_en);
    });
    customCategories.forEach((cat) => {
      list.add(lang === "ar" ? cat.ar : cat.en);
    });
    return Array.from(list);
  }, [lang, inventory, customCategories]);

  const distinctCategories = useMemo(() => {
    const map = new Map<string, string>(); // category_ar -> category_en
    inventory.forEach((item) => {
      map.set(item.category_ar, item.category_en);
    });
    customCategories.forEach((cat) => {
      if (!map.has(cat.ar)) {
        map.set(cat.ar, cat.en);
      }
    });
    return Array.from(map.entries()).map(([ar, en]) => ({ ar, en }));
  }, [inventory, customCategories]);

  const generateNextMedId = (items: typeof inventory) => {
    let maxNum = 21;
    items.forEach((item) => {
      const match = item.id.match(/^med_(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `med_${String(nextNum).padStart(3, '0')}`;
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newItemId.trim() || generateNextMedId(inventory);
    const nameAr = newItemNameAr.trim();
    const nameEn = newItemNameEn.trim();
    const price = parseFloat(newItemUnitPrice) || 0;
    const stock = parseInt(newItemInitialStock) || 0;

    if (!nameAr && !nameEn) {
      alert(lang === "ar" ? "برجاء ملء اسم الصنف بالعربية أو الإنجليزية على الأقل!" : "Please enter the item name in either Arabic or English at least!");
      return;
    }

    let catAr = "";
    let catEn = "";

    if (newItemCategoryType === "existing") {
      if (!newItemCategoryAr) {
        alert(lang === "ar" ? "برجاء اختيار الفئة!" : "Please select a category!");
        return;
      }
      catAr = newItemCategoryAr;
      const found = distinctCategories.find((cat) => cat.ar === newItemCategoryAr);
      catEn = found ? found.en : newItemCategoryAr;
    } else {
      catAr = newItemCategoryAr.trim();
      catEn = newItemCategoryEn.trim();
      if (!catAr || !catEn) {
        alert(lang === "ar" ? "برجاء إدخال اسم الفئة الجديدة بالعربية والإنجليزية!" : "Please enter both Arabic and English names for the new category!");
        return;
      }
    }

    // Check if ID already exists
    if (inventory.some((item) => item.id.toLowerCase() === id.toLowerCase())) {
      alert(lang === "ar" ? "كود الصنف الطبي موجود بالفعل!" : "Item ID already exists!");
      return;
    }

    const newItem: MedicalItem = {
      id,
      name_ar: nameAr || nameEn,
      name_en: nameEn || nameAr,
      unit_price: price,
      category_ar: catAr,
      category_en: catEn,
      stock,
    };

    const updated = [...inventory, newItem];
    saveInventoryToCache(updated);

    // Reset form
    setNewItemId("");
    setNewItemNameAr("");
    setNewItemNameEn("");
    setNewItemCategoryAr("");
    setNewItemCategoryEn("");
    setNewItemUnitPrice("");
    setNewItemInitialStock("0");
    setNewItemCategoryType("existing");

    // Success notification
    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم إضافة الصنف الطبي الجديد "${nameAr}" بنجاح!`
        : `✓ Successfully added new medical item: "${nameEn}"!`,
    );
    setTimeout(() => setNewItemCategoryAr(""), 100);
    setTimeout(() => setSaveSuccessMessage(null), 4000);

    // Navigate to RESTOCK page
    setActivePage("RESTOCK");
  };

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const ar = newCatNameAr.trim();
    const en = newCatNameEn.trim();
    if (!ar || !en) {
      alert(lang === "ar" ? "برجاء كتابة اسم الفئة بالعربية والإنجليزية!" : "Please fill in both Arabic and English names!");
      return;
    }
    // Check if duplicate in dynamic combined listing
    const exists = distinctCategories.some(
      (c) => c.ar.toLowerCase() === ar.toLowerCase() || c.en.toLowerCase() === en.toLowerCase()
    );
    if (exists) {
      alert(lang === "ar" ? "هذه الفئة الطبية موجودة بالفعل!" : "This category already exists!");
      return;
    }
    
    // Add to custom list
    setCustomCategories((prev) => [...prev, { ar, en }]);
    setNewCatNameAr("");
    setNewCatNameEn("");
    setAddItemTab("PRODUCT");
    setNewItemCategoryType("existing");
    setNewItemCategoryAr(ar);
    setNewItemCategoryEn(en);

    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم إنشاء الفئة الطبية الجديدة "${ar}" بنجاح وجاهزة للاختيار!`
        : `✓ Custom category "${en}" created successfully and ready for selection!`
    );
    setTimeout(() => setSaveSuccessMessage(null), 4005);
  };

  // Filters the inventory items dynamically to display matches in UI Catalog
  const filteredInventoryItems = useMemo(() => {
    return inventory.filter((item) => {
      // Category filter check
      if (activeCategory !== "ALL") {
        const itemCat = lang === "ar" ? item.category_ar : item.category_en;
        if (itemCat !== activeCategory) return false;
      }

      // Search match check
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      return (
        (item.id || "").toLowerCase().includes(query) ||
        (item.name_ar || "").toLowerCase().includes(query) ||
        (item.name_en || "").toLowerCase().includes(query)
      );
    });
  }, [searchQuery, activeCategory, lang, inventory]);

  // Compute medical items approaching or past their expiry date (critical threshold: 90 days)
  const expiringItems = useMemo(() => {
    const today = new Date();
    // Zero out time part of today for accurate daily counts
    today.setHours(0, 0, 0, 0);
    
    return inventory
      .filter((item) => {
        if (!item.expiry_date) return false;
        const expDate = new Date(item.expiry_date);
        if (isNaN(expDate.getTime())) return false;
        
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 90;
      })
      .map((item) => {
        const expDate = new Date(item.expiry_date!);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...item,
          daysRemaining: diffDays,
          isExpired: diffDays <= 0,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [inventory]);

  // Filtered list of items for the Super Admin Master Control Board
  const filteredMasterItems = useMemo(() => {
    return inventory.filter((item) => {
      const q = masterSearchQuery.trim().toLowerCase();
      const matchesSearch = q === "" || 
        (item.id || "").toLowerCase().includes(q) ||
        (item.name_ar || "").toLowerCase().includes(q) ||
        (item.name_en || "").toLowerCase().includes(q);
        
      const matchesCategory = masterCategoryFilter === "" || 
        item.category_ar === masterCategoryFilter || 
        item.category_en === masterCategoryFilter;
        
      return matchesSearch && matchesCategory;
    });
  }, [inventory, masterSearchQuery, masterCategoryFilter]);

  // Compute grand financial values
  const calculatedTotals = useMemo(() => {
    const sum = invoiceLines.reduce((acc, line) => acc + line.line_total, 0);
    return roundPrice(sum);
  }, [invoiceLines]);

  // Build ready payload object
  const supabasePayload: InvoicePayload = useMemo(() => {
    return {
      patient_name: patientName.trim(),
      receipt_number: receiptNumber.trim(),
      invoice_lines: invoiceLines.map((line) => ({
        item_id: line.item_id,
        item_name: lang === "ar" ? line.item_name_ar : line.item_name_en,
        item_name_ar: line.item_name_ar,
        item_name_en: line.item_name_en,
        unit_price: line.unit_price,
        quantity: line.quantity,
        line_total: line.line_total,
      })),
      grand_total: calculatedTotals,
      billing_officer_email: currentUser?.username || currentUser?.email || "admin",
      hospital_branch_ar: "مستشفى السلام - 76 احمد عصمت عين شمس",
      hospital_branch_en: "El-Salam Hospital - 76 Ahmed Esmat, Ain Shams",
      created_at: new Date().toISOString(),
      motor_numbers: motorNumbers.trim() || undefined,
    };
  }, [patientName, receiptNumber, invoiceLines, calculatedTotals, lang, motorNumbers]);

  // Error validations audit logs
  const schemaValidation = useMemo(() => {
    const errors: string[] = [];
    if (!patientName.trim()) {
      errors.push(
        lang === "ar"
          ? "اسم المريض بالكامل مطلوب لعقد الفاتورة"
          : "Patient full name is required.",
      );
    }
    if (!receiptNumber.trim()) {
      errors.push(
        lang === "ar"
          ? "رقم الإيصال اليدوي (رقم إيصال المعاملة) مطلوب إلزامي"
          : "Receipt transaction reference number is required.",
      );
    }
    if (invoiceLines.length === 0) {
      errors.push(
        lang === "ar"
          ? "يجب اختيار مستلزم طبي واحد على الأقل من القائمة"
          : "At least one medical supply item must be added.",
      );
    }

    // Verify stock availability on all lines
    invoiceLines.forEach((line) => {
      const invItem = inventory.find((it) => it.id === line.item_id);
      if (invItem && line.quantity > invItem.stock) {
        errors.push(
          lang === "ar"
            ? `الكمية المدخلة من "${invItem.name_ar}" (${line.quantity}) تتخطى الرصيد المتاح بالمستودع (${invItem.stock} وحدة)`
            : `Quantity for "${invItem.name_en}" (${line.quantity}) exceeds available stock (${invItem.stock} units)`,
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [patientName, receiptNumber, invoiceLines, inventory, lang]);

  // Helper to calculate stock breakdown by expiration dates
  const getProductBatches = (item: MedicalItem) => {
    const batches: { qty: number; expiry: string; source: string; date: Date }[] = [];
    
    // Sort restock invoices by timestamp ascending (earliest received first)
    const sortedInvoices = [...restockInvoices].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    sortedInvoices.forEach(invoice => {
      const match = invoice.items.find(it => it.itemId === item.id);
      if (match) {
        batches.push({
          qty: match.quantityAdded,
          expiry: match.expiryDate || "",
          date: new Date(invoice.timestamp),
          source: invoice.id
        });
      }
    });

    const totalRestocked = batches.reduce((sum, b) => sum + b.qty, 0);

    // If current stock exceeds total restocks, or there are no restocks, create an "Opening/Initial Balance" batch
    if (item.stock > totalRestocked || batches.length === 0) {
      const diff = item.stock - totalRestocked;
      batches.unshift({
        qty: diff > 0 ? diff : item.stock,
        expiry: item.expiry_date || "",
        date: new Date(0), // earliest
        source: "INITIAL"
      });
    }

    // Now construct the FIFO/FEFO allocation
    const queue = batches.map(b => ({ ...b, remaining: b.qty }));

    // Sort consumption priority: empty/no expiry consumed last, otherwise closest expiry / expired consumed first
    queue.sort((a, b) => {
      if (a.expiry && !b.expiry) return -1;
      if (!a.expiry && b.expiry) return 1;
      if (a.expiry && b.expiry) {
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      }
      return a.date.getTime() - b.date.getTime();
    });

    const totalPotential = queue.reduce((sum, b) => sum + b.remaining, 0);
    let consumedAmount = totalPotential - item.stock;

    if (consumedAmount > 0) {
      for (const batch of queue) {
        if (consumedAmount <= 0) break;
        const sub = Math.min(batch.remaining, consumedAmount);
        batch.remaining -= sub;
        consumedAmount -= sub;
      }
    }

    // Today's date is 2026-06-10 (additional metadata)
    const today = new Date("2026-06-10");

    const finalBatches = queue
      .filter(b => b.remaining > 0)
      .map(b => {
        let daysRemaining: number | null = null;
        let status: "EXPIRED" | "APPROACHING" | "VALID" | "NONE" = "NONE";

        if (b.expiry) {
          const expDate = new Date(b.expiry);
          const diffTime = expDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 0) {
            status = "EXPIRED";
          } else if (daysRemaining <= 90) {
            status = "APPROACHING";
          } else {
            status = "VALID";
          }
        }

        return {
          qty: b.remaining,
          expiry: b.expiry,
          source: b.source,
          date: b.date,
          daysRemaining,
          status
        };
      });

    // Sort final batches for display: Expired first, then closest-expiry, then no-expiry
    finalBatches.sort((a, b) => {
      if (a.status === "EXPIRED" && b.status !== "EXPIRED") return -1;
      if (a.status !== "EXPIRED" && b.status === "EXPIRED") return 1;
      
      if (a.expiry && !b.expiry) return -1;
      if (!a.expiry && b.expiry) return 1;
      
      if (a.expiry && b.expiry) {
        return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
      }
      return 0;
    });

    return finalBatches;
  };

  // Save edits of a master inventory item
  const handleSaveMasterItem = (originalId: string) => {
    if (!editId.trim()) {
      alert(lang === "ar" ? "يجب إدخال كود الصنف!" : "Item ID is required!");
      return;
    }
    if (!editNameAr.trim() || !editNameEn.trim()) {
      alert(lang === "ar" ? "يجب إدخال اسم الصنف باللغتين!" : "Item description is required in both Arabic and English!");
      return;
    }

    if (typeof window !== "undefined") {
      const confirmSave = window.confirm(
        lang === "ar"
          ? "هل أنت متأكد من رغبتك في حفظ التعديلات؟"
          : "Are you sure you want to save the changes?"
      );
      if (!confirmSave) return;
    }

    const cleanNewId = editId.trim();

    if (cleanNewId.toLowerCase() !== originalId.toLowerCase()) {
      const exists = inventory.some(item => item.id.toLowerCase() === cleanNewId.toLowerCase());
      if (exists) {
        alert(lang === "ar" ? `الكود الجديد "${cleanNewId}" مستخدم بالفعل لصنف آخر!` : `The new ID "${cleanNewId}" is already used by another item!`);
        return;
      }
    }

    const updatedInventory = inventory.map((item) => {
      if (item.id === originalId) {
        return {
          ...item,
          id: cleanNewId,
          name_ar: editNameAr.trim(),
          name_en: editNameEn.trim(),
          category_ar: editCategoryAr.trim() || item.category_ar,
          category_en: editCategoryEn.trim() || item.category_en,
          stock: editStock === "" ? 0 : Number(editStock),
          unit_price: editUnitPrice === "" ? 0 : Number(editUnitPrice),
          expiry_date: editExpiryDate ? editExpiryDate : undefined,
        };
      }
      return item;
    });

    const newThreshold = editThreshold === "" ? 12 : Number(editThreshold);
    const updatedThresholds = { ...itemThresholds };
    if (cleanNewId !== originalId) {
      delete updatedThresholds[originalId];
    }
    updatedThresholds[cleanNewId] = newThreshold;

    setItemThresholds(updatedThresholds);
    localStorage.setItem("el_salam_er_thresholds_v1", JSON.stringify(updatedThresholds));
    
    saveInventoryToCache(updatedInventory);
    setEditingItemId(null);
  };

  // Helper to compute total quantities added via shipments/restock invoices for a specific item
  const getItemShipmentsTotal = (itemId: string, invoicesList = restockInvoices): number => {
    const matchingShipments = invoicesList.filter((invoice) =>
      invoice.items.some((it) => it.itemId === itemId)
    );
    return matchingShipments.reduce((sum, invoice) => {
      const itLine = invoice.items.find((it) => it.itemId === itemId);
      return sum + (itLine ? itLine.quantityAdded : 0);
    }, 0);
  };

  // Helper to sync inventory stock of products with their shipments sum (if they are not overridden)
  const syncInventoryStockWithShipments = (
    invoicesList = restockInvoices,
    invList = inventory,
    overriddenList = overriddenStocks
  ) => {
    let changed = false;
    const syncedInventory = invList.map((item) => {
      const isOverridden = overriddenList.includes(item.id);
      if (isOverridden) return item;

      const matchingShipments = invoicesList.filter((invoice) =>
        invoice.items.some((it) => it.itemId === item.id)
      );
      if (matchingShipments.length === 0) return item; // Keep stock if no shipments at all

      const totalShipmentsQty = matchingShipments.reduce((sum, invoice) => {
        const itLine = invoice.items.find((it) => it.itemId === item.id);
        return sum + (itLine ? itLine.quantityAdded : 0);
      }, 0);

      if (item.stock !== totalShipmentsQty) {
        changed = true;
        return { ...item, stock: totalShipmentsQty };
      }
      return item;
    });

    if (changed) {
      setInventory(syncedInventory);
      localStorage.setItem("el_salam_er_inventory_v1", JSON.stringify(syncedInventory));
    }
  };

  // On startup or whenever restock history is loaded, match item stocks if they aren't explicitly overridden
  useEffect(() => {
    if (inventory.length > 0) {
      syncInventoryStockWithShipments(restockInvoices, inventory, overriddenStocks);
    }
  }, [restockInvoices, overriddenStocks]);

  // Delete a master inventory item
  const handleDeleteMasterItem = (itemId: string, bypassConfirm = false) => {
    const targetItem = inventory.find(i => i.id === itemId);
    const label = targetItem ? (lang === "ar" ? targetItem.name_ar : targetItem.name_en) : itemId;
    
    if (!bypassConfirm) {
      const confirmDelete = window.confirm(
        lang === "ar"
          ? `هل أنت متأكد من حذف الصنف "${label}" نهائياً من النظام؟`
          : `Are you sure you want to permanently delete "${label}" from the system?`
      );
      if (!confirmDelete) return;
    }

    const updatedInventory = inventory.filter(item => item.id !== itemId);
    const updatedThresholds = { ...itemThresholds };
    delete updatedThresholds[itemId];

    setItemThresholds(updatedThresholds);
    localStorage.setItem("el_salam_er_thresholds_v1", JSON.stringify(updatedThresholds));

    saveInventoryToCache(updatedInventory);
    if (editingItemId === itemId) {
      setEditingItemId(null);
    }
  };

  // Sync detailed product fields on selection
  useEffect(() => {
    if (activePage === "PRODUCT_DETAIL" && selectedProductId) {
      const prod = inventory.find(item => item.id === selectedProductId);
      if (prod) {
        setDetailId(prod.id);
        setDetailNameAr(prod.name_ar);
        setDetailNameEn(prod.name_en);
        setDetailCategoryAr(prod.category_ar);
        setDetailCategoryEn(prod.category_en);
        setIsCustomCategoryInEdit(false);

        const totalShipmentsQty = getItemShipmentsTotal(prod.id, restockInvoices);
        const matchingShipments = restockInvoices.filter((invoice) =>
          invoice.items.some((it) => it.itemId === prod.id)
        );
        const isOverridden = overriddenStocks.includes(prod.id);
        const finalStock = (matchingShipments.length > 0 && !isOverridden) ? totalShipmentsQty : prod.stock;

        setDetailStock(finalStock);
        setDetailUnitPrice(prod.unit_price);
        const threshold = itemThresholds[prod.id] !== undefined ? itemThresholds[prod.id] : 12;
        setDetailThreshold(threshold);
        setDetailExpiryDate(prod.expiry_date || "");
        setSaveConfirm(false);
        setDeleteConfirm(false);
      }
    }
  }, [selectedProductId, activePage, inventory, itemThresholds, overriddenStocks, restockInvoices]);

  // Save changes of a detailed product
  const handleSaveDetailedProduct = (isConfirmed = false) => {
    if (!selectedProductId) return;
    if (!detailId.trim()) {
      alert(lang === "ar" ? "يجب إدخال كود الصنف!" : "Item ID is required!");
      return;
    }
    if (!detailNameAr.trim() || !detailNameEn.trim()) {
      alert(lang === "ar" ? "يجب إدخال اسم الصنف باللغتين!" : "Item description is required in both Arabic and English!");
      return;
    }

    const cleanNewId = detailId.trim();

    if (cleanNewId.toLowerCase() !== selectedProductId.toLowerCase()) {
      const exists = inventory.some(item => item.id.toLowerCase() === cleanNewId.toLowerCase());
      if (exists) {
        alert(lang === "ar" ? `الكود الجديد "${cleanNewId}" مستخدم بالفعل لصنف آخر!` : `The new ID "${cleanNewId}" is already used by another item!`);
        return;
      }
    }

    if (!isConfirmed) {
      setSaveConfirm(true);
      setDeleteConfirm(false);
      return;
    }

    // Update main inventory
    const typedStock = detailStock === "" ? 0 : Number(detailStock);
    const totalShipmentsQty = getItemShipmentsTotal(selectedProductId, restockInvoices);
    const matchingShipments = restockInvoices.filter((invoice) =>
      invoice.items.some((it) => it.itemId === selectedProductId)
    );

    let newOverridden = [...overriddenStocks];
    if (matchingShipments.length > 0 && typedStock !== totalShipmentsQty) {
      if (!newOverridden.includes(cleanNewId)) {
        newOverridden.push(cleanNewId);
      }
      if (cleanNewId !== selectedProductId) {
        newOverridden = newOverridden.filter(id => id !== selectedProductId);
      }
    } else {
      newOverridden = newOverridden.filter(id => id !== selectedProductId && id !== cleanNewId);
    }
    setOverriddenStocks(newOverridden);
    localStorage.setItem("el_salam_er_overridden_stocks_v1", JSON.stringify(newOverridden));

    const updatedModel = inventory.map((item) => {
      if (item.id === selectedProductId) {
        return {
          ...item,
          id: cleanNewId,
          name_ar: detailNameAr.trim(),
          name_en: detailNameEn.trim(),
          category_ar: detailCategoryAr.trim(),
          category_en: detailCategoryEn.trim(),
          stock: typedStock,
          unit_price: detailUnitPrice === "" ? 0 : Number(detailUnitPrice),
          expiry_date: detailExpiryDate ? detailExpiryDate : undefined,
        };
      }
      return item;
    });

    // Update threshold limits
    const newThreshold = detailThreshold === "" ? 12 : Number(detailThreshold);
    const updatedThresholds = { ...itemThresholds };
    if (cleanNewId !== selectedProductId) {
      delete updatedThresholds[selectedProductId];
    }
    updatedThresholds[cleanNewId] = newThreshold;
    setItemThresholds(updatedThresholds);
    localStorage.setItem("el_salam_er_thresholds_v1", JSON.stringify(updatedThresholds));

    // Update shipment items as well if renamed
    let updatedInvoices = [...restockInvoices];
    updatedInvoices = restockInvoices.map(invoice => {
      const updatedItems = invoice.items.map(item => {
        if (item.itemId === selectedProductId) {
          return {
            ...item,
            itemId: cleanNewId,
            itemNameAr: detailNameAr.trim(),
            itemNameEn: detailNameEn.trim(),
            categoryAr: detailCategoryAr.trim(),
            categoryEn: detailCategoryEn.trim(),
          };
        }
        return item;
      });
      return { ...invoice, items: updatedItems };
    });
    saveRestockInvoicesToCache(updatedInvoices);

    saveInventoryToCache(updatedModel);
    setSelectedProductId(cleanNewId);
    setSaveConfirm(false);

    alert(lang === "ar" ? "✓ تم حفظ تعديلات الصنف بنجاح!" : "✓ Core product details updated successfully!");
  };

  // Save changes for a single shipment/batch row
  const handleSaveShipmentRow = (invoiceId: string, updatedQty: number, updatedExpiryDate: string) => {
    if (!selectedProductId) return;

    const updatedInvoices = restockInvoices.map((invoice) => {
      if (invoice.id === invoiceId) {
        const updatedItems = invoice.items.map((item) => {
          if (item.itemId === selectedProductId) {
            return {
              ...item,
              quantityAdded: Number(updatedQty || 0),
              expiryDate: updatedExpiryDate || undefined,
            };
          }
          return item;
        });
        return { ...invoice, items: updatedItems };
      }
      return invoice;
    });

    saveRestockInvoicesToCache(updatedInvoices);

    // Sync parent item stock
    const newInventory = inventory.map((item) => {
      if (item.id === selectedProductId) {
        const isOverridden = overriddenStocks.includes(item.id);
        if (!isOverridden) {
          const totalShipmentsQty = updatedInvoices.filter((invoice) =>
            invoice.items.some((it) => it.itemId === item.id)
          ).reduce((sum, invoice) => {
            const itLine = invoice.items.find((it) => it.itemId === item.id);
            return sum + (itLine ? itLine.quantityAdded : 0);
          }, 0);
          setDetailStock(totalShipmentsQty);
          return { ...item, stock: totalShipmentsQty };
        }
      }
      return item;
    });
    setInventory(newInventory);
    localStorage.setItem("el_salam_er_inventory_v1", JSON.stringify(newInventory));

    alert(lang === "ar" ? "✓ تم تحديث بيانات الشحنة بنجاح!" : "✓ Shipment batch updated successfully!");
  };

  // Delete a single shipment/batch row
  const handleDeleteShipmentRow = (invoiceId: string) => {
    if (!selectedProductId) return;
    const confirmDelete = window.confirm(
      lang === "ar" 
        ? "هل أنت متأكد من حذف هذا السجل الخاص بهذه الشحنة الطبية؟" 
        : "Are you sure you want to delete this shipment record?"
    );
    if (!confirmDelete) return;

    const updatedInvoices = restockInvoices.map((invoice) => {
      if (invoice.id === invoiceId) {
        const updatedItems = invoice.items.filter((item) => item.itemId !== selectedProductId);
        return { ...invoice, items: updatedItems };
      }
      return invoice;
    }).filter(invoice => invoice.items.length > 0);

    saveRestockInvoicesToCache(updatedInvoices);

    // Sync parent item stock
    const newInventory = inventory.map((item) => {
      if (item.id === selectedProductId) {
        const isOverridden = overriddenStocks.includes(item.id);
        if (!isOverridden) {
          const totalShipmentsQty = updatedInvoices.filter((invoice) =>
            invoice.items.some((it) => it.itemId === item.id)
          ).reduce((sum, invoice) => {
            const itLine = invoice.items.find((it) => it.itemId === item.id);
            return sum + (itLine ? itLine.quantityAdded : 0);
          }, 0);
          setDetailStock(totalShipmentsQty);
          return { ...item, stock: totalShipmentsQty };
        }
      }
      return item;
    });
    setInventory(newInventory);
    localStorage.setItem("el_salam_er_inventory_v1", JSON.stringify(newInventory));

    alert(lang === "ar" ? "✓ تم حذف الشحنة من السجل بنجاح!" : "✓ Shipment record deleted successfully!");
  };

  // Add Item with live stock check from state
  const handleAddItem = (item: MedicalItem) => {
    const liveItem = inventory.find((it) => it.id === item.id) || item;
    const existingIndex = invoiceLines.findIndex(
      (line) => line.item_id === item.id,
    );

    if (existingIndex !== -1) {
      const updated = [...invoiceLines];
      const line = updated[existingIndex];
      const newQty = line.quantity + 1;

      // Stock check
      if (newQty > liveItem.stock) {
        setSaveSuccessMessage(
          lang === "ar"
            ? `⚠️ تجاوزت الحد الأقصى لصرف المستلزم! الرصيد المتاح من "${liveItem.name_ar}" هو ${liveItem.stock} فقط.`
            : `⚠️ Stock limit limit! Available inventory for "${liveItem.name_en}" is ${liveItem.stock} units.`,
        );
        setTimeout(() => setSaveSuccessMessage(null), 4000);
        return;
      }

      updated[existingIndex] = {
        ...line,
        quantity: newQty,
        line_total: roundPrice(newQty * line.unit_price),
      };
      setInvoiceLines(updated);
    } else {
      // First add stock check
      if (liveItem.stock <= 0) {
        setSaveSuccessMessage(
          lang === "ar"
            ? `⚠️ رصيد صفر! المستلزم "${liveItem.name_ar}" غير متوفر حالياً بالمخزن.`
            : `⚠️ Out of stock! "${liveItem.name_en}" is currently unavailable.`,
        );
        setTimeout(() => setSaveSuccessMessage(null), 4000);
        return;
      }

      const newLine: InvoiceLine = {
        item_id: item.id,
        item_name: lang === "ar" ? item.name_ar : item.name_en,
        item_name_ar: item.name_ar,
        item_name_en: item.name_en,
        unit_price: liveItem.unit_price,
        quantity: 1,
        line_total: liveItem.unit_price,
      };
      setInvoiceLines([...invoiceLines, newLine]);
    }
  };

  // Inline update checker
  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveLine(itemId);
      return;
    }

    const liveItem = inventory.find((it) => it.id === itemId);
    if (liveItem && newQty > liveItem.stock) {
      setSaveSuccessMessage(
        lang === "ar"
          ? `⚠️ لا يتوفر رصيد كافٍ! الرصيد المتاح من "${liveItem.name_ar}" هو ${liveItem.stock} وحدة.`
          : `⚠️ Cannot exceed inventory! Stock level for "${liveItem.name_en}" is ${liveItem.stock} units.`,
      );
      setTimeout(() => setSaveSuccessMessage(null), 4000);
      return;
    }

    const updated = invoiceLines.map((line) => {
      if (line.item_id === itemId) {
        return {
          ...line,
          quantity: newQty,
          line_total: roundPrice(newQty * line.unit_price),
        };
      }
      return line;
    });
    setInvoiceLines(updated);
  };

  const handleRemoveLine = (itemId: string) => {
    setInvoiceLines(invoiceLines.filter((line) => line.item_id !== itemId));
  };

  const handleResetForm = () => {
    setPatientName("");
    setReceiptNumber("");
    setInvoiceLines([]);
    setActiveHistoryIndex(null);
    setSaveSuccessMessage(null);
    setAmountPaid("");
  };

  // Commit flow representing Egypt Hospital Audit and Stock Deduction
  const handleCommitToDatabase = (shouldPrint = false) => {
    if (!schemaValidation.isValid) return;

    // Deduct stock from live inventory list
    const updatedInventory = inventory.map((invItem) => {
      const activeLine = invoiceLines.find(
        (line) => line.item_id === invItem.id,
      );
      if (activeLine) {
        return {
          ...invItem,
          stock: Math.max(0, invItem.stock - activeLine.quantity),
        };
      }
      return invItem;
    });

    saveInventoryToCache(updatedInventory);

    // Save payload to history audit log (handle edits in place vs new entries)
    let newHistory = [...history];
    let foundIndex = -1;

    // First try the loaded active history index
    if (
      activeHistoryIndex !== null &&
      activeHistoryIndex >= 0 &&
      activeHistoryIndex < history.length
    ) {
      foundIndex = activeHistoryIndex;
    } else {
      // Find by matching receipt number to be safe
      foundIndex = history.findIndex(
        (h) => h.receipt_number === receiptNumber.trim(),
      );
    }

    if (foundIndex !== -1) {
      // It is an edit! Update the existing record in-place to prevent duplication
      newHistory[foundIndex] = {
        ...supabasePayload,
        // Preserve the original creation timestamp so it doesn't jump in the archive
        created_at: history[foundIndex].created_at,
      };
    } else {
      // It is a new record! Create a fresh receipt
      const payloadToSave: InvoicePayload = {
        ...supabasePayload,
        created_at: new Date().toISOString(),
      };
      newHistory = [payloadToSave, ...newHistory];
    }

    saveHistoryToCache(newHistory);

    const isCurrentlyOnline = typeof navigator !== "undefined" && navigator.onLine;
    setSaveSuccessMessage(
      lang === "ar"
        ? isCurrentlyOnline
          ? `✓ تم حفظ وتحديث الإيصال بنجاح وتأكيد المعاملة في الخزينة ومزامنة المخزون!`
          : `⚠️ تم حفظ الإيصال محلياً بنجاح (وضع أوفلاين) - وسيتماثل تلقائياً مع السيرفر فور استعادة النت!`
        : isCurrentlyOnline
          ? `✓ Receipt changes saved and committed to ledger!`
          : `⚠️ Receipt saved locally offline! Will automatically sync when internet returns.`,
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);

    const handleResetAfterSave = () => {
      setPatientName("");
      setReceiptNumber("");
      setInvoiceLines([]);
      setActiveHistoryIndex(null);
      setIsReviewOpen(false);
      setAmountPaid("");
    };

    if (shouldPrint) {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          handleResetAfterSave();
        }, 500);
      }, 50);
    } else {
      handleResetAfterSave();
    }
  };

  // Open in-place invoice editor modal without redirecting to reception gate
  const handleOpenInPlaceInvoiceEditor = (idx: number) => {
    const record = history[idx];
    if (!record) return;
    setEditingInvoiceIndex(idx);
    setEditingInvoicePatientName(record.patient_name);
    setEditingInvoiceLines(record.invoice_lines.map((l) => ({ ...l })));
    setEditingInvoiceSearchQuery("");
    setEditingSelectedNewItem(null);
    setEditingNewItemQty(1);
  };

  const handleEditingLineQtyChange = (lineIndex: number, delta: number) => {
    setEditingInvoiceLines((prev) =>
      prev.map((line, i) => {
        if (i === lineIndex) {
          const newQty = Math.max(1, line.quantity + delta);
          return {
            ...line,
            quantity: newQty,
            line_total: newQty * line.unit_price,
          };
        }
        return line;
      })
    );
  };

  const handleEditingLineQtySet = (lineIndex: number, newQtyVal: number) => {
    const qty = Math.max(1, isNaN(newQtyVal) ? 1 : newQtyVal);
    setEditingInvoiceLines((prev) =>
      prev.map((line, i) => {
        if (i === lineIndex) {
          return {
            ...line,
            quantity: qty,
            line_total: qty * line.unit_price,
          };
        }
        return line;
      })
    );
  };

  const handleRemoveEditingLine = (lineIndex: number) => {
    setEditingInvoiceLines((prev) => prev.filter((_, i) => i !== lineIndex));
  };

  const handleAddItemToEditingInvoice = (item: MedicalItem, addQty: number) => {
    const qtyToAdd = Math.max(1, addQty);
    setEditingInvoiceLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.item_id === item.id);
      if (existingIdx >= 0) {
        return prev.map((l, i) => {
          if (i === existingIdx) {
            const updatedQty = l.quantity + qtyToAdd;
            return {
              ...l,
              quantity: updatedQty,
              line_total: updatedQty * l.unit_price,
            };
          }
          return l;
        });
      } else {
        const newLine: InvoiceLine = {
          item_id: item.id,
          item_name: lang === "ar" ? item.name_ar : item.name_en,
          item_name_ar: item.name_ar,
          item_name_en: item.name_en,
          unit_price: item.unit_price,
          quantity: qtyToAdd,
          line_total: qtyToAdd * item.unit_price,
        };
        return [...prev, newLine];
      }
    });
    setEditingSelectedNewItem(null);
    setEditingInvoiceSearchQuery("");
    setEditingNewItemQty(1);
  };

  const handleSaveInPlaceInvoiceEdits = () => {
    if (editingInvoiceIndex === null) return;
    const originalRecord = history[editingInvoiceIndex];
    if (!originalRecord) return;

    if (editingInvoiceLines.length === 0) {
      alert(
        lang === "ar"
          ? "لا يمكن حفظ فاتورة فارغة بدون أي مستلزمات. برجاء إضافة مستلزم واحد على الأقل أو حذف الفاتورة."
          : "Cannot save an empty invoice with 0 items. Please add at least one item or delete the invoice."
      );
      return;
    }

    // Compute stock differences: delta > 0 means user took MORE items from stock; delta < 0 means user returned items to stock
    const stockDeltas: Record<string, number> = {};

    originalRecord.invoice_lines.forEach((line) => {
      stockDeltas[line.item_id] = (stockDeltas[line.item_id] || 0) - line.quantity;
    });

    editingInvoiceLines.forEach((line) => {
      stockDeltas[line.item_id] = (stockDeltas[line.item_id] || 0) + line.quantity;
    });

    let hasStockIssue = false;
    let stockIssueMessage = "";

    const updatedInventory = inventory.map((invItem) => {
      const delta = stockDeltas[invItem.id] || 0;
      if (delta > 0 && invItem.stock < delta) {
        hasStockIssue = true;
        stockIssueMessage =
          lang === "ar"
            ? `الكمية المتاحة من "${invItem.name_ar}" هي (${invItem.stock}) بينما تتطلب التعديلات زيادة (${delta}).`
            : `Insufficient stock for "${invItem.name_en}". Available: ${invItem.stock}, needed extra: ${delta}.`;
      }
      return {
        ...invItem,
        stock: Math.max(0, invItem.stock - delta),
      };
    });

    if (hasStockIssue) {
      alert(stockIssueMessage);
      return;
    }

    const newGrandTotal = editingInvoiceLines.reduce((acc, l) => acc + l.line_total, 0);

    const updatedRecord: InvoicePayload = {
      ...originalRecord,
      patient_name: editingInvoicePatientName.trim() || originalRecord.patient_name,
      invoice_lines: editingInvoiceLines,
      grand_total: newGrandTotal,
    };

    const updatedHistory = history.map((record, idx) =>
      idx === editingInvoiceIndex ? updatedRecord : record
    );

    setHistory(updatedHistory);
    saveHistoryToCache(updatedHistory);

    setInventory(updatedInventory);
    saveInventoryToCache(updatedInventory);

    if (isSupabaseConfigured) {
      insertSupabasePatientInvoice(updatedRecord).catch(console.error);
      Object.keys(stockDeltas).forEach((itemId) => {
        const updatedInvItem = updatedInventory.find((i) => i.id === itemId);
        if (updatedInvItem) {
          upsertSupabaseMedicalItem(updatedInvItem).catch(console.error);
        }
      });
    }

    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم حفظ تعديلات الفاتورة رقم "${updatedRecord.receipt_number}" للمريض "${updatedRecord.patient_name}" بنجاح!`
        : `✓ Invoice "${updatedRecord.receipt_number}" for "${updatedRecord.patient_name}" updated successfully!`
    );
    setTimeout(() => setSaveSuccessMessage(null), 3500);

    setEditingInvoiceIndex(null);
  };

  const handleReloadFromHistory = (idx: number) => {
    const record = history[idx];
    if (record) {
      setPatientName(record.patient_name);
      setReceiptNumber(record.receipt_number);

      const lines: InvoiceLine[] = record.invoice_lines.map((li) => ({
        item_id: li.item_id,
        item_name: lang === "ar" ? li.item_name_ar : li.item_name_en,
        item_name_ar: li.item_name_ar,
        item_name_en: li.item_name_en,
        unit_price: li.unit_price,
        quantity: li.quantity,
        line_total: li.line_total,
      }));

      setInvoiceLines(lines);
      setActiveHistoryIndex(idx);
      setActivePage("ENTRANCE");
      setAmountPaid("");
      setSaveSuccessMessage(
        lang === "ar"
          ? "📝 تم تحميل مستند الإيصال الأرشيفي لتكرار الطباعة أو التعديل."
          : "📝 Loaded archived receipt layout into active reception desk.",
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);

      // Also sync to active session tab
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                patientName: record.patient_name,
                receiptNumber: record.receipt_number,
                invoiceLines: lines,
              }
            : s,
        ),
      );
    }
  };

  const handlePrintFromHistory = (idx: number) => {
    const record = history[idx];
    if (record) {
      // Set the temporary print record to isolate the print layout without disturbing active inputs
      setTempPrintRecord(record);
      setTimeout(() => {
        window.print();
        // Give the browser time to render print preview before resetting the temp state
        setTimeout(() => {
          setTempPrintRecord(null);
        }, 1200);
      }, 200);
    }
  };

  const handleDeleteFromHistory = (idx: number) => {
    setDeleteHistoryPendingIndex(idx);
  };

  const executeDeleteFromHistory = (idx: number) => {
    const record = history[idx];
    if (!record) return;

    // Return supply quantities back to the live inventory list!
    const updatedInventory = inventory.map((invItem) => {
      const activeLine = record.invoice_lines.find(
        (line) => line.item_id === invItem.id,
      );
      if (activeLine) {
        return {
          ...invItem,
          stock: invItem.stock + activeLine.quantity,
        };
      }
      return invItem;
    });

    setInventory(updatedInventory);
    saveInventoryToCache(updatedInventory);

    // Now remove from history
    const updated = history.filter((_, i) => i !== idx);
    saveHistoryToCache(updated);

    if (activeHistoryIndex === idx) {
      setActiveHistoryIndex(null);
    }

    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم حذف الفاتورة رقم "${record.receipt_number}" باسم "${record.patient_name}" بنجاح!`
        : `✓ Invoice "${record.receipt_number}" for "${record.patient_name}" deleted successfully!`,
    );
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Direct trigger to native print
  const handlePrintReceipt = () => {
    window.print();
  };

  // Trigger collective PDF printing of all filtered/listed invoices
  const handlePrintBatchInvoices = (list: InvoicePayload[]) => {
    setBatchInvoices(list);
    setPrintMode("batch");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintMode("single");
      }, 500);
    }, 150);
  };

  // Super admin action handlers
  const handleUpdateItemOverride = (
    itemId: string,
    newPrice: number,
    newStock: number,
  ) => {
    const updated = inventory.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          unit_price: Math.max(0, newPrice),
          stock: Math.max(0, newStock),
        };
      }
      return it;
    });
    saveInventoryToCache(updated);

    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم تحديث الأسعار والأرصدة لـ "${itemId}" بنجاح!`
        : `✓ Successfully updated tariff & volume metrics for item code: ${itemId}!`,
    );
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Quick stock adjustment (+ / -) for instant stocktaking (gard)
  const handleQuickAdjustStock = (itemId: string, delta: number) => {
    const currentItem = inventory.find((i) => i.id === itemId);
    if (!currentItem) return;

    const currentVal = pendingStockAdjustments[itemId] !== undefined
      ? pendingStockAdjustments[itemId]
      : currentItem.stock;

    const newStock = Math.max(0, currentVal + delta);

    if (newStock === currentItem.stock) {
      setPendingStockAdjustments((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setPendingStockAdjustments((prev) => ({
        ...prev,
        [itemId]: newStock,
      }));
    }
  };

  const handleConfirmSaveStockAdjustments = async () => {
    const updatedInventory = inventory.map((item) => {
      if (pendingStockAdjustments[item.id] !== undefined) {
        return { ...item, stock: pendingStockAdjustments[item.id] };
      }
      return item;
    });

    setInventory(updatedInventory);
    saveInventoryToCache(updatedInventory);

    if (isSupabaseConfigured) {
      for (const itemId of Object.keys(pendingStockAdjustments)) {
        const updatedItem = updatedInventory.find((i) => i.id === itemId);
        if (updatedItem) {
          upsertSupabaseMedicalItem(updatedItem).catch(console.error);
        }
      }
    }

    const modifiedCount = Object.keys(pendingStockAdjustments).length;
    setPendingStockAdjustments({});
    setIsConfirmStockSaveOpen(false);

    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم حفظ تعديلات كميات المخزون لعدد (${modifiedCount}) أصناف بنجاح!`
        : `✓ Stock quantity adjustments saved for (${modifiedCount}) items successfully!`
    );
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleCancelStockAdjustments = () => {
    setPendingStockAdjustments({});
  };

  // Add operator account to app_users & state
  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newOperatorEmail.trim().toLowerCase();
    const cleanFullName = newOperatorFullName.trim() || cleanUsername;
    if (!cleanUsername) return;

    if (
      operators.some(
        (op) =>
          (op.email && op.email.toLowerCase() === cleanUsername) ||
          (op.username && op.username.toLowerCase() === cleanUsername)
      )
    ) {
      setSaveSuccessMessage(
        lang === "ar"
          ? "⚠️ اسم المستخدم مسجل مسبقاً!"
          : "⚠️ Operator account already exists!"
      );
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      return;
    }

    const pass = newOperatorPassword.trim() || "reception123";
    const newOp: ReceptionOperator = {
      email: cleanUsername,
      username: cleanUsername,
      fullName: cleanFullName,
      isActive: true,
      joined_at: new Date().toISOString(),
      role: newOperatorRole,
    };

    const updated = [...operators, newOp];
    saveOperatorsToCache(updated);

    if (isSupabaseConfigured) {
      await upsertSupabaseAppUser(cleanUsername, pass, cleanFullName, newOperatorRole, true);
    }

    setNewOperatorFullName("");
    setNewOperatorEmail("");
    setNewOperatorPassword("");
    setNewOperatorRole("RECEPTION");
    setSaveSuccessMessage(
      lang === "ar"
        ? "✓ تم إنشاء واعتماد حساب المشغل بنجاح في قاعدة البيانات!"
        : "✓ Reception operator registered successfully!"
    );
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  // Staged Restock management handlers
  const handleRemoveStagedItem = (id: string) => {
    setStagedRestockItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleChangeStagedQuantity = (id: string, val: string) => {
    if (val === "") {
      setStagedRestockItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: "" } : item)),
      );
    } else {
      const parsed = parseInt(val);
      setStagedRestockItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, quantity: isNaN(parsed) ? "" : Math.max(0, parsed) }
            : item,
        ),
      );
    }
  };

  const handleChangeStagedExpiryDate = (id: string, val: string) => {
    setStagedRestockItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, expiryDate: val } : item,
      ),
    );
  };

  // Handle restock submissions for multiple staged items as grouped Invoice/Batch
  const handleRestockSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (stagedRestockItems.length === 0) {
      setSaveSuccessMessage(
        lang === "ar"
          ? "⚠️ قائمة التوريد فارغة! ابحث عن مستلزم وأضفه أولاً."
          : "⚠️ Staging restock manifest is empty! Search and add items first.",
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      return;
    }

    // Checking if any item has empty quantity
    const invalidQty = stagedRestockItems.find(
      (it) => !it.quantity || Number(it.quantity) <= 0,
    );
    if (invalidQty) {
      setSaveSuccessMessage(
        lang === "ar"
          ? `⚠️ يرجى تحديد كمية صحيحة أكبر من الصفر للصنف: "${invalidQty.name_ar}"`
          : `⚠️ Please enter a valid quantity greater than zero for: "${invalidQty.name_en}"`,
      );
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      return;
    }

    // Checking if any drug needs an expiry date but doesn't have one
    const missingExpiry = stagedRestockItems.find((it) => {
      const isMedicine =
        it.category_en === "Emergency Drugs" ||
        it.category_ar === "أدوية وحقن طوارئ";
      return isMedicine && !it.expiryDate;
    });

    if (missingExpiry) {
      setSaveSuccessMessage(
        lang === "ar"
          ? `🚨 يرجى تحديد تاريخ انتهاء الصلاحية للدواء: "${missingExpiry.name_ar}"`
          : `🚨 Expiry date is required for the drug: "${missingExpiry.name_en}"`,
      );
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      return;
    }

    // 1. Update Inventory Stock Counts
    const updatedInventory = inventory.map((item) => {
      const staged = stagedRestockItems.find((it) => it.id === item.id);
      if (staged) {
        return {
          ...item,
          stock: item.stock + Number(staged.quantity),
          expiry_date: staged.expiryDate || item.expiry_date,
        };
      }
      return item;
    });

    saveInventoryToCache(updatedInventory);

    // 2. Generate new GROUPED Invoice entry
    const newInvoiceId = "RST-INV-" + Math.floor(100 + Math.random() * 900);
    const invoiceItems: RestockInvoiceItem[] = stagedRestockItems.map(
      (staged) => ({
        itemId: staged.id,
        itemNameAr: staged.name_ar,
        itemNameEn: staged.name_en,
        categoryAr: staged.category_ar,
        categoryEn: staged.category_en,
        quantityAdded: Number(staged.quantity),
        expiryDate: staged.expiryDate || undefined,
      }),
    );

    const newInvoice: RestockInvoice = {
      id: newInvoiceId,
      supplier:
        restockSupplier ||
        (lang === "ar" ? "جهة توريد غير مصنفة" : "General Supply"),
      officer: currentUser?.email || "Antonymohab@gmail.com",
      notes: restockNotes,
      timestamp: new Date().toISOString(),
      items: invoiceItems,
    };

    const newInvoices = [newInvoice, ...restockInvoices];
    saveRestockInvoicesToCache(newInvoices);

    // 3. Reset form states
    setStagedRestockItems([]);
    setRestockSupplier("");
    setRestockNotes("");

    setSaveSuccessMessage(
      lang === "ar"
        ? `✓ تم تزويد المخزون بنجاح وتسجيل فاتورة التوريد (${newInvoiceId}) محمل بها ${invoiceItems.length} صنف مضاف!`
        : `✓ Successfully restocked and logged Invoice (${newInvoiceId}) with ${invoiceItems.length} items!`,
    );
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Toggle active operators status
  const handleToggleOperatorStatus = async (email: string) => {
    // Keep at least one admin operator active for safety
    if (email === "Antonymohab@gmail.com" || email === "admin") {
      setSaveSuccessMessage(
        lang === "ar"
          ? "⚠️ غير مسموح بتعطيل حساب المالك الأساسي!"
          : "⚠️ Cannot disable critical owner profile!",
      );
      setTimeout(() => setSaveSuccessMessage(null), 3000);
      return;
    }

    let newActive = true;
    const updated = operators.map((op) => {
      if (op.email === email || op.username === email) {
        newActive = !op.isActive;
        return { ...op, isActive: newActive };
      }
      return op;
    });
    saveOperatorsToCache(updated);

    if (isSupabaseConfigured) {
      await toggleSupabaseAppUserActive(email, newActive);
    }
  };

  // Delete operator
  const handleDeleteOperator = async (email: string) => {
    if (email === "Antonymohab@gmail.com" || email === "admin") return;
    const updated = operators.filter((op) => op.email !== email && op.username !== email);
    saveOperatorsToCache(updated);

    if (isSupabaseConfigured) {
      await deleteSupabaseAppUser(email);
    }
  };

  // Enforce reception page bounds for reception operators
  useEffect(() => {
    if (currentUser?.role === "RECEPTION" && activePage === "ADMIN") {
      setActivePage("ENTRANCE");
    }
  }, [currentUser, activePage]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const inputTrimmed = (loginUsername || loginEmail).trim();
    const passTrimmed = loginPassword.trim();

    if (!inputTrimmed || !passTrimmed) {
      setLoginError("❌ يرجى إدخال اسم المستخدم ورمز المرور!");
      return;
    }

    // 1. Try Supabase Live Authentication if configured
    if (isSupabaseConfigured) {
      try {
        const { user: supaUser, isDeactivated } = await authenticateSupabaseUser(inputTrimmed, passTrimmed);
        if (isDeactivated) {
          setLoginError(
            lang === "ar"
              ? "⛔ تم تعطيل هذا الحساب بقرار الإدارة. يرجى مراجعة مدير النظام."
              : "⛔ Account disabled by administration. Please contact system administrator."
          );
          return;
        }
        if (supaUser) {
          const userObj = {
            username: supaUser.username,
            email: supaUser.username,
            role: supaUser.role,
          };
          setCurrentUser(userObj);
          localStorage.setItem("el_salam_er_auth_v1", JSON.stringify(userObj));
          if (supaUser.role === "SUPER_ADMIN") {
            setActivePage("ADMIN");
          } else {
            setActivePage("ENTRANCE");
          }
          setSaveSuccessMessage(`✓ تم تسجيل الدخول بنجاح عبر Supabase (${supaUser.username}).`);
          setTimeout(() => setSaveSuccessMessage(null), 3000);
          setLoginUsername("");
          setLoginEmail("");
          setLoginPassword("");
          return;
        }
      } catch (err) {
        console.warn("Notice during Supabase auth check:", err);
      }
    }

    // 2. Fallback Local Authentication
    const normalized = inputTrimmed.toLowerCase();

    // Check if operator account is deactivated locally
    const matchingOp = operators.find(
      (op) =>
        (op.email && op.email.toLowerCase() === normalized) ||
        (op.username && op.username.toLowerCase() === normalized)
    );
    if (matchingOp && matchingOp.isActive === false) {
      setLoginError(
        lang === "ar"
          ? "⛔ تم تعطيل هذا الحساب بقرار الإدارة. يرجى مراجعة مدير النظام."
          : "⛔ Account disabled by administration. Please contact system administrator."
      );
      return;
    }

    // Admin Account check
    const isSuperAdmin =
      normalized === "admin" ||
      normalized === "admin_salam" ||
      normalized === "antonymohab@gmail.com";

    if (isSuperAdmin) {
      if (passTrimmed === "admin123") {
        const userObj = {
          username: "admin",
          email: "admin",
          role: "SUPER_ADMIN" as const,
        };
        setCurrentUser(userObj);
        localStorage.setItem("el_salam_er_auth_v1", JSON.stringify(userObj));
        setActivePage("ADMIN");
        setSaveSuccessMessage("✓ مرحبًا بك يا مدير النظام (admin). تم تأكيد الهوية.");
        setTimeout(() => setSaveSuccessMessage(null), 3000);
        setLoginUsername("");
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError("❌ رمز مرور مدير النظام غير صحيح!");
      }
      return;
    }

    // Reception Operator check
    const isReception =
      normalized === "reception" ||
      normalized === "reception1" ||
      normalized === "reception1@salam.com" ||
      !!matchingOp;

    if (isReception) {
      if (passTrimmed === "reception123") {
        const userObj = {
          username: inputTrimmed,
          email: inputTrimmed,
          role: "RECEPTION" as const,
        };
        setCurrentUser(userObj);
        localStorage.setItem("el_salam_er_auth_v1", JSON.stringify(userObj));
        setActivePage("ENTRANCE");
        setSaveSuccessMessage(`✓ مرحبًا بك بوردية الاستقبال (${inputTrimmed}). تم تسجيل الحضور.`);
        setTimeout(() => setSaveSuccessMessage(null), 3000);
        setLoginUsername("");
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError("❌ رمز مرور موظف الاستقبال غير صحيح!");
      }
      return;
    }

    setLoginError("❌ اسم المستخدم أو رمز المرور غير صحيح!");
  };

  // Visible history records filtered by logged-in receptionist shift / account
  const visibleHistory = useMemo(() => {
    if (currentUser?.role === "RECEPTION") {
      const activeUserKey = (currentUser.username || currentUser.email || "").trim().toLowerCase();
      if (!activeUserKey) return [];

      return history.filter((inv) => {
        const officerKey = (inv.billing_officer_email || "").trim().toLowerCase();
        if (!officerKey) return true;

        if (officerKey === activeUserKey) return true;
        const userPrefix = activeUserKey.split("@")[0];
        const officerPrefix = officerKey.split("@")[0];
        if (userPrefix === officerPrefix) return true;

        return false;
      });
    }
    // Super admin sees all history records across all shifts
    return history;
  }, [history, currentUser]);

  const getTodayDateString = () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  };

  const [historyStartDate, setHistoryStartDate] = useState<string>(getTodayDateString());
  const [historyEndDate, setHistoryEndDate] = useState<string>(getTodayDateString());

  // Count of invoices created on the selected date range/day for the current user view
  const activeDateReceiptsCount = useMemo(() => {
    return visibleHistory.filter((inv) => {
      if (!inv.created_at) return false;
      const invDate = new Date(inv.created_at);
      if (isNaN(invDate.getTime())) return false;
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${invDate.getFullYear()}-${pad(invDate.getMonth() + 1)}-${pad(invDate.getDate())}`;

      if (historyStartDate && dateStr < historyStartDate) return false;
      if (historyEndDate && dateStr > historyEndDate) return false;

      return true;
    }).length;
  }, [visibleHistory, historyStartDate, historyEndDate]);

  // BI reporting metrics calculated dynamically from history log
  const calculatedBIMetrics = useMemo(() => {
    const cashTotal = visibleHistory.reduce((sum, item) => sum + item.grand_total, 0);
    const uniquePatientsCount = new Set(
      visibleHistory.map((it) => it.patient_name.trim().toLowerCase()),
    ).size;

    // Aggregate items sold
    const supplyUsageRecord: Record<
      string,
      { name_ar: string; name_en: string; qty: number }
    > = {};
    visibleHistory.forEach((receipt) => {
      receipt.invoice_lines.forEach((line) => {
        if (!supplyUsageRecord[line.item_id]) {
          supplyUsageRecord[line.item_id] = {
            name_ar: line.item_name_ar,
            name_en: line.item_name_en,
            qty: 0,
          };
        }
        supplyUsageRecord[line.item_id].qty += line.quantity;
      });
    });

    const sortedUsage = Object.entries(supplyUsageRecord)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    return {
      cashDrawer: cashTotal,
      patientCount: uniquePatientsCount,
      topSupplies: sortedUsage,
    };
  }, [visibleHistory]);

  if (!currentUser) {
    return (
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans selection:bg-sky-150"
      >
        <NetworkSyncBar
          currentLang={lang}
          isOnline={isOnline}
          pendingCount={pendingSyncCount}
          isSyncing={isSyncingPending}
          syncSuccessMessage={syncSuccessMessage}
          onManualSync={triggerAutoSync}
        />
        <main className="w-full max-w-[420px] bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden relative p-8 mt-4">
          {/* Circular Glossy Logo Header (Exactly matches Screenshot 3) */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-[100px] h-[100px] rounded-full bg-[#d5f2ff] ring-4 ring-[#bbf7d0] flex items-center justify-center shadow-xs transition-transform duration-500 hover:scale-[1.03]">
              <HospitalLogo className="w-[84px] h-[84px]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-arabic mt-4 text-center tracking-wide">
              {lang === "ar" ? "مستشفى السلام" : "El-Salam Hospital"}
            </h2>
          </div>

          {/* Login Error Notification */}
          <AnimatePresence>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 bg-rose-50 border border-rose-205 text-rose-700 rounded-lg text-xs font-semibold font-arabic flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form with Username & Password */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-right">
              <label className="block text-xs font-bold text-[#091e42] mb-1 font-arabic">
                اسم المستخدم
              </label>
              <input
                type="text"
                required
                placeholder="اسم المستخدم (مثال: admin أو reception)"
                value={loginUsername || loginEmail}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  setLoginEmail(e.target.value);
                }}
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-hospital-blue focus:border-[#0284c7] outline-none placeholder-slate-400 font-sans"
              />
            </div>

            <div className="text-right">
              <label className="block text-xs font-bold text-[#091e42] mb-1 font-arabic">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs focus:ring-1 focus:ring-hospital-blue focus:border-[#0284c7] outline-none font-sans"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-lg text-xs font-arabic transition-all shadow-xs cursor-pointer mt-2"
            >
              تسجيل الدخول
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-sky-150">
      {/* In-Place Invoice Editor Modal (تعديل الفاتورة في نفس الصفحة) */}
      {editingInvoiceIndex !== null && history[editingInvoiceIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden font-arabic text-right my-auto"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-hospital-blue to-sky-700 text-white p-4 md:p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Pencil className="w-5 h-5 text-sky-100" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black">
                    {lang === "ar" ? "تعديل الفاتورة في الأرشيف" : "Edit Invoice Record"}
                  </h3>
                  <p className="text-[11px] text-sky-100 font-mono mt-0.5">
                    {lang === "ar"
                      ? `رقم الإيصال: #${history[editingInvoiceIndex].receipt_number}`
                      : `Receipt Ref: #${history[editingInvoiceIndex].receipt_number}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoiceIndex(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Patient Name & Ref Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "ar" ? "اسم المريض / الحضور:" : "Patient Name:"}
                  </label>
                  <input
                    type="text"
                    value={editingInvoicePatientName}
                    onChange={(e) => setEditingInvoicePatientName(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-hospital-blue focus:ring-1 focus:ring-hospital-blue rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                    placeholder={lang === "ar" ? "أدخل اسم المريض..." : "Enter patient name..."}
                  />
                </div>
                <div className="flex flex-col md:items-end text-xs space-y-1 text-slate-500 font-mono">
                  <div>
                    <span className="font-arabic font-bold text-slate-700 ml-1">تاريخ الإنشاء:</span>
                    {new Date(history[editingInvoiceIndex].created_at).toLocaleDateString(
                      lang === "ar" ? "ar-EG" : "en-US"
                    )}{" "}
                    -{" "}
                    {new Date(history[editingInvoiceIndex].created_at).toLocaleTimeString(
                      lang === "ar" ? "ar-EG" : "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </div>
                  <div>
                    <span className="font-arabic font-bold text-slate-700 ml-1">المسؤول المالي:</span>
                    {getUserName(history[editingInvoiceIndex].billing_officer_email, lang)}
                  </div>
                </div>
              </div>

              {/* Item Search Engine to Add Items */}
              <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                  <Search className="w-4 h-4 text-hospital-blue" />
                  <span>
                    {lang === "ar"
                      ? "محرّك البحث لإضافة مستلزمات طبية جديدة للفاتورة:"
                      : "Search to add new items to invoice:"}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={editingInvoiceSearchQuery}
                    onChange={(e) => {
                      setEditingInvoiceSearchQuery(e.target.value);
                      setEditingSelectedNewItem(null);
                    }}
                    placeholder={
                      lang === "ar"
                        ? "🔍 اكتب اسم المستلزم الطبي أو الكود للبحث..."
                        : "🔍 Search item name or code..."
                    }
                    className="w-full bg-white border border-sky-300 focus:border-hospital-blue focus:ring-2 focus:ring-sky-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                  />

                  {/* Search Results Dropdown */}
                  {editingInvoiceSearchQuery.trim().length > 0 && !editingSelectedNewItem && (
                    <div className="absolute z-20 top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {(() => {
                        const q = editingInvoiceSearchQuery.trim().toLowerCase();
                        const matches = inventory.filter(
                          (item) =>
                            item.name_ar.toLowerCase().includes(q) ||
                            item.name_en.toLowerCase().includes(q) ||
                            item.id.toLowerCase().includes(q)
                        );

                        if (matches.length === 0) {
                          return (
                            <div className="p-3 text-center text-xs text-slate-400 font-arabic">
                              {lang === "ar" ? "لا توجد نتائج مطابقة" : "No matching items found"}
                            </div>
                          );
                        }

                        return matches.slice(0, 8).map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="p-2.5 text-right hover:bg-sky-50/80 flex items-center justify-between gap-3 text-xs transition-colors"
                          >
                            <div>
                              <span className="font-bold text-slate-800 block">
                                {lang === "ar" ? item.name_ar : item.name_en}
                              </span>
                              <span className="text-[10.5px] text-slate-400 font-mono">
                                {lang === "ar" ? item.category_ar : item.category_en} |{" "}
                                {lang === "ar" ? `الرصيد: ${item.stock}` : `Stock: ${item.stock}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-emerald-600 font-mono text-xs">
                                {formatCurrency(item.unit_price, lang)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddItemToEditingInvoice(item, 1);
                                  setEditingInvoiceSearchQuery("");
                                }}
                                className="px-2.5 py-1 bg-hospital-blue hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{lang === "ar" ? "إضافة" : "Add"}</span>
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Selected Item Quantity Picker Panel */}
                {editingSelectedNewItem && (
                  <div className="bg-white border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        {lang === "ar" ? editingSelectedNewItem.name_ar : editingSelectedNewItem.name_en}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono font-bold">
                        {formatCurrency(editingSelectedNewItem.unit_price, lang)} |{" "}
                        {lang === "ar"
                          ? `المتاح بالرصيد: ${editingSelectedNewItem.stock}`
                          : `Stock: ${editingSelectedNewItem.stock}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                        {lang === "ar" ? "الكمية:" : "Qty:"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingNewItemQty}
                        onChange={(e) => setEditingNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-center bg-slate-50 border border-slate-300 rounded-lg py-1 text-xs font-extrabold font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddItemToEditingInvoice(editingSelectedNewItem, editingNewItemQty)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === "ar" ? "إضافة للفاتورة" : "Add to Invoice"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSelectedNewItem(null);
                          setEditingInvoiceSearchQuery("");
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Invoice Lines Table */}
              <div>
                <h4 className="text-xs font-black text-slate-800 mb-2 flex items-center justify-between">
                  <span>{lang === "ar" ? "قائمة مستلزمات الفاتورة الحالية:" : "Current Invoice Items:"}</span>
                  <span className="text-slate-500 font-normal">
                    {lang === "ar"
                      ? `عدد الأصناف: (${editingInvoiceLines.length})`
                      : `Item Count: (${editingInvoiceLines.length})`}
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-3 text-center w-8">#</th>
                        <th className="py-2 px-3 text-right">{lang === "ar" ? "المستلزم" : "Item Name"}</th>
                        <th className="py-2 px-3 text-center">{lang === "ar" ? "السعر" : "Unit Price"}</th>
                        <th className="py-2 px-3 text-center">{lang === "ar" ? "الكمية" : "Quantity"}</th>
                        <th className="py-2 px-3 text-center">{lang === "ar" ? "الإجمالي" : "Total"}</th>
                        <th className="py-2 px-3 text-center w-12">{lang === "ar" ? "إجراء" : "Action"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editingInvoiceLines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 font-arabic">
                            {lang === "ar"
                              ? "لا توجد مستلزمات في الفاتورة. استخدم محرك البحث أعلاه لإضافة مستلزمات."
                              : "No items in invoice. Use search engine above to add items."}
                          </td>
                        </tr>
                      ) : (
                        editingInvoiceLines.map((line, lIdx) => (
                          <tr key={`${line.item_id}-${lIdx}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                              {lIdx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-800">
                              {lang === "ar" ? line.item_name_ar : line.item_name_en}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-600">
                              {formatCurrency(line.unit_price, lang)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center justify-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditingLineQtyChange(lIdx, -1)}
                                  className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 font-black text-xs cursor-pointer flex items-center justify-center shadow-3xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) => handleEditingLineQtySet(lIdx, parseInt(e.target.value))}
                                  className="w-10 text-center font-mono font-black text-slate-800 text-xs bg-transparent border-none p-0 focus:ring-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleEditingLineQtyChange(lIdx, 1)}
                                  className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 font-black text-xs cursor-pointer flex items-center justify-center shadow-3xs"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-hospital-blue">
                              {formatCurrency(line.line_total, lang)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditingLine(lIdx)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title={lang === "ar" ? "حذف المستلزم" : "Remove item"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {editingInvoiceLines.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-800">
                          <td colSpan={4} className="py-3 px-3 text-right">
                            {lang === "ar" ? "إجمالي قيمة الفاتورة المعدلة:" : "Updated Grand Total:"}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-emerald-700 text-sm">
                            {formatCurrency(
                              editingInvoiceLines.reduce((acc, l) => acc + l.line_total, 0),
                              lang
                            )}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditingInvoiceIndex(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
              >
                {lang === "ar" ? "إلغاء والتراجع" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleSaveInPlaceInvoiceEdits}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer transition-all flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{lang === "ar" ? "حفظ التغييرات الجديدة" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <NetworkSyncBar
        currentLang={lang}
        isOnline={isOnline}
        pendingCount={pendingSyncCount}
        isSyncing={isSyncingPending}
        syncSuccessMessage={syncSuccessMessage}
        onManualSync={triggerAutoSync}
      />
      <HospitalHeader
        currentLang={lang}
        onLanguageChange={setLang}
        loggedInUserEmail={currentUser?.username || currentUser?.email}
        loggedInRole={currentUser?.role}
        onLogout={() => {
          setCurrentUser(null);
          localStorage.removeItem("el_salam_er_auth_v1");
        }}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
      />

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" dir={lang === "ar" ? "rtl" : "ltr"}>
          {/* Dark Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Drawer Panel anchored to the RIGHT side */}
          <div className="fixed top-0 right-0 bottom-0 z-10 w-72 max-w-[85vw] bg-slate-100 border-l border-slate-200 shadow-2xl p-3.5 overflow-y-auto flex flex-col gap-3 animate-slideInRight">
            {/* Header card inside drawer */}
            <div className="bg-white border border-slate-200/80 p-3 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <HospitalLogo className="w-8 h-8 shrink-0 filter drop-shadow-3xs" />
                <div>
                  <h2 className="text-xs font-black text-slate-800 font-arabic">
                    {lang === "ar" ? "قائمة الصفحات" : "Navigation Menu"}
                  </h2>
                  <span className="text-[10px] text-sky-700 font-bold block font-arabic mt-0.5">
                    {lang === "ar" ? "مستشفى السلام" : "El-Salam Hospital"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Options List */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePage("ENTRANCE");
                  setMobileNavOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  activePage === "ENTRANCE"
                    ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                    : "bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-hospital-blue font-bold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardList className="w-4 h-4 shrink-0 text-hospital-blue" />
                  <span className={`text-xs truncate ${activePage === "ENTRANCE" ? "text-white" : ""}`}>
                    {lang === "ar" ? "بوابة الاستقبال والفوترة" : "Entrance Desk"}
                  </span>
                </div>
                {activePage === "ENTRANCE" && <span className="text-xs shrink-0">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePage("ARCHIVE");
                  setMobileNavOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  activePage === "ARCHIVE"
                    ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                    : "bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-hospital-blue font-bold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="w-4 h-4 shrink-0 text-hospital-blue" />
                  <span className={`text-xs truncate ${activePage === "ARCHIVE" ? "text-white" : ""}`}>
                    {lang === "ar" ? "سجلات وإيصالات المرضى" : "Patient Registry"}
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0 ${
                  activePage === "ARCHIVE" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}>
                  {activeDateReceiptsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePage("CONSUMPTION");
                  setMobileNavOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  activePage === "CONSUMPTION"
                    ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                    : "bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-hospital-blue font-bold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TrendingUp className="w-4 h-4 shrink-0 text-hospital-blue" />
                  <span className={`text-xs truncate ${activePage === "CONSUMPTION" ? "text-white" : ""}`}>
                    {lang === "ar" ? "دفتر الاستهلاك اليومي" : "Daily Consumption"}
                  </span>
                </div>
                {activePage === "CONSUMPTION" && <span className="text-xs shrink-0">✓</span>}
              </button>

              {currentUser?.role === "SUPER_ADMIN" && (
                <>
                  <div className="h-px bg-slate-200/80 my-1" />
                  <div className="px-1 py-0.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-sky-800 font-arabic block">
                      {lang === "ar" ? "إدارة المخزن والموظفين" : "Admin & Warehouse"}
                    </span>
                    <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded border border-sky-200">
                      {lang === "ar" ? "أدمن" : "Admin"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("ADMIN");
                      setMobileNavOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      activePage === "ADMIN"
                        ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                        : "bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-hospital-blue font-bold"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Shield className="w-4 h-4 shrink-0 text-hospital-blue" />
                      <span className={`text-xs truncate ${activePage === "ADMIN" ? "text-white" : ""}`}>
                        {lang === "ar" ? "جرد وأسعار المخزون" : "Warehouse Stock"}
                      </span>
                    </div>
                    {activePage === "ADMIN" && <span className="text-xs shrink-0">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("RESTOCK");
                      setMobileNavOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      activePage === "RESTOCK"
                        ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                        : "bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-hospital-blue font-bold"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Plus className="w-4 h-4 shrink-0 text-hospital-blue" />
                      <span className={`text-xs truncate ${activePage === "RESTOCK" ? "text-white" : ""}`}>
                        {lang === "ar" ? "تزويد المخزون" : "Restock Supplies"}
                      </span>
                    </div>
                    {activePage === "RESTOCK" && <span className="text-xs shrink-0">✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("OPERATORS");
                      setMobileNavOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      activePage === "OPERATORS"
                        ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                        : "bg-white hover:bg-sky-50/70 border-slate-200 hover:border-sky-300 text-slate-700 hover:text-hospital-blue font-bold"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="w-4 h-4 shrink-0 text-hospital-blue" />
                      <span className={`text-xs truncate ${activePage === "OPERATORS" ? "text-white" : ""}`}>
                        {lang === "ar" ? "صلاحيات الموظفين" : "Operators Privilege"}
                      </span>
                    </div>
                    {activePage === "OPERATORS" && <span className="text-xs shrink-0">✓</span>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Workspace layout panel with Right Vertical Sidebar Navigation in RTL */}
      <main
        className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-5 flex flex-col lg:flex-row gap-5 items-start print:block print:p-0 print:max-w-full print:w-full"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {/* Desktop Vertical Navigation Sidebar */}
        <aside
          className="hidden lg:block w-64 shrink-0 bg-white border border-slate-250 rounded-2xl p-3.5 shadow-3xs relative overflow-hidden print:hidden"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-hospital-blue via-sky-600 to-emerald-500" />

          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-150">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-hospital-blue/10 text-hospital-blue">
                <HeartPulse className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-800 font-arabic">
                  {lang === "ar" ? "قائمة الصفحات" : "Navigation Menu"}
                </h2>
                <span className="text-[10px] text-slate-400 font-bold block font-arabic">
                  {lang === "ar" ? "مستشفى السلام" : "El-Salam Hospital"}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Navigation Buttons */}
          <div className="flex flex-col gap-1.5">
            {/* 1. ENTRANCE */}
            <button
              type="button"
              onClick={() => setActivePage("ENTRANCE")}
              className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activePage === "ENTRANCE"
                  ? "bg-hospital-blue text-white border-hospital-blue font-black shadow-3xs"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span className="text-xs truncate">{lang === "ar" ? "بوابة الاستقبال والفوترة" : "Entrance Desk"}</span>
              </div>
              {activePage === "ENTRANCE" && <span className="text-xs shrink-0">✓</span>}
            </button>

            {/* 2. ARCHIVE */}
            <button
              type="button"
              onClick={() => setActivePage("ARCHIVE")}
              className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activePage === "ARCHIVE"
                  ? "bg-slate-800 text-white border-slate-800 font-black shadow-3xs"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Database className="w-4 h-4 shrink-0" />
                <span className="text-xs truncate">{lang === "ar" ? "سجلات وإيصالات المرضى" : "Patient Registry"}</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                activePage === "ARCHIVE" ? "bg-white text-slate-800" : "bg-slate-200 text-slate-700"
              }`}>
                {activeDateReceiptsCount}
              </span>
            </button>

            {/* 3. CONSUMPTION */}
            <button
              type="button"
              onClick={() => setActivePage("CONSUMPTION")}
              className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                activePage === "CONSUMPTION"
                  ? "bg-emerald-600 text-white border-emerald-600 font-black shadow-3xs"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="text-xs truncate">{lang === "ar" ? "دفتر الاستهلاك اليومي" : "Daily Consumption"}</span>
              </div>
              {activePage === "CONSUMPTION" && <span className="text-xs shrink-0">✓</span>}
            </button>

            {/* SUPER_ADMIN buttons */}
            {currentUser?.role === "SUPER_ADMIN" && (
              <>
                <div className="h-px bg-slate-200 my-1" />
                <span className="text-[10px] uppercase font-black text-slate-400 font-arabic px-1 block">
                  {lang === "ar" ? "إدارة المخزن والموظفين" : "Admin & Warehouse"}
                </span>

                {/* 4. ADMIN */}
                <button
                  type="button"
                  onClick={() => setActivePage("ADMIN")}
                  className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    activePage === "ADMIN"
                      ? "bg-rose-700 text-white border-rose-700 font-black shadow-3xs"
                      : "bg-[#fff1f2] hover:bg-[#ffe4e6] border-[#fecdd3] text-[#be123c]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span className="text-xs truncate">{lang === "ar" ? "جرد وأسعار المخزون" : "Warehouse Stock"}</span>
                  </div>
                  {activePage === "ADMIN" && <span className="text-xs shrink-0">✓</span>}
                </button>

                {/* 5. RESTOCK */}
                <button
                  type="button"
                  onClick={() => setActivePage("RESTOCK")}
                  className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    activePage === "RESTOCK"
                      ? "bg-emerald-700 text-white border-emerald-700 font-black shadow-3xs"
                      : "bg-[#ecfdf5] hover:bg-[#d1fae5] border-[#a7f3d0] text-[#047857]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="text-xs truncate">{lang === "ar" ? "تزويد المخزون" : "Restock Supplies"}</span>
                  </div>
                  {activePage === "RESTOCK" && <span className="text-xs shrink-0">✓</span>}
                </button>

                {/* 6. OPERATORS */}
                <button
                  type="button"
                  onClick={() => setActivePage("OPERATORS")}
                  className={`w-full p-2.5 rounded-xl border font-arabic transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    activePage === "OPERATORS"
                      ? "bg-indigo-700 text-white border-indigo-700 font-black shadow-3xs"
                      : "bg-[#e0e7ff] hover:bg-[#c7d2fe] border-[#c7d2fe] text-[#3730a3]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-xs truncate">{lang === "ar" ? "صلاحيات الموظفين" : "Operators Privilege"}</span>
                  </div>
                  {activePage === "OPERATORS" && <span className="text-xs shrink-0">✓</span>}
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Content Workspace Frame */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-4" dir={lang === "ar" ? "rtl" : "ltr"}>
          {activePage === "PRODUCT_DETAIL" ? (
            <div className="mx-auto w-full max-w-6xl space-y-6 text-right animate-fadeIn" dir="rtl">
              {/* Navigation Header */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h2 className="text-sm font-black font-arabic">
                      {lang === "ar" ? "تفاصيل الصنف الطبي الكلية وسجل الشحنات" : "Supply Product Details & Batches"}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-arabic mt-0.5">
                      {lang === "ar"
                        ? "استعراض وتعديل كود الصنف واسمه، أرصدة المخازن، والاطلاع على شحنات التوريد التفصيلية وتواريخ صلاحيتها لكل شحنة"
                        : "Review and edit core specs, current live balances, security limits, and delivery lot logs."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId(null);
                    setActivePage("ADMIN");
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs transition-colors font-arabic flex items-center justify-center gap-1.5 cursor-pointer border border-rose-650 shadow-sm self-start sm:self-auto"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{lang === "ar" ? "← العودة لبيانات المخزن" : "Back to Stock Area"}</span>
                </button>
              </div>

              {/* Stacked content: Core Specifications on top, Shipments table below */}
              <div className="flex flex-col gap-6 text-right">
                {/* Core Specifications Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-150 pb-3">
                    <h3 className="text-xs font-black text-slate-800 font-arabic flex items-center gap-1.5">
                      <span>✏️</span> {lang === "ar" ? "تعديل بيانات المواصفات الأساسية" : "Edit Basic Product Details"}
                    </h3>
                  </div>

                  <div className="space-y-3 text-right">
                    {/* Item ID */}
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-705 mb-1 font-arabic text-right">
                        كود الصنف الطبي (ID):
                      </label>
                      <input
                        type="text"
                        value={detailId}
                        onChange={(e) => setDetailId(e.target.value)}
                        className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white"
                        dir="ltr"
                      />
                    </div>

                    {/* Arabic Description */}
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-705 mb-1 font-arabic text-right">
                        الوصف بالعربية:
                      </label>
                      <input
                        type="text"
                        value={detailNameAr}
                        onChange={(e) => setDetailNameAr(e.target.value)}
                        className="w-full text-xs font-arabic p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-right font-bold"
                        dir="rtl"
                      />
                    </div>

                    {/* English Description */}
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-705 mb-1 font-arabic text-right">
                        الوصف بالإنجليزية:
                      </label>
                      <input
                        type="text"
                        value={detailNameEn}
                        onChange={(e) => setDetailNameEn(e.target.value)}
                        className="w-full text-xs font-sans p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-left font-bold"
                        dir="ltr"
                      />
                    </div>

                    {/* Categories Dropdown & Custom Fields */}
                    <div className="grid grid-cols-1 gap-3 text-right">
                      <div>
                        <label className="block text-[11px] font-black text-slate-705 mb-1.5 font-arabic text-right">
                          📁 {lang === "ar" ? "القسم / الفئة الطبية:" : "Department / Medical Category:"}
                        </label>
                        <select
                          value={isCustomCategoryInEdit ? "custom_category" : detailCategoryAr}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "custom_category") {
                              setIsCustomCategoryInEdit(true);
                              setDetailCategoryAr("");
                              setDetailCategoryEn("");
                            } else {
                              setIsCustomCategoryInEdit(false);
                              setDetailCategoryAr(val);
                              const matched = distinctCategories.find(c => c.ar === val);
                              if (matched) {
                                setDetailCategoryEn(matched.en);
                              }
                            }
                          }}
                          className="w-full text-xs font-arabic p-2.5 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-right font-bold text-slate-800"
                          dir="rtl"
                        >
                          <option value="">-- {lang === "ar" ? "اختر فئة من المجموعة" : "Choose a Category"} --</option>
                          {distinctCategories.map((cat) => (
                            <option key={cat.ar} value={cat.ar}>
                              {lang === "ar" ? `${cat.ar} (${cat.en})` : `${cat.en} (${cat.ar})`}
                            </option>
                          ))}
                          <option value="custom_category" className="bg-sky-50 text-sky-800 font-black">
                            ➕ {lang === "ar" ? "إنشاء قسم جديد..." : "Create new department..."}
                          </option>
                        </select>
                      </div>
                    </div>

                    {isCustomCategoryInEdit && (
                      <div className="grid grid-cols-2 gap-3 text-right p-3 bg-sky-50/30 border border-sky-100 rounded-lg animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-black text-slate-705 mb-1 font-arabic text-right">
                            القسم الجديد (عربي):
                          </label>
                          <input
                            type="text"
                            value={detailCategoryAr}
                            onChange={(e) => setDetailCategoryAr(e.target.value)}
                            className="w-full text-[11px] font-arabic p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-right"
                            placeholder="مثال: قسم الطوارئ"
                            dir="rtl"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-705 mb-1 font-arabic text-left">
                            New Category (EN):
                          </label>
                          <input
                            type="text"
                            value={detailCategoryEn}
                            onChange={(e) => setDetailCategoryEn(e.target.value)}
                            className="w-full text-[11px] font-sans p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-left"
                            placeholder="e.g. ER Department"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}

                    {/* Inventory metrics dual column */}
                    <div className="grid grid-cols-2 gap-3 text-right">
                      <div>
                        <label className="block text-[10px] font-black text-slate-705 mb-1 font-arabic text-right">
                          الرصيد المتاح الكلي:
                        </label>
                        <input
                          type="number"
                          value={detailStock}
                          onChange={(e) => setDetailStock(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-center font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-705 mb-1 font-arabic text-right">
                          السعر الافتراضي (جنيه):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={detailUnitPrice}
                          onChange={(e) => setDetailUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-center font-bold text-sky-700"
                        />
                      </div>
                    </div>

                    {/* Threshold & Expiry */}
                    <div className="grid grid-cols-2 gap-3 text-right">
                      <div>
                        <label className="block text-[10px] font-black text-slate-705 mb-1 font-arabic text-right">
                          حد الأمان (Threshold):
                        </label>
                        <input
                          type="number"
                          value={detailThreshold}
                          onChange={(e) => setDetailThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-center text-amber-700 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-705 mb-1 font-arabic text-right">
                          تاريخ الصلاحية الكلي:
                        </label>
                        <input
                          type="date"
                          value={detailExpiryDate}
                          onChange={(e) => setDetailExpiryDate(e.target.value)}
                          className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg outline-none focus:border-sky-500 bg-white text-center text-rose-700 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                    {!saveConfirm && !deleteConfirm ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveDetailedProduct(false)}
                          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-750 text-white rounded-xl font-bold font-arabic text-xs transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5 font-black"
                        >
                          <span>✓</span> {lang === "ar" ? "حفظ التعديلات والمواصفات" : "Save Specifications"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirm(true);
                            setSaveConfirm(false);
                          }}
                          className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-250 rounded-xl font-bold font-arabic text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 font-black"
                        >
                          <span>🗑️</span> {lang === "ar" ? "حذف الصنف نهائياً من المستودع" : "Permanently Delete Product"}
                        </button>
                      </>
                    ) : saveConfirm ? (
                      <div className="bg-emerald-50/70 border-2 border-emerald-500/50 rounded-2xl p-4 text-center space-y-3 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-xs font-black text-emerald-950 font-arabic leading-relaxed">
                          {lang === "ar"
                            ? "⚠️ هل أنت متأكد من رغبتك في حفظ تعديلات ومواصفات هذا الصنف؟"
                            : "⚠️ Are you sure you want to save the basic specifications for this product?"}
                        </p>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleSaveDetailedProduct(true)}
                            className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl font-arabic text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            {lang === "ar" ? "نعم" : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaveConfirm(false)}
                            className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl font-arabic text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            {lang === "ar" ? "إلغاء وتراجع" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50/70 border-2 border-rose-500/50 rounded-2xl p-4 text-center space-y-3 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-xs font-black text-rose-950 font-arabic leading-relaxed">
                          {lang === "ar"
                            ? "🚨 تحذير: هل أنت متأكد تماماً من رغبتك في حذف هذا الصنف بالكامل ونهائياً؟"
                            : "🚨 Warning: Are you sure you want to permanently delete this product and all its data?"}
                        </p>
                        <div className="flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedProductId) {
                                handleDeleteMasterItem(selectedProductId, true);
                                setSelectedProductId(null);
                                setActivePage("ADMIN");
                              }
                            }}
                            className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl font-arabic text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            {lang === "ar" ? "نعم" : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl font-arabic text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            {lang === "ar" ? "إلغاء وتراجع" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consignments and Batches Table (Placed below specifications form) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-150 pb-3">
                    <h3 className="text-xs font-black text-slate-800 font-arabic flex items-center gap-1.5">
                      <span>🚛</span> {lang === "ar" ? "بيانات الشحنات الطبية والدفعات الواردة لهذا الصنف" : "Incoming Shipments & Expiries"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-arabic mt-1 leading-snug">
                      {lang === "ar"
                        ? "استعراض جميع الشحنات والتوريدات المستلمة لهذا الصنف مع الرصيد المضاف وتواريخ الصلاحية."
                        : "Ledger of past medical batches, incoming stock consignments, and lot expiration dates."}
                    </p>
                  </div>

                  {(() => {
                    const matching = restockInvoices.filter((inv) =>
                      inv.items.some((it) => it.itemId === selectedProductId)
                    );

                    if (matching.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-450 font-arabic text-xs border border-dashed border-slate-200 rounded-xl">
                          {lang === "ar"
                            ? "📭 لا توجد شحنات توريد مسجلة حالياً لهذا الصنف."
                            : "📭 No registered supplier shipments found for this item."}
                        </div>
                      );
                    }

                    return (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-xs text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <th className="py-2.5 px-3 font-arabic text-right">{lang === "ar" ? "الفاتورة" : "Invoice No."}</th>
                              <th className="py-2.5 px-3 font-arabic text-right">{lang === "ar" ? "المورد" : "Supplier"}</th>
                              <th className="py-2.5 px-3 font-arabic text-center">{lang === "ar" ? "الكمية المضافة" : "Qty Added"}</th>
                              <th className="py-2.5 px-3 font-arabic text-center">{lang === "ar" ? "المسؤول" : "Officer"}</th>
                              <th className="py-2.5 px-3 font-arabic text-left">{lang === "ar" ? "التاريخ والصلاحية" : "Date & Expiry"}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {matching.map((invoice) => {
                              const itemLog = invoice.items.find((it) => it.itemId === selectedProductId);
                              if (!itemLog) return null;
                              return (
                                <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-slate-600 font-bold text-right">{invoice.id}</td>
                                  <td className="py-2.5 px-3 text-right text-slate-705 font-arabic font-extrabold">{invoice.supplier}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="inline-block px-1.5 py-0.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded font-bold font-mono text-[11px]">
                                      +{itemLog.quantityAdded}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-slate-500 font-arabic">{getUserName(invoice.officer, lang)}</td>
                                  <td className="py-2.5 px-3 text-left">
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-[10px] text-slate-600 font-mono">
                                        {new Date(invoice.timestamp).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                                      </span>
                                      {itemLog.expiryDate ? (
                                        <span className="inline-block bg-amber-50 border border-amber-200 text-amber-800 rounded px-1.5 py-0.2 text-[9px] font-bold font-mono">
                                          📅 {itemLog.expiryDate}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-slate-400 font-arabic italic">{lang === "ar" ? "بدون صلاحية" : "No expiry"}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : activePage === "ADD_PRODUCT" ? (
            <div className="max-w-xl mx-auto w-full bg-white border border-slate-205 rounded-2xl shadow-sm p-6 text-right animate-fadeIn overflow-hidden" dir="rtl">
              {/* Browser-style Tab Bar */}
              <div className="flex items-end bg-slate-100/90 px-2 pt-2 border border-slate-200 rounded-t-2.2xl -mx-6 -mt-6 mb-6">
                <button
                  type="button"
                  onClick={() => setAddItemTab("PRODUCT")}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-black font-arabic transition-all select-none cursor-pointer rounded-t-xl border-t border-x ${
                    addItemTab === "PRODUCT"
                      ? "bg-white border-slate-200 text-slate-800 translate-y-[1px] shadow-xs z-10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  <span className="text-emerald-600">💊</span>
                  <span>{lang === "ar" ? "إضافة دواء / صنف جديد" : "Add Medicine / Product"}</span>
                  {addItemTab === "PRODUCT" && <span className="text-[9px] text-slate-400 ml-1">×</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemTab("CATEGORY")}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-black font-arabic transition-all select-none cursor-pointer rounded-t-xl border-t border-x ${
                    addItemTab === "CATEGORY"
                      ? "bg-white border-slate-200 text-slate-800 translate-y-[1px] shadow-xs z-10 font-bold"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  <span className="text-hospital-blue">📁</span>
                  <span>{lang === "ar" ? "إنشاء فئة طبية مستقلة" : "Create New Category"}</span>
                  {addItemTab === "CATEGORY" && <span className="text-[9px] text-slate-400 ml-1">×</span>}
                </button>
              </div>

              {/* Title Section based on Active Tab */}
              <div className="flex items-center justify-between border-b border-slate-150 pb-4 mb-5">
                <button
                  type="button"
                  onClick={() => setActivePage("RESTOCK")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors font-arabic flex items-center gap-1.5 cursor-pointer border border-slate-200"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "رجوع إلى التوريد" : "Back to Restock"}</span>
                </button>
                <div className="text-right">
                  <h3 className="text-sm md:text-base font-black text-slate-800 font-arabic flex items-center justify-end gap-1.5">
                    {addItemTab === "PRODUCT" ? (
                      <>
                        <span>💊</span> {lang === "ar" ? "إضافة صنف طبي جديد" : "Add New Medical Item"}
                      </>
                    ) : (
                      <>
                        <span>📁</span> {lang === "ar" ? "إضافة فئة طبية مستقلة" : "Add Standalone Category"}
                      </>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-arabic mt-0.5">
                    {addItemTab === "PRODUCT"
                      ? (lang === "ar" ? "تسجيل صنف طبي جديد لتوسيع قاعدة المستلزمات" : "Create a new medical supply sequence")
                      : (lang === "ar" ? "إنشاء فئة طبية جديدة لتصنيف الأدوية والمستلزمات بداخلها" : "Create a standalone category without items")}
                  </p>
                </div>
              </div>

              {addItemTab === "PRODUCT" ? (
                /* Form Component for Products */
                <form onSubmit={handleAddNewItem} className="space-y-4">
                  {/* ID input */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic">
                      🔑 {lang === "ar" ? "كود الصنف الطبي (ID تلقائي مميز):" : "Medical Item Code (Auto ID):"}
                    </label>
                    <input
                      type="text"
                      value={generateNextMedId(inventory)}
                      disabled
                      className="w-full px-3 py-2 text-xs md:text-sm bg-slate-100 border border-slate-200 rounded-lg outline-none text-right font-sans text-slate-500 cursor-not-allowed font-semibold"
                    />
                    <p className="text-[9.5px] text-emerald-600 font-extrabold mt-1 font-arabic animate-pulse">
                      {lang === "ar" ? `* تم قفل تعديل الكود يدوياً لضمان التسلسل التلقائي السليم (سيبدأ من ${generateNextMedId(inventory)}).` : `* Manual editing is locked to ensure automatic sequential numbering (starts from ${generateNextMedId(inventory)}).`}
                    </p>
                  </div>

                  {/* Name validation inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic">
                        🏷️ {lang === "ar" ? "الاسم العربي للطبية:" : "Arabic Name:"}
                      </label>
                      <input
                        type="text"
                        value={newItemNameAr}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Block English alphabetical letters [a-zA-Z]
                          const sanitized = val.replace(/[a-zA-Z]/g, "");
                          setNewItemNameAr(sanitized);
                        }}
                        placeholder="مثال: سرنجة أنسولين معقمة"
                        className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none text-right font-arabic focus:border-emerald-500 transition-all focus:bg-white placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic text-left animate-fadeIn" dir="ltr">
                        🏷️ {lang === "ar" ? "الاسم الإنجليزي للطبية:" : "English Name:"}
                      </label>
                      <input
                        type="text"
                        value={newItemNameEn}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Block Arabic Unicode script ranges
                          const sanitized = val.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "");
                          setNewItemNameEn(sanitized);
                        }}
                        placeholder="e.g. Sterile Insulin Syringe"
                        className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none text-left font-sans focus:border-emerald-500 transition-all focus:bg-white placeholder-slate-400"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Category Radio selection: existing vs new category */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2 font-arabic">
                      📁 {lang === "ar" ? "نوع الفئة الطبية:" : "Category Specification:"}
                    </label>
                    <div className="flex gap-4 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold font-arabic">
                        <input
                          type="radio"
                          checked={newItemCategoryType === "existing"}
                          onChange={() => setNewItemCategoryType("existing")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{lang === "ar" ? "اختيار فئة حالية" : "Select Existing Category"}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold font-arabic">
                        <input
                          type="radio"
                          checked={newItemCategoryType === "new"}
                          onChange={() => setNewItemCategoryType("new")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{lang === "ar" ? "إنشاء فئة جديدة +" : "Create New Category +"}</span>
                      </label>
                    </div>
                  </div>

                  {/* Category selectors depend on type */}
                  {newItemCategoryType === "existing" ? (
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic">
                        📂 {lang === "ar" ? "حدد الفئة الطبية الحالية:" : "Select Existing Category List:"}
                      </label>
                      <select
                        value={newItemCategoryAr}
                        onChange={(e) => setNewItemCategoryAr(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-arabic focus:border-emerald-500 transition-all text-slate-800"
                      >
                        <option value="">-- {lang === "ar" ? "اختر فئة من المجموعة" : "Choose a Category"} --</option>
                        {distinctCategories.map((cat) => (
                          <option key={cat.ar} value={cat.ar}>
                            {lang === "ar" ? `${cat.ar} (${cat.en})` : `${cat.en} (${cat.ar})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-200 p-3 rounded-lg bg-emerald-50/20 animate-fadeIn">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic">
                          📁 {lang === "ar" ? "اسم الفئة الجديدة (بالعربية):" : "New Category (Arabic):"}
                        </label>
                        <input
                          type="text"
                          value={newItemCategoryAr}
                          onChange={(e) => setNewItemCategoryAr(e.target.value)}
                          placeholder="مثال: فحص طبي وتحاليل طارئة"
                          className="w-full px-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-lg outline-none text-right font-arabic focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-755 mb-1.5 font-arabic text-left" dir="ltr">
                          📁 {lang === "ar" ? "اسم الفئة الجديدة (بالإنجليزية):" : "New Category (English):"}
                        </label>
                        <input
                          type="text"
                          value={newItemCategoryEn}
                          onChange={(e) => setNewItemCategoryEn(e.target.value)}
                          placeholder="e.g. Clinical Diagnostics"
                          className="w-full px-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-lg outline-none text-left font-sans focus:border-emerald-500"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {/* Price and Stock Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-707 mb-1.5 font-arabic">
                        💵 {lang === "ar" ? "سعر الوحدة بالجنيه المصري (EGP):" : "Unit Tariff Price (EGP):"}{" "}
                        {newItemUnitPrice && (
                          <span className="text-emerald-600 font-extrabold font-arabic">({newItemUnitPrice} ج م)</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={newItemUnitPrice}
                          onChange={(e) => setNewItemUnitPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-12 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none text-right font-mono focus:border-emerald-500 transition-all focus:bg-white placeholder-slate-400"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400 pointer-events-none font-arabic">
                          ج م
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-707 mb-1.5 font-arabic">
                        📦 {lang === "ar" ? "الرصيد الابتدائي المتوفر بالمستودع:" : "Initial Physical Stock Level:"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newItemInitialStock}
                        onChange={(e) => setNewItemInitialStock(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none text-right font-mono focus:border-emerald-500 transition-all focus:bg-white placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Submit items */}
                  <div className="pt-4 flex gap-3 border-t border-slate-150">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{lang === "ar" ? "تأكيد وإضافة الصنف" : "Add Medical Item to Live Stock"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewItemId("");
                        setNewItemNameAr("");
                        setNewItemNameEn("");
                        setNewItemCategoryAr("");
                        setNewItemCategoryEn("");
                        setNewItemUnitPrice("");
                        setNewItemInitialStock("0");
                        setActivePage("RESTOCK");
                      }}
                      className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-705 text-xs font-bold font-arabic transition-all cursor-pointer active:scale-98"
                    >
                      {lang === "ar" ? "إلغاء التراجع" : "Cancel"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Standalone Category Creation Form */
                <form onSubmit={handleAddNewCategory} className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-50/20 border border-emerald-100 p-3 rounded-lg">
                    <p className="text-[11px] text-slate-500 font-arabic leading-relaxed">
                      {lang === "ar" 
                        ? "💡 تتيح لك هذه الصفحة إنشاء فئة مستقلة في المنظومة مباشرة دون دواء. ستظهر هذه الفئة فوراً في جميع القوائم المنسدلة بالفواتير."
                        : "💡 This panel allows creating standalone medical groups or classifications. Once registered, they appear immediately across billing select options."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic">
                      📁 {lang === "ar" ? "اسم الفئة الطبية الجديدة بالعربية:" : "New Category (Arabic):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCatNameAr}
                      onChange={(e) => setNewCatNameAr(e.target.value)}
                      placeholder="مثال: مستهلكات جراحية دقيقة"
                      className="w-full px-3 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-205 rounded-lg outline-none text-right font-arabic focus:border-emerald-500 focus:bg-white transition-all placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5 font-arabic text-left animate-fadeIn" dir="ltr">
                      📁 {lang === "ar" ? "اسم الفئة الطبية الجديدة بالإنجليزية:" : "New Category (English):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newCatNameEn}
                      onChange={(e) => setNewCatNameEn(e.target.value)}
                      placeholder="e.g. Fine Surgical Items"
                      className="w-full px-3 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-205 rounded-lg outline-none text-left font-sans focus:border-emerald-500 focus:bg-white transition-all placeholder-slate-400"
                      dir="ltr"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-150">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{lang === "ar" ? "تأكيد إضافة الفئة الطبية" : "Confirm & Create Category"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatNameAr("");
                        setNewCatNameEn("");
                        setAddItemTab("PRODUCT");
                      }}
                      className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-705 text-xs font-bold font-arabic transition-all cursor-pointer active:scale-98"
                    >
                      {lang === "ar" ? "إلغاء الفئة" : "Cancel"}
                    </button>
                  </div>

                  {/* Visual list of currently loaded categories */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 mt-4">
                    <h4 className="text-xs font-black text-slate-700 font-arabic mb-2 flex items-center gap-1">
                      <span>📂</span> {lang === "ar" ? "الفئات المسجلة حالياً:" : "Currently Registered Groups:"}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {distinctCategories.map((cat, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-arabic text-slate-700">
                          <span className="font-extrabold">{lang === "ar" ? cat.ar : cat.en}</span>
                          <span className="text-slate-400"> ({lang === "ar" ? cat.en : cat.ar})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : activePage === "RESTOCK_DETAIL" ? (
            <div id="printable-restock-invoice" className="mx-auto w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 text-right animate-fadeIn" dir="rtl">
              {/* Back Button */}
              <div className="flex justify-start print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRestockInvoice(null);
                    setActivePage("RESTOCK");
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition-colors font-arabic flex items-center gap-1.5 cursor-pointer shadow-3xs"
                >
                  <span>{lang === "ar" ? "العودة لكشف التوريد" : "Back to Restock Registry"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Page Title */}
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-arabic flex items-center gap-2 justify-start">
                  <span>📄</span> {lang === "ar" ? "تفاصيل فاتورة الاستلام والتوريد" : "Restock Invoice Specification Sheet"}
                </h3>
              </div>

              <hr className="border-slate-200 my-2" />

              {selectedRestockInvoice ? (
                <div className="space-y-4">
                  {/* Meta Information Box */}
                  <div className="border border-slate-800 rounded-2xl p-4 bg-white grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-arabic items-center">
                    <div>
                      <span className="text-xs font-bold text-slate-800 mb-1 block">{lang === "ar" ? "رقم الفاتورة" : "Invoice No."}</span>
                      <span className="font-mono font-extrabold text-sm text-slate-900 select-all">{selectedRestockInvoice.id}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 mb-1 block">{lang === "ar" ? "المورد / شركة التوريد" : "Supplier Agency"}</span>
                      <span className="font-arabic font-extrabold text-sm text-slate-900">{selectedRestockInvoice.supplier || "جهة توريد غير مصنفة"}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 mb-1 block">{lang === "ar" ? "المسؤول المستلم" : "Receiver Officer"}</span>
                      <span className="font-arabic font-extrabold text-sm text-slate-900">{getUserName(selectedRestockInvoice.officer, lang, operators)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 mb-1 block">{lang === "ar" ? "تاريخ ووقت الاستلام" : "Registration Date"}</span>
                      <span className="font-mono font-extrabold text-sm text-slate-900 block" dir="ltr">
                        {new Date(selectedRestockInvoice.timestamp).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                        {new Date(selectedRestockInvoice.timestamp).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Comments/Notes if available */}
                  {selectedRestockInvoice.notes && (
                    <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-right">
                      <p className="text-xs text-slate-700 font-arabic font-bold">📝 {lang === "ar" ? "ملاحظات وتوجيهات الشحنة:" : "Batch Comments / Handover Notes:"}</p>
                      <p className="text-xs text-slate-800 font-arabic mt-1 leading-relaxed">{selectedRestockInvoice.notes}</p>
                    </div>
                  )}

                  {/* Table of items */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white my-4">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-800 font-black border-b border-slate-200">
                          <th className="py-3.5 px-4 font-arabic text-right">{lang === "ar" ? "كود الصنف" : "Item ID"}</th>
                          <th className="py-3.5 px-4 font-arabic text-right">{lang === "ar" ? "الوصف التفصيلي للصنف" : "Product Specification"}</th>
                          <th className="py-3.5 px-4 font-arabic text-center">{lang === "ar" ? "الفئة" : "Category"}</th>
                          <th className="py-3.5 px-4 font-arabic text-center">{lang === "ar" ? "الكمية الواردة" : "Qty Supplied"}</th>
                          <th className="py-3.5 px-4 font-arabic text-right">{lang === "ar" ? "تاريخ الصلاحية" : "Expiry Date"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRestockInvoice.items.map((item) => (
                          <tr key={item.itemId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-xs text-right select-all">{item.itemId}</td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-extrabold text-slate-900 font-arabic text-xs sm:text-sm block">
                                {lang === "ar" ? item.itemNameAr : item.itemNameEn}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-lg font-arabic text-xs font-bold">
                                {lang === "ar" ? item.categoryAr : item.categoryEn}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 bg-white border border-emerald-600 text-emerald-700 rounded-lg font-black font-mono text-xs" dir="ltr">
                                {item.quantityAdded}+
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {item.expiryDate ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2.5 py-1 text-xs font-black font-mono">
                                  📅 {item.expiryDate.replace(/-/g, "/")}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-arabic text-xs italic">{lang === "ar" ? "مستلزم لا يتطلب صلاحية" : "No expiry requirement"}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <hr className="border-slate-200 my-4" />

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center gap-3 justify-start print:hidden">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="py-2.5 px-5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer font-arabic flex items-center gap-2 shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{lang === "ar" ? "طباعة محضر التوريد" : "Print Handover Report"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRestockInvoice(null);
                        setActivePage("RESTOCK");
                      }}
                      className="py-2.5 px-5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-800 font-extrabold rounded-xl text-xs transition-all cursor-pointer font-arabic"
                    >
                      {lang === "ar" ? "إغلاق التفاصيل" : "Close Details"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-arabic">
                  {lang === "ar" ? "عفواً، لم يتم العثور على الفاتورة المحددة." : "No invoice data retrieved."}
                </div>
              )}
            </div>
          ) : activePage !== "ADMIN" &&
          activePage !== "OPERATORS" &&
          activePage !== "RESTOCK" ? (
            activePage === "DETAIL" ? (
              (() => {
                const idx = selectedDetailInvoiceIndex;
                const invoice = idx !== null ? history[idx] : null;
                if (!invoice) {
                  return (
                    <div className="bg-white rounded-lg p-8 text-center text-slate-400 border border-slate-200">
                      <p className="font-arabic">
                        {lang === "ar"
                          ? "نأسف، لم نجد الفاتورة المطلوبة."
                          : "Required receipt record not found."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailInvoiceIndex(null);
                          setActivePage("ARCHIVE");
                        }}
                        className="mt-4 bg-hospital-blue hover:bg-sky-750 text-white font-bold px-4 py-2 rounded text-xs cursor-pointer shadow-xs font-arabic"
                      >
                        {lang === "ar" ? "العودة للأرشيف" : "Back to Archive"}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="max-w-4xl mx-auto flex flex-col gap-6 w-full animate-fadeIn pb-12">
                    {/* Control actions header bar */}
                    <div className="bg-white border border-slate-250 p-4 rounded-xl shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetailInvoiceIndex(null);
                          setActivePage("ARCHIVE");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold px-4 py-2 rounded-lg text-xs transition-colors font-arabic flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 animate-pulse" />
                        {lang === "ar"
                          ? "العودة لبوابة الأرشيف"
                          : "Back to Registry"}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Edit Action */}
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenInPlaceInvoiceEditor(idx);
                          }}
                          className="bg-sky-50 text-hospital-blue hover:bg-hospital-blue hover:text-white border border-sky-200 font-bold px-4 py-2 rounded-lg text-xs transition-all font-arabic flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-xs"
                          title={
                            lang === "ar"
                              ? "تحميل الفاتورة وتعديلها"
                              : "Edit / Reload this receipt"
                          }
                        >
                          <Edit className="w-3.5 h-3.5" />
                          {lang === "ar"
                            ? "تعديل الفاتورة"
                            : "Edit Patient Receipt"}
                        </button>

                        {/* Print Action */}
                        <button
                          type="button"
                          onClick={() => {
                            handlePrintFromHistory(idx);
                          }}
                          className="bg-emerald-605 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-250 font-bold px-4 py-2 rounded-lg text-xs transition-all font-arabic flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-xs"
                          title={
                            lang === "ar"
                              ? "طباعة الفاتورة للعميل"
                              : "Print thermal slip"
                          }
                        >
                          <Printer className="w-3.5 h-3.5" />
                          {lang === "ar"
                            ? "طباعة الإيصال (PDF)"
                            : "Print Receipt Layout"}
                        </button>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                lang === "ar"
                                  ? "هل أنت متأكد من حذف هذا السجل نهائياً؟"
                                  : "Are you sure you want to delete this invoice permanently?",
                              )
                            ) {
                              handleDeleteFromHistory(idx);
                              setSelectedDetailInvoiceIndex(null);
                              setActivePage("ARCHIVE");
                            }
                          }}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 font-bold px-4 py-2 rounded-lg text-xs transition-all font-arabic flex items-center gap-1.5 cursor-pointer"
                          title={lang === "ar" ? "حذف نهائي" : "Delete record"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {lang === "ar" ? "حذف نهائي" : "Delete Record"}
                        </button>
                      </div>
                    </div>

                    {/* Detailed Receipt Record Card (mimicking letterhead format) */}
                    <div className="bg-white border border-slate-300 p-8 rounded-xl shadow-md font-sans text-slate-800">
                      {/* Letterhead */}
                      <div
                        className="grid grid-cols-3 items-center border-b-2 border-slate-800 pb-4 mb-6"
                        dir="ltr"
                      >
                        {/* Left visually: English details */}
                        <div className="text-left font-sans">
                          <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight leading-tight">
                            EL-SALAM HOSPITAL
                          </h2>
                          <p className="text-[10px] md:text-[11px] font-bold text-slate-505 mt-1">
                            76 Ahmed Esmat , Ain Shams
                          </p>
                        </div>

                        {/* Center visually: Hospital Logo */}
                        <div className="flex justify-center">
                          <HospitalLogo className="w-14 h-14 md:w-16 md:h-16 shrink-0 aspect-square" />
                        </div>

                        {/* Right visually: Arabic details */}
                        <div className="text-right">
                          <h2 className="text-sm md:text-base font-black text-slate-900 font-arabic leading-tight">
                            مستشفى السلام
                          </h2>
                          <p className="text-[10px] md:text-[11px] font-bold text-slate-505 mt-1">
                            ٧٦ احمد عصمت عين شمس
                          </p>
                        </div>
                      </div>

                      {/* Record Title */}
                      <div className="text-center my-6">
                        <span className="bg-slate-100 text-slate-905 px-6 py-2 rounded-lg font-black text-sm uppercase border border-slate-300 font-arabic">
                          {lang === "ar"
                            ? "كشف تجميعي بمستلزمات المريض"
                            : "Emergency Patient Supplies Statement"}
                        </span>
                      </div>

                      {/* Patient and Session Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <span className="text-slate-400 font-bold font-arabic whitespace-nowrap">
                              {lang === "ar"
                                ? "اسم الحضور / المريض:"
                                : "Patient Name:"}
                            </span>
                            <span className="font-bold text-slate-800 font-arabic text-sm">
                              {invoice.patient_name}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-slate-400 font-bold font-arabic whitespace-nowrap">
                              {lang === "ar"
                                ? "رقم المرجع للفاتورة:"
                                : "Voucher Ref No:"}
                            </span>
                            <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                              {invoice.receipt_number}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2 font-arabic font-bold text-slate-705">
                            <span className="text-slate-400 font-bold whitespace-nowrap">
                              {lang === "ar"
                                ? "تاريخ ووقت المعاملة:"
                                : "Intake Timestamp:"}
                            </span>
                            <span className="font-bold text-slate-700">
                              {new Date(invoice.created_at).toLocaleDateString(
                                lang === "ar" ? "ar-EG" : "en-US",
                              )}{" "}
                              —{" "}
                              {new Date(invoice.created_at).toLocaleTimeString(
                                lang === "ar" ? "ar-EG" : "en-US",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                          <div className="flex gap-2 font-arabic font-bold text-slate-705">
                            <span className="text-slate-400 font-bold whitespace-nowrap">
                              {lang === "ar"
                                ? "منفذ الصرف المالي:"
                                : "Billing Officer:"}
                            </span>
                            <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {getUserName(invoice.billing_officer_email, lang, operators)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Services & Supplies Table */}
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-right border-collapse text-xs border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-slate-805 font-bold border-b border-slate-300 font-arabic">
                              <th className="py-2.5 px-3 text-right border-r border-slate-300 w-10">
                                #
                              </th>
                              <th className="py-2.5 px-3 text-right border-r border-slate-300">
                                {lang === "ar"
                                  ? "المستلزم الطبي المستهلك"
                                  : "Medical Item / Supply"}
                              </th>
                              <th className="py-2.5 px-3 text-center border-r border-slate-300">
                                {lang === "ar" ? "سعر الوحدة" : "Unit Price"}
                              </th>
                              <th className="py-2.5 px-3 text-center border-r border-slate-300 w-16">
                                {lang === "ar" ? "الكمية" : "Qty"}
                              </th>
                              <th className="py-2.5 px-3 text-left">
                                {lang === "ar"
                                  ? "القيمة الإجمالية"
                                  : "Total Price"}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {invoice.invoice_lines.map((line, index) => (
                              <tr
                                key={`${line.item_id}-${index}`}
                                className="text-slate-800 hover:bg-slate-50/50"
                              >
                                <td className="py-2 px-3 text-right border-r border-slate-200 font-mono">
                                  {index + 1}
                                </td>
                                <td className="py-2 px-3 text-right border-r border-slate-200 font-arabic font-bold">
                                  {lang === "ar"
                                    ? line.item_name_ar
                                    : line.item_name_en}
                                </td>
                                <td className="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-slate-700">
                                  {formatCurrency(line.unit_price, lang)}
                                </td>
                                <td className="py-2 px-3 text-center border-r border-slate-200 font-bold font-mono">
                                  {formatArabicDigits(line.quantity, lang)}
                                </td>
                                <td className="py-2 px-3 text-left font-bold font-mono text-slate-900 font-sans">
                                  {formatCurrency(line.line_total, lang)}
                                </td>
                              </tr>
                            ))}
                            {/* Grand Total Row */}
                            <tr className="bg-slate-50/90 font-black border-t-2 border-slate-400">
                              <td
                                colSpan={3}
                                className="py-3 px-3 text-right border-r border-slate-300 font-arabic text-xs"
                              >
                                {lang === "ar"
                                  ? "إجمالي كلفة المستلزمات (الصافي):"
                                  : "Voucher Total Cost (EGP):"}
                              </td>
                              <td className="py-3 px-3 text-center border-r border-slate-300 font-mono text-xs">
                                {formatArabicDigits(
                                  invoice.invoice_lines.reduce(
                                    (acc, l) => acc + l.quantity,
                                    0,
                                  ),
                                  lang,
                                )}
                              </td>
                              <td className="py-3 px-3 text-left font-mono text-emerald-700 text-xs text-slate-900 shadow-3xs">
                                {formatCurrency(invoice.grand_total, lang)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Written Currency */}
                      <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50 mb-6 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-arabic">
                            {lang === "ar" ? "فقط وقدره:" : "Written Amount:"}
                          </span>
                          <span className="font-bold text-slate-800 font-arabic italic">
                            "
                            {translateNumberToCurrencyWords(
                              invoice.grand_total,
                              lang,
                            )}
                            "
                          </span>
                        </div>
                        <div className="hidden">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-arabic">
                            {lang === "ar" ? "قيد الترحيل:" : "Ledger Status:"}
                          </span>
                          <span className="font-black text-emerald-600 font-arabic flex items-center justify-end gap-1 font-bold">
                            ●{" "}
                            {lang === "ar"
                              ? "مرحل ومقيد بالخزينة ومخصوم من المخزون"
                              : "Committed & Synchronized with Stock Registry"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : activePage === "ENTRANCE" ? (
              // ----------------------------------------------------
              // RECEPTION ROLE DESK PANEL VIEW (DIRECT SPLIT SCREEN)
              // ----------------------------------------------------
              <div className="max-w-4xl mx-auto flex flex-col gap-5 w-full items-stretch animate-fadeIn">
                {/* Multiple Invoice Sessions / "Kasema" Tabs */}
                <div className="bg-white rounded border border-slate-200 p-2.5 shadow-3xs flex flex-col gap-2 print:hidden -mb-1">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-hospital-blue animate-pulse" />
                      <h3 className="text-xs font-bold text-slate-800 font-arabic">
                        {lang === "ar"
                          ? "إدارة الفواتير النشطة"
                          : "Active Invoices Management"}
                      </h3>
                    </div>
                    <span className="text-[10px] bg-sky-50 text-hospital-blue font-bold px-2 py-0.5 rounded border border-sky-100 font-arabic select-none">
                      {sessions.length}{" "}
                      {lang === "ar" ? "فواتير مفتوحة" : "Active desk sessions"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                    {sessions.map((sess, idx) => {
                      const isActive = sess.id === activeSessionId;
                      return (
                        <div
                          key={sess.id}
                          onClick={() => handleSwitchSession(sess.id)}
                          className={`flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap select-none text-xs font-bold ${
                            isActive
                              ? "bg-hospital-blue text-white border-hospital-blue shadow-xs animate-fadeIn"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/75"
                          }`}
                        >
                          <span
                            className={`font-mono text-[10px] ${isActive ? "text-sky-200" : "text-slate-400"}`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-arabic max-w-[125px] truncate">
                            {sess.patientName.trim()
                              ? sess.patientName
                              : lang === "ar"
                                ? "فاتورة جديدة فارغة"
                                : "Unassigned Receipt"}
                          </span>
                          {sess.invoiceLines.length > 0 && (
                            <span
                              className={`px-1.5 py-0.5 text-[9px] rounded-full font-bold font-mono ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {sess.invoiceLines.length}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleCloseSession(sess.id, e)}
                            className={`rounded-full p-1.5 transition-all ml-1.5 cursor-pointer shrink-0 border flex items-center justify-center ${
                              isActive
                                ? "bg-white/10 hover:bg-white/25 text-white border-transparent"
                                : "bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 border-slate-200"
                            }`}
                            title={
                              lang === "ar" ? "إغلاق هذه الفاتورة" : "Close tab"
                            }
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add new tab action button */}
                    <button
                      type="button"
                      onClick={handleNewSession}
                      className="bg-slate-50 hover:bg-slate-100/80 text-hospital-blue border border-dashed border-slate-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer text-xs font-bold font-arabic"
                    >
                      <Plus className="w-3.5 h-3.5 animate-pulse" />
                      <span>
                        {lang === "ar" ? "فاتورة جديدة +" : "New Tab +"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Entry & Catalog & Active Items Form */}
                <div className="flex flex-col gap-4 w-full">
                  {/* Patient Metadata Invoice Entry Section */}
                  <div className="bg-white rounded border border-slate-250 p-4 md:p-5 shadow-3xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-hospital-blue" />

                    <div className="flex items-center justify-between mb-3.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4.5 h-4.5 text-hospital-blue" />
                        <h2 className="text-sm font-bold text-slate-800 font-arabic">
                          {lang === "ar"
                            ? "بيانات المريض"
                            : "Primary Patient Details"}
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Patient Legal Info */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-650 mb-1 font-arabic">
                          {lang === "ar"
                            ? "اسم المريض بالكامل"
                            : "Patient Full Name"}
                          <span className="text-red-500 mr-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder={
                            lang === "ar"
                              ? "مثال: ممدوح عبدالمجيد السيد"
                              : "E.g., Mamdouh Abdel-Sabour"
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded focus:border-hospital-blue focus:ring-1 focus:ring-hospital-blue/10 outline-none text-slate-800 transition-all font-arabic font-medium"
                        />
                      </div>

                      {/* Receipt ID manually input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-650 mb-1 font-arabic">
                          {lang === "ar"
                            ? "رقم الإيصال اليدوي"
                            : "Manual Receipt Number"}
                          <span className="text-red-500 mr-0.5">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={receiptNumber}
                            onChange={(e) => handleReceiptNumberChange(e.target.value)}
                            placeholder={
                              lang === "ar"
                                ? "مثال: ER-948"
                                : "E.g., RC-501"
                            }
                            className={`w-full py-1.5 text-xs border border-slate-200 rounded focus:border-hospital-blue focus:ring-1 focus:ring-hospital-blue/10 outline-none text-slate-800 transition-all font-medium ${
                              lang === "ar" ? "pr-2.5 pl-10" : "pl-2.5 pr-12"
                            }`}
                          />
                          <span
                             className={`absolute inset-y-0 flex items-center pointer-events-none text-[9px] font-mono text-slate-400 ${
                              lang === "ar" ? "left-0 pl-2.5" : "right-0 pr-2.5"
                            }`}
                          >
                            {lang === "ar" ? "إلزامي" : "Required"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Smart Inventory Selection Drawer / Grid Tab */}
                  <div className="bg-white rounded border border-slate-300 p-4 shadow-3xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4.5 h-4.5 text-hospital-blue" />
                        <h2 className="text-xs font-bold text-slate-800 font-arabic">
                          {lang === "ar"
                            ? "المواد والمستلزمات الطبية"
                            : "Medical Materials & Supplies"}
                        </h2>
                      </div>

                      {/* Search string */}
                      <div className="relative max-w-xs w-full">
                        <span
                          className={`absolute inset-y-0 flex items-center text-slate-400 pointer-events-none ${
                            lang === "ar" ? "left-2.5" : "right-2.5"
                          }`}
                        >
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={
                            lang === "ar"
                              ? "ابحث بالاسم أو الكود..."
                              : "Search catalog items..."
                          }
                          className="w-full pl-8 pr-8 py-1 text-xs border border-slate-200 rounded focus:border-hospital-blue outline-none transition-all font-arabic"
                        />
                      </div>
                    </div>

                    {/* Category Slider Tabs */}
                    <div className="relative flex items-center mb-3.5 border-b border-slate-100 group">
                      <button
                        type="button"
                        onClick={() => handleScrollCategories("left")}
                        className="absolute left-0 z-10 p-1 bg-white/95 border border-slate-200 rounded shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer text-slate-500 shrink-0"
                        title="Scroll Left"
                      >
                        <span className="text-[9px] font-bold block leading-none w-2.5 h-2.5 flex items-center justify-center">
                          ◀
                        </span>
                      </button>

                      <div
                        ref={categoryTabRef}
                        style={{
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                        className="flex items-center gap-1.5 overflow-x-auto pb-1.5 px-6 scrollbar-none w-full scroll-smooth"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveCategory("ALL")}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer font-arabic ${
                            activeCategory === "ALL"
                              ? "bg-slate-800 text-white shadow-xs"
                              : "bg-slate-100 text-slate-650 hover:bg-slate-200/70"
                          }`}
                        >
                          {lang === "ar" ? "الكل" : "All Categories"}
                        </button>
                        {categoriesList.map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer font-arabic ${
                              activeCategory === cat
                                ? "bg-hospital-blue text-white shadow-xs"
                                : "bg-slate-100 text-slate-650 hover:bg-slate-200/70"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleScrollCategories("right")}
                        className="absolute right-0 z-10 p-1 bg-white/95 border border-slate-200 rounded shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer text-slate-500 shrink-0"
                        title="Scroll Right"
                      >
                        <span className="text-[9px] font-bold block leading-none w-2.5 h-2.5 flex items-center justify-center">
                          ▶
                        </span>
                      </button>
                    </div>

                    {/* Grid of Medical supply cards with dynamic Stock status and vertical slider navigation */}
                    <div className="flex gap-2 items-stretch relative">
                      <div
                        ref={productsContainerRef}
                        className="max-h-[230px] sm:max-h-[190px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1 flex-1 scroll-smooth"
                        style={{
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                      >
                        {filteredInventoryItems.map((item) => {
                          const isLowStock = item.stock <= 10;
                          const isOut = item.stock <= 0;
                          const lineItem = invoiceLines.find(
                            (l) => l.item_id === item.id,
                          );
                          const selectedQty = lineItem ? lineItem.quantity : 0;
                          return (
                            <div
                              key={item.id}
                              onClick={isOut ? undefined : () => handleAddItem(item)}
                              className={`group border rounded-xl p-2 sm:p-2.5 text-right transition-all flex flex-row items-center justify-between gap-2 sm:gap-3 relative shadow-3xs ${
                                isOut
                                  ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                                  : "cursor-pointer"
                              } ${
                                selectedQty > 0
                                  ? "border-sky-450 bg-sky-50/15"
                                  : isOut
                                    ? ""
                                    : "border-slate-150 bg-white hover:bg-sky-50/20 hover:border-sky-305 hover:shadow-2xs"
                              }`}
                            >
                              {/* Left Side: Plus Icon and green Price tag */}
                              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 select-none">
                                <span
                                  className={`p-1 sm:p-1.5 rounded-lg transition-colors border shadow-3xs flex items-center justify-center ${
                                    selectedQty > 0
                                      ? "bg-sky-600 border-sky-600 text-white"
                                      : "bg-slate-50 border-slate-150 text-slate-400 group-hover:bg-hospital-blue group-hover:text-white group-hover:border-hospital-blue"
                                  }`}
                                >
                                  <Plus className="w-3 h-3 shrink-0" />
                                </span>

                                <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-bold text-[10px] sm:text-[11px] font-mono tracking-tight whitespace-nowrap shadow-3xs flex items-center justify-center">
                                  {formatCurrency(item.unit_price, lang)}
                                </span>
                              </div>

                              {/* Right Side: Title text on top, details row on bottom */}
                              <div className="min-w-0 flex-1 text-right flex flex-col items-end">
                                {/* Title row */}
                                <div className="flex items-center gap-1 justify-end w-full mb-0.5">
                                  {selectedQty > 0 && (
                                    <span className="px-1.5 py-0.5 bg-[#f43f5e] text-white font-mono text-[8.5px] sm:text-[9px] font-black rounded-md shadow-3xs animate-scaleIn select-none shrink-0">
                                      x{selectedQty}
                                    </span>
                                  )}
                                  <p className="text-[11px] sm:text-xs font-bold text-slate-800 font-arabic text-right leading-tight truncate">
                                    {lang === "ar" ? item.name_ar : item.name_en}
                                  </p>
                                </div>

                                {/* Sub-details row */}
                                <div className="flex flex-wrap items-center gap-1 text-[8.5px] sm:text-[9.5px] select-none font-arabic text-slate-500 justify-end w-full mt-0.5">
                                  {(() => {
                                    const badge = getStockBadgeColor(item.stock);
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedStockBreakdownItem(item);
                                        }}
                                        title={lang === "ar" ? "اضغط لعرض تفاصيل تواريخ الصلاحية والكميات" : "Click to view stock breakdown by expiry dates"}
                                        className={`px-1.5 py-0.5 rounded border text-[8.5px] sm:text-[9.5px] font-extrabold leading-none cursor-pointer hover:ring-2 hover:ring-sky-500/50 transition-all shrink-0 whitespace-nowrap ${badge.bg} ${badge.text} ${badge.border}`}
                                      >
                                        {badge.label}
                                      </button>
                                    );
                                  })()}

                                  <span className="bg-slate-100 text-slate-600 border border-slate-200/80 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-mono shrink-0 whitespace-nowrap">
                                    {item.id}
                                  </span>

                                  {item.expiry_date && (
                                    <span className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-1 py-0.5 text-[8px] sm:text-[9px] font-bold font-mono shrink-0 whitespace-nowrap">
                                      {lang === "ar" ? "صلاحية: " : "Exp: "}
                                      {item.expiry_date.replace(/-/g, "/")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {filteredInventoryItems.length === 0 && (
                          <p className="col-span-full text-center py-5 text-xs text-slate-400 font-arabic">
                            {lang === "ar"
                              ? "لم يتم العثور على مستلزمات طبية مطابقة."
                              : "No matching supplies found."}
                          </p>
                        )}
                      </div>

                      {/* Vertical Slider Scroll Controller */}
                      <div className="flex flex-col gap-1.5 justify-center items-center shrink-0 border-l border-slate-100 pl-1.5 select-none self-stretch">
                        <button
                          type="button"
                          onClick={() => handleScrollProducts("up")}
                          className="p-1 px-1.5 bg-white border border-slate-150 rounded shadow-3xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-slate-800 flex items-center justify-center w-7 h-8"
                          title={lang === "ar" ? "التمرير لأعلى" : "Scroll Up"}
                        >
                          <span className="text-[10px] font-bold">▲</span>
                        </button>
                        <div className="flex flex-col items-center gap-[1px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          <span className="w-1 h-3 rounded bg-slate-200"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleScrollProducts("down")}
                          className="p-1 px-1.5 bg-white border border-slate-150 rounded shadow-3xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-slate-800 flex items-center justify-center w-7 h-8"
                          title={lang === "ar" ? "التمرير لأسفل" : "Scroll Down"}
                        >
                          <span className="text-[10px] font-bold">▼</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table Checklist display active lines (Audit sheet) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-3xs">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-150 pb-2">
                      <h3 className="text-xs font-bold text-slate-805 font-arabic flex items-center gap-2">
                        <HospitalLogo className="w-4 h-4 shrink-0" />
                        {lang === "ar"
                          ? "المواد والمستلزمات الطبية المدرجة بالفاتورة"
                          : "Itemized Audit Sheet"}
                      </h3>
                      <span className="text-[11px] font-bold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100 text-sky-800 font-arabic shadow-3xs animate-fadeIn">
                        {lang === "ar"
                          ? `الأصناف الملحقة: ${formatArabicDigits(invoiceLines.length, lang)}`
                          : `Attachments: ${invoiceLines.length}`}
                      </span>
                    </div>

                    {invoiceLines.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 font-arabic font-semibold">
                          {lang === "ar" ? "لم يتم إضافة أي مستلزمات طبية بعد" : "No items added to invoice yet"}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile View: Clean, spacious card layout */}
                        <div className="block sm:hidden space-y-2.5">
                          {invoiceLines.map((line, idx) => (
                            <div
                              key={`${line.item_id}-${idx}`}
                              className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 shadow-3xs flex flex-col gap-2"
                            >
                              {/* Top row: Name, Code & Delete button */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 text-right">
                                  <span className="font-bold text-slate-850 font-arabic text-xs leading-snug block">
                                    {lang === "ar" ? line.item_name_ar : line.item_name_en}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                                    {line.item_id}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(line.item_id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer shrink-0"
                                  title={lang === "ar" ? "حذف" : "Delete"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Bottom row: Unit Tariff, Stepper, Subtotal */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                                {/* Unit Tariff */}
                                <div className="flex flex-col text-right">
                                  <span className="text-[9.5px] text-slate-500 font-arabic font-medium">
                                    {lang === "ar" ? "سعر المفرد" : "Tariff"}
                                  </span>
                                  <span className="font-mono text-[11px] font-semibold text-slate-700">
                                    {formatCurrency(line.unit_price, lang)}
                                  </span>
                                </div>

                                {/* Stepper */}
                                <div className="flex flex-col items-center">
                                  <span className="text-[9.5px] text-slate-500 font-arabic font-medium mb-0.5">
                                    {lang === "ar" ? "الكمية" : "Qty"}
                                  </span>
                                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuantity(line.item_id, line.quantity - 1)}
                                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md font-bold transition-all flex items-center justify-center cursor-pointer text-xs"
                                    >
                                      -
                                    </button>
                                    <span className="w-6 text-center font-mono font-bold text-xs text-slate-800">
                                      {formatArabicDigits(line.quantity, lang)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuantity(line.item_id, line.quantity + 1)}
                                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md font-bold transition-all flex items-center justify-center cursor-pointer text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Line Subtotal */}
                                <div className="flex flex-col text-left">
                                  <span className="text-[9.5px] text-slate-500 font-arabic font-medium">
                                    {lang === "ar" ? "الإجمالي" : "Subtotal"}
                                  </span>
                                  <span className="font-mono text-xs font-black text-hospital-blue">
                                    {formatCurrency(line.line_total, lang)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop View: Full data table */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-[10.5px] sm:text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-right">
                                <th className="py-2 px-1.5 sm:px-3 font-black font-arabic text-right whitespace-nowrap">
                                  {lang === "ar"
                                    ? "المستلزم الطبي"
                                    : "Medical Supply"}
                                </th>
                                <th className="py-2 px-1.5 sm:px-3 font-black font-arabic text-center whitespace-nowrap">
                                  {lang === "ar" ? "سعر المفرد" : "Tariff"}
                                </th>
                                <th className="py-2 px-1.5 sm:px-3 font-black font-arabic text-center whitespace-nowrap">
                                  {lang === "ar" ? "الكمية" : "Qty"}
                                </th>
                                <th className="py-2 px-1.5 sm:px-3 font-black font-arabic text-center whitespace-nowrap">
                                  {lang === "ar" ? "الإجمالي" : "Subtotal"}
                                </th>
                                <th className="py-2 px-1.5 sm:px-3 font-black font-arabic text-center whitespace-nowrap">
                                  {lang === "ar" ? "حذف" : "Del"}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {invoiceLines.map((line, idx) => {
                                return (
                                  <tr
                                    key={`${line.item_id}-${idx}`}
                                    className="hover:bg-slate-50/50 transition-colors"
                                  >
                                    <td className="py-2 px-1.5 sm:px-3 text-right">
                                      <span className="font-bold text-slate-850 font-arabic block leading-snug text-[10.5px] sm:text-xs">
                                        {lang === "ar"
                                          ? line.item_name_ar
                                          : line.item_name_en}
                                      </span>
                                      <span className="text-[8.5px] sm:text-[9px] text-slate-400 font-mono block mt-0.5">
                                        {line.item_id}
                                      </span>
                                    </td>

                                    <td className="py-2 px-1.5 sm:px-3 text-center font-medium font-mono text-slate-600 whitespace-nowrap text-[10px] sm:text-xs">
                                      {formatCurrency(line.unit_price, lang)}
                                    </td>

                                    <td className="py-2 px-1.5 sm:px-3 text-center">
                                      <div className="flex items-center justify-center gap-1 inline-flex scale-90 sm:scale-100">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateQuantity(
                                              line.item_id,
                                              line.quantity - 1,
                                            )
                                          }
                                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="w-6 text-center font-mono font-bold text-[11px] sm:text-xs text-slate-800">
                                          {formatArabicDigits(line.quantity, lang)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateQuantity(
                                              line.item_id,
                                              line.quantity + 1,
                                            )
                                          }
                                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>

                                    <td className="py-2 px-1.5 sm:px-3 text-center font-bold text-slate-750 font-mono whitespace-nowrap text-[10px] sm:text-xs">
                                      {formatCurrency(line.line_total, lang)}
                                    </td>

                                    <td className="py-2 px-1.5 sm:px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveLine(line.item_id)
                                        }
                                        className="p-1 rounded text-red-450 hover:text-red-650 hover:bg-red-50 transition-all cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    <div className="bg-sky-50/50 border border-sky-100 rounded-lg p-3.5 mt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-slate-500 font-arabic text-xs font-bold">
                          {lang === "ar"
                            ? "القيمة المالية الاستحقاقية الإجمالية:"
                            : "Audited Total Sum:"}
                        </span>
                        <span className="text-lg md:text-xl font-black text-hospital-blue font-mono">
                          {formatCurrency(calculatedTotals, lang)}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-hospital-blue font-arabic mt-1.5 bg-white/70 p-2 rounded border border-sky-100/50 italic text-right leading-relaxed select-none">
                        "
                        {translateNumberToCurrencyWords(calculatedTotals, lang)}
                        "
                      </p>
                    </div>

                    {/* Interactive direct save/commit button inside the items checklist card */}
                    <div className="mt-4 pt-3.5 border-t border-slate-150">
                      {schemaValidation.isValid ? (
                        <button
                          type="button"
                          onClick={() => setPendingSaveConfirmation(true)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 font-arabic cursor-pointer active:scale-98 hover:scale-[1.01]"
                        >
                          <Check className="w-4 h-4 animate-bounce" />
                          <span className="font-semibold text-xs text-white">
                            {lang === "ar" ? "حفظ الفاتورة" : "Save Invoice"}
                          </span>
                        </button>
                      ) : (
                        <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-800 text-[10px] sm:text-xs font-arabic font-bold text-center flex items-center justify-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {lang === "ar"
                              ? "المستند غير جاهز للاعتماد، يرجى ملء اسم المريض واختيار صنف واحد على الأقل ورقم إيصال يدوي"
                              : "Receipt incomplete. Please specify patient name, receipt number & insert at least 1 medical item."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activePage === "CONSUMPTION" ? (
              <DailyConsumptionReport lang={lang} history={visibleHistory} />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-sky-50 border border-thin border-sky-100/70 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-3xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-hospital-blue text-white flex items-center justify-center shadow-xs">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="text-right sm:text-left">
                      <h2 className="text-sm font-bold text-slate-800 font-arabic">
                        {lang === "ar"
                          ? "دفتر سجلات و إيصالات المرضى"
                          : "Committed Receipts & Patient Archive Ledger"}
                      </h2>
                      <p className="text-[11px] text-slate-450 font-arabic mt-0.5">
                        {lang === "ar"
                          ? "اضغط 'تعديل' لتحميل أي إيصال في ملف الاستقبال لإجراء الإضافات أو طباعة الفاتورة والملخص المالي من جديد"
                          : "Click 'Edit' to load any receipt sequence back into the active desk for ledger updates or printing."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePage("ENTRANCE")}
                    className="bg-hospital-blue hover:bg-sky-750 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors font-arabic flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {lang === "ar" ? "إيصال جديد" : "New Entry Billing"}
                  </button>
                </div>

                <SuitesHistory
                  currentLang={lang}
                  history={visibleHistory}
                  onReload={handleOpenInPlaceInvoiceEditor}
                  onDelete={handleDeleteFromHistory}
                  onPrint={handlePrintFromHistory}
                  searchQuery={historySearch}
                  onSearchChange={setHistorySearch}
                  activeIndex={activeHistoryIndex}
                  onViewDetail={(idx) => {
                    setSelectedDetailInvoiceIndex(idx);
                    setActivePage("DETAIL");
                  }}
                  onPrintBatch={handlePrintBatchInvoices}
                  startDate={historyStartDate}
                  onStartDateChange={setHistoryStartDate}
                  endDate={historyEndDate}
                  onEndDateChange={setHistoryEndDate}
                />
              </div>
            )
          ) : activePage === "OPERATORS" ? (
            // ==========================================
            // 1. RECEPTION desk / STAFF PERMISSIONS (Screenshot 1)
            // ==========================================
            <div className="space-y-6">
              {/* Add new operator form wrapper matching screen 2 */}
              <form
                onSubmit={handleAddOperator}
                className="bg-white border border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-4 text-right"
                dir="rtl"
              >
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900 font-arabic">
                    {lang === "ar"
                      ? "إدارة صلاحيات موظفي الاستقبال"
                      : "Reception Staff Accounts & Privileges"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 font-arabic">
                      {lang === "ar"
                        ? "الاسم بالكامل (Full Name):"
                        : "Full Name:"}
                    </label>
                    <input
                      type="text"
                      value={newOperatorFullName}
                      onChange={(e) => setNewOperatorFullName(e.target.value)}
                      placeholder={lang === "ar" ? "مثال: جون نيبسن" : "e.g. John Nebsen"}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none text-right font-sans focus:border-slate-800 placeholder-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 font-arabic">
                      {lang === "ar"
                        ? "اسم المستخدم (Username):"
                        : "Username:"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newOperatorEmail}
                      onChange={(e) => setNewOperatorEmail(e.target.value)}
                      placeholder="e.g. johnnebsen"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none text-right font-sans focus:border-slate-800 placeholder-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 font-arabic">
                      {lang === "ar"
                        ? "كلمة المرور (Password):"
                        : "Password:"}
                    </label>
                    <input
                      type="password"
                      value={newOperatorPassword}
                      onChange={(e) => setNewOperatorPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none text-right font-sans focus:border-slate-800 placeholder-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 font-arabic">
                      {lang === "ar"
                        ? "نوع الحساب / الصلاحية:"
                        : "Account Type / Role:"}
                    </label>
                    <select
                      value={newOperatorRole}
                      onChange={(e) => setNewOperatorRole(e.target.value as "RECEPTION" | "SUPER_ADMIN")}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none text-right font-arabic font-bold focus:border-slate-800 cursor-pointer"
                    >
                      <option value="RECEPTION">
                        {lang === "ar" ? "🏥 استقبال (Reception)" : "Hospital Reception"}
                      </option>
                      <option value="SUPER_ADMIN">
                        {lang === "ar" ? "👑 مدير (Admin)" : "System Administrator"}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-[#111827] hover:bg-slate-900 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs cursor-pointer text-center font-arabic transition-all shadow-3xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === "ar" ? "إضافة صلاحيات" : "Add Privileges"}</span>
                  </button>
                </div>
              </form>

              {/* Operator list wrapper */}
              <div
                className="bg-white border border-slate-800 rounded-2xl p-6 shadow-xs text-right"
                dir="rtl"
              >
                <div className="text-sm font-black text-slate-900 font-arabic mb-4 border-b border-slate-100 pb-3">
                  <span>
                    {lang === "ar"
                      ? "الحسابات النشطة والمصرح لها بالنظام"
                      : "Active System Accounts"}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {operators.map((op) => {
                    const opIdentifier = op.username || op.email;
                    const displayFullName = op.fullName || opIdentifier;
                    const isStaticOnDuty = opIdentifier === "Antonymohab@gmail.com" || opIdentifier === "admin";
                    const formattedDate = new Date(op.joined_at || Date.now())
                      .toISOString()
                      .split("T")[0]
                      .replace(/-/g, "/");
                    const arabicDate = formatArabicDigits(formattedDate, lang);
                    return (
                      <div
                        key={opIdentifier}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {!isStaticOnDuty && (
                            <button
                              onClick={() => handleDeleteOperator(opIdentifier)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                              title={
                                lang === "ar" ? "إلغاء صلاحية (حذف)" : "Revoke Access"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleOperatorStatus(opIdentifier)}
                            disabled={isStaticOnDuty}
                            className={`px-3 py-1 rounded-xl text-xs font-bold font-arabic border transition-all cursor-pointer bg-white ${
                              op.isActive
                                ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50/50"
                                : "border-rose-500 text-rose-600 hover:bg-rose-50/50"
                            } ${isStaticOnDuty ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {op.isActive
                              ? lang === "ar"
                                ? "حساب نشط"
                                : "Active Account"
                              : lang === "ar"
                                ? "حساب معطل"
                                : "Disabled Account"}
                          </button>
                        </div>

                        <div className="flex items-center gap-2.5 text-right">
                          <div className="text-right">
                            <span className="text-xs sm:text-sm font-black text-slate-900 font-sans block leading-snug">
                              {displayFullName} {op.role === "SUPER_ADMIN" ? "👑 (مدير)" : "📱 (استقبال)"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-arabic block mt-0.5 font-bold">
                              {lang === "ar"
                                ? "مسجل من: "
                                : "Registered since: "}{" "}
                              {arabicDate}
                            </span>
                          </div>
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${op.isActive ? "bg-emerald-500 shadow-xs" : "bg-rose-500"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activePage === "RESTOCK" ? (
            // ==========================================
            // 2. NEW BATCH-RESTOCK PORTAL (Search-to-Add, Multi-item Manifest, Edit Qty/Expiry, Delete)
            // ==========================================
            <div className="space-y-6 text-right animate-fadeIn" dir="rtl">
              {/* Upper Block: Full Screen-Width Registering Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                <div className="border-b border-slate-150 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-800 font-arabic flex items-center gap-2">
                      <span>📦</span> تسجيل شحنة توريد جديدة
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActivePage("ADD_PRODUCT")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all font-arabic flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{lang === "ar" ? "إضافة صنف جديـد أو فئة +" : "Add New Item / Category +"}</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar - Full screen/parent width */}
                <div className="relative">
                  <label className="block text-xs font-black text-slate-700 mb-2 font-arabic">
                    🔎 ابحث عن صنف أو دواء لإضافته لقائمة الاستلام:
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                      <Search className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      value={restockSearchQuery}
                      onChange={(e) => setRestockSearchQuery(e.target.value)}
                      placeholder={
                        lang === "ar"
                          ? "اكتب اسم المستلزم، الكلمة المفتاحية، أو كود الصنف الطبي..."
                          : "Type custom drug name, category or ID..."
                      }
                      className="w-full pr-11 pl-4 py-3 border-2 border-slate-200 rounded-xl outline-none text-xs md:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-emerald-500 font-arabic transition-all bg-slate-50/50"
                    />
                    {restockSearchQuery.trim() !== "" && (
                      <button
                        type="button"
                        onClick={() => setRestockSearchQuery("")}
                        className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Suggestions List overlay */}
                  {restockSearchQuery.trim() !== "" && (
                    <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl max-h-[280px] overflow-y-auto divide-y divide-slate-100 divide-dashed">
                      {(() => {
                        const matches = inventory.filter(
                          (item) =>
                            (item.id || "")
                              .toLowerCase()
                              .includes(restockSearchQuery.toLowerCase()) ||
                            (item.name_ar || "")
                              .toLowerCase()
                              .includes(restockSearchQuery.toLowerCase()) ||
                            (item.name_en || "")
                              .toLowerCase()
                              .includes(restockSearchQuery.toLowerCase()) ||
                            (item.category_ar || "")
                              .toLowerCase()
                              .includes(restockSearchQuery.toLowerCase()) ||
                            (item.category_en || "")
                              .toLowerCase()
                              .includes(restockSearchQuery.toLowerCase()),
                        );

                        if (matches.length === 0) {
                          return (
                            <div className="p-4 text-center text-slate-400 font-arabic text-xs">
                              لا توجد مستلزمات مطابقة لبحثك في قاعدة البيانات
                              المذكورة للعيادات والمستشفى.
                            </div>
                          );
                        }

                        return matches.map((item, idx) => {
                          const isMedicine =
                            item.category_en === "Emergency Drugs" ||
                            item.category_ar === "أدوية وحقن طوارئ";
                          return (
                            <button
                              key={`${item.id}-${idx}`}
                              type="button"
                              onClick={() => {
                                // Add staging element
                                const exists = stagedRestockItems.find(
                                  (it) => it.id === item.id,
                                );
                                if (exists) {
                                  // Already exists, keep as is
                                } else {
                                  setStagedRestockItems([
                                    ...stagedRestockItems,
                                    {
                                      id: item.id,
                                      name_ar: item.name_ar,
                                      name_en: item.name_en,
                                      category_ar: item.category_ar,
                                      category_en: item.category_en,
                                      quantity: "",
                                      expiryDate: isMedicine
                                        ? new Date(
                                            Date.now() +
                                              365 * 24 * 60 * 60 * 1000,
                                          )
                                            .toISOString()
                                            .split("T")[0]
                                        : "",
                                    },
                                  ]);
                                }
                                setRestockSearchQuery(""); // clean search query after click!
                              }}
                              className="w-full text-right p-3.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-3 font-arabic cursor-pointer animate-fadeIn"
                            >
                              <div>
                                <span className="font-extrabold text-slate-800 text-xs md:text-sm block">
                                  {lang === "ar" ? item.name_ar : item.name_en}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                  ID: {item.id} ·{" "}
                                  {lang === "ar"
                                    ? item.category_ar
                                    : item.category_en}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                  رصيد متبقي: {item.stock} وحدات
                                </span>
                                {isMedicine && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    📅 دواء طوارئ (يتطلب صلاحية)
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Staged Items List - underneath search bar as requested */}
                <div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
                    <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 font-arabic">
                        📋 الأصناف المضافة لشحنة التوريد الحالية (
                        {stagedRestockItems.length})
                      </span>
                      {stagedRestockItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStagedRestockItems([])}
                          className="text-[10.5px] font-bold text-red-600 hover:text-red-800 transition-colors font-arabic cursor-pointer"
                        >
                          إزالة كافة خطوط التوريد
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                            <th className="py-2.5 px-4 font-arabic text-right">
                              {lang === "ar"
                                ? "اسم الصنف الطبي"
                                : "Medical Item"}
                            </th>
                            <th className="py-2.5 px-4 font-arabic text-center">
                              {lang === "ar" ? "الفئة" : "Category"}
                            </th>
                            <th className="py-2.5 px-4 font-arabic text-center w-28">
                              {lang === "ar" ? "الكمية الواردة" : "Quantity"}
                            </th>
                            <th className="py-2.5 px-4 font-arabic text-center w-48">
                              {lang === "ar" ? "تاريخ الصلاحية" : "Expiry Date"}
                            </th>
                            <th className="py-2.5 px-4 font-arabic text-center w-20">
                              {lang === "ar" ? "حذف" : "Remove"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stagedRestockItems.map((item, idx) => {
                            const isMedicine =
                              item.category_en === "Emergency Drugs" ||
                              item.category_ar === "أدوية وحقن طوارئ";
                            const isAlternate = idx % 2 === 1;
                            return (
                              <tr
                                key={item.id}
                                className={`transition-colors ${isAlternate ? "bg-slate-50/50" : "bg-white"}`}
                              >
                                <td className="py-3 px-4 font-arabic text-right border-l border-slate-150/40">
                                  <div className="font-extrabold text-slate-800 text-[12px]">
                                    {lang === "ar"
                                      ? item.name_ar
                                      : item.name_en}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    ID: {item.id}
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-arabic text-center text-slate-500 border-l border-slate-150/40">
                                  {lang === "ar"
                                    ? item.category_ar
                                    : item.category_en}
                                </td>

                                {/* Editable Quantity */}
                                <td className="py-3 px-4 text-center border-l border-slate-150/40">
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder={
                                      lang === "ar"
                                        ? "أدخل الكمية"
                                        : "Enter qty"
                                    }
                                    value={item.quantity}
                                    onChange={(e) => {
                                      handleChangeStagedQuantity(
                                        item.id,
                                        e.target.value,
                                      );
                                    }}
                                    className="w-20 px-2 py-1 leading-tight text-center border border-slate-350 rounded-lg text-slate-850 font-black focus:border-[#1e293b] font-mono outline-none shadow-3xs"
                                  />
                                </td>

                                {/* Editable Expiry Date if needed as requested */}
                                <td className="py-3 px-4 text-center border-l border-slate-150/40">
                                  {isMedicine ? (
                                    <div className="flex flex-col gap-0.5 items-stretch">
                                      <input
                                        type="date"
                                        required
                                        value={item.expiryDate}
                                        onChange={(e) =>
                                          handleChangeStagedExpiryDate(
                                            item.id,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-2 py-1 text-[11px] leading-tight text-center border border-amber-300 bg-amber-50/30 rounded-lg text-slate-950 font-semibold focus:border-[#1e293b] outline-none"
                                      />
                                      <span className="text-[9px] text-amber-700 font-arabic font-bold text-center">
                                        تاريخ انتهاء مطلوب ⚠️
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5 items-stretch">
                                      <input
                                        type="date"
                                        value={item.expiryDate}
                                        onChange={(e) =>
                                          handleChangeStagedExpiryDate(
                                            item.id,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-2 py-1 text-[11px] leading-tight text-center border border-slate-200 rounded-lg text-slate-800 focus:border-[#1e293b] outline-none"
                                      />
                                      <span className="text-[9px] text-slate-450 font-arabic text-center">
                                        (اختياري للمستلزمات)
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Delete row column */}
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveStagedItem(item.id)
                                    }
                                    className="text-slate-400 hover:text-red-700 p-1.5 transition-colors cursor-pointer border border-slate-200 rounded-lg hover:bg-rose-50 hover:border-rose-200"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {stagedRestockItems.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-12 px-4 text-center text-slate-400 font-arabic"
                              >
                                {lang === "ar"
                                  ? "⚠️ القائمة لا تحتوي على أصناف حالياً. الرجاء كتابة اسم الصنف في شريط البحث بالأعلى وتحديده للإضافة."
                                  : "No items staged in this restock manifest transaction yet. Use the full-width search box above to add items."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Manifest Global Parameters: Supplier and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-150">
                  <div>
                    <label className="block text-[11.5px] font-black text-slate-700 mb-1.5 font-arabic">
                      🏛️ جهة التوريد أو الشركة الموردة للشحنة:
                    </label>
                    <input
                      type="text"
                      required
                      value={restockSupplier}
                      onChange={(e) => setRestockSupplier(e.target.value)}
                      placeholder=""
                      className="w-full p-2.5 text-xs border border-slate-250 rounded-xl outline-none text-right font-arabic focus:border-emerald-500 max-w-full font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-black text-slate-700 mb-1.5 font-arabic">
                      🖊️ ملاحظات ومعلومات رقابية على دفعة الاستلام:
                    </label>
                    <input
                      type="text"
                      value={restockNotes}
                      onChange={(e) => setRestockNotes(e.target.value)}
                      placeholder=""
                      className="w-full p-2.5 text-xs border border-slate-250 rounded-xl outline-none text-right font-arabic focus:border-emerald-500 max-w-full"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRestockSubmit()}
                    disabled={stagedRestockItems.length === 0}
                    className={`min-w-[200px] text-white font-black px-6 py-3 rounded-xl text-xs md:text-sm shadow-xs transition-all font-arabic flex items-center justify-center gap-2 cursor-pointer ${
                      stagedRestockItems.length > 0
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-350 cursor-not-allowed text-slate-400"
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    تسجيل واعتماد الشحنة بالمخزن (حفظ)
                  </button>
                </div>
              </div>
              {/* Lower Block: Grouped Invoices History */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-right">
                <div className="border-b border-slate-150 pb-2.5 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 font-arabic flex items-center gap-1.5">
                      <span>📋</span> كشف ومحاضر فواتير شحنات التوريد بالمخزن
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-250 rounded-xl overflow-y-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 font-arabic text-right w-12"></th>
                        <th className="py-3.5 px-4 font-arabic text-sm text-slate-800 text-right">
                          {lang === "ar"
                            ? "رقم الفاتورة والتاريخ"
                            : "Invoice ID / Date"}
                        </th>
                        <th className="py-3.5 px-4 font-arabic text-right">
                          {lang === "ar" ? "المورد والشركة" : "Supplier"}
                        </th>
                        <th className="py-3.5 px-4 font-arabic text-center">
                          {lang === "ar" ? "الأصناف الموردة" : "Items Added"}
                        </th>
                        <th className="py-3.5 px-4 font-arabic text-right">
                          {lang === "ar"
                            ? "المسؤول والملاحظات"
                            : "Officer / Notes"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {restockInvoices.map((invoice, idx) => {
                        const isAlternate = idx % 2 === 1;
                        const totalQuantity = invoice.items.reduce(
                          (sum, item) => sum + item.quantityAdded,
                          0,
                        );

                        return (
                          <tr
                            key={`${invoice.id}-${idx}`}
                            onClick={() => {
                              setSelectedRestockInvoice(invoice);
                              setActivePage("RESTOCK_DETAIL");
                            }}
                            className={`transition-colors cursor-pointer select-none ${isAlternate ? "bg-slate-50/50" : "bg-white"} hover:bg-emerald-50/15`}
                          >
                            {/* Action detail indicator */}
                            <td className="py-4 px-4 text-center border-l border-slate-100">
                              <div className="flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg p-1.5 transition-all">
                                <Eye className="w-4 h-4" />
                              </div>
                            </td>

                            {/* Invoice ID and timestamp */}
                            <td className="py-4 px-4 text-right border-l border-slate-100">
                              <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
                                <span className="font-extrabold text-xs text-slate-900 font-mono tracking-tight select-all">
                                  {invoice.id}
                                </span>
                                <span className="text-[10px] scale-90 bg-emerald-50 text-emerald-800 border border-emerald-150 font-black px-1.5 py-0.5 rounded">
                                  {lang === "ar" ? "فاتورة" : "Invoice"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-450 font-mono mt-1">
                                {new Date(
                                  invoice.timestamp,
                                ).toLocaleDateString(
                                  lang === "ar" ? "ar-EG" : "en-US",
                                )}{" "}
                                {new Date(
                                  invoice.timestamp,
                                ).toLocaleTimeString(
                                  lang === "ar" ? "ar-EG" : "en-US",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            </td>

                            {/* Supplier info */}
                            <td className="py-4 px-4 text-right border-l border-slate-100 font-semibold text-slate-800 font-arabic text-[12px]">
                              {invoice.supplier}
                            </td>

                            {/* Item counter badge */}
                            <td className="py-4 px-4 text-center border-l border-slate-100">
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-arabic font-extrabold text-[11px] border border-slate-200">
                                  {invoice.items.length}{" "}
                                  {lang === "ar"
                                    ? "أصناف مختلفة"
                                    : "distinct items"}
                                </span>
                                <span className="text-[10px] text-slate-455 font-semibold mt-1 font-sans">
                                  {totalQuantity}{" "}
                                  {lang === "ar"
                                    ? "وحدة إجمالية"
                                    : "total units"}
                                </span>
                              </div>
                            </td>

                            {/* Officer & notes */}
                            <td className="py-4 px-4 text-right">
                              <p className="font-extrabold text-slate-850 text-[11px]">
                                {getUserName(invoice.officer, lang)}
                              </p>
                              {invoice.notes ? (
                                <span className="text-[10px] text-slate-500 font-arabic bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100 mt-1 inline-block">
                                  📝 {invoice.notes}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-arabic mt-1">
                                  لا توجد ملاحظات إضافية
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {restockInvoices.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-12 text-center text-slate-400 font-arabic bg-slate-50/30"
                          >
                            لا يوجد محاضر شحنات توريد مسجلة حالياً بالمستودع.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            // ==========================================
            // 3. SUPER ADMIN WORKSPACE (ONLY LOW STOCK TABLE & EMAIL RECORDS AS REQUESTED)
            // ==========================================
            <div className="space-y-6 text-right animate-fadeIn" dir="rtl">
              {/* Interactive Warning Widgets / Top Buttons (أزرار الاختيار العلوية) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
                {/* 1. Expiry Warnings Toggle Button Card */}
                <button
                  type="button"
                  onClick={() => setActiveAdminTab(activeAdminTab === "EXPIRIES" ? "MASTER" : "EXPIRIES")}
                  className={`w-full text-right p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer outline-none relative hover:scale-[1.01] active:scale-[0.99] duration-150 ${
                    activeAdminTab === "EXPIRIES"
                      ? "bg-amber-100 border-amber-400 ring-2 ring-amber-400/30 shadow-md shadow-amber-500/10 text-amber-950 font-black"
                      : "bg-amber-50/60 hover:bg-amber-50 border-amber-100 shadow-3xs text-slate-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-amber-950 font-arabic flex items-center gap-1.5 justify-start">
                      <span className="text-base">📅</span>
                      {lang === "ar" ? "تنبيهات وفترات صلاحية الأدوية والمستلزمات" : "Expiry Warnings & Shelf-life Alert"}
                    </h3>
                    <p className={`text-[10.5px] font-arabic mt-1 leading-relaxed ${
                      activeAdminTab === "EXPIRIES" ? "text-amber-900" : "text-amber-700/80"
                    }`}>
                      {lang === "ar"
                        ? "كشف تلقائي مستمر بالأصناف واللقاحات التي تنتهي صلاحيتها خلال 90 يوماً أو أقل لاتخاذ الإجراءات"
                        : "Ongoing automated track of supplies and vaccines expiring within 90 days."}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black font-arabic ${
                        activeAdminTab === "EXPIRIES" ? "bg-amber-600 text-white animate-pulse" : "bg-amber-200/60 text-amber-850"
                      }`}>
                        {activeAdminTab === "EXPIRIES"
                          ? (lang === "ar" ? "📍 يعرض هذه الصفحة حالياً" : "📍 Currently Displayed")
                          : (lang === "ar" ? "🔍 اضغط لفتح الصفحة والجدول" : "🔍 Click to open table")}
                      </span>
                    </div>
                  </div>
                  
                  {/* Icon Container matching Screenshot 1 */}
                  <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 shadow-3xs flex items-center justify-center shrink-0">
                    <span className="text-2xl">📅</span>
                  </div>
                </button>

                {/* 2. Shortages Warnings Toggle Button Card */}
                <button
                  type="button"
                  onClick={() => setActiveAdminTab(activeAdminTab === "SHORTAGES" ? "MASTER" : "SHORTAGES")}
                  className={`w-full text-right p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer outline-none relative hover:scale-[1.01] active:scale-[0.99] duration-150 ${
                    activeAdminTab === "SHORTAGES"
                      ? "bg-rose-100 border-rose-450 ring-2 ring-rose-300/40 shadow-md shadow-rose-500/10 text-rose-950 font-black"
                      : "bg-rose-50/60 hover:bg-rose-50/90 border-rose-100 shadow-3xs text-slate-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-rose-955 font-arabic flex items-center gap-1.5 justify-start">
                      <span className="text-base">🚨</span>
                      {lang === "ar" ? "كشف النواقص والعجز بالمستودع والعيادات" : "Warehouse & Clinic Shortages"}
                    </h3>
                    <p className={`text-[10.5px] font-arabic mt-1 leading-relaxed ${
                      activeAdminTab === "SHORTAGES" ? "text-rose-900" : "text-rose-700/80"
                    }`}>
                      {lang === "ar"
                        ? "المستلزمات الطبية والأدوية النشطة التي تخطت حد الأمان المعتمد للتنبيه والمطلوب توريدها فوراً"
                        : "Medical ingredients and active supplies crossing safe security levels."}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black font-arabic ${
                        activeAdminTab === "SHORTAGES" ? "bg-rose-650 text-white animate-pulse" : "bg-rose-205 text-rose-850"
                      }`}>
                        {activeAdminTab === "SHORTAGES"
                          ? (lang === "ar" ? "📍 يعرض هذه الصفحة حالياً" : "📍 Currently Displayed")
                          : (lang === "ar" ? "🔍 اضغط لفتح الصفحة والجدول" : "🔍 Click to open table")}
                      </span>
                    </div>
                  </div>
                  
                  {/* Icon Container matching Screenshot 1 */}
                  <div className="w-12 h-12 rounded-xl bg-white border border-rose-200 shadow-3xs flex items-center justify-center shrink-0">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </button>
              </div>

              {/* Conditionally Rendered Tables based on chosen sub-header page/tab */}
              {activeAdminTab === "MASTER" && (
                <div className="animate-fadeIn">
                  {/* Master Inventory Control & Price Management Board (لوحة إدارة المخزون الشاملة وتسعير العلاج) */}
              <div className="bg-white border border-slate-250 rounded-xl shadow-3xs overflow-hidden" id="inventory-master-control-panel">
                <div className="bg-sky-50 border-b border-sky-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <div>
                      <h3 className="text-sm font-black text-sky-950 font-arabic">
                        لوحة التحكم وإدارة بيانات المخزوّن الكلي والأسعار
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2" dir="ltr">
                    {/* Shortcut button to issue a new restock order */}
                    <button
                      type="button"
                      onClick={() => setActivePage("RESTOCK")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs font-arabic flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                    >
                      <span>إضافة طلبية ➕</span>
                    </button>

                    {/* Search Field */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={lang === "ar" ? "ابحث بالاسم أو الكود..." : "Search by name or code..."}
                        value={masterSearchQuery}
                        onChange={(e) => setMasterSearchQuery(e.target.value)}
                        className="text-xs font-arabic border border-slate-250 p-1.5 pr-8 rounded-lg outline-none bg-white w-44 sm:w-48 focus:border-sky-600 focus:ring-1 focus:ring-sky-600/30 text-right"
                      />
                      <span className="absolute right-2.5 top-2.5 text-slate-400 text-[11px]">🔍</span>
                    </div>

                    {/* Category Filter */}
                    <select
                      value={masterCategoryFilter}
                      onChange={(e) => setMasterCategoryFilter(e.target.value)}
                      className="text-xs font-arabic border border-slate-250 p-1.5 rounded-lg outline-none bg-white font-semibold text-slate-700"
                    >
                      <option value="">{lang === "ar" ? "كل الفئات الطبية" : "All Categories"}</option>
                      {Array.from(new Set(inventory.map(item => lang === "ar" ? item.category_ar : item.category_en))).map((catName) => {
                        const originalAr = inventory.find(it => (lang === "ar" ? it.category_ar : it.category_en) === catName)?.category_ar || catName;
                        return (
                          <option key={catName} value={originalAr}>
                            {catName}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Mobile View: Stackable Item Cards (الجرد والتعديل السريع) */}
                <div className="md:hidden p-3 divide-y divide-slate-100 space-y-3 bg-slate-50/50">
                  {filteredMasterItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-450 font-arabic bg-white rounded-xl border border-slate-200">
                      لا يوجد أي مستلزمات تطابق معايير البحث الحالية.
                    </div>
                  ) : (
                    filteredMasterItems.map((item) => {
                      const currentThreshold = itemThresholds[item.id] !== undefined ? itemThresholds[item.id] : 12;
                      const displayedStock = pendingStockAdjustments[item.id] !== undefined
                        ? pendingStockAdjustments[item.id]
                        : item.stock;
                      const isPendingModified = pendingStockAdjustments[item.id] !== undefined && pendingStockAdjustments[item.id] !== item.stock;
                      const isLowStock = displayedStock <= currentThreshold;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-xl border ${isLowStock ? "bg-amber-50/40 border-amber-200" : "bg-white border-slate-200"} shadow-3xs flex flex-col gap-2.5 text-right font-arabic`}
                        >
                          {/* Item Header: Name & Category */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(item.id);
                                  setActivePage("PRODUCT_DETAIL");
                                }}
                                className="font-black text-sm text-slate-900 hover:text-sky-700 text-right block leading-snug truncate"
                              >
                                {lang === "ar" ? item.name_ar : item.name_en}
                              </button>
                              <span className="text-[11px] text-slate-500 font-sans block mt-0.5 truncate">
                                {lang === "ar" ? item.name_en : item.name_ar}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {lang === "ar" ? item.category_ar : item.category_en}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                #{item.id}
                              </span>
                            </div>
                          </div>

                          {/* Price & Alert Threshold */}
                          <div className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                            <div>
                              <span className="text-slate-500 text-[11px]">{lang === "ar" ? "السعر: " : "Price: "}</span>
                              <span className="font-black text-sky-700 font-mono">
                                {item.unit_price.toFixed(1)} {lang === "ar" ? "ج.م" : "EGP"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[11px]">{lang === "ar" ? "حد الأمان: " : "Alert Threshold: "}</span>
                              <span className="font-bold text-amber-700 font-mono">{currentThreshold}</span>
                            </div>
                          </div>

                          {/* Quick Stocktaking (Gard) with + / - Buttons */}
                          <div className="flex items-center justify-between bg-sky-50/60 p-2 rounded-xl border border-sky-100">
                            <span className="text-xs font-bold text-slate-700">
                              {lang === "ar" ? "الرصيد المتاح (الجرد):" : "Live Stock Count:"}
                            </span>
                            <div className="flex items-center gap-2" dir="ltr">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStock(item.id, -1)}
                                className="w-8 h-8 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-black text-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-3xs"
                                title={lang === "ar" ? "خصم 1 وحدة من المخزون" : "Decrement stock"}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedStockBreakdownItem(item)}
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer ${
                                  isPendingModified
                                    ? "bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-300"
                                    : isLowStock
                                    ? "bg-rose-100 border-rose-300 text-rose-800"
                                    : "bg-white border-slate-200 text-slate-800"
                                }`}
                              >
                                {displayedStock} {isPendingModified ? "✏️" : isLowStock ? "⚠️" : ""}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStock(item.id, 1)}
                                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-3xs"
                                title={lang === "ar" ? "إضافة 1 وحدة للمخزون" : "Increment stock"}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Quick Action Buttons: "تعديل" (edit) and "عرض" (view detailed logs) */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductId(item.id);
                                setActivePage("PRODUCT_DETAIL");
                              }}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors font-arabic flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{lang === "ar" ? "عرض السجل" : "View Logs"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditId(item.id);
                                setEditNameAr(item.name_ar);
                                setEditNameEn(item.name_en);
                                setEditCategoryAr(item.category_ar);
                                setEditCategoryEn(item.category_en);
                                setEditStock(item.stock);
                                setEditUnitPrice(item.unit_price);
                                setEditThreshold(currentThreshold);
                                setEditExpiryDate(item.expiry_date || "");
                              }}
                              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors font-arabic flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>{lang === "ar" ? "تعديل الصنف" : "Edit Item"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMasterItem(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title={lang === "ar" ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop View: Full Master Table */}
                <div className="hidden md:flex gap-2 items-stretch p-1 relative">
                  <div
                    ref={masterTableContainerRef}
                    className="max-h-[380px] overflow-y-auto overflow-x-auto flex-1 scroll-smooth"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-705 font-bold">
                        <th className="py-2.5 px-3 font-arabic border-l border-slate-200/60 text-right">
                          {lang === "ar" ? "الوصف بالعربية" : "Name (AR)"}
                        </th>
                        <th className="py-2.5 px-3 font-arabic border-l border-slate-200/60 text-right">
                          {lang === "ar" ? "الوصف بالإنجليزية" : "Name (EN)"}
                        </th>
                        <th className="py-2.5 px-3 font-arabic border-l border-slate-200/60 text-center w-[120px]">
                          {lang === "ar" ? "الفئة / القسم" : "Category"}
                        </th>
                        <th className="py-2.5 px-3 font-arabic border-l border-slate-200/60 text-center w-[110px]">
                          {lang === "ar" ? "الرصيد (الجرد)" : "Stock (Gard)"}
                        </th>
                        <th className="py-2.5 px-3 font-arabic border-l border-slate-200/60 text-center w-[100px]">
                          {lang === "ar" ? "السعر (جنيه)" : "Price (EGP)"}
                        </th>
                        <th className="py-2.5 px-3 font-arabic border-l border-slate-200/60 text-center w-[90px]">
                          {lang === "ar" ? "حد الأمان" : "Safety Alert"}
                        </th>
                        <th className="py-2.5 px-3 font-arabic text-center w-[110px]">
                          {lang === "ar" ? "خيارات التعديل" : "Actions"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredMasterItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-405 font-arabic bg-slate-50/20">
                            لا يوجد أي مستلزمات تطابق معايير البحث الحالية.
                          </td>
                        </tr>
                      ) : (
                        filteredMasterItems.map((item, idx) => {
                          const isEditing = editingItemId === item.id;
                          const isAlternate = idx % 2 === 1;
                          const currentThreshold = itemThresholds[item.id] !== undefined ? itemThresholds[item.id] : 12;
                          const displayedStock = pendingStockAdjustments[item.id] !== undefined
                            ? pendingStockAdjustments[item.id]
                            : item.stock;
                          const isPendingModified = pendingStockAdjustments[item.id] !== undefined && pendingStockAdjustments[item.id] !== item.stock;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors text-right ${isEditing ? "bg-sky-50/40" : isAlternate ? "bg-slate-50/50" : "bg-white"} hover:bg-slate-100/50`}
                            >
                               {/* 2. Arabic Description */}
                               <td className="py-2 px-3 border-l border-slate-200/60 font-arabic text-right">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setSelectedProductId(item.id);
                                     setActivePage("PRODUCT_DETAIL");
                                   }}
                                   className="font-extrabold text-slate-900 hover:text-sky-850 hover:underline cursor-pointer text-right block leading-tight"
                                 >
                                   {item.name_ar}
                                 </button>
                               </td>

                               {/* 3. English Description */}
                               <td className="py-2 px-3 border-l border-slate-200/60 text-left font-sans font-medium">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setSelectedProductId(item.id);
                                     setActivePage("PRODUCT_DETAIL");
                                   }}
                                   className="block leading-tight text-[11px] font-semibold text-slate-650 hover:text-sky-850 hover:underline text-left cursor-pointer"
                                 >
                                   {item.name_en}
                                 </button>
                               </td>

                               {/* 4. Category */}
                               <td className="py-2 px-3 border-l border-slate-200/60 text-center font-arabic text-slate-650">
                                 <span className="inline-block bg-slate-100 text-slate-705 px-2 py-0.5 rounded text-[10.5px] font-semibold">
                                   {lang === "ar" ? item.category_ar : item.category_en}
                                 </span>
                                </td>

                               {/* 5. Stock Qty with +/- buttons */}
                               <td className="py-2 px-3 border-l border-slate-200/60 text-center font-mono">
                                 {isEditing ? (
                                   <input
                                     type="number"
                                     value={editStock}
                                     onChange={(e) => setEditStock(e.target.value === "" ? "" : Number(e.target.value))}
                                     className="w-[70px] text-xs font-mono text-center p-1 border border-sky-400 rounded outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                                   />
                                 ) : (
                                   <div className="flex items-center justify-center gap-1" dir="ltr">
                                     <button
                                       type="button"
                                       onClick={() => handleQuickAdjustStock(item.id, -1)}
                                       className="w-5 h-5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90"
                                       title={lang === "ar" ? "خصم 1" : "-1"}
                                     >
                                       -
                                     </button>
                                     <button
                                        type="button"
                                        onClick={() => setSelectedStockBreakdownItem(item)}
                                        title={lang === "ar" ? "اضغط لعرض تفاصيل تواريخ الصلاحية والكميات" : "Click to view stock breakdown by expiry dates"}
                                        className={`px-2 py-0.5 rounded text-[10.5px] font-black cursor-pointer hover:ring-2 hover:ring-sky-500/50 hover:scale-105 transform transition-all ${
                                          isPendingModified
                                            ? "bg-amber-200 border border-amber-400 text-amber-950 font-black"
                                            : displayedStock <= currentThreshold
                                            ? "bg-rose-50 text-rose-700"
                                            : "bg-slate-100 text-slate-800"
                                        }`}
                                      >
                                        {displayedStock}{isPendingModified ? " *" : ""}
                                      </button>
                                     <button
                                       type="button"
                                       onClick={() => handleQuickAdjustStock(item.id, 1)}
                                       className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90"
                                       title={lang === "ar" ? "إضافة 1" : "+1"}
                                     >
                                       +
                                     </button>
                                   </div>
                                 )}
                               </td>

                               {/* 6. Unit Price */}
                               <td className="py-2 px-3 border-l border-slate-200/60 text-center font-mono">
                                 {isEditing ? (
                                   <input
                                     type="number"
                                     step="0.01"
                                     value={editUnitPrice}
                                     onChange={(e) => setEditUnitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                     className="w-[80px] text-xs font-mono text-center p-1 border border-sky-400 rounded outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                                   />
                                 ) : (
                                   <span className="font-extrabold text-[#0284c7]">
                                     {item.unit_price.toFixed(1)} {lang === "ar" ? "ج.م" : "EGP"}
                                   </span>
                                 )}
                               </td>

                               {/* 7. Had E2tmany (Safety alert threshold) */}
                               <td className="py-2 px-3 border-l border-slate-200/60 text-center font-mono text-yellow-800">
                                 <span className="font-bold border-b border-dashed border-amber-300">
                                   {currentThreshold}
                                 </span>
                               </td>

                              {/* 9. Action buttons */}
                              <td className="py-2 px-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMasterItem(item.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2 py-1 rounded transition-colors text-[10.5px] font-arabic cursor-pointer shadow-3xs"
                                    >
                                      حفظ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingItemId(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1.5 py-1 rounded transition-colors text-[10.5px] font-arabic cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditId(item.id);
                                        setEditNameAr(item.name_ar);
                                        setEditNameEn(item.name_en);
                                        setEditCategoryAr(item.category_ar);
                                        setEditCategoryEn(item.category_en);
                                        setEditStock(item.stock);
                                        setEditUnitPrice(item.unit_price);
                                        setEditThreshold(currentThreshold);
                                        setEditExpiryDate(item.expiry_date || "");
                                      }}
                                      className="border border-sky-200 hover:bg-sky-50/60 text-sky-700 font-extrabold px-2 py-1 rounded transition-all text-[10.5px] font-arabic cursor-pointer flex items-center gap-0.5"
                                    >
                                      ✎ {lang === "ar" ? "تعديل" : "Edit"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMasterItem(item.id)}
                                      className="border border-rose-100 hover:bg-rose-50 text-rose-600 font-bold px-1.5 py-1 rounded transition-all text-[10.5px] font-arabic cursor-pointer"
                                      title={lang === "ar" ? "حذف نهائي" : "Delete Item"}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Vertical Slider Scroll Controller */}
                <div className="flex flex-col gap-1.5 justify-center items-center shrink-0 border-l border-slate-100 pl-1.5 select-none self-stretch">
                  <button
                    type="button"
                    onClick={() => handleScrollMasterTable("up")}
                    className="p-1 px-1.5 bg-white border border-slate-150 rounded shadow-3xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-slate-800 flex items-center justify-center w-7 h-8"
                    title={lang === "ar" ? "التمرير لأعلى" : "Scroll Up"}
                  >
                    <span className="text-[10px] font-bold">▲</span>
                  </button>
                  <div className="flex flex-col items-center gap-[1px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span className="w-1 h-3 rounded bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleScrollMasterTable("down")}
                    className="p-1 px-1.5 bg-white border border-slate-150 rounded shadow-3xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition-colors cursor-pointer text-slate-500 hover:text-slate-800 flex items-center justify-center w-7 h-8"
                    title={lang === "ar" ? "التمرير لأسفل" : "Scroll Down"}
                  >
                    <span className="text-[10px] font-bold">▼</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

            
            {/* Save Changes Floating / Sticky Bar for Stock Adjustments */}
            {Object.keys(pendingStockAdjustments).length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn" dir="rtl">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-amber-900 font-arabic">
                      {lang === "ar"
                        ? `⚠️ تم تعديل كميات عدد (${Object.keys(pendingStockAdjustments).length}) أصناف (تغييرات معلقة)`
                        : `⚠️ Unsaved stock quantity modifications on (${Object.keys(pendingStockAdjustments).length}) items.`}
                    </h4>
                    <p className="text-[11px] text-amber-700 font-arabic mt-0.5">
                      {lang === "ar"
                        ? "اضغط على زر حفظ التغييرات أدناه لاعتماد الكميات الجديدة في قاعدة البيانات."
                        : "Click Save Changes below to commit new quantities to the ledger."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleCancelStockAdjustments}
                    className="px-4 py-2 rounded-xl text-xs font-bold font-arabic bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                  >
                    {lang === "ar" ? "إلغاء التغييرات" : "Discard"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmStockSaveOpen(true)}
                    className="px-5 py-2 rounded-xl text-xs font-black font-arabic bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{lang === "ar" ? "حفظ التغييرات" : "Save Changes"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation Modal for Saving Stock Adjustments */}
            {isConfirmStockSaveOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
                <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-right font-arabic" dir="rtl">
                  <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
                    <h3 className="text-sm font-black flex items-center gap-2">
                      <Save className="w-5 h-5 text-emerald-100" />
                      <span>{lang === "ar" ? "تأكيد حفظ تعديلات كميات المخزون" : "Confirm Stock Changes"}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsConfirmStockSaveOpen(false)}
                      className="text-white/80 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs font-bold leading-relaxed">
                      {lang === "ar"
                        ? `هل أنت تأكد من أنك تريد حفظ تعديلات الكميات الجديدة لعدد (${Object.keys(pendingStockAdjustments).length}) أصناف؟`
                        : `Are you sure you want to save the new stock quantities for (${Object.keys(pendingStockAdjustments).length}) items?`}
                    </div>

                    <p className="text-[11.5px] text-slate-600 font-medium">
                      {lang === "ar"
                        ? "سيتم تطبيق الرصيد المتاح الجديد بشكل فوري ودائم في المستودع وقاعدة البيانات."
                        : "The updated stock counts will be saved permanently in the database."}
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsConfirmStockSaveOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                      >
                        {lang === "ar" ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSaveStockAdjustments}
                        className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>{lang === "ar" ? "نعم، حفظ التغييرات" : "Yes, Save Changes"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Expiry Date Warnings (تنبيهات تاريخ الصلاحية) */}
            {activeAdminTab === "EXPIRIES" && (
            <div className="bg-white border border-slate-250 rounded-xl shadow-3xs overflow-hidden animate-fadeIn">
                <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl animate-bounce">📅</span>
                    <div>
                      <h3 className="text-sm font-black text-amber-955 font-arabic">
                        ⚠️ تنبيهات وفترات صلاحية الأدوية والمستلزمات
                      </h3>
                      <p className="text-[10.5px] text-amber-800 font-arabic mt-0.5">
                        كشف تلقائي مستمر بالأصناف واللقاحات التي تنتهي صلاحيتها خلال 90 يوماً أو أقل لاتخاذ الإجراءات
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab("MASTER")}
                      className="bg-white hover:bg-rose-100/80 text-rose-900 border border-rose-250 font-black px-3 py-1.5 rounded-lg text-xs font-arabic transition-all flex items-center gap-1 shadow-3xs cursor-pointer active:scale-98"
                    >
                      ← {lang === "ar" ? "العودة للمستودع الكلي" : "Back to master list"}
                    </button>
                    <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[10px] md:text-xs font-black px-3 py-1 pt-1.5 rounded-lg">
                      {lang === "ar"
                        ? "تنتهي قريباً / سارية"
                        : "Expiring Soon Tracker"}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-705 font-bold">
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-right">
                          {lang === "ar"
                            ? "اسم العلاج أو المستلزم"
                            : "Supply Item"}
                        </th>
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-center">
                          {lang === "ar" ? "القسم الفني" : "Category"}
                        </th>
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-center">
                          {lang === "ar" ? "الرصيد المتبقي" : "Stock"}
                        </th>
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-center">
                          {lang === "ar" ? "تاريخ انتهاء الصلاحية" : "Expiration"}
                        </th>
                        <th className="py-3 px-4 font-arabic text-center">
                          {lang === "ar" ? "الحالة والعد التنازلي" : "Status & Countdown"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {expiringItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-10 text-center text-slate-550 font-arabic bg-slate-50/20"
                          >
                            <div className="text-2xl mb-1.5">🛡️</div>
                            <p className="text-sm font-black text-emerald-700 font-arabic">
                              كافة تواريخ ومستندات الصلاحية آمنة ومستقرة!
                            </p>
                            <p className="text-xs text-slate-450 mt-1 font-arabic">
                              لا يوجد أي أدوية بمخزون المستشفى شارفت على انتهاء الصلاحية حالياً.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        expiringItems.map((item, idx) => {
                          const isAlternate = idx % 2 === 1;
                          let statusBg = "bg-yellow-50 text-yellow-800 border border-yellow-200";
                          let statusLabel = "";

                          if (item.isExpired) {
                            statusBg = "bg-rose-100 text-rose-800 border border-rose-200 font-black animate-pulse";
                            statusLabel = lang === "ar" ? "🚨 منتهي تماماً" : "🚨 Expired!";
                          } else if (item.daysRemaining <= 30) {
                            statusBg = "bg-orange-100 text-orange-900 border border-orange-200 font-black animate-pulse";
                            statusLabel = lang === "ar" ? `⚠️ ينتهي خلال ${item.daysRemaining} يوم` : `⚠️ Expiring in ${item.daysRemaining}d`;
                          } else {
                            statusLabel = lang === "ar" ? `قرب انتهاء الصلاحية (${item.daysRemaining} يوم)` : `Approaching expiry (${item.daysRemaining}d)`;
                          }

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors hover:bg-slate-100/70 ${isAlternate ? "bg-slate-50/50" : "bg-white"}`}
                            >
                              <td className="py-3 px-4 border-l border-slate-200/60 text-right">
                                <span className="font-extrabold text-slate-900 font-arabic block leading-snug">
                                  {lang === "ar" ? item.name_ar : item.name_en}
                                </span>
                                <span className="text-[10px] font-mono block mt-0.5 text-slate-400">
                                  ID: {item.id}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center border-l border-slate-200/60 font-arabic text-slate-600">
                                {lang === "ar" ? item.category_ar : item.category_en}
                              </td>
                              <td className="py-3 px-4 text-center border-l border-slate-200/60">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStockBreakdownItem(item)}
                                  title={lang === "ar" ? "اضغط لعرض تفاصيل تواريخ الصلاحية والكميات" : "Click to view stock breakdown by expiry dates"}
                                  className="font-mono font-bold text-slate-705 cursor-pointer hover:text-sky-605 hover:underline transition-all"
                                >
                                  {item.stock} {lang === "ar" ? "وحدة" : "units"}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-center border-l border-slate-200/60 font-mono font-bold text-slate-800">
                                {item.expiry_date ? item.expiry_date.replace(/-/g, "/") : "-"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10.5px] ${statusBg} font-arabic font-extrabold`}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* shortages table (جدول النواقص وبس) */}
              {activeAdminTab === "SHORTAGES" && (
                <div className="bg-white border border-slate-250 rounded-xl shadow-3xs overflow-hidden animate-fadeIn">
                  <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl animate-pulse">⚠️</span>
                      <div>
                        <h3 className="text-sm font-black text-rose-955 font-arabic">
                          🚨 كشف النواقص والعجز بالمستودع والعيادات
                        </h3>
                        <p className="text-[10.5px] text-rose-700 font-arabic mt-0.5 animate-pulse">
                          المستلزمات الطبية والأدوية النشطة التي تخطت حد الأمان
                          المعتمد للتنبيه والمطلوب توريدها فوراً
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveAdminTab("MASTER")}
                        className="bg-white hover:bg-rose-100/80 text-rose-900 border border-rose-250 font-black px-3 py-1.5 rounded-lg text-xs font-arabic transition-all flex items-center gap-1 shadow-3xs cursor-pointer active:scale-98"
                      >
                        ← {lang === "ar" ? "العودة للمستودع الكلي" : "Back to master list"}
                      </button>
                      <span className="bg-rose-150 border border-rose-200 text-rose-900 text-[10px] md:text-xs font-black px-3 py-1 pt-1.5 rounded-lg">
                        {lang === "ar"
                          ? "مستلزمات تحت حد الأمان"
                          : "Critical Shortages"}
                      </span>
                    </div>
                  </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-705 font-bold">
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-right">
                          {lang === "ar" ? "اسم العلاج أو المستلزم" : "Supply Item"}
                        </th>
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-center">
                          {lang === "ar" ? "القسم الفني" : "Category"}
                        </th>
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-center">
                          {lang === "ar" ? "الرصيد المتبقي" : "Stock"}
                        </th>
                        <th className="py-3 px-4 font-arabic border-l border-slate-200/60 text-center">
                          {lang === "ar" ? "حد الأمان" : "Safety Alert"}
                        </th>
                        <th className="py-3 px-4 font-arabic text-center">
                          {lang === "ar" ? "حالة العجز" : "Status & Alert"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {(() => {
                        const shortageItems = inventory.filter((item) => {
                          const threshold = itemThresholds[item.id] !== undefined ? itemThresholds[item.id] : 12;
                          return item.stock <= threshold;
                        });

                        if (shortageItems.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-10 text-center text-slate-550 font-arabic bg-slate-50/20"
                              >
                                <div className="text-2xl mb-1.5">🛡️</div>
                                <p className="text-sm font-black text-emerald-700 font-arabic">
                                  لا يوجد أي عجز أو نقص في المخزون!
                                </p>
                              </td>
                            </tr>
                          );
                        }

                        return shortageItems.map((item, idx) => {
                          const isAlternate = idx % 2 === 1;
                          const threshold = itemThresholds[item.id] !== undefined ? itemThresholds[item.id] : 12;
                          const deficit_percent = threshold > 0 ? Math.round(((threshold - item.stock) / threshold) * 100) : 100;
                          const isCritical = item.stock <= threshold / 3 || item.stock === 0;

                          return (
                            <tr
                              key={`${item.id}-${idx}`}
                              className={`transition-colors hover:bg-slate-100/70 ${isAlternate ? "bg-slate-50/50" : "bg-white"}`}
                            >
                              <td className="py-3 px-4 border-l border-slate-200/60 text-right">
                                <span className="font-extrabold text-slate-900 font-arabic block leading-snug">
                                  {lang === "ar" ? item.name_ar : item.name_en}
                                </span>
                                <span className="text-[10px] font-mono block mt-0.5 text-slate-400">
                                  ID: {item.id}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center border-l border-slate-200/60 font-arabic text-slate-600">
                                {lang === "ar" ? item.category_ar : item.category_en}
                              </td>
                              <td className="py-3 px-4 text-center border-l border-slate-200/60 text-rose-700 font-black font-mono">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStockBreakdownItem(item)}
                                  title={lang === "ar" ? "اضغط لعرض تفاصيل تواريخ الصلاحية والكميات" : "Click to view stock breakdown by expiry dates"}
                                  className="font-mono font-bold text-rose-700 cursor-pointer hover:text-sky-600 hover:underline transition-all"
                                >
                                  {item.stock}{" "}
                                  {lang === "ar" ? "وحدة متبقية" : "Units Left"}
                                </button>
                              </td>

                              <td className="py-3 px-4 text-center border-l border-slate-100 font-mono font-bold text-slate-500 font-medium font-arabic">
                                {threshold} {lang === "ar" ? "وحدة" : "units"}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-black font-arabic ${
                                    isCritical
                                      ? "bg-rose-600 text-white animate-pulse"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {item.stock === 0
                                    ? lang === "ar"
                                      ? "🚨 رصيد صفر"
                                      : "🚨 Out of Stock"
                                    : isCritical
                                      ? lang === "ar"
                                        ? `🚨 عجز حرج (-${deficit_percent}%)`
                                        : `🚨 Critical Deficit (-${deficit_percent}%)`
                                      : lang === "ar"
                                        ? `⚠️ عجز متوسط (-${deficit_percent}%)`
                                        : `⚠️ Medium Deficit (-${deficit_percent}%)`}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Invisible Print Container for physical printers */}
          <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none print:static print:w-full print:h-auto print:opacity-100 print:overflow-visible print:pointer-events-auto">
            <div
              id="printable-receipt-card"
              className={`bg-white p-6 text-slate-900 w-full max-w-[210mm] mx-auto print:max-w-full print:p-0 print:border-none print:shadow-none border border-slate-300 rounded-xl shadow-md font-sans ${
                printMode === "batch" ? "print:hidden" : ""
              }`}
            >
              {/* Formal Letterhead Header */}
              <div
                className="grid grid-cols-3 items-center border-b-2 border-slate-800 pb-4 mb-4"
                dir="ltr"
              >
                {/* Left visually: English details */}
                <div className="text-left font-sans">
                  <h2 className="text-xs md:text-sm font-black text-slate-900 tracking-tight leading-tight">
                    EL-SALAM HOSPITAL
                  </h2>
                  <p className="text-[9px] font-bold text-slate-505 mt-0.5">
                    76 Ahmed Esmat , Ain Shams
                  </p>
                </div>

                {/* Center visually: Hospital Logo */}
                <div className="flex justify-center">
                  <HospitalLogo className="w-10 h-10 md:w-12 md:h-12 shrink-0 aspect-square" />
                </div>

                {/* Right visually: Arabic details */}
                <div className="text-right">
                  <h2 className="text-xs md:text-sm font-black text-slate-900 font-arabic leading-tight">
                    مستشفى السلام
                  </h2>
                  <p className="text-[9px] font-bold text-slate-505 mt-0.5">
                    ٧٦ احمد عصمت عين شمس
                  </p>
                </div>
              </div>

              {/* Title of Document */}
              <div className="text-center my-6">
                <span className="bg-slate-100/90 text-slate-900 px-6 py-2 rounded-lg font-black text-sm uppercase tracking-wider border border-slate-300 font-arabic shadow-2xs">
                  {lang === "ar"
                    ? "كشف تجميعي بمستلزمات المريض"
                    : "Emergency Patient Supplies Voucher"}
                </span>
              </div>

              {/* Patient Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                      {lang === "ar" ? "اسم المريض:" : "Patient Name:"}
                    </span>
                    <span className="font-bold text-slate-800 font-arabic">
                      {(tempPrintRecord
                        ? tempPrintRecord.patient_name
                        : patientName) ||
                        (lang === "ar" ? "[لم يحدد]" : "[No Name]")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                      {lang === "ar"
                        ? "رقم المرجع للفاتورة:"
                        : "Voucher Ref No:"}
                    </span>
                    <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {tempPrintRecord
                        ? tempPrintRecord.receipt_number
                        : receiptNumber}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                      {lang === "ar"
                        ? "تاريخ ووقت المعاملة:"
                        : "Intake Timestamp:"}
                    </span>
                    <span className="font-bold text-slate-700">
                      {new Date(
                        tempPrintRecord
                          ? tempPrintRecord.created_at
                          : Date.now(),
                      ).toLocaleDateString(
                        lang === "ar" ? "ar-EG" : "en-US",
                      )}{" "}
                      —{" "}
                      {new Date(
                        tempPrintRecord
                          ? tempPrintRecord.created_at
                          : Date.now(),
                      ).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                      {lang === "ar" ? "المسؤول المالي:" : "Billing Officer:"}
                    </span>
                    <span className="font-semibold text-slate-705 bg-white px-2 py-0.5 rounded border border-slate-200 font-arabic">
                      {getUserName(
                        tempPrintRecord
                          ? tempPrintRecord.billing_officer_email
                          : currentUser?.email || "Antonymohab@gmail.com",
                        lang,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formal Table of Items */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-right border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-3 text-right font-arabic border-r border-slate-300 w-10">
                        #
                      </th>
                      <th className="py-2.5 px-3 text-right font-arabic border-r border-slate-300">
                        {lang === "ar"
                          ? "المستلزم الطبي"
                          : "Medical Item / Supply"}
                      </th>
                      <th className="py-2.5 px-3 text-center font-arabic border-r border-slate-300">
                        {lang === "ar" ? "سعر المفرد" : "Unit Price"}
                      </th>
                      <th className="py-2.5 px-3 text-center font-arabic border-r border-slate-300 w-16">
                        {lang === "ar" ? "الكمية" : "Qty"}
                      </th>
                      <th className="py-2.5 px-3 text-left font-arabic">
                        {lang === "ar" ? "الإجمالي" : "Total Price"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-250">
                    {(tempPrintRecord
                      ? tempPrintRecord.invoice_lines
                      : invoiceLines
                    ).map((line, index) => (
                      <tr key={`${line.item_id}-${index}`} className="text-slate-800">
                        <td className="py-2 px-3 text-right border-r border-slate-250 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-250 font-arabic font-bold">
                          {lang === "ar"
                            ? line.item_name_ar
                            : line.item_name_en}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-250 font-mono font-bold text-slate-700">
                          {formatCurrency(line.unit_price, lang)}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-250 font-bold font-mono">
                          {formatArabicDigits(line.quantity, lang)}
                        </td>
                        <td className="py-2 px-3 text-left font-bold font-mono select-all text-slate-900">
                          {formatCurrency(line.line_total, lang)}
                        </td>
                      </tr>
                    ))}
                    {/* Grand Total Row inside table for professional financial finish */}
                    <tr className="bg-slate-50/90 font-black border-t-2 border-slate-400">
                      <td
                        colSpan={3}
                        className="py-3 px-3 text-right border-r border-slate-300 font-arabic text-xs"
                      >
                        {lang === "ar"
                          ? "القيمة الكلية للاستحقاق:"
                          : "Grand Voucher Total Cost:"}
                      </td>
                      <td className="py-3 px-3 text-center border-r border-slate-300 font-mono text-xs">
                        {formatArabicDigits(
                          (tempPrintRecord
                            ? tempPrintRecord.invoice_lines
                            : invoiceLines
                          ).reduce((acc, l) => acc + l.quantity, 0),
                          lang,
                        )}
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-emerald-700 text-xs">
                        {formatCurrency(
                          tempPrintRecord
                            ? tempPrintRecord.grand_total
                            : calculatedTotals,
                          lang,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Currency Written Word & Department confirmation */}
              <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/55 mb-6 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-450 block font-arabic">
                    {lang === "ar" ? "فقط وقدره:" : "Written Amount:"}
                  </span>
                  <span className="font-bold text-slate-800 font-arabic italic">
                    "
                    {translateNumberToCurrencyWords(
                      tempPrintRecord
                        ? tempPrintRecord.grand_total
                        : calculatedTotals,
                      lang,
                    )}
                    "
                  </span>
                </div>
                <div className="text-right border-t sm:border-t-0 sm:border-r border-slate-200 pt-2 sm:pt-0 sm:pr-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-arabic">
                    {""}
                  </span>
                  <span className="font-black text-emerald-600 font-arabic flex items-center justify-end gap-1">
                    {""}
                  </span>
                </div>
              </div>
            </div>

            {printMode === "batch" && (
              <div
                id="printable-batch-receipts"
                className="w-full max-w-[210mm] mx-auto space-y-12 bg-white text-slate-900 print:text-black"
              >
                {batchInvoices.map((invoice, bIdx) => {
                  const invoiceTotals = invoice.invoice_lines.reduce(
                    (acc, l) => acc + l.line_total,
                    0,
                  );
                  const qValTotal = invoice.invoice_lines.reduce(
                    (acc, l) => acc + l.quantity,
                    0,
                  );
                  return (
                    <div
                      key={invoice.receipt_number + "-" + bIdx}
                      className="printable-batch-page bg-white p-6 text-slate-900 w-full border border-slate-300 rounded-xl shadow-none font-sans print:border-none print:p-0 print:m-0 print:shadow-none"
                    >
                      {/* Formal Letterhead Header */}
                      <div
                        className="grid grid-cols-3 items-center border-b-2 border-slate-800 pb-4 mb-4"
                        dir="ltr"
                      >
                        {/* Left visually: English details */}
                        <div className="text-left font-sans">
                          <h2 className="text-xs md:text-sm font-black text-slate-900 tracking-tight leading-tight">
                            EL-SALAM HOSPITAL
                          </h2>
                          <p className="text-[9px] font-bold text-slate-505 mt-0.5">
                            76 Ahmed Esmat , Ain Shams
                          </p>
                        </div>

                        {/* Center visually: Hospital Logo */}
                        <div className="flex justify-center">
                          <HospitalLogo className="w-10 h-10 md:w-12 md:h-12 shrink-0 aspect-square" />
                        </div>

                        {/* Right visually: Arabic details */}
                        <div className="text-right">
                          <h2 className="text-xs md:text-sm font-black text-slate-900 font-arabic leading-tight">
                            مستشفى السلام
                          </h2>
                          <p className="text-[9px] font-bold text-slate-505 mt-0.5">
                            ٧٦ احمد عصمت عين شمس
                          </p>
                        </div>
                      </div>

                      {/* Title of Document */}
                      <div className="text-center my-6 animate-fadeIn">
                        <span className="bg-slate-100 text-slate-900 px-6 py-2 rounded-lg font-black text-sm uppercase tracking-wider border border-slate-300 font-arabic">
                          {lang === "ar"
                            ? "كشف تجميعي بمستلزمات المريض"
                            : "Emergency Patient Supplies Voucher"}
                        </span>
                      </div>

                      {/* Patient Metadata Grid */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
                        <div className="space-y-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <span className="font-bold text-slate-800 font-arabic">
                              {invoice.patient_name ||
                                (lang === "ar" ? "[لم يحدد]" : "[No Name]")}
                            </span>
                            <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                              {lang === "ar"
                                ? "اسم الحضور / المريض:"
                                : "Patient Name:"}
                            </span>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <span className="font-bold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                              {invoice.receipt_number}
                            </span>
                            <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                              {lang === "ar"
                                ? "رقم المرجع للفاتورة:"
                                : "Voucher Ref No:"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <span className="font-bold text-slate-700">
                              {new Date(invoice.created_at).toLocaleDateString(
                                lang === "ar" ? "ar-EG" : "en-US",
                              )}{" "}
                              —{" "}
                              {new Date(invoice.created_at).toLocaleTimeString(
                                lang === "ar" ? "ar-EG" : "en-US",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                            <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                              {lang === "ar"
                                ? "تاريخ ووقت المعاملة:"
                                : "Intake Timestamp:"}
                            </span>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <span className="font-semibold text-slate-705 bg-white px-2 py-0.5 rounded border border-slate-200 font-arabic">
                              {getUserName(invoice.billing_officer_email, lang)}
                            </span>
                            <span className="text-slate-450 font-bold font-arabic whitespace-nowrap">
                              {lang === "ar"
                                ? "منفذ الصرف المالي:"
                                : "Billing Officer:"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Formal Table of Items */}
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-right border-collapse text-xs border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                              <th className="py-2.5 px-3 text-right font-arabic border-r border-slate-300 w-10">
                                #
                              </th>
                              <th className="py-2.5 px-3 text-right font-arabic border-r border-slate-300">
                                {lang === "ar"
                                  ? "المستلزم الطبي المستهلك"
                                  : "Medical Item / Supply"}
                              </th>
                              <th className="py-2.5 px-3 text-center font-arabic border-r border-slate-300">
                                {lang === "ar" ? "سعر الوحدة" : "Unit Price"}
                              </th>
                              <th className="py-2.5 px-3 text-center font-arabic border-r border-slate-300 w-16">
                                {lang === "ar" ? "الكمية" : "Qty"}
                              </th>
                              <th className="py-2.5 px-3 text-left font-arabic">
                                {lang === "ar"
                                  ? "القيمة الإجمالية"
                                  : "Total Price"}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-250">
                            {invoice.invoice_lines.map((line, index) => (
                              <tr
                                key={line.item_id + "-" + index}
                                className="text-slate-800"
                              >
                                <td className="py-2 px-3 text-center border-r border-slate-250 font-mono">
                                  {index + 1}
                                </td>
                                <td className="py-2 px-3 text-right border-r border-slate-250 font-arabic font-bold text-slate-800 font-arabic">
                                  {lang === "ar"
                                    ? line.item_name_ar
                                    : line.item_name_en}
                                </td>
                                <td className="py-2 px-3 text-center border-r border-slate-250 font-mono font-bold text-slate-700">
                                  {formatCurrency(line.unit_price, lang)}
                                </td>
                                <td className="py-2 px-3 text-center border-r border-slate-250 font-bold font-mono">
                                  {formatArabicDigits(line.quantity, lang)}
                                </td>
                                <td className="py-2 px-3 text-left font-bold font-mono select-all text-slate-900">
                                  {formatCurrency(line.line_total, lang)}
                                </td>
                              </tr>
                            ))}
                            {/* Grand Total Row inside table for professional financial finish */}
                            <tr className="bg-slate-50/90 font-black border-t-2 border-slate-400">
                              <td
                                colSpan={3}
                                className="py-3 px-3 text-right border-r border-slate-300 font-arabic text-xs font-bold font-arabic"
                              >
                                {lang === "ar"
                                  ? "إجمالي كلفة المستلزمات (الصافي):"
                                  : "Grand Voucher Total Cost:"}
                              </td>
                              <td className="py-3 px-3 text-center border-r border-slate-300 font-mono text-xs font-bold leading-none">
                                {formatArabicDigits(qValTotal, lang)}
                              </td>
                              <td className="py-3 px-3 text-left font-mono text-emerald-705 text-xs text-emerald-700 font-bold font-mono">
                                {formatCurrency(invoiceTotals, lang)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Currency Written Word & Department confirmation */}
                      <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50 mb-6 text-xs text-right">
                        <div className="w-full text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-arabic">
                            {lang === "ar" ? "فقط وقدره:" : "Written Amount:"}
                          </span>
                          <span className="font-bold text-slate-800 font-arabic italic">
                            "
                            {translateNumberToCurrencyWords(
                              invoiceTotals,
                              lang,
                            )}
                            "
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ==================== INTAKE SAVE & PRINT OVERLAY MODAL ==================== */}
      <AnimatePresence>
        {pendingSaveConfirmation && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-250 w-full max-w-md overflow-hidden flex flex-col font-sans"
            >
              {/* Header */}
              <div className="bg-hospital-blue text-white p-4 flex items-center gap-2">
                <Coins className="w-5 h-5 animate-pulse" />
                <h3 className="text-sm font-black font-arabic">
                  {lang === "ar"
                    ? "تأكيد فحص المعاملة وحفظ الإيصال"
                    : "Confirm Receipt & Save Options"}
                </h3>
              </div>

              {/* Patient and Financial Breakdown */}
              <div className="p-5 space-y-3.5 text-right font-arabic">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "ar"
                    ? "يرجى اختيار طريقة إتمام وحفظ المعاملة بالفاتورة في أرشيف الخزينة والمخزن:"
                    : "Please select your preferred saving & printing option for the checkout register:"}
                </p>

                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">
                      {lang === "ar" ? "اسم المريض:" : "Patient Name:"}
                    </span>
                    <span className="font-bold text-slate-800">
                      {patientName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">
                      {lang === "ar" ? "رقم المرجع اليدوي:" : "Receipt Ref:"}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {receiptNumber}
                    </span>
                  </div>
                  {/* Total Invoice Amount in a dedicated box - large, bold, and red */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center text-right my-2 shadow-3xs animate-fadeIn">
                    <span className="text-red-800 font-extrabold text-xs">
                      {lang === "ar"
                        ? "الحساب الكلي (المستحق):"
                        : "Invoice Total:"}
                    </span>
                    <span className="font-black text-red-650 font-mono text-xl shrink-0">
                      {formatCurrency(calculatedTotals, lang)}
                    </span>
                  </div>

                  {/* Cash Settlement accounting inside the Modal */}
                  <div className="flex flex-col gap-1.5 border-t border-slate-200/60 pt-2.5">
                    <label className="block text-[11px] font-black text-slate-650 font-arabic text-right">
                      {lang === "ar"
                        ? "المبلغ المستلم من العميل / المريض"
                        : "Amount Received from Patient"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={
                          lang === "ar"
                            ? `${calculatedTotals} ج.م`
                            : `${calculatedTotals} EGP`
                        }
                        value={amountPaid}
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value);
                          setAmountPaid(isNaN(val as number) ? "" : val);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs text-right font-mono border border-slate-200 rounded-md focus:border-hospital-blue focus:ring-1 focus:ring-hospital-blue/10 outline-none text-slate-800 transition-all font-arabic font-bold"
                      />
                      <span className="absolute left-2.5 top-1.5 font-arabic text-[10px] font-bold text-slate-400">
                        {lang === "ar" ? "ج.م" : "EGP"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-slate-200/60 pt-2 bg-emerald-50/40 -mx-3.5 px-3.5 py-1">
                    {amountPaid === "" ? (
                      <>
                        <span className="text-emerald-800 font-bold">
                          {lang === "ar"
                            ? "المرتجع للمريض / الباقي له (فاضل كام):"
                            : "Change Due:"}
                        </span>
                        <span className="font-black text-emerald-700 font-mono">
                          {formatCurrency(0, lang)}
                        </span>
                      </>
                    ) : amountPaid >= calculatedTotals ? (
                      <>
                        <span className="text-emerald-800 font-bold">
                          {lang === "ar"
                            ? "المرتجع للمريض / الباقي له (فاضل كام):"
                            : "Change Due:"}
                        </span>
                        <span className="font-black text-emerald-700 font-mono">
                          {formatCurrency(amountPaid - calculatedTotals, lang)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-800 font-bold">
                          {lang === "ar"
                            ? "المتبقي غير المدفوع (عجز):"
                            : "Remaining Unpaid:"}
                        </span>
                        <span className="font-black text-rose-700 font-mono">
                          {formatCurrency(calculatedTotals - amountPaid, lang)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex flex-col sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCommitToDatabase(true);
                    setPendingSaveConfirmation(false);
                  }}
                  className="sm:flex-1 py-1.5 px-4 bg-hospital-blue hover:bg-sky-750 text-white rounded-lg font-bold text-xs transition-all cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span className="text-center leading-tight">
                    {lang === "ar" ? (
                      <>
                        حفظ وطباعة
                        <br />
                        الفاتورة
                      </>
                    ) : (
                      "Save & Print Receipt"
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCommitToDatabase(false);
                    setPendingSaveConfirmation(false);
                  }}
                  className="sm:flex-1 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="text-center leading-tight">
                    {lang === "ar" ? (
                      <>
                        حفظ فقط
                        <br />
                        (بدون طباعة)
                      </>
                    ) : (
                      "Save Only (No Print)"
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingSaveConfirmation(false)}
                  className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-700 text-xs transition-all cursor-pointer font-arabic active:scale-98 flex items-center justify-center"
                >
                  {lang === "ar" ? "التراجع" : "Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== INTAKE TAB CLOSE CONFIRMATION POPUP MODAL ==================== */}
      <AnimatePresence>
        {sessionClosePendingId &&
          (() => {
            const sToClose = sessions.find(
              (s) => s.id === sessionClosePendingId,
            );
            const nameToClose =
              sToClose && sToClose.patientName.trim()
                ? sToClose.patientName.trim()
                : lang === "ar"
                  ? "فاتورة جديدة فارغة"
                  : "Unassigned Receipt";
            return (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-xl shadow-2xl border border-slate-250 w-full max-w-sm overflow-hidden flex flex-col font-sans hover:shadow-3xl transition-all"
                >
                  {/* Header */}
                  <div className="bg-rose-600 text-white p-4 flex items-center gap-2 shadow-xs">
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                    <h3 className="text-sm font-black font-arabic">
                      {lang === "ar"
                        ? "🏥 تأكيد إغلاق الفاتورة"
                        : "Confirm Tab Close"}
                    </h3>
                  </div>

                  {/* Sub-body details */}
                  <div className="p-5 text-right font-arabic space-y-3.5">
                    <p className="text-xs text-slate-800 leading-relaxed font-black">
                      {lang === "ar"
                        ? "هل أنت متأكد من رغبتك في إغلاق هذه الفاتورة؟"
                        : "Are you sure you want to close this transaction tab?"}
                    </p>

                    <div className="bg-rose-50/70 border border-rose-150 rounded-lg p-3 text-right">
                      <span className="block text-[10px] text-slate-400 font-bold mb-1">
                        {lang === "ar"
                          ? "اسم الفاتورة المفتوحة:"
                          : "Active tab patient:"}
                      </span>
                      <span className="font-extrabold text-xs text-rose-700">
                        {nameToClose}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-snug">
                      {lang === "ar"
                        ? "⚠️ تنبيه: سيتم حذف كافة المستندات والبيانات المدرجة بهذه الفاتورة فور إغلاقها."
                        : "⚠️ Warning: Any temporary items registered inside this tab will be cleared."}
                    </p>
                  </div>

                  {/* Modal actions */}
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmCloseSession(sessionClosePendingId)}
                      className="flex-1 py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{lang === "ar" ? "إغلاق" : "Close"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionClosePendingId(null)}
                      className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-bold font-arabic transition-all cursor-pointer active:scale-98 flex items-center justify-center"
                    >
                      {lang === "ar" ? "التراجع" : "Cancel"}
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>

      {/* ==================== LEDGER INVOICE DELETION CONFIRMATION POPUP MODAL ==================== */}
      <AnimatePresence>
        {deleteHistoryPendingIndex !== null &&
          (() => {
            const record = history[deleteHistoryPendingIndex];
            if (!record) return null;
            return (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-xl shadow-2xl border border-slate-250 w-full max-w-sm overflow-hidden flex flex-col font-sans hover:shadow-3xl transition-all"
                >
                  {/* Header */}
                  <div className="bg-red-600 text-white p-4 flex items-center gap-2 shadow-xs">
                    <Trash2 className="w-5 h-5 text-red-100" />
                    <h3 className="text-sm font-black font-arabic">
                      {lang === "ar"
                        ? "🏥 تأكيد حذف الفاتورة"
                        : "Confirm Invoice Deletion"}
                    </h3>
                  </div>

                  {/* Sub-body details */}
                  <div className="p-5 text-right font-arabic space-y-3.5">
                    <p className="text-xs text-slate-800 leading-relaxed font-black mb-2">
                      {lang === "ar"
                        ? `هل أنت متأكد أنك تريد حذف الفاتورة رقم (${record.receipt_number}) باسم المريض (${record.patient_name})؟`
                        : `Are you sure you want to delete the invoice with number (${record.receipt_number}) and name (${record.patient_name})?`}
                    </p>

                    <div className="bg-red-50/75 border border-red-200 rounded-lg p-3 text-right space-y-2">
                      <div>
                        <span className="block text-[9px] text-slate-450 font-bold mb-0.5">
                          {lang === "ar"
                            ? "رقم الفاتورة المرجعي:"
                            : "Invoice Reference Number:"}
                        </span>
                        <span className="font-extrabold text-xs text-red-700 font-mono bg-white px-1.5 py-0.5 rounded border border-red-150">
                          {record.receipt_number}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-455 font-bold mb-0.5">
                          {lang === "ar"
                            ? "اسم الحضور / المريض:"
                            : "Patient Name:"}
                        </span>
                        <span className="font-extrabold text-xs text-slate-800">
                          {record.patient_name}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-455 font-bold mb-0.5">
                          {lang === "ar"
                            ? "القيمة الكلية المدفوعة:"
                            : "Invoice Total Cost:"}
                        </span>
                        <span className="font-extrabold text-xs text-hospital-blue font-mono">
                          {formatCurrency(record.grand_total, lang)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-snug">
                      {lang === "ar"
                        ? "⚠️ تنبيه: سيتم حذف كافة المستندات المدرجة بهذه الفاتورة وإرجاع كميات المستلزمات الطبية تلقائياً إلى رصيد المخزون فور تأكيد الإجراء."
                        : "⚠️ Warning: Deleting will automatically reverse item allocations and return quantities back to live warehouse stock."}
                    </p>
                  </div>

                  {/* Modal actions */}
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        executeDeleteFromHistory(deleteHistoryPendingIndex);
                        setDeleteHistoryPendingIndex(null);
                        // If delete was done while on Detail view page, return to ledger archive index
                        if (activePage === "DETAIL") {
                          setSelectedDetailInvoiceIndex(null);
                          setActivePage("ARCHIVE"); // Return to archive page
                        }
                      }}
                      className="flex-1 py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>
                        {lang === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteHistoryPendingIndex(null)}
                      className="py-1.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-bold font-arabic transition-all cursor-pointer active:scale-98 flex items-center justify-center"
                    >
                      {lang === "ar" ? "التراجع" : "Cancel"}
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>

      {/* ==================== DAILY SYSTEM AUTO-BACKUP PROMPT ==================== */}
      <AnimatePresence>
        {showBackupPrompt && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-250 w-full max-w-md overflow-hidden flex flex-col font-sans hover:shadow-3xl transition-all"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="bg-hospital-blue text-white p-4 flex items-center gap-2 shadow-xs">
                <Database className="w-5 h-5 text-sky-100 shrink-0" />
                <h3 className="text-sm font-black font-arabic">
                  {lang === "ar"
                    ? "🏥 النسخة الاحتياطية التلقائية اليومية"
                    : "🏥 Daily System Auto-Backup"}
                </h3>
              </div>

              {/* Body details */}
              <div className={`p-5 ${lang === "ar" ? "text-right" : "text-left"} font-arabic space-y-4`}>
                <p className="text-xs text-slate-800 leading-relaxed font-black">
                  {lang === "ar"
                    ? "لضمان حماية سجل فواتير الطوارئ والاستقبال وأرصدة ومستويات أسعار المستلزمات الطبية بمستشفى السلام، تم تجهيز ملف النسخة الاحتياطية لليوم لتنزيله وحفظه بأمان."
                    : "To ensure your emergency billing records and complete medical supplies warehouse stock levels are fully protected, today's system backup snapshot is ready."}
                </p>

                {/* Statistics panel */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-505 font-bold">
                      {lang === "ar" ? "مستلزمات المخزن:" : "Inventory Stock Items:"}
                    </span>
                    <span className="font-extrabold text-[#0284c7] font-mono bg-white px-2 py-0.5 rounded border border-slate-205">
                      {lang === "ar" ? formatArabicDigits(inventory.length, lang) : inventory.length} {lang === "ar" ? "مستلزم" : "items"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-505 font-bold">
                      {lang === "ar" ? "سجل فواتير التحصيل:" : "Ledger Invoices History:"}
                    </span>
                    <span className="font-extrabold text-emerald-600 font-mono bg-white px-2 py-0.5 rounded border border-slate-205">
                      {lang === "ar" ? formatArabicDigits(history.length, lang) : history.length} {lang === "ar" ? "فاتورة" : "invoices"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-505 font-bold">
                      {lang === "ar" ? "مشغلي النظام الفعالين:" : "Joined System Operators:"}
                    </span>
                    <span className="font-extrabold text-purple-600 font-mono bg-white px-2 py-0.5 rounded border border-slate-205">
                      {lang === "ar" ? formatArabicDigits(operators.length, lang) : operators.length} {lang === "ar" ? "مشغل" : "roles"}
                    </span>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 leading-snug">
                  {lang === "ar"
                    ? "⚠️ تنبيه: هذه الخطوة تحفظ قاعدة البيانات المشفرة بصيغة (JSON) على وحدة التخزين المحلية بجهازك، ويمكن استعادتها بأي وقت لحماية نظام الطوارئ من الفقدان المفاجئ."
                    : "⚠️ Notice: This exports your entire database into a clean (JSON) snapshot file saved local to this device to protect your clinical workspace."}
                </p>
              </div>

              {/* Modal actions */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex gap-2">
                <button
                  type="button"
                  onClick={triggerBackupDownload}
                  className="flex-1 py-2 px-4 bg-hospital-blue hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer font-arabic flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>
                    {lang === "ar" ? "تنزيل وحفظ النسخة الاحتياطية" : "Download & Secure Backup"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={dismissBackupPrompt}
                  className="py-2 px-4 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-bold font-arabic transition-all cursor-pointer active:scale-98 flex items-center justify-center"
                >
                  {lang === "ar" ? "تذكيري غداً" : "Remind Me Tomorrow"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== OUTGOING SMTP TRANSACTIONAL EMAIL VIEW POPUP ==================== */}
      <AnimatePresence>
        {activeEmailDetailId &&
          (() => {
            const email = dispatchedEmails.find(
              (em) => em.id === activeEmailDetailId,
            );
            if (!email) return null;
            return (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-905/75 backdrop-blur-xs flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                  {/* Email Client Top Bar */}
                  <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-mono text-slate-400 ml-2">
                        Secure SMTP Inspector v14.08.2
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveEmailDetailId(null)}
                      className="text-slate-400 hover:text-white transition-colors text-lg font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Email Envelope Headers */}
                  <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-2 text-left">
                    <div className="flex text-xs leading-none">
                      <span className="font-bold text-slate-500 w-12 shrink-0">
                        Subject:
                      </span>
                      <span className="text-slate-800 font-bold font-arabic">
                        {email.subject}
                      </span>
                    </div>
                    <div className="flex text-xs leading-none font-mono">
                      <span className="font-bold text-slate-500 w-12 shrink-0">
                        From:
                      </span>
                      <span className="text-slate-800">{email.sender}</span>
                    </div>
                    <div className="flex text-xs leading-none font-mono">
                      <span className="font-bold text-slate-500 w-12 shrink-0">
                        To:
                      </span>
                      <span className="text-slate-800 font-bold">
                        {email.recipient} (Super Admin)
                      </span>
                    </div>
                    <div className="flex text-xs leading-none font-mono">
                      <span className="font-bold text-slate-500 w-12 shrink-0">
                        Date:
                      </span>
                      <span className="text-slate-650">
                        {new Date(email.sent_at).toLocaleDateString()} —{" "}
                        {new Date(email.sent_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Email Body Frame */}
                  <div className="p-6 overflow-y-auto bg-slate-100 flex-1 max-h-[50vh]">
                    <div className="bg-white rounded-lg p-1.5 shadow-sm">
                      <div
                        dangerouslySetInnerHTML={{ __html: email.body_html }}
                      />
                    </div>
                  </div>

                  {/* Interactive Reorder Actions Panel inside the Email Client */}
                  <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        LOGISTICS STATUS
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-xs font-bold text-rose-700 font-arabic">
                          انتهاك معايير حد الأمان
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveEmailDetailId(null)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded font-bold text-slate-700 text-xs transition-all cursor-pointer font-arabic"
                      >
                        {lang === "ar" ? "إغلاق الرسالة" : "Close Inbox"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Rapid Resupply (+150 stock)
                          const itemToResupply = inventory.find(
                            (it) => it.id === email.triggered_by_item_id,
                          );
                          if (itemToResupply) {
                            const updated = inventory.map((it) =>
                              it.id === itemToResupply.id
                                ? { ...it, stock: it.stock + 150 }
                                : it,
                            );
                            saveInventoryToCache(updated);

                            setSaveSuccessMessage(
                              lang === "ar"
                                ? `✓ تم تلبية أمر التوريد العاجل لـ "${itemToResupply.name_ar}" بنجاح! تم شحن (+150 وحدة).`
                                : `✓ Triage supply alert resolved! Added (+150 stock units) to "${itemToResupply.name_en}".`,
                            );
                            setTimeout(() => setSaveSuccessMessage(null), 4000);
                          }
                          setActiveEmailDetailId(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition-all cursor-pointer font-arabic flex items-center gap-1.5"
                      >
                        <span>
                          ⚡{" "}
                          {lang === "ar"
                            ? "توريد عاجل (+150 وحدة)"
                            : "Rapid Resupply (+150 Units)"}
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}

        {/* ==================== STOCK EXPIRY BREAKDOWN MODAL ==================== */}
        {selectedStockBreakdownItem && (() => {
          const item = selectedStockBreakdownItem;
          const batches = getProductBatches(item);
          
          // Calculate summary counts
          const totalStock = item.stock;
          const expiredQty = batches.filter(b => b.status === "EXPIRED").reduce((sum, b) => sum + b.qty, 0);
          const approachingQty = batches.filter(b => b.status === "APPROACHING").reduce((sum, b) => sum + b.qty, 0);
          const validQty = batches.filter(b => b.status === "VALID").reduce((sum, b) => sum + b.qty, 0);
          const noneQty = batches.filter(b => b.status === "NONE").reduce((sum, b) => sum + b.qty, 0);

          return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-xl shadow-2xl border border-slate-250 w-full max-w-lg overflow-hidden flex flex-col font-sans text-right"
              >
                {/* Header */}
                <div className="bg-sky-700 text-white p-4 relative flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedStockBreakdownItem(null)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1 hover:bg-white/10 rounded transition-colors cursor-pointer z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center justify-center gap-2 text-center px-8">
                    <ClipboardList className="w-5 h-5 font-bold shrink-0" />
                    <h3 className="text-sm md:text-base font-black font-arabic tracking-tight">
                      {lang === "ar" ? "تفاصيل الصلاحية وتوزيع المخزون بحسب الشحنات" : "Stock Expiry Breakdown"}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4 font-arabic">
                  {/* Product Details Header */}
                  <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5 shadow-2xs">
                    <div className="grid grid-cols-12 items-center gap-2 font-arabic">
                      <div className="col-span-8 text-center font-black text-slate-900 text-sm">
                        {lang === "ar" ? item.name_ar : item.name_en}
                      </div>
                      <div className="col-span-4 text-right text-slate-400 font-bold">
                        {lang === "ar" ? ": اسم الصنف" : ": Item Name"}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2 font-mono">
                      <div className="col-span-8 text-center font-bold text-slate-700">
                        {item.id}
                      </div>
                      <div className="col-span-4 text-right text-slate-400 font-bold font-arabic">
                        {lang === "ar" ? ": كود الصنف" : ": Item ID"}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2 font-arabic">
                      <div className="col-span-8 text-center font-bold text-slate-800">
                        {lang === "ar" ? item.category_ar : item.category_en}
                      </div>
                      <div className="col-span-4 text-right text-slate-400 font-bold">
                        {lang === "ar" ? ": التصنيف الرئيسي" : ": Category"}
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar - Order matched to screenshot (Expired -> Near Expiry -> Valid -> Total Stock) */}
                  <div className="grid grid-cols-4 gap-2.5 text-center select-none shadow-3xs font-arabic">
                    <div className="bg-rose-50/80 rounded-xl p-2.5 border border-rose-100">
                      <span className="text-[10px] text-rose-600 font-extrabold block">
                        {lang === "ar" ? "منتهي" : "Expired"}
                      </span>
                      <span className="text-base font-black text-rose-600 font-mono block mt-0.5">
                        {expiredQty}
                      </span>
                    </div>
                    <div className="bg-amber-50/80 rounded-xl p-2.5 border border-amber-100">
                      <span className="text-[10px] text-amber-600 font-extrabold block">
                        {lang === "ar" ? "ينتهي قريباً" : "Near Expiry"}
                      </span>
                      <span className="text-base font-black text-amber-700 font-mono block mt-0.5">
                        {approachingQty}
                      </span>
                    </div>
                    <div className="bg-emerald-50/80 rounded-xl p-2.5 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 font-extrabold block">
                        {lang === "ar" ? "صالح وآمن" : "Valid & Safe"}
                      </span>
                      <span className="text-base font-black text-emerald-700 font-mono block mt-0.5">
                        {validQty + noneQty}
                      </span>
                    </div>
                    <div className="bg-slate-100/80 rounded-xl p-2.5 border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-extrabold block">
                        {lang === "ar" ? "الرصيد الكلي" : "Total Stock"}
                      </span>
                      <span className="text-base font-black text-slate-800 font-mono block mt-0.5">
                        {totalStock}
                      </span>
                    </div>
                  </div>

                  {/* Batches list */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest block text-right border-b border-slate-150 pb-1">
                      {lang === "ar" ? "تفاصيل شحنات التوريد المسجلة بالمخزن" : "Stock Batches Breakdown"}
                    </h4>

                    {batches.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        {lang === "ar" ? "لا توجد شحنات مسجلة لهذا الصنف!" : "No recorded batches found!"}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                        {batches.map((batch, index) => {
                          const isExpired = batch.status === "EXPIRED";
                          const isApproaching = batch.status === "APPROACHING";
                          const isNoExpiry = batch.status === "NONE";

                          let textStatus = "";
                          let badgeStyle = "";
                          if (isExpired) {
                            textStatus = lang === "ar" ? "منتهي الصلاحية" : "Expired";
                            badgeStyle = "bg-rose-100 text-rose-800 border-rose-200";
                          } else if (isApproaching) {
                            textStatus = lang === "ar" ? "قاربت الصلاحية" : "Near Expiry";
                            badgeStyle = "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
                          } else if (isNoExpiry) {
                            textStatus = lang === "ar" ? "مستلزم عام" : "No Expiry Req.";
                            badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
                          } else {
                            textStatus = lang === "ar" ? "صالح للاستخدام" : "Valid";
                            badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                          }

                          return (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-3 rounded-lg border text-xs gap-3 transition-colors ${
                                isExpired ? "bg-rose-50/40 border-rose-150" : isApproaching ? "bg-amber-50/30 border-amber-150" : "bg-slate-50/50 border-slate-200"
                              }`}
                            >
                              {/* Batch count and StatusBadge */}
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${badgeStyle}`}>
                                  {textStatus}
                                </span>
                                
                                {batch.expiry && (
                                  <span className="text-[10px] text-slate-400 font-semibold font-sans">
                                    {isExpired ? (
                                      lang === "ar" ? "منتهي بالفعل" : "Expired"
                                    ) : (
                                      lang === "ar" ? `متبقي ${batch.daysRemaining} يوم` : `${batch.daysRemaining} days left`
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Batch Expiry & Origin details */}
                              <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-xs font-black font-mono text-slate-800">
                                    {batch.qty} {lang === "ar" ? "علبة / وحدة" : "units"}
                                  </span>
                                  <span className="text-slate-350 select-none">·</span>
                                  <span className="text-xs font-extrabold text-[#0284c7]">
                                    {batch.expiry ? batch.expiry.replace(/-/g, "/") : (lang === "ar" ? "بدون تاريخ" : "No Expiry")}
                                  </span>
                                </div>
                                <div className="text-[9.5px] mt-0.5 text-slate-430 font-semibold">
                                  {lang === "ar" ? "مصدر الشحنة: " : "Batch Source: "}
                                  <span className="font-mono bg-slate-100 px-1 rounded border border-slate-200 text-slate-600">
                                    {batch.source === "INITIAL" 
                                      ? (lang === "ar" ? "الرصيد الافتتاحي المبدئي" : "Initial Stock")
                                      : `${batch.source}`
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer close */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedStockBreakdownItem(null)}
                    className="px-5 py-2 bg-white hover:bg-slate-150 border border-slate-300 rounded-lg font-bold text-slate-705 text-xs transition-all cursor-pointer font-arabic active:scale-97"
                  >
                    {lang === "ar" ? "إغلاق التفاصيل" : "Close Details"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
