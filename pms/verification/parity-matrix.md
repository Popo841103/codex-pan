# SmartOrder 功能对照矩阵（2026-11-11，续跑批次）

仅参考本机只读目录的入口和流程；没有复制个人资料、金额、订单号或截图。状态为本批完成后的保守评估，已有表示JOVIAN已提供对应内部能力，并不代表字段/商业服务完全相同。部分表示基础能力已存在但明确列出差距。禁止项即使有只读预览也不宣称接通。

最新批次09：运行时39e3a70；当前已有94/部分5/缺失0/禁止或外部15，部署证据见末节及continuity/VERIFICATION.md。

前批基线：运行时96ff297 / 5b40732，文档0a7c5a9；本批运行时71e1ec3。A7第9节此次已逐项对照。通用边界：不改账号/数据库，不自动夜审、不跨午夜截账、不改历史夜审保护、不接真实资金/OTA/锁。

| 编号 | 参考入口 | 状态 | JOVIAN入口 | 证据与差距 |
|---|---|---|---|---|
| 1.1 | Home (landing) | 已有 | 首页 → 门店摘要 / 原有经营看板 | desk-completion Node/DOM、front-desk-tools及完整回归；新增保存门店显示资料、欢迎词、公告和未完成人工任务；原有经营看板保留。内部首页能力，不含供应商商业推广组件。 |
| 1.2 | Home | 已有 | 首页 → 人工任务摘要 → 前台工作台 | desk-completion Node/DOM、front-desk-tools及完整回归；当前门店未完成任务、马来西亚到期日和住宿编号可见，跳转维护；不按营业日推断到期日，不自动执行。 |
| 1.3 | Header | 已有 | 首页 / 顶栏 | pms/web/app.js、pms/web/workspace-ui.js；dashboard.test.js、dom-workflows.mjs。 |
| 1.4 | Header | 已有 | 顶栏 → 门店 / 营业日 / 马来西亚今日 / 本店角色 | internal-display Node/DOM；本店服务端营业日与马来西亚今日并列，门店角色优先于账号角色；纯读，不自动推进日期，不提供下载购买。 |
| 2.1 | Calendar > Calendar View | 已有 | 房态 → 日历 / 单日住宿显示 | 保留原日历、筛选、共享可售；新增独立单日日期/姓名编号/状态查询、小时窗、到离及逾期在住另列，当前清洁不冒充历史。internal-display Node/DOM；不做Overview/Reserve/Combined Room/Share。 |
| 2.2 | Calendar > Calendar View > Filter (Room Type Filter) | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.3 | Calendar > Calendar View > Legend | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.4 | Calendar > Calendar View > Display | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.5 | Calendar > Daily View | 已有 | 日历 → 单日 → 显示日期 / 搜索 / 状态 | internal-display Node/DOM；含当日离店，显示当前住宿快照、资源、来源、小时窗及当前清洁，逾期在住不当可售；查询不写营业日、revision或审计，非历史状态重建。 |
| 2.6 | Calendar > Rate&Availability > Rate Grid | 已有 | 房态 → 日历 / 房价与可售 | pms/web/app.js、pms/web/workspace-ui.js；calendar-view.test.js、rate-calendar.test.js、dom-rates.mjs。 |
| 2.7 | Calendar > Rate&Availability > Change History | 已有 | 统计 → 运营查询工作台 → 房价及可售变更历史 | operations-completion Node/DOM + 既有回归；操作日/受影响日、房型、计划、操作人、金额与限制项筛选；before/after保留。 |
| 2.8 | Calendar > Availability > Daily Inventory | 已有 | 统计 → 运营查询工作台 → 每日库存 | operations-completion Node/DOM + 既有回归；容量/可售/占用/续住/到离/未分房/暂存/取消/三类关闭/共享关闭/当前干净脏房/可用与渠道占用；容量不按渠道拆分。 |
| 2.9 | Calendar > Availability > Future Inventory | 已有 | 统计 → 运营查询工作台 → 未来库存 | operations-completion Node/DOM + 既有回归；31日逐日全分项及横向日期矩阵；房型/渠道过滤与同结果CSV，共享产品不相加。 |
| 2.10 | Calendar > Meals > Redeem | 已有 | 客户 / 设置房型与房间 / 工作台 → 餐食与清洁操作 | operations-completion Node/DOM + 既有回归；管理员分配使用日权益；运营核销按马来西亚使用日；管理员带原因追加撤销，超额/重复撤销/跨门店拒绝；不自动收费。 |
| 2.11 | Calendar > Meals > Summary | 已有 | 统计 → 运营查询工作台 → 餐食汇总 | operations-completion Node/DOM + 既有回归；按使用日与餐食汇总权益/已核销/剩余，房型/渠道过滤及CSV；保留快照不按目录现价重算。 |
| 2.12 | Calendar > Housekeeping > Calendar | 已有 | 统计 → 运营查询工作台 → 清洁周转日历 / 餐食与清洁操作 | operations-completion Node/DOM + 既有回归；手动任务创建/指派/进行/完成/取消，逐房逐日到离/任务/人员/检查；没有自动派工或伪造历史清洁。 |
| 2.13 | Calendar > Housekeeping > List | 已有 | 统计 → 运营查询工作台 → 当前清洁列表 / 清洁检查记录 | operations-completion Node/DOM + 既有回归；当前房态、任务状态及人员、最近检查与逐项结果/备注/人员/时间，CSV；任务及检查不自动改房态。 |
| 3.1 | Channel > Channel > List | 已有 | 渠道 → 内部渠道与人工来源 | internal-display Node/DOM；列出既有全部来源编号、内部名称、说明、启停和本店住宿数；管理员追加版本，OTA连接状态仍独立且不冒充接通。 |
| 3.2 | Channel > Channel > Rate Multiplier | 部分 | 渠道 | pms/web/app.js、pms/web/workspace-ui.js；booking-request.test.js、communications.test.js、dom-booking-engine.mjs。不编辑划线倍率；现有渠道配置不代表OTA合同倍率 |
| 3.3 | Channel > Channel > Currency Conversion | 部分 | 渠道 | pms/web/app.js、pms/web/workspace-ui.js；booking-request.test.js、communications.test.js、dom-booking-engine.mjs。没有已核验汇率源，不虚构换算 |
| 3.4 | Channel > Booking Engine > Home | 已有 | 渠道 → 内部网站预订准备检查 | booking-preparation Node/DOM；实际保存网站草稿/发布状态、三语标题/描述/联系文字有无、房型/计划/房源草稿数、人工请求状态；31日价格覆盖仅已保存单元格，不冒充实时可售或供应商接通。原未接通状态保留。 |
| 3.5 | Channel > Booking Engine > Payments | 禁止或需外部接入 | 渠道 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 3.6 | Channel > iCal > Import | 已有 | 统计 → 运营查询工作台 → 前台内部工作台 → 保存粘贴iCal | desk-completion Node/DOM、front-desk-tools及完整回归；严格全天ICS预览后，管理员选择资源、填确认原因保存关房；导入记录不保存原始ICS/摘要/UID，撤销整次导入保留历史。重复、跨门店、冲突、已夜审日期拒绝；禁止普通/批量开房绕过撤销。没有网络抓取或订阅同步。 |
| 3.7 | Channel > iCal > Export | 部分 | 统计 → 运营查询工作台 → iCal | financial-reports.js occupancyIcal / previewIcal；parity-workbench Node/DOM。本批下载匿名占用ICS；尚无公开订阅URL |
| 4.1 | Reservations > Accommodation (list) | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.2 | Reservations > Accommodation > reservation detail (Details) | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.3 | Reservations > Accommodation > reservation detail > Bill Info | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.4 | Reservations > Accommodation > reservation detail > Logs | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.5 | Reservations > Accommodation > reservation detail > More menu | 已有 | 住宿详情 → More：操作前核对 | booking-preparation Node/DOM；当前状态/资源、分房锁（非门锁）、暂存、关闭账单、拆账/AR/转账记录、最近夜审及待收/待退/押金分列；跳转原住宿/账项/日志/来源标签。快照不保证动作可执行，原服务端保护不变；不做历史批量结算。 |
| 4.6 | Reservations > Accommodation > reservation detail > More > Charge Adjustment | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.7 | Reservations > Accommodation > reservation detail > Modify | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.8 | Reservations > Accommodation > reservation detail > Payment | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.9 | Reservations > Accommodation > reservation detail > Settle | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.10 | Reservations > Accommodation > reservation detail > More > Cancel | 已有 | 预订 → 住宿 / 流水 | pms/web/app.js、pms/web/workspace-ui.js；reservations.test.js、folio.test.js、order-filters.test.js、dom-workflows.mjs。 |
| 4.11 | Reservations > Accommodation > reservation detail > Invoice | 已有 | 统计→运营查询工作台→内部账单；住宿详情→内部账单 | customer-statistics Node/DOM + 全量回归；完整费用快照、收付和押金独列、管理员纯文字标题/页脚、同结果CSV及专用打印；内部核对票据，不提交税务发票。 |
| 4.12 | Reservations > Booking Engine | 已有 | 设置 → 网站预订请求 → 搜索 / 状态 | internal-display及booking-requests DOM；内部网站请求按状态/文字只读筛选，保留报价及原人工决定/关联住宿；事件仅限当前门店请求，不接OTA订单或真实支付。 |
| 4.13 | Reservations > Failed | 已有 | 统计 → 运营查询工作台 → 失败及未完成预订 | operations-completion Node/DOM + 既有回归；人工内部失败记录与现有网站拒绝/撤回等请求统一检索/状态/渠道/日期/CSV；无OTA失败推送、自动重试或真实下单。 |
| 4.14 | Reservations > Transactions | 已有 | 统计→运营查询工作台→收退款流水明细 | customer-statistics Node/DOM + 全量回归；逐笔收款/退款/收押金/退押金，住宿归属、参考号、备注、操作员、方式、渠道、房型、马来西亚交易日及另列营业日；搜索/类型/状态筛选。 |
| 4.15 | Reservations > Transactions | 已有 | 统计→运营查询工作台→收退款流水明细 / 交易汇总 | customer-statistics Node/DOM + 全量回归；明细与双维度汇总及同筛选CSV互相核对；收退款和押金分列，混合明细不生成误导性合计；不连接支付服务。 |
| 5.1 | Customers > List | 已有 | 客户→内部目录→独立客户档案；客户档案与有归属业务 | customer-statistics Node/DOM + 全量回归；独立编号新建/修改/停用追加版本；允许同名；明确绑定/解绑已有住宿及原因审计，不按姓名/电话自动合并，不改住宿快照。 |
| 5.2 | Customers > List > Customer Details (one existing customer, view only) | 已有 | 客户→客户档案与有归属业务；工作台→独立客户档案及绑定住宿 | customer-statistics Node/DOM + 全量回归；电话、邮箱、国籍、语言、生日及证件末四位选填、备注、启停、绑定住宿及费用/净收款/待收/待退/押金；不保存完整证件，不提交身份验证。 |
| 5.3 | Customers > Tag > Ungrouped Tags | 已有 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批标签版本/住宿关联追加历史 |
| 5.4 | Customers > Tag > Tag Group | 已有 | 客户 / 设置房型与房间 / 运营查询工作台 → 内部目录 | demo-store.js changeDirectory、server/store.js；parity-workbench Node/DOM。本批标签组版本/门店范围校验 |
| 5.5 | Customers > Corporate Client | 已有 | 客户 / 设置 / 工作台 → 公司目录、公司关联及当前账项 | desk-completion Node/DOM、front-desk-tools及完整回归；沿用公司联系人、电话和已存在AR账户引用；管理员带原因关联/解绑住宿，名称留快照，逐住宿显示费用/待收待退/押金，不互抵、不重写原AR/住宿/价格，不提供公司储值或自动挂账。 |
| 5.6 | Customers > AR Account | 已有 | 客户 / 应收账户 | pms/web/app.js、pms/web/workspace-ui.js；ar-ledger.test.js、ar-reports.test.js、dom-ar-ledger.mjs。 |
| 6.1 | Analytics > Statistics > Summary > Revenue Summary | 已有 | 统计→运营查询工作台→营收汇总 | customer-statistics Node/DOM + 全量回归；按营业日费用，日期/渠道/房型/产品/房间/已记录计划/预订类型/公司/国籍/创建人等双维度；房费、附加费/钟点/取消费和单位夜分开，条件/搜索/CSV，缺字段留空。 |
| 6.2 | Analytics > Statistics > Summary > Transaction Summary | 已有 | 统计→运营查询工作台→交易汇总 | customer-statistics Node/DOM + 全量回归；按马来西亚交易日，双维度加方式/操作员/快记分类快照；四类收退款独列、住宿净收与押金净额分开；筛选/搜索/CSV，不混作营收。 |
| 6.3 | Analytics > Statistics > Summary > Channel Summary | 已有 | 统计→运营查询工作台→渠道汇总 | customer-statistics Node/DOM + 全量回归；营业日营收按渠道及第二维度展开、渠道/房型/计划/状态/账项类型过滤、CSV；缺渠道字段不猜，渠道不分摊房间容量。 |
| 6.4 | Analytics > Statistics > Summary > Sales Summary | 已有 | 统计→运营查询工作台→销售汇总 | customer-statistics Node/DOM + 全量回归；预订类型/公司及第二维度，明确读取既有预订快照；可按房型/渠道/计划/状态/创建与完成日期检索及CSV；不是销售佣金或公司储值。 |
| 6.5 | Analytics > Statistics > Accommodation | 已有 | 统计→运营查询工作台→住宿汇总 | customer-statistics Node/DOM + 全量回归；日期/房型/产品/房间/渠道五维度；按产品独立计算共享原子容量、单位夜、房费、ADR/入住率/RevPAR；渠道/客户/计划/创建或完成时间细分不虚构容量归属，小时费不充房晚。 |
| 6.6 | Analytics > Statistics > Quick Note | 已有 | 客户→客户档案与有归属业务→有住宿归属快记账；工作台→快记账/备忘录历史 | customer-statistics Node/DOM + 全量回归；按启用分类手工记录已有住宿收款/退款、原因和MYR分；沿用余额/账单关闭/拆账/AR/暂存保护；分类快照及营业日查询/CSV，不允许无人归属收支。 |
| 6.7 | Analytics > Reports libraries and Quick Open Reports picker | 已有 | 统计 → 运营查询工作台 → 视图选择器及既有统计导航 | operations-completion Node/DOM + 既有回归；23类内部查询统一选择、日期与搜索、同筛选CSV；原AR/住宿/经理报表入口保留；非外部供应商报表库。 |
| 6.8 | Analytics > Reports > Business Reports > Shift Handover Report (Accrual Basis) | 已有 | 统计 → 工作台 → 交班营业日 → 新增四分页 | internal-display Node/DOM及operations-completion；操作员/来源四类收退款、净收与押金净额分离、接待动作汇总、已完成交班窗口；含起不含止、房晚不分班。既有营业日明细/CSV保留，房卡未接通、旧缺历史不追造；已有仅指内部可核对报表。 |
| 6.9 | Analytics > Reports > Business Reports > Manager Daily Report | 已有 | 统计 → 工作台 → 经理营业日 → 新增四分页 | internal-display Node/DOM；新增同6.8维度、记录数与时间窗口，原开闭余额经理日报保留。营业日选账、马来西亚交易日另列；旧缺营业日不补猜，押金不作营收，非外部会计或房卡报表。 |
| 6.10 | Analytics > Reports > Business Reports > Ledger Records | 已有 | 统计→运营查询工作台→统一账簿记录 | customer-statistics Node/DOM + 全量回归；营业日费用/四类收退款/AR/账单转账分类及整单快照；增加创建与实际退房马来西亚日期起止交集过滤、创建人/状态及时间列；缺旧时间不补猜，不以计划退房冒充完成时间。 |
| 6.11 | Analytics > Reports > Business Reports > Accrual Basis Operating Report | 已有 | 统计 → 运营查询工作台 → 权责经营明细 | operations-completion Node/DOM + 既有回归；已记录营业日借方费用、贷方净收款/AR/账单转账、押金独立负债，期间与截至结束日所在月累计及CSV；不含储值/外部会计。 |
| 6.12 | Analytics > Reports > Business Reports > Guest Account Balance Records | 已有 | 统计 → 运营查询工作台 → 营业日客账余额 | operations-completion Node/DOM + 既有回归；逐住宿期初+期间费用−净收款−AR−账单转入=期末，押金独列；房型/渠道及CSV。只算已知日期账项，旧缺日期明确计数；非储值系统。 |
| 7.1 | Settings > Room > Room Type | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.2 | Settings > Room > Rate Plan | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.3 | Settings > Room > Hourly Room | 已有 | 目录 → 钟点定义；客户 → 小时预订；前台工作台 → 整点库存查询 | desk-completion Node/DOM、front-desk-tools及完整回归；新订单以整点小时窗占用共享原子，支持相邻窗口和24:00结束，拒绝重叠/跨午夜/夜审；24小时查询不写审计。SQLite同事务小时槽唯一性，旧整日订单继续整日保护；在住必须人工退房、清洁后周转。日库存同资源去重，小时费不算过夜房晚。 |
| 7.4 | Settings > Room > Combined Room | 禁止或需外部接入 | 设置 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 7.5 | Settings > Room > Meal | 已有 | 客户 / 设置房型与房间 / 工作台 → 内部目录 → 餐食分类 / 餐食 | operations-completion Node/DOM + 既有回归；分类、单位计价、单价、启停追加版本；权益保存名称/分类/计价与价格快照，手工数量/使用日，不重报价旧住宿。 |
| 7.6 | Settings > Room > Item | 已有 | 客户/设置房型与房间→内部目录→物品；客户档案与有归属业务→物品费用 | customer-statistics Node/DOM + 全量回归；管理员目录版本，运营逐笔确认住宿/数量/原因后保存当时名称与单价快照到当前营业日费用；整数金额及关闭/拆账/AR/暂存保护；不声称自动库存。 |
| 7.7 | Settings > Room > Group | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.8 | Settings > Room > Sort | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.9 | Settings > Room > Frontdesk | 已有 | 设置 → 房型与房间 → 前台内部工作台 → 前台及入住指引 | desk-completion Node/DOM、front-desk-tools及完整回归；管理员版本化参考入住/退房时间、欢迎词、人工入住检查清单；三语显示、门店隔离和追加历史。仅内部指引，不改变入住权限、房价、营业日或既有订单时间。 |
| 7.10 | Settings > Finance > Payment Method | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.11 | Settings > Finance > Quick Note | 已有 | 客户/设置房型与房间→内部目录→快记账分类 | customer-statistics Node/DOM + 全量回归；管理员维护收款/退款方向与启停追加版本；历史分类名与方向快照不重算，服务端权限及门店隔离；无非住宿费用或无人归属流水。 |
| 7.12 | Settings > Finance > Invoice | 已有 | 客户/设置房型与房间→内部目录→内部账单模板 | customer-statistics Node/DOM + 全量回归；管理员纯文字标题/页脚/启停追加版本，最新启用模板用于内部账单，字符转义/打印及CSV；不维护税费、不生成税务票据或跟踪代码。 |
| 7.13 | Settings > Account > Account List | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.14 | Settings > Account > Account Role | 已有 | 设置 → 团队与权限 → 当前账号有效动作 | internal-display Node/DOM及role-permissions；从本店服务端allowedActionsByProperty展示全动作允许/未授予矩阵和当前角色；原角色/附加权限编辑保留，不绕过账号管理员、隔店、余额或夜审保护；外部/锁权限不冒充能力。 |
| 7.15 | Settings > Account > Shift | 已有 | 设置 | pms/web/app.js、pms/web/workspace-ui.js；catalog.test.js、display-preferences.test.js、member-access.test.js、dom-front-desk-tools.mjs。 |
| 7.16 | Settings > Property > Basic Info | 已有 | 设置 / 工作台 → 门店资料 | desk-completion Node/DOM、front-desk-tools及完整回归；管理员保存显示名、地址、电话、邮箱；首页显示与内部打印使用，原门店ID/账号/数据库不替换。 |
| 7.17 | Settings > Property > Details | 已有 | 设置 / 工作台 → 门店资料及前台指引 | desk-completion Node/DOM、front-desk-tools及完整回归；门店说明、抵达指引、欢迎词、人工检查清单版本化保存及查看；纯文本，无身份提交/外部网站同步。 |
| 7.18 | Settings > General > Notification | 已有 | 设置 / 工作台 → 内部提醒公告；首页 → 公告 | desk-completion Node/DOM、front-desk-tools及完整回归；管理员保存公告，当前门店首页展示，保存历史追加；原通知规则/员工通知仍保留，无外部推送或自动发送。 |
| 7.19 | Settings > General > Channel | 已有 | 设置 → 房型与房间 → 内部渠道与人工来源 | internal-display Node/DOM；管理员对固定既有来源ID保存名称/说明/启停及原因追加历史；停用在双状态机拒绝新使用，旧单原来源可保留编辑；无OTA、倍率、汇率维护。 |
| 7.20 | Settings > General > Quick Replies | 已有 | 设置 / 工作台 → 内部快捷回复 | desk-completion Node/DOM、front-desk-tools及完整回归；多条独立编号回复，新建/编辑/停用保留版本，启用条目可复制；浏览器不允许剪贴板时提示手动复制。三语控件，仅内部人工回复，不发送消息。 |
| 7.21 | Settings > General > Scheduled Msg | 已有 | 设置 / 渠道 → 人工定日消息草稿 | internal-display Node/DOM；管理员本店住宿、马来西亚到期日、纯文字及原因，草稿/人工已处理/取消追加版本和历史。只有内部人工准备，没有自动发送、调度、代码、身份或外部消息接入。 |
| 7.22 | Settings > General > Scheduled | 已有 | 前台工作台 → 人工待办 / 住宿跟进 | desk-completion Node/DOM、front-desk-tools及完整回归；人工创建/更新马来西亚到期日、标题、备注、可选住宿和待办/完成/取消状态，保留版本与主页待办摘要。此行仅指内部人工到期待办；无后台调度、自动夜审、自动交班或补跑。 |
| 7.23 | Settings > General > Print | 已有 | 前台工作台 → 内部打印模板；日历 → 批量打印；住宿 → 打印 | desk-completion Node/DOM、front-desk-tools及完整回归；管理员纯文本标题/页脚版本、工作台打印和住宿内部常规/登记卡；打印CSS隔离，批量卡片与到店日期/房间/状态同筛选。非税务发票、无代码注入或身份上传。 |
| 7.24 | Settings > General > Night Audit (view only; not run) | 已有 | 设置 → 夜审设置 → 人工政策 / 只读历史检查 | internal-display DOM及night-audit回归；保存/强制记录数、营业日起止/人员原因筛选、既有异常及人工单日确认。已有仅指安全人工设置和历史；自动、00:00交班、跨午夜截账、补跑、清空和历史批量均未启用。 |
| 7.25 | Settings > General > Holiday | 已有 | 设置 → 房型与房间 → 内部目录 → 节假日与活动；工作台 → 节假日历 | operations-completion Node/DOM + 既有回归；管理员维护人工日期/名称/类型/热度/显示，追加版本，按日期日历预览/列表/搜索/CSV；没有官方订阅或未经核验国家节假日。 |
| 7.26 | Settings > Housekeeping > Items | 已有 | 设置 → 房型与房间 → 内部目录 → 清洁检查项 | operations-completion Node/DOM + 既有回归；管理员检查项启停/改名/绑定房型（空为全店）；房型引用当前版本，检查逐项必填并保留当时名称快照与人员/时间/结果。 |
| 7.27 | Settings > Check-in > Settings | 已有 | 设置 → 前台及入住指引 / 门店资料 | desk-completion Node/DOM、front-desk-tools及完整回归；保存并查看内部抵达说明、参考时间、欢迎词、人工检查清单；不自动判定身份或改变现有入住授权，不生成或发送自助入住代码。 |
| 7.28 | Settings > Integration > Payments | 禁止或需外部接入 | 设置 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.1 | App Center > Home | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.2 | App Center > Product List | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.3 | App Center > My Subscription | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.4 | App Center > My App | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 8.5 | App Center > Invoice | 禁止或需外部接入 | 无订阅/购买接入 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.1 | Home > Frequently Used Features > Payments | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.2 | Home > Frequently Used Features > Night Audit tile | 已有 | 首页 → 人工夜审只读摘要 → 人工逐日工作台 | internal-display DOM及night-audit；真实本店营业日、历史保存/强制数及工作台入口，原异常检查保留；不执行历史批量或自动处理。 |
| 9.3 | Calendar tools panel (entry method) | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.4 | Calendar tools > Overview | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.5 | Calendar tools > Reserve | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.6 | Calendar tools > Combined Room | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.7 | Calendar tools > Share | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.8 | Calendar tools > Reservation Box | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.9 | Calendar tools > Logs | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.10 | Calendar tools > Inventory | 已有 | 房态 / 统计 → 运营查询工作台 → 每日 / 未来库存 | operations-completion Node/DOM + 既有回归；同2.8/2.9分项与日期矩阵；只读查询，原日历工具保留。 |
| 9.11 | Calendar tools > Batch Print | 已有 | 日历工具 → 批量打印 | desk-completion Node/DOM、front-desk-tools及完整回归；到店日/资源/状态过滤生成实际内部登记卡预览，并可window.print；结果数量与卡片一致，纯读、不批量结账、无身份提交；专用打印样式。 |
| 9.12 | Calendar tools > Smart Lock | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有未开通只读列表；无门锁操作 |
| 9.13 | Account Role lock permissions vs live UI | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.14 | Reservations > reservation detail > Lock Room | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.15 | Reservations > reservation detail > Self-Check-in | 部分 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。已有只读预览；无生成/发送代码 |
| 9.16 | Reservations > reservation detail > More | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.17 | Reservations > reservation detail > Scheduled | 已有 | 住宿详情 → 计划任务 → 前台工作台维护 | desk-completion Node/DOM、front-desk-tools及完整回归；详情按当前住宿列出已保存人工跟进任务；跳转维护时预选住宿，保留到期日/状态/版本。仅人工跟进，不自动发送或执行。 |
| 9.18 | Reservations > reservation detail > Reservation Box (move into) | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.19 | Reservations > reservation detail > Print | 已有 | 住宿详情 → 打印 → 常规 / 登记卡 | desk-completion Node/DOM、front-desk-tools及完整回归；两个页签实际生成当前住宿内部文档，使用管理员纯文字标题/页脚，打印桩验证与专用CSS；原内部账单打印保留，无外部税务或身份提交。 |
| 9.20 | Settings > Room > Frontdesk > Advance Key Card Issuance Modify | 已有 | 日历工具 / 住宿详情底部 | pms/web/app.js、pms/web/workspace-ui.js；inventory-actions.test.js、room-status-audit.test.js、dom-front-desk-tools.mjs。 |
| 9.21 | Settings > General > Holiday > List tab | 已有 | 统计 → 运营查询工作台 → 节假日历 | operations-completion Node/DOM + 既有回归；同7.25人工节假日/活动日历与列表、热度/显示/搜索/CSV；无自动国家假日源。 |
| 9.22 | Channel > Booking Engine > Home > Verify Now | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |
| 9.23 | Channel > Booking Engine > Home > Setup Now | 已有 | 设置 → Booking Engine安全页 → 内部准备四步 | booking-preparation Node/DOM及原booking-engine回归；房型资源、房价日期、内部网站草稿、人工请求四步导航及只读保存状态/价格覆盖，三语/隔店/查询不写。无自动保存、发布、接受、供应商Configure、税费、倍率或身份提交。 |
| 9.24 | Items still not opened (safe stop) | 禁止或需外部接入 | 日历工具 / 住宿详情底部 | 用户明确禁止或需要供应商/订阅；不执行。 |

