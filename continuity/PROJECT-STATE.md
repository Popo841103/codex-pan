# JOVIAN PMS · 项目状态与续写地图

截至 2026-11-07，代码 `da81383`（门店自定义角色 + 成员附加授权页面入口）（门店自定义角色：照参考产品的 Account Role 模型，模块勾选动作 + 成员附加授权，内置四角色行为不变），此前批次见下表与 `WORKBUDDY-HANDOFF.md` 末尾。Node **408/408**、Python **5/5**、DOM 流程 **19/19**、37 个运行时 JS 语法检查与部署 shell `bash -n` 通过；线上测试服务 `/healthz` 200，前端与 `src/` 新标识已外部实见，`/server/` 仍 404。**自主推进队列 P1–P10 已收敛**，详见 `continuity/AUTONOMOUS-RUN.md`。

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
- 角色 `admin / operations / finance / viewer`，`user_properties.role` 支持**门店级角色覆盖**（可为内置角色或门店自定义角色 `role-*`）；`permissionsFor(user, propertyId)` 是唯一权限来源 = 门店角色动作集 + `member_permissions` 附加授权；新增命令 `role_save` / `role_delete` / `member_permission_save`。账号共享行（系统角色/密码/启停/门店范围）仍只有账号级 admin 可改。
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
| 18 | `0ad964c` | **身份资料保存期限与显式清除**：门店保留天数、服务端 cut-off、仅管理员二次确认后清除、append-only 审计；`self-checkin.key` 纳入发布备份 |
| 19 | `546e331` | **交班现金盘点与差异审批**：期望现金（收款减退款、押金单列）、可选实点、差异仅管理员带原因审批且原数不改 |
| 20 | `b4754fc` | **佣金更正历史**（页面可见前后金额）+ **新建门店零库存**（`property_create`，仅 admin，全新门店无房型/房间/床位）+ 三处空门店 UI 缺陷修复 |
| 21 | `4baad16` | **开放试用注册**：公开无脚本 `/signup` 页（三语、蜜罐、每 IP 5 次/15 分钟），一步创建账号+空白门店；trial origin 服务端封锁（不能再建店、受邀成员继承限制、全局上限 500） |
| — | 调研 | **参考产品取证**：①权限目录实读（307 个 `auth.*`，`docs/pms/smartorder-permission-catalog-2026-11-07.md`），纠正「银行对账」假设——其财务域是 AR 挂账+核销+报表；②取证手册（`docs/pms/smartorder-forensics-playbook-2026-11-07.md`）：三条路径（登录态 HAR / 公开前端 / 客户端逆向）、工具命令、合规红线；③客户端形态实见：桌面端 Electron 壳（`isDdllDesktopRuntime`/`getDdllBusBridge`）、App Store `id6502392484`、Play `com.ddll.smart_order` |
| 22 | `9a15aed` + `da81383` | **门店自定义角色**：`role_definitions` + `member_permissions`，`permissionsFor()` 为唯一权限来源；工单/客人消息/自助入住改按动作判定；团队页三语权限矩阵（13 模块 × 全部动作）+ 每位成员的「附加动作」编辑（整体替换式）；角色保存/删除/附加授权全走幂等 + member_audit；内置四角色行为不变 |

每个批次通常伴随一条 `Record ... in the handoff` 文档提交，细节见 `WORKBUDDY-HANDOFF.md`。

| — | 本批 | 住宿账页拆账、子账单独立结账与冲销（见 HANDOFF） |
| — | 本批 | 同一住宿项按房费、附加消费及折扣分配子账单 |
| — | 本批 | 同一主订单内已结清住宿项批量结账 |

## 2026-11-07 财务进展

| 批次 | 业务范围 |
|---|---|
| 拆账 | 子账单结账及审计冲销 |
| AR | 账户、转应收、FIFO/手工核销、转移及冲销 |

| AR 报表 | 账龄、账户余额、挂账、核销明细与流水、AR 调账、宾客账结余及权责制营业 |

| AR 月结 | 已结束月份关账、账户期末余额快照、冻结期间资金操作 |

