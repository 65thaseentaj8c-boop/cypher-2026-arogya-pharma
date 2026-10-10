import React from 'react';
import { Radio, Database, LogOut, UserCheck } from 'lucide-react';
import { DemoBadge } from '../common/DemoBadge';
import type { NavigationTab } from '../../types';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  userEmail?: string;
  userRole?: string;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  userEmail,
  userRole = 'qa_lead',
  onSignOut,
}) => {
  const titles: Record<NavigationTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Pharmaceutical Supply Chain Risk Dashboard',
      subtitle: 'Real-time telemetry surveillance & automated recall orchestration',
    },
    inventory: {
      title: 'Batch Inventory Registry',
      subtitle: 'Finished dosage formulations, API lots & regional warehouse holds',
    },
    traceability: {
      title: 'End-to-End Batch Traceability & Provenance',
      subtitle: 'Genealogy tree and IoT sensor telemetry verification for Batch B2231',
    },
    alerts: {
      title: 'Active Risk & Deviation Alerts',
      subtitle: 'Critical temperature excursions, impurity spikes and mechanical anomalies',
    },
    recommendations: {
      title: 'AI Decision & Recall Advisory Engine',
      subtitle: 'Autonomous risk containment recommendations based on CDSCO / WHO GMP guidelines',
    },
    approvals: {
      title: 'QA Officer Regulatory Approval Queue',
      subtitle: 'Multi-signature sign-off workflow for quarantine, recall and release overrides',
    },
  };

  const currentInfo = titles[currentTab] || titles.dashboard;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Titles */}
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {currentInfo.title}
            </h2>
            <DemoBadge label="DEMO DATA" size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{currentInfo.subtitle}</p>
        </div>

        {/* Right: Actions and Status Indicators */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Telemetry Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="font-medium text-slate-700">IoT Feeds: Live</span>
          </div>

          {/* Data layer indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs">
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-semibold">Supabase Auth</span>
            <span className="text-teal-600 text-[10px] uppercase font-bold">({userRole})</span>
          </div>

          {/* User Session badge & Sign Out */}
          {userEmail && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span className="max-w-[140px] truncate">{userEmail}</span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors"
                  title="Sign out of QA Console"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Target Batch B2231 shortcut */}
          <button
            onClick={() => onSelectTab('traceability')}
            className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold hover:bg-rose-100 transition-colors"
            title="Inspect Batch B2231 Traceability Tree"
          >
            Target B2231
          </button>
        </div>
      </div>
    </header>
  );
};
