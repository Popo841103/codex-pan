# 品牌页入口（COHUB · What's on）接入规格 — 2026-11-07

状态：**部署包已生成，待上传到 VPS**。同日更新：在资料库「JOVIAN Eats 业务档案」中确认扫码点餐系统是**自托管的 JOVIAN Eats**（`eats.jovianhome.com`，代码在 VPS `/opt/jovian-eats/feedme-clone`，`systemd` 服务 `jovian-eats`，源码尚未纳入 git），**不是第三方 SaaS**。因此第 5 节的阻塞点已解除一半：不用等任何平台，改自己的文件即可。已基于线上现版（`order.html` build `202611021405`、`i18n.js?v=49`）生成最小改动部署包：菜单首屏入口 + 结账抽屉底部入口 + en/bm/zh 三语文案 + 内嵌浏览器（微信/WhatsApp）提示，`i18n` 缓存版本升到 `?v=50`；链接逐字原样已用脚本断言，并已用真实 Chromium 在线上页面注入截图核验（首屏与结账抽屉）。部署包与回滚步骤见沙箱交付物 `eats-brand-entry/`（`order.html`、`i18n.js`、`brand-entry.patch`、`README-部署.md`、两张预览图）；**上传与重启需在有 VPS 访问权限的一侧执行**，本会话无服务器凭据，不代做。原分析保留如下。本仓库 `pms/` 内没有任何扫码点餐页面（下方有实见证据），因此本批次不改代码、只归档规格与素材。一旦获得点餐源码的位置（仓库/路径）或确认其为第三方平台，按本文件直接实现。

## 1. 需求（用户提供，原意保留）

门店不只是餐厅：白天是共享办公空间（插座、Wi-Fi、投影），晚上做分享会和聚会，也对外承接小型活动。顾客扫桌上的码点餐时只能看到菜单，看不到这些——所以要在**扫码点餐流程**里增加一个品牌页入口，让顾客知道这里能办公、能办活动、想办活动怎么联系。这是标准的「商家自定义入口」需求，目的是提升顾客对门店的完整认知和二次到店率，**不改动点餐主流程**。

- 显示名称：`COHUB · What's on`
- 链接地址：`https://aabdf71311a39e29e.app.workbuddy.host/?sharecode=GHP2NOW5R2`
- 备用短链：`https://tinyurl.com/222b8ypa`

三条硬性说明（用户原文归纳）：

1. 链接必须**原样使用**，`?sharecode=GHP2NOW5R2` 不能删——删了页面返回 403。**禁止任何参数清洗、URL 规范化、追踪参数剥离**。
2. 如果系统必须用短链，用上面那条 tinyurl（已验证完整保留参数）。
3. 希望用**手机系统浏览器**打开，不要 App 内置受限 WebView——页面里有跳转 WhatsApp 的表单。

放置位置：**扫码点餐首页（欢迎页）一个显眼入口**，**结账或账单页底部**再放一个。

## 2. 链接实见证据（2026-11-07，从沙箱外网 curl 实测）

| 检查 | 结果 |
|---|---|
| 长链带参数 | 200，1,450,619 字节，`<title>COHUB · Bukit Bintang — cowork, gatherings, events</title>`，`lang="en"` |
| 长链去掉参数 | **403**，证实参数必需 |
| 短链 `tinyurl.com/222b8ypa` | 301，`Location: https://aabdf71311a39e29e.app.workbuddy.host/?sharecode=GHP2NOW5R2`，**参数完整保留** |
| 页面内跳转 | 存在 `wa.me/60178497319` 与 `wa.me/60178497319?text=` 两条 WhatsApp 链接，确需外部浏览器/可唤起外部 App 的环境 |

## 3. 为什么本仓库不能直接改（实见）

`Popo841103/codex-pan` 分支 `jovian-pms-test` 的 `pms/` 是当前部署源码，其公开路由（`server/http.js`）只有：

- `/sites/:slug` — 住宿公开预订页（房型、可订数、预订请求、查询/撤回）
- `/signup` — 试用注册
- `/self-checkin*` — 客人自助入住
- `/web/` — 员工后台（登录后）

全仓库搜索 `cart` / `dish` / `menu`（点餐语义）/ `点餐` / `餐桌` 无命中；`docs/pms/START-HERE.md`、`docs/pms/architecture.md` 均写明「官网、餐饮、供应链维持现状」。**扫码点餐不在这套源码里**，所以「点餐欢迎页」「结账页」在本仓库不存在，无法直接添加入口。

