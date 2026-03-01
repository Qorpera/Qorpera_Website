// ── Rack Map ────────────────────────────────────────────────────────

export type RackMapNode = {
  id: string;
  label: string;
  rackUnit: number; // U position (1-based, bottom up)
  heightUnits: number; // how many U slots this device spans
  status: "online" | "offline" | "warning" | "maintenance";
  specs?: string; // e.g. "Dell R740 · 128GB · 2x Xeon"
  tags?: string[];
};

export type Rack = {
  id: string;
  label: string;
  totalUnits: number; // typically 42
  nodes: RackMapNode[];
};

export type RackMapData = {
  racks: Rack[];
};

// ── Table ───────────────────────────────────────────────────────────

export type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "currency" | "date" | "badge";
};

export type TableData = {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  groupByKey?: string;
  sortByKey?: string;
};

// ── KPI Grid ────────────────────────────────────────────────────────

export type KpiCard = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  tone?: "teal" | "amber" | "rose" | "green" | "purple" | "slate";
};

export type KpiGridData = {
  cards: KpiCard[];
  columns?: number; // 2 | 3 | 4
};

// ── Union ───────────────────────────────────────────────────────────

export type DataAppDefinition =
  | { type: "rack-map"; data: RackMapData }
  | { type: "table"; data: TableData }
  | { type: "kpi-grid"; data: KpiGridData };

export const DATA_APP_TYPES = ["rack-map", "table", "kpi-grid"] as const;
export type DataAppType = (typeof DATA_APP_TYPES)[number];

// ── View (from DB) ──────────────────────────────────────────────────

export type DataAppView = {
  id: string;
  title: string;
  appType: string;
  dataJson: string;
  layoutJson: string;
  sourceContext: string;
  createdAt: string;
  updatedAt: string;
};
