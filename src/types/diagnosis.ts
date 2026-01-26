export interface DiagnosisIssue {
  description: string;
  severity: "high" | "medium" | "low";
}

export interface DiagnosisResult {
  summary: string;
  overallHealth: "good" | "warning" | "poor";
  issues: DiagnosisIssue[];
  recommendations: string[];
}
