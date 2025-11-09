import { Decimal } from "@prisma/client/runtime/library";

/** Convert Prisma Decimal/Date/etc. to plain JSON values for Client Components */
export function toPlain<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value instanceof Decimal) return Number(value);     // or value.toString()
      if (value instanceof Date) return value.toISOString();  // optional
      return value;
    })
  ) as T;
}
