export interface AnalysisPayload {
  weaknesses: string[];
  fullReport: string;
}

const SYSTEM_PROMPT =
  "Du bist ein erfahrener Dokumenten-Optimierer (z. B. für Lebensläufe, Anschreiben, Exposés, Pitches, " +
  "Werbetexte oder ähnliche Dokumente). Du analysierst das eingereichte Dokument ehrlich, konkret und " +
  "konstruktiv auf Klarheit, Struktur, Wirkung und Überzeugungskraft. Antworte immer auf Deutsch, " +
  "unabhängig von der Sprache des Dokuments.";

function buildPrompt(text: string): string {
  return `Analysiere folgendes Dokument:\n\n"""\n${text}\n"""\n\nAntworte AUSSCHLIESSLICH mit einem JSON-Objekt in genau diesem Format, kein weiterer Text:\n{"weaknesses": ["Schwachstelle 1 (max. 1 Satz, konkret)", "Schwachstelle 2 (max. 1 Satz, konkret)", "Schwachstelle 3 (max. 1 Satz, konkret)"], "fullReport": "Vollständiger Optimierungs-Report in Markdown: jede Schwachstelle im Detail erklärt, konkrete Formulierungsvorschläge/Umschreibungen mit Beispielen, und eine klare Prioritätenliste am Ende. Mehrere hundert Wörter, gut strukturiert mit ## Überschriften und - Listenpunkten."}`;
}

/** Ruft die OpenAI Chat-Completions-API auf und liefert Teaser + vollen Report zurück. */
export async function analyzeWithOpenAI(text: string): Promise<AnalysisPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ist auf dem Server nicht gesetzt.");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(text) },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI-API-Fehler (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Leere Antwort von OpenAI.");

  let parsed: Partial<AnalysisPayload>;
  try {
    parsed = JSON.parse(content) as Partial<AnalysisPayload>;
  } catch {
    throw new Error("Die KI-Antwort konnte nicht als JSON gelesen werden.");
  }

  const weaknesses = Array.isArray(parsed.weaknesses)
    ? parsed.weaknesses.filter((w): w is string => typeof w === "string").slice(0, 3)
    : [];
  const fullReport = typeof parsed.fullReport === "string" ? parsed.fullReport : "";

  if (weaknesses.length === 0 || !fullReport) {
    throw new Error("Die KI-Antwort war unvollständig.");
  }

  return { weaknesses, fullReport };
}
