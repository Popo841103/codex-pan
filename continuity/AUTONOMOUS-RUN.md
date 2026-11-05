# 自主连续推进记录（2026-11-04）

## 授权与范围

用户明确授权：今天本人不在电脑旁，但电脑与网络常开；**凡不需要其授权/凭据/在场的事，一直自主连续推进，直到自主范围内全部完成**，每批之间不停下来确认。

沿用项目一贯硬约束，不因无人值守而放宽：

- 保留现有账号、订单、账务、数据库与所有既有改动，绝不重建/覆盖/回退；线上数据不重置、不写模拟数据。
- **不伪造外部接口**：不接假的支付 / OTA / 消息 / 门锁 / 设备发码。
- 不削弱 Windows 上那两项私有文件权限失败用例；不问密码。
- 调研结论区分「实见 / 文档 / 推断 / 未验证」；`/server/` 不对外提供，后端改动只能靠主机 grep 佐证，不谎称已从公网读到。
- 发布安装只刷新既有文件：新增运行时逻辑并入已有 `src/server/web` 文件，不新增运行时模块（新增文件仅限 test / verification / docs）。
- 每批完整闭环：实现 → 全量 Node≥24 测试 + Python 测试 + DOM 脚本 + 运行时语法检查 → 推送 `jovian-pms-test` → 等 CI 部署 → 核验线上 `/healthz` 与被服务文件 → 更新交接文档、状态索引与本文件。

## 可自主完成的内部缺口（队列）

以下均为纯内部功能，不依赖真实外部接口、凭据或用户在场：

| 编号 | 批次 | 状态 |
|---|---|---|
| P1 | 公开预订请求增强：客人凭 reference 查询状态与撤回、一份请求支持多间房、提交反垃圾 | 已完成 `d879ec1` |
| P2 | 提醒条件式规则：按事实阈值升级（如脏房超过 N 间才算紧急）、阈值可配置 | 已完成 `019cbe8` |
| P3 | 待核验自助登记 ↔ 前台入住办理联动：审核通过后一键办理入住 | 已完成 `a7e3b5f` |
| P4 | 业务补齐：渠道佣金人工录入 / 结算状态（房间分组与价计划绑定订单已有基础实现，不重复） | 已完成 `0aae239` |
| P5 | 自助入住收尾：身份资料保存期限与删除流程；`self-checkin.key` 随发布备份 | 已完成 `0ad964c` |
| P6 | 交班现金盘点与差异审批：可选实点数、期望净现金 = 收款 − 退款、管理员说明差异且原差异永久保留 | 已完成 `546e331` |

队列中若发现某项与既有设计冲突或有更高价值的收敛点，按实情调整并在下方留痕。

**队列收敛与再开启（2026-11-04）：P1–P10 全部完成并各自经测试、推送、部署核验与文档闭环。** 之后按「继续找纯内部、不依赖外部接口与凭据的真实缺口」的原则又识别出 P6：既有 `JOVIAN-CURRENT-STATUS.md` 的剩余缺口里明确列着 `cash-up variance approval`，而交班记录只有收款/退款/押金快照、没有「实点现金」与差异处理路径，属边界清晰的内部缺口，故追加并完成 `546e331`（P6）。此后又完成 P7（佣金更正历史，`b4754fc`）与 P8（新建门店零库存 + 三处空门店 UI 缺陷修复，同批 `b4754fc`），并就 P9 作出取舍：用户明确要求删除「10 间房 + 30 床实际布局待确认」，改为**新门店默认为空、全部手填**，因此不再把「真实布局确认」列为待办，也不做任何预设房间数。下表「明确不自主完成」的各项仍按既定产品边界保留，不因队列调整而改变；这属于物理条件或用户明确禁止的外部接口，不是遗漏。若用户后续给出新批次，在下方继续追加编号即可。

## 明确不自主完成（红线或物理条件，非遗漏）

