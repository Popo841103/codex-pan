# JOVIAN PMS · 项目状态与续写地图

截至 2026-11-04，代码 `0aae239`（财务录入渠道账单实际佣金），此前批次见下表与 `WORKBUDDY-HANDOFF.md` 末尾。Node **365/365**、Python **5/5**、DOM 流程 **16/16**、38 个运行时 JS 语法检查通过；线上测试服务 `/healthz` 200，前端与 `src/` 新标识已外部实见，`/server/` 仍 404。

## 系统是什么

马来西亚 CO-HUB 青旅与 JOVIAN 公寓共用的后台 PMS，多门店、房 / 整套 / 床位三种销售单位、中英马来文三语。既有账号、订单、账务、库存、数据库全部保留在测试环境，**不做重建、覆盖、回退或重置**。

| 层 | 位置 | 说明 |
|---|---|---|
| 共享后台 | `pms/server/store.js` | SQLite（`node:sqlite`），命令 + revision + 幂等 key + 角色权限 |
| HTTP | `pms/server/http.js` | 会话/CSRF、API、公开站点 `/sites/<slug>`、公开登记 `/checkin/` |
| 本地归约 | `pms/src/demo-store.js` | 与后台并行的状态机，本地演示模式 |
| 前端 | `pms/web/` | 原生 ESM，无构建步骤；`app.js` 是主壳 |
| 发布 | `.github/workflows/jovian-pms-test.yml` → `pms/deploy/` | push 到 `jovian-pms-test` 且 `pms/**` 变化时自动测试并部署 |

**关键设计事实**

- 双状态机：`demo-store.js` 与 `server/store.js` 各有一套，改动常常要同时考虑两边。
- 角色 `admin / operations / finance / viewer`，`user_properties.role` 支持**门店级角色覆盖**；`actionsFor()` 合并各模块权限。
- `writer generation = 9` 的持久触发器阻止旧运行时写 `properties.body`；旧代码能读不能写。
- 营业日（business date）与马来西亚交易日 `localDay` 是**两个口径**，报表按各自口径出，不要混用。
- 押金是**负债**，不是收入；审计锁只锁 `edit` / `cancel`，不锁 `payment`。
- **发布器不安装新运行时文件**：新模块必须并入既有 `pms/server`、`pms/src`、`pms/web` 文件；`/server/` 不对外提供。新增文件只能放测试、验证、文档、归档目录。
- 公开站点在资源白名单之前响应，CSP `default-src 'none'`，纯 HTML 表单、无脚本无会话；发布会重启服务，这一点曾用来从外部间接证实后端已更新。

## 已完成的批次（按提交）

| 批次 | 提交 | 内容 |
|---|---|---|
| 早期 | `a748c6c` 等 | 可信营业日、夜审、班次与交接；经理日报与客人账页 |
| 更早 | `399247d` 等 | 住宿报表：房费明细、房型经营汇总、房间移动日志 |
| 4 | `01c8e4e` | 其他费用明细、取消罚金明细、取消政策快照 |
| 5 | `35c3d39` | 住客明细、登记记录、佣金明细 |
| 6 | `ddc61e1` | 团队权限：门店级角色覆盖、成员审计 |
| 7 | `d46a7b3` | 可发布门店站点、公开可售房量与诚实报价 |
| 8 | `2a1c7be` | 清理标记为 TEST 的订单；修复被财务筛选回调吞掉的 `change` 监听器 |
| 9 | `8239869` | 公开预订请求：站点提交 → 前台决定 → 接受时才生成订单并占库存 |
| 10 | `df352d3` | 内部提醒：铃铛、未读计数、60 秒轮询、已读只记不改 |
| 11 | `d8391ca` | 派生待办提醒：应入住未入住、应离店未退房、今日到店未分房、脏房汇总、请求等待过久 |
| 12 | `2792aec` | **提醒严重级别排序**；**自助入住收尾**（待核验登记进提醒、拒绝给客人原因） |
| 13 | `ba64db0` | 门店可配置提醒级别：每类可设紧急/需处理/常规或跟随系统默认 |
| 14 | `d879ec1` | 多房公开请求、客人凭编号+联系方式查询/撤回、反垃圾 |
| 15 | `019cbe8` | **提醒条件式升级规则**：可数事实达阈值时自动升级、阈值可配 |
| 16 | `a7e3b5f` | **审核通过后前台一键办理入住**：走真实业务 check-in 命令，不开门、不发 PIN |
| 17 | `0aae239` | **渠道佣金人工录入 / 结算状态**：按渠道账单录入实际金额、账单号、备注与结算状态；不推算费率、不接 OTA |

