# 官网社区活动时段

官网通过 `my-events.html` 注册、登录及管理活动。使用同一邮箱、电话号码和密码登录。邮箱统一为小写，电话按数字匹配。联系方式用于联络，当前流程无需发送验证码，也没有自动找回密码。密码仅保存哈希。会话使用同站 HttpOnly cookie，登录时更换会话 ID，最长有效 24 小时。账号、会话和活动记录均保存在 PHP 专用的 `/var/lib/cohub-events` 目录（0700），位于官网根目录之外。

四个时段采用吉隆坡时间，ID 为 `10-12`、`14-17`、`18-20`、`20-2230`。访客从「我的活动」提交姓名、活动名称、日期、一个时段、简介及可选备注。申请沿用账号中保存的电话和邮箱。资料齐全、内容合适且时段空闲时，官网在提交成功时自动确认并锁定时段，「我的活动」立即显示已确认的日期和时间。待审核申请也会暂留时段。主办人使用同一账号可以取消待审核或已确认的申请，即时释放时段。

`events.lock` 为占用检查、文件写入、发布和报名提供互斥。同一日期加时段只能被一个新申请暂留或确认。申请变更写入同目录临时文件，再原子替换 `events.json`。既有待审核和已确认记录也参与占用检查。既有令牌接口兼容旧记录，新账号申请只由登录的本人管理。

讲座、交流会、工作坊、聚会以及常规社区主题均可自动确认，包括 AI 和 Web3 交流，标题无需与示例完全一致。官网检查标题、简介和备注中的中文、英文和马来文。明确涉及违法、诈骗或投资保本保收益及拉人头、骚扰、露骨性内容或暴力及鼓励伤害、政党竞选或组织抗议、宗教极端或攻击、歧视或仇恨的申请会被拒绝，不占用时段。页面按类别显示理由。内容含糊、可疑或待定，以及超过 20 人、包场、可能与店内安排冲突或需要额外布置的申请，交员工审核并暂留时段。

确认后，主办人按时举办活动，并在「我的活动」上传或替换海报。已确认且日期尚未过去的活动，关联到实际存在的海报文件后才进入官网公开列表。十张官方示例卡不参与占位或报名。公开活动允许访客填姓名和邮箱报名，每场 20 人，同一邮箱重复提交不增加人数，取消后停止报名。

## HTTP API

公共 GET 使用 `?date=YYYY-MM-DD` 获取已占用时段，或使用 `?published=1` 获取有海报的公开活动。两种读取都不返回账号、申请联系方式或报名名单。以下账号、报名和员工操作使用 `application/json`。访客海报上传使用独立的 multipart POST。

| `action` | 其他字段 | 行为 |
| --- | --- | --- |
| `register`、`sign-in` | `email`、`phone`、`password` | 登录后返回当前账号的活动 |
| `my-events`、`sign-out` | 无 | 加载个人申请或退出 |
| `submit-event` | `name`、`title`、`date`、`slot`、`intro`、可选 `note` | 登录后提交申请，自动确认返回 201，待审核或记录拒绝返回 202，时段冲突返回 409 |
| `cancel-my-event` | `id` | 只允许申请的所有者取消待审核或已确认活动 |
| `join-event` | `id`、`name`、`email` | 公开报名，满员返回 409 |

`submit-event` 和 `cancel-my-event` 的成功响应包含 `id`、`status`、`title`、`date`、`slot`。自动拒绝记录还包含 `reason`，值为 `venue_policy_illegal`、`venue_policy_fraud`、`venue_policy_harassment`、`venue_policy_harmful` 或 `venue_policy_controversial`。「我的活动」按当前语言显示对应理由，旧记录的 `venue_policy` 仍可显示。

### 访客上传与公开海报

向 `community-events.php` 发送 `multipart/form-data` POST，表单字段为 `action=upload-poster`、申请编号 `id` 和文件 `poster`。使用现有 `COHUB_EVENTS` 会话 cookie（HttpOnly、SameSite=Strict）。仅已确认申请的所属账号可以上传或替换。