- 真实支付 / OTA / 消息 / 门锁 / 设备发码、外部通知投递：用户从一开始就**明确禁止伪造**，且需要真实凭据与联调。
- PostgreSQL 迁移与真实并发验证：需要真实环境。
- 真机 Edge / 手机视觉验收：需要设备在场。
- Windows 两项私有文件权限失败用例：用户明确「绝不削弱、按交接文件保留」，仍需其本机复核。
- 照片 / 自拍 / OCR 自动核验：需要外部 AI 服务，同样禁止伪造。

这些是既定产品边界（NOBEDS / TTHotel 为目标接口），不是待修 bug。自主范围「全部完成」指上表队列收敛，不指改变这些边界。

## 批次留痕

（每批完成后在此追加：提交号、测试数、线上证据、遗留）

- 起始基线：代码 `ba64db0`（门店可配置提醒级别），文档 `77ca8d1`。Node 330/330、Python 5/5、16 个 DOM 脚本、38 个运行时 JS 语法检查全通过。

- P1 `d879ec1`：多房请求（1–8 间、报价按全部房间、接受生成多个 stay）、客人凭编号+联系方式查询/撤回、拒绝原因对客人可见、撤回标记与 append-only 事件、旧库两列迁移、蜜罐与链接反垃圾；并前置修掉「接受已撤回/已决定请求会建出孤立订单」的隐患。Node 340/340、Python 5/5、16 DOM、38 运行时语法全通过。部署 `c47bf5a` 后 15s 上线：实见 `/healthz` 200（含迁移启动）、`workspace-ui.js` 四个新标识、12 个导入模块全 200、站点 CSP 仍 none、`/server/store.js` 404；线上无已发布站点，公开页新表单只能由进程内 HTTP 测试佐证，不谎称公网读到。

- P2 `019cbe8`：条件式升级规则。`notice_rules` / `notice_rules_audit` 两张新表（`CREATE TABLE IF NOT EXISTS`，旧库启动自动建，不重建不回写）、`notice_rule_save` 旁路命令、`derivedNotifications()` 给三类可数派生事实带 `magnitude`、`visibleNotifications()` 在 `severityOf()` 之后套用 `escalateSeverity()` 且只升不降；`src/demo-store.js` 单一常量来源（`noticeRuleKinds` / `cleanNoticeRules` / `escalateSeverity`）与本地归约 `apply()` 同步；提醒页第三面板三语表单、升级标记、审计表。按门店隔离、管理员专属、append-only 审计、幂等、默认无规则行为完全不变。Node 348/348、Python 5/5、16 DOM、38 运行时语法全通过。推送后线上实见 `/healthz` 200、`workspace-ui.js` 五个新标识、`app.js` 两个新标识、`src/demo-store.js` 三个新标识、`workspace.css` 数字输入样式、12 个 `app.js` 导入模块与 2 个 `src` 导入全 200、公开站点 CSP 仍 none；`/server/store.js` 404，后端新表/命令属**部署重启推断**（主机 `grep -c notice_rules_audit /opt/jovian-pms-test/current/server/store.js` 佐证），不谎称公网读到。踩坑：DOM 脚本中 `$('#refresh').click()` 的刷新是异步的，第一次断言读到了上一批的旧 DOM（cleaning 仍是 urgent），改为轮询等待系统默认顺序恢复后再判断，已修好。

