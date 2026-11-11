# JOVIAN PMS · 验证与发布核验清单

换电脑后按这份清单跑，不要只信「Actions 显示成功」。所有命令在 `pms/` 目录下执行，Node 要求 **24**（用到 `node:sqlite`）。

当前验证基线（2026-11-11）：功能`96ff297`、最终运行时`5b40732`，Node534/534、Python5/5、DOM30/30；Actions42859317901已部署，公网健康/四份JS与CSS哈希/26模块GET核验通过，矩阵63已有/36部分/0缺失/15禁止或外部，详见本文末尾中文节。

## 本地测试

```bash
cd pms
npm test                                                  # 全量 Node 测试
python3 -m unittest discover -s test -p "test_*.py" -v    # 发布包边界测试
bash -n deploy/update-vultr-test.sh
bash -n deploy/ci/setup-server.sh
bash -n deploy/ci/receive-release.sh
```

历史基线（2026-11-04，`4baad16`）：Node **402/402**，Python **5/5**，**18** 个 DOM 脚本，37 个运行时 JS 语法检查，部署 shell `bash -n`。改 `deploy/update-vultr-test.sh` 后必须同步 `deploy/ci/BOOTSTRAP.txt` 内嵌的 base64+gzip 副本与 SHA-256（`test_release_archive.py` 会拦截不同步，否则新服务器会装回旧脚本）；重生成用确定性 gzip：`gzip.compress(data, compresslevel=9, mtime=0)`。

## 可选的 DOM 流程验证

jsdom 需已安装；每个脚本把 `node_modules/jsdom/lib/api.js` 作为第一个参数传入：

```bash
node verification/dom-notifications.mjs node_modules/jsdom/lib/api.js
```

全部 17 个脚本：

```
dom-workflows.mjs  dom-financial.mjs  dom-comparison.mjs  dom-settlement.mjs
dom-rates.mjs  dom-night-audit.mjs  dom-manager-report.mjs  dom-accommodation.mjs
dom-extra-penalty.mjs  dom-occupancy.mjs  dom-team-access.mjs  dom-property-site.mjs
dom-data-cleanup.mjs  dom-booking-requests.mjs  dom-notifications.mjs
dom-empty-property.mjs  dom-trial-signup.mjs  communications-dom.mjs
```

DOM 脚本是**进程内 jsdom + 合成 provider / 合成设备**，不等于真机 Edge、手机扫码、真实门锁或与供应商的联调验收。

## 发布链路

1. `git push origin jovian-pms-test`。
2. 只有 `pms/**` 或工作流文件变化才会触发 Actions（`continuity/`、`docs/`、`handoff/` 的改动不会触发部署）。
3. Actions：Node 测试 → Python 测试 → shell 语法 → 检查部署密钥与主机 → 生成发布包（`extract-release.py`）→ `receive-release.sh` → `update-installed.sh`。
4. **发布包只刷新既有文件**，不安装新增运行时模块；所以新增逻辑必须并进已有文件。
5. 发布会重启服务；备份目录形如 `/var/backups/jovian-pms-test/update-*`。

## 线上核验（从公网能验证的部分）

```bash
curl -s https://pms.jovianhome.com/healthz
# {"ok":true,"service":"jovian-pms","data":"test-only"}

curl -s https://pms.jovianhome.com/web/workspace-ui.js | grep -o "severityUrgent\|noticeCheckinReview" | sort -u
curl -s https://pms.jovianhome.com/web/workspace.css | grep -o "sev-urgent" | head -1
curl -s https://pms.jovianhome.com/web/app.js | grep -o "noticeView==='checkin'"
curl -s -o /dev/null -w "%{http_code}\n" https://pms.jovianhome.com/web/backend.js   # 200

# 019cbe8 条件式升级规则：
curl -s https://pms.jovianhome.com/web/workspace-ui.js | grep -o "notice-rule-form\|noticeRuleTitle\|data-notice-rule-at-least" | sort -u
curl -s https://pms.jovianhome.com/web/app.js | grep -o "notice_rule_save\|noticeRules" | sort -u
curl -s https://pms.jovianhome.com/src/demo-store.js | grep -o "cleanNoticeRules\|escalateSeverity\|noticeRuleKinds" | sort -u

# a7e3b5f 前台一键办理入住：
curl -s https://pms.jovianhome.com/web/checkin-admin-ui.js | grep -o "sc_checkin\|checkinAtDesk\|checkin-at-desk\|checkinDeskReady\|checkinAlready" | sort -u
curl -s https://pms.jovianhome.com/web/workspace.css | grep -o "checkin-desk-action" | sort -u
```

公开站点（无脚本、无会话、`default-src 'none'`）：

```bash
curl -sD - -o /dev/null https://pms.jovianhome.com/sites/<slug> | grep -i content-security-policy
```

`app.js` 里 `import ... from './xxx.js'` 的每个模块都应返回 200，逐个核对。

## 后端只能间接验证

`/server/` 目录不对外提供，公网读不到 `server/store.js` 或 `server/self-checkin.js`。有主机权限时：

```bash
grep -c severityOf /opt/jovian-pms-test/current/server/store.js
grep -c derivedNotifications /opt/jovian-pms-test/current/server/store.js
grep -c rejection_reason /opt/jovian-pms-test/current/server/self-checkin.js
grep -c notice_rules_audit /opt/jovian-pms-test/current/server/store.js
grep -c cleanNoticeRules /opt/jovian-pms-test/current/server/store.js
grep -c checkinFromGrant /opt/jovian-pms-test/current/server/self-checkin.js
grep -c sc_checkin /opt/jovian-pms-test/current/server/self-checkin.js
grep -c commission_save /opt/jovian-pms-test/current/server/store.js
grep -c commissionChange /opt/jovian-pms-test/current/server/store.js
grep -c cash_variance_approve /opt/jovian-pms-test/current/server/store.js
grep -c handoverCash /opt/jovian-pms-test/current/server/store.js
grep -c cashExpectedTotal /opt/jovian-pms-test/current/src/demo-store.js
```

**不要**把「`/api/xxx` 无会话返回 401」当成新后端的证据——所有 `/api/` 路径都这样。`/healthz` 200 至少说明新后端已加载且启动成功（含建表与加列迁移），但不能证明某个函数在运行。

## Windows 已知两项失败（不要削弱）

- `NOBEDS config requires private files and rejects malformed credentials without exposing them`
- `guest encryption keys persist privately and missing keys never silently replace encrypted history`

两项测的都是 POSIX 私有普通文件与权限位语义，Windows 上不适用。Ubuntu CI 全通过即为发布门槛，不要为让 Windows 通过而降低校验。

