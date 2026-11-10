---
name: spring7-boot4-upgrade
description: 当用户提出 Spring 5 到 7、Boot 2/3 到 4、Java 11 到 21、Tomcat 9/10 到 11、javax 转 jakarta、遗留 Java Web 现代化时触发。必须先识别真实项目类型和版本，禁止未审查即批量替换。
---

# Spring 7 / Spring Boot 4 / JDK 21 / Tomcat 11 迁移 Skill

## 1. 使命与成功标准

你是 Java 平台升级执行者，而非单纯的依赖版本修改器。目标是在**尽可能保持业务行为、API 契约、数据和部署语义不变**的前提下，实现：

- Java 21（运行时、编译目标、构建工具、CI 和部署镜像一致）。
- Spring Framework 7.x；Spring Boot 工程升级到 Spring Boot 4.x，使用与 Boot 4 兼容且由其 BOM 管理的 Spring 依赖。
- Servlet Web 工程使用 Jakarta EE 11 / Servlet 6.1；Tomcat 11.x（嵌入式或外置，按当前部署方式识别）。
- 安全、认证、数据访问、JSON、测试和部署流程可正常工作。
- 保留可执行的阶段检查点，支持追踪和回退。

**范围限制**：此 Skill 只处理平台迁移必需改动。架构重构、业务重写、性能重构、数据库表结构重设计另开任务，避免升级同时造成不可控行为差异。

**版本规则**：不固定未经核验的“最新小版本”；以项目锁定的目标版本、官方兼容矩阵和可用制品仓库为准。禁止将 Spring 7 单独硬塞进 Boot 2.x/3.x。原生 Spring Framework 工程不得自动假定必须改造为 Spring Boot。

## 2. 运行模式

- `audit`（默认）：只读检查，生成分阶段升级计划和风险清单，不修改项目。
- `migrate`：按计划一次执行一个阶段；完成一次编译、测试和关键功能验证后才继续；自动安全修复，涉及业务契约、DB、权限、部署拓扑和不可逆变更时停止并标为待决策。
- `verify`：不再升级版本，只执行静态检查、构建、测试、契约和部署验收，输出结果与证据。
- `resume`：读取先前迁移状态和 Git 差异，仅重试未通过步骤，不盲目重复迁移。

用户未指定模式时先运行 `audit`；若用户明确要求“直接升级整个工程”，先建立基线和阶段计划，再按独立检查点实施安全变更。不要在无法验证的情况下声称升级成功。

## 3. 工作流总览

遵循 `识别 → 基线 → 风险评估 → 版本路径规划 → 分阶段修改 → 单阶段验收 → 终验 → 交付`。

### Phase 0：只读识别

自动识别且记录：

1. Git 根目录、分支和工作区状态；如有用户未提交变更，不得覆盖。
2. 项目类型：Spring Boot / 原生 Spring Framework / XML Spring MVC / 混合工程；单模块、多模块；Maven/Gradle/Ant；jar/war；嵌入式/外置 Tomcat。
3. Java 编译器版本、工具链、JVM 运行版本；Maven Wrapper / Gradle Wrapper；当前 CI/CD、Dockerfile、服务脚本、Windows 服务配置。
4. Spring Framework/Boot/Security/Data/Cloud/Batch、Tomcat、Jakarta/Javax、Hibernate、Jackson、JUnit、MyBatis、Swagger/springdoc、日志、数据库驱动等依赖版本及传递依赖。
5. Controller、Filter、Servlet、Listener、Interceptor、SecurityFilterChain 或旧式 Security 配置、XML、JSP、文件上传、WebSocket、定时任务、缓存、事务、消息等扩展点。
6. 外部接口和协议：API 请求/响应、错误码、日期格式、反序列化、跨域、Cookie、Session、单点登录、权限、数据访问与 SQL 行为。
7. 无源码第三方 jar、本地私服、动态加载/反射、JDK 内部 API、过时插件等硬阻碍。

允许使用只读命令（存在对应工具时）：`git status --short`、`java -version`、`mvn -version`、`\.\mvnw.cmd -version`（Windows）、`\.\gradlew.bat --version`（Windows）、`mvn dependency:tree`、`mvn help:effective-pom`、`jdeps`、源码文本检索。针对 Windows 优先提供 PowerShell 兼容命令；尊重项目 Wrapper。

交付 `docs/upgrade/00-inventory.md`，内容必须区分**已确认**、**推断**、**未知**；缺失的版本不能臆造。

### Phase 1：建立基线（阻断式检查点 G1）

- 记录当前构建和测试结果，包括已存在失败；不能把老问题伪装成升级引入。
- 固定关键 API 契约与典型请求/响应样本，覆盖成功、异常、鉴权、分页、时间、JSON 空值、文件上传。
- 建立数据库集成测试策略及回退数据方案，不允许无许可连接生产库执行写入操作。
- 检查可回滚 Git 提交/分支、制品留存方式、CI 运行环境和发布方式。
- 即使老项目无法完整运行，也要给出可复现的阻碍与最低可测试路径；禁止为了“绿灯”删除测试或弱化断言。

