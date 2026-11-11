type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObject = (v: Json | undefined): v is { [k: string]: Json } =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Objects merge recursively, arrays concatenate (skipping exact duplicates), scalars are replaced. */
export function mergeJson(base: Json, patch: Json): Json {
  if (isObject(base) && isObject(patch)) {
    const out: { [k: string]: Json } = { ...base };
    for (const [k, v] of Object.entries(patch))
      out[k] = k in base ? mergeJson(base[k] as Json, v) : v;
    return out;
  }
  if (Array.isArray(base) && Array.isArray(patch)) {
    const seen = new Set(base.map((x) => JSON.stringify(x)));
    return [...base, ...patch.filter((x) => !seen.has(JSON.stringify(x)))];
  }
  return patch;
}

const isScalar = (v: Json) => v === null || typeof v !== "object";

/**
 * Formats JSON the way Prettier formats the project's own JSON files: objects expanded, arrays of
 * scalars on one line when they fit in printWidth, otherwise one element per line.
 */
export function formatJson(value: Json, printWidth = 100): string {
  return fmt(value, "", printWidth) + "\n";
}

function fmt(v: Json, indent: string, width: number, keyPrefixLen = 0): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    if (v.every(isScalar)) {
      const inline = `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
      if (indent.length + keyPrefixLen + inline.length + 1 <= width) return inline;
    }
    const inner = indent + "  ";
    return `[\n${v.map((x) => inner + fmt(x, inner, width)).join(",\n")}\n${indent}]`;
  }
  if (isObject(v)) {
    const keys = Object.keys(v);
    if (keys.length === 0) return "{}";
    const inner = indent + "  ";
    return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)}: ${fmt(v[k] as Json, inner, width, JSON.stringify(k).length + 2)}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(v);
}
