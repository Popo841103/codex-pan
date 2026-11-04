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
| P4 | 业务补齐：房间分组 / 价计划绑定订单 / 佣金结算中可行的一组 | 待做 |
| P5 | 自助入住收尾：身份资料保存期限与删除流程；`self-checkin.key` 随发布备份 | 待做 |

队列中若发现某项与既有设计冲突或有更高价值的收敛点，按实情调整并在下方留痕。

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