| AR 调账 | 独立加记、指定应收减记、追加冲销与报表追溯 |

| 渠道佣金月结 | 按账期及渠道汇总已录发票，关账后冻结原记录 |

真实 OTA 对账、银行接口及参考产品逐字段复验仍未完成，参见最新 HANDOFF。

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
2. 自助入住收尾之后：真实设备发码 / 撤销 / 过期 / 断网联调；（审核通过后前台一键办理入住已于 a7e3b5f 完成，仍不开门、不生成 PIN，设备确认后的自动入住分支仍未与真机联调。）身份资料保存期限与显式清除、密钥纳入发布备份（已于 `0ad964c` 完成：门店保留天数默认 90、服务端算 cut-off、管理员二次确认后清除、只清加密证件与 PIN、旧策略读默认、密钥复制进 0700 备份目录）。**仍缺**：备份目录加密、密钥轮换、「数据库 + 原密钥」恢复演练；系统刻意不自动删除任何资料。
3. 业务：房间分组（已有基础实现）、价计划绑定订单（已有基础实现）、佣金自动费率与渠道结算导入、账期关闭、银行对账、**平台房源链接批量导入**（用户已提出，未实现：只在公开可读时抓取，抓不到如实说，导入前先给用户确认清单）。（渠道账单上的**单笔实际佣金已可人工录入**于 `0aae239`，含账单号、备注、结算状态与 append-only 审计；仍未接 OTA 结算、没有费率、没有银行对账、没有整期关闭。）
4. 站点：照片与逐房描述、支付与押金、自动确认、真正的验证码 / 账号体系。（多房请求、客人凭编号+联系方式查询/撤回、蜜罐与链接反垃圾已于 d879ec1 完成；目前一份请求仍只对应一个房型，不自动确认、不收支付。）
5. 工程：PostgreSQL 迁移与真实并发验证、真机 Edge / 手机视觉验收、Windows 两项私有文件权限用例的本机复核。

## 本批新增（2026-11-04，0ad964c）

身份资料保存期限与显式清除：`sc_grants.submission` 原先存加密身份资料、`sc_access.pin` 存加密 PIN，既无保留期限也无删除路径；发布备份只备份 SQLite，恢复后这些记录将永久无法解密。`retentionDays` 现为门店策略设置（默认 90、范围 1–3650，走既有 `sc_policy_save`），`retention()` 在服务端按 UTC+8 本地日与各住宿离店日期算 cut-off，不收浏览器日期；`read()` 返回 `{days,cutoff,eligible}`，前台先看到截止日与到期条数再操作。`sc_purge_identity` 是独立命令、仅 `admin`（含门店角色覆盖）、需二次确认，**无定时器、无启动扫描、无读取触发删除**；只清 `submission` / `document_hashes` / `rejection_reason` / `sc_access.pin` 并写 `purged_at`，不动订单、账务、幂等收据与审计；append-only 审计只记 cut-off、天数、清除条数与 PIN 数，不含姓名证件号或解密文本。`conditions()` 对已清除登记永久拒绝入住，`read()` 暴露 `identityPurged`。旧库经 `PRAGMA table_info` 守卫的 `ALTER TABLE ADD COLUMN`，`policy()` 用 `defaults()` 补齐旧策略；`sc_invite` 的 INSERT 改为具名列（表已加宽两次，位置参数会错位）。发布备份把 `self-checkin.key` 复制进同一 0700 目录、chmod 600、写 `backup-contents`，仅主机本地复制，密钥不进仓库 / 发布包 / 日志。前端三语词条、保留天数输入、清除面板与 CSS。

