# 143. Operational Inbox — Read Model Design

## Overview

The **Operational Inbox** serves as the central triage dashboard for dispatchers. It aggregates exception events, pending assignments, SLA risks, and document verification tasks into a prioritized read model.

---

## 7 Category Definitions & Query Logic

The inbox organizes items into 7 distinct operational categories, each driven by specific query logic over the underlying domain state:

| Category Code | Display Name | Trigger Condition & Query Logic | Default Priority |
| :--- | :--- | :--- | :--- |
| **`DELAYED_JOB`** | Delayed Jobs | Jobs where `current_eta > estimated_arrival` by `> 30 minutes` OR stuck in transit with zero GPS movement for `> 45 minutes`. | `HIGH` |
| **`WAITING_POD`** | Waiting POD | Jobs with status `DELIVERED` but missing verified `POD_DOCUMENT` after `> 2 hours`. | `MEDIUM` |
| **`UNASSIGNED_DRIVER`** | Unassigned Drivers | Approved Job Orders scheduled for dispatch within the next `4 hours` without an assigned `driver_id`. | `CRITICAL` |
| **`GEOFENCE_ALERT`** | Geofence Alerts | Vehicles lingering inside customer/port geofence without status update for `> 60 minutes`. | `MEDIUM` |
| **`HIGH_RISK_SLA`** | High Risk SLA | Orders with less than `15% buffer time` remaining before penalty clause breach. | `CRITICAL` |
| **`CONTAINER_OVERDUE`** | Container Overdue | Container detention clock nearing free-time expiration (`< 6 hours` remaining). | `HIGH` |
| **`DISPATCH_PENDING`** | Pending Dispatch | Orders ready for driver departure awaiting final dispatcher clearance. | `LOW` |

---

## `InboxItem` Interface Definition

```typescript
export type InboxCategory =
  | 'DELAYED_JOB'
  | 'WAITING_POD'
  | 'UNASSIGNED_DRIVER'
  | 'GEOFENCE_ALERT'
  | 'HIGH_RISK_SLA'
  | 'CONTAINER_OVERDUE'
  | 'DISPATCH_PENDING';

export type InboxPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface InboxItem {
  id: string;
  category: InboxCategory;
  title: string;
  subtitle: string;
  jobOrderId?: string;
  driverId?: string;
  vehicleId?: string;
  containerId?: string;
  customerName: string;
  sbu: string; // Strategic Business Unit (e.g. "Jakarta-Trucking", "Surabaya-Container")
  priority: InboxPriority;
  timestamp: string; // ISO-8601 string
  isRead: boolean;
  metadata?: Record<string, any>;
}
```

---

## API Contract: `GET /api/copilot/inbox`

### Request Parameters

`GET /api/copilot/inbox?category=DELAYED_JOB&priority=HIGH&sbu=Jakarta&search=JO-101`

| Query Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category` | `InboxCategory` | No | Filter by specific alert category. Default: all. |
| `priority` | `InboxPriority` | No | Filter by minimum priority level (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). |
| `sbu` | `string` | No | Filter by Strategic Business Unit location/branch. |
| `search` | `string` | No | Free-text search on Job ID, Customer Name, Driver, or Container. |
| `limit` | `number` | No | Maximum items to return (default: `50`, max: `200`). |

### Response Schema

```json
{
  "success": true,
  "data": [
    {
      "id": "inbox-item-8812",
      "category": "DELAYED_JOB",
      "title": "JO-2024-0891 Heavy Traffic Delay",
      "subtitle": "ETA delayed by 42 mins on Tol Jakarta-Cikampek",
      "jobOrderId": "JO-2024-0891",
      "driverId": "DRV-102",
      "vehicleId": "VEH-554",
      "customerName": "PT Indofood Sukses Makmur",
      "sbu": "Jakarta-Trucking",
      "priority": "HIGH",
      "timestamp": "2026-08-07T08:45:00Z",
      "isRead": false,
      "metadata": {
        "delayMinutes": 42,
        "currentLocation": "KM 34 Cikarang"
      }
    }
  ],
  "meta": {
    "totalCount": 1,
    "categoryCounts": {
      "DELAYED_JOB": 1,
      "WAITING_POD": 4,
      "UNASSIGNED_DRIVER": 2,
      "GEOFENCE_ALERT": 0,
      "HIGH_RISK_SLA": 1,
      "CONTAINER_OVERDUE": 0,
      "DISPATCH_PENDING": 3
    }
  }
}
```

---

## Client-Side Filtering & Auto-Refresh Strategy

- **Polling Refresh**: Default `30-second` interval background fetch using SWR/React Query to keep inbox items synchronized without blocking UI interactions.
- **Client-Side Filtering**: Category tabs, priority toggles, and search keywords filter the local cache instantly (<15ms UI update latency).
- **Future Roadmap**: Transition from HTTP polling to real-time websocket streams powered by **Supabase Realtime** (`postgres_changes` listening to `operational_alerts` table).