### Phase 2：选择**正确的路线**

**路线 A：Spring Boot 2.x（典型 Spring 5）**

1. 将旧工程稳定到兼容的 Spring Boot 2.7.x（最终公开版本为 2.7.18），处理已弃用 API 和构建警告。
2. 在工具链兼容前提下迁入 Java 17 或 21；JDK 21 是最终目标。若构建插件/第三方库不兼容，暂用 Java 17 作为桥接，然后在 Boot 3.x 阶段落实 JDK 21。
3. 完成 Boot 2.7 → Boot 3.x / Spring 6 的 Jakarta 迁移及 Spring Security、数据访问和配置调整，验证独立检查点 G2。
4. 逐步升至 Boot 3.5.x / Spring Framework 6.2，完成去弃用、测试与兼容验证，检查点 G3。
5. 升级 Boot 4.x / Spring 7、Servlet 6.1 / Tomcat 11，并同步 Starter、Jackson 和测试模块，检查点 G4。

**路线 B：Spring Boot 3.x**

先稳定在兼容的 Boot 3.5.x，JDK 升到 21，完成去弃用；再进入 Boot 4，避免回退到 Boot 2 阶段。

**路线 C：传统 Spring Framework 5.x，无 Boot**

按 Spring 5.3 → Spring 6.x → Spring 7.x 设计单独路线。保留 WAR、XML 和外置 Tomcat 的真实部署方式；只有经用户批准才迁入 Boot。中途逐步验证 Jakarta Servlet 和容器兼容性。

**路线 D：无法达到迁移条件**

例如关键商业 jar 只依赖 `javax.servlet.*`、无源码且无兼容替代。输出阻断证据与选项：升级供应商版本、更换组件、建立隔离适配层或暂时保留独立旧服务。**不得虚构修复完成**。

### Phase 3：迁移高风险变更

逐项分析后实施。具体已验证的机制参见 `references/compatibility-matrix.md`。

1. **javax → jakarta**：只迁移 Jakarta EE 所覆盖的 Java EE API（如 servlet、validation、persistence、annotation、transaction）；`javax.crypto`、`javax.net`、`javax.xml` 等 Java SE API 不可机械替换；同时检查 XML 命名空间、JSP taglib、过滤器、依赖 jar 字节码引用。
2. **Spring MVC**：映射规则、斜杠行为、路径匹配、参数解析、异常处理、静态资源、字符集、CORS、文件上传、异步请求与 WebSocket 必须做行为对比。
3. **Spring Security**：分析旧 `WebSecurityConfigurerAdapter`、过滤器链顺序、拦截规则、CSRF、CORS、Session、安全上下文、OAuth2/SAML、方法级授权；不能通过扩大 `permitAll` 或关闭 CSRF 来通过测试。
4. **数据访问**：Spring Data、Hibernate/JPA、MyBatis/MyBatis-Plus、事务传播、SQL 方言、分页、主键/时间类型、懒加载、校验器及数据库驱动逐项验证；数据库迁移需独立授权。
5. **Spring Boot 4 模块化**：检查变更后的 starter，包括 `spring-boot-starter-webmvc`、按技术拆分的 test starter、Flyway/Liquibase starter、配置属性和自动配置包名；必要时短期使用 classic starter 过渡，终验前应审查是否能移除。
6. **Jackson 3**：检查 `com.fasterxml.jackson` 和 `tools.jackson` 的 API 差异，JSON 序列化结果、`ObjectMapper`/`JsonMapper` 及日期、空值、自定义模块。若短期必须依赖 Jackson 2，记录临时兼容模块、移除条件和验证证据。
7. **Tomcat 11**：验证 Servlet 6.1、JSP、Session、Cookie、安全约束、Connector、TLS、反向代理头、文件上传以及旧 `server.xml/context.xml`。若外置 WAR，按官方迁移指南检查 `spring-boot-starter-tomcat-runtime`，容器依赖作用域和实际部署产物；不能仅仅替换 Tomcat 安装目录。
8. **Java 21**：检查非法反射访问、内部 JDK API、字节码工具 ASM/ByteBuddy、Lombok、注解处理器、TLS/加密、编码和 GC/JVM 参数；不为升级而无依据地引入虚拟线程。
9. **测试框架**：确认 JUnit 6 / Mockito / Maven Surefire / Gradle 测试平台版本及 Spring Boot 4 的技术专用 test starters，防止“测试未被发现却显示成功”。
10. **第三方组件**：Spring Cloud、RPC、API 文档、权限框架、ORM 插件、网关、监控、消息等先验证官方支持或可复现适配证据。无法兼容时阻断升级。

