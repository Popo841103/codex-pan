# SmartOrder 权限目录与财务能力面（2026-11-07 实读）

**来源与方法（先看这段，它决定这些结论的证据等级）**

- 参考产品的后台是 Vue 3 单页应用，入口 `https://www.smartorder.ai/pmsManage/index`，主包与异步分包都是**公开静态资源**：任何浏览器第一次打开登录页就会把这些 JS 下载到本地。本文件的内容就是读这些公开文件得到的，没有绕过登录、没有调用任何鉴权后的接口、没有接触服务端二进制。
- 因此**不需要 IDA / Ghidra 这类反汇编工具**：这类工具针对分发的机器码（桌面程序、移动 App、固件）。Web SaaS 的服务端代码从不发给浏览器，能读到的只有前端；而前端本来就含路由、i18n 文案、接口路径与权限键——对「行为对齐」来说，这些比反汇编更有用。
- 本目录抓取时点：主包 `pms-master/2026-11-05/index.e060fc5576f8253d1071.bundle.js`（16.7 MB 未压缩），权限词表在分包 `786.js`。权限键在运行时由服务端 `POST /v2/auth/web/auth/getAllFnWithRelByUserId` 下发「功能点 + 是否勾选」，前端的 `v-permission` 指令按 `window.__PMS_PERMISSIONS__` 判权——**即：权限点是服务端定义的，前端只是使用与展示**。下表是前端词表里的全部 307 个 `auth.*` 键及其中文界面名。
- 证据等级：**实见**（读到的公开文件内容）。不含服务端实现、数据库结构、结算算法。下文凡推断处均标注。

## 一、这套权限模型长什么样（实见）

| 维度 | 参考产品 | 我们（`da81383` 之后） |
|---|---|---|
| 角色 | 门店可自定义角色（`setting.role[新增角色]`），系统预置部分角色可改 | 已一致：`role_definitions`，内置四角色 + 门店自定义 `role-*` |
| 权限粒度 | 307 个功能点，按菜单树勾选 | 63 个动作，按 13 个模块勾选 |
| 附加权限 | `setting.account[附加额外权限]` | 已一致：`member_permissions` |
| 判权位置 | 前端 `v-permission` + 服务端接口 | 服务端 `permissionsFor()` 唯一来源（更严：前端只是展示） |
| 敏感权限 | 单独一层 `auth.sensitive.*`（支付、下载全量导出、首页数据） | **缺** |

## 二、307 个权限点全清单（实见，按前缀分组）

### `auth.Agoda` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Agoda` | Agoda |

### `auth.Airbnb` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Airbnb` | Airbnb |

### `auth.BE` （4 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.BE.cancel.reservation` | 取消订单 |
| `auth.BE.payment` | 支付设置 |
| `auth.BE.refund` | 订单退款 |
| `auth.BE.view.reservation` | 查看营销订单 |

### `auth.Booking` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Booking.com` | Booking.com |

### `auth.Expedia` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Expedia` | Expedia |

### `auth.Hostelworld` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Hostelworld` | Hostel World |

### `auth.Klook` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Klook` | Klook |

### `auth.Neppan` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Neppan` | Neppan |

### `auth.Tiket` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Tiket.com` | Tiket.com |

### `auth.Traveloka` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Traveloka` | Traveloka |

### `auth.Trip` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.Trip.com` | Trip.com |

### `auth.accommodation` （8 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.accommodation` | 住宿管理 |
| `auth.accommodation.business.summary` | 营业额汇总 |
| `auth.accommodation.calendar` | 房态管理 |
| `auth.accommodation.meal` | 餐食管理 |
| `auth.accommodation.other` | 其他 |
| `auth.accommodation.payment` | 住宿订单收银 |
| `auth.accommodation.rate` | 房价管理 |
| `auth.accommodation.settle` | 住宿订单结账 |

### `auth.add` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.add.account` | 添加账号 |
| `auth.add.customer` | 添加客户 |

