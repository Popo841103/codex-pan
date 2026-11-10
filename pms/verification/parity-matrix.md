# SmartOrder 功能对照矩阵（2026-11-11，续跑批次）

仅参考本机只读目录的入口和流程；没有复制个人资料、金额、订单号或截图。状态为本批完成后的保守评估，已有表示JOVIAN已提供对应内部能力，并不代表字段/商业服务完全相同。部分表示基础能力已存在但明确列出差距。禁止项即使有只读预览也不宣称接通。

基线：运行时40df390 / 文档9d94165。A7第9节此次已逐项对照。通用边界：不改账号/数据库，不自动夜审、不跨午夜截账、不改历史夜审保护、不接真实资金/OTA/锁。

| 编号 | 参考入口 | 状态 | JOVIAN入口 | 证据与差距 |
|---|---|---|---|---|
| 1.1 | Home (landing) | 部分 | 首页 / 顶栏 | pms/web/app.js、pms/web/workspace-ui.js；dashboard.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 1.2 | Home | 部分 | 首页 / 顶栏 | pms/web/app.js、pms/web/workspace-ui.js；dashboard.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 1.3 | Header | 已有 | 首页 / 顶栏 | pms/web/app.js、pms/web/workspace-ui.js；dashboard.test.js、dom-workflows.mjs。 |
| 1.4 | Header | 部分 | 首页 / 顶栏 | pms/web/app.js、pms/web/workspace-ui.js；dashboard.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 2.1 | Calendar > Calendar View | 部分 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 2.2 | Calendar > Calendar View > Filter (Room Type Filter) | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.3 | Calendar > Calendar View > Legend | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.4 | Calendar > Calendar View > Display | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.5 | Calendar > Daily View | 部分 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 2.6 | Calendar > Rate&Availability > Rate Grid | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.7 | Calendar > Rate&Availability > Change History | 部分 | 统计 → 运营查询工作台 → rateHistory | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。按受影响日期查 before/after；尚无全部操作日期/项目筛选 |
| 2.8 | Calendar > Availability > Daily Inventory | 部分 | 统计 → 运营查询工作台 → dailyInventory | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。可用量沿用共享原子分配；尚缺参考全部分项列 |
| 2.9 | Calendar > Availability > Future Inventory | 部分 | 统计 → 运营查询工作台 → futureInventory | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。31日范围及CSV；尚缺参考横向矩阵全部分项 |
| 2.10 | Calendar > Meals > Redeem | 缺失 | 房态 → 日历 / 房价与可售 | 未找到对应完整内部状态/入口；待实现。 |
| 2.11 | Calendar > Meals > Summary | 缺失 | 房态 → 日历 / 房价与可售 | 未找到对应完整内部状态/入口；待实现。 |
| 2.12 | Calendar > Housekeeping > Calendar | 部分 | 统计 → 运营查询工作台 → housekeepingCalendar | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。到离店日历；非任务派工/检查流程 |
| 2.13 | Calendar > Housekeeping > List | 部分 | 统计 → 运营查询工作台 → housekeepingList | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。当前清洁状态；历史不猜测清洁人 |
| 3.1 | Channel > Channel > List | 部分 | 渠道 | pms/web/app.js、pms/web/workspace-ui.js；booking-request.test.js、communications.test.js、dom-booking-engine.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 3.2 | Channel > Channel > Rate Multiplier | 部分 | 渠道 | pms/web/app.js、pms/web/workspace-ui.js；booking-request.test.js、communications.test.js、dom-booking-engine.mjs。不编辑划线倍率；现有渠道配置不代表OTA合同倍率 |
| 3.3 | Channel > Channel > Currency Conversion | 部分 | 渠道 | pms/web/app.js、pms/web/workspace-ui.js；booking-request.test.js、communications.test.js、dom-booking-engine.mjs。没有已核验汇率源，不虚构换算 |
| 3.4 | Channel > Booking Engine > Home | 部分 | 渠道 | pms/web/app.js、pms/web/workspace-ui.js；booking-request.test.js、communications.test.js、dom-booking-engine.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 3.5 | Channel > Booking Engine > Payments | 禁止或需外部接入 | 渠道 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 3.6 | Channel > iCal > Import | 部分 | 统计 → 运营查询工作台 → iCal | financial-reports.js occupancyIcal / previewIcal；parity-workbench Node/DOM。本批粘贴全天ICS严格预览；尚未保存导入或生成关房 |
| 3.7 | Channel > iCal > Export | 部分 | 统计 → 运营查询工作台 → iCal | financial-reports.js occupancyIcal / previewIcal；parity-workbench Node/DOM。本批下载匿名占用ICS；尚无公开订阅URL |
| 4.1 | Reservations > Accommodation (list) | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.2 | Reservations > Accommodation > reservation detail (Details) | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.3 | Reservations > Accommodation > reservation detail > Bill Info | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.4 | Reservations > Accommodation > reservation detail > Logs | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.5 | Reservations > Accommodation > reservation detail > More menu | 部分 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 4.6 | Reservations > Accommodation > reservation detail > More > Charge Adjustment | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.7 | Reservations > Accommodation > reservation detail > Modify | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.8 | Reservations > Accommodation > reservation detail > Payment | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.9 | Reservations > Accommodation > reservation detail > Settle | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.10 | Reservations > Accommodation > reservation detail > More > Cancel | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.11 | Reservations > Accommodation > reservation detail > Invoice | 部分 | 统计 → 运营查询工作台 → invoice | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。完整住宿费用/押金独立快照；不含税务票据提交 |
| 4.12 | Reservations > Booking Engine | 部分 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 4.13 | Reservations > Failed | 部分 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。已有网站请求状态；尚缺统一失败预订列表 |
| 4.14 | Reservations > Transactions | 部分 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 4.15 | Reservations > Transactions | 部分 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 5.1 | Customers > List | 部分 | 客户 / 应收账户 | pms/web/app.js、pms/web/workspace-ui.js；ar-ledger.test.js、ar-reports.test.js、dom-ar-ledger.mjs。住宿关联客户，不合并同名；尚无独立客户档案CRUD |
| 5.2 | Customers > List > Customer Details (one existing customer, view only) | 部分 | 统计 → 运营查询工作台 → customerDetails | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。住宿详情/标签/费用；尚缺独立生日证件档案 |
| 5.3 | Customers > Tag > Ungrouped Tags | 已有 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批标签版本/住宿关联追加历史 |
| 5.4 | Customers > Tag > Tag Group | 已有 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批标签组版本/门店范围校验 |
| 5.5 | Customers > Corporate Client | 部分 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批公司目录及现有AR关联；非公司储值系统 |
| 5.6 | Customers > AR Account | 已有 | 客户 / 应收账户 | pms/web/app.js、pms/web/workspace-ui.js；ar-ledger.test.js、ar-reports.test.js、dom-ar-ledger.mjs。 |
| 6.1 | Analytics > Statistics > Summary > Revenue Summary | 部分 | 统计 → 运营查询工作台 → revenueSummary | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 6.2 | Analytics > Statistics > Summary > Transaction Summary | 部分 | 统计 → 运营查询工作台 → transactionSummary | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 6.3 | Analytics > Statistics > Summary > Channel Summary | 部分 | 统计 → 运营查询工作台 → channelSummary | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 6.4 | Analytics > Statistics > Summary > Sales Summary | 部分 | 统计 → 运营查询工作台 → salesSummary | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 6.5 | Analytics > Statistics > Accommodation | 部分 | 统计 → 运营查询工作台 → accommodationSummary | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 6.6 | Analytics > Statistics > Quick Note | 部分 | 统计 → 运营查询工作台 → quickNoteSummary | pms/src/financial-reports.js parityReport；test/parity-workbench.test.js；verification/dom-parity-workbench.mjs。本批营业日备忘历史；不是独立收支快记账 |
| 6.7 | Analytics > Reports libraries and Quick Open Reports picker | 部分 | 统计 → 报表 | pms/web/app.js、pms/web/workspace-ui.js；daily-operations.test.js、financial-reports.test.js、dom-manager-report.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 6.8 | Analytics > Reports > Business Reports > Shift Handover Report (Accrual Basis) | 部分 | 统计 → 报表 | pms/web/app.js、pms/web/workspace-ui.js；daily-operations.test.js、financial-reports.test.js、dom-manager-report.mjs。已有班次快照；尚缺完整接待/房卡报表 |
| 6.9 | Analytics > Reports > Business Reports > Manager Daily Report | 部分 | 统计 → 报表 | pms/web/app.js、pms/web/workspace-ui.js；daily-operations.test.js、financial-reports.test.js、dom-manager-report.mjs。已有开闭余额公式；尚缺参考全部页签 |
| 6.10 | Analytics > Reports > Business Reports > Ledger Records | 部分 | 统计 → 报表 | pms/web/app.js、pms/web/workspace-ui.js；daily-operations.test.js、financial-reports.test.js、dom-manager-report.mjs。已有账项/AR记录；尚缺统一全业务分类 |
| 6.11 | Analytics > Reports > Business Reports > Accrual Basis Operating Report | 部分 | 统计 → 报表 | pms/web/app.js、pms/web/workspace-ui.js；daily-operations.test.js、financial-reports.test.js、dom-manager-report.mjs。已有权责收益/AR报表；尚缺完整经营会计口径 |
| 6.12 | Analytics > Reports > Business Reports > Guest Account Balance Records | 部分 | 统计 → 报表 | pms/web/app.js、pms/web/workspace-ui.js；daily-operations.test.js、financial-reports.test.js、dom-manager-report.mjs。已有客账三桶及日期口径；非储值系统 |
| 7.1 | Settings > Room > Room Type | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.2 | Settings > Room > Rate Plan | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.3 | Settings > Room > Hourly Room | 部分 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批管理员钟点房定义；尚无按小时售卖库存 |
| 7.4 | Settings > Room > Combined Room | 禁止或需外部接入 | 设置 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 7.5 | Settings > Room > Meal | 部分 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批餐食目录定义；尚无权益/核销 |
| 7.6 | Settings > Room > Item | 部分 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批物品目录及既有附加费；非自动联动库存 |
| 7.7 | Settings > Room > Group | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.8 | Settings > Room > Sort | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.9 | Settings > Room > Frontdesk | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.10 | Settings > Finance > Payment Method | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.11 | Settings > Finance > Quick Note | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.12 | Settings > Finance > Invoice | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.13 | Settings > Account > Account List | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.14 | Settings > Account > Account Role | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.15 | Settings > Account > Shift | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.16 | Settings > Property > Basic Info | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.17 | Settings > Property > Details | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.18 | Settings > General > Notification | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.19 | Settings > General > Channel | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.20 | Settings > General > Quick Replies | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.21 | Settings > General > Scheduled Msg | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.22 | Settings > General > Scheduled | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.23 | Settings > General > Print | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.24 | Settings > General > Night Audit (view only; not run) | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。仅人工逐日夜审/历史；禁止自动、清空、历史批量处理 |
| 7.25 | Settings > General > Holiday | 缺失 | 设置 | 未找到对应完整内部状态/入口；待实现。 |
| 7.26 | Settings > Housekeeping > Items | 缺失 | 设置 | 未找到对应完整内部状态/入口；待实现。 |
| 7.27 | Settings > Check-in > Settings | 部分 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 7.28 | Settings > Integration > Payments | 禁止或需外部接入 | 设置 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.1 | App Center > Home | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.2 | App Center > Product List | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.3 | App Center > My Subscription | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.4 | App Center > My App | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.5 | App Center > Invoice | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.1 | Home > Frequently Used Features > Payments | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.2 | Home > Frequently Used Features > Night Audit tile | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有夜审入口及记录；禁止批量历史处理 |
| 9.3 | Calendar tools panel (entry method) | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.4 | Calendar tools > Overview | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.5 | Calendar tools > Reserve | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.6 | Calendar tools > Combined Room | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.7 | Calendar tools > Share | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.8 | Calendar tools > Reservation Box | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.9 | Calendar tools > Logs | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.10 | Calendar tools > Inventory | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。对应能力见现有入口；未覆盖参考全部扩展字段/配置 |
| 9.11 | Calendar tools > Batch Print | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有只读筛选计数；无打印内部模板 |
| 9.12 | Calendar tools > Smart Lock | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有未开通只读列表；无门锁操作 |
| 9.13 | Account Role lock permissions vs live UI | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.14 | Reservations > reservation detail > Lock Room | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.15 | Reservations > reservation detail > Self-Check-in | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有只读预览；无生成/发送代码 |
| 9.16 | Reservations > reservation detail > More | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.17 | Reservations > reservation detail > Scheduled | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有只读空任务列表；无自动发送 |
| 9.18 | Reservations > reservation detail > Reservation Box (move into) | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.19 | Reservations > reservation detail > Print | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有打印中心预览；无模板内部 |
| 9.20 | Settings > Room > Frontdesk > Advance Key Card Issuance Modify | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.21 | Settings > General > Holiday > List tab | 缺失 | 日历工具 / 住宿详情底部 | 未找到对应完整内部状态/入口；待实现。 |
| 9.22 | Channel > Booking Engine > Home > Verify Now | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.23 | Channel > Booking Engine > Home > Setup Now | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有安全草稿/预览；禁止Configure内部 |
| 9.24 | Items still not opened (safe stop) | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |

