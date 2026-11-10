# SmartOrder 功能对照矩阵（2026-11-11，续跑批次）

仅参考本机只读目录的入口和流程；没有复制个人资料、金额、订单号或截图。状态为本批完成后的保守评估，已有表示JOVIAN已提供对应内部能力，并不代表字段/商业服务完全相同。部分表示基础能力已存在但明确列出差距。禁止项即使有只读预览也不宣称接通。

本批基线：运行时7e41bf3 / 文档f0a4796。A7第9节此次已逐项对照。通用边界：不改账号/数据库，不自动夜审、不跨午夜截账、不改历史夜审保护、不接真实资金/OTA/锁。

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
| 2.7 | Calendar > Rate&Availability > Change History | 已有 | 统计 → 运营查询工作台 → 房价及可售变更历史 | operations-completion Node/DOM + 既有回归；操作日/受影响日、房型、计划、操作人、金额与限制项筛选；before/after保留。 |
| 2.8 | Calendar > Availability > Daily Inventory | 已有 | 统计 → 运营查询工作台 → 每日库存 | operations-completion Node/DOM + 既有回归；容量/可售/占用/续住/到离/未分房/暂存/取消/三类关闭/共享关闭/当前干净脏房/可用与渠道占用；容量不按渠道拆分。 |
| 2.9 | Calendar > Availability > Future Inventory | 已有 | 统计 → 运营查询工作台 → 未来库存 | operations-completion Node/DOM + 既有回归；31日逐日全分项及横向日期矩阵；房型/渠道过滤与同结果CSV，共享产品不相加。 |
| 2.10 | Calendar > Meals > Redeem | 已有 | 客户 / 设置房型与房间 / 工作台 → 餐食与清洁操作 | operations-completion Node/DOM + 既有回归；管理员分配使用日权益；运营核销按马来西亚使用日；管理员带原因追加撤销，超额/重复撤销/跨门店拒绝；不自动收费。 |
| 2.11 | Calendar > Meals > Summary | 已有 | 统计 → 运营查询工作台 → 餐食汇总 | operations-completion Node/DOM + 既有回归；按使用日与餐食汇总权益/已核销/剩余，房型/渠道过滤及CSV；保留快照不按目录现价重算。 |
| 2.12 | Calendar > Housekeeping > Calendar | 已有 | 统计 → 运营查询工作台 → 清洁周转日历 / 餐食与清洁操作 | operations-completion Node/DOM + 既有回归；手动任务创建/指派/进行/完成/取消，逐房逐日到离/任务/人员/检查；没有自动派工或伪造历史清洁。 |
| 2.13 | Calendar > Housekeeping > List | 已有 | 统计 → 运营查询工作台 → 当前清洁列表 / 清洁检查记录 | operations-completion Node/DOM + 既有回归；当前房态、任务状态及人员、最近检查与逐项结果/备注/人员/时间，CSV；任务及检查不自动改房态。 |
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
| 4.13 | Reservations > Failed | 已有 | 统计 → 运营查询工作台 → 失败及未完成预订 | operations-completion Node/DOM + 既有回归；人工内部失败记录与现有网站拒绝/撤回等请求统一检索/状态/渠道/日期/CSV；无OTA失败推送、自动重试或真实下单。 |
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
| 6.7 | Analytics > Reports libraries and Quick Open Reports picker | 已有 | 统计 → 运营查询工作台 → 视图选择器及既有统计导航 | operations-completion Node/DOM + 既有回归；23类内部查询统一选择、日期与搜索、同筛选CSV；原AR/住宿/经理报表入口保留；非外部供应商报表库。 |
| 6.8 | Analytics > Reports > Business Reports > Shift Handover Report (Accrual Basis) | 部分 | 统计 → 运营查询工作台 → 交班营业日明细 | operations-completion Node/DOM；新增营业日收银明细/汇总、班次交班窗口/操作员/方式/渠道、接待记录及CSV；房卡明确未接通；接待仅最近500可读审计，不冒充完整发卡/接待历史。 |
| 6.9 | Analytics > Reports > Business Reports > Manager Daily Report | 部分 | 统计 → 运营查询工作台 → 经理营业日报表 | operations-completion Node/DOM；保留既有开闭余额经理日报；新增营业日收银/接待分页与CSV；房卡未接通、旧流水缺营业日不倒填，仍非完整参考全部页签。 |
| 6.10 | Analytics > Reports > Business Reports > Ledger Records | 部分 | 统计 → 运营查询工作台 → 统一账簿记录 | operations-completion Node/DOM；新增营业日费用/收款/押金/AR/账单转账统一明细与CSV，整单住宿账簿快照另页；仍缺完整按创建/完成时间检索及全部业务分类。 |
| 6.11 | Analytics > Reports > Business Reports > Accrual Basis Operating Report | 已有 | 统计 → 运营查询工作台 → 权责经营明细 | operations-completion Node/DOM + 既有回归；已记录营业日借方费用、贷方净收款/AR/账单转账、押金独立负债，期间与截至结束日所在月累计及CSV；不含储值/外部会计。 |
| 6.12 | Analytics > Reports > Business Reports > Guest Account Balance Records | 已有 | 统计 → 运营查询工作台 → 营业日客账余额 | operations-completion Node/DOM + 既有回归；逐住宿期初+期间费用−净收款−AR−账单转入=期末，押金独列；房型/渠道及CSV。只算已知日期账项，旧缺日期明确计数；非储值系统。 |
| 7.1 | Settings > Room > Room Type | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.2 | Settings > Room > Rate Plan | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.3 | Settings > Room > Hourly Room | 部分 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批管理员钟点房定义；尚无按小时售卖库存 |
| 7.4 | Settings > Room > Combined Room | 禁止或需外部接入 | 设置 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 7.5 | Settings > Room > Meal | 已有 | 客户 / 设置房型与房间 / 工作台 → 内部目录 → 餐食分类 / 餐食 | operations-completion Node/DOM + 既有回归；分类、单位计价、单价、启停追加版本；权益保存名称/分类/计价与价格快照，手工数量/使用日，不重报价旧住宿。 |
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
| 7.25 | Settings > General > Holiday | 已有 | 设置 → 房型与房间 → 内部目录 → 节假日与活动；工作台 → 节假日历 | operations-completion Node/DOM + 既有回归；管理员维护人工日期/名称/类型/热度/显示，追加版本，按日期日历预览/列表/搜索/CSV；没有官方订阅或未经核验国家节假日。 |
| 7.26 | Settings > Housekeeping > Items | 已有 | 设置 → 房型与房间 → 内部目录 → 清洁检查项 | operations-completion Node/DOM + 既有回归；管理员检查项启停/改名/绑定房型（空为全店）；房型引用当前版本，检查逐项必填并保留当时名称快照与人员/时间/结果。 |
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
| 9.10 | Calendar tools > Inventory | 已有 | 房态 / 统计 → 运营查询工作台 → 每日 / 未来库存 | operations-completion Node/DOM + 既有回归；同2.8/2.9分项与日期矩阵；只读查询，原日历工具保留。 |
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
| 9.21 | Settings > General > Holiday > List tab | 已有 | 统计 → 运营查询工作台 → 节假日历 | operations-completion Node/DOM + 既有回归；同7.25人工节假日/活动日历与列表、热度/显示/搜索/CSV；无自动国家假日源。 |
| 9.22 | Channel > Booking Engine > Home > Verify Now | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.23 | Channel > Booking Engine > Home > Setup Now | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有安全草稿/预览；禁止Configure内部 |
| 9.24 | Items still not opened (safe stop) | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |

## 数量与下一优先级

共114条：已有 48、部分 51、缺失 0、禁止或需外部接入 15。

本批16条由部分/缺失提升为已有：2.7–2.13、4.13、6.7、6.11–6.12、7.5、7.25–7.26、9.10、9.21。另扩展6.8–6.10，仍保留部分，未以未接通的房卡或不完整历史宣称完整同款。已有仅指上表明确的JOVIAN内部能力，不承诺参考供应商全部字段或服务。

下一优先：独立客户档案、6.1–6.6完整统计维度与有归属的快记账、6.10创建/完成日期账簿过滤、小时预订；再考虑明确授权范围内iCal持久导入。6.8/6.9房卡、真实OTA失败推送、储值与外部会计不冒充接通；所有禁止项继续不做。

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