### `auth.ai` （5 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.ai` | AI |
| `auth.ai.credit` | AI算力 |
| `auth.ai.credit.authorize` | 算力授权 |
| `auth.ai.credit.topup` | 算力充值 |
| `auth.ai.pricing` | 智能定价 |

### `auth.all` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.all.selected` | 全选 |

### `auth.analytics` （6 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.analytics` | 统计分析 |
| `auth.analytics.accommodation.report` | 住宿报表 |
| `auth.analytics.data.center` | 数据中心 |
| `auth.analytics.export` | 导出 |
| `auth.analytics.finance.report` | 财务报表 |
| `auth.analytics.revenue.report` | 经营报表 |

### `auth.ar` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.ar.account` | AR账 |
| `auth.ar.transfer` | AR账转账 |

### `auth.audit` （12 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.audit` | 夜审 |
| `auth.audit.acco` | 执行夜审操作 |
| `auth.audit.bulk` | 历史批量夜审 |
| `auth.audit.collect.payment` | 允许对完成订单收银 |
| `auth.audit.frontdesk` | 前台夜审 |
| `auth.audit.modify.res` | 允许修改已夜审订单 |
| `auth.audit.sensitive.permission` | 敏感权限 |
| `auth.audit.setting` | 夜审设置 |
| `auth.audit.switch` | 夜审功能开关设置 |
| `auth.audit.undo.data` | 撤销夜审数据 |
| `auth.audit.view.record` | 夜审记录 |
| `auth.audit.view.unsettle.res` | 本年度未结清订单 |

### `auth.bulk` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.bulk.update.room.rate` | 批量改价 |

### `auth.business` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.business.indicator` | 经营指标 |
| `auth.business.summary` | 营业汇总 |

### `auth.calendar` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.calendar.share` | 房态分享 |

### `auth.cancel` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.cancel.payment` | 撤销收银 |
| `auth.cancel.reservation` | 取消订单 |

### `auth.catering` （35 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.catering` | 餐饮 |
| `auth.catering.add.order` | 新增餐饮订单 |
| `auth.catering.calendar` | 桌态 |
| `auth.catering.cancel.order` | 餐饮取消预订 |
| `auth.catering.daily.report` | 餐饮详细日报表 |
| `auth.catering.dish.summary` | 菜品统计汇总表 |
| `auth.catering.exception.report` | 菜品异常明细表 |
| `auth.catering.menuitem.inventory` | 餐饮菜品沽清 |
| `auth.catering.order.list` | 餐饮菜品预订列表 |
| `auth.catering.order.manage` | 餐饮订单管理 |
| `auth.catering.payment.order` | 餐饮订单收银 |
| `auth.catering.post.account` | 餐饮挂账 |
| `auth.catering.print.order` | 餐饮订单打印 |
| `auth.catering.reject.order` | 餐饮入厨/拒绝 |
| `auth.catering.report` | 餐饮报表 |
| `auth.catering.restore.order` | 餐饮恢复预订 |
| `auth.catering.resume.dine` | 餐饮恢复用餐 |
| `auth.catering.revenue.summary` | 餐饮营业日收入汇总表 |
| `auth.catering.revoke.cook` | 餐饮撤销入厨 |
| `auth.catering.set.summary` | 套餐统计汇总表 |
| `auth.catering.setting` | 餐饮设置 |
| `auth.catering.setting.add.dish` | 新增/编辑菜品 |
| `auth.catering.setting.discount` | 餐饮价格优惠设置 |
| `auth.catering.setting.dish.category` | 菜品分类管理 |
| `auth.catering.setting.order` | 餐饮订单功能设置 |
| `auth.catering.setting.print` | 餐饮打印设置 |
| `auth.catering.setting.restaurant` | 餐厅管理 |
| `auth.catering.setting.rule` | 餐饮默认规则设置 |
| `auth.catering.setting.scan` | 餐饮扫码下单配置 |
| `auth.catering.setting.table` | 桌位管理 |
| `auth.catering.setting.view.dish` | 查看菜品 |
| `auth.catering.settle.order` | 餐饮订单结账 |
| `auth.catering.statistics.dish` | 菜品统计 |
| `auth.catering.statistics.restaurant` | 餐厅统计 |
| `auth.catering.view.order` | 查看餐饮订单 |