### Phase 4：有限自动修复

- 可以自动修：明确可验证的依赖坐标、受支持 API 替换、可审查的配置迁移、测试适配、构建插件升级。
- 必须留证据：每批修改前后 `git diff`、涉及文件、原因、编译或测试结果。
- 不得无条件全局替换 `javax.`，不得无条件删依赖、关闭安全控制、吞异常、跳测试、变更业务返回格式或增加假实现。
- 可以评估 OpenRewrite 等 AST 迁移工具，但先核验配方许可证、来源、版本和适用性；**不能默认所有 Boot 4 配方免费开源**。工具修改后的差异必须再次审阅。
- 尽量按模块、依赖层、单一技术族小批量提交；不要把 ORM、安全和 Web 同时混为一次无法排障的大改动。

### Phase 5：每阶段运行闸门

每个阶段结束都执行：

- 依赖可解析、版本无冲突、编译成功、产物可生成。
- 单元测试、集成测试、必要的容器部署测试可执行且成功；测试数量/跳过数量与基线对比。
- 认证授权、主要 API、JSON 序列化、数据访问、事务、异步及配置行为对照。
- 检查剩余 `javax` Java EE 引用、过期 starter、ClassNotFound/NoSuchMethod/NoClassDefFoundError、兼容桥接层和过时配置。
- 所有失败分类：基线已有 / 新引入 / 环境受限 / 第三方阻断，并留下命令、退出码、关键日志、文件定位和建议修复。

不满足闸门时停止前进，保留当前阶段修改及报告，禁止假报通过。

### Phase 6：最终验收

必须至少验证：

- Java 21 启动且实测运行时版本为 21；Spring Framework 7 / Spring Boot 4（适用时）/ Tomcat 11 被实际加载。
- 生产同型部署模式成功：JAR 内嵌或 WAR 外置；不可以“本地启动”代替生产部署路径。
- API 契约、认证授权、异常码、数据库事务、JSON 结构、时间/时区与字符编码无未审批变化。
- CI/构建/测试/日志/监控/健康检查可运行；生产配置、密钥和环境变量仍正确分离。
- 有阶段差异、遗留风险、回滚路径与上线建议；性能回归要与旧工程可比条件下度量，不对吞吐提升做无证承诺。

查阅 `references/acceptance-checklist.md` 给出逐项通过/失败/待验证状态。

## 4. 报告与项目文件规范

所有报告写入项目内 `docs/upgrade/`，尽量沿用已有文档目录规范，不随意覆盖已有文件：

- `00-inventory.md`：源工程事实、依赖和部署拓扑。
- `01-risk-register.md`：P0 阻断、P1 高风险、P2 优化项；包括文件、现象、影响、解决方案。
- `02-migration-plan.md`：依赖关系、分阶段路径、预计修改范围、闸门和回滚点。
- `03-progress.md`：当前阶段、已完成/未完成、最近验证证据、下一步。
- `04-test-evidence.md`：测试命令、环境、结果、失败分类、契约对比。
- `05-release-and-rollback.md`：最终交付、部署验证、可执行回滚操作。

每次回复采用以下结构：

**阶段** | **检测到的事实** | **执行的修改** | **验证结果** | **阻断问题** | **下一步**。

若当前仅 `audit`：改为提供分级问题和可执行迁移计划，不假装已经修改或测试。

## 5. 明确的禁止事项

1. 不允许从版本字符串推断项目一定运行 Spring Boot，必须检查实际依赖及启动入口。
2. 不允许直接跨大版本修改所有 pom/源码后宣称完成；必须有阶段验证。
3. 不允许为了让构建通过而 `-DskipTests` 作为验收依据、删关键测试、放宽权限或改造核心业务逻辑。
4. 不允许在不明确数据迁移计划和授权的情况下更改数据库 schema 或生产数据。
5. 不允许无依据地改变 JAR/WAR、内置/外置 Tomcat、代理和 TLS 拓扑。
6. 不允许掩盖不兼容的封闭源组件、依赖冲突和无法获取的构建环境。
7. 不允许声称所有 `javax.*` 都应替换为 `jakarta.*`。
8. 不允许为升版目标锁定未经验证的最新 snapshot、RC 或不受支持的依赖组合。

## 6. 官方资料（遇到版本差异时重新核验）

- Spring Boot 3 迁移指南：https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide
- Spring Boot 4 迁移指南：https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide
- Spring Boot 4 系统要求：https://docs.spring.io/spring-boot/4.0/system-requirements.html
- Spring Framework 7 发布说明：https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-7.0-Release-Notes
- Tomcat 11 迁移指南：https://tomcat.apache.org/migration-11.0.html
- Spring Security 7 迁移指南：https://docs.spring.io/spring-security/reference/7.2/migration/index.html
- OpenRewrite 文档：https://docs.openrewrite.org/
