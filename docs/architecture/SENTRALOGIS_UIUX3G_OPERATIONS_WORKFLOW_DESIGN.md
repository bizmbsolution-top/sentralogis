# SENTRALOGIS — UI/UX-3G
# OPERATIONS WORKFLOW DESIGN

**Date:** 2026-09-01  

---

## 1. Fulfillment UX

### Purpose
Composition boundary between commercial commitment and operational execution.

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Fulfillment Number, SO reference, Status, Revision |
| Allocations Table | Capability, Allocated Qty, Delivered Qty, Status, Shipment Ref |
| Actions | Add Allocation, Update Progress, Create Handoff |

---

## 2. Shipment UX

### Purpose
Operational logistics movement aggregate.

### States
```
DRAFT → PLANNED → BOOKED → IN_TRANSIT → DELIVERED → COMPLETED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Shipment Number, Route, Status, ETA |
| Tabs | Overview, Timeline, Execution, Documents, Exceptions, Financial, Activity |
| Units | Container/Package list with type, number, seal |
| Legs | Execution legs with scheduled/actual times |
| Actions | Add Unit, Add Leg, Update Status |

---

## 3. Execution UX

### Purpose
Multi-modal execution tracking.

### Leg Types
```
SEA → LAND → AIR → CONSOLIDATION
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Leg Header | Type, Start, End, Status |
| Resources | Vehicle, Driver, Vessel |
| Milestones | Planned vs Actual |
| Actions | Update Status, Add Document, Report Exception |

---

## 4. Assignment UX

### Purpose
Resource assignment to operational work.

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | JO Number, Customer, Route, Status |
| Assignment | Driver, Fleet, Transporter |
| Actions | Assign, Reassign, Cancel |

### Assignment Flow
```
Select JO → Choose Driver → Choose Fleet → Confirm → Notify
```

---

## 5. SBU Workspaces

### Trucking

| View | Content |
|------|---------|
| My Work | Assigned jobs, Pending assignments |
| Work Queue | All JOs filtered by status |
| Fleet | Vehicle list, status, GPS |
| Drivers | Driver list, status, performance |

### Forwarding

| View | Content |
|------|---------|
| Shipments | FCL/LCL list, status |
| Consolidations | Vessel/voyage management |
| Containers | Container tracking |
| Documents | MBL, HBL, shipping instructions |

### Customs

| View | Content |
|------|---------|
| Declarations | Import/export list |
| Clearance | Milestone tracking |
| Documents | Supporting documents |
| Exceptions | Holds, rejections |

### Warehouse

| View | Content |
|------|---------|
| Inbound | Receipt tasks |
| Outbound | Picking/shipping tasks |
| Inventory | Stock levels |
| Tasks | Handling tasks |

---

## 6. Exception UX

### Purpose
Operational exception management.

### Exception Types
```
DELAY → DAMAGE → DOCUMENT → CUSTOMS → SLA → FINANCIAL
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Exception Type, Severity, Entity |
| Details | Description, Impact, Root Cause |
| Actions | Resolve, Escalate, Create Task |

---

## 7. Tracking UX

### Purpose
Shipment tracking and milestone visibility.

### Screen Specification

| Element | Description |
|---------|-------------|
| Map | Route visualization |
| Milestones | Planned vs actual |
| Current Status | Location, ETA |
| Documents | Available documents |

---

**END OF OPERATIONS WORKFLOW DESIGN**
