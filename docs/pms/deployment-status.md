# 独立Vultr测试部署状态

**最新状态（2026-10-20）：测试服务已上线，外网HTTPS及健康接口检查通过。以下早期阻塞记录作为历史保留。**

日期：2026-10-20。用户已授权部署，并已确认使用现有Vultr独立PMS测试服务。已确认服务器IP为207.148.78.107、目标域名为pms.jovianhome.com；尚未得到SSH用户名及安全连接方式，因此**尚未连接或修改远端服务器，尚无部署网址**。

已准备：systemd独立服务、测试域名Caddy片段、环境变量模板、只读preflight脚本、发布包及摘要校验。PMS_PUBLIC_ORIGIN严格校验HTTPS来源，登录/退出cookie增加Secure，保留CSRF；/healthz检查数据库可读。登录限流按账号及连接来源区分，避免代理后某一错误账号直接锁住另一个账号。

验证：npm test共32项通过，含HTTPS代理Host/Origin校验、伪造Forwarded头拒绝、安全cookie及独立账号登录限流。尚未执行真实TLS、DNS、Caddy安装或远端系统启动验证。GUI工具仍不可用。发布包仅含PMS应用及部署文件，无账号密码、数据库、官网源码或.git。

待用户提供：SSH用户名及安全配置的访问方式。域名解析与实际应用上线状态分别核实，不能把DNS创建等同于PMS已部署。收到后先只读preflight，检查端口及现有Caddy，再部署独立服务，不覆盖/var/www/cohub或现有站点块。

公开只读检查（2026-10-20）：pms.jovianhome.com解析为207.148.78.107；HTTPS返回200，页面标题为CO-HUB官网标题；/api/mode返回404。当前域名尚未接到JOVIAN PMS，需取得SSH连接后检查现有Caddy站点匹配，不能仅凭200声称PMS上线。未修改任何远端配置。

## 服务器截图核对（2026-10-20）

用户通过Vultr noVNC提供输出：sshd监听IPv4/IPv6 22；nginx监听80/443；已有Node监听3000、其他进程使用18000/8080；18010未占用。Node为v22.23.3，路径/usr/bin/node。此前将Caddy作为公网入口的推定不成立，后续以Nginx独立站点方案为准，不停止已有Caddy/Node/官网。Node24须隔离安装，systemd的ExecStart需在核实新Node24路径后替换，不能直接使用当前/usr/bin/node22。

已新增独立Nginx HTTP验证和HTTPS代理配置模板，不能在证书不存在时加载HTTPS模板。cohub既有证书不能当作覆盖pms域名的证书。先检查既有pms server_name与所有站点匹配，避免重复定义。

当前云端重试207.148.78.107:22仍返回连接被拒绝，但服务器内sshd监听正常。不能据此认定sshd故障，也不应盲目重启SSH或放开防火墙。仍缺可用的外部连接及授权密钥，尚未修改远端服务器。

## 私有仓库源码交付（2026-10-20）

已将32个PMS源码/测试/部署文件提交到已连接的私有仓库Popo841103/codex-pan，独立分支jovian-pms-deploy-20261020；提交86008038374f857ce25caec7ea4b602c0a3b1d4d。main保持f6a5f5e6a5d96c8f750677907ade53b89761b879未变。未上传数据库、账号、密钥或官网源码。install-vultr-test.sh仅首次安装，先检查重复域名/端口，独立Node24+systemd+Nginx+Certbot，失败撤下自己新增的Nginx入口。脚本bash语法通过，应用32项测试通过，尚未远端执行。

用户电脑已验证SSH22可连，当前云端不可连，故可由用户登录GitHub下载私有分支归档，再在Windows用scp上传服务器并通过SSH执行安装脚本。本步骤解决源码传输，不代表远端部署成功。

部署分支最新提交更新为5dfc05f47c2e7c48dd1f790e9806752e572aeb2f：修正严格umask下独立Node运行时目录/执行权限，保证非root服务用户可运行。main未修改。

## 用户首次执行结果及恢复计划

用户截图显示源码已上传、独立Node及服务安装已进行、admin账号已初始化；Certbot成功签发pms.jovianhome.com证书，Nginx配置校验通过，但reload后的首次HTTPS检查遇到证书域名不匹配，触发脚本撤下PMS入口。数据库和官网保留。不能重跑首次安装（会遇到已有目录），应只恢复PMS Nginx入口。

