# 交接给接手 AI（codex）· 财务域按权限点清单推进（2026-11-07 修订版）

把下面整段提示词原样转给接手方。上一版让人「猜 SmartOrder 的对账怎么做」，这一版改成了**按实读到的权限点清单逐项落地**。

---

你是 JOVIAN PMS（仓库 `Popo841103/codex-pan`，分支 `jovian-pms-test`）的接手开发者。先读三份文件再动手：

1. `WORKBUDDY-HANDOFF.md` 末尾三章（尤其「Roles a property defines for itself」）
2. `continuity/PROJECT-STATE.md`（批次表、硬约束、真实接入状态）
3. `docs/pms/smartorder-permission-catalog-2026-11-07.md` ← **本次的任务清单在这里**

## 第一步：不要用反汇编工具，用这个

参考产品 SmartOrder 的后台是 Vue 3 单页应用，前端是公开静态资源，权限目录、界面文案、接口路径都在里面。**IDA / Ghidra 这类工具对它没有用**——那类工具针对分发的机器码（桌面程序 / App / 固件），而 Web 的服务端代码从不发给浏览器。可复现的读法：

```bash
curl -sS https://www.smartorder.ai/pmsManage/index | grep -o 'src="[^"]*bundle.js"'
# 得到主包，例如 https://static-pms.smartorders.net/pmsIntlModule/pms-master/<日期>/index.<hash>.bundle.js
curl -sS --compressed -o main.js <主包 URL>
# 主包里 .u=function 给出全部分包 {id:"hash"}，分包 URL 与主包同目录
curl -sS --compressed -o <id>.js https://static-pms.smartorders.net/pmsIntlModule/pms-master/<日期>/<id>.<hash>.bundle.js
grep -o '"auth\.[a-zA-Z0-9_.]*"' <含词表的分包>   # 权限键
```

纪律：只读公开静态资源，用于理解行为、写我们自己的实现。**不绕过登录、不调鉴权后接口、不反编译服务端、不把对方 JS 或文案搬进我们仓库。** 我们的代码必须是自己的。

## 第二步：按清单做，不要自己发明需求

`smartorder-permission-catalog-2026-11-07.md` 有 307 个权限点全清单和一张差距表。要补的是这 8 组（按建议顺序）：

1. `auth.settle.split.bill` 系列 5 项 —— 拆账 / 账单级结账 / 撤销结账 / 撤销拆账（我们现在只有单笔 `settle` 与 `reopen_folio`）
2. `auth.ar.*` + `auth.reconcile.*` —— AR 账户（挂账主体）、余额、账户间转账、AR 核销、企业账务核销、核销流水
3. `auth.report.ar.*` 等 8 张财务报表 —— 账龄、账户余额、挂账明细、核销明细、核销流水、调账明细、宾客账结余、权责制营业报表
4. `auth.audit.*` 12 项夜审细粒度（含「允许修改已夜审订单」这类可分配例外；我们现在只有一个 `night_audit` 动作）
5. `auth.sensitive.*` 6 项敏感权限层（支付、下载全量导出、首页数据）
6. `auth.company.*` 企业客户 / 储值 / 充值抵扣明细
7. `auth.frontdesk.charge` 前台收支（非订单的现金进出）
8. `auth.wallet.*` 钱包 —— **先别做**，我们没有支付通道，做了就是假余额

**银行流水导入 / 银行对账：参考产品的 307 个权限点里没有对应项**（实读到的否定结论）。别照上一版提示词去猜银行流水格式；若运营方坚持要，先拿到真实流水样本再设计，且明确这是参考产品之外的自定义需求。

## 硬约束（违反即返工）

1. 保留线上账号、订单、账务与全部既有改动；不重建、不回退、不重置。
2. **发布器不安装新运行时文件**：服务端并入既有 `pms/server/store.js`、`pms/server/http.js`；前端并入 `pms/web/app.js`、`pms/web/workspace-ui.js`、`pms/web/financial-ui.js`。新增文件只能进 `test/`、`verification/`、`docs/`。
3. 每个新动作必须同时进：`server/store.js` 的 `roleTypes.admin`、`web/workspace-ui.js` 的 `permissionModules`、三语文案 `teamWords`（`act_<action>` / `mod_<module>`）。`test/role-permissions.test.js` 第一条用例会比对两份清单，漏一处就红。
4. 金额三语、append-only 审计、幂等 receipts、`expectedRevision` 校验照既有模式；押金是负债不是收入；审计锁只锁 `edit`/`cancel` 不锁 `payment`。
5. 结算类动作默认给 `finance` 内置角色；`operations` 不含资金动作（与现状一致）；AR 核销这类不可逆动作建议再加一层「双人复核」开关，但不要默认打开。
6. 测试基线：Node `npm test` 408 全绿、Python `python3 -m unittest discover -s pms/test -p 'test_*.py'` 5/5、`verification/dom-*.mjs` 19 条全过（jsdom 传 `pms/node_modules/jsdom/lib/api.js`）。**不许削弱或删除既有断言**。
7. 文档同步：`WORKBUDDY-HANDOFF.md` 加一章；`continuity/PROJECT-STATE.md` 批次表与头部计数；`continuity/VERIFICATION.md` 加外部核验 curl + 主机 grep。

## 验收（每批都要给）

- 实现说明：改了哪些文件、为什么这样切。
- 测试清单：新增用例覆盖的正例与反例，尤其「不能越权」「不能重复核销」「撤销后余额复原」。
- DOM 流程：页面端到端一条。
- 证据等级：实见 / 文档 / 推断 / 未验证分开写；主机 grep 才能证明的写成「部署重启推断」，不要写成外部实见。
