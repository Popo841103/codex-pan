# JOVIAN PMS · 项目状态与续写地图

截至2026-11-11，最新功能`96ff297`、最终运行时`5b407329efb13e0036d065dc6231a97e873efb80`。独立客户、统计双维度、账簿创建/完成筛选、归属快记账/物品与内部账单；小时预订采用整日库存保护仍部分。Linux及Ubuntu Node24 **534/534**、Python **5/5**，本地DOM **30/30**；最终Actions `42859317901`已实际部署，健康/四份JS和CSS哈希/26模块GET核验通过。矩阵已有63/部分36/缺失0/禁止或外部15，本批15条提升。入口、边界及后续见本文末尾、continuity/VERIFICATION.md及pms/verification/customer-statistics-audit.md；既有数据和发布工作流均保留。

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

1. 提醒：**外部投递仍未连接**（短信/邮件/push）。门店级别、条件升级、班次/账号规则、内部员工提醒历史查询及本人撤回已完成；系统事实提醒仍是当前待办，不宣称完整自动化发送任务或外部通知档案。
2. 自助入住：真设备发码/撤销/过期/断网联调仍缺，不开门不生成PIN。保留期限与显式清除已有；本批已有离线备份目录加密、密钥/epoch轮换及合成“数据库+原密钥”恢复演练。**服务器发布器备份尚未自动调用加密工具，现存备份未被本批改写**；需主机运维在保留旧根密钥的前提下对静止副本使用现有 runtime CLI，本批按要求不改工作流、不操作真实备份。
3. 业务：渠道默认费率、预期快照/实际差额、佣金月结冻结和当期开期更正已完成；**OTA结算导入、银行对账仍未连接**。平台公开URL批量读取→逐行管理员确认→门店房型草稿已实现，失败/缺字段如实留空；草稿可以编辑，不自动建库存或发布，实际房型/物理房仍走现有资源编辑器手工维护。登录后页面、不可读robots/跳转/IPv6页面仍需人工输入，不绕过失败。
4. 站点：房型照片/封面/顺序、物理房三语描述、同一请求多房型已实现，仍**无支付/押金、自动确认、真实验证码/账号平台**。多房型每间人数及入住区间相同，总量1–8；前台人工接受，库存/夜审规则照旧。
5. A7：增加整单住宿及审计查询、当前日历区间住宿查询；指定共享隐藏入口审计第9节未在本克隆找到，不能声称对未知清单完整对齐。打印/任务内部/代码发送/锁控制及全部 Do NOT 项保持未做；详见本批审计映射。
6. 工程：PostgreSQL迁移与真实并发验证、真机Edge/手机视觉验收、Windows两项私有文件权限用例复核、主机侧备份加密纳入运维仍待做。公网本批只读GET，后端以源码+合成测试+成功发布推断，不冒充线上业务验收。

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

本批运行时版本 `a0e05cb` 已发布到测试站，AR 及佣金更正入口均已部署。

改期续住计价按已保存逐夜价和表单每晚价执行，保留已夜审房费、已收款和押金。待做班次、夜审和报表金额核对。

改期续住计价已发布到测试站，运行时版本 `a2f30ac`。

班次交班按真实时间窗口统计现金，财务日报核对非现金转移，暂存费用排除并保留付款。夜审工作台与初始营业日设置入口已分开。未核验的自动或批量规则见 HANDOFF。

运行时 `ad48dbb` 已部署到测试站。Actions 42789084376 成功，Linux Node 427/427、Python 5/5。公网健康检查、夜审与班次入口、交易与营业报表标识均已核验。交互验证使用合成数据。

夜审工作台新增处理全部，设置支持按班次加人员交班。保留暂存和逐夜房费规则。自动调度及缺少验收的边界见 HANDOFF。

运行时 `0ccc249` 已部署测试站。Actions 42792436206 成功，Linux Node 429/429、Python 5/5。公网健康检查和夜审工作台、设置、处理全部及交班方式标识已核对。实际交互使用本地合成订单验证。

预订引擎已加入实见设置预览。房型和价格计划可跳到现有维护页。未核验的渠道配置、税费维护、SEO 注入、倍率编辑、身份核验提交均待后续实见。

运行时 `4d383b8` 已部署测试站。Actions 42793514069 成功，Linux Node 429/429、Python 5/5。公网健康端点、预订引擎、划线价与核验预览标识实见通过。交互验证使用合成数据。

## 暂存箱与住宿状态保护批次（2026-11-10）

运行时提交：`f12c1f0876851287041be3cf63a48643a9f6617c`。暂存箱当前/历史页、搜索与筛选、沿用取消与原子库存恢复；订单详情锁房复选框、状态撤销/恢复，日历同日拖动换房及夜审边界。没有新增运行时模块或改部署工作流。未核验：Blocked 等价状态、非零取消费用恢复的账务口径、真实账号操作、NOBEDS、支付、TTHotel。