- P3 `a7e3b5f`：审核通过后前台一键办理入住。`sc_checkin` 在 `SelfCheckin.command()` 事务外单独分派（`store.transaction()` 不可重入），调真实 `store.command({type:'checkin'})`，复用 `conditions()` 全套闸门、`signature()`、`approved_sig`、`reviewer_id`，`beforeApply` 在入住事务内把审核通过的登记姓名写入 `order.occupants`；服务端算门店本地日期，不收浏览器日期。幂等 `sc_receipts`、append-only `sc_audit`、按门店角色鉴权、`read()` 暴露 `checkinReady`/`checkedIn`。**不调用锁 provider、不建 `sc_access`、不生成 PIN**，审核通过仍不等于开门。前台弹层三语说明边界并二次确认。新增 `pms/test/self-checkin-desk.test.js`（8 例），`communications-dom.mjs` 用真实 HTTP 全流程驱动。Node 356/356、Python 5/5、16 DOM、38 运行时语法全通过。线上实见 `/healthz` 200、`checkin-admin-ui.js` 五个新标识、`workspace.css` 的 `checkin-desk-action`、12 个导入模块全 200、站点 CSP 不变；`/server/self-checkin.js` 404，后端属**部署重启推断**（主机 `grep -c checkinFromGrant .../server/self-checkin.js` 佐证）。踩坑：「审核人失效」用例若仍用被禁用的账号执行会命中 `login_required`，改用另一个有效账号才能精确验证 `checkin_review_pending`。

- P4 `0aae239`：财务按渠道账单人工录入实际佣金。只读探查先确认房间分组（`group` / `sameRoomGroup`）与价计划绑定订单（`ratePlanCode` / `cancellationPolicy`）已有基础实现，而 `commissionDetail()` / `commissionPage()` 明确写着「订单不保存佣金、没有渠道费率、报表不推算佣金」，是真实且边界清晰的内部缺口，因此选它而非重复造已有功能。`commission_save` 为业务命令（`admin` / `finance`，含门店角色覆盖），推进 `revision`、写 `audit.commissionChange` 保留 before/after；订单存 `order.commission`；输入校验在共享后端与本地归约 `apply()` 用同一套规则（整数分、0–100000000、账单号 1–100 非空、备注 ≤500、结算布尔）；不配置费率、不按房价推算、不接 OTA 结算。报表未录入仍 `commission:null` / `settlement:'unrecorded'`，totals 只在至少一笔已录入时才给合计，否则 `null`，不打印 0；按渠道带 `recorded` / `settled` / `unrecorded`。UI 用 `can('commission_save')` 控制表单，三语说明「填账单实际金额，不填估算值」。顺带修掉同页 totals 里订单数 / 间夜量被 `currency()` 格式化成 `MYR 0.03` / `MYR 0.07` 的既有显示错误。新增 `pms/test/commission-record.test.js`（8 例）、`pms/test/financial-ui.test.js` 追加 1 例，并把 `verification/dom-occupancy.mjs` 从「佣金尚未接入」的旧断言改为驱动真实表单：录入 12.34、核对另外两笔仍「未记录」且订单各项金额不变、再更正为 15.00 已结算、审计两条。Node **365/365**、Python **5/5**、16 DOM、38 运行时语法全通过。线上实见 `/healthz` 200、`financial-ui.js` / `app.js` / `financial-reports.js` / `demo-store.js` / `workspace.css` 各自新标识、12 个导入模块与 2 个 `src` 导入全 200、公开站点 CSP 仍 `default-src 'none'`；`/server/store.js` 404，后端命令与审计字段属**部署重启推断**（主机 `grep -c commission_save .../server/store.js` 佐证）。踩坑：既有 DOM 断言写死「佣金尚未接入 / not connected」，与新语义冲突，改为断言新文案并扩展成端到端流程；`currency()` 输出用 U+00A0 不间断空格，DOM 断言要用 `\s` 而非普通空格。

