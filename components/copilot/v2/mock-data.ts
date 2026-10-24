import { 
  CopilotMessage, 
  SuggestedPrompt, 
  Conversation, 
  EntityDetail 
} from './types';

export const MOCK_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { label: "What's happening today?", query: "What's happening today?", icon: "Calendar" },
  { label: "Show delayed shipments", query: "Show delayed shipments", icon: "ClockAlert" },
  { label: "Customer activity for ABC Corp", query: "Show customer activity for ABC Corp", icon: "Building2" },
  { label: "Exceptions requiring attention", query: "Show exceptions requiring attention", icon: "AlertTriangle" },
  { label: "Find order SO-2026-08-0042", query: "Find order SO-2026-08-0042", icon: "Search" },
  { label: "Shipments with ETA changes", query: "Show shipments with ETA changes", icon: "Truck" }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    createdAt: new Date("2026-10-03T09:00:00+07:00"),
    messages: [
      {
        id: "msg-1",
        role: "user",
        type: "text",
        content: "Show shipments for Customer ABC whose ETA changed today.",
        timestamp: new Date("2026-10-03T09:00:00+07:00")
      },
      {
        id: "msg-2",
        role: "assistant",
        type: "understanding",
        timestamp: new Date("2026-10-03T09:00:02+07:00"),
        understanding: {
          customer: "ABC Corporation",
          object: "Shipments",
          condition: "ETA Changed",
          period: "Today"
        }
      },
      {
        id: "msg-3",
        role: "assistant",
        type: "result",
        timestamp: new Date("2026-10-03T09:00:05+07:00"),
        results: {
          type: "shipments",
          count: 12,
          summary: "Found 12 shipments for ABC Corporation with ETA changes today.",
          items: [
            { id: "SHP-2841", label: "SHP-2841 - Jakarta to Surabaya", status: "In Transit", statusColor: "yellow", meta: { eta: "2026-10-05", delay: "2 days" } },
            { id: "SHP-2842", label: "SHP-2842 - Semarang to Bali", status: "In Transit", statusColor: "blue", meta: { eta: "2026-10-04", delay: "1 day" } },
            { id: "SHP-2845", label: "SHP-2845 - Jakarta to Medan", status: "Delayed", statusColor: "red", meta: { eta: "2026-10-07", delay: "4 days" } },
            { id: "SHP-2850", label: "SHP-2850 - Bandung to Surabaya", status: "Delivered", statusColor: "green", meta: { eta: "2026-10-02", delay: "None" } }
          ]
        }
      },
      {
        id: "msg-4",
        role: "user",
        type: "text",
        content: "Only delayed ones.",
        timestamp: new Date("2026-10-03T09:05:00+07:00")
      },
      {
        id: "msg-5",
        role: "assistant",
        type: "result",
        timestamp: new Date("2026-10-03T09:05:03+07:00"),
        results: {
          type: "shipments",
          count: 3,
          summary: "Filtered to 3 delayed shipments for ABC Corporation.",
          items: [
            { id: "SHP-2841", label: "SHP-2841 - Jakarta to Surabaya", status: "In Transit (Delayed)", statusColor: "yellow", meta: { eta: "2026-10-05", delay: "2 days" } },
            { id: "SHP-2842", label: "SHP-2842 - Semarang to Bali", status: "In Transit (Delayed)", statusColor: "yellow", meta: { eta: "2026-10-04", delay: "1 day" } },
            { id: "SHP-2845", label: "SHP-2845 - Jakarta to Medan", status: "Delayed", statusColor: "red", meta: { eta: "2026-10-07", delay: "4 days" } }
          ]
        }
      },
      {
        id: "msg-6",
        role: "user",
        type: "text",
        content: "Why is SHP-2841 delayed?",
        timestamp: new Date("2026-10-03T09:06:00+07:00")
      },
      {
        id: "msg-7",
        role: "assistant",
        type: "text",
        content: "SHP-2841 is delayed because the assigned carrier's truck broke down near Cirebon. A replacement truck has been requested but it adds 2 days to the ETA.",
        timestamp: new Date("2026-10-03T09:06:10+07:00"),
        entityRefs: [
          { type: "shipment", id: "SHP-2841", label: "SHP-2841", status: "In Transit", statusColor: "yellow" },
          { type: "exception", id: "EXC-9912", label: "Truck Breakdown", status: "Open", statusColor: "red" }
        ]
      },
      {
        id: "msg-8",
        role: "user",
        type: "text",
        content: "Can you replace the carrier for SHP-2841?",
        timestamp: new Date("2026-10-03T09:10:00+07:00")
      },
      {
        id: "msg-9",
        role: "assistant",
        type: "proposal",
        timestamp: new Date("2026-10-03T09:10:15+07:00"),
        proposal: {
          id: "prop-1",
          title: "Replace Carrier",
          description: "Reassign shipment to a new carrier to mitigate delay.",
          intent: "carrier_reassignment",
          entityId: "SHP-2841",
          entityType: "shipment",
          changes: [
            { field: "Carrier", from: "PT Lintas Nusantara", to: "PT Cepat Logistik" },
            { field: "Estimated Cost", from: "Rp 5,500,000", to: "Rp 6,200,000" },
            { field: "Revised ETA", from: "2026-10-07", to: "2026-10-05" }
          ],
          reason: "Replacing the carrier will reduce the delay by 2 days, though at a slightly higher cost.",
          executionAvailable: false
        }
      }
    ]
  }
];

