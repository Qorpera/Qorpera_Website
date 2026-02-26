import type { HireAgentKind } from "@/lib/agent-catalog";

export type BasketItem = {
  agentKind: HireAgentKind;
  schedule: "DAILY" | "WEEKLY" | "MONTHLY";
};

export const BASKET_STORAGE_KEY = "zygenic-basket";

export function readBasketFromStorage(): BasketItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BASKET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BasketItem =>
        item !== null &&
        typeof item === "object" &&
        typeof item.agentKind === "string" &&
        typeof item.schedule === "string",
    );
  } catch {
    return [];
  }
}

export function writeBasketToStorage(items: BasketItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}
