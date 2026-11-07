# 交接给 codex · 财务三件（2026-11-07）

你是 JOVIAN PMS（`Popo841103/codex-pan`，分支 `jovian-pms-test`）的接手开发者。
先读 `WORKBUDDY-HANDOFF.md` 末三章、`continuity/PROJECT-STATE.md`、`docs/pms/smartorder-permission-catalog-2026-11-07.md`，再动手。

## 一、用逆向工具取证（本批的主要情报来源）

参考产品有可分发的客户端，**用逆向工具把它拆开**，把财务模块的接口契约、字段、枚举、权限码全部提取出来，作为实现的依据。

**三个靶子**

| 形态 | 标识 | 工具 |
|---|---|---|
| Android App | `com.ddll.smart_order`（Play） | `jadx -d out/ app.apk`、`apktool d app.apk` |
| iOS App | App Store `id6502392484` | 越狱设备取 IPA，或 `class-dump` + Hopper |
| 桌面端 Win/macOS | 官网 Desktop 下载页（Electron 壳，含 `isDdllDesktopRuntime`、`getDdllBusBridge`） | `7z x Setup.exe`；`.dmg` 挂载后 `npx asar extract app.asar out/` |

**原生层**（`.so` / `.exe` / `.dylib`、加解密与签名逻辑）用 **Ghidra**、**radare2** 或 **IDA Pro**。

**要提取的东西**

1. 全部 `/v2/...` 接口路径，按模块分组；
2. 每个接口的请求字段、响应字段、类型、必填、枚举值、错误码；
3. 财务相关枚举：结算状态、核销类型、账单状态、差异原因；
4. 权限码与菜单结构的对应关系；
5. 界面元素与操作顺序（核销页、拆账页、报表页）。

**产出** `docs/pms/smartorder-finance-contract.md`：一张接口契约表 + 字段字典。这张表就是实现的规格书。

**补充来源**（可与逆向并行，不是替代）：运营方自己的账号登录后，F12 → Network → Save as HAR，能拿到真实请求响应。有 HAR 就更准。已入库的成果直接用：**307 个权限点 + 241 条接口**，实证接口 `/v2/core/web/arAccount/charge/writeOff`（AR 核销）。

**先下样本**：本机（沙箱）实测 apkpure / apkcombo / apkmirror 被 Cloudflare 403 挡住，APK 下不到。你在海外环境，**第一步就是自己下 APK**：
`apkpure.net/smart-order/com.ddll.smart_order` 或 Play 页面。拿到后先做一件最省事的事——**APK 就是 zip，直接 `unzip -o app.apk -d raw/` 看 `assets/`**：若它是 WebView 壳，assets 里就是完整前端 bundle，比反编译 dex 快得多。

**拆到什么深度**：接口、字段、枚举、状态流转、权限码、交互顺序——全部拆到底，逐条进契约表。这是本批的规格来源，越细越好。

**两条不做**：① 不把对方的代码与文案搬进仓库——你要对外售卖这套系统，抄来的代码和文案就是对方的证据，界面文案自己写反而更贴你的客户；② 不绕过鉴权、不破解付费功能——那是刑事风险（非法获取计算机信息系统数据），也会让整套系统无法合规交付。取数用运营方自己的账号，或让他导 HAR。拆包产物不入库，只入结论。

## 二、要做的三件（按顺序，前一件不稳不做后一件）

**1. 拆账 + 账单级结账/撤销**
一单拆成 N 个子账单（按房间/项目/人），各自结账，父单汇总。撤销结账 = 追加冲销，不删原记录。

**2. AR 账户 + 挂账 + 核销**
- AR 账户：企业/协议客户挂账主体，有余额和流水。
- 挂账：结账时选"转 AR"生成应收。
- 核销：一笔收款冲一或多笔应收，FIFO（按到期日），允许手工指定。
- 账户间转账。

**3. AR 报表 8 张**
账龄表、账户余额表、挂账明细表、核销明细表、核销流水表、调账明细表、宾客账结余明细表、权责制营业报表。

**不做**：银行流水导入/银行对账（参考产品 307 个权限点里无此项）。运营方坚持要，先要真实流水 CSV 样本。钱包、企业储值、前台收支也不做。

## 三、硬约束

- 不重建、不回退、不重置；保留线上账号与账务。
- 不新增运行时文件。服务端逻辑并入 `server/store.js`、`server/http.js`；前端并入 `web/app.js`、`web/workspace-ui.js`、`web/financial-ui.js`。新文件只进 `test/`、`verification/`、`docs/`。
- 新动作必须进权限目录，三处都要加：`store.js` 的 `roleTypes.admin` 与 `actionModules`、`workspace-ui.js` 的 `permissionModules`。已有测试会校验，不许绕过。
  建议名：`settle_split`、`settle_undo`、`ar_account_save`、`ar_transfer`、`ar_write_off`、`ar_report_view`。
- `finance` 角色含只读+录入；`operations` 不含资金动作。
- 金额三语、append-only 审计、幂等 receipts、`expectedRevision` 照既有模式。押金是负债不是收入。
- 测试基线不许削弱：Node 408、Python 5/5、DOM 19 条（jsdom 传 `pms/node_modules/jsdom/lib/api.js`）。
- 文档同步：`WORKBUDDY-HANDOFF.md` 加一章、`PROJECT-STATE.md` 批次表、`VERIFICATION.md` 核验命令。

## 四、未定口径（先用默认值，文档标注）

| 项 | 默认 |
|---|---|
| 对账周期 | 自然月，月末 23:59:59 切账 |
| 佣金结算粒度 | 按账期汇总，切账后冻结 |
| 核销顺序 | 按到期日 FIFO，允许手工指定 |
| 差异处理 | 挂账，不自动生成调整分录 |

## 五、验收

每件附：改了哪些文件 + 新增命令、测试数、一条 DOM 流程、HANDOFF 章节、核验命令（curl 线上资产 + 主机 grep `/opt/jovian-pms-test/current/server/store.js`）。

证据分级写清楚：实见 / 文档 / 推断 / 未验证。
