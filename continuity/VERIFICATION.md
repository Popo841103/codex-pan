# JOVIAN PMS · 验证与发布核验清单

换电脑后按这份清单跑，不要只信「Actions 显示成功」。所有命令在 `pms/` 目录下执行，Node 要求 **24**（用到 `node:sqlite`）。

## 本地测试

```bash
cd pms
npm test                                                  # 全量 Node 测试
python3 -m unittest discover -s test -p "test_*.py" -v    # 发布包边界测试
bash -n deploy/update-vultr-test.sh
bash -n deploy/ci/setup-server.sh
bash -n deploy/ci/receive-release.sh
```

当前基线（2026-11-04，`4baad16`）：Node **402/402**，Python **5/5**，**18** 个 DOM 脚本，37 个运行时 JS 语法检查，部署 shell `bash -n`。改 `deploy/update-vultr-test.sh` 后必须同步 `deploy/ci/BOOTSTRAP.txt` 内嵌的 base64+gzip 副本与 SHA-256（`test_release_archive.py` 会拦截不同步，否则新服务器会装回旧脚本）；重生成用确定性 gzip：`gzip.compress(data, compresslevel=9, mtime=0)`。

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