## 数量与下一优先级

共114条：已有 94、部分 5、缺失 0、禁止或需外部接入 15。

前批16条由部分提升为已有（历史）：1.1、1.2、3.6、5.5、7.3、7.9、7.16–7.18、7.20、7.22–7.23、7.27、9.11、9.17、9.19。已有只指各行明确限定的内部能力；人工到期待办不是自动调度，内部入住指引不是身份验证或门锁，iCal持久导入不是网络同步。

最新下一优先：内部显示与报表使用反馈、小时claims规模/性能验收及夜审/AR/暂存保护回归；剩余5项处置见末节。全部Do NOT边界不变。

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

## 前批验收范围（保留历史，最新见下节）

- 13个查询共用 `parityReport`，在演示和共享SQLite模式读取同一结构；不写revision/audit。营业日营收/备注与马来西亚交易自然日分列；CSV使用相同筛选结果、BOM和公式前缀防护。
- 6个管理员目录（标签组、标签、公司、餐食、物品、钟点定义）追加版本；客户标签追加绑定/解绑事件；服务端强制账号admin并校验门店、父项、整数金额和小时范围。旧住宿/资金不变。
- iCal是下载文件生成及粘贴fixture预览，不是外网同步或已保存导入；导出包含共享空间/关房，无客人资料或业务编号；未分房/逾期区间不确定时拒绝导出。严格拒绝重复事件、URL、时区、闹钟和非法日期。
- 三语页面及列名；内部账单从住宿详情进入，不是税务发票。清洁日历只是计划到离，列表只是当前清洁状态，不冒充历史派工记录。
- 本批未实现行保持缺失/部分；尤其餐食核销、失败预订统一列表、完整经营会计报表仍待后续。没有新增运行时模块、修改部署工作流或接触真实业务记录。