云端公开只读检查：A记录仍207.148.78.107，无AAAA；/healthz当前404，与入口撤下相符。具体TLS错误原因尚未证实，reload后新worker尚未就绪是待核实可能。已为首次安装增加保留TLS校验的重试，并准备只恢复缺失PMS入口的脚本，采用本机SNI和公网两次健康检查；不删除账号、数据库或更换官网证书。恢复脚本语法已检查，尚待服务器执行。

## 测试服务上线验证（2026-10-20）

用户在本机SSH完成首次部署，并按恢复命令重新添加PMS Nginx入口。截图出现两次证书匹配错误后重试成功，末尾两次健康返回ok:true。外网独立只读核对：

- https://pms.jovianhome.com/healthz：200，service=jovian-pms，data=test-only。
- /api/mode：200，shared-development，版本0.4.0。
- /web/：200，JOVIAN页面标题及login-form存在。
- 未登录/api/state：401 login_required。
- https://cohub.jovianhome.com/：200，原CO-HUB官网标题保持。

用户已创建admin测试账号，密码由用户本人输入，本聊天未获取。验证未登录后的页面点击/写入流程，尚无浏览器GUI工具，不能声称登录后端到端已验收；没有读取真实客人数据。新增测试站是公开可达的登录入口，业务数据需账号访问。当前仍为0.4测试版，不接真实订单、OTA、支付或门锁。证书检查初始失败原因未最终证实，不将可能的Nginx切换等待当作确定根因。

## 2026-10-22：0.5集中版本及直接部署尝试

用户明确授权由助手直接部署，不再要求用户下载上传；另要求正式系统可添加到手机桌面。新增PWA manifest、安装提示、图标、公开离线提示和手机样式，业务写入仍须联网。本地批量清洁/日期停用释放、订单抽屉四标签、资料/特殊色、独立日历日期/筛选/图例/显示选项等进入0.5待验收版本。

44项自动测试通过（此前新改动通过全量；版本号更新和部署脚本不改变业务）。本批尚未GUI/手机安装实测。新增独立增量更新脚本，保护现有数据库与账号，失败回退代码，尚未在远端执行。

直接SSH尝试：默认SSH客户端先遇到系统配置文件权限错误；仅跳过无关系统SSH配置后，在额外网络权限下连接207.148.78.107:22返回Connection refused，未进入身份验证，未使用用户密码。云环境非秘密策略显示TCP访问配置无域名/IP条目；不能据此独断远端防火墙原因。HTTPS healthz仍ok、api/mode为0.4.0。服务器没有更新，不报告部署成功。用户提供的SSH凭据不写入项目/部署包/日志，也不复述；建议用户轮换已在聊天截图中展示的凭据。

## 最新恢复检查

用户询问是否继续后已恢复检查：云环境状态connected、observations_current=true；SSH到207.148.78.107:22仍返回Connection refused；当前配置的TCP代理proxy:8088也无法建立连接。公网api/mode核实仍为0.4.0。尚未进入认证、未使用密码、未改远端；0.5仍在本地等待部署，不得报告已上线或持续后台执行。后续应先恢复SSH/TCP通路，不重跑首次安装，不要求用户重复发送密码。

## 长期 GitHub 自动部署配置（待首次连接）

用户确认采用GitHub长期部署，后续持续改进SmartOrder对照和JOVIAN，不是一次性发布。已准备独立测试分支jovian-pms-test及push自动工作流：44项Node测试、5项Python发布包验证通过，再按Secret配置决定是否部署。未配置时只测试，明确不改服务器。

服务器端受限SSH接收器仅接受PMS健康查询和源码包上传，拒绝交互shell、转发、任意路径、链接和数据库包；固定更新器备份后仅更新PMS，健康失败回退代码。首次初始化命令和说明位于pms/deploy/ci/；不包含SSH密码或私钥。用户本人需运行初始化并配置PMS_SSH_KEY、PMS_KNOWN_HOSTS两项GitHub Secrets。初次连接和远端执行尚未验证，不报告已部署。

### GitHub写入未完成

