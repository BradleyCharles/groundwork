import { NextResponse } from "next/server";

/** Logs the real error server-side and returns a generic message. Never return raw errors to the client. */
export function logAndRespond(context: string, error: unknown, status = 500) {
  console.error(`[${context}]`, error instanceof Error ? error.message : "unknown error");
  return NextResponse.json({ error: "Something went wrong" }, { status });
}
