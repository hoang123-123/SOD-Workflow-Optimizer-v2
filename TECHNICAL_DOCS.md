
# Technical Documentation: SOD Workflow Optimizer

## 1. System Overview
**SOD Workflow Optimizer** is a High-Fidelity UX application embedded within Microsoft Dataverse (Model-driven App) to manage Sales Order Details (SOD). It focuses on solving inventory shortages by orchestrating decisions between **Sale**, **Source**, and **Warehouse** departments.

### Key Technologies
- **Frontend:** React 18, TypeScript, Tailwind CSS.
- **Icons:** Lucide React.
- **Backend:** Microsoft Dataverse (Web API v9.2).
- **Automation:** Power Automate (Flow) for email notifications and complex logic.

---

## 2. Architecture & Data Flow

### 2.1. Initialization (`App.tsx`)
The app operates in two modes:
1.  **Context Mode (Embedded):** Reads `recordId` (Sales Order ID) and `customerId` from URL parameters passed by Dataverse.
2.  **Standalone/Dev Mode:** Uses mock IDs defined in `TEST_CUSTOMER_IDS` if no parameters are present.

### 2.2. State Management Strategy
- **Single Source of Truth:** Dataverse is the master database.
- **Optimistic UI:** The UI updates immediately upon user action, then syncs to Dataverse in the background.
- **History Tracking:** The app stores a JSON snapshot of the entire state in the `cr1bb_history` column of the `crdfd_order_requests` table. This allows for state restoration and "Undo" capabilities.

### 2.3. Dataverse Integration (`services/dataverse.ts`)
- **Authentication:** Uses a PCF-like mechanism or a proxy trigger flow to obtain an Access Token. Tokens are cached in LocalStorage.
- **Fetch Logic:** 
    - `fetchSODsByOrder`: Joins `crdfd_saleorderdetails` with `crdfd_kehoachsoanhangdetail` to calculate real-time available quantities vs ordered quantities.
- **Update Logic:** 
    - `updateRequestHistory`: Patches the JSON history blob.

---

## 3. Business Logic & Roles

### 3.1. Role Mapping
Roles are determined via the `department` URL parameter:
- **SALE:** Business Development.
- **SOURCE:** Sourcing, Purchasing.
- **WAREHOUSE:** Logistics, Fulfillment, Quality Control.
- **ADMIN:** Tech, Admin.

### 3.2. Decision Matrix (`SODCard.tsx`)
| State | Sale Action | Trigger Flow | Next State |
| :--- | :--- | :--- | :--- |
| **Shortage** | **SHIP_PARTIAL** | `SALE_TO_WAREHOUSE` | `RESOLVED` (Wait Warehouse) |
| **Shortage** | **WAIT_ALL** | `SALE_TO_SOURCE` | `SHORTAGE_PENDING_SOURCE` |
| **Shortage** | **CANCEL_ORDER** | `HUY_DON` | `RESOLVED` (Stop) |

---

## 4. API & Integration Specs

### 4.1. Universal Flow Trigger
**Endpoint:** Managed in `services/flowTriggers.ts` (`UNIVERSAL_FLOW_URL`).

**Common Payload Structure:**
```json
{
  "Type": "String (Enum)",
  "SodId": "GUID",
  "SodName": "String",
  "Sku": "String",
  "Message": "String",
  "Details": "Object (Optional)",
  "Timestamp": "ISO8601"
}
```

### 4.2. Warehouse Logic
- **Available Qty:** Calculated from `crdfd_soluongthucsoan`.
- **Remaining Needed:** `qtyOrdered` - `qtyDelivered`.
- **Logic:** Warehouse can only confirm shipment if Sale has chosen `SHIP_PARTIAL`.

---

## 5. Deployment & Setup
1.  **Build:** Run `npm run build`.
2.  **Host:** Upload the build artifacts to Azure Blob Storage or create a Dataverse Web Resource.
3.  **Embed:** Add a Web Resource control to the Sales Order form in Dataverse, passing parameters `recordId`, `customerId`, and `department`.

## 6. Known Issues / Limitations
- **Race Conditions:** Rapid clicking may desync local state if API is slow. (Mitigated by blocking UI during submission).
- **Token Expiry:** LocalStorage token expiry is handled, but clock skew between client and server may cause occasional 401s.