### `auth.change` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.change.room` | 入住中换房 |

### `auth.channel` （8 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.channel` | 渠道 |
| `auth.channel.BE` | 营销系统 |
| `auth.channel.OTA` | OTA渠道 |
| `auth.channel.currency.conversion` | 渠道币种转换 |
| `auth.channel.iCal` | iCal |
| `auth.channel.set.OTA.connect` | 设置渠道直连 |
| `auth.channel.summary` | 渠道汇总 |
| `auth.channel.view.OTA.connect` | 查看渠道直连 |

### `auth.checkin` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.checkin` | 办理入住 |

### `auth.checkout` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.checkout` | 办理退房 |

### `auth.company` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.company.customer` | 企业客户 |
| `auth.company.stored.value` | 企业储值管理 |

### `auth.custom` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.custom.rate` | 自定义房价（创建订单时） |

### `auth.customer` （4 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.customer` | 客户管理 |
| `auth.customer.blacklist` | 黑名单管理 |
| `auth.customer.list` | 客户列表 |
| `auth.customer.tags` | 标签管理 |

### `auth.delete` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.delete.account` | 删除账号 |
| `auth.delete.role` | 删除角色 |

### `auth.detail` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.detail.summary` | 流水汇总 |

### `auth.edit` （13 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.edit.account.authority` | 修改账号权限 |
| `auth.edit.ar.account` | 新增/编辑AR账户 |
| `auth.edit.calendar` | 修改房态 |
| `auth.edit.company.customer` | 增删/编辑企业客户 |
| `auth.edit.contact` | 编辑预定人 |
| `auth.edit.customer` | 修改客户资料 |
| `auth.edit.item` | 添加/删除消费项 |
| `auth.edit.lock.passcode` | 添加/重置/发送门锁密码 |
| `auth.edit.note` | 编辑备注 |
| `auth.edit.reminder` | 编辑订单提醒 |
| `auth.edit.role` | 新增/编辑角色 |
| `auth.edit.roomcard` | 制卡/销卡/读卡 |
| `auth.edit.special.color` | 更改订单特殊色 |

### `auth.enable` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.enable.ar.account` | 停用/启用AR账户 |

### `auth.export` （8 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.export.accommodation.reservation.details` | 导出住宿订单明细 |
| `auth.export.ar.transaction` | 导出AR账务明细 |
| `auth.export.company.customer` | 企业客户数据导出 |
| `auth.export.customer` | 导出客户信息 |
| `auth.export.data.detail` | 导出数据中心明细 |
| `auth.export.report.detail` | 导出报表明细 |
| `auth.export.reservation` | 导出订单 |
| `auth.export.room.rate.history` | 导出改价记录数据 |

### `auth.extend` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.extend.stay` | 续住 |

### `auth.freeze` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.freeze.room` | 锁定房间 |

### `auth.frontdesk` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.frontdesk.charge` | 前台收支 |

### `auth.housekeeping` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.housekeeping.notification` | 保洁通知 |
| `auth.housekeeping.setting` | 保洁设置 |

### `auth.hskp` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.hskp.calendar` | 保洁日历 |
| `auth.hskp.task` | 任务列表 |

### `auth.ical` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.ical` | iCal |

### `auth.id` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.id.reader` | 证件阅读器设置 |

### `auth.im` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.im` | OTA在线消息 |

### `auth.integration` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.integration` | 第三方集成 |

### `auth.makeup` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.makeup.accommodation.reservation` | 补录住宿订单 |

### `auth.manage` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.manage.account` | 停用/启用账号 |
| `auth.manage.customer.tag` | 创建/编辑标签 |

### `auth.meal` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.meal.check` | 餐食核销 |

