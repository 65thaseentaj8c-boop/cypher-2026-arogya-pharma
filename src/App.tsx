import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { AuthScreen } from './components/auth/AuthScreen';
import { Layout } from './components/layout/Layout';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { BatchInventoryScreen } from './components/screens/BatchInventoryScreen';
import { BatchTraceabilityScreen } from './components/screens/BatchTraceabilityScreen';
import { RiskAlertsScreen } from './components/screens/RiskAlertsScreen';
import { RecommendationsScreen } from './components/screens/RecommendationsScreen';
import { ApprovalQueueScreen } from './components/screens/ApprovalQueueScreen';

import { pharmacyService } from './services/pharmacyService';
import type {
  NavigationTab,
  DashboardMetrics,
  BatchItem,
  RiskAlert,
  TraceabilityNode,
  AIRecommendation,
  ApprovalRequest,
} from './types';
import { MOCK_METRICS } from './data/mockData';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics>(MOCK_METRICS);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [traceabilityNodes, setTraceabilityNodes] = useState<TraceabilityNode[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Restore & listen to Supabase Auth Session
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setIsAuthLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // 2. Load pharmaceutical data after session validation
  useEffect(() => {
    if (isAuthLoading) return;
    if (isSupabaseConfigured && !session) return;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        const [
          fetchedMetrics,
          fetchedBatches,
          fetchedAlerts,
          fetchedTraceability,
          fetchedRecs,
          fetchedApprovals,
        ] = await Promise.all([
          pharmacyService.getDashboardMetrics(),
          pharmacyService.getBatches(),
          pharmacyService.getRiskAlerts(),
          pharmacyService.getBatchTraceability('B2231'),
          pharmacyService.getRecommendations(),
          pharmacyService.getApprovalQueue(),
        ]);

        setMetrics(fetchedMetrics);
        setBatches(fetchedBatches);
        setAlerts(fetchedAlerts);
        setTraceabilityNodes(fetchedTraceability);
        setRecommendations(fetchedRecs);
        setApprovals(fetchedApprovals);
      } catch (err) {
        console.error('Failed to load initial pharmaceutical data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [isAuthLoading, session]);

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setSession(null);
      showToast('Signed out of QA Console session.');
    }
  };

  // Handle recommendation dispatch to QA queue
  const handleSubmitRecommendationToQA = async (rec: AIRecommendation) => {
    try {
      const newApproval: ApprovalRequest = {
        id: `APP-${Date.now().toString().slice(-4)}`,
        batchId: rec.batchId,
        title: `${rec.actionType}: ${rec.title}`,
        requestType: rec.actionType === 'Quarantine' ? 'Quarantine Order' : 'Recall Authorization',
        submittedBy: session?.user?.email || 'AI Risk Agent (Auto-Dispatched)',
        submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
        urgency: 'critical',
        summary: rec.rationale,
        regulatoryReference: 'CDSCO / WHO TRS 961 Schedule M Protocol',
        status: 'pending',
      };

      const added = await pharmacyService.addApprovalRequest(newApproval);
      const [updatedApprovals, updatedMetrics] = await Promise.all([
        pharmacyService.getApprovalQueue(),
        pharmacyService.getDashboardMetrics(),
      ]);
      setApprovals(updatedApprovals);
      setMetrics(updatedMetrics);
      showToast(`Advisory submitted! Created Approval Order ${added.id} for Batch ${rec.batchId}`);
    } catch (err: any) {
      showToast(err.message || 'Duplicate submission prevented.');
    }
  };

  // Handle explicit cleanup of duplicate pending requests
  const handleCleanupDuplicates = async () => {
    const removedIds = await pharmacyService.cleanupDuplicatePendingRequests();
    if (removedIds.length > 0) {
      const [updatedApprovals, updatedMetrics] = await Promise.all([
        pharmacyService.getApprovalQueue(),
        pharmacyService.getDashboardMetrics(),
      ]);
      setApprovals(updatedApprovals);
      setMetrics(updatedMetrics);
      showToast(`Cleaned up ${removedIds.length} duplicate pending request(s): ${removedIds.join(', ')}.`);
    } else {
      showToast('No duplicate pending requests found.');
    }
  };

  // Handle single duplicate request dismissal
  const handleRemoveApprovalRequest = async (id: string) => {
    const removed = await pharmacyService.removeApprovalRequest(id);
    if (removed) {
      const [updatedApprovals, updatedMetrics] = await Promise.all([
        pharmacyService.getApprovalQueue(),
        pharmacyService.getDashboardMetrics(),
      ]);
      setApprovals(updatedApprovals);
      setMetrics(updatedMetrics);
      showToast(`Dismissed duplicate request ${id}.`);
    }
  };

  // Handle QA decision on approval item
  const handleDecision = async (
    id: string,
    decision: 'approved' | 'rejected',
    notes: string
  ) => {
    try {
      const userIdentifier = session?.user?.email
        ? `${session.user.user_metadata?.full_name || session.user.email} (QA Lead)`
        : 'Thaseen Taj (QA Lead Officer)';

      const updated = await pharmacyService.updateApprovalDecision(id, decision, notes, userIdentifier);
      if (updated) {
        setApprovals((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
        );

        const [updatedBatches, updatedMetrics] = await Promise.all([
          pharmacyService.getBatches(),
          pharmacyService.getDashboardMetrics(),
        ]);
        setBatches(updatedBatches);
        setMetrics(updatedMetrics);

        showToast(
          `Digital Sign-Off Recorded: Request ${id} was ${
            decision === 'approved' ? 'AUTHORIZED' : 'REJECTED'
          }.`
        );
      } else {
        showToast(`Sign-off could not be completed for request ${id}.`);
      }
    } catch (err: any) {
      showToast(`Sign-off Error: ${err.message || 'Operation failed'}`);
    }
  };

  // Reset demo store and clear localStorage decisions
  const handleResetDemo = async () => {
    pharmacyService.resetInventoryToDefault();
    const [fetchedMetrics, fetchedBatches, fetchedApprovals] = await Promise.all([
      pharmacyService.getDashboardMetrics(),
      pharmacyService.getBatches(),
      pharmacyService.getApprovalQueue(),
    ]);
    setMetrics(fetchedMetrics);
    setBatches(fetchedBatches);
    setApprovals(fetchedApprovals);
    showToast('Demo store & localStorage approval decisions reset to default seed state.');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent" />
        <p className="text-xs font-medium">Verifying QA session status...</p>
      </div>
    );
  }

  // Show AuthScreen if Supabase is unconfigured OR session is unauthenticated
  if (!isSupabaseConfigured || !session) {
    return <AuthScreen />;
  }

  const activeAlertsCount = alerts.filter((a) => a.status === 'active' || a.status === 'investigating').length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  const userEmail = session.user.email || '';
  const userRole = (session.user.app_metadata?.app_role as string) || 'qa_lead';

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      activeAlertsCount={activeAlertsCount}
      pendingApprovalsCount={pendingApprovalsCount}
      userEmail={userEmail}
      userRole={userRole}
      onSignOut={handleSignOut}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-700 text-xs flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent" />
          <p className="text-xs font-medium font-sans">Initializing pharmaceutical telemetry data feeds...</p>
        </div>
      ) : (
        <>
          {/* Screen Routing */}
          {currentTab === 'dashboard' && (
            <DashboardScreen
              metrics={metrics}
              alerts={alerts}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'inventory' && (
            <BatchInventoryScreen
              batches={batches}
              onNavigate={setCurrentTab}
              onBatchCreated={(newBatch) => {
                setBatches((prev) => [newBatch, ...prev]);
                setMetrics((prev) => ({
                  ...prev,
                  totalTrackedBatches: prev.totalTrackedBatches + 1,
                }));
                showToast(`Lot ${newBatch.id} (${newBatch.drugName}) registered in inventory under status Under Review.`);
              }}
              onBatchUpdated={(updatedBatch) => {
                setBatches((prev) =>
                  prev.map((b) => (b.id === updatedBatch.id ? updatedBatch : b))
                );
                showToast(`Lot ${updatedBatch.id} record updated successfully.`);
              }}
            />
          )}

          {currentTab === 'traceability' && (
            <BatchTraceabilityScreen
              traceabilityNodes={traceabilityNodes}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'alerts' && (
            <RiskAlertsScreen
              alerts={alerts}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'recommendations' && (
            <RecommendationsScreen
              recommendations={recommendations}
              onNavigate={setCurrentTab}
              onSubmitToQA={handleSubmitRecommendationToQA}
              approvals={approvals}
              batches={batches}
            />
          )}

          {currentTab === 'approvals' && (
            <ApprovalQueueScreen
              approvals={approvals}
              onDecision={handleDecision}
              onResetDemo={handleResetDemo}
              onCleanupDuplicates={handleCleanupDuplicates}
              onDismissRequest={handleRemoveApprovalRequest}
              onNavigate={setCurrentTab}
            />
          )}
        </>
      )}
    </Layout>
  );
}

export default App;