- P5 `0ad964c`：身份资料保存期限与显式清除、访客数据密钥随发布备份。只读探查确认 `sc_grants.submission` 存加密身份资料、`sc_access.pin` 存加密 PIN，既无保留期限也无删除路径，且发布备份只备份 SQLite（恢复后记录将永久不可解密）。实现：`retentionDays` 为门店策略设置（默认 90、范围 1–3650，经既有 `sc_policy_save` 保存），`retention()` 在服务端按 UTC+8 本地日与各住宿离店日期算 cut-off，绝不收浏览器日期；`read()` 返回 `{days,cutoff,eligible}`，前台先看到截止日与到期条数再操作。`sc_purge_identity` 是独立命令、仅 `admin`（含门店角色覆盖）、需二次确认，**无定时器、无启动扫描、无读取触发删除**；只清 `submission` / `document_hashes` / `rejection_reason` / `sc_access.pin` 并写 `purged_at`，不动订单、账务、幂等收据与审计；append-only 审计只记 cut-off、天数、清除条数与 PIN 数，不含姓名证件号或解密文本。`conditions()` 对已清除登记永久拒绝入住，`read()` 暴露 `identityPurged`。旧库经 `PRAGMA table_info` 守卫的 `ALTER TABLE ADD COLUMN purged_at`，`policy()` 用 `defaults()` 补齐旧策略、旧行为不变；`sc_invite` 的 INSERT 改为具名列（`sc_grants` 已被加宽两次，位置参数会错位）。发布备份把 `self-checkin.key` 复制进同一 0700 目录、chmod 600、写 `backup-contents`，仅主机本地复制，密钥内容不进仓库/发布包/日志；备份持有者可解密，须同等保护，「数据库+原密钥」恢复演练仍待做。前端三语词条、保留天数输入、清除面板（截止日/到期数/二次确认/无权限或零条禁用）与 CSS。新增 `pms/test/self-checkin-retention.test.js`（9 例），`communications-dom.mjs` 用真实 HTTP 驱动：设为 30 天 → 推进时钟 → 实见服务端 cut-off `2027-05-11` → 清除 → 断言密文字段为空、审计恰好一条、住宿仍 `checked_in`、前台入住按钮消失。Node **374/374**、Python **5/5**、16 DOM、38 运行时 JS 语法、部署 shell 语法全通过。线上实见 `/healthz` 200、`checkin-admin-ui.js` 十个新标识、`workspace.css` 的 `.checkin-retention`、12 个 `app.js` 导入模块与 2 个 `src` 导入全 200、公开站点 CSP 仍 `default-src 'none'`；`/server/self-checkin.js` 404，后端命令、新列与发布备份改动属**部署重启推断**（主机 `grep -c sc_purge_identity /opt/jovian-pms-test/current/server/self-checkin.js` 佐证），发布脚本另经 `bash -n` 与自举校验和测试检查，不谎称公网读到。踩坑：改 `deploy/update-vultr-test.sh` 后 `pms/test/test_release_archive.py` 失败——`deploy/ci/BOOTSTRAP.txt` 内嵌 base64+gzip 的四份部署脚本副本带 SHA-256 校验，不同步会让新服务器装回旧脚本、静默丢失密钥备份；已按确定性 gzip（mtime=0、compresslevel=9、json separators）重生成 payload 与 digest，Python 5/5 恢复通过。