## 数量与下一优先级

共114条：部分 62、已有 32、缺失 5、禁止或需外部接入 15。

本批推进21条：2.7–2.9、2.12–2.13、3.6–3.7、4.11、5.2–5.5、6.1–6.6、7.3、7.5–7.6。多数仍标部分，避免将简化内部实现宣称完整同款。

下一优先：2.10/2.11餐食权益与可撤销核销、4.13失败预订统一列表、2.8库存细分解释、6.8–6.12报表细化、7.25/9.21节假日、7.26清洁检查项。禁止项不进入实现队列。

## 补充入口（目录非编号部分）

| 入口 | 状态 | JOVIAN入口/证据 |
|---|---|---|
| 优先流程：改期/续住/调价 | 已有 | 住宿详情修改、账项调整；reservation/folio测试；不自动重报价或移附加费 |
| 优先流程：月结/更正 | 已有 | 佣金月结、AR；commission-period/receivables测试；保留夜审保护 |
| 优先流程：班次/夜审 | 部分 | 人工夜审及交班；business-day测试；禁止自动/历史批量 |
| 优先流程：账页/收退款 | 已有 | 住宿账页/流水；folio/payment测试；无真实支付接入 |
| 全局顶栏/属性/语言 | 部分 | app.js；三语/门店隔离；无参考产品下载与购买 |
| Header图标/消息 | 部分 | staff notices提醒；不声称外部聊天接入 |
| Settings sidebar / Housekeeping Settings | 部分 | 房态清洁设置；尚无完整派工检查项 |
| Follow-up notes | 禁止或需外部接入 | 仅参考观察范围说明，无新增执行动作 |