### `auth.memo` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.memo` | 备忘录 |

### `auth.modify` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.modify.reservation` | 修改住宿订单 |

### `auth.move` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.move.into.reservation.box` | 移入订单盒子 |
| `auth.move.out.reservation.box` | 移出订单盒子 |

### `auth.new` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.new.accommodation.reservation` | 创建住宿订单 |
| `auth.new.reservation` | 快速下单 |

### `auth.payment` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.payment` | 收银 |

### `auth.print` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.print.accommodation.reservation` | 住宿订单打印 |

### `auth.property` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.property.info` | 门店信息 |

### `auth.quick` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.quick.note` | 记一笔记账 |
| `auth.quick.note.summary` | 记一笔汇总 |

### `auth.rakuten` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.rakuten` | Rakuten Travel |

### `auth.rate` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.rate.multiplier` | 价格比例 |

### `auth.reconcile` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.reconcile.ar` | AR账核销 |
| `auth.reconcile.company.ar` | 企业客户账务核销 |

### `auth.remote` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.remote.open.door` | 远程开门 |

### `auth.report` （45 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.report.accrual.operate` | 权责制营业报表 |
| `auth.report.annual.business.summary` | 客房营业年度汇总表 |
| `auth.report.ar.aging` | AR账龄表 |
| `auth.report.ar.balance` | AR账户余额表 |
| `auth.report.ar.post.detail` | AR挂账明细表 |
| `auth.report.ar.reco.detail` | AR核销明细表 |
| `auth.report.ar.reco.transaction` | AR核销流水表 |
| `auth.report.channel` | 渠道分析表 |
| `auth.report.checkout` | 每日退房明细表 |
| `auth.report.commission` | 佣金明细表 |
| `auth.report.company.deduction.detail` | 企业抵扣明细表 |
| `auth.report.company.topup` | 企业充值明细表 |
| `auth.report.finance.adjust` | 调账明细表 |
| `auth.report.guest.account.balance` | 宾客账结余明细表 |
| `auth.report.guest.detail` | 房间入住人明细表 |
| `auth.report.guest.details` | 房间入住人明细表 |
| `auth.report.guest.form` | 入住登记表 |
| `auth.report.guest.payment.balance` | 宾客账结余明细表 |
| `auth.report.guest.payment.detail` | 宾客账明细表 |
| `auth.report.guest.payment.summary` | 宾客账汇总表 |
| `auth.report.guest.payment.unsettled` | 未结宾客账明细表 |
| `auth.report.ledger.detail` | 台账明细表 |
| `auth.report.log.cancel.res` | 异动记录表-取消预订 |
| `auth.report.log.change.room` | 异动记录表-入住中换房 |
| `auth.report.log.drag` | 异动记录表-拖拽换房 |
| `auth.report.log.early.checkout` | 异动记录表-提前退房 |
| `auth.report.log.edit.room` | 异动记录表-编辑房间 |
| `auth.report.log.late.checkout` | 异动记录表-延迟退房 |
| `auth.report.log.moveinto.box` | 异动记录表-移入订单盒 |
| `auth.report.log.moveout.box` | 异动记录表-移出订单盒子 |
| `auth.report.log.restore.res` | 异动记录表-恢复预订 |
| `auth.report.log.undo.checkin` | 异动记录表-撤销入住 |
| `auth.report.log.undo.checkout` | 异动记录表-撤销退房 |
| `auth.report.manager.daily` | 经理日报表 |
| `auth.report.others` | 客房其他消费明细表 |
| `auth.report.payment.record` | 收银明细表 |
| `auth.report.quick.note` | 记一笔明细表 |
| `auth.report.room.penalty` | 客房违约金明细表 |
| `auth.report.room.penalty.detail` | 客房违约金明细表 |
| `auth.report.room.summary` | 客房营业汇总表 |
| `auth.report.roomrate.detail` | 房费明细表 |
| `auth.report.settle.detail` | 订单结账明细表 |
| `auth.report.shift.handover` | 交班报表 |
| `auth.report.transactions` | 常规流水明细表 |
| `auth.report.transactions.summary` | 流水汇总表 |