改动 `pms/server/self-checkin.js`、`pms/web/checkin-admin-ui.js`、`pms/web/workspace.css`、`pms/deploy/update-vultr-test.sh`、`pms/deploy/ci/BOOTSTRAP.txt`、`pms/verification/communications-dom.mjs`，新增 `pms/test/self-checkin-retention.test.js`（9 例）。Node 374/374、Python 5/5、16 DOM、38 运行时 JS 语法、部署 shell 语法全通过。线上外部实见 `/healthz` 200、`checkin-admin-ui.js` 十个新标识、`workspace.css` 的 `.checkin-retention`、12 个 `app.js` 导入模块与 2 个 `src` 导入全 200、公开站点 CSP 仍 `default-src 'none'`；`/server/self-checkin.js` 404，后端命令、新列与发布备份改动属**部署重启推断**，需主机 `grep -c sc_purge_identity /opt/jovian-pms-test/current/server/self-checkin.js` 佐证。**踩坑**：改部署脚本后 `BOOTSTRAP.txt` 的校验和副本不同步会让新服务器装回旧脚本，已用确定性 gzip 重生成 payload 与 digest，Python 5/5 恢复通过。

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

## 本批新增（2026-11-04，546e331）

交班现金盘点与差异审批。既有 `shiftSummary()` 只按 kind/method 汇总收款、退款与押金，`shift_handover` 存一份窗口快照，没有「实点现金」字段，也没有差异处理路径；状态索引的剩余缺口里明确列着 `cash-up variance approval`，属不依赖外部接口的纯内部缺口。

- **期望净现金只算真正进抽屉的钱**：`shiftSummary()` 新增 `cashExpectedByMethod` / `cashExpectedTotal`，等于窗口内 `payment − refund`，按 method 分列；`deposit_in` / `deposit_out` 是负债，仍只在 `byMethod` / `depositNet` 列示，绝不计入。窗口外交易照旧排除，既有 `net` / `byMethod` 数值完全不变。
- **盘点是可选的，绝不替人猜 0**：`shift_handover` 接受可选 `countedCash`（整数分、0–100000000），校验同时写在 `server/store.js` 与 `src/demo-store.js` 的 `apply()`。不传时交班记录字段集合与旧版完全一致、不写 `cashCount`；传时存 `{counted, expected, variance, status, approval}`，零差异 `balanced`，否则 `pending`。
- **短款/长款不静默核销**：`cash_variance_approve` 是独立业务命令，`roleTypes.admin` 专属（`operations` 可交班但不能审批，`finance` / `viewer` 也不能；含门店角色覆盖），要求非空 ≤500 的原因，拒绝不存在、未盘点、已平、已决定的目标，只把 `status` 改成 `approved` 并写 `{at, actor, reason}`，**counted / expected / variance 永不改写**，原差异永久可读；按请求 key 幂等、按门店隔离（KL 命令够不到 PG 的交班记录，因为 `before` 是单门店 body）。
- **审计只留事实**：`shift_handover` 带盘点时写 `handoverCash:{counted,expected}`，审批写 `{handoverId,variance,reason}`，均不含客人姓名、证件或解密文本；不带盘点时完全不写 `handoverCash`。
- **前台三语**：交班表单加 `#handover-cash` 与说明（只核对收款减退款、押金单列、留空=不盘点），交班历史表 7→9 列新增现金状态与操作，逐行显示期望/实点/差异/状态/审批人与原因；仅 `pending` 且 `can('cash_variance_approve')` 才给原因输入与审批按钮（二次确认）。`app.js` 用 `/^\d+(\.\d{1,2})?$/` 校验、复用 `toMinor()`，留空则完全不带 `countedCash`。

改动 4 个既有运行时文件（`pms/server/store.js`、`pms/src/demo-store.js`、`pms/web/workspace-ui.js`、`pms/web/app.js`），新增 `pms/test/cash-count.test.js`（11 例），扩展 `pms/verification/dom-night-audit.mjs` 走真实 in-process HTTP 全流程。无新增运行时模块。Node 385/385、Python 5/5、16 个 DOM 脚本、38 个运行时 JS 语法、部署 shell 语法全通过。

