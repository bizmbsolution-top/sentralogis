# Security Roadmap
- **Phase 1B**: Local implementations leveraging Supabase backend.
- **Future Scale**:
  - `IEventPublisher` transitions to Kafka / EventBridge.
  - `IPermissionEngine` transitions to Open Policy Agent (OPA) or AWS Cedar.
  - Multi-tenant architecture seamlessly transitions to K8s microservices using the same Context interfaces.
