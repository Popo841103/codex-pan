# JOVIAN PMS · 会话上下文重建

> 给「没有本次对话记忆」的 AI 工具用。读完本文 + `WORKBUDDY-HANDOFF.md`，应当能不重新调研就接着开发。本文只记事实与决策，不含凭据、内部路径或工具输出。

## 用户是怎么工作的

- 一次给一段长需求，之后反复用「继续 / 继续啊 / 继续吧 / 继续开发」推进**下一批**自主开发。每批的流程固定：读仓库 → 找缺口 → 实现 → 测试 → 提交 → 推送 → 部署 → 从外部核验 → 把结论写进交接文档。
- 需要选择时会用确认卡片，例如清空订单那次，用户选的是「只清标记为 TEST 的订单」。**涉及删除数据必须先确认范围**。
- 重视「证据等级」：实见 / 文档 / 推断 / 未验证要分开说；不能把合成测试或推断写成真实联调。
- 不做的事：不问密码、不提交凭据、不削弱 Windows 两项私有文件权限失败用例、不重置线上数据、不伪造外部接口、不重建系统。

## 长期有效的硬约束

1. 保留现有改动、账号、订单、账务、数据库；线上数据不重置、不写模拟数据。
2. 真实 OTA / 支付 / 消息 / 门锁均未接通（NOBEDS / TTHotel 为目标）；测试可用合成 provider，但结论必须写明是合成的。
3. 发布器只刷新既有文件：新增运行时逻辑并进 `pms/server`、`pms/src`、`pms/web` 的已有文件；`/server/` 不对外提供。新增文件仅限 `test/`、`verification/`、`docs/`、归档目录。
4. 私有仓库访问用 **Deploy key**（用户曾问「方案 A 怎么转公开」，最终改用 deploy key），不要问密码。
5. `/sites/<slug>` 在资源白名单前响应，CSP `default-src 'none'`，无脚本无会话；发布会重启服务，可作为后端已更新的间接证据。
6. 中英马来文三语、多门店（CO-HUB 青旅 / JOVIAN 公寓共用后台）、房 / 整套 / 床位。

## 架构与易踩的坑

- **双状态机**：`src/demo-store.js`（本地归约）与 `server/store.js`（SQLite 共享后台）。命令带 `expectedRevision` + 幂等 key + fingerprint；角色 `admin/operations/finance/viewer`，`user_properties.role` 支持门店覆盖，`actionsFor()` 合并权限。
- **`commit()` 曾覆盖命令里的 `date`**：改为显式优先；审计误拦 `payment`，改为仅锁 `edit` / `cancel`。
- **营业日 vs 马来西亚交易日 `localDay` 是两套口径**；押金是负债；`writer generation = 9` 阻止旧运行时写 `properties.body`。
- **测试环境**：Node 24（ESM、`node:sqlite`、`node --test`）、Python unittest、jsdom 用于 `verification/*.mjs`（运行时把 `node_modules/jsdom/lib/api.js` 作为 argv[2] 传入）。
- **DOM 脚本里若有轮询 timer，必须 `.unref?.()`**，否则 jsdom 进程不退出。
- **`create_reservation` 冒烟字段很容易漏**：`occupants` 数组长度须与人数一致，跨门店要用 `roomTypeOf`，还要带 `companyName` / `source` / `autoAssign`。

## 逐批踩过的坑与修法

