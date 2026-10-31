## Architecture

## Modern Target Patterns

### 1. Strangler Fig Pattern

A gradual migration strategy that wraps new services around the existing monolith, redirecting traffic incrementally. The monolith is incrementally "strangled" by replacing its responsibilities with independently deployable services.

**Key Steps**
- Identify bounded contexts or functional areas.
- Expose new services via an API gateway or reverse proxy.
- Route a subset of traffic to the new service while the rest continues to hit the monolith.
- Gradually shift more traffic as confidence grows.
- Decommission the monolith once all responsibilities are migrated.

**Benefits**
- Low risk, incremental change.
- Allows parallel development and deployment.
- Keeps the existing system operational.

**Considerations**
- Requires a robust integration layer (e.g., API gateway, service mesh).
- Must handle data consistency across services.
- Monitoring and observability are critical.

### 2. Modular Monolith

A single deployable unit that is internally decomposed into well‑encapsulated modules. Each module has its own domain logic, persistence, and interfaces, but they share the same process and deployment.

**Key Characteristics**
- Clear module boundaries with explicit interfaces.
- Shared database or separate schemas per module.
- Strong encapsulation to prevent cross‑module coupling.
- Common runtime (e.g., JVM, .NET) and shared infrastructure.

**Benefits**
- Simpler deployment and operations.
- Easier to maintain a single codebase.
- Faster iteration compared to microservices.

**When to Move to Microservices**
- When modules grow in size or complexity.
- When independent scaling or deployment is required.
- When teams need to work autonomously.

### 3. Event‑Driven Modernization

An architecture that uses asynchronous events to decouple services, enabling scalability, resilience, and real‑time processing.

**Core Components**
- **Event Bus** (Kafka, Pulsar, NATS, etc.)
- **Event Producers** (services that publish domain events)
- **Event Consumers** (services that react to events)
- **Command Handlers** (for synchronous requests)
- **Saga Orchestration** (for long‑running transactions)

**Benefits**
- Loose coupling and high scalability.
- Better fault isolation.
- Real‑time data propagation.
- Easier to add new consumers without impacting producers.

**Challenges**
- Requires strong event schema management.
- Eventual consistency vs. strong consistency trade‑offs.
- Operational complexity of managing a message broker.

---

## Decomposition Patterns

1. **Domain‑Driven Design (DDD)** – Identify bounded contexts and aggregate roots.
2. **Feature‑Toggle Driven Decomposition** – Use feature flags to isolate new functionality.
3. **API‑First Decomposition** – Define clear contracts before implementation.
4. **Layered Architecture** – Separate concerns into presentation, application, domain, and infrastructure layers.
5. **Service‑Oriented Decomposition** – Group related capabilities into services.

---

## Summary

- **Strangler Fig** is ideal for gradual migration with minimal disruption.
- **Modular Monolith** offers a middle ground between monolith and microservices, keeping deployment simple while improving maintainability.
- **Event‑Driven** provides scalability and resilience but introduces operational overhead.
- Selecting the right pattern depends on team maturity, operational capabilities, and business urgency.