每个批次通常伴随一条 `Record ... in the handoff` 文档提交，细节见 `WORKBUDDY-HANDOFF.md`。

## 第 12 批具体做了什么

- 提醒新增 `severity`：`urgent`（应入住未入住 / 应离店未退房 / 今日到店未分房 / 登记待核验）、`attention`（网站请求、请求等待过久）、`routine`（待清洁房）。排序改为**级别 → 未读 → 时间 → id**，页面上用文字徽章写出级别，不只靠颜色。
- 自助登记提交后进入 `checkin_review` 派生提醒，只通知能审核的本店账号；审核后自动消失；只在自助登记开启时提醒；提醒按钮打开审核弹层而不代做决定。
- `sc_review` 退回时把原因存入 `sc_grants.rejection_reason`（旧库启动时自动加列），客人与前台都能看到，重新提交会清空，审核通过不带旧说明。

## 真实接入状态（不要写成已完成）

| 外部能力 | 状态 |
|---|---|
| OTA / NOBEDS | 目标供应商，**没有生产配置与实测**；消息适配只覆盖公开文档明确的 Booking.com / Airbnb |
| 支付 | **未接**，线上数据不重置、不写模拟资金 |
| 短信 / 邮件 / 推送 | **全未接**；提醒只在登录后可见，最多约一分钟延迟 |
| 门锁 / TTHotel | 硬件尚未采购，生产 provider 固定 `disconnected`，**不生成 PIN、不声称开锁成功** |
| 自助入住 | 人工文字核验身份，无照片 / 自拍 / OCR / 自动实名；审核通过 ≠ 自动开门 |
| 技术客服 | 联系方式与服务时间待配置 |

## 剩余缺口（按建议优先级）

1. 提醒：外部投递通道、按班次/账号的自定义规则、通知可查询与撤回。（门店可配置级别已于 ba64db0 完成；条件式升级规则已于 019cbe8 完成：可数事实达阈值时自动升级、阈值可配、只升不降、按门店隔离、管理员专属、append-only 审计。仍缺按班次/账号作用域与外部投递。）
2. 自助入住收尾之后：真实设备发码 / 撤销 / 过期 / 断网联调；（审核通过后前台一键办理入住已于 a7e3b5f 完成，仍不开门、不生成 PIN，设备确认后的自动入住分支仍未与真机联调。）身份资料保存期限与删除流程；密钥独立加密备份与「数据库 + 原密钥」恢复演练（当前更新器只备份 SQLite，**不备份 `self-checkin.key`**）。
3. 业务：房间分组（已有基础实现）、价计划绑定订单（已有基础实现）、佣金自动费率与渠道结算导入、账期关闭、完整现金盘点差异审批与银行对账。（渠道账单上的**单笔实际佣金已可人工录入**于 `0aae239`，含账单号、备注、结算状态与 append-only 审计；仍未接 OTA 结算、没有费率、没有银行对账、没有整期关闭。）
4. 站点：照片与逐房描述、支付与押金、自动确认、真正的验证码 / 账号体系。（多房请求、客人凭编号+联系方式查询/撤回、蜜罐与链接反垃圾已于 d879ec1 完成；目前一份请求仍只对应一个房型，不自动确认、不收支付。）
5. 工程：PostgreSQL 迁移与真实并发验证、真机 Edge / 手机视觉验收、Windows 两项私有文件权限用例的本机复核。

## 本批新增（2026-11-04，0aae239）