| 批次 | 问题 | 修法 |
|---|---|---|
| 早期 | 新运行时文件发布后 404 | 确立「新增模块并入既有文件」的发布约束 |
| 6 | 门店角色覆盖与成员审计 | `user_properties.role`、`member_audit`、`saveMember`、`actionsFor`、`propertyRole`、`visibleMembers` |
| 7 | 公开站点要能外部证实 | 站点路由放在资源白名单前；文档纠正「401 不能证明新后端」，改依据「发布会重启服务」+ 主机 grep |
| 8 | `change` 监听器长期未闭合，把成员 / 站点 / 清理按钮监听器吞进报表筛选回调 | 切片修复并移回模块顶层（跨度 478→521 修为 479→480） |
| 9 | 语言对象编辑出现括号 / 重复逗号；HTTP 冒烟里先存站点后注入价计划；幂等重放被状态检查抢先；测试用户签名；审计列名 `summary`；DOM 需先刷新后台数据；表头 `reason`→`requestReason`；金额断言 | 逐一修：`'},,`→`'},`、先注入价计划再 `site_save`、先查 receipt、`user(store,'admin',...)`、改列名、刷新后断言、改表头、用 `/MYR\s+440\.00/` |
| 10 | DOM 脚本因 60 秒轮询 timer 不退出；文档把「`/api/notifications` 无会话 401」当成后端证据 | `noticePoll?.unref?.()`；改为依据发布重启 + 主机 grep |
| 11 | 冒烟缺字段、`overdue_checkout` 场景构造；`request_waiting` 误用 `request.guest`（应为 `guest_name`）；feed 只传 id 导致派生提醒被权限过滤 | 补齐字段；改列名；`notificationFeed` 从 `users` 表读有效账号再算，未读计数与列表随之一致 |
| 12 | `data-notice-view="checkin"` 指向的是弹层不是视图；`session()` 编辑时误删一段返回字段；自助登记关闭后 `session()` / `register()` 都会 401，测试不能靠它取 revision | app.js 里对 `checkin` 分支走 `leaveDialogs()` + `selfCheckinUI.open()`；恢复 `room/instructions/lock/accessStatus/canRequestAccess`；测试改从 `sc_grants` 表读 revision |

## 关键实现模式（接着改时用得上）

- **接受预订请求**不是新建一条订单记录，而是把请求改写成普通 `create_reservation` 命令，走同一套库存、revision、审计规则；价格用当初报价，不重新算。
- **派生提醒**基于事实实时计算、不落库：处理完自动消失；`id` 形如 `derived:<kind>:<orderId|requestId|propertyId>:<due>`；只通知能执行对应 action 的账号；`readNotifications` 对派生 id 先核对「该账号确实被展示这条」才允许标记已读。
- **提醒严重级别**：`severityOf(kind)` 映射 `urgent/attention/routine`，排序 `severityRank → unread → at → id`；未知类型默认 `attention`，不冒充紧急。
- **自助入住**：`sc_grants` 表加列用 `PRAGMA table_info` 检查后 `ALTER TABLE ADD COLUMN`（旧库自动迁移，不重建）；`INSERT INTO sc_grants VALUES(...)` 是位置参数，加列必须同步增加占位符；`register()` / `onOrderChange()` 都要清空 `rejection_reason`。
- **退款 / 拒绝原因**是给客人看的自由文本，前端一律转义后输出。

## 验证演进（回归基线）

Node 224 → 292 → 305 → 315 → 322 → 325 → **330**；Python **5/5**；DOM 脚本 **16/16**（含 `dom-booking-requests.mjs`、`dom-notifications.mjs`）。每批都要跑全量，不能只跑新增用例。

## 外部核验能证明什么、不能证明什么

- 能：`/healthz` 200；`/web/` 下文件含新词条；`app.js` 引用的所有模块 200；公开站点 CSP 与 303 重定向；发布重启这一既成事实。
- 不能：`server/store.js` / `server/self-checkin.js` 从公网读不到（`/server/` 不提供）；`/api/` 无会话返回 401 只证明有会话守卫，**不证明新后端**。需要主机上 `grep -c <符号> /opt/jovian-pms-test/current/server/<文件>` 佐证。
- Windows 两项私有文件权限失败用例仍需用户本机跑全套，Ubuntu CI 是强制门槛。

## 下一批从哪开始

1. 先 `git log --oneline -10` 与 `WORKBUDDY-HANDOFF.md` 末尾对齐状态，再读 `continuity/PROJECT-STATE.md` 的「剩余缺口」。
2. 建议顺序：提醒级别可配置 / 提醒外部通道（需真实通道才能做，否则只能留在系统内） → 自助入住真实设备与数据保全流程 → 房间分组、价计划绑定订单、佣金结算 → 站点多房请求与反垃圾。
3. 每批照旧：实现 → 全量 Node/Python/DOM → 提交并推送 → 核验线上 → 更新 `WORKBUDDY-HANDOFF.md` 与 `JOVIAN-CURRENT-STATUS.md`（含测试数量）。
