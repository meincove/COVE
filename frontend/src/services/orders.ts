// src/services/orders.ts
import { postJson } from "@/utils/api";
// NOTE: your `types` folder is outside `src`, so use a relative import:
import type { SaveOrderPayload } from "../../types/checkout";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/**
 * Calls your Django endpoint to persist an order after checkout.
 * Expects the payload to include identity, cart, totals, and (soon) shipping/tax.
 */
export async function saveOrder(payload: SaveOrderPayload): Promise<{ message: string; order_id: number }> {
  const url = `${API_BASE}/api/save-order/`;
  return postJson<{ message: string; order_id: number }>(url, payload);
}
