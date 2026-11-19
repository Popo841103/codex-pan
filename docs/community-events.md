# CO-HUB 社区活动申请

客人页是 `community.html`。金色按钮「自己办活动」打开申请表。没有客人账号，没有「我的活动」，客人页不链接批准页。

已上线的公开列表只显示已批准并且已经有海报的活动。仓库里的公开列表是空的，不放示例卡片。

## 小琳怎么打开批准页

地址不在导航里，也不会出现在站点地图：

`https://cohub.jovianhome.com/community-approve.html`

页面带 `noindex`。默认不需要口令。若以后在服务器环境变量设置 `COHUB_EVENTS_OWNER_TOKEN`，页面会要求填写；这个值只留在该浏览器的 sessionStorage，不写入仓库。不要把口令、密钥写进 git。

## 主办人怎么上传海报

申请时不要海报。小琳在批准页点批准后，该日期和时段立刻不能再订，但活动还不会出现在客人列表。

批准页准备一条 WhatsApp 给主办人（不自动发送），里面有确认的日期、时间和上传链接：

`community-poster.html?id=申请编号&upload=一次性上传钥`

主办人打开链接，选 JPG、PNG 或 WebP（5 MB 以内）再提交。提交后活动才带着海报、时间、名称和介绍出现在客人页。

没有电话号码时，批准页给出可复制的提醒文字，由小琳自己发给主办人。

## WhatsApp 不自动发送

申请按钮打开 `https://wa.me/60178497319`，文案发给 WhatsApp Business「COHUB KL」（+60 17-849 7319）。浏览器只打开对话，主办人自己点发送。

每条申请有稳定编号 `req_` 加 32 位小写十六进制。预填消息末尾有固定英文块，方便以后把对话对上申请：

```
---
Request ID: req_...
Slot ID: 18-20
Date: 2026-12-05
Timezone: Asia/Kuala_Lumpur
```

`Date` 是 `YYYY-MM-DD`。`Slot ID` 只能是 `10-12`、`14-17`、`18-20`、`20-2230`。时间都是马来西亚时间 `Asia/Kuala_Lumpur`。店面营业 09:00–23:30；可订的就是这四段：上午 10:00–12:00、下午 14:00–17:00、傍晚 18:00–20:00、晚上 20:00–22:30。

## 状态和谁说了算

| 状态 | 含义 | 是否占时段 |
| --- | --- | --- |
| `pending_review` | 待批准 | 否 |
| `approved_waiting_poster` | 已批准，等海报 | 是，和已上线一样 |
| `published` | 已上线 | 是 |
| `declined` | 不通过 | 否，时段仍可订 |
| `cancelled` | 取消 | 否，时段释放，并从客人页撤下 |

接通之后，时段占用以官网这份存储为准。AIWA 只查询，不自己改状态。

## 不批准的内容

不批准：违法、骚扰他人、明显不适合在这里办，以及内容不健康的、有争议的。

拿不准是不是不健康或有争议时，不要自动批准，留给 Xiaolin。

## 升级后的 24 小时

如果申请已经交给 Xiaolin，超过 24 小时还没有回复，并且离活动开始（时段的开始时刻，马来西亚时间）还有超过 24 小时，WhatsApp 客服以后可以按上面的标准自行批准或拒绝，并回复主办人。

「超过 24 小时」不含刚好 24 小时。离开始不足或等于 24 小时，不要自动决定，继续等她。

这次不执行这条 SLA，也没有能把自动批准打开的开关。

在官网时段占用同步接通并确认可用之前，即使 24 小时条件已经满足，自动批准也必须保持关闭。否则客人页仍显示可预定时，主办人却会听到时段已经留好。

明确不符合的申请（违法、骚扰、明显不适合、不健康、有争议）以后可以按拒绝标准自动拒绝。这一条只写在接口说明里，这次程序不会自动拒绝。拿不准的仍留给 Xiaolin。

同步确认可用之后，才可以在以后的改动里打开这条 SLA 下的自动批准。第一次打开查询钩子，不等于同步已经确认，也不等于可以自动批准。

官网把「交给 Xiaolin」记成申请的 `createdAt` / `escalatedAt`。状态仍是 `pending_review` 表示她还没在批准页决定。纯 WhatsApp 里的回复，在同步接通前，网站看不到。

## 给 AIWA 的接口（默认关闭）

`GET community-events.php?view=integration` 始终返回契约，不含密钥，并标明：

- `liveSync: false`
- `syncConfirmed: false`
- `autoApproval: false`
- `escalationSla.autoApproveEnabled: false`
- `escalationSla.autoDeclineEnabled: false`
- `escalationSla.thisReleaseExecutesSla: false`
- `writesFromAiwa: []`

入站只读，而且要同时满足：环境变量 `COHUB_EVENTS_INTEGRATION=on`，以及请求头 `X-Cohub-Integration-Secret` 与服务器环境变量 `COHUB_EVENTS_INTEGRATION_SECRET` 一致。这两个值都不在仓库里。未打开时返回 `integration_disabled`。

- `check`：某个日期加时段是否空闲
- `snapshot`：当前被占用的日期和时段
- `status`：按 `requestId` 看状态、开始时间、升级时间和 SLA 计算。`autoApprovePermitted` 与 `autoDeclinePermitted` 在这一版永远是 false，网站不会替 AI 改状态

没有批准、拒绝、取消、发布的入站动作。即使有人把集成开关打开，调用 `approve` 也只会得到 `not_delegated`。

出站通知同样默认不发。只有集成开关、密钥，以及 `https://` 的 `COHUB_EVENTS_INTEGRATION_URL` 都在服务器上配好时，网站才会在状态变化后 POST 一条 JSON（申请编号、状态、日期、时段、是否占时段、标题）。失败不影响小琳或主办人。通知里没有上传钥，也没有自动批准。

## 上线前还要做的（本次不合并、不部署）

- 网站需要执行 `community-events.php`（php-fpm）。静态发布只会把文件拷到 `/var/www/cohub`。
- 在网站目录之外建 `/var/lib/cohub-community-events`，给 PHP 用户可写。申请和海报不进 git，也不进静态包。本地没有这个目录时，仅本机请求会暂时写到系统临时目录。
- 可选：设置 `COHUB_EVENTS_OWNER_TOKEN`。
- 接通 AIWA 时才设置集成开关、URL 和密钥。教它解析消息尾部的 `Request ID`，只调用 check / snapshot / status。
- 在同步确认可用之前，AIWA 只能确认收到并把决定交给小琳，不能说时段已留，也不能自动批准。24 小时条件满足也不行。
- 本次没有部署，没有合并。
