# 0.4共享后端实施记录

日期：2026-10-20。源码在pms/server/，界面通信层在pms/web/backend.js。执行与限制详见pms/README.md。

## 决策与边界

选择Node.js 24内置SQLite作为不安装额外依赖的本地开发起点。原PostgreSQL方案仍为生产候选，未伪称已执行PostgreSQL草案。SQLite并发测试只能证明当前实现与SQLite约束，不证明PostgreSQL生产路径。

持久化表：properties（每店状态/版本）、users、user_properties、sessions、receipts（幂等回执）、claims（资源逐夜唯一占用）、audit（只追加）。状态聚合目前包含订单及其流水、分配历史和资源；后续按生产关系模型拆分迁移。库存事务使用BEGIN IMMEDIATE串行化写入，且数据库唯一键防同店同物理单元同夜重复占用。审计、占用、订单及幂等回执同事务提交。

单组织JOVIAN范围；不是多租户SaaS实现。角色admin/operations/finance/viewer；当前admin与operations在前台同权，finance仅可收付写入，viewer不可写。所有角色只能读取被授权门店的完整前台资料；尚无财务字段脱敏或现场清洁角色，不应给现场团队发运营角色。

账号由本机setup创建。密码scrypt加盐哈希；会话令牌数据库只存SHA256，cookie HttpOnly及SameSite Strict；HTTP开发仅loopback。登录频率限制、Origin/Host和CSRF检查、32KiB请求上限、日期366晚范围限制。静态文件白名单不提供数据库、设置脚本、测试或server源码下载。

API：GET /api/mode、POST /api/login、GET /api/session、GET /api/state、POST /api/commands、POST /api/logout。命令需会话、CSRF、门店授权、角色权限、幂等键及expectedRevision；客户端自报ID/时间/操作者不作为审计依据。旧版本409，已提交同一幂等请求可取回回执；同键不同内容拒绝。

界面接入账号登录、退出、共享状态刷新和异步提交。共享模式不自动导入localStorage，也不在后端失效时降级保存。保留静态服务器404识别后的旧演示模式，页脚明确区分。

## 验证证据

npm test共30项通过（19旧逻辑＋11新增）。独立Worker各开数据库连接竞争最后一间房：一笔成功、一笔旧版本拒绝；更新版本再试仍因无库存拒绝。两账号通过界面同一Backend通信模块访问真实HTTP服务，读取共同订单及付款；重放收款仅一次。验证断开会话、门店越权、角色拒绝、CSRF、数据库约束、关闭后重新读取及CLI不覆盖数据。

本轮浏览器技能可读但实际js工具不可用，未进行GUI/Windows实机验证，不复用0.3截图声称0.4通过。数据库管理者仍可修改数据库/删除触发器，只追加审计并不提供外部防篡改保证。备份恢复、密码找回、用户停用、自动推送、生产HTTPS和PostgreSQL迁移待完成。

## 下一项

验证0.4登录与异步界面的实际操作，补资源/房型配置与多房多人订单，逐步替换历史换床模型，再推进财务和外部集成。禁止在无证据情况下宣称SmartOrder整套界面已对齐。