渠道佣金人工录入：只读探查确认房间分组与价计划绑定订单已有基础实现，而 `commissionDetail()` / `commissionPage()` 明确写着「订单不保存佣金、没有渠道费率、报表不推算佣金」，因此选它作为 P4，不重复造轮子。`commission_save` 是业务命令，仅 `admin` / `finance`（含门店角色覆盖）可执行，推进 `revision`、写 append-only 审计 `commissionChange` 的 before/after；订单存 `order.commission`（金额、账单号、备注、时间、录入人、结算时间/人）。共享后端与 `src/demo-store.js` 的 `apply()` 用同一套输入校验（整数分 0–100000000、账单号 1–100 非空、备注 ≤500、结算布尔、订单必须存在）；**不配置费率、不按房价推算、不接 OTA 结算**。报表未录入仍 `commission:null` / `commissionRecorded:false` / `settlement:'unrecorded'`，totals 只在至少一笔已录入时给合计，否则 `null`，不打印 0；按渠道带 `recorded` / `settled` / `unrecorded`。UI 用 `can('commission_save')` 控制表单，三语说明「填渠道账单实际金额，不填估算值」；无权限账号看到只读说明。同批修掉该页 totals 把订单数 / 间夜量经 `currency()` 渲染成 `MYR 0.03` / `MYR 0.07` 的既有显示错误。

改动 6 个既有运行时文件与 2 个既有测试/验证文件，新增 `pms/test/commission-record.test.js`（8 例）；`pms/test/financial-ui.test.js` 追加 1 例；`verification/dom-occupancy.mjs` 把「佣金尚未接入」旧断言改为驱动真实表单（录入 12.34 → 核对另外两笔仍未记录且订单金额不变 → 更正为 15.00 已结算 → 审计两条）。Node 365/365、Python 5/5、16 DOM、38 运行时 JS 语法全通过。线上外部实见 `/healthz` 200、`financial-ui.js` / `app.js` / `financial-reports.js` / `demo-store.js` / `workspace.css` 各自新标识、12 个 `app.js` 导入模块与 2 个 `src` 导入全 200、公开站点 CSP 仍 `default-src 'none'`；`/server/store.js` 404，后端命令与审计字段属**部署重启推断**，需主机 `grep -c commission_save /opt/jovian-pms-test/current/server/store.js` 佐证。

## 本批新增（2026-11-04，a7e3b5f）

审核通过后前台一键办理入住：`sc_checkin` 是人工显式动作，不是审核的副作用。它在 `SelfCheckin.command()` 的事务外单独分派（`store.transaction()` 是 `BEGIN IMMEDIATE`，不可重入），通过 `store.command(actor, {type:'checkin', ...})` 走完整业务校验（库存、账务、房态、营业日、revision、审计）；`beforeApply` 在入住事务内重新调 `conditions()` 复核，把审核通过的登记姓名写入 `order.occupants`。复用 `approved_sig` / `signature(order)` / `reviewer_id`；日期由服务端按门店本地时间计算，不收浏览器日期。幂等靠 `sc_receipts`，`sc_audit` 追加一条 append-only `sc_checkin`；不调用锁 provider、不建 `sc_access`、不生成 PIN。`read()` 暴露 `checkinReady` / `checkedIn`，前台弹层三语说明「审核通过只代表身份已核验，不会开门也不会生成门锁密码」，列表标记待办理/已办理。

改动 `pms/server/self-checkin.js`、`pms/web/checkin-admin-ui.js`、`pms/web/workspace.css`，新增 `pms/test/self-checkin-desk.test.js`（8 例），扩展 `pms/verification/communications-dom.mjs` 用真实 HTTP 全流程驱动。Node 356/356、Python 5/5、16 DOM、38 运行时 JS 语法全通过。线上外部实见 `/healthz` 200、`checkin-admin-ui.js` 五个新标识、`workspace.css` 的 `checkin-desk-action`、12 个导入模块全 200、站点 CSP 不变；`/server/self-checkin.js` 404，后端属**部署重启推断**，需主机 `grep -c checkinFromGrant /opt/jovian-pms-test/current/server/self-checkin.js` 佐证。

## 本批新增（2026-11-04，019cbe8）

提醒条件式升级规则：门店可让某类「可计数」的待办在积压到阈值时自动升级。规则 kind 限定 `rooms_to_clean`（脏房间数）、`request_waiting`（等待过久请求条数）、`checkin_review`（待核验登记条数）；存储事件无规模，不能配规则。规则形如 `{atLeast:N, level:L}`，N 为 1–99 整数，L 为 `urgent/attention/routine`；`default`/空/`null` 表示删除规则。升函数在 `severityOf()`（系统默认 + 门店级别覆盖）之后应用，**只升不降**，避免「紧急客人被降级」；列表对被规则升级的行显示标记。默认无规则 = 行为完全不变（含铃铛 feed）。

