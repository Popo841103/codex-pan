# 交接给接手 AI（codex）· 财务三件：拆账/结账、AR 账户与核销、AR 报表（2026-11-07 第二版）

> 本文是**可直接转发**的提示词。第二版相对第一版的改动：取证方法从「读公开前端」扩成三条路径（含客户端逆向工具的正确定位），并明确分工——运营方提供样本，你负责实现。

---

## 你的身份与任务

你是 JOVIAN PMS（仓库 `Popo841103/codex-pan`，分支 `jovian-pms-test`）的接手开发者。
先读根目录 `WORKBUDDY-HANDOFF.md` 末尾三章、`continuity/PROJECT-STATE.md`，再读这两份调研：

- `docs/pms/smartorder-permission-catalog-2026-11-07.md` —— 参考产品 **307 个权限点**全清单 + 我们 63 个动作的差距表。
- `docs/pms/smartorder-forensics-playbook-2026-11-07.md` —— **取证手册**：三条路径、工具、命令、合规红线。

任务：把参考产品已具备、我们还没有的财务能力做出来，**行为一致、代码自己写**。

---

## 一、先接受三个事实（不接受就会白干）

1. **参考产品是 SaaS，服务端代码不对外分发。** 桌面端是 Electron 壳、移动端只有首页/房态/消息/预订 4 个板块。**任何逆向工具（IDA / Ghidra / radare2 / jadx）都读不到「系统是怎么编写的」**，只能读到「客户端怎么调用服务端」。所以：
   - 接口名、字段名、枚举值、状态流转 → **可以取证并对齐**；
   - 账龄算法、核销冲销顺序、分摊规则、数据库结构 → **取不到**，必须我们自己定义并落文档，标注「我们的规则」。
2. **不要为了「用了逆向工具」而逆向。** 逆向是三条路径里最贵、收益最低的一条。顺序是：登录态抓 HAR → 读公开前端 → 逆向客户端。
3. **禁止复制对方代码、文案、图标。** 只提取事实（接口、字段、枚举），其余自己写。

---

## 二、三条取证路径与你各自的动作

### 路径 A：读公开前端（**已完成，成果直接用**）

参考产品后台是 Vue 3 SPA，登录页即下发全部 JS。已提取并入库：

- **307 个 `auth.*` 权限点**（78 组，含中文界面名）；
- **241 条 `/v2/...` 接口**（主包 155 + 43 个基础分包 86）；
- 关键硬证据：`POST /v2/core/web/arAccount/charge/writeOff`（AR 账户充值核销）、`POST /v2/core/settle/commission/getDetail`（佣金明细）、权限下发 `POST /v2/auth/web/auth/getAllFnWithRelByUserId`。

**你的动作**：直接引用，不要重抓。若需重抓（版本更新），命令见 playbook 第 1 节。

**已知天花板**：财务业务代码在按需加载的异步分包里，**未登录不下发**。所以路径 A 到此为止，再往深必须走 B。

### 路径 B：登录态抓 HAR（**最高价值，等运营方给**）

财务页面一打开，业务分包与接口请求会同时出现在浏览器里。抓一次 HAR，等于同时拿到界面元素 + 接口 + 请求字段 + 响应字段 + 枚举值。

**这一步由运营方做**（他是账号所有者，5 分钟），步骤见 playbook 第 2 节，产出 `smartorder-finance.har`。要覆盖：AR 账户核销、拆账/结账/撤销结账、5 张 AR 报表、3 张财务报表现。

**你的动作（拿到 HAR 后）**：

1. 按 playbook 里的脚本列出全部 `/v2/` 请求，按页面分组；
2. 逐个接口提取**字段名、类型、必填、枚举值、错误码**，整理成一张「接口契约表」放进 `docs/pms/`；
3. **脱敏**：删 `Authorization`、`Cookie`、`token`、`phone`、`guestName` 等；**HAR 原件绝不入库**，只入结构；
4. 按契约表实现，字段命名可借鉴，**语义自己实现**。

**如果运营方暂时给不了 HAR**：按路径 A 的 307 权限点 + 241 接口 + 本文件第四节的默认口径先做，接口形态自己定，文档里明确标「未经参考产品实证」。

### 路径 C：客户端二进制逆向（**有缺口时才用**）

各形态与工具对照表见 playbook 第 3 节。要点：

- APK：`jadx -d out/ app.apk`、`apktool d app.apk`；桌面端：`7z x Setup.exe` 或 `npx asar extract app.asar out/`；
- 原生 `.so` / `.exe` 才需要 Ghidra / radare2 / IDA；
- **样本必须由运营方提供**（本机实测：APK 镜像站全不可达、GitHub release 下载失败、apt 无 radare2，不是工具问题而是拿不到靶子）；
- 只保留事实性结论，拆包产物不入库。

---

## 三、硬约束（违反即返工）

