# 前台只读工具与显示规则逐项审计（2026-11-10）

基线 `e69f4a4`，已成功发布的 Actions `42798753554`。下表是对该提交的审计，非对 SmartOrder 新做操作。参考来源是用户提供的 ISOLA KLCC 英文 UI 只读观察；未复制未经核验字段。没有缺失的主体功能；三处展示文案部分完成，本批补齐。

| 项 | e69f4a4 判定 | 源码、测试和 DOM 证据 | 本批完成情况 |
|---|---|---|---|
| 1 房态日志 | 完成 | `web/app.js` 的 `showRoomLogs`：房号、操作日期、动作、操作人筛选及八列；`src/inventory-actions.js` 的 `roomStatusRows` 生成快照；`server/store.js` 保留 reducer 快照；`test/room-status-audit.test.js`；`data-room-status-logs` | 加测五类动作在双状态机一致、旧日志不变；DOM 覆盖日期/操作人/动作/房号，无编辑控件 |
| 2 智能锁空列表 | 部分 | `showSmartLock`、`data-smart-lock`、`data-lock-tab`；两页签、搜索、未开通提示均已有，但空状态误用了“创建测试订单”的通用文案 | zh/en/ms 独立 No Data；验证搜索跨页签保留、只有两个页签按钮，没有设置/购买/开门/密码操作 |
| 3 批量打印预览 | 完成 | `showBatchPrint`、`data-batch-print`、`data-registration-count`；入住日期、日期、房间、住宿状态 | DOM 加测各条件的合成计数；没有打印按钮，调用 print 即测试失败 |
| 4 计划任务 | 部分 | `showStayPreview('scheduled')`、`data-scheduled-task`；Scheduled Task 标题、All 筛选已有，空列表仍复用创建订单提示 | 改为独立三语空状态；不创建任务或自动发送 |
| 5 打印中心 | 部分 | `showStayPreview('print')`、`data-print-center`、`data-print-tab`；General/Registration Card、基础设置提示和禁用设置按钮已有，英文标题仅 Print | 英文补全 Print Center；无 Set up 内部字段及打印动作 |
| 6 自助入住外观 | 完成 | `data-stay-preview="self-checkin"`、`data-self-checkin-preview`；Generate Code/Cancel/Confirm | DOM 断言两个动作禁用、Cancel 关闭、预览不写 revision/audit；没有生成/复制/发送 |
| 7 房间分组 | 完成 | `web/workspace-ui.js` 的 `bindOperationsDisplay`、`src/demo-store.js` 的 `saveDisplayPreferences`；`data-group-name`、`data-layout-list="member:…"` | 合成创建两个自行命名分组、拖入房间、改名保存与日历筛选通过；新组名称为空，不预设业务名称 |
| 8 日历顺序 | 完成 | `app.js` 的 `calendar`/`compareRows`；`data-layout-list` 的 roomTypeOrder/roomOrder/groupOrder | DOM 对三种拖动保存后实际日历行序逐一断言；库存计划保持不变 |
| 9 付款方式顺序 | 完成 | `preferenceOptions`、`paymentOptions`、payments-enabled/disabled | DOM 默认全部启用、拖动排序和禁用后账页选项消失；无新增付款渠道 |
| 10 渠道顺序 | 完成 | `channelChoices`、`reservation-ui.js` 的现有渠道选项、channels-enabled/disabled | DOM 默认全部启用、拖动排序和禁用后新预订不显示；仅既有枚举，无 NOBEDS，无 OTA 连接声明 |
| 11 预发房卡规则 | 完成 | `advanceCard`、advanceEnabled/advanceMinutes；`saveDisplayPreferences`；`test/display-preferences.test.js` | 默认关闭且禁用 0；开启整数 0–1440；关闭重新归零持久化。加三语说明仅保存、不实际发卡、不是智能锁密码 |

## 运行与证据边界

- `npm test --prefix pms`：Node 24、439/439；新增 2 项覆盖共享/本地设置一致、日志五动作及追加不改历史。
- `python3 -m unittest discover -s pms/test -p 'test_*.py' -v`：5/5；CI 三个部署脚本 `bash -n` 通过。
- 全部 25 个 DOM 脚本及 folio 的 `--lines`/`--amend` 共 27 次合成回归通过。增强脚本：`node pms/verification/dom-front-desk-tools.mjs <jsdom/lib/api.js 绝对路径>`。
- DOM 使用进程内 jsdom、内存 SQLite、合成账号及订单，不是公网登录浏览器或真实设备验收。jsdom 仅装在临时目录，不引入运行时依赖。
- 日志筛选按 Asia/Kuala_Lumpur 操作自然日；关房起止保留原库存日期，绝不替换为营业日。未记录历史字段显示空白，不回填猜测。
- 设置只存门店显示规则；双状态机走同一 reducer，授权仍由共享后端校验。测试证明订单/资金记录、房型/库存及夜审/交班保留。
- 未改工作流，未增加运行时文件。所有禁止事项继续禁止；没有真实打印、发卡、门锁操作、账号更改、订单/资金操作或线上数据重置。
- 公网只读健康与 GET 静态文件的结果、发布提交和 Actions 编号见 `continuity/VERIFICATION.md` 本批节。后端不公开，不能以静态标识命中宣称后端业务已做线上交互验收。
