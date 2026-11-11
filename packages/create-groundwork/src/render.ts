export interface RenderContext {
  values: Record<string, string>;
  slots: Record<string, string[]>;
}

const TOKEN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
const SLOT_LINE = /^[ \t]*\{\{(slot|slot-block):([a-z][a-z0-9-]*)\}\}[ \t]*\r?$/;

export class RenderError extends Error {}

/**
 * Renders one text file.
 *  - `{{TOKEN}}` is replaced from ctx.values; an unknown token is an error, so nothing is left half-filled.
 *  - A line holding only `{{slot:name}}` is replaced by the slot's lines (or removed when the slot is empty).
 *  - `{{slot-block:name}}` does the same and also removes the blank line after it when the slot is empty.
 * Replacement values are inserted literally, never interpreted as patterns.
 */
export function renderText(text: string, ctx: RenderContext, fileLabel = "file"): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const m = SLOT_LINE.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }
    const [, kind, name] = m as unknown as [string, string, string];
    if (!(name in ctx.slots)) throw new RenderError(`${fileLabel}: unknown slot "${name}"`);
    const content = ctx.slots[name] as string[];
    if (content.length > 0) {
      out.push(...content);
    } else if (kind === "slot-block" && lines[i + 1] === "") {
      i += 1; // drop the blank line that followed the block
    }
  }
  return out.join("\n").replace(TOKEN, (_all, name: string) => {
    const v = ctx.values[name];
    if (v === undefined) throw new RenderError(`${fileLabel}: unknown placeholder {{${name}}}`);
    return v;
  });
}

export const hasUnresolved = (text: string): boolean =>
  new RegExp(TOKEN.source).test(text) || text.split("\n").some((l) => SLOT_LINE.test(l));
