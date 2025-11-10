// src/lib/serialize.ts

/**
 * Recursively convert Prisma Decimal/Date/BigInt into JSON-serializable primitives.
 * - Decimal: detect by duck-typing (toNumber/toString or ctor name === 'Decimal')
 * - Date: ISO string
 * - BigInt: Number (or String if you need >2^53)
 */
export function toPlain<T>(data: T): T {
  const isDecimal = (v: any) =>
    v &&
    typeof v === "object" &&
    (typeof v.toNumber === "function" ||
      typeof v.toString === "function" && v.constructor?.name === "Decimal");

  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;

    const t = typeof v;
    if (t === "number" || t === "string" || t === "boolean") return v;
    if (t === "bigint") {
      // If you store huge BigInts, switch to v.toString() instead.
      const n = Number(v);
      return Number.isNaN(n) ? v.toString() : n;
    }

    if (v instanceof Date) return v.toISOString();

    if (isDecimal(v)) {
      // Prefer toNumber if available; fallback to Number(toString())
      try {
        if (typeof v.toNumber === "function") return v.toNumber();
        const n = Number(v.toString());
        return Number.isNaN(n) ? v.toString() : n;
      } catch {
        return v.toString?.() ?? v;
      }
    }

    if (Array.isArray(v)) return v.map(walk);

    if (t === "object") {
      const out: any = {};
      for (const k in v) out[k] = walk(v[k]);
      return out;
    }

    return v;
  };

  return walk(data) as T;
}