### `auth.res` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.res.adjust` | 订单调账 |

### `auth.reservation` （3 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.reservation` | 订单管理 |
| `auth.reservation.accommodation` | 住宿 |
| `auth.reservation.general` | 通用 |

### `auth.restore` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.restore.reservation` | 恢复预订 |

### `auth.revoke` （3 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.revoke.checkin` | 撤销入住 |
| `auth.revoke.checkout` | 撤销退房 |
| `auth.revoke.settle` | 撤销结账 |

### `auth.room` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.room.status` | 房态表 |
| `auth.room.type` | 房型 |

### `auth.sales` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.sales.summary` | 销售汇总 |

### `auth.sensitive` （6 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.sensitive` | 敏感权限 |
| `auth.sensitive.data` | 数据 |
| `auth.sensitive.download.data` | 下载全部导出数据 |
| `auth.sensitive.homepage.data` | 查看首页数据（含App） |
| `auth.sensitive.integration.payment` | 第三方支付平台 |
| `auth.sensitive.payment` | 支付 |

### `auth.setting` （33 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.setting.IM.scheduled` | 自动化消息记录 |
| `auth.setting.IM.translator` | 在线消息翻译 |
| `auth.setting.accommodation.rule` | 住宿默认规则设置 |
| `auth.setting.auto.frontdesk` | 前台自动化 |
| `auth.setting.calendar` | 房态功能设置 |
| `auth.setting.channel` | 渠道设置 |
| `auth.setting.channelIM` | IM入口 |
| `auth.setting.check.in` | 入住设置 |
| `auth.setting.customer.tag` | 设置标签 |
| `auth.setting.entire.home` | 包栋设置 |
| `auth.setting.group` | 房间分组设置 |
| `auth.setting.holiday` | 节假日设置 |
| `auth.setting.hourly.room` | 钟点房设置 |
| `auth.setting.im.notify` | IM通知 |
| `auth.setting.item` | 消费项设置 |
| `auth.setting.item.category` | 消费项分类设置 |
| `auth.setting.keycard` | 房卡管理 |
| `auth.setting.lock` | 门锁设置 |
| `auth.setting.meal` | 餐食设置 |
| `auth.setting.notification` | 通知设置 |
| `auth.setting.payments` | 收款方式设置 |
| `auth.setting.pricing.tool` | 定价工具 |
| `auth.setting.print.shift` | 交接班打印设置 |
| `auth.setting.quick.note` | 记一笔设置 |
| `auth.setting.quick.reply` | 快捷回复 |
| `auth.setting.rate.discount` | 价格优惠设置 |
| `auth.setting.reservation` | 订单功能设置 |
| `auth.setting.reservation.box` | 订单盒子设置 |
| `auth.setting.reservation.rule` | 渠道订单规则 |
| `auth.setting.room` | 房间设置 |
| `auth.setting.shift` | 班次设置 |
| `auth.setting.smart.lock` | 门锁设置 |
| `auth.setting.sort` | 排序设置 |

### `auth.settings` （8 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.settings` | 设置 |
| `auth.settings.accommodation` | 住宿设置 |
| `auth.settings.account` | 账号设置 |
| `auth.settings.check.in` | 入住设置 |
| `auth.settings.finance` | 财务设置 |
| `auth.settings.general` | 通用设置 |
| `auth.settings.housekeeping` | 保洁设置 |
| `auth.settings.integration` | 第三方集成 |

### `auth.settle` （6 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.settle` | 结账 |
| `auth.settle.checkout.bill` | 账单结账 |
| `auth.settle.split.bill` | 拆账 |
| `auth.settle.statement` | 账单结账 |
| `auth.settle.undo.checkout.bill` | 撤销结账 |
| `auth.settle.undo.split.bill` | 撤销拆账 |

