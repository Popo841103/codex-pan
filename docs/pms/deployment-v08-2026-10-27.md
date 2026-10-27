# 0.8 独立PMS测试站发布记录

2026-10-27（Asia/Singapore）。用户明确“继续部署吧，不要停”，授权将当前0.8沿已配置GitHub长期通路更新到既有独立PMS测试服务。原账号与持久化数据库沿用，不重跑服务器初始化，不修改CO-HUB官网、main或旧部署分支。

## 发布内容与验证

包含前轮0.7首页工作台、多房多人订单与逐夜报价，以及0.8日历空格菜单、区间选择、三类关房、定向释放和真正不占库存的订单盒子／恢复。详见development-v07-2026-10-27.md、development-v08-2026-10-27.md和最新调研第13节；不是SmartOrder全部功能完成。

发布前本地98项Node＋5项Python、19份运行JS语法和进程内DOM业务链路已通过。此次将相同代码交GitHub Actions重新执行必需检查后，受限接收器只接收pms/src、server、web和package.json；固定可信更新器先SQLite online backup，再原子切换代码、重启PMS并验证健康、版本与manifest。

writer generation升到8。新盒子状态及关房类型不被旧版正确理解，旧写连接拒绝；回退代码不自动回退数据库，健康读取可继续，后续须发兼容代码修复，不删除保护触发器或覆盖新写入。

## 发布结果

**已部署成功**，2026-10-27约16:40（Asia/Singapore）。

- 代码提交：`6ae390e66bb8e34abfe7657d1335038854db2b43`；分支：`jovian-pms-test`。
- Actions：https://github.com/Popo841103/codex-pan/actions/runs/40475081719；任务`122091222326`的Verify PMS、Check deployment setup、Deploy existing PMS test service均success。CI日志确认98项Node通过、0失败和5项Python通过。
- 数据库备份：`/var/backups/jovian-pms-test/update-QKnwNAny/jovian.sqlite`；同目录保留上一发布路径和新代码提交。沿用原账号、会话和业务数据库，没有重建账号或覆盖数据库。
- 发布树54个目标文件Git blob哈希与本地一致，30个新增／修改文件，其他原文件保留。main与旧部署分支仍为发布前SHA，未修改。文档收尾单独提交docs路径，不再次触发PMS部署。
- 公网独立核验：api/mode返回0.8.0 shared-development；healthz200且test-only；manifest200且standalone；未登录api/state401；server/store.js和account-recovery.json404；CO-HUB官网200。
- 新版首页、app、首页UI、多房UI、日历操作、库存操作、订单、统计、catalog、reducer、CSS及catalog-ui共12个静态文件均200且SHA256／字节与本次发布相同。详见[公网检查原始结果](deployment-v08-public-checks-2026-10-27.json)。

## 验证边界

没有获取用户密码、SSH私钥或Cookie；服务器使用已配置GitHub Secrets。没有代登录线上或创建真实业务数据。GUI与手机实机、专用PostgreSQL、真实10房30床拓扑、NOBEDS／Google／支付／TTHotel均仍未验证或连接；进程内DOM不是浏览器视觉验收。
