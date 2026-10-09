import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'teal';
  trendLabel?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trendLabel,
  onClick,
}) => {
  const variantStyles = {
    default: {
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
      valColor: 'text-slate-900',
    },
    danger: {
      border: 'border-rose-200 bg-rose-50/30',
      iconBg: 'bg-rose-100 text-rose-700',
      valColor: 'text-rose-700',
    },
    warning: {
      border: 'border-amber-200 bg-amber-50/30',
      iconBg: 'bg-amber-100 text-amber-700',
      valColor: 'text-amber-800',
    },
    info: {
      border: 'border-sky-200 bg-sky-50/30',
      iconBg: 'bg-sky-100 text-sky-700',
      valColor: 'text-sky-800',
    },
    teal: {
      border: 'border-teal-200 bg-teal-50/30',
      iconBg: 'bg-teal-100 text-teal-700',
      valColor: 'text-teal-800',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-5 border shadow-sm transition-all duration-150 ${style.border} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            {title}
          </p>
          <h3 className={`text-2xl font-bold tracking-tight ${style.valColor}`}>
            {value}
          </h3>
        </div>
        <div className={`p-2.5 rounded-md ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trendLabel) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-600">{subtitle}</span>}
          {trendLabel && (
            <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
