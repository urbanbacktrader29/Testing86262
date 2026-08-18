/** Ergebnis der kostenlosen Analyse — an den Client geht ausschließlich das hier, nie der volle Report. */
export interface AnalysisResult {
  id: string;
  weaknesses: string[];
}

/** Voller Report, wird nur nach bestätigter Zahlung ausgeliefert. */
export interface FullReport {
  weaknesses: string[];
  fullReport: string;
}
