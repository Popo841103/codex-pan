# 官网社区活动时段

官网表单和活动日历共用 `/community-events.php`。日期以吉隆坡时间为准，时段 ID 为 `10-12`、`14-17`、`18-20`、`20-2230`。参加活动向公众开放，每场最多 20 人。

每次写入先对 `events.lock` 取得排他锁，然后读取同一份记录，检查日期和时段是否已确认，将更新写入同目录临时文件并原子替换 `events.json`。替换成功后才返回确认。取消使用同一把锁更新申请状态。状态变更后，公共读取立即释放时段。请求超时后，同一个表单可以用原重试键恢复已保存的结果。

明显违反场地规则的内容返回拒绝理由。自动确认采用保守规则，目前只覆盖已知的英文、中文和马来文低风险标题、简短介绍与备注组合。例如 `Book club` 加 `Discuss books together`。其他自由文本进入待审核，暂不占位。晓林可用员工接口读取待审核申请，决定批准或拒绝。批准时重新检查占用。

公共读取只返回日期、已占用时段和公开活动数组。确认后等待海报的时段会显示已占用。海报上传和发布流程尚未接通，目前公开活动数组为空。请组织者把海报和申请编号发到 CO-HUB WhatsApp。十张示例卡一直作为参考。

## HTTP API

公共 `GET /community-events.php?date=YYYY-MM-DD` 可读取实时占用。公共 `POST /community-events.php` 使用 `application/json`，提交 `name`、`phone`、`email`、`title`、`date`、`slot`、`intro`，可选 `note` 和随机 UUID `retryKey`。响应包括：

- `201 confirmed` 已成功留位，附申请编号、日期和时段。
- `202 pending` 已进入人工审核，附申请编号，时段仍开放。
- `409 taken` 该时段已占用。
- `422 invalid` 列出待填或需修正的字段。
- `422 rejected` 附场地规则原因代码。
- `503 unavailable` 需要重试并核实结果。原始输入与 `retryKey` 一起重试可找回同一笔结果。

员工操作使用同一个 POST 端点和 `Authorization: Bearer …`。凭据使用服务器侧 `COHUB_EVENTS_API_TOKEN` 或服务器文件 `/etc/cohub-events/api-token`。请使用至少 32 字符的随机值，并保留在服务器及授权员工工具的安全凭据存储中。公共表单独立运行。

| `action` | 其他 JSON 字段 | 行为 |
| --- | --- | --- |
| `lock` | 同公共表单 | 按同样的校验和审核规则提交 WhatsApp 申请 |
| `pending` | 无 | 读取待审核申请，包含联系方式 |
| `approve` | `id` | 审核通过并原子占位 |
| `reject` | `id`、`reason` | 拒绝待审核申请，供员工转告申请者 |
| `cancel` | `id` | 取消已确认申请或撤回待审核申请 |

申请者确认预约后可直接点击“取消”，并可保存私人预约链接稍后返回。链接的片段携带申请编号及随机令牌。页面通过 JSON POST 调用公开的 `guest-status` 查看该申请，调用 `guest-cancel` 立即释放其已确认时段。两个操作均要求对应的 `id` 与 `token`，无需员工或 AIWA 凭据。待审核申请也会收到私人链接，员工批准后即可用同一链接取消。重复确认取消会返回该申请的取消状态，后来取得同一时段的申请不受影响。

员工仍可通过 `cancel` 处理内部取消或撤回。未知编号返回 404，重复员工取消返回 409。旧记录若没有私人令牌，可在原始请求携带相同的重试凭据时补发，否则仍可由员工处理。

## 生产接入

当前受限 GitHub 发布密钥只能向现有官网接收器发送 `status` 或 `deploy <commit>`。一次性准备需由有权限的服务器管理员从已审核的 PR checkout 执行。先用 `ps -eo user,group,args | rg 'php-fpm: pool'` 核对 CO-HUB PHP 池，再核对 nginx 对官网根目录的 `community-events.php` 请求会执行 PHP。以下命令使用 Ubuntu 常见的 `www-data`，执行前替换为核实后的用户和组。

```sh
sudo install -d -m 0700 -o www-data -g www-data /var/lib/cohub-events
sudo -u www-data test -w /var/lib/cohub-events
sudo install -m 0644 -o root -g root scripts/deploy/cohub-release.py /usr/local/lib/cohub-ci/cohub-release.py
sudo install -d -m 0750 -o root -g www-data /etc/cohub-events
sudo sh -c 'set -eu; umask 077; test ! -e /etc/cohub-events/api-token; openssl rand -hex 32 > /etc/cohub-events/api-token; chown root:www-data /etc/cohub-events/api-token; chmod 0640 /etc/cohub-events/api-token'
```

目录和员工令牌都在官网根目录之外。若令牌已配置，保留现值。准备完成后再 squash merge 到 `cohub-website`，由官网工作流 395534368 部署。接收器保留既有文件哈希检查，并在本机 HTTPS 验证 PHP 返回实时占用 JSON。工作流再从公网读取社区页和占用接口。适用现有 PHP 路由时，这些步骤无需重启服务。对公网提交测试申请之前，先用员工凭据对未知编号发起取消，确认授权路径返回 404，再测试确认、取消和占用释放。

部署测试使用 `python3 tests/community-events.py`、`python3 tests/deploy-release.py` 和 `python3 scripts/i18n/check-locales.py`。可通过 `COHUB_TEST_PHP` 指定本地 PHP 可执行文件。
