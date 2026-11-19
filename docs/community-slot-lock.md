# 官网社区活动时段

官网通过 `community.html#my-events` 注册、登录及管理活动。使用同一邮箱、电话号码和密码登录。邮箱统一为小写，电话按数字匹配。联系方式用于联络，当前流程无需发送验证码，也没有自动找回密码。密码仅保存哈希。会话使用同站 HttpOnly cookie，登录时更换会话 ID，最长有效 24 小时。账号、会话和活动记录均保存在 PHP 专用的 `/var/lib/cohub-events` 目录（0700），位于官网根目录之外。

四个时段采用吉隆坡时间，ID 为 `10-12`、`14-17`、`18-20`、`20-2230`。访客从「我的活动」提交姓名、活动名称、日期、一个时段、简介及可选备注。申请沿用账号中保存的电话和邮箱。提交成功即进入待审核并暂留时段，通过后在「我的活动」显示已确认的日期和时间。申请拒绝或访客自行取消后立即释放时段。客人可重新登录或点击刷新查看审核结果。

`events.lock` 为占用检查、文件写入、发布和报名提供互斥。同一日期加时段只能被一个新申请暂留或确认。申请变更写入同目录临时文件，再原子替换 `events.json`。已确认旧记录继续占位，旧的待审核记录延续原来的审批占位行为。既有令牌接口兼容旧记录，新账号申请只由登录的本人管理。

明确命中场地规则的申请会记录拒绝；其余访客申请进入员工审核队列。员工审核违法、骚扰、危害健康或有争议的内容时应写明拒绝理由，存疑时交晓林判断。员工用已有后端员工作业接口完成审批。批准后，页面提醒组织者按时举办并提交海报及申请编号。员工收到海报后将图片放入现有官网素材目录，批准并关联海报的活动才会进入公开活动列表。示例卡不参与占位或报名。公开活动允许访客填姓名和邮箱报名，每场 20 人，同一邮箱重复提交不增加人数，取消后停止报名。

## HTTP API

公共 GET 使用 `?date=YYYY-MM-DD` 获取已占用时段，或使用 `?published=1` 获取有海报的公开活动。两种读取都不返回账号、申请联系方式或报名名单。所有 POST 使用 `application/json`。

| `action` | 其他字段 | 行为 |
| --- | --- | --- |
| `register`、`sign-in` | `email`、`phone`、`password` | 登录后返回当前账号的活动 |
| `my-events`、`sign-out` | 无 | 加载个人申请或退出 |
| `submit-event` | `name`、`title`、`date`、`slot`、`intro`、可选 `note` | 登录后提交申请，时段冲突返回 409 |
| `cancel-my-event` | `id` | 只允许申请的所有者取消待审核或已确认活动 |
| `join-event` | `id`、`name`、`email` | 公开报名，满员返回 409 |

员工操作使用同一端点和 `Authorization: Bearer …`。令牌至少 32 字符，从私有服务器配置 `COHUB_EVENTS_API_TOKEN` 或 `/etc/cohub-events/api-token` 读取。员工客户端只通过安全凭据存储访问令牌。

| `action` | 其他字段 | 行为 |
| --- | --- | --- |
| `pending` | 无 | 查看待审核申请及联系方式 |
| `approve` | `id` | 确认待审核申请 |
| `reject` | `id`、`reason` | 拒绝并立即释放暂留时段，理由显示给申请者 |
| `publish` | `id`、`poster` | 为已确认活动关联已发布的官网图片文件，示例命名 `cohub-poster-book-club.webp`，限定 `assets/coffee/` 下的 JPG、PNG 或 WebP |
| `attendees` | `id` | 查阅报名名单 |
| `lock`、`cancel` | 原员工字段 | 兼容既有员工工具 |

海报使用现有素材发布流程，当前没有访客上传控件或新的员工后台页面。员工操作仅通过后端接口。开启 HTTPS 时，PHP 必须收到 HTTPS 标记，以便会话 cookie 设置 Secure。

## 生产接入

当前受限 GitHub 发布密钥只能向现有官网接收器发送 `status` 或 `deploy <commit>`。一次性准备需由有权限的服务器管理员从已审核的 PR checkout 执行。先用 `ps -eo user,group,args | rg 'php-fpm: pool'` 核对 CO-HUB PHP 池，再核对 Web 服务器对官网根目录的 `community-events.php` 请求会执行 PHP。以下命令使用 Ubuntu 常见的 `www-data`，执行前替换为核实后的用户和组。

```sh
sudo install -d -m 0700 -o www-data -g www-data /var/lib/cohub-events
sudo -u www-data test -w /var/lib/cohub-events
sudo install -m 0644 -o root -g root scripts/deploy/cohub-release.py /usr/local/lib/cohub-ci/cohub-release.py
sudo install -d -m 0750 -o root -g www-data /etc/cohub-events
sudo sh -c 'set -eu; umask 077; test ! -e /etc/cohub-events/api-token; openssl rand -hex 32 > /etc/cohub-events/api-token; chown root:www-data /etc/cohub-events/api-token; chmod 0640 /etc/cohub-events/api-token'
```

目录和员工令牌都在官网根目录之外。若令牌已配置，保留现值。准备完成后再 squash merge 到 `cohub-website`，由官网工作流 395534368 部署。接收器保留既有文件哈希检查，并在本机 HTTPS 验证 PHP 返回实时占用 JSON。工作流再从公网读取社区页和占用接口。适用现有 PHP 路由时，这些步骤无需重启服务。对公网提交测试申请之前，先用员工凭据对未知编号发起取消，确认授权路径返回 404，再测试确认、取消和占用释放。

部署测试使用 `python3 tests/community-events.py`、`python3 tests/deploy-release.py` 和 `python3 scripts/i18n/check-locales.py`。可通过 `COHUB_TEST_PHP` 指定本地 PHP 可执行文件。
