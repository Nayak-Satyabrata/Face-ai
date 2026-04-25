import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accentColor?: string;
  trend?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = "#6366f1",
  trend,
}: StatsCardProps) {
  return (
    <div className="stat-card">
      {/* Top accent is applied via CSS ::before — colour set inline */}
      <style>{`.stat-card-${title.replace(/\s/g,'')}::before { background: linear-gradient(90deg, ${accentColor}, transparent); }`}</style>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            {title}
          </p>
          <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className="text-xs mt-2 font-medium" style={{ color: accentColor }}>
              {trend}
            </p>
          )}
        </div>

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}
        >
          <Icon size={22} style={{ color: accentColor }} />
        </div>
      </div>
    </div>
  );
}