## 证据等级写法

结论按「实见 / 文档 / 推断 / 未验证」标注：本地测试通过写「本地验证」，公网文件命中写「外部实见」，主机 grep 写「主机佐证」，供应商 / 门锁行为写「未联调」。合成 provider 的成功只能写成「合成测试通过」。

## P6 外部核验清单（2026-11-04，`546e331` / `d9cc9df`）

推送后约 30 秒部署上线（轮询 `web/workspace-ui.js` 出现 `cash_variance_approve`），以下为实见结果：

| 检查 | 结果 | 等级 |
|---|---|---|
| `GET /healthz` | 200 `{"ok":true,"service":"jovian-pms","data":"test-only"}` | 外部实见 |
| `web/workspace-ui.js` | `cashStatus` / `cashCount` / `cashCountNote` / `cashExpected` / `cashVariance` / `cashNotCounted` / `cashBalanced` / `cashPending` / `cashApproved` / `cashApprove` / `cashApproveReason` / `cashApproveConfirm` / `cashApprovedBy` / `cash_count` / `cash_variance_decided` / `handover-cash` / `data-cash-approve` / `cash_variance_approve` 全部命中 | 外部实见 |
| `web/app.js` | `cash_variance_approve` / `countedCash` / `handover-cash` / `data-cash-approve` / `cashApproveConfirm` / `cash_count` 命中 | 外部实见 |
| `src/demo-store.js` | `cashExpectedTotal` / `cashExpectedByMethod` / `cash_variance_approve` / `cash_count` 命中 | 外部实见 |
| `app.js` 的 12 个导入模块 | 全部 200 | 外部实见 |
| `workspace-ui.js` 的 2 个 `src/` 导入 | 全部 200 | 外部实见 |
| `GET /sites/no-such-property` | 404，CSP 仍 `default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'` | 外部实见 |
| `GET /server/store.js`、`/server/self-checkin.js` | 404（后端文件不对外提供） | 外部实见 |
| `roleTypes.admin` 的 `cash_variance_approve` 权限、`handoverCash` 审计字段 | 只能靠发布重启推断 | 推断 |

后端推断的主机佐证命令已加入上面的 grep 清单：`cash_variance_approve`、`handoverCash`（`server/store.js`）与 `cashExpectedTotal`（`src/demo-store.js`）。页面行为由 `verification/dom-night-audit.mjs` 在进程内 HTTP 驱动，不是公网浏览器验收。

## P7/P8 外部核验清单（2026-11-04，`b4754fc`）

推送后轮询 `web/catalog-ui.js` 出现 `newPropertySave` 即视为部署完成，以下为实见结果：

| 检查 | 结果 | 等级 |
|---|---|---|
| `GET /healthz` | 200 `{"ok":true,"service":"jovian-pms","data":"test-only"}` | 外部实见 |
| `web/catalog-ui.js` | `newPropertySave` / `newPropertyNote` / `catalogEmptyNote` / 改写后的 `catalogNote` 命中 | 外部实见 |
| `web/app.js` | `property_create` / `new-property-save` / `const noScope` 命中 | 外部实见 |
| `web/financial-ui.js` | `commissionHistory` / `commissionHistoryNote` 命中 | 外部实见 |
| `/web/*` 全部 14 个模块 | 全部 200 | 外部实见 |
| `GET /sites/no-such-property` | 404，CSP 仍 `default-src 'none'; ... form-action 'self'` | 外部实见 |
| `GET /server/store.js` | 404（后端文件不对外提供） | 外部实见 |
| `property_create` 权限、`noPropertyYet`、`starterInventory` 审计字段 | 只能靠发布重启推断 | 推断 |

主机佐证命令：

```bash
grep -c property_create /opt/jovian-pms-test/current/server/store.js
grep -c starterInventory /opt/jovian-pms-test/current/server/store.js
grep -c noPropertyYet /opt/jovian-pms-test/current/server/store.js
```

页面行为由 `verification/dom-empty-property.mjs` 在进程内 jsdom + 真实 in-process HTTP 驱动：全新安装 → 打开设置 → 页上创建 `COHUB-KL` → 切换门店 → 手填两个房型、一间大床房与一间三床宿舍 → 断言 4 个销售单位与待清洁状态。**不是公网浏览器验收**，也没有在线上新建过真实门店。

## P10 外部核验清单（2026-11-04，`4baad16`）

推送后轮询 `web/app.js` 出现 `signupDone` 即视为部署完成，以下为实见结果：

| 检查 | 结果 | 等级 |
|---|---|---|
| `GET /healthz` | 200 `{"ok":true,"service":"jovian-pms","data":"test-only"}` | 外部实见 |
| `GET /signup` | 200；CSP `default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`；`X-Robots-Tag: noindex`；含 `name="username"` / `name="store"` / `name="company"` 字段；零 `<script>` 标签 | 外部实见 |
| `web/app.js` | `signupDone` / `signupDoneStore` / `window.__pmsUserOrigin` 等命中 | 外部实见 |
| `web/catalog-ui.js` | `__pmsUserOrigin` 命中 | 外部实见 |
| `POST /api/signup` | 403（注册走 `/signup` 表单路由，无 `/api/signup`） | 外部实见 |
| `GET /server/store.js` | 404（后端文件不对外提供） | 外部实见 |
| `Store.signup()`、`origin` 迁移、trial 拒绝、成员继承、500 上限 | 只能靠发布重启推断 | 推断 |

主机佐证命令：

```bash
grep -c "origin='trial'" /opt/jovian-pms-test/current/server/store.js
grep -c signup_closed /opt/jovian-pms-test/current/server/store.js
grep -c renderSignupPage /opt/jovian-pms-test/current/server/http.js
```

页面行为由 `verification/dom-trial-signup.mjs` 在进程内 jsdom + 真实 in-process HTTP 驱动：公开页 → 无脚本表单注册 → 登录 → 空白设置页 → 服务端以 403 拒绝第二家门店。**刻意没有在线上服务真实注册试用账号**——不向共享测试库写入未被要求的账号。

## 第 22 批外部核验清单（2026-11-07，`9a15aed`，门店自定义角色）

