import { ReactNode } from "react";

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-title">{title}</span>
        </div>
        {subtitle && <span className="section-subtitle">{subtitle}</span>}
      </div>
      <div className="section-content">{children}</div>
    </div>
  );
}