## 4. 接入规格（任何实现方照此执行）

### 4.1 链接处理（最高优先级）

- `href` 必须是上面两条链接之一的**逐字节原样字符串**；在写入模板/经过任何前端路由、统计脚本、构建器时，**不得**重写 query、不得排序/删除参数。
- 在 HTML 属性里输出时只做 HTML 实体转义（`&` → `&amp;`，本例只有一个参数所以不触发），**不做 URL 层面的改写**。
- 禁止对该链接做 `URL` 对象重组、`origin+pathname` 拼接、query 白名单过滤等一切"规范化"。

### 4.2 入口元素

```html
<!-- 点餐欢迎页：首屏显眼位置（建议菜单列表上方，独立按钮/卡片） -->
<a class="brand-entry brand-entry--hero" rel="noopener noreferrer"
   href="https://aabdf71311a39e29e.app.workbuddy.host/?sharecode=GHP2NOW5R2">
  COHUB · What's on
</a>

<!-- 结账/账单页底部：同一链接、同一文案 -->
<a class="brand-entry brand-entry--footer" rel="noopener noreferrer"
   href="https://aabdf71311a39e29e.app.workbuddy.host/?sharecode=GHP2NOW5R2">
  COHUB · What's on
</a>
```

- 两处文案都用 `COHUB · What's on`（原样，含中点与撇号）。
- `rel="noopener noreferrer"` 必须有；`target="_blank"` 在普通浏览器里加，在微信内置浏览器里无效但无害。
- 若点餐前端是 SPA/小程序，注意其路由层是否会把外链改写为站内跳转——必须确认最终 `<a>` 的 `href` 与原始字符串一致。

### 4.3 WebView 限制（第 3 条说明的应对）

- **普通浏览器扫码**（相机/Safari/Chrome 直接打开点餐页）：点击入口即在系统浏览器中打开，无额外工作。
- **微信扫码**：点餐页会落在微信内置 WebView，页面里的 `wa.me` 跳转会被微信拦截或降级。WebView 内**无法**用代码强制跳系统浏览器（微信禁止任意 scheme 跳出）。可行兜底：
  1. 入口旁加一行小字提示：「如页面无法打开或跳转失败，请点右上角 ··· 选择"在浏览器打开"」；
  2. 提供长按复制链接（把原始 URL 文本放在 `title` 或复制按钮里，同样原样）；
  3. 桌贴二维码直接指向品牌页（见 4.4）时，客人扫码即离开点餐页，不受 WebView 影响。
- 不要为此接任何"跳转小程序/唤醒 App"的私有 scheme——那属于伪造外部接口。

### 4.4 二维码素材（已生成并校验）

沙箱已生成 1200×1200 PNG 两张（整数倍缩放、4 模块静区、300 DPI、ECC=H），并经 OpenCV 独立解码器逐张验证**解码结果与原始 URL 完全一致**：

| 文件（沙箱 `/workspace/`） | 内容 | 解码校验 |
|---|---|---|
| `COHUB-Whatson-QR-short-1200.png` | `https://tinyurl.com/222b8ypa` | OK，与原串一致 |
| `COHUB-Whatson-QR-full-1200.png` | `https://aabdf71311a39e29e.app.workbuddy.host/?sharecode=GHP2NOW5R2` | OK，与原串一致 |

- 桌贴印刷建议用**短链版**：点阵更稀疏（21 vs 33 模块边长）、磨损容错更高，且已实测 301 完整保留 sharecode。
- 用户另有自备 1200×1200 PNG，可与本素材任选其一；无论用哪张，印刷前打样扫一次。

## 5. 待办与阻塞点

| 项 | 状态 |
|---|---|
| 链接与参数行为验证 | ✅ 完成（第 2 节） |
| 二维码素材 | ✅ 完成（第 4.4 节） |
| 点餐页源码定位 | ⛔ 阻塞：需要用户提供点餐系统的仓库/路径，或确认是哪个第三方平台 |
| 在点餐欢迎页加入口 | 等上一项解除后实现 |
| 在结账/账单页加入口 | 同上 |
| 微信 WebView 兜底文案 | 实现时一并加（第 4.3 节） |

边界声明（沿用项目红线）：接入时只加入口与提示，不改点餐下单/结账主流程；不伪造 WhatsApp/邮件等外部通道；链接原样、不做统计改写（如需点击统计，只允许在不改 href 的前提下进行，例如外层容器监听，且失败不得阻断跳转）。
