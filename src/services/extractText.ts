const MAX_CHARS = 15_000;

/** Extrahiert Text aus einer hochgeladenen Datei — PDF (client-seitig per pdf.js) oder reiner Text. */
export async function extractText(file: File): Promise<string> {
  let raw: string;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    raw = await extractPdfText(file);
  } else {
    raw = await file.text();
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Aus der Datei konnte kein Text gelesen werden (evtl. ein gescanntes PDF ohne Textebene?).");
  }
  return trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;
}

async function extractPdfText(file: File): Promise<string> {
  // Dynamischer Import hält pdf.js aus dem initialen Bundle heraus.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}
