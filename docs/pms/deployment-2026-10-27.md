# JOVIAN PMS 0.6.0 独立测试站发布

日期：2026-10-27（Asia/Singapore）。用户明确“继续部署”，授权沿用GitHub长期更新通路；不重新初始化服务器、不替换账号数据库、不修改CO-HUB官网。

代码提交：438f7544f51fef5ae4173a94adc1cae6506f0627。
分支：jovian-pms-test；main及旧部署分支未动。
运行：https://github.com/Popo841103/codex-pan/actions/runs/40455344228
入口：https://pms.jovianhome.com/web/

## 发布内容与前置验证

从线上0.5.1更新到0.6.0：三语房型、实体房/宿舍床号、整套组合、排序归档、指定房型订单、日历筛选与物理空间互斥、管理员设置权限及审计；保持原有订单、收退款、押金、清洁和登录流程。完整范围与未完成项见development-gap-2026-10-26.md。

本地68项Node、5项Python发布包测试通过。新增升级/回退验证：账号哈希、会话、门店授权、订单、claims、审计及幂等回执重开后保留；在线SQLite备份与所有表一致且integrity_check通过；旧版连接写入拒绝且事务不丢占用。

发布树验证34个更新文件的Git blob哈希与本地一致，其他原有文件保留。沿用已安装的受限SSH接收器/固定更新器和现有GitHub Secrets，不在本机会话读取私钥，不重跑初始化。

## 数据与回退

更新器先用SQLite online backup生成一致性快照，随后仅切换PMS代码并重启服务；失败回退代码，不自动把数据库回滚到旧快照以免抹除新写入。

新版连接注册jovian_writer_generation=6，properties_runtime_guard持久触发器要求兼容写入。旧版缺少该函数或低于generation6时不能修改properties.body；健康检查和读取仍可进行。因此旧版回退是暂时拒绝业务写入的降级，不承诺旧版完整可写。修复后重新发布兼容代码，不删除保护触发器，不直接用旧数据库覆盖在线数据。

## 发布结果

**部署成功**。GitHub运行40455344228、任务122027257008的Verify PMS、Check deployment setup、Deploy existing PMS test service均success；日志确认68项Node测试与5项Python通过，PMS code updated。完成时间约2026-10-27 13:27（Asia/Singapore）。

备份：`/var/backups/jovian-pms-test/update-JVzNANui/jovian.sqlite`；同目录保存上一发布路径与新commit。日志没有代码回退记录，不代表已在远端强制做过故障演练；回退拒写与备份一致性证据来自本地测试。

公网独立复核：api/mode返回0.6.0 shared-development；healthz 200且test-only；web首页、app.js、catalog-ui.js、src/catalog.js均200且SHA256与本次本地发布文件一致；manifest 200、display=standalone；未登录api/state=401；server/store.js及account-recovery.json=404；CO-HUB官网200。

没有代用户登录、修改业务资料或新建远端测试订单；原账号和持久化数据库由更新器沿用，没有重建或覆盖。完整登录后GUI仍待用户试用。发布收尾仅更新docs，不触发第二次代码部署。

## 尚未验证

GUI实际登录点击、Windows/手机安装与操作、真实10房30床拓扑、PostgreSQL迁移及并发、生产负载、NOBEDS各渠道消息/同步、Google预订落地页、支付及TTHotel设备网关均未验证或未连接。本次是隔离测试服务更新，不是正式营业切换。
