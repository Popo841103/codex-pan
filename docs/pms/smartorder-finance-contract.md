# SmartOrder 财务契约与 JOVIAN 差距 — 2026-11-07

审查基线 JOVIAN `def78ec67da86abe2e60ce8653029f0d4a2e199c`。这是证据登记和实现边界，未取到的字段不作为规格。交接记录的测试基线为 Node 408、Python 5、DOM 19，本轮未重跑。

| 业务 | SmartOrder 证据 | JOVIAN 源码实见 | 缺口 |
|---|---|---|---|
| 拆账、账单结账与撤销 | 权限目录记录 `auth.settle.split.bill`、`auth.settle.checkout.bill`、`auth.settle.undo.checkout.bill`、`auth.settle.undo.split.bill` | `settle` 与 `reopen_folio`，现有权限目录无专用拆账动作 | 子账单、分配、独立结账和可追溯冲销 |
| AR 挂账与核销 | 目录记录 `auth.reconcile.ar`、`auth.reconcile.company.ar`、`auth.undo.ar` | 现有资金动作覆盖收付、结账、差异审批和佣金记录 | AR 账户、开放应收、收款分配、账户转账与撤销核销 |
| AR 报表 | 目录记录 `auth.report.ar.aging`、`.balance`、`.post.detail`、`.reco.detail`、`.reco.transaction` | 已有经理日报、宾客账余额及住宿报表 | AR 五张报表缺底账。调账明细、宾客账结余明细与权责制营业报表需逐列核对历史截点、日期口径和下钻，避免重复建设 |

| 接口 | 来源 | 方法、字段、类型、必填、枚举、错误码 |
|---|---|---|
| `/v2/core/web/arAccount/charge/writeOff` | WorkBuddy 交接提供的路径，本轮未独立复验请求 | 未验证 |
| 拆账、撤销、转 AR、账户转账、报表 | 权限目录可用于定位菜单 | 路径及请求响应均待取证 |

字段字典待补：账单及分配行标识、父单关联、币种与金额单位、账单与核销状态、原记录与冲销关联、AR 到期日、收款与应收的分配金额、差异原因、报表截点。以上是调查字段类别，不是 SmartOrder 已证实字段名。

JOVIAN 设计推断：拆账后金额守恒、子账单独立结账、撤销追加冲销、押金独立核算、门店隔离、幂等及 revision 并发控制。AR 默认 FIFO 按到期日并允许手工指定，差异不自动调账。账期采用马来西亚自然月，冻结边界建议用下月首日零时的排他上界，避免遗漏毫秒记录。这些是 JOVIAN 口径，不能引用为参考产品实见。

未验证：真实拆账、核销页面和业务转换，全部接口字典、客户端三端静态结果。当前环境未发现 REA 专用工具，PATH 未找到 rea、jadx、apktool、7z。权限目录属于已入库观察记录；241 条接口数量来自交接，当前树未发现对应完整契约文件。银行对账不纳入本批，权限目录的缺项不足以证明参考产品全局没有该功能。
