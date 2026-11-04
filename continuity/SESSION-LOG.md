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
| 13 | P4 改了佣金页文案后 `dom-occupancy.mjs` 仍断言「佣金尚未接入 / not connected」，全量 DOM 才暴露；`currency()` 用 U+00A0 不间断空格，`'MYR 12.34'` 严格相等失败；佣金页 totals 把订单数 / 间夜量经 `currency()` 渲染成 `MYR 0.03` / `MYR 0.07` | 旧断言改为新语义并扩展成真实表单端到端流程；金额断言用 `/^MYR\s12\.34$/`；totals 按 `count` / `money` 分支渲染，计数用 `esc(v)` |
| 14 | P5 改了 `deploy/update-vultr-test.sh` 后 `test_release_archive.py` 失败：`deploy/ci/BOOTSTRAP.txt` 内嵌四份部署脚本的 base64+gzip 副本带 SHA-256 校验，不同步会让新服务器装回旧脚本、静默丢失密钥备份；`sc_grants` 已被加宽两次，`sc_invite` 的位置参数 INSERT 会在加列后错位 | 用确定性 gzip（`mtime=0`、level 9、`json.dumps(separators)`）重生成 payload 与 digest，Python 5/5 恢复；INSERT 改为具名列 |


## 关键实现模式（接着改时用得上）

- **接受预订请求**不是新建一条订单记录，而是把请求改写成普通 `create_reservation` 命令，走同一套库存、revision、审计规则；价格用当初报价，不重新算。
- **派生提醒**基于事实实时计算、不落库：处理完自动消失；`id` 形如 `derived:<kind>:<orderId|requestId|propertyId>:<due>`；只通知能执行对应 action 的账号；`readNotifications` 对派生 id 先核对「该账号确实被展示这条」才允许标记已读。
- **提醒严重级别**：`severityOf(kind)` 映射 `urgent/attention/routine`，排序 `severityRank → unread → at → id`；未知类型默认 `attention`，不冒充紧急。
- **自助入住**：`sc_grants` 表加列用 `PRAGMA table_info` 检查后 `ALTER TABLE ADD COLUMN`（旧库自动迁移，不重建）；`INSERT INTO sc_grants VALUES(...)` 是位置参数，加列必须同步增加占位符；`register()` / `onOrderChange()` 都要清空 `rejection_reason`。
- **退款 / 拒绝原因**是给客人看的自由文本，前端一律转义后输出。
- **审核通过后一键办理入住**：`store.transaction()` 是 `BEGIN IMMEDIATE`，**不可重入**，所以 `sc_checkin` 必须在 `SelfCheckin.command()` 的事务外单独分派，再调 `store.command()`（自带事务）；不能放进 `sc_*` 的 `this.store.transaction(()=>{...})` 里嵌套。业务 `checkin` 命令的 `beforeApply` 在 `apply()` 之前、事务之内运行，正好用来把审核通过的 `submission` 姓名写进 `order.occupants`（`checkin` 里 `if(order.occupants){prepareStay(...);...reject('occupant_names')}` 会校验姓名）。复用 `conditions()` 全套闸门 + `order.status==='confirmed'`；`date` 用 `new Date(now()+8*3600000).toISOString().slice(0,10)` 取门店本地日，不收浏览器日期。「审核人失效」用例要用另一个仍有效账号去执行，否则命中 `login_required` 而不是 `checkin_review_pending`。
- **条件式升级规则**：`noticeRuleKinds` 只含可计数的派生事实（`rooms_to_clean` 按脏房数、`request_waiting` / `checkin_review` 按条数），派生时给每条带 `magnitude`；`cleanNoticeRules` 校验、`escalateSeverity` 在 `severityOf()` 之后应用且**只升不降**（避免紧急客人被降级）；`notice_rule_save` 是旁路命令，`notice_rules` / `notice_rules_audit` 用 `CREATE TABLE IF NOT EXISTS` 建表（新表不需 ALTER 加列），审计 append-only。本地归约 `apply()` 要把 `notice_rule_save` 加进末尾白名单，否则会 `reject('input')`；保存任一提醒设置后都要用同一组常量重算 severity，避免留下旧级别。
- **渠道佣金是「录入」不是「计算」**：`commission_save` 是业务命令（推进 `revision`、写 append-only 审计 `commissionChange` 的 before/after），只有 `admin` / `finance` 可执行；`roleTypes` 加白名单后 `apply()` 的 `needsOrder` 也要加 `commission_save`，否则不存在的订单不会被 `scope` 拒绝。校验（整数分、账单号、备注、结算布尔）必须同时写在共享后端与 `src/demo-store.js` 的 `apply()`。报表侧 `commissionDetail()` 对未录入订单保持 `commission:null` / `settlement:'unrecorded'`，totals 用 `recorded ? sum : null` 而不是 `0`；UI 用 `can(type)` 控制表单显隐，别在页面里自己判断角色。修改既有报表的 totals 时注意哪些行是计数、哪些是金额，别把计数传给 `currency()`。

