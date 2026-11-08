# 📝 Interactive Quiz: System Design & Distributed Systems

> [!TIP] How to Take this Quiz
> Click any option below to select your answer, then click **⚡ Check Answers** to grade yourself instantly and reveal detailed architectural explanations.

```quiz
Q1: What is the primary operational trade-off defined by the CAP Theorem in a network-partitioned distributed database?
- [ ] Throughput vs Latency
- [x] Consistency vs Availability
- [ ] Sharding vs Replication
- [ ] Compression vs Encryption
Explanation: Under network partition (P), a distributed system must choose between returning errors/stale data (favoring availability) or rejecting updates until partition resolves (favoring strong consistency).

Q2: Which caching strategy writes data to both the cache and the permanent database simultaneously before returning success to the client?
- [ ] Cache-Aside (Lazy Loading)
- [x] Write-Through
- [ ] Write-Behind (Write-Back)
- [ ] Refresh-Ahead
Explanation: Write-Through guarantees strong cache-DB consistency by synchronously committing to both, avoiding stale reads at the expense of higher write latency.

Q3: In a high-traffic microservices architecture, what is the role of a Circuit Breaker pattern?
- [ ] Encrypting inter-service TLS traffic
- [ ] Automatically scaling Kubernetes pods
- [x] Preventing cascading failures when downstream services become unresponsive
- [ ] Partitioning MySQL tables by tenant ID
Explanation: Circuit Breaker tracks failures and fails fast when a threshold is breached, preventing client thread exhaustion while downstream dependencies recover.
```

