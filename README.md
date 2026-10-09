# Arogya Pharma — AI Batch Risk & Recall Management Agent

**Cypher 2026 — Problem Statement 7: "Batch B2231"**  
*Phase 1 Frontend Architecture & Foundation*

---

## 📌 Executive Overview

**Arogya Pharma** is an enterprise pharmaceutical supply-chain risk surveillance and automated recall orchestration platform.

This repository contains the **Phase 1 Frontend Foundation**, designed and structured by **Thaseen** (Frontend Lead). It provides a responsive, enterprise-grade healthcare UI for monitoring pharmaceutical batches, real-time cold-chain sensor breaches, AI risk advisories, and QA regulatory approval workflows.

> **Demonstration Notice:**  
> All records currently rendered in Phase 1 (including IoT temperature feeds, analytical assay deviations, and batch status transitions) are **demonstration mock datasets** wrapped in an asynchronous data-access layer. No real backend, Supabase client, or paid APIs are active.

---

## 🛠 Technology Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS (Custom healthcare palette: crisp whites, slate navy, restrained teal accents)
- **Icons:** Lucide React
- **Architecture Pattern:** Service Layer / Repository Pattern (`src/services/pharmacyService.ts`)

---

## 📂 Project Structure

```
Pharma/
├── public/                 # Static assets
├── src/
│   ├── types/
│   │   └── index.ts        # Domain types (BatchItem, RiskAlert, TraceabilityNode, AIRecommendation, ApprovalRequest)
│   ├── data/
│   │   └── mockData.ts     # Realistic mock data centered on Problem Statement 7 "Batch B2231"
│   ├── services/
│   │   └── pharmacyService.ts # Dedicated data access layer (Ready for Supabase ORM replacement)
│   ├── components/
│   │   ├── common/
│   │   │   ├── DataTable.tsx    # Reusable typed data table
│   │   │   ├── MetricCard.tsx   # Reusable KPI summary cards
│   │   │   ├── StatusBadge.tsx  # Severity and batch lifecycle badges
│   │   │   ├── Modal.tsx        # Accessible dialog component
│   │   │   └── DemoBadge.tsx    # Demonstration data disclaimer pill
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Navigation sidebar with active badges
│   │   │   ├── Header.tsx       # Enterprise header with live indicators
│   │   │   └── Layout.tsx       # Main page layout shell
│   │   └── screens/
│   │       ├── DashboardScreen.tsx        # Executive KPIs, Spotlight Banner & Alerts Table
│   │       ├── BatchInventoryScreen.tsx   # Filterable batch inventory & specs
│   │       ├── BatchTraceabilityScreen.tsx# End-to-end provenance & IoT telemetry for B2231
│   │       ├── RiskAlertsScreen.tsx       # Full deviation alerts log & investigation
│   │       ├── RecommendationsScreen.tsx  # Autonomous AI recall advisories
│   │       └── ApprovalQueueScreen.tsx    # QA Officer digital sign-off queue
│   ├── App.tsx             # Root application orchestrator
│   ├── main.tsx            # React entry point
│   └── index.css           # Tailwind base styles and scrollbar overrides
├── index.html              # HTML shell with Inter typography & metadata
├── package.json            # Project dependencies and npm scripts
├── postcss.config.js       # PostCSS config
├── tailwind.config.js      # Custom theme colors and font configuration
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build config
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Installation

Clone or extract the repository, open a terminal in the project root, and install dependencies:

```bash
npm install
```

### Running the Development Server

Start Vite in local development mode:

```bash
npm run dev
```

The application will launch at:  
👉 **`http://localhost:5173/`**

### Building for Production

To validate TypeScript compilation and generate the production bundle:

```bash
npm run build
```

---

## 🧭 Navigation & Screen Status

| Screen | Route / Tab | Status | Description |
|---|---|---|---|
| **Dashboard** | `Dashboard` | **Fully Functional** | 5 Summary KPI cards, Batch B2231 spotlight banner, and mock alerts table. |
| **Batch Inventory** | `Batch Inventory` | **Fully Functional** | Searchable batch registry with status filter pills and batch modal. |
| **Batch Traceability** | `Batch Traceability` | **Fully Functional** | Interactive 5-stage genealogy tree for Batch B2231 with sensor telemetry. |
| **Risk Alerts** | `Risk Alerts` | **Fully Functional** | Filterable by severity (Critical, High, Medium, Low) with diagnostic log modal. |
| **Recommendations** | `Recommendations` | **Interactive UI** | AI Recall advisories with "Submit to QA Queue" state dispatch. |
| **Approval Queue** | `Approval Queue` | **Interactive UI** | QA sign-off queue with interactive Approve / Reject modal updating live state. |

---

## 🔌 Teammate Integration Guide (Connecting Supabase & AI Engine)

This project has been intentionally decoupled so that the backend, risk engine, and data pipelines can be integrated seamlessly without breaking the UI components:

1. **Supabase Client Setup:**
   Install `@supabase/supabase-js` and initialize the client in `src/services/supabaseClient.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js';
   export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

2. **Replace Mock Service Calls:**
   Open `src/services/pharmacyService.ts`. Each method has step-by-step comments showing the exact Supabase query to swap in:
   ```ts
   // Example in pharmacyService.ts:
   async getBatches() {
     const { data, error } = await supabase.from('batches').select('*');
     if (error) throw error;
     return data;
   }
   ```

3. **Risk Engine / ML Pipelines:**
   When the AI risk engine outputs risk scores or recommendations, post them to the `ai_recommendations` table matching the TypeScript schema in `src/types/index.ts`.

---

## 📜 Regulatory Standards Grounding (Context)
- **WHO Technical Report Series (TRS) 961 Annex 9:** Temperature-controlled logistics.
- **Drugs and Cosmetics Act, 1940 (Schedule M / M-I):** Good Manufacturing Practices (India).
- **US FDA 21 CFR Part 11:** Electronic Records and Electronic Signatures.
- **CDSCO Guidelines:** Rapid Alert and Recall Procedures for Defective Medicinal Products.
