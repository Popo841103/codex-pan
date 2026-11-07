# 交接给接手 AI（codex）· 对账结算与银行对账（2026-11-07）

把下面整段提示词原样转给接手方即可。权限体系（`9a15aed`）已就绪，财务三件直接在其上挂动作。

---

你是 JOVIAN PMS（仓库 `Popo841103/codex-pan`，分支 `jovian-pms-test`）的接手开发者。先读根目录 `WORKBUDDY-HANDOFF.md` 末尾三章和 `continuity/PROJECT-STATE.md`，再动手。

## 背景

- 参考产品 SmartOrder 的权限模型已经照搬完成（提交 `9a15aed`）：门店可自定义角色（模块 × 动作勾选矩阵）、成员可在角色之外附加动作；`permissionsFor(user, propertyId)` 是唯一权限来源；新动作只需进 `server/store.js` 的 `roleTypes.admin` 列表和 `web/workspace-ui.js` 的 `permissionModules`，测试「矩阵并集 === 服务端全集」会自动把关。
- 渠道单笔实际佣金已可人工录入（`0aae239`：金额、账单号、备注、结算状态、append-only 审计）。仍缺：对账单期结、银行对账、差异过账。
- 运营方要求这三件**按 SmartOrder 的行为做**。SmartOrder 只有公开帮助页可看，没有源码；不能声称「代码照搬」，要做「行为对齐」，并把每处取材写清是实见、文档还是推断。

## 硬约束（违反即返工）

1. 保留线上账号、订单、账务与全部既有改动；不重建、不回退、不重置。
2. **发布器不安装新运行时文件**：服务端逻辑并入既有 `pms/server/store.js`、`pms/server/http.js`；前端并入 `pms/web/app.js`、`pms/web/workspace-ui.js`、`pms/web/financial-ui.js` 等。新增文件只能进 `test/`、`verification/`、`docs/`。
3. 财务动作（例如 `statement_close`、`bank_reconcile`、`variance_post`，命名自定）加入权限目录后自动获得角色矩阵控制；`finance` 内置角色默认应含只读+录入，`operations` 不含资金动作，与现状一致。
4. 金额三语、append-only 审计、幂等 receipts、`expectedRevision` 校验全部照既有模式；押金是负债不是收入；审计锁只锁 `edit`/`cancel` 不锁 `payment`。
5. 测试基线：Node `npm test` 全绿（当前 408）、Python `python3 -m unittest discover -s pms/test -p 'test_*.py'` 5/5、`verification/dom-*.mjs` 19 条全过（jsdom 传 `pms/node_modules/jsdom/lib/api.js`）。不许削弱或删除既有断言。
6. 文档同步：`WORKBUDDY-HANDOFF.md` 末尾加一章；`continuity/PROJECT-STATE.md` 批次表 + 头部计数；`continuity/VERIFICATION.md` 加外部核验命令。

## 要做的三件（口径未定项先问用户，不要自作主张）

1. **对账单期结**：按渠道+周期把佣金/结算汇总成一张对账单快照，期末后旧单不可再改（可 reopen，权限单列）。口径待定：自然月还是营业月。
2. **银行对账**：导入银行流水（格式待用户提供样本）、与收款/退款逐笔配对、显示未配对项。只读配对，不自动改账。
3. **差异过账**：配不上的差异生成人工调整记录（带原因、双管理员复核与否待定），差异原数不改，append-only。

## 验收

- 每件附：实现说明、测试清单、DOM 流程、`WORKBUDDY-HANDOFF.md` 章节、外部核验命令（curl 线上前端资产 + 主机 grep）。
- 证据等级照旧：实见 / 文档 / 推断 / 未验证分开写。