```bash
curl -s https://pms.jovianhome.com/healthz
# {"ok":true,"service":"jovian-pms","data":"test-only"}

# 前端：矩阵与命令都应出现
curl -s https://pms.jovianhome.com/web/workspace-ui.js | grep -o "permissionModules\|roleDefinitions\|mod_selfCheckin\|act_commission_save\|role_in_use\|data-role-delete" | sort -u
curl -s https://pms.jovianhome.com/web/app.js | grep -o "role_save\|role_delete\|member_permission_save\|state.roles" | sort -u
curl -s https://pms.jovianhome.com/web/workspace.css | grep -o "perm-matrix\|role-editor" | sort -u
curl -s https://pms.jovianhome.com/web/workspace-ui.js | grep -o "data-perms-form\|memberExtraTitle" | sort -u
curl -s https://pms.jovianhome.com/web/app.js | grep -o "permsForm\|member_permission_save" | sort -u

# 工单 / 消息 / 自助入住按动作判定（旧的角色名判断应已消失）
curl -s https://pms.jovianhome.com/server/support.js 2>/dev/null  # 仍应 404（/server/ 不对外）
curl -s https://pms.jovianhome.com/web/workspace-ui.js | grep -c "act_"   # > 180（63 动作 × 3 语言词条）
```

后端在主机上（部署重启推断，非公网实见）：

```bash
grep -c "role_definitions" /opt/jovian-pms-test/current/server/store.js
grep -c "permissionsFor" /opt/jovian-pms-test/current/server/store.js
grep -c "member_permissions" /opt/jovian-pms-test/current/server/store.js
grep -c "permissionsFor(actor" /opt/jovian-pms-test/current/server/support.js
```

未做且刻意不做：没有在线上真实创建自定义角色或改动任何线上账号的权限——线上是共享测试库，核验只读前端资产与 `/healthz`；角色机制由 408 条 Node 测试与 19 条 DOM 流程在进程内真实验证。


### 子账单核验

运行 `node verification/dom-folio-split.mjs node_modules/jsdom/lib/api.js`，覆盖拆账、押金退回、分账收款、逐账结账和冲销。部署后验证 `curl -fsS https://pms.jovianhome.com/healthz`，以及 `curl -fsS https://pms.jovianhome.com/web/app.js | grep splitBillPanel`。后端主机使用 `grep -n billEvent /opt/jovian-pms-test/current/server/store.js` 佐证。

### AR 应收核验

运行 `node --test test/ar-ledger.test.js` 及 `node verification/dom-ar-ledger.mjs node_modules/jsdom/lib/api.js`。部署后检查 `curl -fsS https://pms.jovianhome.com/healthz`、`curl -fsS https://pms.jovianhome.com/web/financial-ui.js | grep arLedgerPage`。主机佐证 `grep -n arEventId /opt/jovian-pms-test/current/server/store.js` 与 `grep -n changeReceivables /opt/jovian-pms-test/current/src/demo-store.js`。

### AR 八张报表

运行 `node --test test/ar-reports.test.js` 和 `node verification/dom-ar-ledger.mjs node_modules/jsdom/lib/api.js`。公网核验 `curl -fsS https://pms.jovianhome.com/healthz`、`curl -fsS https://pms.jovianhome.com/web/financial-ui.js | grep arReportsPage` 和 `curl -fsS https://pms.jovianhome.com/src/financial-reports.js | grep receivableReports`。本批未修改 server/store.js，底账部署可在主机 `grep -n arEventId /opt/jovian-pms-test/current/server/store.js` 佐证。

### AR 月结快照

运行 `node --test test/ar-ledger.test.js test/ar-reports.test.js test/role-permissions.test.js` 与 `node verification/dom-ar-ledger.mjs node_modules/jsdom/lib/api.js`。部署后核验 `curl -fsS https://pms.jovianhome.com/healthz`、公开 `web/financial-ui.js` 的 `arPeriodPanel` 及公开 `src/demo-store.js` 的 `closeReceivableMonth`。主机佐证 `grep -n ar_close_month /opt/jovian-pms-test/current/server/store.js`。

### AR 独立调账

运行 `node --test test/ar-ledger.test.js test/ar-reports.test.js test/role-permissions.test.js` 和 `node verification/dom-ar-ledger.mjs node_modules/jsdom/lib/api.js`。公网核验 `/healthz`、`/web/financial-ui.js` 的 `arAdjustConfirm`、`/src/demo-store.js` 的 `ar_undo_adjust`。后端主机佐证 `grep -n ar_undo_adjust /opt/jovian-pms-test/current/server/store.js`。

### 渠道佣金月结

运行 `node --test test/commission-period.test.js test/role-permissions.test.js` 与 `node verification/dom-commission-period.mjs node_modules/jsdom/lib/api.js`。公网检查 `/healthz`、`/web/financial-ui.js` 的 `commissionPeriodPanel` 以及 `/src/demo-store.js` 的 `closeCommissionMonth`。主机佐证 `grep -n commission_close_month /opt/jovian-pms-test/current/server/store.js`。

### 按消费明细拆账

在 `pms` 执行 `node --test test/folio-split.test.js`。将 jsdom 路径传给 `node verification/dom-folio-split.mjs node_modules/jsdom/lib/api.js --lines`，另执行不带 `--lines` 的原手填流程。发布后检查 `/healthz` 和 `/web/app.js` 的 `split-lines-form`。主机检查 `grep -n folioSplitLines /opt/jovian-pms-test/current/src/demo-store.js` 和 `grep -n settle_split /opt/jovian-pms-test/current/server/store.js`。

### 主订单批量结账

在 `pms` 运行 `node --test test/reservation-settlement.test.js test/role-permissions.test.js` 和 `node verification/dom-reservation-settlement.mjs node_modules/jsdom/lib/api.js`。发布后核对 `/healthz` 和 `/web/app.js` 的 `settle-reservation`。主机检查 `grep -n settle_reservation /opt/jovian-pms-test/current/server/store.js`。

### 主订单合并收款

沿用主订单批量结账测试及 DOM 脚本，先登记一笔合并收款，再核验两个账页的分配流水和批次号。线上检查 `/web/app.js` 的 `reservation-payment`，主机检查 `grep -n payment_reservation /opt/jovian-pms-test/current/server/store.js`。

### 月结更正

运行 `node --test test/ar-ledger.test.js test/commission-period.test.js`，以及 `verification/dom-ar-ledger.mjs` 和 `verification/dom-commission-period.mjs`（传入 jsdom 路径）。合成测试覆盖原快照不变、已关闭日期拒绝、后续期末纳入差额及财务权限。发布后查 Actions 成功状态、公开 `/healthz` 和 `/web/financial-ui.js` 的 `data-ar-correction`。DOM 是合成数据验收，实际门店页面交互另验。

本机 Windows Node 424 项中 422 通过，余两项为既有私有文件权限用例；Python 5/5，AR 与佣金 DOM 均通过。

