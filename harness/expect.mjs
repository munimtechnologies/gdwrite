// expect: the comparison used by play.mjs for "expect" steps.
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
// A plain value (or an object with no op keys) must equal the result exactly (compared as JSON).
// An object with op keys must satisfy every op: eq, ne, gt, gte, lt, lte, between [a, b],
// truthy (true/false), includes.

export const OPS = ["eq", "ne", "gt", "gte", "lt", "lte", "between", "truthy", "includes"];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const num = (v) => typeof v === "number" && Number.isFinite(v);

export function matches(v, expect) {
  if (expect === null || typeof expect !== "object" || Array.isArray(expect)) return same(v, expect);
  const ops = Object.keys(expect).filter((k) => OPS.includes(k));
  if (!ops.length) return same(v, expect);
  return ops.every((k) => {
    const a = expect[k];
    switch (k) {
      case "eq": return same(v, a);
      case "ne": return !same(v, a);
      case "gt": return num(v) && v > a;
      case "gte": return num(v) && v >= a;
      case "lt": return num(v) && v < a;
      case "lte": return num(v) && v <= a;
      case "between": return num(v) && Array.isArray(a) && v >= a[0] && v <= a[1];
      case "truthy": return !!v === !!a;
      case "includes": return (typeof v === "string" || Array.isArray(v)) && v.includes(a);
      default: return false;
    }
  });
}
