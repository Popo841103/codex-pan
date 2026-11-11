# 批次18：完整有效窗口内生成与显示合成测试密码

根因：`generateTestLocks` 在住宿原始结束时间拒绝生成，而读取使用 `valid_until`；小时住宿17:00结束后，即使退房后12小时窗口仍开，首次生成或签名失效后的再生成仍被拒绝。

修复并入既有 `server/self-checkin.js`：按每把锁的 `smartLockWindow(...).until` 筛选，至少一把锁窗口未结束即可生成；到期锁不生成，全部到期手动400拒绝、自动静默。leadDays只限制自动生成最早开始时间，不改变窗口。`lockEligible`已分房、confirmed/checked_in、非暂存规则不变，实际checkout状态仍不合资格。手工撤销仍不被自动模式恢复，当前签名新码可手动生成，签名失效旧码可自动补建。

受控时钟与内存SQLite验证：2026-11-11 14:00–17:00、客房/公共门12h/12h，18:10手动与自动产生可用PIN及accessId，窗口02:00至次日05:00；重读和重复生成保留密码；04:59:59仍可展示，05:00精确边界拒绝、自动静默且无活跃PIN。另测不同门到期时间，不因一把门到期阻断另一把门。既有leadDays 0–3、签名替换与批次17测试保留。

扩展既有 `dom-smart-lock.mjs`：受控Malaysia时钟在17:00之后打开真实住宿详情面板，旧签名自动补建，两把门显示数字、正确窗口、撤销动作；再次打开仍显示同码，手动撤销后生成恢复；到05:00不再展示数字且生成拒绝。原连接状态、三语标签、typeName、101搜索、TEST前缀、远程开锁拒绝继续通过。DOM日期使用2027-01-20，Node专测用户报告的2026-11-11，均无线上住宿写入。

完整本地门禁：Node24 620/620、Python5/5；33份dom、communications及folio两分支共36/36；真实本地Chromium品牌验收、全部runtime JS/3份CI shell语法与diff检查通过。部署证据见根目录及三份中文交接文档。双状态机仍共用既有reducer；本批只改密码服务，不修改状态转换。self-checkin、night-audit、boxed-stay restore与AR保护保留；营业日不参与Malaysia窗口。无数据重置、无云端API、无邮件/外发密码、无实体开门；远程开锁仍拒绝。12项sage、40px/32px/1200px字标及官方黑Logo、部署工作流均不改。

线上核验只使用公开GET和真实Chromium未登录页面；公开资源一致不能证明线上指定住宿或私有后端已被直接操作。运行时提交及Actions结果见 `WORKBUDDY-HANDOFF.md`、`continuity/PROJECT-STATE.md`、`continuity/VERIFICATION.md` 最新批次18节。
