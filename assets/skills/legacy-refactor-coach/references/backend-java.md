# Java Spring Boot 专项

后端审计、P4 基线及 P5/P6 实现时使用。审计清单见 discovery.md，模块依赖规则见 architecture.md。

### Java 后端
可以考虑：

- JUnit 5。
- Mockito。
- Testcontainers。
- ArchUnit。
- Spring Modulith。
- JaCoCo。
- SpotBugs、Checkstyle 或其他兼容静态分析工具。
- OpenRewrite。
这些是候选工具，不要求全部安装。
Spring Modulith 适用于确实采用模块化 Spring 应用、并且版本兼容的项目。
ArchUnit 用于验证分层及依赖约束。
明确新增依赖必须有实际用途。

## 后端
特别强调：

- 不应将所有业务逻辑都写入 ServiceImpl。
- 不应让 Controller 直接操作 Mapper。
- 不应把数据库实体直接作为所有 API 的响应模型。
- 不应通过大量 BeanUtils 复制掩盖混乱的数据模型。
- 不应使用跨模块的全局工具类承载复杂业务。
- 应明确事务开始、提交和失败补偿的边界。
- 应注意 JPA/MyBatis 的实际使用差异。
- 应注意 Spring AOP、代理、自调用和事务语义。
- 应识别同步调用、异步任务和 MQ 消费的副作用。
- 应避免不必要的全局锁、缓存和异步化。
- 应从实际 SQL 与 JVM Profiling 结果中识别性能瓶颈。

## 执行检查

先核对 Java、Spring Boot、构建工具、数据库驱动与测试库的真实兼容矩阵。沿用项目已装工具，候选工具按用途引入。用特征测试保护遗留输入输出，测试业务不变量和失败路径；集成验证真实事务、SQL、唯一约束、并发更新和回滚语义。

检查 JPA 懒加载/N+1、批量操作、实体生命周期或 MyBatis 动态 SQL/映射/分页，按实际 ORM 分支处理。检查事务代理自调用、受检异常回滚、传播与隔离级别、跨线程事务、数据库与 MQ 的部分失败、重试幂等及补偿。禁止控制器越过用例直接操作 Mapper。领域规则不绑定 Web/ORM/SDK，跨模块通过公开接口访问数据。

分析线程池队列和拒绝策略、连接池、超时、锁范围、缓存失效、任务重入与资源关闭。性能优化以 SQL 执行计划、脱敏 profiling 和 JVM/GC 实测为据。
