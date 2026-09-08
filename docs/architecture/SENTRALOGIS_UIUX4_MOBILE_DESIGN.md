# SENTRALOGIS — UI/UX-4 DESIGN
# MOBILE DESIGN

**Date:** 2026-09-02  

---

## 1. Design Philosophy

**Mobile = Action-Oriented**

- Designed for field operations, not management
- Thumb-friendly targets (min 44px)
- Fast, focused workflows
- Offline-capable where possible

---

## 2. Navigation

### Bottom Navigation (5 items max)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                      CONTENT                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   🏠      📋      ➕      🔔      👤                   │
│  Home   Work   Create  Alerts  Profile                 │
└─────────────────────────────────────────────────────────┘
```

### Role-Specific Bottom Nav

| Role | Items |
|------|-------|
| Operations | Home, Work, Create, Alerts, Profile |
| Driver | Home, Jobs, Scan, Alerts, Profile |
| Customer | Home, Orders, Track, Alerts, Profile |
| Vendor | Home, Assignments, Scan, Alerts, Profile |

---

## 3. Mobile Workflows

### Assignment Acceptance

```
┌─────────────────────────────────────────────────────────┐
│  ASSIGNMENT                                             │
│  JO-001 | Trucking                                      │
│  Pickup: Port of Tanjung Priok                          │
│  Delivery: BYD Subang                                   │
│  Scheduled: 15 Sep 2026                                 │
│                                                         │
│  [Accept] [Reject]                                      │
└─────────────────────────────────────────────────────────┘
```

### Job Execution

```
┌─────────────────────────────────────────────────────────┐
│  JOB IN PROGRESS                                        │
│  JO-001 | TRUCKING                                      │
│  Status: IN_PROGRESS                                    │
│                                                         │
│  [Update Location] [Upload POD] [Report Exception]      │
│  [Complete Job]                                         │
└─────────────────────────────────────────────────────────┘
```

### Shipment Tracking (Customer)

```
┌─────────────────────────────────────────────────────────┐
│  SHIPMENT SHP-001                                       │
│  Route: Shanghai → Subang                               │
│  Status: IN_TRANSIT                                     │
│  ETA: 15 Sep 2026                                       │
│                                                         │
│  ●─────●─────●─────●─────●                              │
│  Created Booked Departed Arrived Delivery               │
│                                                         │
│  [View Documents] [Contact Support]                     │
└─────────────────────────────────────────────────────────┘
```

### Exception Reporting

```
┌─────────────────────────────────────────────────────────┐
│  REPORT EXCEPTION                                       │
│                                                         │
│  Type: [Dropdown]                                       │
│  Severity: [Critical / Warning / Info]                  │
│  Description: [Text Area]                               │
│  Photo: [Take Photo / Choose]                           │
│                                                         │
│  [Submit]                                               │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Interaction Patterns

| Pattern | Usage |
|---------|-------|
| Pull-to-refresh | Refresh lists |
| Swipe actions | Quick actions on list items |
| FAB (Floating Action Button) | Primary create action |
| Card stack | Work queue |
| Bottom sheet | Detail view |

---

## 5. Offline Support

- Cache recent data
- Queue actions when offline
- Sync when connection restored
- Show sync status indicator

---

## 6. Performance Budget

| Metric | Target |
|--------|--------|
| First contentful paint | < 1.5s |
| Time to interactive | < 3s |
| List scroll | 60fps |
| Action response | < 200ms |

---

**END OF MOBILE DESIGN**