复现：`npm test --prefix pms`；`python3 -m unittest discover -s pms/test -p 'test_*.py' -v`；`node pms/verification/dom-parity-workbench.mjs /tmp/pms-verification-deps/node_modules/jsdom/lib/api.js`。全部DOM脚本另逐个执行，folio附加`--lines`与`--amend`分支。部署及公网GET证据见continuity/VERIFICATION.md本批章节。

## 客户、统计与账簿续跑（2026-11-11）

本批新增逻辑仅并入既有server/store.js、src/demo-store.js、src/financial-reports.js、web/app.js、web/workspace-ui.js及既有打印CSS；未改发布流程、claims表或既有账号/数据。新增测试与DOM文件不参与运行时部署。

独立客户档案、归属快记账、物品费用、小时预订均追加版本或事件，门店隔离/管理员设置/服务端权限/revision/幂等保留；客户/统计查询不写审计。营业日费用与马来西亚自然日交易、创建和实际完成时间分列，未知旧字段留空。全部升级行的复现与边界见customer-statistics-audit.md，部署与公网证据见continuity/VERIFICATION.md本批章节。

## 小时库存与前台内部能力续跑（2026-11-11）

保留并补完三份中断未提交改动。运行逻辑只并入7份既有runtime文件，未新增runtime模块或修改发布工作流。SQLite claims沿用原表/唯一键，将内部night键表示为YYYY-MM-DD@HH；旧普通住宿/整日小时订单/关房占全天24槽，新小时订单只占指定槽。在下一次成功业务事务内按完整状态重建该门店claims，不重置账号、订单或资金。新增v10写入保护阻止不理解小时库存的旧运行时写入，旧代码回滚只读不等于可写回滚。

