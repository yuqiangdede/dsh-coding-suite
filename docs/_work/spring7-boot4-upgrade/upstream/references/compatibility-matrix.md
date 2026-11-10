# 目标版本及迁移兼容矩阵

> 本文件用于判断大版本兼容关系。微版本必须在实际迁移时通过官方文档和项目制品仓库复核；不得直接把下表作为可锁定版本号。

| 检查项 | 典型旧环境 | 过渡阶段 | 最终目标 | 检验重点 |
|---|---|---|---|---|
| Java | 11 | 17 / 21 | 21 | 编译器、运行时、JVM 参数、工具链、部署镜像一致 |
| Spring Framework | 5.x | 6.2.x | 7.x | 由 Spring Boot BOM 管理，传统 Spring 工程独立管理 |
| Spring Boot | 2.x | 2.7.x → 3.5.x | 4.x | Spring 5/6/7 不可任意混搭 |
| Tomcat | 9.x（须检测） | 10.1.x | 11.x | WAR 外置和 JAR 内嵌分别验证 |
| Servlet | 4.0（须检测） | 6.0 | 6.1 | javax → jakarta, Servlet 行为变更 |
| EE 平台 | Java EE 8 | Jakarta EE 10 | Jakarta EE 11 | 第三方库兼容性 |
| JSON | Jackson 2 | Jackson 2 | Jackson 3 优先 | groupId/package 与序列化行为 |
| 数据访问 | JPA 2.x | JPA 3.1 | JPA 3.2 | Hibernate/驱动/方言与事务 |
| Security | 5.x（若使用） | 6.5 | 7.x | 授权和过滤器安全语义 |
| Testing | JUnit 4/5（须检测） | JUnit 5 | JUnit 6 或 Boot 4 官方兼容方案 | 测试是否真正执行 |

## 关键已确认事实

- Spring Boot 4.x + Spring Framework 7.x 采用 Jakarta EE 11，Servlet 6.1，可搭配 Tomcat 11，JDK 21 满足最低 JDK 17 要求。
- Boot 4 官方迁移指南建议先进入最新的 Boot 3.5.x，并核验被移除的弃用 API。
- Spring Boot 3 官方迁移指南建议 Boot 2.x 先进入 2.7.x。
- Boot 4 使用更细分的 Starter；`spring-boot-starter-web` 是可迁移至 `spring-boot-starter-webmvc` 的旧名称。
- Boot 4 默认首选 Jackson 3，但官方提供暂时性的 Jackson 2 过渡模块。不能直接认定业务 JSON 兼容。
- 外置 Tomcat 11 的 WAR 部署需要专门核查 Boot 4 提到的 `spring-boot-starter-tomcat-runtime`。
- Jakarta EE 的迁移不是“将项目里所有 javax 包名替换”；Java SE 中的 javax 包保留原名。
- Tomcat 11 已移除 SecurityManager 支持；如旧系统依赖，应作为迁移阻断问题。
- OpenRewrite 部分 Spring Boot 4 自动迁移配方采用特定源代码可用/商业许可；实际使用前确认许可及执行环境。

## 依据

- https://docs.spring.io/spring-boot/4.0/system-requirements.html
- https://docs.spring.io/spring-boot/3.5/system-requirements.html
- https://docs.spring.io/spring-boot/docs/2.7.x/reference/html/getting-started.html
- https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide
- https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide
- https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-7.0-Release-Notes
- https://tomcat.apache.org/migration-11.0.html
- https://docs.openrewrite.org/recipes/java/spring/boot4/