线上外部实见（2026-11-04，推送 `d9cc9df` 后约 30 秒部署）：`/healthz` 200；`web/workspace-ui.js` 18 个现金盘点新标识、`web/app.js` 6 个（`cash_variance_approve` / `countedCash` / `handover-cash` / `data-cash-approve` / `cashApproveConfirm` / `cash_count`）、`src/demo-store.js` 4 个（`cashExpectedTotal` / `cashExpectedByMethod` / `cash_variance_approve` / `cash_count`）全部命中；12 个 `app.js` 导入模块与 2 个 `src` 导入全 200；公开站点 CSP 仍 `default-src 'none'; ... form-action 'self'`；`/server/store.js` 与 `/server/self-checkin.js` 仍 404。后端权限与审计字段属**部署重启推断**，需主机 grep 佐证，详见 `continuity/VERIFICATION.md`。

## 本批新增（2026-11-04，b4754fc）

佣金更正历史 + 空白门店。用户明确要求删掉「10 间房 + 30 床实际布局待确认」这一项，改为**新门店默认为空、全部手填**，并以后可把平台房源链接交给助手整理导入（尚未实现，见剩余缺口）。

- **`property_create`**：仅 `admin`，`revision 0` 写入空 body（`resources`/`roomTypes`/`physicalRooms`/`ratePlans`/`rateCells`/`orders`/`blocks`/`audit`/`notifications`/`noticeSettings`/`noticeRules`/`businessDate:null`/`nightAudits`/`shiftTypes`/`handovers` 全空），给创建者授权，写一条 append-only `property_create` 审计（`starterInventory:'empty'`）。因门店行尚不存在，该命令必须在 `authorize()` **之前**分派；走既有 receipt / fingerprint 幂等机制，不经过 property reducer、不推进 revision。
- **admin 可以没有门店**：`createUser()` 不再强制非空门店列表，`read()` 在「只有管理员且无门店」时返回 `noPropertyYet:true`；非 admin 仍必须指定门店。
- **设置页新建入口**：`catalog-ui.js` 新增名称 / 代码 / 创建按钮面板（三语），`app.js` 通过 `backend.execute()` 提交，成功后切到新门店并停在「房型与资源设置」。
- **文案去掉预设布局**：`catalogNote` 三语改为「房型、房号与床位全部由管理员自行配置，系统不预设任何房间数量」；`seed()` 保持不动，既有门店不受影响。
- **同批修掉三处只在空门店出现的真实缺陷**：① `render()` 在零门店时调 `preview()` 抛 `Property required`，被 boot 的 catch 吞成「服务连接失败」（全新安装看起来像服务器挂了）→ 加 `noScope` 短路；② 门店 `<select>` 每次 render 重建，`onchange` 绑定丢失 → 改 document 级委托 `change`；③ `switchProperty()` 先 `leaveDialogs()` 但选择器自身仍开着，被 `busy` 拒绝 → 先关 `#property-dialog`。
- **佣金更正历史**：`commissionPage()` 增加最近 50 条 `commission_save` 历史表（变更前 / 变更后、账单号、结算状态），只展示不过账；`src/demo-store.js` 新增 `commissionBefore` 并在审计写 `commissionChange:{before,after}`，与共享后端一致。

改动 4 个既有运行时文件（`pms/server/store.js`、`pms/web/app.js`、`pms/web/catalog-ui.js`、`pms/web/financial-ui.js`）与 `pms/src/demo-store.js`；新增 `pms/test/property-create.test.js`（10 例）与 `pms/verification/dom-empty-property.mjs`。Node 397/397、Python 5/5、17 个 DOM 脚本、37 个运行时 JS 语法、部署 shell 语法全通过。

线上外部实见：`/healthz` 200；`web/catalog-ui.js` 含 `newPropertySave` / `catalogEmptyNote` / 新 `catalogNote`，`web/app.js` 含 `property_create` / `new-property-save` / `const noScope`，`web/financial-ui.js` 含 `commissionHistory` / `commissionHistoryNote`；14 个 `/web/*` 模块全 200；公开站点 CSP 不变；`/server/store.js` 仍 404。后端命令、`noPropertyYet` 与 `starterInventory` 属**部署重启推断**，需主机 `grep -c property_create /opt/jovian-pms-test/current/server/store.js` 等佐证。

## 本批新增（2026-11-04，4baad16）