## 本批验收范围

- 13个查询共用 `parityReport`，在演示和共享SQLite模式读取同一结构；不写revision/audit。营业日营收/备注与马来西亚交易自然日分列；CSV使用相同筛选结果、BOM和公式前缀防护。
- 6个管理员目录（标签组、标签、公司、餐食、物品、钟点定义）追加版本；客户标签追加绑定/解绑事件；服务端强制账号admin并校验门店、父项、整数金额和小时范围。旧住宿/资金不变。
- iCal是下载文件生成及粘贴fixture预览，不是外网同步或已保存导入；导出包含共享空间/关房，无客人资料或业务编号；未分房/逾期区间不确定时拒绝导出。严格拒绝重复事件、URL、时区、闹钟和非法日期。
- 三语页面及列名；内部账单从住宿详情进入，不是税务发票。清洁日历只是计划到离，列表只是当前清洁状态，不冒充历史派工记录。
- 本批未实现行保持缺失/部分；尤其餐食核销、失败预订统一列表、完整经营会计报表仍待后续。没有新增运行时模块、修改部署工作流或接触真实业务记录。

复现：`npm test --prefix pms`；`python3 -m unittest discover -s pms/test -p 'test_*.py' -v`；`node pms/verification/dom-parity-workbench.mjs /tmp/pms-verification-deps/node_modules/jsdom/lib/api.js`。全部DOM脚本另逐个执行，folio附加`--lines`与`--amend`分支。部署及公网GET证据见continuity/VERIFICATION.md本批章节。
