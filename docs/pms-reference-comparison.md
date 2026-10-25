# CO-HUB PMS 参考系统初步比较

查阅日期：2026-10-15。仅检查公开官网，未登录用户的SmartOrder后台；未取得任何正式API账号或测试写权限。

## 建议

以用户熟悉的SmartOrder业务流程作为交互参考，自行实现CO-HUB PMS；将渠道连接做成独立适配层，NoBeds作为候选。先核实价格和API，避免为了省房间月费，反而承担更高API月费及维护成本。

## SmartOrder公开信息

- https://www.smartorder.ai/pricing/ ：Essential前台、基础报表、手机端和客户管理显示免费；OTA Channel & Booking Engine等增值按room收费，动态报价依地区、房数等变化，抓取文本未得到可靠金额。须对照用户账单，分清PMS、渠道、门锁等收费。
- https://www.smartorder.ai/front-desk/ ：公开介绍房态日历、订单、实时房态和多房源日历；不等于已验证床位细节。
- https://www.smartorder.ai/channel-manager/ ：宣传渠道库存/价格/预订同步。
- 登录页 https://www.smartorder.ai/pmsManage/login 只是前端入口，无法据此判断后台换床、退款、库存规则。
- 未找到足以确认可向第三方自建PMS提供渠道API的公开合同/API资料，不能断言支持或不支持。

## NoBeds公开信息与冲突

- https://nobeds.com/ ：Free €0/月，最多10rooms、3channels、10分钟同步；Premium €15/月，1hotel、unlimited properties、最多30channels、1分钟同步；API €99/月，含Premium、up to 1,000 properties per subscription。
- https://nobeds.com/api/ ：宣传作为自建软件连接Booking.com/Airbnb/Expedia/Trip.com/Agoda等的中间层，创建订单、库存、价格、消息、webhooks和white label；开发API标价$99/month per property。
- 上述货币和property计费含义明显冲突，必须书面确认“property”是门店、房源/房间还是账户，是否包含OTA与API、税费、多店授权及额外收费。
- /prices/与/api/openapi.json本次HTTP403，无法验证正式报价/完整接口契约，公开营销描述不等于已完成API验证。
- 不承诺实时同步绝不超卖。需要验证双向创建/修改/取消、重复及乱序事件、床位映射、限流、断线重试、库存对账。分配床位和换床先由自建PMS管理，OTA按房型/床位库存映射，验证渠道实际能力。

## 下一步证据

用户提供匿名SmartOrder账单、常用房态/分床/换床/退房录屏或截图；不索取正式密码或客人敏感信息。向NoBeds确认开发商/白标使用权限及明确报价，再用测试房源做API闭环验证。自建代码和数据结构独立，不复制专有源码、品牌或素材。