已准备50个PMS/工作流相关文件（无凭据或数据库），拟建立长期jovian-pms-test分支，保留main与旧部署分支。但首次github_create_blob调用返回“user rejected MCP tool call”，因此停止后续GitHub写入，不变换方式绕过拒绝。尚未创建新分支/提交/工作流，服务器未更新。需要用户重新允许GitHub写入后，才能继续发布已准备文件。文件、受限接收器、首次连接命令、49项测试结果均本地保留。

### GitHub发布已完成，首次Actions运行中

用户随后明确“允许”GitHub写入。已将50个PMS/测试/部署及工作流文件推送至独立长期分支jovian-pms-test，提交56ce4f3a3460b03a1391a32d8bb01a2b7b61c2b4，树07d4507ef3c18763925a21548dd9c21725b132e9。main仍f6a5f5e6a5d96c8f750677907ade53b89761b879，旧部署分支未动。没有创建PR，没有上传数据库/凭据或官网文件。

首次Actions已触发：https://github.com/Popo841103/codex-pan/actions/runs/39968468037，初始in_progress。首次服务器初始化及PMS_SSH_KEY/PMS_KNOWN_HOSTS仍待用户配置，故不能报告服务器部署成功。首次连接命令：该分支pms/deploy/ci/BOOTSTRAP.txt；完整中文说明：pms/deploy/ci/使用说明.md。添加Secrets不会自动重跑已完成任务，配置后助手再推送一次合适更新触发首次实际部署。

首次GitHub运行39968468037现已success：Verify PMS通过，包含44项Node及5项Python测试；Deploy existing PMS test service明确skipped（尚缺首次配置的Secret）。这证明GitHub工作流已可运行，不证明SSH已通或服务器已部署。

## 0.5首次自动部署成功

用户确认两项GitHub Secrets已保存后，已推送提交d941de337740c6fea9d19ed0a21f10ba140d4254到jovian-pms-test，触发运行39975463006：https://github.com/Popo841103/codex-pan/actions/runs/39975463006。

GitHub工作流及部署步骤均success，任务120488771333日志确认44项Node测试、5项Python测试通过；SSH健康查询、发布上传、固定更新器执行、备份、服务重启、版本及manifest检查均完成。备份路径/var/backups/jovian-pms-test/update-iPdPmUbF。日志显示PMS code updated，未发生代码回退。此为实际首次自动部署成功，不再是仅测试通过/缺Secret跳过。

0.5仍为测试服务，正式营业切换未授权。当前账号/数据库沿用，GitHub和服务器之间部署通路已验证，后续正常推送该分支即可重复部署，无需用户再下载上传或每次登录。GUI完整流程、手机安装及SmartOrder功能对齐仍须分别验收。公网独立检查正在进行。

公网独立复核完成：healthz 200；api/mode版本0.5.0；web包含酒店选择/安装按钮/订单抽屉；manifest 200且display=standalone，icon-192.png 200；未登录api/state 401；CO-HUB官网200。未读取或修改真实客人数据，未执行真实付款/门锁/消息操作。

## 管理员登录恢复（待部署验证）

用户忘记账号密码，账号确认为首次配置admin，原密码助手未保存。为保留公网验证及数据，增加0.5.1一次性密码恢复页面；用户自行设置新密码，助手不接触该密码。后台配置仅存256位随机令牌的哈希及限时授权，原始恢复链接不进仓库/工作流日志/项目文档；令牌在URL片段中，页面读取后清除地址片段，不写浏览器存储。有效令牌只能恢复指定在用管理员账号；成功后在数据库永久记录已消费并撤销旧会话，不更改门店、角色、订单和数据。

49项Node测试、5项Python测试通过，覆盖一次性、过期/非法授权、密码长度、重启后不能重用、源校验、限流和数据保留。提交ea8d1ca365281fa023c18f4c5e02d2a696cf8630已推送长期测试分支，GitHub部署结果待核实。未为用户设置或读取新密码，未取消登录。

0.5.1恢复入口已部署成功：运行39977218415、任务120494862473的Verify PMS与Deploy均success。公网api/mode为0.5.1；恢复HTML含表单且JS均200；未登录api/state仍401；server/account-recovery.json为404不可下载。恢复操作由用户通过限时链接自行设置密码，尚未代用户消费令牌或改密码。
