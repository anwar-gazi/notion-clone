import { describe, it, expect } from "vitest";
import { loadXlsx } from "../../src/lib/excel";
import * as XLSX from "xlsx";

function wb(rows: any[], sheet = "Sheet A") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const w = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w, ws, sheet);
  return XLSX.write(w, { type: "buffer", bookType: "xlsx" }) as unknown as Buffer;
}

describe("excel import mapping", () => {
  it("maps required Task → title and skips rows without Task", () => {
    const buf = wb([{ Task: "Do something" }, { Foo: "No title" }], "Planning");
    const sheets = loadXlsx(buf, "file.xlsx");
    expect(sheets[0].mainTaskTitle).toBe("Planning");
    expect(sheets[0].rows.length).toBe(1);
    expect(sheets[0].rows[0]?.title).toBe("Do something");
  });

  it("converts Est. Time (min) → seconds", () => {
    const buf = wb([{ Task: "T", "Est. Time (min)": 15 }]);
    const [sheet] = loadXlsx(buf, "file.xlsx");
    expect(sheet.rows[0]?.estimatedSec).toBe(900);
  });
});
