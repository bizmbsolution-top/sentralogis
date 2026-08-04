# Domain Adoption Roadmap

| Domain | Current State | Platform Usage | Migration Status | Remaining Work | Dependencies |
|--------|---------------|----------------|------------------|----------------|--------------|
| Trucking | Legacy / Scaffolded | Missing | Pending | Extract from `app/sbu/trucking` | Platform, Kernel |
| Warehouse | Legacy / Scaffolded | Missing | Pending | Extract from `app/sbu/warehouse` | Platform, Kernel |
| Clearance | Concept Only | Missing | Pending | Scaffold & Implement | Trucking, Warehouse |
| Forwarding | Legacy / Scaffolded | Missing | Pending | Extract from `app/sbu/forwarding` | Trucking, Warehouse |
| Depot | Concept Only | Missing | Pending | Scaffold & Implement | Forwarding, Warehouse |
| Customs | Concept Only | Missing | Pending | Scaffold & Implement | Clearance |
| Inventory | Legacy / Scaffolded | Missing | Pending | Extract from legacy RPCs | Warehouse |
| AI | Concept Only | Missing | Pending | Predictive fleet maintenance | Trucking, Kafka |