export const MOCK_ENTITY_DETAILS: Record<string, EntityDetail> = {
  "SHP-2841": {
    type: "shipment",
    id: "SHP-2841",
    title: "SHP-2841",
    subtitle: "Jakarta to Surabaya",
    status: "In Transit",
    statusColor: "yellow",
    fields: [
      { label: "Customer", value: "ABC Corporation" },
      { label: "Carrier", value: "PT Lintas Nusantara" },
      { label: "Vehicle", value: "B 1234 CD (Fuso)" },
      { label: "Driver", value: "Budi Santoso" },
      { label: "Origin", value: "Jakarta Warehouse A" },
      { label: "Destination", value: "Surabaya Hub" },
      { label: "ETA", value: "2026-10-05 (Delayed)" }
    ],
    timeline: [
      { id: "tl-1", date: "2026-10-01 08:00", title: "Dispatched", description: "Left Jakarta Warehouse A", type: "success" },
      { id: "tl-2", date: "2026-10-02 14:30", title: "Checkpoint", description: "Passed Semarang", type: "info" },
      { id: "tl-3", date: "2026-10-03 05:00", title: "Exception", description: "Truck breakdown near Cirebon", type: "error" }
    ],
    evidence: [
      { id: "ev-1", type: "photo", title: "Vehicle Photo", date: "2026-10-01" },
      { id: "ev-2", type: "document", title: "Surat Jalan", date: "2026-10-01" }
    ]
  },
  "CUST-ABC": {
    type: "customer",
    id: "CUST-ABC",
    title: "ABC Corporation",
    subtitle: "Enterprise Client",
    status: "Active",
    statusColor: "green",
    fields: [
      { label: "Industry", value: "FMCG" },
      { label: "Contact", value: "Jane Doe (jane@abc.com)" },
      { label: "Active Orders", value: "45" },
      { label: "SLA Compliance", value: "98.5%" }
    ]
  },
  "SO-2026-08-0042": {
    type: "sales-order",
    id: "SO-2026-08-0042",
    title: "SO-2026-08-0042",
    subtitle: "Monthly Restock - Surabaya",
    status: "Processing",
    statusColor: "blue",
    fields: [
      { label: "Customer", value: "ABC Corporation" },
      { label: "Order Date", value: "2026-08-15" },
      { label: "Total Value", value: "Rp 150,000,000" },
      { label: "Items", value: "12 Pallets" }
    ]
  },
  "JO-2026-00481": {
    type: "job-order",
    id: "JO-2026-00481",
    title: "JO-2026-00481",
    subtitle: "Transport 12 Pallets to Surabaya",
    status: "Assigned",
    statusColor: "yellow",
    fields: [
      { label: "Sales Order", value: "SO-2026-08-0042" },
      { label: "Carrier", value: "PT Lintas Nusantara" },
      { label: "Status", value: "Awaiting Dispatch" }
    ]
  },
  "EXC-9912": {
    type: "exception",
    id: "EXC-9912",
    title: "Truck Breakdown",
    subtitle: "SHP-2841 near Cirebon",
    status: "Open",
    statusColor: "red",
    fields: [
      { label: "Reported By", value: "Budi Santoso (Driver)" },
      { label: "Severity", value: "High" },
      { label: "Impact", value: "2 days delay" },
      { label: "Resolution", value: "Pending Carrier Replacement" }
    ]
  }
};

export const MOCK_CONTEXT_ITEMS = {
  recentEntities: [
    { type: "shipment", id: "SHP-2841", label: "SHP-2841", status: "Delayed" },
    { type: "customer", id: "CUST-ABC", label: "ABC Corporation", status: "Active" },
    { type: "sales-order", id: "SO-2026-08-0042", label: "SO-2026-08-0042", status: "Processing" }
  ],
  systemStatus: "Normal Operations",
  activeAlerts: 3
};