表与命令：`notice_rules` / `notice_rules_audit` 两张新表（`CREATE TABLE IF NOT EXISTS`，旧库启动自动建，不重建、不回写），触发器禁止 UPDATE/DELETE；`notice_rule_save` 旁路命令（不推进业务 revision、不产生/清除提醒、不动订单账务）、幂等 receipt、`propertyRole()==='admin'` 鉴权（含门店级角色覆盖）、按门店隔离、`read()` 暴露 `noticeRules`/`noticeRulesAudit`。

共享来源：`pms/src/demo-store.js` 新增 `noticeRuleKinds`、`cleanNoticeRules`、`escalateSeverity`，`seed()` 带 `noticeRules: []`，`apply()` 接受 `notice_rule_save` 并用同一组常量重算级别；`pms/web/workspace-ui.js` 第三个面板（规则表单、升级标记、审计表、三语词条）、`pms/web/app.js` 表单提交、`pms/web/workspace.css` 数字输入样式。改动 7 个既有文件，无新增运行时模块。

验证：Node 348/348、Python 5/5、16 个 DOM 脚本、38 个运行时 JS 语法检查全通过。线上外部实见：`/healthz` 200、`web/workspace-ui.js` 含 `notice-rule-form` / `noticeRuleTitle` / `data-notice-rule-at-least` / `noticeRuleEscalated`、`web/app.js` 含 `notice_rule_save` / `noticeRules`、`src/demo-store.js` 含 `noticeRuleKinds` / `cleanNoticeRules` / `escalateSeverity`、12 个 `app.js` 导入模块与 2 个 `workspace-ui.js` 的 `src/` 导入全 200、公开站点 CSP 仍 `default-src 'none'`。`/server/store.js` 404，后端新表/命令/magnitude 属**部署重启推断**，需主机 `grep -c notice_rules_audit /opt/jovian-pms-test/current/server/store.js` 佐证。

## 本批新增（2026-11-04，d879ec1）

公开预订请求增强：一份请求可含 1–8 间同型房（人数按每间计，报价按全部房间，接受时生成同订单的多个 stay）；客人凭请求编号 + 提交时的联系方式查询状态、在待处理时撤回；拒绝原因对客人可见（前台页面已提示勿写内部信息）；撤回用 `withdrawn_at` 标记 + append-only 事件表达，不改 status 三值、不重建表、不推进 revision、不生成订单；顺带修掉「接受已撤回/已决定请求会先建出孤立订单」的隐患（前置状态检查）；`rooms` / `withdrawn_at` 两列启动时 `ALTER TABLE ADD COLUMN` 迁移、INSERT 改显式列名；隐藏蜜罐字段与备注超 3 条链接静默丢弃。改动文件：`pms/server/store.js`、`pms/server/http.js`、`pms/web/workspace-ui.js`，新增 `pms/test/booking-request-followup.test.js`。Node 340/340、Python 5/5、16 个 DOM 脚本、38 个运行时 JS 语法检查全通过。站点页仍无脚本、无会话、CSP 不变。

## 本批新增（2026-11-04，ba64db0）

门店可配置提醒级别：默认级别不变，门店可把某类提醒上调/下调或留空跟随系统默认，只影响本店；列表、文字标签与铃铛 feed 同步。改动文件：`pms/server/store.js`（`notice_settings` / `notice_settings_audit` 两张新表、旁路命令 `notice_severity_save`、`visibleNoticeSettings` / `visibleNoticeSettingsAudit` 与 read 暴露）、`pms/src/demo-store.js`（级别常量单一来源 `noticeKinds`/`noticeLevels`/`noticeDefaults`/`severityOf`/`cleanNoticeLevels`，本地归约同步）、`pms/web/workspace-ui.js`（`notificationsPage` 配置表单与三语词条）、`pms/web/app.js`（表单提交与传参）、`pms/web/workspace.css`。Node 330/330、Python 5/5、16 个 DOM 脚本全通过。级别是设置不是业务状态：不推进 revision、不碰订单账务、不产生/清除提醒；管理员专属（遵循门店角色覆盖）；只存显式覆盖，留空会跟随当前系统规则。

## 部署与证据边界

- 线上：`https://pms.jovianhome.com`，`/healthz` 返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- 外部能验证的是 `/web/` 下的文件与公开路由；`server/` 下的后端文件**不对外提供**，只能靠「发布会重启服务」+ 主机上 grep 佐证，不能假称已从公网读到。
- 详见 `continuity/VERIFICATION.md`。
