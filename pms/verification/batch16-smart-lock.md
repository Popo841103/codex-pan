# 批次16：智能锁设置与 TTLock 合成验证

## 已实现范围

设置 → 集成分别提供智能锁和房卡。智能锁有账户、锁具、设置三部分；19品牌仅为显示目录，非TTLock入口明确等待官方API或测试账户，不提供密码字段，不保存厂商凭据。TTLock（Sciener / Tongtong / 科技侠）可建立本门店本地合成连接；无厂商主机、客户端凭据、真实锁ID或网络调用。不会自动创建连接、锁具、客人、订单或财务记录。

管理员可添加、编辑、删除合成绑定：客房锁关联一个现有客房资源；公共门关联本店一个或多个现有房型。锁ID由服务生成且以SYNTH开头，名称有TEST前缀；网关及在线状态均为人工设定的合成状态，不代表硬件检测。日历智能锁列表展示绑定，并按房型、房号、锁名及测试ID搜索。房卡页面仅有结构和说明，明确没有本地发卡器或Room Key Assistant；无发、读、注销卡操作。提前发房卡与分配锁房规则未改。

每店设置：自动生成开关；客房/公共门入住前、退房后小时数（0–72）；提前0–3天；TTLock自动6位或4–9位。取消仅重画原值，不保存。设置/绑定经共享与本地共同使用的reducer验证；只有门店管理员能修改，单项授权不能绕过此限制；前台operations默认可查看/生成/撤销测试密码。所有请求复核有效账号、门店权限；共享设置保留修订与幂等约束。

住宿详情可展示/生成/撤销测试密码，窗口按入住/退房时间的Malaysia UTC+8计算，不使用营业日。自动模式在业务命令保存、设置/绑定更新或打开住宿智能锁面板时检查提前天数；未分房、暂存、取消、离店等不合格住宿不生成。没有新增后台调度。离线合成锁不生成；无绑定继续原有tthotel disconnected，guest请求仍checkin_lock_offline/not_connected且没有PIN。静态浏览器演示不生成密码，须共享服务及原有加密密钥。

测试密码只在授权屏幕/访客既有安全session展示，sl_access沿用访客密钥AES-256-GCM及每记录AAD；properties、receipts、audit及URL不含原始PIN。原密钥丢失且已有sl_access密文时启动拒绝另建替代密钥。密码对住宿窗口、绑定与设置签名；改房/改期、解绑/设置变更、取消/暂存/离店等使旧码失效并清空密文，撤销也仅经过进程内合成提供者。手工撤销不会被自动生成立即恢复；明确再次生成可创建新测试码。

已有自助入住仍保留身份人工审核、付款、押金、时间、清洁和占用保护。绑定合成锁后只返回标记test_active的测试密码，不宣称设备确认或开门，也不以该合成结果办理实体门锁入住。所有远程开锁请求都409拒绝并解释测试模式不会开实体门；界面提示将来真实厂商需网关与锁在线，明确当前未检验硬件。没有邮件或外部密码发送，没有付费SKU。

9.12继续为「部分」：内部设置/品牌入口/TTLock合成绑定和测试密码已有；真实TTLock云端、硬件和实际开门未接入。9.15保持部分，未发送自助入住代码或提交身份。本批所有新增逻辑均在既有server/src/web文件内；新增文件仅测试和验证，发布器不增加runtime文件的约束继续遵守。双状态机共享规则、夜审及跨已审日期暂存恢复/AR保护保留。批次15全部12色token、批次14默认40px/紧凑32px/1200断点隐藏以及官方黑色Logo资产均未改。

## 验证与复现

- Node24：`npm test --prefix pms`，614/614（含9项新增测试及原有self-checkin、night-audit、boxed-stay restore、AR保护）。全部SQLite测试使用内存/独立合成环境，无生产业务数据。
- Python：`python3 -m unittest discover -s pms/test -p 'test_*.py' -v`，5/5；3份CI部署shell语法与全部既有runtime JS语法通过，Ubuntu门禁未修改。
- 33份`dom-*.mjs`，另`communications-dom.mjs`及folio的`--lines`/`--amend`，合计36/36。复现：`node pms/verification/dom-smart-lock.mjs /tmp/pms-verification-deps/node_modules/jsdom/lib/api.js`；涵盖19品牌/阻止非TT、无密码连接、私门/公共门、搜索、保存/取消、三语、房卡无操作、住宿码展示/撤销/重新生成及远程拒绝。既有front-desk-tools断言更新为检查真实空表tbody。
- `browser-brand.mjs`使用隔离内存SQLite在真实Chromium验证sage按钮/悬停/白字、选中项、主题、官方Logo和响应式展示。DOM模拟与真实Chromium证据分开，不把它们当作硬件验证。
- 运行时提交后通过既有Actions测试部署；最终run ID、线上只读GET哈希、健康和浏览器证据见根目录BATCH16-LIVE.json、BATCH16-BROWSER.json以及continuity/VERIFICATION.md。不登录线上、不POST、不触碰真实门锁、订单、钱款或身份。