| HTTP | 响应 |
| --- | --- |
| 200 | 申请摘要 `id`、`status`、`title`、`date`、`slot`，以及 `poster` 公开图片 URL |
| 401 | `{"status":"sign_in"}` |
| 404 | `{"status":"unknown"}`，申请不存在或不属于当前账号 |
| 409 | `{"status":"not_confirmed"}`，申请状态非已确认 |
| 422 | `{"status":"invalid","fields":["poster"]}`，文件缺失、无效或超过 2,000,000 字节 |

PHP 从文件头识别 PNG、JPEG 或 WebP。服务器用申请编号的 32 位小写十六进制部分生成文件名 `cohub-poster-<32位十六进制>.<webp|png|jpg>`，JPEG 始终保存为 `.jpg`。应用在 `$COHUB_EVENTS_DATA_DIR/posters/`（默认 `/var/lib/cohub-events/posters/`）按需创建 0700 目录，文件权限为 0600。替换成功后会清理不再被活动引用的旧客人海报。

`my-events` 的每条摘要包含 `poster`，值为图片 URL 或 `null`。`GET /community-events.php?published=1` 的公开活动使用同一 URL。浏览器通过 `GET /community-events.php?poster=cohub-poster-…` 读取图片，文件名必须符合 `cohub-poster-[a-z0-9-]+\.(webp|png|jpg)`。接口为有实际文件、已确认且未过期的公开活动返回相应的图片 Content-Type，找不到可公开的海报时返回 404。员工既有海报仍可从 `assets/coffee/` 读取。

### 员工操作

员工操作使用同一端点和 `Authorization: Bearer …`。令牌至少 32 字符，从私有服务器配置 `COHUB_EVENTS_API_TOKEN` 或 `/etc/cohub-events/api-token` 读取。员工客户端只通过安全凭据存储访问令牌。

| `action` | 其他字段 | 行为 |
| --- | --- | --- |
| `updates` | 可选 `since` | 按 UTC 时间轮询确认和取消变更 |
| `pending` | 无 | 查看待审核申请及联系方式 |
| `approve` | `id` | 确认待审核申请 |
| `reject` | `id`、`reason` | 拒绝并立即释放暂留时段，理由显示给申请者 |
| `publish` | `id`、`poster` | 为已确认活动关联已发布的官网图片文件，示例命名 `cohub-poster-book-club.webp`，可关联 `assets/coffee/` 或私有海报目录中已存在的 JPG、PNG 或 WebP |
| `attendees` | `id` | 查阅报名名单 |
| `lock`、`cancel` | 原员工字段 | 兼容既有员工工具 |

### 员工状态轮询

向 `community-events.php` 发送带员工 Bearer 鉴权的 JSON POST，请求体为 `{"action":"updates"}`。可添加 `since`，使用 UTC 格式 `YYYY-MM-DDTHH:MM:SS[.ffffff]Z`。查询包含与 `since` 同一时刻的变更，响应按时间升序返回。省略 `since` 时读取全部已记录的变更。无令牌或令牌错误返回 403，时间格式无效返回 422。

响应对象的 `updates` 数组每项包含 `id`（申请编号）、`title`、`date`、`slot`（上文四个时段 ID）、`status`（`confirmed` 或 `cancelled`）、`changedAt`（UTC 微秒时间戳）、`name`、`phone`、`email`。确认和取消各自随活动状态原子写入，主办人和员工的取消操作均记录。已有记录从下一次确认或取消开始记录变更。轮询端可用上次最大 `changedAt` 作为下一次 `since`，并按 `id`、`status`、`changedAt` 去重。客服系统通过此接口读取状态及联络信息，锁定和解锁由官网处理。

开启 HTTPS 时，PHP 必须收到 HTTPS 标记，以便会话 cookie 设置 Secure。

## 生产接入

上线前，运维需在现有 `/etc/nginx/snippets/cohub-community-events.conf` 的 `location = /community-events.php` 内增加 `client_max_body_size 2m;`，检查 nginx 配置并重新加载。nginx 当前默认上限为 1m，超过该请求体上限时会在到达 PHP 前被拒绝。2m 可覆盖 2,000,000 字节文件及正常 multipart 开销，现有 PHP-FPM `upload_max_filesize=2M` 可继续使用。已配置的 0700 私有数据目录可继续使用，PHP 会自动创建海报子目录。

### 初次配置


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