本地Node560/560、Python5/5、DOM31/31，含新desk-completion、原front-desk-tools及trial-signup/workflows、folio两分支。日库存同一资源的相邻小时订单去重；到店数仍按订单数。小时费保留在营收，过夜房晚不计小时单。详见desk-completion-audit.md，部署GET证据见continuity/VERIFICATION.md本批章节。

## 内部显示、来源、权限与交班报表续跑（批次08，2026-11-11）

基线42e9a1e；运行时609de42。本块12条部分提升：1.4、2.1、2.5、3.1、4.12、6.8、6.9、7.14、7.19、7.21、7.24、9.2。当前91/8/0/15，合计114。已有仅指逐行明确的内部范围，外部能力状态如实保留。

Linux Node574/574、Python5/5；30个dom-*.mjs加communications-dom及folio两分支，共33/33。37个runtime JS及6个shell语法、diff检查通过；最后账项筛选修正后重跑全Node及internal-display/operations-completion DOM通过。逻辑并入5份既有runtime文件，未改发布工作流或数据结构，不重置数据。复现及保护见internal-display-audit.md；Actions及公网证据见continuity/VERIFICATION.md最新节。

继续优先：3.4内部Booking Engine状态/准备视图，4.5住宿More安全操作说明，9.23安全准备入口。其余3.2倍率、3.3未核验汇率、3.7公开订阅、9.12门锁、9.15外部自助入住仍部分，不能用内部预览替代真实接通。

