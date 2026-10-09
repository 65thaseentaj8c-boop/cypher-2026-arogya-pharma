import React from 'react';
import type { SeverityLevel, BatchStatus, AlertStatus } from '../../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const styles: Record<SeverityLevel, { bg: string; dot: string; label: string }> = {
    critical: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      dot: 'bg-rose-600',
      label: 'Critical Risk',
    },
    high: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      label: 'High Risk',
    },
    medium: {
      bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      dot: 'bg-yellow-500',
      label: 'Medium Risk',
    },
    low: {
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      dot: 'bg-slate-400',
      label: 'Low Risk',
    },
  };

  const current = styles[severity] || styles.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};

interface BatchStatusBadgeProps {
  status: BatchStatus;
}

export const BatchStatusBadge: React.FC<BatchStatusBadgeProps> = ({ status }) => {
  const styles: Record<BatchStatus, { bg: string; label: string }> = {
    released: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      label: 'QC Released',
    },
    in_transit: {
      bg: 'bg-sky-50 border-sky-200 text-sky-800',
      label: 'In Transit',
    },
    under_review: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      label: 'Under Surveillance',
    },
    quarantined: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      label: 'Quarantined',
    },
    recalled: {
      bg: 'bg-purple-50 border-purple-200 text-purple-800',
      label: 'Recalled',
    },
  };

  const current = styles[status] || {
    bg: 'bg-slate-100 border-slate-200 text-slate-800',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg}`}
    >
      {current.label}
    </span>
  );
};

interface AlertStatusBadgeProps {
  status: AlertStatus;
}

export const AlertStatusBadge: React.FC<AlertStatusBadgeProps> = ({ status }) => {
  const styles: Record<AlertStatus, { bg: string; label: string }> = {
    active: {
      bg: 'bg-rose-100 text-rose-900 border-rose-300',
      label: 'ACTIVE',
    },
    investigating: {
      bg: 'bg-amber-100 text-amber-900 border-amber-300',
      label: 'UNDER INVESTIGATION',
    },
    mitigated: {
      bg: 'bg-blue-100 text-blue-900 border-blue-300',
      label: 'MITIGATED',
    },
    resolved: {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      label: 'RESOLVED',
    },
  };

  const current = styles[status] || styles.active;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${current.bg}`}
    >
      {current.label}
    </span>
  );
};
