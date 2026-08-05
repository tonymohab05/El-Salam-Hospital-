import { MedicalItem, InvoicePayload, RestockInvoice, ReceptionOperator } from "../types";
import {
  isSupabaseConfigured,
  insertSupabasePatientInvoice,
  deleteSupabasePatientInvoice,
  upsertSupabaseMedicalItem,
  deleteSupabaseMedicalItem,
  insertSupabaseRestockInvoice,
} from "../supabase";

export interface PendingSyncQueue {
  invoices: InvoicePayload[];
  inventory: MedicalItem[];
  restocks: RestockInvoice[];
  operators: ReceptionOperator[];
  deletedInvoices: string[];
  deletedItemIds: string[];
}

const SYNC_QUEUE_KEY = "el_salam_pending_sync_v1";

export function getPendingQueue(): PendingSyncQueue {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return { invoices: [], inventory: [], restocks: [], operators: [], deletedInvoices: [], deletedItemIds: [] };
    const parsed = JSON.parse(raw);
    return {
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      restocks: Array.isArray(parsed.restocks) ? parsed.restocks : [],
      operators: Array.isArray(parsed.operators) ? parsed.operators : [],
      deletedInvoices: Array.isArray(parsed.deletedInvoices) ? parsed.deletedInvoices : [],
      deletedItemIds: Array.isArray(parsed.deletedItemIds) ? parsed.deletedItemIds : [],
    };
  } catch (e) {
    console.error("Failed to parse pending queue from localStorage", e);
    return { invoices: [], inventory: [], restocks: [], operators: [], deletedInvoices: [], deletedItemIds: [] };
  }
}

export function savePendingQueue(queue: PendingSyncQueue): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save pending queue to localStorage", e);
  }
}

export function getPendingQueueCount(): number {
  const queue = getPendingQueue();
  return (
    queue.invoices.length +
    queue.inventory.length +
    queue.restocks.length +
    queue.operators.length +
    queue.deletedInvoices.length +
    queue.deletedItemIds.length
  );
}

export function queuePendingInvoice(invoice: InvoicePayload): void {
  const queue = getPendingQueue();
  const filtered = queue.invoices.filter((inv) => inv.receipt_number !== invoice.receipt_number);
  queue.invoices = [invoice, ...filtered];
  savePendingQueue(queue);
}

export function queuePendingDeletedInvoice(receiptNumber: string): void {
  const queue = getPendingQueue();
  queue.invoices = queue.invoices.filter((inv) => inv.receipt_number !== receiptNumber);
  if (!queue.deletedInvoices.includes(receiptNumber)) {
    queue.deletedInvoices.push(receiptNumber);
  }
  savePendingQueue(queue);
}

export function queuePendingItem(item: MedicalItem): void {
  const queue = getPendingQueue();
  const filtered = queue.inventory.filter((it) => it.id !== item.id);
  queue.inventory = [item, ...filtered];
  savePendingQueue(queue);
}

export function queuePendingDeletedItem(itemId: string): void {
  const queue = getPendingQueue();
  queue.inventory = queue.inventory.filter((it) => it.id !== itemId);
  if (!queue.deletedItemIds.includes(itemId)) {
    queue.deletedItemIds.push(itemId);
  }
  savePendingQueue(queue);
}

export function queuePendingRestock(restock: RestockInvoice): void {
  const queue = getPendingQueue();
  const filtered = queue.restocks.filter((r) => r.id !== restock.id);
  queue.restocks = [restock, ...filtered];
  savePendingQueue(queue);
}

/**
 * Flushes the offline queue automatically to Supabase.
 * Returns information about synced items and any remaining items.
 */
export async function processPendingSyncQueue(): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, syncedCount: 0, remainingCount: getPendingQueueCount() };
  }
  if (!isSupabaseConfigured) {
    return { success: false, syncedCount: 0, remainingCount: 0 };
  }

  const queue = getPendingQueue();
  const initialTotal = getPendingQueueCount();
  if (initialTotal === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;

  // 1. Process deleted invoices
  if (queue.deletedInvoices.length > 0) {
    const remainingDeleted: string[] = [];
    for (const rNum of queue.deletedInvoices) {
      const ok = await deleteSupabasePatientInvoice(rNum);
      if (ok) syncedCount++;
      else remainingDeleted.push(rNum);
    }
    queue.deletedInvoices = remainingDeleted;
  }

  // 2. Process deleted items
  if (queue.deletedItemIds.length > 0) {
    const remainingDeletedItems: string[] = [];
    for (const itemId of queue.deletedItemIds) {
      const ok = await deleteSupabaseMedicalItem(itemId);
      if (ok) syncedCount++;
      else remainingDeletedItems.push(itemId);
    }
    queue.deletedItemIds = remainingDeletedItems;
  }

  // 3. Process pending invoices
  if (queue.invoices.length > 0) {
    const remainingInvoices: InvoicePayload[] = [];
    for (const inv of queue.invoices) {
      const ok = await insertSupabasePatientInvoice(inv);
      if (ok) syncedCount++;
      else remainingInvoices.push(inv);
    }
    queue.invoices = remainingInvoices;
  }

  // 4. Process pending inventory
  if (queue.inventory.length > 0) {
    const remainingInventory: MedicalItem[] = [];
    for (const item of queue.inventory) {
      const ok = await upsertSupabaseMedicalItem(item);
      if (ok) syncedCount++;
      else remainingInventory.push(item);
    }
    queue.inventory = remainingInventory;
  }

  // 5. Process pending restocks
  if (queue.restocks.length > 0) {
    const remainingRestocks: RestockInvoice[] = [];
    for (const restock of queue.restocks) {
      const ok = await insertSupabaseRestockInvoice(restock);
      if (ok) syncedCount++;
      else remainingRestocks.push(restock);
    }
    queue.restocks = remainingRestocks;
  }

  savePendingQueue(queue);
  const remainingCount = getPendingQueueCount();

  return {
    success: remainingCount === 0,
    syncedCount,
    remainingCount,
  };
}