Actions 42754425077 成功，Linux Node 424/424、Python 5/5。外部实见 `/healthz` 返回测试站健康，`/web/financial-ui.js` 命中 `data-ar-correction` 和 `data-commission-correct`。已登录门店实际交互未验收。

### 改期与续住计价

合成测试覆盖缩短、平移、续住同时改价、已夜审晚保护及应付与逐夜入账明细一致。运行 `node --test test/reservations.test.js test/business-day.test.js` 和 `node verification/dom-folio-split.mjs <jsdom> --amend`。发布后检查 `/healthz`、`/web/app.js` 的 `data-amend-pricing`、`/web/financial-ui.js` 的 `data-movement-charge`。NOBEDS、支付和 TTHotel 仍未配置。

Windows Node 423/425，通过的范围包括本批；其余为两项既有权限测试。Python 5/5，改期续住 DOM 通过。

Actions 42757051292 成功，Linux Node 425/425、Python 5/5。公网健康检查和两个页面标识实见通过。测试覆盖合成数据，未在真实门店执行改期。

### 班次、夜审及金额核对

合成回归覆盖暂存库存与费用、保留收款、结账时恢复库存、交班跨时区时间边界、现金和非现金区分、按来源的账页转移余额核对。发布后检查公开健康端点、workspace-ui.js 的 data-night-audit-settings 与 data-night-audit-workbench，以及 financial-ui.js 的 data-financial-basis、data-movement-charge。

本机 Windows Node 425/427，只有两项既有私有文件权限测试失败。Python 5/5。夜审、财务、主订单收付、AR 和佣金月结 DOM 均通过。

运行时 `ad48dbb` 已部署到测试站。Actions 42789084376 成功，Linux Node 427/427、Python 5/5。公网健康检查、夜审与班次入口、交易与营业报表标识均已核验。交互验证使用合成数据。

### 夜审工作台与按人员交班

合成测试覆盖处理全部、自动调用不能跳过必处理异常、逐人交班和原现金口径。DOM 通过设置切换、批量处理、交班与差额审批。部署后检查健康端点和 workspace-ui.js 的 night-audit-handle-all、handover-mode、data-night-audit-settings。

Windows Node 427/429，余两项为已知私有文件权限用例。Python 5/5，夜审工作台 DOM 通过。

运行时 `0ccc249` 已部署测试站。Actions 42792436206 成功，Linux Node 429/429、Python 5/5。公网健康检查和夜审工作台、设置、处理全部及交班方式标识已核对。实际交互使用本地合成订单验证。

### 预订引擎设置预览

合成 `verification/dom-booking-engine.mjs` 通过，覆盖四张卡片、空状态、划线价状态、四个只读核验字段和房型房价维护跳转，页面操作不改变门店版本。Windows Node 427/429，余两项为既有私有文件权限失败。Python 5/5。公网验收检查 `/healthz` 与 `/web/workspace-ui.js` 的 `data-booking-engine-setup`。

运行时 `4d383b8` 已部署测试站。Actions 42793514069 成功，Linux Node 429/429、Python 5/5。公网健康端点、预订引擎、划线价与核验预览标识实见通过。交互验证使用合成数据。

## 暂存箱与住宿状态保护验证（2026-11-10）

- Windows Node 24：`cd pms` 后 `node --test`，431/433，通过本批新增 4 项，另 2 项为既有 Windows 私有文件权限失败；未改权限测试。Python `python -m unittest discover -s test -p test_*.py`，5/5。
- 合成 DOM：`node pms/verification/dom-workflows.mjs <jsdom/lib/api.js 的绝对路径>`，通过暂存当前/历史、搜索、打开取消表单、批量移出、锁房开关、拖动换房。服务端合成用例覆盖夜审边界、取消时间跨马来西亚午夜、已有取消费拦截和库存冲突。
- 公网复核仅检查健康及静态标识；不对真实订单、资金或门锁执行操作。后端源文件不对外；后端依据源码、合成测试及 Actions 判定。

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

## 内部运营 A1–A9 验证与发布（2026-11-10）

