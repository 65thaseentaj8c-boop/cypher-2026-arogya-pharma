import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { NavigationTab } from '../../types';

interface LayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  activeAlertsCount?: number;
  pendingApprovalsCount?: number;
  userEmail?: string;
  userRole?: string;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  activeAlertsCount = 14,
  pendingApprovalsCount = 5,
  userEmail,
  userRole,
  onSignOut,
  children,
}) => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        activeAlertsCount={activeAlertsCount}
        pendingApprovalsCount={pendingApprovalsCount}
        userEmail={userEmail}
        userRole={userRole}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          userEmail={userEmail}
          userRole={userRole}
          onSignOut={onSignOut}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