- **交班现金盘点是「可选字段 + 独立命令」，不要动旧记录**：`shiftSummary()` 的 `byMethod` 是「所有 kind 的金额累加」，不能复用成现金期望；新增 `cashExpectedByMethod` 只累加 payment/refund（refund 取负），押金绝不进抽屉。`command.countedCash !== undefined` 才建 `cashCount`，不传时交班记录连字段都不能多一个，否则老报表和旧记录形状会变。`cash_variance_approve` 要加进 `businessDayActions`（`src/demo-store.js` 里是模块内常量，不是导出），否则 `apply()` 末尾会 `reject('input')`；服务端 `roleTypes.admin` 也要同步加白名单。`applyBusinessDay` 的 `state` 是单门店 body（`store.command()` 里 `JSON.parse(row.body)`），所以 `handovers.find()` 天然按门店隔离，不需要再过滤 `propertyId`。审批只改 `status` 与 `approval`，counted/expected/variance 一个都不能动。DOM 里 `#handover-cash` 留空要完全不带 `countedCash`，不能传 `0`。
- **DOM 脚本别反复重新 import `app.js`**：`openNightAudit()` 每次带随机 query 重新导入会累积 `#content` 上的事件监听器，多个实例各自持有 `writing` / `pendingMutation`，点击一次会触发多次 handler，退出时残留的异步 catch 还会在 DOM 关闭后访问 `$('#message')` 抛未捕获异常。`commit()` 成功后 `refreshShared()` 会 `render()` 当前 view，所以同一页面连续操作直接复用刷新后的 DOM 即可，不必重新导航。另外后端状态落库早于 UI 刷新一帧，断言页面文案前要用 `until` 等渲染完成。

- **门店可以完全没有房间**：`property_create` 必须在 `store.command()` 里排在 `this.authorize(user, propertyId)` **之前**（门店行还不存在，无法授权），并且要用 `actor.role==='admin'` 自己判权限（`roleTypes` 机制依赖已存在的门店上下文）。`read()` 走 `fresh` 用户时若发现是 admin 且 `user_properties` 为空，返回 `{...emptyState, noPropertyYet:true}`；`createUser()` 里「必须至少一个门店」的校验要放行 admin，否则全新安装没人能建第一个门店。零门店时 `render()` 调 `preview()` 会抛 `Property required`，被 `boot()` 的 catch 当成连接失败——凡是「数据为空」的分支都要显式短路，不要让异常走到 boot 的 catch。`<select>` 每次 `render()` 重建，`onchange` 必须用 document 级委托；`switchProperty()` 里 `leaveDialogs()` 之前要先把 `#property-dialog` 关掉，否则切换被 `busy` 拒绝。
- **新建房型 / 房间的 id 规则**：`room_type_save` 新建时**不传 `id`**，`Store.command()` 里 `{...command, id: randomUUID()}` 会覆盖，前端拿返回值当 `roomTypeId`；`physical_room_save` 新建用 `id`（不是 `physicalRoomId`）。`receipts` 表只有 4 列（`user_id, request_key, fingerprint, response`）；幂等 key 必须匹配 8–100 字符，太短直接报 `input`，排查时容易误判成业务错误。

## 验证演进（回归基线）

Node 224 → 292 → 305 → 315 → 322 → 325 → 330 → 340 → 348 → 356 → 365 → 374 → 385 → **397**；Python **5/5**；DOM 脚本 **17/17**（含 `dom-booking-requests.mjs`、`dom-notifications.mjs`、`dom-empty-property.mjs`）；37 个运行时 JS 语法检查。每批都要跑全量，不能只跑新增用例。

## 外部核验能证明什么、不能证明什么

- 能：`/healthz` 200；`/web/` 下文件含新词条；`app.js` 引用的所有模块 200；公开站点 CSP 与 303 重定向；发布重启这一既成事实。
- 不能：`server/store.js` / `server/self-checkin.js` 从公网读不到（`/server/` 不提供）；`/api/` 无会话返回 401 只证明有会话守卫，**不证明新后端**。需要主机上 `grep -c <符号> /opt/jovian-pms-test/current/server/<文件>` 佐证。
- Windows 两项私有文件权限失败用例仍需用户本机跑全套，Ubuntu CI 是强制门槛。

## 下一批从哪开始

1. 先 `git log --oneline -10` 与 `WORKBUDDY-HANDOFF.md` 末尾对齐状态，再读 `continuity/PROJECT-STATE.md` 的「剩余缺口」。
2. 自主队列见 `continuity/AUTONOMOUS-RUN.md`：P1（多房请求与客人自查/撤回）、P2（条件式升级规则）、P3（审核通过后前台一键办理入住，`a7e3b5f`）、P4（渠道佣金人工录入 / 结算状态，`0aae239`）、P5（身份资料保存期限与显式清除、`self-checkin.key` 随发布备份，`0ad964c`）已完成；随后按「继续找纯内部缺口」又追加 P6（交班现金盘点与差异审批，`546e331`）、P7（佣金更正历史）与 P8（新建门店零库存，均 `b4754fc`）也已完成。**P1–P8 均已闭环**；剩余项均属需外部条件或用户明确禁止伪造的边界，不擅自推进。「10 间房 + 30 床位实际布局确认」已被用户明确撤项——房间数量由管理员手填，系统不预设；**平台房源链接批量导入**转为待办（仅公开可读才抓、抓不到如实说、导入前先给确认清单）。房间分组与价计划绑定订单已有基础实现，不重复造。提醒按班次/账号作用域、外部投递仍属需外部条件或需另行取舍的缺口，不擅自伪造通道。
3. 每批照旧：实现 → 全量 Node/Python/DOM → 提交并推送 → 核验线上 → 更新 `WORKBUDDY-HANDOFF.md` 与 `JOVIAN-CURRENT-STATUS.md`（含测试数量）。