## 内部Booking Engine准备与住宿More续跑（批次09，2026-11-11）

运行时39e3a70；新增3.4、4.5、9.23由部分提升已有。相对42e9a1e累计完成15条：1.4、2.1、2.5、3.1、3.4、4.5、4.12、6.8、6.9、7.14、7.19、7.21、7.24、9.2、9.23。最终**已有94、部分5、缺失0、禁止或需外部接入15**，合计114；已有只指逐行明确的内部范围，不声称供应商产品完全同构。

本批只读逻辑并入3个既有runtime文件；本地Node586/586、Python5/5、31个dom-*.mjs加communications-dom和folio两分支共34/34，37个JS及6个shell语法与diff检查通过。旧booking-engine“无表单”断言更新为仅允许一个只读覆盖查询，并实际提交确认revision仍0；完整回归其余33分支通过、该脚本重跑通过。复现及边界见booking-preparation-audit.md；部署和GET证据见continuity/VERIFICATION.md。

### 剩余5项逐项处置与下一优先

| 行 | 保留部分的实际原因 | 后续条件 |
|---|---|---|
| 3.2 | 用户明确禁止编辑划线倍率，现有来源启停/佣金不是该能力。 | 不实施；维持只读与禁止边界。 |
| 3.3 | 未取得已核验汇率来源；现有账项仍MYR，不编造换算。 | 有可核验来源且获得相应范围后再评估；本次不接外部服务。 |
| 3.7 | 已有匿名ICS文件导出；公开订阅URL/服务尚无，内部下载不等于订阅。 | 外部订阅服务及可见性、撤销/访问策略另行明确；本次不建立外部接入。 |
| 9.12 | 只有未开通状态列表，无已验供应商/硬件。 | 不购买、远程开门或生成/发送密码。 |
| 9.15 | 内部入住指引/只读预览已有；真正外部自助入住未验。 | 不生成/发送代码、不提交身份；保留人工入住。 |

没有把剩余禁止/外部依赖改名为已有，也没有删除部分行以改变总数。下一优先为内部显示与报表真实使用反馈、小时claims规模/性能验收及既有保护回归；上述5项在当前授权边界内继续不实施。

批次09部署：Actions42948038133 Verify/Deploy成功；公网GET /healthz精确正常，26/26公开模块200且与本地逐字节一致，新准备检查/More标识全部命中，/server/store.js=404。见booking-preparation-live.json；公网未登录或写业务。
