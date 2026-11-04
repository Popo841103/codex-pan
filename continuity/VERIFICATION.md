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

当前基线（2026-11-04）：Node **365/365**，Python **5/5**，16 个 DOM 脚本，38 个运行时 JS 语法检查。

## 可选的 DOM 流程验证

jsdom 需已安装；每个脚本把 `node_modules/jsdom/lib/api.js` 作为第一个参数传入：

```bash
node verification/dom-notifications.mjs node_modules/jsdom/lib/api.js
```

全部 16 个脚本：

```
dom-workflows.mjs  dom-financial.mjs  dom-comparison.mjs  dom-settlement.mjs
dom-rates.mjs  dom-night-audit.mjs  dom-manager-report.mjs  dom-accommodation.mjs
dom-extra-penalty.mjs  dom-occupancy.mjs  dom-team-access.mjs  dom-property-site.mjs
dom-data-cleanup.mjs  dom-booking-requests.mjs  dom-notifications.mjs
communications-dom.mjs
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
```

**不要**把「`/api/xxx` 无会话返回 401」当成新后端的证据——所有 `/api/` 路径都这样。`/healthz` 200 至少说明新后端已加载且启动成功（含建表与加列迁移），但不能证明某个函数在运行。

## Windows 已知两项失败（不要削弱）

- `NOBEDS config requires private files and rejects malformed credentials without exposing them`
- `guest encryption keys persist privately and missing keys never silently replace encrypted history`

两项测的都是 POSIX 私有普通文件与权限位语义，Windows 上不适用。Ubuntu CI 全通过即为发布门槛，不要为让 Windows 通过而降低校验。

## 证据等级写法

结论按「实见 / 文档 / 推断 / 未验证」标注：本地测试通过写「本地验证」，公网文件命中写「外部实见」，主机 grep 写「主机佐证」，供应商 / 门锁行为写「未联调」。合成 provider 的成功只能写成「合成测试通过」。
