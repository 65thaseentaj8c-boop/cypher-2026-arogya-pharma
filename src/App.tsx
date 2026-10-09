import { useState, useEffect } from 'react';
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

  useEffect(() => {
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
  }, []);

  // Handle recommendation dispatch to QA queue
  const handleSubmitRecommendationToQA = (rec: AIRecommendation) => {
    const newApproval: ApprovalRequest = {
      id: `APP-${Date.now().toString().slice(-4)}`,
      batchId: rec.batchId,
      title: `${rec.actionType}: ${rec.title}`,
      requestType: rec.actionType === 'Quarantine' ? 'Quarantine Order' : 'Recall Authorization',
      submittedBy: 'AI Risk Agent (Auto-Dispatched)',
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      urgency: 'critical',
      summary: rec.rationale,
      regulatoryReference: 'CDSCO / WHO TRS 961 Schedule M Protocol',
      status: 'pending',
    };

    setApprovals((prev) => [newApproval, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      pendingApprovals: prev.pendingApprovals + 1,
    }));
    showToast(`Advisory submitted! Created Approval Order ${newApproval.id} for Batch ${rec.batchId}`);
  };

  // Handle QA decision on approval item
  const handleDecision = async (
    id: string,
    decision: 'approved' | 'rejected',
    notes: string
  ) => {
    const updated = await pharmacyService.updateApprovalDecision(id, decision, notes);
    if (updated) {
      setApprovals((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
      );
      setMetrics((prev) => ({
        ...prev,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
      }));
      showToast(
        `Digital Sign-Off Recorded: Request ${id} was ${
          decision === 'approved' ? 'AUTHORIZED' : 'REJECTED'
        }.`
      );
    }
  };

  const activeAlertsCount = alerts.filter((a) => a.status === 'active' || a.status === 'investigating').length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      activeAlertsCount={activeAlertsCount}
      pendingApprovalsCount={pendingApprovalsCount}
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
          <p className="text-xs font-medium">Initializing pharmaceutical telemetry data feeds...</p>
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
            />
          )}

          {currentTab === 'approvals' && (
            <ApprovalQueueScreen
              approvals={approvals}
              onDecision={handleDecision}
              onNavigate={setCurrentTab}
            />
          )}
        </>
      )}
    </Layout>
  );
}

export default App;
