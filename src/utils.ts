/* Helper to avoid [object Object] in string representation */
export function toString(val: unknown): string {
  let value = String(val);
  if (value === "[object Object]") {
    try {
      value = JSON.stringify(val);
    } catch {
      /* use unstringified value */
    }
  }
  return value;
}
