# 官网社区活动时段

官网通过 `my-events.html` 注册、登录及管理活动。使用同一邮箱、电话号码和密码登录。邮箱统一为小写，电话按数字匹配。联系方式用于联络，当前流程无需发送验证码，也没有自动找回密码。密码仅保存哈希。会话使用同站 HttpOnly cookie，登录时更换会话 ID，最长有效 24 小时。账号、会话和活动记录均保存在 PHP 专用的 `/var/lib/cohub-events` 目录（0700），位于官网根目录之外。

四个时段采用吉隆坡时间，ID 为 `10-12`、`14-17`、`18-20`、`20-2230`。访客从「我的活动」提交姓名、活动名称、日期、一个时段、简介及可选备注。申请沿用账号中保存的电话和邮箱。资料齐全、内容合适且时段空闲时，官网在提交成功时自动确认并锁定时段，「我的活动」立即显示已确认的日期和时间。待审核申请也会暂留时段。主办人使用同一账号可以取消待审核或已确认的申请，即时释放时段。

`events.lock` 为占用检查、文件写入、发布和报名提供互斥。同一日期加时段只能被一个新申请暂留或确认。申请变更写入同目录临时文件，再原子替换 `events.json`。既有待审核和已确认记录也参与占用检查。既有令牌接口兼容旧记录，新账号申请只由登录的本人管理。

内容拿不准、超过 20 人、包场、可能与店内安排冲突或需要额外布置的申请交员工审核。明确命中场地规则的申请会被拒绝，自动或员工拒绝均向申请者显示理由。确认后，页面提醒组织者按时举办并提交海报及申请编号。员工收到海报后将图片放入现有官网素材目录，批准并关联海报的活动才会进入公开活动列表。示例卡不参与占位或报名。公开活动允许访客填姓名和邮箱报名，每场 20 人，同一邮箱重复提交不增加人数，取消后停止报名。

## HTTP API

公共 GET 使用 `?date=YYYY-MM-DD` 获取已占用时段，或使用 `?published=1` 获取有海报的公开活动。两种读取都不返回账号、申请联系方式或报名名单。所有 POST 使用 `application/json`。

| `action` | 其他字段 | 行为 |
| --- | --- | --- |
| `register`、`sign-in` | `email`、`phone`、`password` | 登录后返回当前账号的活动 |
| `my-events`、`sign-out` | 无 | 加载个人申请或退出 |
| `submit-event` | `name`、`title`、`date`、`slot`、`intro`、可选 `note` | 登录后提交申请，自动确认返回 201，待审核或记录拒绝返回 202，时段冲突返回 409 |
| `cancel-my-event` | `id` | 只允许申请的所有者取消待审核或已确认活动 |
| `join-event` | `id`、`name`、`email` | 公开报名，满员返回 409 |

`submit-event` 和 `cancel-my-event` 的成功响应包含 `id`、`status`、`title`、`date`、`slot`。自动拒绝记录还包含场地规则原因代码 `reason`。

员工操作使用同一端点和 `Authorization: Bearer …`。令牌至少 32 字符，从私有服务器配置 `COHUB_EVENTS_API_TOKEN` 或 `/etc/cohub-events/api-token` 读取。员工客户端只通过安全凭据存储访问令牌。

| `action` | 其他字段 | 行为 |
| --- | --- | --- |
| `updates` | 可选 `since` | 按 UTC 时间轮询确认和取消变更 |
| `pending` | 无 | 查看待审核申请及联系方式 |
| `approve` | `id` | 确认待审核申请 |
| `reject` | `id`、`reason` | 拒绝并立即释放暂留时段，理由显示给申请者 |
| `publish` | `id`、`poster` | 为已确认活动关联已发布的官网图片文件，示例命名 `cohub-poster-book-club.webp`，限定 `assets/coffee/` 下的 JPG、PNG 或 WebP |
| `attendees` | `id` | 查阅报名名单 |
| `lock`、`cancel` | 原员工字段 | 兼容既有员工工具 |

### 员工状态轮询

向 `community-events.php` 发送带员工 Bearer 鉴权的 JSON POST，请求体为 `{"action":"updates"}`。可添加 `since`，使用 UTC 格式 `YYYY-MM-DDTHH:MM:SS[.ffffff]Z`。查询包含与 `since` 同一时刻的变更，响应按时间升序返回。省略 `since` 时读取全部已记录的变更。无令牌或令牌错误返回 403，时间格式无效返回 422。

响应对象的 `updates` 数组每项包含 `id`（申请编号）、`title`、`date`、`slot`（上文四个时段 ID）、`status`（`confirmed` 或 `cancelled`）、`changedAt`（UTC 微秒时间戳）、`name`、`phone`、`email`。确认和取消各自随活动状态原子写入，主办人和员工的取消操作均记录。已有记录从下一次确认或取消开始记录变更。轮询端可用上次最大 `changedAt` 作为下一次 `since`，并按 `id`、`status`、`changedAt` 去重。客服系统通过此接口读取状态及联络信息，锁定和解锁由官网处理。

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