- P6 `546e331`：交班现金盘点与差异审批。只读探查确认 `shiftSummary()` 已有收款/退款/押金分列、`shift_handover` 只存窗口快照，既无「实点现金」也无差异处理路径；而 `JOVIAN-CURRENT-STATUS.md` 的剩余缺口明确列着 `cash-up variance approval`，属边界清晰、不依赖外部接口的纯内部缺口，故追加推进。实现：`shiftSummary()` 新增 `cashExpectedByMethod` / `cashExpectedTotal`（只把 payment/refund 按 method 计入期望净现金；押金是负债，仍只在 `byMethod` / `depositNet` 列示，绝不当抽屉现金）；`shift_handover` 接受可选 `countedCash`（整数分、0–100000000，共享后端与本地归约同一套校验），不传时旧记录字段集合完全不变、不写 `cashCount`、不猜 0；传时存 `{counted,expected,variance,status,approval}`，零差异 `balanced`、否则 `pending`。`cash_variance_approve` 为独立业务命令，仅 `admin`（含门店角色覆盖；`operations` 可交班但不能审批，`finance`/`viewer` 也不能），要求非空 ≤500 的原因，拒绝不存在/未盘点/已平/已决定的交班，只把 `status` 改 `approved` 并写 `{at,actor,reason}`，**绝不改写 counted/expected/variance**，原差异永久可读；按请求 key 幂等、按门店隔离（KL 命令够不到 PG 的交班）。durable audit 记 `handoverCash:{counted,expected}` 与 `{handoverId,variance,reason}`，不含客人姓名或解密文本。UI：交班表单加三语实点现金输入与说明（留空=不盘点）、交班历史表 7→9 列增加现金状态与操作、逐行显示期望/实点/差异/状态/审批人，`pending` 且 `can('cash_variance_approve')` 才显示原因输入与审批按钮（二次确认）；`app.js` 用 `/^\d+(\.\d{1,2})?$/` 校验、复用 `toMinor()`、留空时完全不带 `countedCash`。新增 `pms/test/cash-count.test.js`（11 例），扩展 `verification/dom-night-audit.mjs` 走真实 HTTP：旧交班显示「未盘点」→ 填 5.00 出待审批差异 → 管理员填原因审批 → 断言三个金额原样保留、按钮消失 → 0.00 为已平、再次留空为旧记录形状。Node **385/385**、Python **5/5**、16 DOM、38 运行时 JS 语法、部署 shell 语法全通过。踩坑：DOM 里后端状态先于 UI 刷新，必须 `until` 等「未盘点」文案出现再断言；追加流程若反复 `openNightAudit()` 重新 import `app.js` 会累积事件监听器，退出时残留 handler 抛 `$('#message')` 为 null 的异步异常，改为依赖 `commit()` 后的自动 `render()`、不再重复导入即消失。线上外部实见：`/healthz` 200（`{"ok":true,"service":"jovian-pms","data":"test-only"}`）；`web/workspace-ui.js` 18 个新标识（`cashStatus` / `cashCount` / `cashCountNote` / `cashExpected` / `cashVariance` / `cashNotCounted` / `cashBalanced` / `cashPending` / `cashApproved` / `cashApprove` / `cashApproveReason` / `cashApproveConfirm` / `cashApprovedBy` / `cash_count` / `cash_variance_decided` / `handover-cash` / `data-cash-approve` / `cash_variance_approve`）、`web/app.js` 6 个、`src/demo-store.js` 4 个全部命中；12 个 `app.js` 导入模块与 2 个 `src` 导入全 200；公开站点 CSP 仍 `default-src 'none'` 且 `/sites/no-such-property` 404；`/server/store.js` 与 `/server/self-checkin.js` 仍 404。后端 `cash_variance_approve` 权限与 `handoverCash` 审计属**部署重启推断**（主机 `grep -c cash_variance_approve /opt/jovian-pms-test/current/server/store.js` 佐证），不谎称公网读到。

- P7 `b4754fc`：佣金更正历史。`commissionPage()` 增加最近 50 条 `commission_save` 历史表（变更前 / 变更后金额、账单号、结算状态），只展示不过账、不改任何金额；`src/demo-store.js` 新增 `commissionBefore`，本地归约审计同样写 `commissionChange:{before,after}`，与共享后端一致；`verification/dom-occupancy.mjs` 断言更正前后两个金额同时可见。

