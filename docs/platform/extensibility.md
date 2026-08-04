# Platform Extensibility

## Event Brokers
The Platform emits `DomainEvents`. These can be routed to:
- **Kafka / EventBridge / RabbitMQ / Service Bus**: (PLANNED) For inter-service async choreography.

## Orchestration
- **Temporal / Camunda**: (PLANNED) For long-running distributed Sagas (e.g., complex Trucking delivery workflows).

## Observability
- **OpenTelemetry**: (PLANNED) Traces every `Result<T>` execution and `DomainEvent` dispatch.