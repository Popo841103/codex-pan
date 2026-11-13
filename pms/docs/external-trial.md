# 外部公司试用版

代码分支：`pms-external-trial`。基于 `jovian-pms-test` 的 `pms/`，复用现有页面、组件和交互。此分支只供独立试用服务使用；不要合并或推送到 `jovian-pms-test`、`cohub-website`。

## 本地运行

需要 Node.js 24 或更高版本，无需安装 npm 依赖。

```bash
cd pms
npm run trial
```

访问 `http://127.0.0.1:8020/web/`。需要另一个端口时使用 `TRIAL_PORT=8021 npm run trial`。

试用入口只监听本机，固定使用 `pms/.external-trial/trial.sqlite`，第一次启动可以没有账号。数据目录已加入 `.gitignore`；目录标记不匹配时拒绝启动。它不读取 `PMS_DB`、`PMS_PUBLIC_ORIGIN`、内部账号恢复文件或生产集成配置。不要使用 `npm run setup`、`npm start` 或现有 `deploy/` 脚本启动本试用版。

本次没有部署对外地址，也没有变更生产域名、数据库和部署脚本。将来公开托管需要单独的试用域名、进程和数据卷，并为该独立服务配置 HTTPS、Origin 和 Secure Cookie；当前入口仅供本地验证，不能直接映射成公开 HTTP 服务。

## 申请和后台开通

1. 登录页点击「申请使用 / 联系我们」。填写公司名称及联系邮箱，提交后进入待审核状态，不会自动创建可登录账号。
2. 联系入口为 `9jk558xy@mail.grokbot.com`。邮箱链接打开邮件客户端；申请本身保存在试用数据库，不会自动发送邮件。
3. 运营人员在本地后台查看申请并开通：

```bash
npm run trial:admin -- list
npm run trial:admin -- approve <申请ID> <公司登录名>
```

登录名需为 3–64 位英文字母、数字、点、下划线或连字符。审批命令生成随机初始密码，只在本地终端显示；通过合适的私密渠道交付给申请人，不要提交密码、命令输出或数据库。重复审批会被拒绝；账户、公司范围和审批状态在同一事务中完成。

每家公司一个账户，绑定一个独立公司范围。开通后没有预置客人、支付记录或内部账号；酒店和房间配置从空白开始。演示时请填写「星云示例酒店」「月湾示例旅舍」「示例房 A01」等虚构名称，不导入内部数据。公司账户不能增建公司、邀请成员、修改角色或扩大数据范围。

## 免费功能和申请开放

免费：现有预订、房态、房型与房间配置、房价、清洁、营业日及测试账务记录。账务只记录测试数值，不连接银行或真实支付。

现有功能入口保留；登录后原界面提示哪些功能需要申请。以下功能默认关闭，权限结果及直接 API 调用同时受限：

| 功能 | 后台功能代码 |
| --- | --- |
| 智能门锁 | `smartLocks` |
| 客户消息 | `messaging` |
| 自助入住 | `selfCheckin` |
| 酒店网站发布 | `website` |

公司可以通过界面联系邮箱申请开放。运营审核后，使用审批输出中的 `propertyId` 开启或关闭功能：

```bash
npm run trial:admin -- feature <propertyId> messaging on
npm run trial:admin -- feature <propertyId> messaging off
```

修改后重新登录可刷新界面权限；后端实时检查权限。开启权限只开放已有试用实现，不代表已经连接真实 OTA、门锁或消息供应商。试用入口不会加载生产集成配置，并拒绝公开房源抓取接口。成员管理始终不开放，以维持每家公司一个账户。

## 验证

```bash
npm test
node --test test/external-trial.test.js
python test/external-trial-browser.py
```

浏览器测试需要 Python Playwright 和 `/usr/bin/chromium`。它自行启动本机随机端口服务和内存数据库，不读取已有试用或生产数据库。测试覆盖申请、后台审批、新公司登录、两个独立浏览器会话的数据隔离及未开放功能拒绝访问。Node 测试还覆盖双向越权写入、直接 API 越权、成员与公司范围扩张拒绝、权限开放与撤销、申请验证、限流和审批回滚。

试用模式不安装离线工作台，不读取旧浏览器演示缓存。所有生产启动和部署入口仍保持原样。

## 文件变更

- `server/external-trial-store.js`：审批、公司范围限制、功能授权。
- `server/external-trial-runtime.js`：独立数据目录及标记检查。
- `server/external-trial-main.js`：本地试用服务入口。
- `server/external-trial-admin.js`：本地后台申请审批及功能开关。
- `server/external-trial-web.js`：申请页及原界面试用提示、示例占位符处理。
- `server/http.js`：显式试用模式下接入申请、功能限制和静态资源处理。
- `package.json`、`.gitignore`：新增试用命令及隔离数据忽略规则。
- `test/external-trial.test.js`、`test/external-trial-browser.py`：流程及隔离测试。
- `docs/external-trial.md`：本说明。
