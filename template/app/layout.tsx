import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "{{PROJECT_NAME}}", template: "%s | {{PROJECT_NAME}}" },
  description: "{{PROJECT_DESCRIPTION}}",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers opts every page into dynamic rendering so Next can apply the per-request CSP nonce.
  await headers();
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <header className="border-b border-gray-300 p-4">
          <nav aria-label="Primary">
            <Link href="/" className="font-semibold underline">
              {{PROJECT_NAME}}
            </Link>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-3xl p-4">
          {children}
        </main>
        <footer className="border-t border-gray-300 p-4 text-sm">Starter project</footer>
      </body>
    </html>
  );
}