### `auth.shift` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.shift.handover` | 交接班 |
| `auth.shift.record` | 交接班记录 |

### `auth.temairazu` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.temairazu` | Temairazu |

### `auth.tujia` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.tujia` | TuJia |

### `auth.undo` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.undo.ar` | AR账撤销核销 |

### `auth.update` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.update.room.rate` | 修改房价 |

### `auth.view` （24 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.view.accommodation.failed.reservation` | 查看失败订单 |
| `auth.view.accommodation.reservation` | 查看住宿订单 |
| `auth.view.account.list` | 查看账号列表 |
| `auth.view.ar.account` | 查看AR账户 |
| `auth.view.ar.transaction` | AR账务查看 |
| `auth.view.calendar` | 查看房态 |
| `auth.view.calendar.log` | 查看房态操作日志 |
| `auth.view.calendar.summary` | 查看房情表 |
| `auth.view.company.customer` | 查看企业客户 |
| `auth.view.company.res` | 企业客户查单 |
| `auth.view.credit.card` | 查看客人信用卡 |
| `auth.view.customer.detail` | 查看客户详情 |
| `auth.view.customer.list` | 查看客户列表 |
| `auth.view.customer.reservation` | 查看客户订单 |
| `auth.view.customer.tag` | 查看标签 |
| `auth.view.lock.list` | 查看门锁列表 |
| `auth.view.reservation` | 查看订单 |
| `auth.view.reservation.logs` | 查看订单操作日志 |
| `auth.view.reservation.notification` | 查看订单通知 |
| `auth.view.role` | 查看角色 |
| `auth.view.room .rate.history` | 查看改价记录 |
| `auth.view.room.rate` | 查看房价 |
| `auth.view.roomcard.list` | 查看房卡列表 |
| `auth.view.statement` | 查看账单 |

### `auth.wallet` （2 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.wallet.payout` | 钱包提现 |
| `auth.wallet.view` | 查看钱包 |

### `auth.xiaozhu` （1 项）

| 权限键 | 界面名称 |
|---|---|
| `auth.xiaozhu` | Xiao Zhu |

## 三、财务域的真实形态：不是「银行对账」，是 AR 挂账 + 核销 + 报表（实见）

上一轮我们把「对账单结算 / 银行对账」当成了两个功能去猜。读完权限目录后要纠正：参考产品这一块是**应收（AR）账体系**，权限键里根本没有 bank / reconcile-bank 之类的东西，`reconcile` 只有两条，都是 AR：

| 权限键 | 界面名称 |
|---|---|
| `auth.reconcile.ar` | AR账核销 |
| `auth.reconcile.company.ar` | 企业客户账务核销 |
| `auth.ar.account` / `auth.ar.transfer` | AR账 / AR账转账 |
| `auth.edit.account` / `auth.view.account` / `auth.view.transaction` | 新增/编辑 AR 账户 / 查看 AR 账户 / AR 账务查看 |
| `auth.export.transaction` | 导出 AR 账务明细 |
| `auth.company.customer` / `auth.company.stored.value` | 企业客户 / 企业储值管理 |
| `auth.wallet.view` / `auth.wallet.payout` | 查看钱包 / 钱包提现 |
| `auth.settle` / `auth.settle.checkout.bill` / `auth.settle.split.bill` | 结账 / 账单结账 / 拆账 |
| `auth.settle.undo.checkout.bill` / `auth.settle.undo.split.bill` | 撤销结账 / 撤销拆账 |
| `auth.frontdesk.charge` | 前台收支 |
| `auth.report.ar.aging` / `.balance` / `.post.detail` / `.reco.detail` / `.reco.transaction` | AR 账龄表 / AR 账户余额表 / AR 挂账明细表 / AR 核销明细表 / AR 核销流水表 |
| `auth.report.company.deduction.detail` / `.topup` | 企业抵扣明细表 / 企业充值明细表 |
| `auth.report.finance.adjust` / `.guest.account.balance` / `.accrual.operate` | 调账明细表 / 宾客账结余明细表 / 权责制营业报表 |