1. 保留线上账号、订单、账务与全部既有改动；不重建、不回退、不重置。
2. **发布器不安装新运行时文件**：服务端逻辑并入既有 `pms/server/store.js`、`pms/server/http.js`；前端并入 `pms/web/app.js`、`pms/web/workspace-ui.js`、`pms/web/financial-ui.js`。新增文件只能进 `test/`、`verification/`、`docs/`。
3. **新动作必须进权限目录**，自动获得角色矩阵控制：`server/store.js` 的 `roleTypes.admin` 与 `actionModules`，`web/workspace-ui.js` 的 `permissionModules`。已有测试「矩阵并集 === 服务端全集」会自动把关，不许绕过。建议动作名：`settle_split`、`settle_undo`、`ar_account_save`、`ar_transfer`、`ar_write_off`、`ar_report_view`、`variance_post`。
4. `finance` 内置角色默认含只读 + 录入；`operations` 不含资金动作；与现状一致。
5. 金额三语、append-only 审计、幂等 receipts、`expectedRevision` 全部照既有模式；押金是负债不是收入；审计锁只锁 `edit`/`cancel` 不锁 `payment`。
6. 测试基线不得削弱：Node `npm test` 全绿（当前 **408**）、Python `python3 -m unittest discover -s pms/test -p 'test_*.py'` **5/5**、`verification/dom-*.mjs` **19 条**全过（jsdom 传 `pms/node_modules/jsdom/lib/api.js`）。
7. 文档同步：`WORKBUDDY-HANDOFF.md` 末尾加一章；`continuity/PROJECT-STATE.md` 批次表 + 头部计数；`continuity/VERIFICATION.md` 加外部核验命令。

---

## 四、要做的三件（按此顺序，前一件不稳不上后一件）

### 1. 拆账 + 账单级结账 / 撤销（纯内部账务，无外部依赖）
- 一单可拆成 N 个子账单（按房间/按项目/按人），各自结账；父单汇总状态。
- `settle_undo` 撤销结账：恢复未结状态，**原结账记录不删**，追加一条冲销。
- 对应权限点（实见）：`auth.settle.split.bill`、`auth.settle.checkout.bill`、`auth.settle.undo.split.bill`、`auth.settle.undo.checkout.bill`。

### 2. AR 账户 + 挂账 + 核销（**这才是「对账单」的实体**）
- AR 账户：企业客户/协议客户的挂账主体，有余额、有流水。
- 挂账：订单结账时可选「转 AR」，生成一笔应收。
- 核销：`ar_write_off`，一笔收款冲一笔或多笔应收（**冲销顺序自己定义并写文档**：建议按到期日先进先出，允许手工指定）。
- 账户间转账 `ar_transfer`。
- 对应权限点（实见）：`auth.ar.account`、`auth.ar.transfer`、`auth.reconcile.ar`、`auth.reconcile.company.ar`、`auth.edit.account`、`auth.view.transaction`、`auth.export.transaction`；接口实证：`/v2/core/web/arAccount/charge/writeOff`。

### 3. AR 报表 8 张（数据来自 1、2，做完自动可出）
AR 账龄表、AR 账户余额表、AR 挂账明细表、AR 核销明细表、AR 核销流水表、调账明细表、宾客账结余明细表、权责制营业报表。

### 明确不在本批（避免范围膨胀）
- **银行流水导入 / 银行对账：参考产品里不存在**（307 个权限点里无对应项，「银行」只出现在客人银行卡信息与房东提现账户登记）。若运营方坚持要，**先要真实流水样本（CSV/Excel 列结构）再设计**，不许猜格式。
- 钱包余额/提现：无支付通道，做了就是假余额。
- 企业储值、前台收支：等商业需要。

---

## 五、待运营方拍板的口径（拿不到就先用默认值，文档标注）

| 口径 | 默认值（未拍板时采用） |
|---|---|
| 对账周期 | 自然月（月末最后一日 23:59:59 切账） |
| 佣金结算粒度 | 按账期汇总（不是单笔），账期内可调整，切账后冻结 |
| 核销冲销顺序 | 按应收到期日先进先出，允许手工指定 |
| 差异处理 | **挂账，不自动生成调整分录**；需人工确认后单独过账 |
| 拆账最小单位 | 账单行（folio line），不是订单 |

---

## 六、验收

每件都要附：

1. 实现说明（改了哪些既有文件、新增哪些命令与动作）；
2. 测试清单（新增用例数、总数、不许削弱既有断言）；
3. DOM 流程（`verification/dom-*.mjs` 新增一条，走真实登录 + 真实命令）；
4. `WORKBUDDY-HANDOFF.md` 章节；
5. 外部核验命令（curl 线上前端资产 + 主机 `grep /opt/jovian-pms-test/current/server/store.js`）。

**证据等级必须分开写**：实见（读到了）/ 文档（别人写的）/ 推断（我猜的）/ 未验证（没条件验）。参考产品的接口与字段属「实见」，账务算法属「我们的规则」，不许混写。
