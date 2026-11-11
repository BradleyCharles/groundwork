import { escapeHtml } from "@/lib/escapeHtml";

/** Tagged template that HTML-escapes every interpolated value: html`<p>${userInput}</p>` is safe. */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce(
    (out, chunk, i) => out + chunk + (i < values.length ? escapeHtml(String(values[i])) : ""),
    "",
  );
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: "Welcome",
    html: html`<p>Hello ${name}, welcome aboard.</p>`,
  };
}
