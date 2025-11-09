import * as XLSX from "xlsx";

export type ImportedRow = {
  externalId?: string;         // "ID"
  title: string;               // "Task" (required)
  description?: string;        // description + merged "Acceptance Criteria" + "Commands/How to Run"
  state?: string;              // "State"
  status?: string;             // "status"
  priority?: string;           // "Priority" (string -> enum map later)
  estimatedSec?: number;       // from "Est. Time (min)" minutes -> seconds
  xp?: number;                 // "XP"
  notes?: string;              // "Notes"
  dependencyExternalIds?: string[]; // from "dependency" (comma/space/semicolon separated)
};

export type ImportedSheet = {
  mainTaskTitle: string;
  rows: ImportedRow[];
};

function norm(v: any): string {
  return (v ?? "").toString().trim();
}

function toSecondsFromMinutes(min: any): number | undefined {
  if (min == null || min === "") return undefined;
  const n = Number(min);
  if (isNaN(n)) return undefined;
  return Math.round(n * 60);
}

function parseDeps(val: any): string[] | undefined {
  const s = norm(val);
  if (!s) return undefined;
  return s.split(/[,\n; ]+/).map(x => x.trim()).filter(Boolean);
}

// map raw row -> ImportedRow using case-insensitive headers
function mapRow(obj: Record<string, any>): ImportedRow | null {
  const get = (key: string) => {
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return obj[found as keyof typeof obj];
  };

  const title = norm(get("Task"));
  if (!title) return null; // skip row if Task/title missing

  const desc = norm(get("description"));
  const ac = norm(get("Acceptance Criteria"));
  const how = norm(get("Commands/How to Run"));
  const mergedDesc = [desc, ac && `\n\n**Acceptance Criteria**\n${ac}`, how && `\n\n**How to Run**\n${how}`]
    .filter(Boolean).join("");

  return {
    externalId: norm(get("ID")) || undefined,
    title,
    description: mergedDesc || undefined,
    state: norm(get("State")) || undefined,
    status: norm(get("status")) || undefined,
    priority: norm(get("Priority")) || undefined,
    estimatedSec: toSecondsFromMinutes(get("Est. Time (min)")),
    xp: (() => {
      const v = norm(get("XP"));
      if (!v) return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    })(),
    notes: norm(get("Notes")) || undefined,
    dependencyExternalIds: parseDeps(get("dependency")),
  };
}

export function loadXlsx(buffer: Buffer, filename: string): ImportedSheet[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const baseTitle = filename.replace(/\.xlsx?$/i, "").replace(/[_\-]/g, " ").trim();
  const out: ImportedSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
    const rows = json.map(mapRow).filter(Boolean) as ImportedRow[];
    if (rows.length === 0) continue;
    const mainTaskTitle = sheetName.trim() || baseTitle;
    out.push({ mainTaskTitle, rows });
  }
  // If workbook had no rows due to “Sheet1” empty, fallback: try first sheet name OR base file title.
  if (out.length === 0) out.push({ mainTaskTitle: baseTitle || "Imported Task", rows: [] });
  return out;
}
