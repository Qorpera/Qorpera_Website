"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  BASKET_STORAGE_KEY,
  readBasketFromStorage,
  writeBasketToStorage,
  type BasketItem,
} from "@/lib/basket";

type BasketContextValue = {
  items: BasketItem[];
  count: number;
  hydrated: boolean;
  hasKind: (agentKind: string) => boolean;
  addItem: (item: BasketItem) => void;
  removeItem: (agentKind: string) => void;
  clearBasket: () => void;
};

const BasketContext = createContext<BasketContextValue | null>(null);

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readBasketFromStorage());
    setHydrated(true);
    function onStorage(e: StorageEvent) {
      if (e.key === BASKET_STORAGE_KEY) setItems(readBasketFromStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback((item: BasketItem) => {
    setItems((curr) => {
      const next = curr.some((i) => i.agentKind === item.agentKind)
        ? curr.map((i) => (i.agentKind === item.agentKind ? item : i))
        : [...curr, item];
      writeBasketToStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((agentKind: string) => {
    setItems((curr) => {
      const next = curr.filter((i) => i.agentKind !== agentKind);
      writeBasketToStorage(next);
      return next;
    });
  }, []);

  const clearBasket = useCallback(() => {
    writeBasketToStorage([]);
    setItems([]);
  }, []);

  return (
    <BasketContext.Provider
      value={{
        items,
        count: items.length,
        hydrated,
        hasKind: (kind) => items.some((i) => i.agentKind === kind),
        addItem,
        removeItem,
        clearBasket,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within BasketProvider");
  return ctx;
}
