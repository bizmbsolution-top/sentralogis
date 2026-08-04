# Architecture Diagrams

## Layer Diagram
```mermaid
graph TD
  UI[Presentation] --> App[Application]
  App --> Domain[Business Domains]
  Domain --> Plat[Logistics Platform]
  Plat --> Kernel[Shared Kernel]
  Kernel --> Infra[Infrastructure]
```

## CQRS Flow
```mermaid
graph LR
  Cmd[Command] --> Handler
  Handler --> Aggregate
  Aggregate --> Event
  Query --> Projection
```