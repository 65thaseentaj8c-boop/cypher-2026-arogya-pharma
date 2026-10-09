import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  GitFork,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import type { NavigationTab } from '../../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeAlertsCount?: number;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeAlertsCount = 14,
  pendingApprovalsCount = 5,
}) => {
  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'danger' | 'warning' | 'neutral';
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory',
      label: 'Batch Inventory',
      icon: Boxes,
    },
    {
      id: 'traceability',
      label: 'Batch Traceability',
      icon: GitFork,
    },
    {
      id: 'alerts',
      label: 'Risk Alerts',
      icon: AlertTriangle,
      badge: activeAlertsCount,
      badgeVariant: 'danger',
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      icon: Lightbulb,
    },
    {
      id: 'approvals',
      label: 'Approval Queue',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
      badgeVariant: 'warning',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
            <ShieldCheck className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Arogya Pharma
            </h1>
            <p className="text-[11px] text-teal-400 font-medium">
              AI Batch Risk Agent
            </p>
          </div>
        </div>

        {/* Hackathon Context Sub-tag */}
        <div className="mt-3 py-1.5 px-2 bg-slate-800/80 rounded border border-slate-700/60 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <div className="text-[11px] text-slate-300 truncate">
            <span className="font-semibold text-white">Cypher 2026</span> • PS 7
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operational Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-700 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeVariant === 'danger'
                      ? 'bg-rose-500 text-white'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Target Focus: Batch B2231 Pin */}
      <div className="p-3 mx-3 mb-4 rounded-md bg-slate-800/90 border border-slate-700/80">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
            Primary Target
          </span>
          <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1 rounded">
            SURVEILLANCE
          </span>
        </div>
        <p className="text-xs font-semibold text-white">Batch B2231</p>
        <p className="text-[11px] text-slate-400 truncate">
          Paracetamol Infusion IP (100ml)
        </p>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-700">
          <span>Cold excursion logged</span>
          <button
            onClick={() => onSelectTab('traceability')}
            className="text-teal-400 hover:text-teal-300 font-medium"
          >
            Inspect →
          </button>
        </div>
      </div>

      {/* User / Persona Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center gap-3 bg-slate-950/40">
        <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center font-bold text-white text-xs">
          TT
        </div>
        <div className="truncate">
          <p className="text-xs font-semibold text-white truncate">
            Thaseen Taj
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            Frontend Lead (QA Console)
          </p>
        </div>
      </div>
    </aside>
  );
};
