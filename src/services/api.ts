import type { AnalysisResult, FullReport } from "../types";

function extractErrorMessage(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string" && err) return err;
  }
  return null;
}

async function asJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || data === null || typeof data !== "object") {
    throw new Error(extractErrorMessage(data) ?? `Unerwartete Antwort vom Server (${res.status}).`);
  }
  return data as T;
}

export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return asJson<AnalysisResult>(res);
}

export async function verifyPayment(sessionId: string): Promise<{ paid: boolean; analysisId: string }> {
  const res = await fetch(`/api/verify-payment?session_id=${encodeURIComponent(sessionId)}`);
  return asJson(res);
}

export async function fetchFullReport(analysisId: string): Promise<FullReport> {
  const res = await fetch(`/api/report?id=${encodeURIComponent(analysisId)}`);
  return asJson<FullReport>(res);
}

export function downloadPdfUrl(analysisId: string): string {
  return `/api/download-pdf?id=${encodeURIComponent(analysisId)}`;
}
