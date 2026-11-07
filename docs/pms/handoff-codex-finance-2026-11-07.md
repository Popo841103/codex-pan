# 交接给 codex · 财务三件（2026-11-07 简版）

你是 JOVIAN PMS（`Popo841103/codex-pan`，分支 `jovian-pms-test`）的接手开发者。
先读 `WORKBUDDY-HANDOFF.md` 末三章、`continuity/PROJECT-STATE.md`、`docs/pms/smartorder-permission-catalog-2026-11-07.md`，再动手。

## 三条前提

1. 参考产品是 SaaS，服务端不分发。逆向工具（IDA/Ghidra/jadx）只能读到"客户端怎么调接口"，读不到账务算法。算法我们自己定并标注。
2. `smartorder-permission-catalog-2026-11-07.md` 里已有 **307 个权限点 + 241 条接口**（实见），直接用，不要重抓。
3. 若运营方给了 `smartorder-finance.har`，先读它；没给就按下面第四节做，接口形态自己定，文档标"未经实证"。

## 要做的（按顺序，前一件不稳不做后一件）

**1. 拆账 + 账单级结账/撤销**
一单拆成 N 个子账单（按房间/项目/人），各自结账，父单汇总。撤销结账 = 追加冲销，不删原记录。

**2. AR 账户 + 挂账 + 核销**
- AR 账户：企业/协议客户挂账主体，有余额和流水。
- 挂账：结账时选"转 AR"生成应收。
- 核销：一笔收款冲一或多笔应收，FIFO（按到期日），允许手工指定。
- 账户间转账。
- 实证接口：`/v2/core/web/arAccount/charge/writeOff`。

**3. AR 报表 8 张**
账龄表、账户余额表、挂账明细表、核销明细表、核销流水表、调账明细表、宾客账结余明细表、权责制营业报表。

**不做**：银行流水导入/银行对账（参考产品没有，307 个权限点里无此项）。运营方坚持要，先要真实流水 CSV 样本。钱包、企业储值、前台收支也不做。

## 硬约束

- 不重建、不回退、不重置；保留线上账号与账务。
- 不新增运行时文件。服务端逻辑并入 `server/store.js`、`server/http.js`；前端并入 `web/app.js`、`web/workspace-ui.js`、`web/financial-ui.js`。新文件只进 `test/`、`verification/`、`docs/`。
- 新动作必须进权限目录，三处都要加：`store.js` 的 `roleTypes.admin` 与 `actionModules`、`workspace-ui.js` 的 `permissionModules`。已有测试会校验，不许绕过。
  建议名：`settle_split`、`settle_undo`、`ar_account_save`、`ar_transfer`、`ar_write_off`、`ar_report_view`。
- `finance` 角色含只读+录入；`operations` 不含资金动作。
- 金额三语、append-only 审计、幂等 receipts、`expectedRevision` 照既有模式。押金是负债不是收入。
- 测试基线不许削弱：Node 408、Python 5/5、DOM 19 条（jsdom 传 `pms/node_modules/jsdom/lib/api.js`）。
- 文档同步：`WORKBUDDY-HANDOFF.md` 加一章、`PROJECT-STATE.md` 批次表、`VERIFICATION.md` 核验命令。

## 未定口径（先用默认值，文档标注）

| 项 | 默认 |
|---|---|
| 对账周期 | 自然月，月末 23:59:59 切账 |
| 佣金结算粒度 | 按账期汇总，切账后冻结 |
| 核销顺序 | 按到期日 FIFO，允许手工指定 |
| 差异处理 | 挂账，不自动生成调整分录 |

## 验收

每件附：改了哪些文件 + 新增命令、测试数、一条 DOM 流程、HANDOFF 章节、核验命令（curl 线上资产 + 主机 grep `/opt/jovian-pms-test/current/server/store.js`）。

证据分级写清楚：实见 / 文档 / 推断 / 未验证。
