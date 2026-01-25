import { ReactNode } from "react";

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  statusIndicator?: "connected" | "disconnected" | "warning";
}

export function Section({ title, subtitle, children, statusIndicator }: SectionProps) {
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title-row">
          {statusIndicator && (
            <span className={`status-dot status-${statusIndicator}`} />
          )}
          <span className="section-title">{title}</span>
        </div>
        {subtitle && <span className="section-subtitle">{subtitle}</span>}
      </div>
      <div className="section-content">{children}</div>
    </div>
  );
}