- P8 `b4754fc`：新门店默认为空、全部手填（用户指令，四条）。①`property_create`（仅 `admin`）以 `revision 0` 写入空 body，无房型 / 房间 / 床位 / 价计划 / 订单 / 营业日，给创建者授权并写 append-only `property_create` 审计（`starterInventory:'empty'`）；因门店行尚不存在，该命令必须在 `authorize()` **之前**分派，复用既有 receipt / fingerprint 幂等，不经 property reducer、不推进 revision。②`createUser()` 允许 admin 无门店，`read()` 在「只有 admin 且零门店」时返回 `noPropertyYet:true`（非 admin 仍必须指定门店）。③设置页新增「新建门店」面板（三语），`app.js` 走 `backend.execute()`，成功后切到新门店并停在「房型与资源设置」。④`catalogNote` 三语改为「房型、房号与床位全部由管理员自行配置，系统不预设任何房间数量」；`seed()` 不动，既有门店不受影响。同批修掉三处**只在空门店出现**的真实缺陷：`render()` 在零门店时调 `preview()` 抛 `Property required` 被 boot 的 catch 吞成「服务连接失败」（全新安装看起来像服务器挂了）→ 加 `noScope` 短路；门店 `<select>` 每次 render 重建导致 `onchange` 丢失 → 改 document 级 `change` 委托；`switchProperty()` 先 `leaveDialogs()` 但选择器自身仍开着被 `busy` 拒绝 → 先关 `#property-dialog`。新增 `pms/test/property-create.test.js`（10 例）与 `pms/verification/dom-empty-property.mjs`。Node **397/397**、Python **5/5**、**17** DOM、37 运行时 JS 语法、部署 shell 语法全通过。线上外部实见 `/healthz` 200、`catalog-ui.js` 的 `newPropertySave`/`catalogEmptyNote`/新 `catalogNote`、`app.js` 的 `property_create`/`new-property-save`/`const noScope`、`financial-ui.js` 的 `commissionHistory`/`commissionHistoryNote`、14 个 `/web/*` 全 200、站点 CSP 不变；`/server/store.js` 404，后端 `property_create`、`noPropertyYet`、`starterInventory` 属**部署重启推断**。踩坑：`room_type_save` 新建时不传 `id` 后端会生成 UUID，必须用返回的 id 作 `roomTypeId`；`physical_room_save` 新建用 `id` 而不是 `physicalRoomId`；`receipts` 只有 4 列；幂等 key 必须 8–100 字符，太短报 `input`。

- P9（未做，已按用户意见撤项）：原计划的「10 间房 + 30 床位实际布局确认」被用户明确要求删除——房间数量由管理员手填，系统不预设。**平台房源链接批量导入**转为待办：只在公开可读时抓取，抓不到如实说，导入前先给用户确认清单，不做任何登录态抓取。

- P10 `4baad16`：开放试用注册（用户指令 + 四项确认：开放注册即时可用 / 严格隔离 / 先上测试站 / 基础防护）。`GET /signup` 公开无脚本三语表单（蜜罐 + 每 IP 5 次/15 分钟），`POST /signup` 无会话 PRG；`Store.signup()` 一步创建 trial 账号（role admin、origin trial）+ `revision 0` 空门店 + 授权 + append-only 审计。守卫式 `users.origin` 列（默认 staff，不重建表）；`createProperty()` 对 trial 403、受邀成员继承 origin、全局上限 500（`signup_closed`）；隔离走常规 `authorize()` 链。成功重定向到 `/web/?signup=<名>&store=<代码>`，登录弹层三语提示。新增 `pms/test/trial-signup.test.js`（5 例）与 `pms/verification/dom-trial-signup.mjs`（真实 HTTP 驱动公开页 → 注册 → 登录 → 空白设置页 → 服务端拒绝第二店）。Node **402/402**、Python **5/5**、**18** DOM、37 运行时 JS 语法、部署 shell 语法全通过。线上实见 `/healthz` 200、`GET /signup` 200 + CSP `default-src 'none'` + `noindex` + 零 `<script>`、`app.js` 五个新标识、`catalog-ui.js` 一个新标识、`/api/signup` 403、`/server/store.js` 404；**刻意未在线上真实注册账号**（不写共享测试库）。后端属**部署重启推断**（主机 `grep -c signup_closed .../server/store.js` 等佐证）。踩坑：`app.js` boot 裸用 `location`/`history` 导致其余 17 个 DOM 脚本全崩（jsdom outside-only 缺全局），改 `window.location`/`window.history` 可选链恢复；限流计数含蜜罐与失败尝试，HTTP 测试窗口要按「成功+蜜罐+失败=3」推算。

- P10 的边界（记录在案）：试用账号无计费 / 无导出 / 无转正路径；共享测试库无单租户配额（仅全局账号上限）；无邮件验证与真实验证码（无通道，不伪造）；限流表随进程重启清零。