**银行流水导入 / 银行对账：在这 307 个权限点里没有对应项。** 全文搜索「银行」只出现在两处，都不是对账：客人资料里的「银行卡信息」（`accommodation.calendar.overview.order[银行卡信息]`），以及房东提现流程里的收款账户登记（`host.payout[对公银行账户]` / `[对私银行账户]` / `[银行：]` / `[账户类型]`）。也就是说，参考产品与银行有关的只有「提现打到哪个账户」，**没有银行流水导入、没有流水配对、没有银行对账**（实见的否定结论）。

若运营方要的是银行流水核对，那属于参考产品之外的自定义需求，必须先拿到真实流水样本（银行导出的 CSV/Excel 列结构）再设计，不能靠猜。

## 四、和我们现有能力的差距（按用户问的「你还没完成什么」）

| 缺口 | 参考产品对应权限点 | 我们的状态 |
|---|---|---|
| 拆账 / 撤销拆账 / 账单级结账 / 撤销结账 | `auth.settle.split.bill` 等 5 项 | **无**。现在只有单笔 `settle` 与 `reopen_folio` |
| AR 账户（挂账主体）、余额、账户间转账 | `auth.ar.account` / `auth.ar.transfer` / `auth.view.transaction` | **无**。目前只有订单级应收，没有「客户挂账账户」这一层 |
| AR 核销、企业客户账务核销、核销流水 | `auth.reconcile.ar` / `auth.reconcile.company.ar` / `auth.report.ar.reco.transaction` | **无** |
| 企业客户、企业储值、充值/抵扣明细 | `auth.company.*` / `auth.report.company.*` | **无**（客户档案只有住客维度） |
| 钱包（余额、提现） | `auth.wallet.*` | **无**，且无支付通道，暂不建议做 |
| 财务报表 8 张（账龄、余额、挂账明细、核销明细/流水、调账、宾客账结余、权责制） | `auth.report.ar.*` 等 | **部分**。已有佣金明细、经理日报、住宿类报表，缺 AR 全系与调账 |
| 夜审细粒度（12 项：执行/批量/前台/撤销/开关/设置/记录/未结清/允许改已夜审/允许对完成单收银/敏感） | `auth.audit.*` | **粗**。只有一个 `night_audit` 动作，没有「允许修改已夜审订单」这类可分配例外 |
| 敏感权限层（支付、下载全量导出、首页数据） | `auth.sensitive.*` | **无** |
| 前台收支（非订单的现金进出） | `auth.frontdesk.charge` | **无**（只有订单收退款与交班盘点） |

**不是缺口的**：角色自定义、模块勾选、附加额外权限、账号列表/角色列表/查看权限这些，`da81383` 已与参考产品机制对齐，不必再做。

## 五、给下一步的建议顺序（推断，供用户定）

1. **拆账 + 账单级结账/撤销**（`auth.settle.*` 5 项）——纯账务重构，风险集中在我们自己的账页，不依赖外部。
2. **AR 账户 + 挂账 + 核销**（`auth.ar.*` / `auth.reconcile.*`）——这才是「对账单」的实体；有了账户与核销，报表才有意义。
3. **财务报表 8 张**——数据来自 1、2，做完自动可出。
4. **夜审权限细化 + 敏感权限层**——纯权限工作，一天量级。
5. 企业客户/储值、钱包、前台收支，看商业需要再定；银行流水核对属参考产品没有的自定义需求，等用户给格式。

## 六、合规边界（写给自己和接手方的提醒）

- 读公开静态资源用于「理解行为、写自己的实现」可以；**不要把这些 JS 直接搬进我们仓库**，也不要反编译/破解服务端、不要绕过鉴权。本文件只保留事实性清单（键名与界面名），不含任何代码。
- 参考产品的界面文案、图标、代码版权归其所有。我们的实现必须是自己的：同样的行为，自己的代码。
