# 批次17：智能锁显示与小时住宿密码窗口修复

## 六项修复

1. TTLock已连接时，账户主控件显示「仅本地测试连接」并禁用重复连接；切换品牌仍明确等待官方API。成功提示4秒清除，页面导航、集成标签、住宿详情及工具弹窗也清除，不再跨页常驻。
2. 添加/编辑弹窗分别为「添加合成锁 / 编辑合成锁」，门类型为「门锁类型」；中文、英文、马来文均覆盖，仍为客房锁/公共门。
3. 公共门复选框和关联列使用产品既有 `typeName(type,lang,id)`，支持 `names`；已保存房型ID直接解析成人名，无需重新绑定。公共门关联列只展示房型，忽略历史遗留resourceId。
4. 搜索按门类型限定：客房锁可按其房号/房型搜索；公共门按绑定房型名、锁名、锁ID（及原品牌）搜索，不展开该房型下的房号。
5. 名称以任意大小写TEST开头时保留原名，不再重复添加前缀；显示时也修复旧 `TEST · TEST-101`，无需重绑或批量改数据。
6. 统一 `stayTimes`，小时住宿优先使用已保存 `hourly.usageDate/startTime/endTime`，普通住宿保留实际arrivalTime/departureTime及缺失时原默认。固定Malaysia UTC+8，与营业日独立。2026-11-11 14:00–17:00、前后各12小时，私门/公共门均为 **2026-11-11 02:00 → 2026-11-12 05:00**；leadDays 0–3只控制生成资格，不改变有效窗口。生成资格/结束判断也使用真实时段。

计算窗口纳入测试码签名；读取、生成及同步时撤销不匹配旧签名并清空旧密文。自动模式打开面板即可生成符合新窗口的合成测试码，自动关闭时展示正确窗口及未生成状态，显式生成可更新；不会继续展示旧03:00–00:00。原加密/授权/幂等/手工撤销保护保留，不重置数据库、账号、绑定、住宿、客人或财务记录。

## 本地验收

- Node24：`npm test --prefix pms` **617/617**；含12项智能锁测试（新增3项），self-checkin、night-audit、boxed-stay restore、AR原保护全部通过。
- Python：`python3 -m unittest discover -s pms/test -p 'test_*.py' -v` **5/5**。
- 33份 `dom-*.mjs`、communications-dom及folio的--lines/--amend共 **36/36**。`node pms/verification/dom-smart-lock.mjs /tmp/pms-verification-deps/node_modules/jsdom/lib/api.js` 覆盖连接主控件、提示超时/导航清除、三语添加编辑/门类型、names无name的既有绑定、公共门名称/搜索、TEST前缀、小时窗口、撤销/再生及远程拒绝。
- 新增小时DOM的第二次设置保存曾仅等待DB持久化而未等页面刷新，独立运行触发既有writing保护；改为同时等待新form对象、持久值与成功提示，最终独立重跑通过。未放宽产品保护。
- 既有 `browser-brand.mjs` 在本地真实Chromium、隔离合成SQLite通过；sage颜色、白字、导航、官方Logo与响应式验收通过。JS语法、3份CI shell语法及 `git diff --check` 通过。
- 所有业务测试仅内存/隔离合成SQLite；没有登录线上或修改既有E2E住宿。线上仅公开GET核验。运行时及部署证据见根目录BATCH17-LIVE.json、BATCH17-BROWSER.json与三份中文交接文档。

## 保留边界

`server/store.js`继续调用同一 `demo-store.apply`，名称和绑定规则双路径一致；实际密码服务复用同一stayTimes/window。所有逻辑并入既有server/src/web文件。9.12保持「部分」，仅合成，不接入TTLock/Sciener云端、不发送邮件或外部密码、不操作实体门。远程开锁继续409及原测试模式拒绝文字，不宣称物理门已开。无新调度、无Calendar Overview/Reserve/Combined Room/Share、Beds24或生产渠道连接。

批次15全部12项sage token、批次14默认40px/width auto、紧凑32px及1200px隐藏规则、官方黑色Logo资产、部署工作流均未改。公开前端哈希只证明浏览器资源部署，不当作私有后端或真实硬件的远程验收。