发布：Actions [42795933551](https://github.com/Popo841103/codex-pan/actions/runs/42795933551) 成功，Ubuntu Node 433/433、Python 5/5。公网 `/healthz` 返回 `ok:true`、`data:test-only`；`/web/app.js` 已验证 `data-reservation-box`、`data-box-tab`、`data-box-cancel`、`data-box-restore`、`toggle-lock`、`data-stay-reversal`、`data-stay-drag`、`confirm-room-drag`；`/web/workspace-ui.js` 的预订引擎与夜审工作台标识仍在。


## 前台工具与显示规则审计补全（2026-11-10）

基线运行时 `e69f4a4`（Actions [42798753554](https://github.com/Popo841103/codex-pan/actions/runs/42798753554) 成功）已逐项审计。本批运行时 `c57d73f4589ec030e9a8466300d37b7652f9d4e8`，Actions [42825710371](https://github.com/Popo841103/codex-pan/actions/runs/42825710371) 的 Verify PMS 与 Deploy 均成功。逐项表见 `pms/verification/front-desk-audit.md`：原批次 1、3、6–11 完成，2、4、5 为文案部分完成，本批补齐；11 项在本次要求边界内均完成。

- **入口**：房态 → 日历 → 房态日志 / 智能锁列表 / 批量打印；住宿项详情底部 → 计划任务 / 打印中心 / 自助入住预览；设置 → 房态显示与前台住宿规则（也可从日历 → 显示设置进入）。分组用于日历筛选，显示设置可选择按房型、房间、分组排列。
- **规则**：房态日志仅查询，房号、操作日期、动作、操作人筛选与八列完整，保留关房/开房/置净/置脏/停用快照，不修改旧日志。操作日期按马来西亚自然日，关房起止按原库存日期；不拿营业日替代。未记录历史字段留空。智能锁 Private Door/Common Door 均可空，支持搜索输入，明确未开通；计划任务仅 All 空列表。打印中心仅两个页签和基础设置提示；批量打印仅过滤计数；自助入住仅外观且生成/确认禁用。三语独立 No Data 替换误导的创建订单提示，英文标题补全 Print Center。
- **规则**：管理员创建/改名分组并拖入房间；房型、房间、分组拖动排序影响对应日历显示。付款方式与既有渠道默认全部启用，可拖动排序/停用，账页与新预订使用保存后的选项。仅既有渠道枚举，不宣称连接 OTA。预发房卡默认关闭、分钟禁用且 0；开启接受整数 0–1440 分钟（相对入住时间），关闭归零。只保存门店设置，不实际发卡，不是智能锁密码。共享后端沿用授权及同一 reducer，双状态机一致性由合成测试覆盖。
- **验证**：Linux 本地 Node 24 `npm test --prefix pms` 439/439，Python 5/5；Ubuntu Actions 同为 Node 439/439、Python 5/5。25 个 DOM 脚本及 folio 的两种参数分支，共 27/27；38 个运行时 JS 语法及 CI 三个部署 shell 语法通过。增强 `dom-front-desk-tools.mjs` 覆盖所有工具只读、不增加 revision/audit、三种日历行序、分组创建/改名、选项停用/排序、房卡开关与订单/资金记录不变；新增两项 Node 测试覆盖共享/本地设置与五类日志快照一致及旧历史不变。
- **证据等级**：上述交互为本地进程内 jsdom + 内存 SQLite + 合成账号/订单验证，不是线上登录浏览器验收。公网 GET `/healthz` 200 返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`；GET 静态 JS 的新标识实见。后端 `/server/` 不公开，运行时行为依据源码、合成服务测试及发布重启推断，未取得主机佐证或供应商联调证据。
- **线上标识**：`/web/app.js` 命中 `referenceNoData`、`Print Center`、`data-room-status-logs`、`data-smart-lock`、`data-batch-print`、`data-registration-count`、`data-scheduled-task`、`data-print-center`、`data-self-checkin-preview`、`roomTypeOrder`、`groupOrder`；`/web/workspace-ui.js` 命中 `data-operations-display`、`data-layout-list`、`data-group-name`、`advanceEnabled`、`advanceMinutes`、`no key card is issued`；`/web/reservation-ui.js` 命中 `sourceOptions`；公开 `/src/demo-store.js` 命中 `saveDisplayPreferences`、`advanceCard`、`roomStatusRows`，`/src/inventory-actions.js` 命中 `export function roomStatusRows`。全部 17 个 web JS 与 app.js 的 21 个实际直接导入模块均通过 GET 200 检查。
- **刻意未做**：打印、模板设置内部、生成/复制/发送自助代码或链接、任务类型/自动发送、门锁设置字段/购买/远程开门/密码、真实发卡、NOBEDS/支付/TTHotel；未操作真实订单、资金或门锁，未修改线上账号或重置数据。日历 Overview/Reserve/Combined Room/Share、自动夜审/00:00 交班/跨午夜截账/补跑、无人归属流水、清空夜审、历史批量夜审/一键结账、计划自动重报价、附加费自动移日、Booking Engine Configure/税费/跟踪代码/倍率编辑/身份提交继续不做。跨夜审暂存恢复与 AR 保护保留。没有改部署工作流或新增运行时模块。


## 内部运营 A1–A9 批次（2026-11-10）

- **版本**：基线运行时 `c57d73f`、文档 `f0f12c1`；本批运行时 `40df39059a0e0de2ce056bd7fcb31a04cac49b81`，Actions [42836859905](https://github.com/Popo841103/codex-pan/actions/runs/42836859905)。部署结论与GET结果见 `continuity/VERIFICATION.md` 本批节；逐项规则与边界见 `pms/verification/internal-operations-audit.md`。
- **A1入口/规则**：设置→提醒，班次/账号升级规则、员工提醒/可搜索历史、本人原因撤回、活动日期报表。设置账户管理员专属；作用域同门店、最新同作用域规则生效且只升级。班次按马来西亚自然时钟匹配，活动按明确营业日，不混口径。原文/撤回分开保留、追加审计；指定接收账号只向本人/发送人展示，管理员可查门店历史。无短信/邮件/push。
- **A2/A3入口/规则**：统计→佣金明细，默认渠道费率（百分比/生效营业日/追加历史）、首次账单预期/实际/差额（分）、佣金月结快照与当前开放期更正。预期以首次录入的账页应付总额（含附加费/取消费）作为人工参考，保存费率和基数，后续改费率不重算旧单，缺费率不猜。关闭月份禁止费率补写与原账修改；账户管理员勾确认后再次确认具体月份，月结保存原预期快照。旧更正无营业日显示未分配计数，不拿月份首日补日期；无OTA结算导入或银行对账。
- **A4入口/规则**：设置→房型与房间，最多10个公开URL逐行读取，核对标题/人数/照片URL/描述/当前门店后管理员逐行确认，才保存可编辑房型草稿。缺字段留空；来源快照保留，不自动建销售库存或发布。HTTPS、DNS地址校验并固定连接、私网/保留网段/IPv6拒绝、无Cookie/脚本/跳转、5秒/1MB、robots失败关闭。所有测试用本地注入fixture，没有对真实平台抓取或绕过授权。
- **A5入口/规则**：设置→门店网页或房型与房间，照片URL顺序/封面、每物理房zh/en/ms描述，前后内容快照。公开 `/sites/<slug>?from=...&to=...&guests=...` 查询结果显示，只有存在且发布的站点允许HTTPS图片（no-referrer，文本转义，无脚本）；空路由CSP保留。一个请求可含多个房型，共1–8间，每间人数及日期区间一致；报价快照、查询/撤回仍是一份，人工接受原子生成多个住宿项，无自动确认/支付。
- **A6入口/规则**：既有 `server/self-checkin.js` CLI 支持 `backup-seal` / `backup-rotate` / `backup-restore`。目录AES-256-GCM密封，原密钥域分离派生+随机salt+epoch，验证后删目录原明文文件；轮换可换根密钥/epoch，旧包保留旧密钥可恢复。恢复仅写新目录，不覆盖运行库。合成SQLite backup→密封→轮换→恢复DB+原guest key→解密记录与CLI旧包恢复均通过。**没有自动加密服务器现存备份，没有改发布器/工作流**；离线工具已部署，接入主机运维与原密钥安全保管仍是边界，不宣称线上恢复演练完成。
- **A7入口/边界**：日历底部→当前区间住宿查询（可搜索），住宿详情底部→整单住宿与已有日志；均只读、同门店，不增revision。已有房态日志/批量打印过滤/锁未开通列表/计划任务及打印中心和自助入住空预览保留。指定共享隐藏入口第9节未在本克隆定位，仓库可读研究文档的第9节是自动化，未冒充同一清单；未知条目仍未核验。全部禁止动作不做。
- **A8入口/规则**：佣金明细/提醒页下方日期报表及CSV；渠道按来源汇总账单/更正数、预期/实际/差额/无费率数；提醒按发出/撤回列营业日、人员、接收人、原文及原因。CSV同筛选、UTF8 BOM、引号及公式前缀防护；旧日期/费率不猜。
- **A9验证/证据等级**：本地Linux Node24全套449/449（新增10），Python5/5，25个DOM脚本+两种folio参数分支27/27；37个runtime JS及3个部署shell语法通过。新DOM走进程内真实HTTP+jsdom，涵盖预览不写、逐行确认、内容维护、无脚本公开多房型表单、CSV、A7查询不增revision。双状态机逐命令比对，权限/门店隔离/原文保留/营业日期/佣金冻结及恢复篡改拒绝均有合成测试。Windows原两项权限失败规则未改。
- **刻意未做**：真实订单/资金/生产数据/锁/身份操作、线上账号更改或重置、供应商抓取/结算/银行/短信电邮推送、真实设备联调；日历Overview/Reserve/Combined Room/Share、自动夜审/00:00交班/跨午夜截账/补跑、无人归属流水、清空或历史批量夜审/一键结账、自动重报价/附加费移日、Booking Engine Configure/税费/跟踪代码/倍率/身份提交、购买/开门/密码、NOBEDS/支付/TTHotel继续不做。跨夜审暂存恢复与AR保护保留；未新增runtime文件，未改部署工作流。

发布补证：Actions `42836859905`（job `129901265793`）Verify及Deploy成功，Ubuntu449/449、Python5/5；备份 `update-8Fpq4WBO`。公网GET `/healthz` 200且test-only；三份变更JS与本地SHA256一致，17个web JS和21个直接导入模块全部200；server路径仍404。仅只读资产核验，后端为源码/合成测试/发布重启推断，无线上业务交互验收。



## 全目录对照与内部运营查询续跑（2026-11-11，马来西亚/中国 UTC+8）

基线运行时 `40df390`、文档 `9d94165`；本批运行时 **`7e41bf3a4d1232dcffbd9f50a377930c4edd5719`**。保留并审查上次中断的5个运行时文件和2个测试脚本，补建中文 `pms/verification/parity-matrix.md`，修正目录连续编辑稳定ID、DOM旧选择器、iCal共享空间/关房遗漏；没有回退既有线上功能。

参考目录此次在本机只读获得，**A7“第9节未找到”的历史说明已被本批对照取代**。矩阵逐条列出1–9节114个编号入口，另附8个非编号流程/全局入口；编号统计：**已有32、部分62、缺失5、禁止或需外部接入15**。这是保守的功能差距表，不代表完整同款或供应商接通；参考资料、截图、客人资料与金额均未复制入库。

| 本批推进的21个入口 | JOVIAN入口与实际范围 |
|---|---|
| 2.7–2.9、2.12–2.13 | 统计→运营查询工作台：房价变更快照、每日/未来库存、计划到离清洁日历和当前清洁列表；库存沿用共享原子分配，不把不同产品重复相加，不虚构派工/历史清洁状态。 |
| 3.6–3.7 | 同工作台→iCal：匿名占用文件下载与粘贴全天fixture严格预览；覆盖共享套房/关房，未分房或逾期区间不确定时拒绝导出；没有公开订阅、网络抓取或保存导入。 |
| 4.11、5.2 | 工作台→客户住宿详情/内部账单，或住宿详情底部→内部账单；完整费用/净实收/押金分开，非税务发票，不按同名合并独立住宿记录。 |
| 5.3–5.5 | 客户→内部目录：标签组、标签、公司目录/已有AR引用；追加版本和标签绑定/解绑历史，没有公司储值或自动挂账。 |
| 6.1–6.6 | 工作台→营收、交易、渠道、销售（预订类型/公司）、住宿汇总及备忘录历史，13个查询均可搜索并导出同筛选CSV。备注历史从本版本起，旧记录不补日期；不是独立财务快记账。 |
| 7.3、7.5–7.6 | 客户 / 设置→房型与房间 / 工作台→内部目录：钟点房、餐食、物品定义与价格（MYR分）；钟点定义不创建小时库存，餐食不产生权益/核销，旧住宿不重报价。 |

三语zh/en/ms；目录修改和标签维护由服务端强制账号admin，门店/父项/整数金额/小时范围校验；本地及SQLite走同一reducer，保留追加审计与原版本。营收、销售、备注按记录营业日，交易按马来西亚自然日；押金独列。内部账单完整展示住宿快照，不冒充区间会计账单。CSV采用同一结果、UTF8 BOM、引号/换行转义及公式前缀防护。所有查询/预览不增加revision/audit。

**验证和发布：** Linux本地Node24 **463/463**（基线449，新增14），Python **5/5**；26个DOM脚本及folio `--lines`/`--amend`分支共 **28/28**；37个运行时JS与3个部署shell语法、`git diff --check`通过。新脚本覆盖六目录连续版本编辑、客户标签、13个查询/CSV、三语、离线ICS、账单及切店无旧结果。Node覆盖门店隔离、管理员限制、双状态一致、日期口径、共享空间、严格ICS、CSV和查询纯读。先前DOM旧按钮选择器失败已修正，完整重跑28/28。Ubuntu门禁未弱化，Windows既有私有文件权限规则未改。

`gh run watch 42851378626 --exit-status --interval 5` 返回成功；Actions [42851378626](https://github.com/Popo841103/codex-pan/actions/runs/42851378626)，job `129952661926`，Verify和Deploy均成功，2026-11-10 16:07:57 UTC完成（本地11月11日00:07:57）。CI同样Node463/463、Python5/5。发布器原有备份 `update-vxBcjMlu`；不代表已自动加密。

**剩余缺口（下一优先）**：2.10/2.11餐食权益及可撤销核销、4.13统一失败预订列表、2.8/2.9库存全部分项/筛选、6.8–6.12交班/经理/账簿/权责经营/客账报表完整维度、7.25/9.21节假日、7.26清洁检查项；独立客户档案、按小时预订、公司储值、真实iCal同步及已核验汇率/渠道倍率仍未完成。矩阵保留“部分/缺失”，未以简化查询宣称完整财务系统。

**边界**：没有重置数据、修改既有账号/数据库或真实订单/资金/门锁，没有新增运行时文件或修改发布工作流。用户全部Do NOT项继续不做；特别是日历Overview/Reserve/Combined Room/Share，自动夜审/00:00交班/跨午夜截账/补跑、无人归属流水、清空/历史批量夜审或一键结账、自动重报价/移附加费、Booking Engine Configure内部、税费/跟踪代码/划线倍率/身份提交、锁购买/远开/密码、NOBEDS/支付/TTHotel。跨夜审暂存恢复及AR保护保留并通过既有回归。

公网GET、证据等级及复现详见continuity/VERIFICATION.md本批章节。


## 餐食、库存、清洁与营业日报表续跑（2026-11-11，UTC+8）

基线运行时 `7e41bf3`、文档 `f0a4796`；本批运行时 **`03d67f677ac7835db1f39e7ab9a5046010037823`**，已推送 `jovian-pms-test` 并实际部署。Actions [42855630092](https://github.com/Popo841103/codex-pan/actions/runs/42855630092)，job `129967754962`，Verify与Deploy成功；`gh run watch 42855630092 --exit-status --interval 5`退出0。2026-11-10 16:33:35 UTC完成（本地11月11日00:33:35）。发布器原有备份 `update-b18ZFksR`，不代表自动加密。

矩阵114条：**已有48、部分51、缺失0、禁止或需外部接入15**。本批16条从部分/缺失提升为已有：**2.7–2.13、4.13、6.7、6.11–6.12、7.5、7.25–7.26、9.10、9.21**。已有指明确列出的JOVIAN内部能力，不代表供应商全部字段或接入。

| 入口 | 本批实现与边界 |
|---|---|
| 客户 / 设置→房型与房间 / 统计→运营查询工作台下方 | 餐食分类、计价单位、单价、启停追加版本；管理员分配使用日权益、运营核销、管理员带原因撤销。快照保留，超量/重复撤销/跨门店/取消或暂存住宿拒绝；核销按马来西亚使用日，不自动收费或重报价。 |
| 工作台→餐食明细/汇总、失败及未完成预订 | 使用日权益/已核销/剩余与CSV；人工内部失败记录加现有网站拒绝/撤回等请求统一查询/状态/渠道/CSV，无OTA失败推送、自动重试或供应商字段假造。 |
| 工作台→每日/未来库存 | 全分项、房型/渠道占用过滤、31日纵向或横向矩阵及同结果CSV；共享套房竞争在房型过滤后仍保留。渠道不分摊门店容量，各房型共享选择不能相加，干净/脏房只是当前快照。 |
| 工作台→房价及可售变更历史 | 同时过滤受影响日、操作日、房型、计划、人员和实际变化项目；原批次及before/after保留。 |
| 目录→清洁检查项；工作台→清洁列表/日历/检查记录 | 管理员检查项启停/改名/关联房型；完整适用检查表逐项保存名称快照、结果、备注、人员、时间；人工任务指派/进行/完成/取消，负责人限有效本门店账号；检查/任务不自动改房态，不生成历史状态。 |
| 目录→节假日与活动；工作台→节假日历 | 日期、名称、类型、热度、显示追加版本；逐日日历、列表、搜索、CSV。仅人工内部假日，无未经核验国家节假日或官方订阅。 |
| 工作台→交班/经理/账簿/权责经营/客账余额 | 五类新增营业日查询和CSV；新交易记录权威营业日并另列马来西亚交易日，旧缺日期不倒填。权责借贷及押金负债分开，期间与截至结束日所在月累计；客账期初+费用−净收款−AR−账单转入=期末，押金独列，仅涵盖已知日期账项。原自然日现金流与经理公式页保留。 |

**仍保留部分的业务报表**：6.8/6.9虽新增收银汇总/明细、接待分页、交班窗口/操作员/方式/渠道筛选和CSV，房卡明确未接通；接待仅可读最近500条审计，新日志记录营业日，不追造历史。班次仅筛选已完成交班窗口内有时间戳的操作，房晚不凭空分班。6.10新增营业日统一明细及当前整单住宿账簿快照，但仍缺完整创建/完成时间过滤及全部业务分类。没有储值、外部会计、房卡供应商集成。

**验证**：本地Linux Node24 **490/490**（新增27），Python **5/5**；27个DOM脚本加folio `--lines`/`--amend`共 **29/29**；37个运行时JS、4个部署shell语法及`git diff --check`通过。Ubuntu Actions同样Node490/490、Python5/5。新Node逐命令比对双状态机、权限/门店隔离/幂等/原记录保留、共享套房/逾期/矩阵、两种日期口径及财务公式；新DOM在本地真实HTTP+jsdom+合成账号/内存SQLite操作完整新增链。首轮旧internal-operations DOM等待内容入库后抢先导航，已明确等待新form替换，完整29分支重跑全过；没有放松业务busy guard或Ubuntu门禁。Windows既有私有文件权限规则未改。

**后续优先**：独立客户档案、6.1–6.6统计完整维度及有住宿归属的快记账、6.10创建/完成日期账簿过滤、小时预订；之后再评估明确授权范围内iCal持久导入。房卡/储值/OTA失败推送及真实外部会计不冒充接通。全部Do NOT项继续不做，跨夜审暂存恢复、AR、资金/押金分离等原保护保留。

本批未重置数据、修改既有账号/数据库或操作真实订单/资金/门锁；SmartOrder仅本机只读入口资料参考，无个人数据/截图复制。新增运行逻辑并入5个既有runtime文件，未新增部署runtime文件、未改发布工作流。详见 `pms/verification/operations-completion-audit.md` 和 `pms/verification/parity-matrix.md`。


## 独立客户、统计维度与账簿续跑（2026-11-11，UTC+8）

基线运行时`03d67f6`、文档`1e9924c`。本批功能提交 **`96ff297d72b6afc6cb5fc112389d4f9efbfc266e`**；随后以 **`5b407329efb13e0036d065dc6231a97e873efb80`** 修正旧流水`at:null`误变Unix纪元日期的边界，明确列为日期未分配。两次均已推送`jovian-pms-test`并实际部署，不回退原有功能或数据。

最终Actions [42859317901](https://github.com/Popo841103/codex-pan/actions/runs/42859317901)，job`129980844356`，Verify和Deploy成功；`gh run watch 42859317901 --exit-status --interval 5`退出0。2026-11-10 16:54:47 UTC完成（马来西亚/本地11月11日00:54:47）。Ubuntu Node **534/534**、Python **5/5**。前次Actions`42859098210`/job`129980067044`也成功（Node533/533）。最终发布器原有备份`update-N3V2AIwp`，不代表自动加密。

矩阵共114条：**已有63、部分36、缺失0、禁止或需外部接入15**，本批15条由部分提升：**4.11、4.14–4.15、5.1–5.2、6.1–6.6、6.10、7.6、7.11–7.12**。已有仅表示矩阵明确列出的JOVIAN内部能力，不代表供应商全部字段或外部服务。

| 已完成行 | 入口与实际范围 |
|---|---|
| 5.1–5.2 | 客户/设置→内部目录→独立客户档案；客户档案与有归属业务。独立编号、允许同名、新建/修改/停用追加版本，联系方式/生日/证件末四位选填，管理员明确绑定/解绑住宿及原因。不自动合并，不改住宿快照；待收/待退/押金独列。 |
| 6.1–6.5 | 统计→运营查询工作台→营收/交易/渠道/销售/住宿汇总。前四类双维度及房型/渠道/已记录计划/状态/账项类型/创建完成日期过滤，住宿五维度和共享容量，搜索/CSV同结果。营收按费用营业日，交易按马来西亚自然日；房晚与小时费用分开，渠道/细分条件不虚构容量归属。 |
| 6.6、7.11 | 目录→快记账分类；客户档案与有归属业务→有住宿归属快记账；工作台→快记账/备忘录历史。管理员方向/启停追加版本，运营收退款必须选住宿及原因，类别快照保留，沿用余额/关闭/拆账/AR/暂存保护。不做无人归属收支或非住宿支出。 |
| 6.10 | 工作台→统一账簿记录。营业日费用/四类收退款/AR/账单转账、完整住宿快照；新增创建与实际退房的马来西亚日期起止过滤、时间/创建人/状态。完成时间从本版显式退房记录，撤销退房清空当前时间；旧记录不倒填，不以计划离店冒充完成。 |
| 4.14–4.15 | 工作台→收退款流水明细/交易汇总。住宿归属、人员/方式/渠道/房型/参考号/备注、自然日与另列营业日，搜索/分类/CSV；四类流水和押金独列，混合明细无误导性金额合计。 |
| 4.11、7.12 | 目录→内部账单模板；住宿详情→内部账单，或工作台→内部账单。纯文字标题/页脚/启停管理员版本，完整费用及押金独立快照、CSV和专用打印样式；非税务发票，不维护税费、不注入代码、不提交外部票据。 |
| 7.6 | 目录→物品；客户档案与有归属业务→物品费用。确认住宿/数量/原因后按保存时名称和单价快照写入当前营业日；改目录不重算旧费用，无自动物品库存。 |

**小时预订已推进，但7.3继续部分**：目录→钟点定义后，在“客户档案与有归属业务→小时预订（整日保留库存）”创建指定资源订单；工作台→小时预订查询/CSV，详情显示使用日/起止时间。整点、整数小时、不跨午夜；价格为最低时长基础价加向上取整额外单位，保存定义快照。使用日整日保留库存，复用现有共享原子及SQLite claims，实际退房后释放；同日办理入住、付清且押金清零才退房标脏。拒绝已夜审日、逾期在住共享资源和普通改期重报价。尚无精细小时段分配、预定同日多次周转或自动周转，不为完成指标改成已有。

**6.8/6.9继续部分**：从本版起完整追加接待事件，与旧可读audit去重；旧日志仅最近500条可读记录、不追造。交班仅筛选人工已完成窗口，不把房晚凭空分班，房卡仍未接通。

**回归**：本地Linux Node24 **534/534**（新增44）、Python **5/5**；28个DOM脚本加folio`--lines`/`--amend`共 **30/30**；37个runtime JS和6个shell语法、`git diff --check`通过。新增Node覆盖独立客户同名隔离/显式绑定/追加版本、财务保护、统计勾稽与日期口径、旧空时间、小时冲突和夜审，并逐命令比对本地reducer与SQLite的orders/directory/completion/reception状态、权限/隔店/幂等。新DOM通过本地HTTP+jsdom+合成账号/内存SQLite运行完整业务链、三语、CSV、切店清空及查询不写审计；打印为window.print桩验证，未声称真实打印机或线上写业务验收。旧DOM选择器报表数由23更新为27。Windows既有私有权限规则和Ubuntu门禁均未弱化。

新增运行逻辑并入6个既有runtime文件，新增test/verification文件不参与运行时安装；无新runtime依赖/模块/数据表，未改发布工作流或claims结构。没有修改既有账号/真实订单/资金/门锁或重置数据库；SmartOrder只用已有只读观察作流程参考，未复制未核验字段或客人资料。全部Do NOT继续不做，既有夜审、暂存恢复、AR、账单关闭与押金保护保留。

**下一优先**：小时库存精细时间窗与人工周转；明确授权边界内iCal持久导入；公司目录非储值内部能力；首页/前台仍为部分的内部设置。真实房卡/OTA/支付/锁及外部会计不冒充接通。逐行范围和复现见`pms/verification/parity-matrix.md`、`pms/verification/customer-statistics-audit.md`。

### 最终版本公网只读GET证据

检查时间：`2026-11-10T16:55:07.090843+00:00`。

- GET `/healthz` 200，精确返回`{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- GET `/web/app.js` 200，逐字节与本地一致；SHA256 `27c15cb18402d4043821cf91ffc06b8c77ad4de14f3c041c039f0ff209f4f66c`；标识`data-completion-command`、`data-hourly-stay`、`invoice-print`全部命中。
- GET `/web/workspace-ui.js` 200，逐字节与本地一致；SHA256 `322f366852fb7367b5a2038825ab4875e5458d7e0e66c5c132d9016f85ca9a46`；标识`completionPanel`、`createdFrom`、`customerProfiles`全部命中。
- GET `/src/demo-store.js` 200，逐字节与本地一致；SHA256 `79bf167f25d97b958c216add3e5e25709c65c43e3191f085b5fc8d4c065d106a`；标识`completionActions`、`customerLinks`、`whole_day_hold`、`completedAt`全部命中。
- GET `/src/financial-reports.js` 200，逐字节与本地一致；SHA256 `a86b2250b4fbe87af052ec71fb7d81cd1540af31141cde80b35aedb2c5b770ef`；标识`transactionDetail`、`dimension2`、`customerProfiles`、`t.at?localDay(t.at):''`全部命中。
- GET `/web/style.css` 200，逐字节与本地一致；SHA256 `53c1ef90cff874216585716df90b968530310366c985f9ddd517e14430365426`；标识`body.invoice-print`全部命中。
- 全部web JS与app直接导入模块合并去重，GET **26/26** 为200；`/server/store.js`为404，不公开后端源码。
- 公网仅GET健康和资产，未登录或写入线上业务。后端依据源码、合成SQLite回归与成功部署重启，未取得主机执行或供应商联调证据；不把前端哈希匹配当作后端运行直接证明。


## 小时库存、离线iCal与前台内部能力续跑（2026-11-11，UTC+8）

基线`96ff297` / `5b40732`、文档`0a7c5a9`；保留并补完三份中断未提交改动。功能提交 **`71e1ec356c8b7b5f8acecf769132927d5239adb5`** 已推送jovian-pms-test并实际部署。Actions [42926522741](https://github.com/Popo841103/codex-pan/actions/runs/42926522741)，job`130214267142`，Verify及Deploy成功；`gh run watch 42926522741 --exit-status --interval 5`退出0。2026-11-10 23:50:24 UTC完成（本地11月11日07:50:24）；Ubuntu Node560/560、Python5/5。发布器备份`update-fkq5IV46`，不代表自动加密。

矩阵114条：**已有79、部分20、缺失0、禁止或需外部接入15**。本批16条提升：**1.1、1.2、3.6、5.5、7.3、7.9、7.16–7.18、7.20、7.22–7.23、7.27、9.11、9.17、9.19**。已有只表示矩阵逐行写明的内部能力，人工到期待办不等于自动调度，内部入住指引不等于身份提交或门锁，持久粘贴iCal不等于联网同步。

| 入口 | 实现及边界 |
|---|---|
| 目录→钟点定义；客户→小时预订；前台工作台→整点库存查询 | 新单整点时间窗、24小时格、相邻复用、共享套房/床位冲突；不跨午夜，24:00仅为结束。旧整日记录保持保护，在住必须人工退房及清洁周转。小时费用保留、过夜房晚不计小时单；日库存同资源去重，到店数按订单。 |
| 统计→运营查询工作台→前台内部工作台→保存粘贴iCal/撤销 | 管理员资源及原因确认生成持久hold，匿名区间不保存ICS/摘要/UID；重复/冲突/跨店/已夜审拒绝，撤销保留原导入，普通或批量开房不能绕过。无抓取/订阅。 |
| 公司目录及前台工作台→公司关联与当前账项 | 公司联系人和已有AR引用沿用；管理员原因绑定/解绑住宿，逐住宿费用/待收待退/押金独列；不互抵、不改原账、不储值或自动挂账。 |
| 设置→房型与房间 / 客户 / 工作台→前台内部工作台；首页摘要 | 管理员版本化门店显示资料/说明/抵达指引、参考时间/欢迎词/人工检查清单、公告、多条可停用快捷回复及人工复制、纯文本打印标题页脚。首页显示本店公告/未完成任务；设置不改房价/营业日/入住权限/既有订单。 |
| 前台工作台→人工待办；住宿详情→计划任务 | 马来西亚到期日/标题/备注/可选住宿/状态追加版本，详情按住宿列出并预选维护。无自动发送、调度、夜审或补跑。 |
| 前台工作台→打印；住宿详情→打印；日历→批量打印 | 工作台及住宿常规/内部登记卡实际预览/打印，批量到店日/资源/状态同筛选，专用CSS；纯读、非税务发票、不提交身份。原账单打印保留。 |

本地Linux Node24 **560/560**（新增26），Python **5/5**；29个DOM脚本加folio两分支 **31/31**，37个runtime JS及6个shell语法、diff检查通过。新Node覆盖双状态、管理员/隔店/幂等、追加版本、小时共享/相邻/重叠/旧记录/夜审、iCal撤销及开房绕过、日库存去重；新DOM操作上述链、三语和切店。打印是window.print桩，无真实打印机或线上业务写入验收。上轮测试期间编辑源码导致模块导出混版及trial-signup超时；冻结后两脚本单独通过，再完整31分支全过，未放松业务busy guard或Ubuntu门禁，Windows私有权限测试未改。

运行逻辑并入7个既有runtime文件，无新runtime模块/依赖、无发布流程改动或数据重置。claims原表/唯一键保留，内部night键改为YYYY-MM-DD@HH；下一次成功业务事务内按完整门店状态重建，整日24槽、小时指定槽，失败回滚。新增v10写入保护，旧runtime只读不代表可写回滚，恢复应使用理解小时槽的runtime；不得删除保护绕过。claims最多24倍，合成测试不代表大体量性能验收。

未操作真实账号/订单/资金/生产数据/门锁；全部Do NOT及跨夜审暂存恢复、AR、押金/关闭保护保留。下一优先：安全日历/单日显示、内部渠道清单、角色矩阵、经理/交班报表剩余维度；公开iCal订阅、已核验汇率、房卡/外部消息不冒充接通。完整复现见pms/verification/desk-completion-audit.md及parity-matrix.md。

### 公网只读GET证据

检查时间：`2026-11-10T23:51:03.401043+00:00`。GET /healthz=200，精确返回`{"ok":true,"service":"jovian-pms","data":"test-only"}`。以下公开资产全部200，与本地逐字节一致，所有标识命中：

| 资产 | SHA256 | 新标识 |
|---|---|---|
| /web/app.js | `80ece4a32c3238392166616bd8dcf33f69447b5d829ebdd8fb7b68ca05caba43` | data-desk-command, data-hour-grid, stayPrintCard |
| /web/workspace-ui.js | `a82eefd07d4c9011f08f5b6b0119a94cb85cdeb9f54c06cb6c4efc061da49379` | deskPanel, data-corporate-stays, data-desk-summary |
| /src/demo-store.js | `1f7cb20a991239771a83522c32c58c8945caefb927b176f51332939bebc895f6` | deskActions, hourlyInventory, hour_slots, deskReplies |
| /src/inventory.js | `c04c9e5f722575ff07eac4b7ef3f28e10efc3ea5204eee4670668861b623b216` | Invalid hourly interval, hour_slots |
| /src/financial-reports.js | `bb3dffe6918681c439324df710e835a5439f8d0508012741f6f37da4614ec080` | occupied:units(active), !occupiesInventory(o)||o.hourly |
| /web/style.css | `b9de8acd4d6a65ac084ea1f578ebda16beaf755612ebaf5aefe56a52ab3ad9b9` | body.desk-print, body.stay-print |

全部web JS及app直接导入模块合并去重GET **26/26** 为200；/server/store.js=404，后端不公开。公网只做GET，未登录线上或写业务；后端依据源码、合成SQLite回归和成功部署重启，不将前端哈希当作后端运行直接证明。结构化证据见pms/verification/desk-live-verification.json。


## 内部显示、来源、权限与交班报表续跑（批次08，2026-11-11）

运行时提交`609de426a32928e708d6039558888e9141c64135`已推送并实际部署。Actions [42942563248](https://github.com/Popo841103/codex-pan/actions/runs/42942563248) Verify/Deploy成功；`gh run watch 42942563248 --exit-status --interval 5`退出0。Linux Node24 **574/574**（新增14），Python **5/5**；30个dom-*.mjs、communications-dom及folio两分支 **33/33**，37份runtime JS/6份shell语法和diff检查通过。最后账项筛选修正后重跑全Node及internal-display/operations-completion DOM通过。已修复新表单选择器与旧工具处理器重合，未削弱业务busy guard或Ubuntu门禁。

矩阵114条现为**已有91、部分8、缺失0、禁止或外部15**。本块12条提升：**1.4、2.1、2.5、3.1、4.12、6.8、6.9、7.14、7.19、7.21、7.24、9.2**。入口：顶栏双日期与本店角色；日历→单日住宿显示；渠道/设置→内部来源和人工定日消息草稿；设置→团队权限→有效动作矩阵；统计→工作台→经理/交班新增四分页；首页/设置→人工夜审只读摘要及历史筛选；网站预订请求→文字/状态过滤。详细范围、复现和保护见`pms/verification/internal-display-audit.md`及矩阵逐行。

只读单日包含离店日，显示当前订单/清洁快照及小时窗，不声称历史状态或额外可售；来源只使用既有ID，管理员原因追加版本，停用禁止新使用，旧单原来源保留。消息仅内部人工草稿/已处理，不发送或后台执行。经理/交班净收与押金独列，营业日选账、马来西亚交易日另列；已完成窗口含起不含止，房晚不凭空分班，旧缺时间/营业日不补猜，房卡未接通。新前台动作在双状态及共享审计保存deskChange；查询不写revision/audit。网站请求历史按当前门店请求归属筛选。

新逻辑并入5份既有运行文件，无新runtime文件/依赖/表，无发布流程变更、数据重置或真实业务操作。v10小时库存、夜审、暂存恢复、AR、押金及账单保护保留。全部Do NOT继续不做，合成DOM不等于真实浏览器或外部验收。

公网只读GET时间`2026-11-11T01:58:21.699721+00:00`：精确`/healthz` 200返回`{"ok":true,"service":"jovian-pms","data":"test-only"}`；全部**26/26**公开web/app直接导入模块200且与本地逐字节一致。新标识`data-source-command`、`staff-context`、`dailyStays`、`internalSourcePanel`、`data-audit-read`、`data-effective-permissions`、`channel_source_save`、`message_draft_save`、`actorSummary`、`handoverWindows`全部命中；`/server/store.js`404，不公开后端。结构证据`pms/verification/internal-display-live.json`；后端依据成功部署及合成SQLite验证，不把前端哈希当直接后端运行证明。公网未登录或写业务。

下一块继续3.4内部Booking Engine状态/准备视图、4.5住宿More保护说明、9.23安全准备入口；3.2倍率、3.3未核验汇率、3.7公开订阅、9.12门锁、9.15外部自助入住仍部分，不冒充接通。