开放试用注册（用户指令：「门店要自己添加的，就是做一版本任何人都能试用的，可以对外的系统」，并经确认卡选定为：开放注册即时可用、严格隔离、先上测试站、基础防护）。实现要点：

- **`GET /signup`**：公开无脚本 HTML 表单（用户名、密码两次、门店名称、门店代码、蜜罐字段），CSP 与公开站点一致（`default-src 'none'`、`form-action 'self'`、`noindex`），三语页面文案写在 `server/http.js` 内（发布器不安装新运行时文件）。`POST /signup` 无会话收表单、PRG 重定向，成功落 `/web/?signup=<名>&store=<代码>`，登录弹层三语提示注册成功。
- **`Store.signup()`**：校验用户名/密码（12–256）/门店代码/名称，重名 409 `username_taken`、重码 409 `property_exists`；事务内写用户（`role:'admin'`、scrypt、`origin:'trial'`）+ `revision 0` 空门店 body + 授权 + append-only `property_create` 审计（`starterInventory:'empty'`、`origin:'trial'`）。
- **隔离靠 origin 列**：守卫式 `ALTER TABLE users ADD COLUMN origin DEFAULT 'staff'`（不重建表）。`createProperty()` 对 `origin==='trial'` 直接 403；`saveMember()` 新建成员继承 actor 的 origin（受邀「admin」不能绕过上限）；全局上限 `Store.trialStoreCap=500`，超出 403 `signup_closed`。员工账号完全不受影响（既有 property_create 测试原样通过）。
- **隔离走常规授权链**：trial 的 `user_properties` 只有自己门店，`authorize()` / `visibleMembers()` / 全部 scope 检查原样生效。
- **防滥用沿用公开站点模式**：每 IP 15 分钟 5 次（成功、蜜罐、密码不一致都计数）、蜜罐命中按 `rate_limited` 应答不泄露判定原因、密码不一致带 `signupError=password_mismatch` 回显已填字段；无第三方验证码、无邮件验证（无邮件通道，不伪造）。
- 页面对 trial 隐藏建店面板（`catalog-ui.js` 读 `window.__pmsUserOrigin`），服务端反正会拒绝——展示层只是礼貌。

改动 4 个既有运行时文件（`server/store.js`、`server/http.js`、`web/app.js`、`web/catalog-ui.js`）；新增 `pms/test/trial-signup.test.js`（5 例）与 `pms/verification/dom-trial-signup.mjs`。Node 402/402、Python 5/5、18 DOM、37 运行时 JS 语法、部署 shell 语法全通过。

线上外部实见：`/healthz` 200；`GET /signup` 200、CSP `default-src 'none'`、`X-Robots-Tag: noindex`、含 username/store/company 字段且零 `<script>`；`web/app.js` 含 `signupDone`/`signupDoneStore`/`window.__pmsUserOrigin`，`web/catalog-ui.js` 含 `__pmsUserOrigin`；`/api/signup` 不存在（403，注册走表单路由）；`/server/store.js` 仍 404。**刻意没有在线上真实注册试用账号**——不向共享测试库写未被要求的垃圾数据。后端 `Store.signup()`、origin 迁移、trial 拒绝、成员继承与 500 上限属**部署重启推断**，需主机 `grep -c signup_closed /opt/jovian-pms-test/current/server/store.js` 等佐证。踩坑：`app.js` boot 里裸用 `location`/`history` 让其余 17 个 DOM 脚本全崩（jsdom outside-only 无此全局），改为 `window.location`/`window.history` 可选链后恢复。

## 部署与证据边界

- 线上：`https://pms.jovianhome.com`，`/healthz` 返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- 外部能验证的是 `/web/` 下的文件与公开路由；`server/` 下的后端文件**不对外提供**，只能靠「发布会重启服务」+ 主机上 grep 佐证，不能假称已从公网读到。
- 详见 `continuity/VERIFICATION.md`。

同一主订单已支持合并收款及逐项分配。跨住宿转账待实现。

AR 与佣金已关闭月份支持以当前营业期追加更正，原快照可查。改期续住计价及班次、夜审与报表对账留给后续批次。
