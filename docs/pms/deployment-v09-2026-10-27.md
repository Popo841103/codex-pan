# 0.9已部署独立PMS测试服务（2026-10-27）

入口：https://pms.jovianhome.com/web/ 。选店后顶部有“OTA客人聊天”“技术客服”“帮助中心”“自助入住”。原账号、会话及数据库沿用，未重新初始化，用户无需下载上传或再次配置SSH。

## 发布证据

- 分支：`jovian-pms-test`。
- 代码提交：`6486e490296048a21338688c74c485b88780a4a6`；tree `fa49decea60d0516682b37195658f14239ea27c9`；父提交为此前0.8文档收尾`dc359ee286f7c86a18fb3f24862068dc10f72e6d`。
- [GitHub Actions运行40507101194](https://github.com/Popo841103/codex-pan/actions/runs/40507101194)，任务122199081075：验证、部署配置和**实际部署步骤全部success**。
- CI再次确认123项Node、5项Python测试通过；本地另有27运行JS及shell语法、两套进程内DOM通过。精确运行包经可信提取器试解，包含嵌套二维码文件。
- 更新器报告备份目录：`/var/backups/jovian-pms-test/update-iRjmvrYL`，数据库备份`jovian.sqlite`。仍使用既有Node24和root受限接收器，未替换可信部署脚本。
- main保持`f6a5f5e6a5d96c8f750677907ade53b89761b879`，旧部署分支保持`5dfc05f47c2e7c48dd1f790e9806752e572aeb2f`；CO-HUB网站文件不在本次改动中。提交树111个选定文件哈希核对一致，未选定的基线文件保持。

## 公网只读核验

[详细状态与SHA256证据](deployment-v09-public-checks-2026-10-27.json)。北京时间/马来西亚时间2026-10-27约20:52核验：

- mode实际返回`0.9.0 / shared-development`，healthz健康且标记test-only，PWA manifest为standalone。
- `/web/`、`/checkin/`和17个脚本/CSS共19文件与本地发布逐字节SHA256一致；包括客服、登记、QR模块和既有日历/多房核心。
- 匿名state、support、guest-messages、checkin-admin及self-checkin/session均401；未代用户登录、创建线上工单、登记证件或发送客人消息。
- server模块、恢复配置和登记密钥常见路径404。登记页面`Cache-Control:no-store`、`Referrer-Policy:no-referrer`及CSP存在。
- CO-HUB官网返回200。未检查实际Edge视觉、手机扫描/安装，不把jsdom当实机。

## 已发布与未接通

已发布工单和三语帮助、NOBEDS消息收件箱/内部备注/幂等发件箱、公共自助文字登记/私人QR/加密资料/人工审核/资格门槛。细节、差距与下一阶段见[0.9开发记录](development-v09-2026-10-27.md)。

**客服联系方式仍待配置；NOBEDS没有生产配置和真实会话测试；TTHotel门锁未购买，生产HTTP发码/撤销适配、区域/房锁映射和设备联调尚未完成。** 未连接时不生成可用PIN或自动入住。当前仅Booking.com/Airbnb消息有公开文档依据，其他OTA消息待确认。照片/自拍/短信/OCR、自动通知、历史分段换房、完整价格/财务及网站直订等并未因此完成。

自助登记默认关闭，仅用于合成测试。首次0.9启动的登记密钥在数据库同目录私有保存；**此次更新备份是升级前的SQLite，不包括新密钥**。收集真实身份资料前仍需独立密钥加密备份、“数据库+密钥”恢复演练及资料清理/身份核验运营验收。不要将密钥或配置发聊天/提交Git。

writer9使旧运行时不能绕过门禁失效钩子写订单。代码回退不等于可继续写入；保留只读/健康用于排障，修复后发布兼容版本，不删除数据库保护、不自动恢复旧数据库覆盖新增业务。PostgreSQL、真实10房30床布局、Google/支付和所有真实外部设备服务仍未验证。

发布后的本文件与交接收尾只改docs路径，避免重复触发部署。
