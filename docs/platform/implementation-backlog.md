# Implementation Backlog

## Confirmed Gaps
- **Business Domain Migration**: Extract Trucking and Warehouse logic from `app/` to `src/domains/`. (Priority: High | Target Phase: 3)
- **Application Layer Enrichment**: Build proper Use Cases / Commands in `src/application/` to orchestrate Platform entities. (Priority: High | Target Phase: 3)
- **Transactional Outbox**: Implement Outbox pattern for reliable domain event publishing. (Priority: Medium | Target Phase: Infrastructure)

## Suspected Gaps
- **Retry Policy**: Dead letter queues and retry mechanisms for EventBridge/Kafka likely missing. (Priority: Medium | Target Phase: Infrastructure)

## Not Verified
- **Integration Tests**: NOT VERIFIED.
- **Contract Tests**: NOT VERIFIED.
- **Performance Benchmarks**: NOT VERIFIED.
- **Distributed Tracing Exporter**: NOT VERIFIED.
- **Observability Dashboards**: NOT VERIFIED.