运行时 `40df39059a0e0de2ce056bd7fcb31a04cac49b81`，基线 `c57d73f` + 文档 `f0f12c1`。使用 `gh run watch 42836859905 --exit-status --interval 5` 等待成功，Actions [42836859905](https://github.com/Popo841103/codex-pan/actions/runs/42836859905)、job `129901265793`：Verify PMS 与 Deploy 均成功，2026-11-10 14:43:21 UTC 完成。Ubuntu Node **449/449**、Python **5/5**；发布日志备份路径 `/var/backups/jovian-pms-test/update-8Fpq4WBO`，该路径只是发布流程原有备份，**不代表已自动加密**。

本地 Linux Node24全套449/449，新增10项；Python5/5；25个DOM脚本及folio `--lines`/`--amend`共27/27；37个runtime JS语法、CI三个部署shell语法、`git diff --check`通过。未改工作流、未弱化Ubuntu门禁，Windows既有私有权限测试规则原样保留。

| 项 | 入口与合成验证 | 公网及证据等级 |
|---|---|---|
| A1 | 设置→提醒；班次/账号规则、发出/查询/本人撤回、指定接收人、已读/铃铛、日期报表。Node验证当前马来西亚班次而非营业日匹配、只升不降、最新同作用域配置、其他人员/其他门店拒绝、原文不变及追加撤回。DOM验证发出/搜索/撤回/账号规则/报表。 | workspace-ui.js与demo-store.js新标识GET实见；业务交互为内存SQLite+合成账号，不是线上发通知。SMS/email/push未连接。 |
| A2 | 统计→佣金明细→默认费率/预期差额。费率生效日期与历史、四舍五入到分、首次账页应付基数快照、后改费率不重算、缺费率空值、管理员与门店隔离。DOM维护费率及历史通过。 | `commission_rate_save`、`expectedCommission` GET实见；无OTA账单导入或银行链接，预期不代表平台合同结算。 |
| A3 | 原佣金月结入口，勾确认后再次确认月份；账户管理员校验；月结快照保留预期及原营业日、关闭只读、当期更正；既有AR/夜审保护回归。`dom-commission-period.mjs`通过。 | 公开reducer标识实见；服务器权限/冻结依据源码、合成服务测试和成功发布，未线上修改账单。 |
| A4 | 设置→房型与房间→公开链接预览/逐行核对确认→可编辑房型草稿。DOM用本地fixture经真实HTTP，预览及未勾确认不写、失败行不导入、管理员逐行确认后仅存草稿。Node验证OG/JSON-LD缺字段、robots拒绝、私网与IPv6拒绝、权限及隔离。 | `data-listing-preview`、`data-listing-confirm`、`sourceSnapshot` GET实见；没有真实平台抓取。robots不可读/跳转/登录/受限页失败关闭，未验证照片下载。草稿不自动建库存或发布，实际房型/房间由现有编辑器人工维护。 |
| A5 | 门店网页或资源页→照片顺序/封面及三语描述，前后快照；公开站点查询结果显示。DOM实际GET合成站点、验证HTTPS图片CSP/封面/描述、填写无脚本多房型表单并记录一份请求；Node验证人工接受生成所有房型住宿、无部分订单和原字段兼容。 | frontend内容维护GET实见；公开HTML交互为本地合成站点，未在线上发布门店、提交请求或注册账号。无支付/自动确认。 |
| A6 | 离线 `server/self-checkin.js backup-seal/backup-rotate/backup-restore`；Node实际SQLite一致性backup、AES-GCM目录密封、根密钥/epoch轮换、新包恢复、旧包以原密钥CLI恢复、原guest key解密合成记录，错误密钥/篡改拒绝、恢复不覆盖运行库。 | **本地合成恢复演练通过**，不是主机恢复；server文件不公开。运行时工具随发布重启推断已部署，未获取主机执行佐证；发布器不调用它，现存线上备份没有自动加密。保留旧根密钥及纳入主机离线运维仍未做，按要求未改工作流。 |
| A7 | 日历底部→当前区间住宿查询与搜索；住宿详情底部→整单住宿及已有日志；DOM断言只读不增revision。旧前台工具/显示设置全套回归。 | 两个query标识GET实见。指定共享隐藏入口第9节在克隆中未找到，仓库现有研究第9节是自动化；未知条目保持未核验，不声称完整隐藏入口清单通过。 |
| A8 | 佣金/提醒页营业日范围报表及CSV；按渠道汇总账单/更正/预期/实际/差额/无费率数，提醒发出撤回明细；缺营业日原账单与更正单独计数，不拿自然日或月份首日补日期。DOM实际导出CSV，表格/筛选范围和BOM/转义/公式前缀防护已检查。 | `operationsReports`、`data-report-csv`、`unallocatedCorrections` GET实见；合成报表验收，不是银行/OTA核账。 |
| A9 | 全套测试、DOM、push、gh run watch、发布后GET；双状态机逐命令比对原订单与资金保留，新增设置账户管理员专属。 | Actions成功+以下只读GET实见；后端行为不冒充公网浏览器业务验收。 |

### 发布后的只读 GET（不是 HEAD）

- `GET https://pms.jovianhome.com/healthz`：200，`{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- `GET /web/app.js`：200，本地SHA256完全一致，`data-listing-confirm`、`data-reservation-history-query`、`data-calendar-range-results`、`data-report-csv`、`operationsReports`、`unallocatedCorrections`全部命中。
- `GET /web/workspace-ui.js`：200，本地SHA256完全一致，`internalOperationsPanel`、`notice_scope_save`、`commission_rate_save`、`data-listing-preview`、`booking_content_save`、`data-calendar-range-query`全部命中。
- `GET /src/demo-store.js`：200，本地SHA256完全一致，`batchActions`、`scopedReminder`、`reminderForAccount`、`expectedCommission`、`operationsReports`、`sourceSnapshot`、`unallocatedCorrections`全部命中。
- 全17个web JS、app.js的21个不重复直接导入模块均GET200。
- `GET /server/store.js`、`GET /server/self-checkin.js`均404，后端文件继续不公开。
- `GET /sites/no-such-property`：404；CSP仍为 `default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`。真实存在的发布站点增加HTTPS图片许可仅在本地合成HTTP检查，未修改线上站点内容。

复现命令见 `pms/verification/internal-operations-audit.md`。新增 `test/internal-operations.test.js` 与 `verification/dom-internal-operations.mjs` 只使用合成数据/本地fixture。没有线上账号/真实订单/资金/门锁写操作，没有数据重置；SmartOrder未做任何写入。

### 明确未做

外部短信/邮件/push、OTA结算导入/银行对账、真实锁/身份/支付/NOBEDS/TTHotel；发布器自动备份加密与主机真实恢复演练（已具备离线工具，未改流程）；未知共享隐藏入口清单逐项验收；网页草稿自动转销售库存/自动发布。全部Do NOT项继续不做，尤其Calendar Overview/Reserve/Combined Room/Share、自动夜审/00:00交班/跨午夜截账/补跑、历史批量处理、自动重报价/移附加费、Booking Engine Configure内部、税费/跟踪代码/倍率/身份提交与锁操作。跨夜审暂存恢复、AR保护保留。



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

### 发布后只读GET与证据等级

- GET `/healthz` 200，精确返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- GET `/web/app.js`、`/web/workspace-ui.js`、`/src/demo-store.js`、`/src/financial-reports.js` 均200，四份文件与本地逐字节/SHA256一致。新标识分别包括 `runParityQuery` / `data-internal-invoice`，`parityWorkspacePage` / `directoryPanel`，`changeDirectory` / `memoHistory`，`parityReport` / `occupancyIcal` / `previewIcal` / `ical_unresolved`。
- 全部web JS及app.js直接导入模块合并去重的GET检查全部200；`/server/store.js`仍404，不公开后端源码。
- 上述交互验收为本地真实HTTP + jsdom + 合成账号/内存SQLite；公网只有GET资产核验，未登录线上写业务数据。后端部署行为依赖源码、合成服务测试和成功发布重启推断，未取得主机执行或供应商联调证据。


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

### 本批发布后只读GET证据

检查时间：`2026-11-10T16:34:17.820762+00:00`。

- GET `/healthz`：200，精确返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`。
- GET `/web/app.js`：200，本地逐字节及SHA256一致（`81a3a728e4d1cd6b50d6ad9cb371bd8bf7cbca116e3340332785342e8d3b2d9d`）；标识 `data-operations-command`, `updateInspectionItems`全部命中。
- GET `/web/workspace-ui.js`：200，本地逐字节及SHA256一致（`6fed3a9fe5f2a0c6acfc6880e28a9632bb04eb098dce7644d3e3843a7788a9b5`）；标识 `data-operations-panel`, `data-holiday-calendar`, `data-inspection-item`全部命中。
- GET `/src/demo-store.js`：200，本地逐字节及SHA256一致（`3e6d01962a30c3d72d930d97eb6be630ae20921cae619c1f42ae2718cd5c3022`）；标识 `operationsActions`, `mealEntitlements`, `housekeepingTasks`, `postingBusinessDate`全部命中。
- GET `/src/financial-reports.js`：200，本地逐字节及SHA256一致（`9d6abc789edbba235e95dc7bf0c3467898e235bcc99fa87548be75744416282e`）；标识 `mealRedemption`, `guestBalances`, `monthAmount`, `q.layout==='matrix'`全部命中。
- 所有web JS与app.js直接导入模块合并去重26个，GET **26/26** 为200；GET `/server/store.js` 为404，后端仍不公开。
- 公网验收仅健康和资产GET，未登录线上、发通知、提交预订、核销餐食或修改任何业务。后端功能依据源码、内存SQLite合成测试及成功部署重启，未冒充主机执行或真实供应商联调。


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


## 内部Booking Engine准备与住宿More最终续跑（批次09，2026-11-11）

已在同一轮继续处理剩余8条中的安全内部范围，完成**3.4、4.5、9.23**。运行时提交`39e3a70266fa27b2a8efb1c1cfd29a43b554fa59`已推送jovian-pms-test；Actions [42948038133](https://github.com/Popo841103/codex-pan/actions/runs/42948038133) **Verify/Deploy成功**，`gh run watch 42948038133 --exit-status --interval 5`退出0。前块`609de42`及文档`368f8a2`分别Actions42942563248、42942775579也成功，没有回退已上线内容。

矩阵114条最终**已有94、部分5、缺失0、禁止或外部15**。相对42e9a1e累计15条由部分提升：**1.4、2.1、2.5、3.1、3.4、4.5、4.12、6.8、6.9、7.14、7.19、7.21、7.24、9.2、9.23**。前12条入口及证据见批次08；本块入口：

| 行 | 入口与完成范围 |
|---|---|
| 3.4 | 渠道→内部网站预订准备检查：实际保存网站记录/草稿发布状态、9格三语标题描述联系文字有无、当前房型/计划/草稿数量、四类人工请求状态；本店选定房型/计划31日以内已保存价格覆盖，零价/关价/缺价区分。不是供应商接通、连续入住报价或实时可售。 |
| 4.5 | 住宿详情→More操作前核对：资源/分房锁（非门锁）、暂存、账单关闭、拆账/AR/转账记录数、最近夜审；待收/待退/押金分列，跳转原住宿修改/账项/日志/来源标签。快照不保证动作可执行，服务端及既有夜审/余额/共享库存/原因保护保留。 |
| 9.23 | 设置→Booking Engine安全页→内部准备四步：资源→房价→内部网站草稿→人工请求；只导航和检查，不自动保存/发布/接受请求，不进入供应商Configure，不编辑税费/倍率/跟踪代码或提交身份。 |

本地及Ubuntu Node24 **586/586**（本块新增12；本轮累计新增26），Python **5/5**；31个dom-*.mjs、communications-dom及folio两分支共 **34/34**。完整DOM首轮33通过，旧booking-engine“页面没有表单”断言需适配新增只读查询：改为只允许该一张表单，实际提交后确认revision仍0，重跑通过；未修改运行时来规避测试，未弱化Ubuntu门禁。37个runtime JS、6个shell语法及diff检查通过。新DOM通过本地HTTP/内存SQLite检查保存草稿、9格语言、价格覆盖/坏范围、四步导航、渠道入口、More标签跳转及隔店，最终revision/audit/orders不变；不是实际浏览器、供应商或线上业务写入验收。

运行逻辑只并入3份既有文件，无新runtime模块/依赖/表、无部署流程变更。本块只读，不增加状态机写规则；本地/共享读结构一致。整轮均未重置数据库、修改真实账号/客账/订单/资金/门锁，v10小时库存及跨已夜审日期暂存恢复/AR/账单关闭/押金保护不变。全部Do NOT继续不做。详细复现见`pms/verification/booking-preparation-audit.md`。

### 最终运行时公网只读GET

时间`2026-11-11T02:52:24.781801+00:00`：精确GET `/healthz` 200，返回`{"ok":true,"service":"jovian-pms","data":"test-only"}`。全部**26/26**公开web模块及app直接导入模块200、与本地逐字节一致；`/server/store.js`404，不公开源码。新标识`data-preparation-query`、`stayMorePanel`、`bookingPreparationPanel`、`data-preparation-coverage`、`data-stay-more-review`、`data-preparation-steps`、`bookingPreparation`、`pricedDays`、`missingDays`、`textChecks`全部命中；前块来源/草稿标识保留。结构化状态及SHA256见`pms/verification/booking-preparation-live.json`。公网只GET，未登录或写业务；前端哈希不是后端运行直接证据，后端依据成功部署和合成SQLite验证。

### 剩余5项及下一优先

**3.2**划线倍率禁止编辑；**3.3**没有已核验汇率源，不虚构MYR换算；**3.7**匿名ICS文件已能导出，但公开订阅URL/外部服务及可见性撤销策略未实现；**9.12**无已验门锁供应商/硬件，不购买/开锁/生成发送密码；**9.15**不生成发送代码或提交身份，内部指引不能冒充外部自助入住。均保留部分，不为凑总数转为已有或从矩阵删除。

当前授权边界内不继续实施上述外部/禁止能力。下一优先是内部显示与报表真实使用反馈、小时claims规模性能验收、持续回归既有夜审/AR/暂存保护；外部依赖在另行明确授权和核验条件后再评估。


## Batch 09 real-browser Origin fix — 2026-11-11

Corrected shared Referrer-Policy to same-origin and overriding recovery/self-checkin meta policies; strict Origin, cross-site and staff CSRF checks remain. Earlier verification missed native Chromium Origin:null because Node/curl supplied synthetic Origin headers. Real local Chromium156 reproduced the old 403 and passed native signup/request/lookup/withdraw plus JSON POST from three document contexts on isolated memory SQLite. Node24 587/587, Python5/5; full endpoint/form audit and commands: `pms/verification/browser-origin-audit.md`. No runtime files added, no business state-machine changes, workflow/data/accounts untouched; live deployment confirmation pending. Parity stays94/5/0/15.


### Batch 09 verified deployment and optional flow completion

Fix `6a94889` deployed: Actions [42949881584](https://github.com/Popo841103/codex-pan/actions/runs/42949881584) Verify and actual Deploy steps succeeded. Curl health exact test-only JSON with Referrer-Policy same-origin; signup/staff/recovery/checkin/error/private-path headers checked, changed recovery and `/checkin/` HTML byte-identical. Self-checkin public route is `/checkin/`; corrected verification scripts to use this route and assert pages load200, then reran real Chromium156 successfully. Public checks are GET-only. Evidence `pms/verification/browser-origin-live.json`.

Optional local HTTP end-to-end test added: signup→room type/three rooms→overnight reservation/check-in/payment→MYR50 extra→room move→balance payment/checkout; two-hour MYR15 stay also checked in/paid/out; shift handover. HTTP state through existing reports reconciles MYR165 folios/revenue/cash-day receipts/shift, zero due/deposit, released dirty rooms. Business date and Malaysia cash date are deliberately distinct. No runtime inconsistency found. Final Node24 **588/588**, Python **5/5**, all DOM **34/34**, real Chromium **8 POSTs** (old null-origin rejection then seven real-origin successes). Details and reproducible commands in browser-origin-audit.md. Both state machines unchanged; no reset, real business operation, new runtime file/dependency or workflow change. Follow-up test/docs push must be checked via its own Actions run.


### Batch 09 final release confirmed

Follow-up `eaf290145bdf86dd7b78cacf8fc219dad17ecdfc` pushed and deployed successfully: Actions [42950246388](https://github.com/Popo841103/codex-pan/actions/runs/42950246388), including Verify PMS and actual Deploy steps (watch exit0). Final local Node588/588, Python5/5, DOM34/34, Chromium native forms/JSON verified; runtime JS and deployment shell syntax passed. After this deployment curl again returned exact /healthz test-only JSON, HTTP200 and Referrer-Policy:same-origin; /signup HTTP200 with same-origin. No live POST/login or business writes performed. Full form/endpoint audit, earlier synthetic-header blind spot and local-only business flow are documented in `pms/verification/browser-origin-audit.md`. Final documentation commit changes only root continuity/handoff files and does not trigger the pms deployment workflow.

## Batch 10 / pink local acceptance — 2026-11-11

Local Node24 599/599, Python5/5; syntax/diff pass. 32 DOM scripts + communications + folio --lines/--amend =35 scenarios. Full loop's large dom-workflows hit the original35-second cap; isolated retry and requested timeout300 both exited0. Desk/folio reruns pass. Real local Chromium verifies clickable navigation, computed pink/hover/white/selected colors, monogram/theme and desktop/mobile screenshots. Contrast and no-old-blue regression tests pass. Extended HTTP flow reconciles MYR365 and zero final claims; A–K details and conservative H limits are in `pms/verification/batch10-front-desk-audit.md`. Final deployment IDs/GET hashes are recorded after the push below; public frontend equality is not direct proof of private server code.

## Batch 11 retest leftovers — 2026-11-11

Final runtime `107bb64` deployed successfully: [Actions42980444862](https://github.com/Popo841103/codex-pan/actions/runs/42980444862), Ubuntu Node24 **602/602**, Python **5/5**. Full isolated DOM **35/35** plus affected presentation reruns; 37 JS/4 shell syntax and whitespace checks pass. A: shift/invoice MYR + guest/room/type names. B: historical-undated label and inspectable detail, four legacy receipts stay four after a new attributed MYR105 receipt; no date backfill. The user's exact private live four are consistent with legacy history but were not individually inspected. C: documented inventory-only iCal holds retain SUMMARY as visible block label; no guest/OTA mapping invented. D: remaining commission/corporate/AR/directory/daily-stay UI and staff CSV use MYR/names; quick-entry accepts MYR. Control/API/storage IDs and cents preserved.

Full store instructions, commit list, regression/failure corrections and evidence limits: [BATCH11-RETEST.md](BATCH11-RETEST.md); public hashes: [BATCH11-LIVE.json](BATCH11-LIVE.json). Exact health test-only JSON; all30 JS dependencies plus CSS/index32/32 match final runtime, private /server/store.js404. No new runtime files, state-machine write rules, database reset, workflow/palette change, real business operations or prohibited features. Public GET only; not a new live financial acceptance or direct proof of private server execution.


## Batch 12 — official company branding (2026-11-11)

Official supplied JOVIAN HOME artwork replaces the round J monogram and generated PWA placeholders. Emblem in compact header/icons/favicon; full artwork in login/header lockup/offline/recovery/checkin/signup/public property pages. Original JPG unchanged, black artwork preserved, rose #d6336c unchanged. Existing server embeds the full derivative for publisher compatibility; new web/logo.png is an asset, no new runtime module. Both state machines/business rules/data/accounts/workflow unchanged.

Runtime `7078d0d`, [Actions42981520724](https://github.com/Popo841103/codex-pan/actions/runs/42981520724) Verify/Deploy success. Local Node24 603/603, Python5/5; Chromium isolated local branding acceptance and read-only live header/login/icon/favicon/offline checks passed. Four PNGs and seven other public assets byte-identical; exact test-only health; private server404. No live login or POST. Reproduction, crops, publisher details and limits: BATCH12-LOGO.md; structured live hashes: BATCH12-LIVE.json.


## 批次13 — 品牌配色改为深青绿色（2026-11-11）

运行时提交 `1464f5a7b8bb80b7be76735e30ecb748e4d49dd4` 已推送 `jovian-pms-test`；[Actions 42988351010](https://github.com/Popo841103/codex-pan/actions/runs/42988351010) 的 **Verify PMS / Deploy existing PMS test service 均成功**，Ubuntu Node24 **605/605**、Python **5/5**。

共享 `pms/web/style.css :root` 使用业主指定的12项深青绿色 token：primary `#0f766e`、hover `#115e59`、link `#0b5f58`、tint `#ccfbf1`、soft `#f0fdfa`、selected `#99f6e4`、focus/ink `#134e4a`、border `#b6e3de`、muted `#4d6b67`、canvas `#f4fbfa`、shadow `#134e4a26`。主题元数据、manifest、离线页及现有浏览器验收同步；离线缓存升至v3，保留只缓存公开离线页的规则。日历悬停/选中使用深青文字，避免浅青底白色勾号。官方黑色星球及JOVIAN HOME字标、原图和所有Logo资产未改动。

本地 Node24 **605/605**、Python **5/5**，32个dom脚本、communications及folio的lines/amend两分支共 **35/35**；37份运行时JS语法、3份CI shell语法和diff检查通过。真实本地Chromium验证主按钮/悬停/白字、选中导航、日历悬停文字、官方Logo、主题及桌面/手机截图；只用内存合成SQLite。AA对比度断言通过，旧蓝色扫描明确允许本次青绿色，但继续禁止SmartOrder蓝色范围；新增精确12项token和旧品牌色清除断言。产品UI、主题、server/src、测试及当前浏览器验收grep无指定旧色命中；旧批次文档保留历史记录。

公网只读GET证据见根目录 `BATCH13-LIVE.json`：精确 `/healthz` 200返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`；40份公开资源（含两份CSS、29份JS、主题/HTML与四份Logo PNG）200且与本地逐字节一致，CSS包含全部12项深青token、无旧品牌色。自助入住使用真实公开路由 `/checkin/`。真实公网Chromium未登录验证按钮 `rgb(15, 118, 110)`、悬停 `rgb(17, 94, 89)`、白字、主题、Logo解码及断网离线Logo；favicon和四份PNG字节一致。`/server/store.js`404，未把前端哈希当作私有后端执行证明。

本批仅品牌展示与验收调整，无新运行时文件、状态机/业务逻辑/数据库/账号/部署工作流变更，无真实订单、资金、生产数据、门锁操作。双状态机均未修改，营业日与马来西亚自然日、跨已夜审日期暂存恢复及AR保护原样保留；全部Do NOT事项继续不做。后续文档提交仅根目录与continuity，不触发部署。

公网GET核验时间：`2026-11-11T08:38:03.282084+00:00`；浏览器配色核验：`2026-11-11T08:37:22.209Z`。


## 批次14 — 缩小员工首页页头字标（2026-11-11）

运行时提交 `f5e8e018eb0cee3000921d6dd15175967dc5bbbf` 已推送 `jovian-pms-test`；[Actions 42988977809](https://github.com/Popo841103/codex-pan/actions/runs/42988977809) **Verify PMS / Deploy existing PMS test service 均成功**。本地及Ubuntu Node24 **605/605**、Python **5/5**，`git diff --check`通过；没有旧92×64尺寸测试需要更新，既有官方Logo浏览器验收继续检查 `.header-wordmark` 来源为 `logo.png`。

唯一运行时变更为既有 `pms/web/workspace.css` 的 `.header-wordmark`：移除强制92×64及尺寸/零padding的 `!important`，默认 `width:auto;height:40px;max-height:40px;object-fit:contain;align-self:center`；保留白底、左边框与响应式左padding。实际后段 `min-width:761px` 桌面规则使用56px页头，因此在该规则内限制为32px；既有 `max-width:1200px` 隐藏规则保留。左侧徽标、登录Logo 240px、所有官方黑色Logo资产及批次13深青token均未修改。

公网只读GET证据 `BATCH14-LIVE.json`：`2026-11-11T08:41:58.242340+00:00`，`/healthz` HTTP200精确返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`；`/web/workspace.css` GET200、SHA256 `89c059cb89cb4b53cb2dd3c5b9d5fbe36b219b633bfdc8e0c2b39b8bab42a927` 与本地一致，无旧强制64px字标高度。style.css、index.html、logo.png、icon-512.png也GET200且逐字节一致。真实公网Chromium未登录检查1920/1440/1201宽：字标32px、页头56px、顶部10.5px/底部13.5px留白；1200/760/390宽均隐藏。登录Logo仍240px，官方Logo来源/解码、四份PNG、favicon及离线Logo既有浏览器验收通过。先前本地CSS拦截预验与最终实际线上CSS验证明确区分，证据中的 `localCss:false` 为最终线上结果。

无新运行时文件、业务逻辑、状态机、数据库、账号或部署工作流变更；未登录线上、POST、操作真实订单/资金/生产数据/门锁。跨已夜审日期暂存恢复及AR保护保持；全部Do NOT事项继续不做。本批仅CSS尺寸修改，未重复全套业务DOM；不把公开资源一致当作私有后端执行证明。后续交接/证据提交仅根目录与continuity，不触发部署。


## 批次15 — 护眼鼠尾草绿品牌配色（2026-11-11）

运行时提交 `10c96959c9b2f8706e640ceac4a5823ecb5bb124` 已推送 `jovian-pms-test`；[Actions 42989819984](https://github.com/Popo841103/codex-pan/actions/runs/42989819984) **Verify PMS / Deploy existing PMS test service 均成功**，本地及Ubuntu Node24 **605/605**、Python **5/5**。三个CI部署shell语法、diff检查通过，未放宽Ubuntu门禁。

共享 `pms/web/style.css :root` 改为指定的低饱和苔绿/鼠尾草绿12项token：primary `#3f6a58`、hover `#335648`、link `#335c4c`、tint `#d7e6db`、soft `#f5f8f4`、selected `#c4dbd0`、focus `#2c4a3e`、border `#c5d6ce`、ink `#243830`、muted `#52685f`、canvas `#eef4ea`、shadow `#24383026`。按钮为柔和绿色，画布为浅绿纸色；HTML主题、manifest、离线页及既有浏览器验收同步，公开离线页缓存升至v4，缓存范围规则不变。AA按钮白字、链接、选中项和辅助文字对比度断言通过；旧蓝色范围与已退役品牌色断言保留并扩展。产品web/server/src、测试和当前配色浏览器脚本grep无指定旧青/玫红色字面值；历史批次记录保留。

本地真实Chromium仅用内存合成SQLite，验证主按钮/悬停/白字、选中导航、日历悬停文字、官方Logo、主题及桌面/手机截图。此批仅配色与验收更新，未重复全套业务DOM。公网只读GET证据 `BATCH15-LIVE.json`：`2026-11-11T08:48:39.917072+00:00`，`/healthz` HTTP200精确返回 `{"ok":true,"service":"jovian-pms","data":"test-only"}`；**28份**公开资源GET200且与本地逐字节一致，包含全部web JS、两份CSS、主题/HTML及四份Logo PNG；style.css含全部12项新token、无旧青色主色。恢复页使用 `/web/recovery.html`、自助入住使用 `/checkin/`；核验脚本初次误用 `/recovery/` 得404，修正公开路径后全数通过，未改动产品路由。

`BATCH15-BROWSER.json` 记录真实公网Chromium未登录核验：按钮 `rgb(63, 106, 88)`、悬停 `rgb(51, 86, 72)`、白字及sage主题；1920/1440/1201宽字标32px，1200/760/390隐藏。`workspace.css`完全未修改，批次14默认40px/width auto、紧凑32px及1200断点隐藏规则保留；官方黑色星球与字标、原图及所有Logo资产均未修改。前端资源一致不作为私有后端直接执行证明。

无新增运行时文件、业务逻辑、双状态机、数据库、账号、部署工作流变更；营业日与马来西亚自然日、跨已夜审日期暂存恢复及AR保护保持。没有线上登录或POST、真实订单/资金/生产数据/门锁操作，全部Do NOT事项继续不做。最终文档与证据提交只改根目录及continuity，不触发新部署。
