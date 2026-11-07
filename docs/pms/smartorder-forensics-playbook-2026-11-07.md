# 参考产品取证手册：三条路径、能用什么工具、各自能拿到什么（2026-11-07 实做）

目标：把 SmartOrder 里「对账结算 / AR 核销 / 拆账」这些我们还没做的能力，做到**行为一致**。
做法不是猜，是取证。下面三条路径按「性价比」排序，每条都写清能拿到什么、拿不到什么、以及在本机怎么复现。

---

## 0. 一句话结论（先看这个，避免白干）

| 目标 | 逆向工具（IDA / Ghidra / radare2 / jadx） | 读公开前端 bundle | 登录态抓 HAR |
|---|---|---|---|
| 界面结构、文案、字段名 | 部分 | **能** | **能** |
| 接口路径 | 部分 | **能**（已拿到 241 条） | **能**（最全） |
| 请求/响应字段、枚举值、错误码 | 部分 | 只有前端声明的那部分 | **能**（最完整） |
| 服务端算法（账龄怎么算、核销顺序、分摊规则） | **不能** | **不能** | **不能** |
| 数据库结构 | **不能** | **不能** | **不能** |

> **必须说清的一件事**：SmartOrder 是 SaaS。服务端代码从不分发给任何人，桌面端和 App 里只有客户端那一半。任何逆向工具都读不到「系统是怎么编写的」——它能读到的是**客户端怎么调用服务端**。对「行为对齐」来说这已经足够（知道调什么接口、传什么字段、界面怎么摆），但**账务算法必须我们自己定义并写进文档，不能声称是抄来的**。

---

## 1. 路径 A：读公开前端（已完成，成果已入库）

参考产品后台是 Vue 3 单页应用，登录页就会把 JS 全量下载到浏览器。这是**零门槛、完全合规**的取证方式。

```bash
# 主包（版本号会变，从 /pmsManage/index 的 HTML 里取实际文件名）
curl -s https://www.smartorder.ai/pmsManage/index | grep -o 'index\.[0-9a-f]*\.bundle\.js'
curl -sS --compressed -o main.bundle.js \
  https://static-pms.smartorders.net/pmsIntlModule/pms-master/2026-11-05/index.e060fc5576f8253d1071.bundle.js

# 异步分包清单藏在 webpack 的 .u=function(e){...} 里，用正则把 id:hash 抠出来逐个下载
```

**已拿到的成果**（见 `docs/pms/smartorder-permission-catalog-2026-11-07.md`）：

- **307 个 `auth.*` 权限点**及其中文界面名，78 个分组 —— 这是它权限体系的完整清单。
- **155 条 `/v2/...` 接口路径**（主包）+ **86 条**（43 个基础分包）。
- 其中直接相关的硬证据：`POST /v2/core/web/arAccount/charge/writeOff` —— **AR 账户充值核销**。这一条就把「它到底怎么做对账」的方向钉死了。
- 权限下发接口：`POST /v2/auth/web/auth/getAllFnWithRelByUserId`，前端用 `v-permission` 按 `__PMS_PERMISSIONS__` 判权。

**这条路的天花板**（已实测）：财务模块的业务代码在**按需加载的异步分包**里，未登录时根本不下发。43 个基础分包里财务接口只有 1 条。想再往深，必须登录——见路径 B。

---

## 2. 路径 B：登录态抓 HAR（性价比最高，强烈建议先做这条）

**为什么这条最强**：财务页面一打开，对应的业务分包和接口请求就都出现在浏览器里了。抓一次 HAR，等于同时拿到「界面元素 + 接口 + 请求字段 + 响应字段 + 枚举值」，比逆向一个二进制快一个数量级，而且用的是**运营方自己的账号和自己的数据**，没有任何合规问题。

**谁来做**：运营方（账号所有者）自己做，5 分钟。接手方（codex）不需要账号。

**步骤**（Chrome / Edge）：

1. 用**已开通 AR / 对账功能的账号**登录 `https://www.smartorder.ai/pmsManage/index`。
2. 按 `F12` → 切到 **Network** 面板 → 勾选 **Preserve log**，点清空按钮。
3. 依次打开并操作这些页面（有几个开几个，没有的跳过）：
   - 账务 / AR 账户列表 → 点开一个账户 → **核销**（还款/冲销）
   - **拆账**（split bill）→ 结账 → **撤销结账**
   - 报表 → **AR 账龄表 / AR 账户余额表 / AR 挂账明细表 / AR 核销明细表 / AR 核销流水表**
   - 报表 → **调账明细表 / 宾客账结余明细表 / 权责制营业报表**
   - 设置 → 账号 → **角色**（看一眼权限勾选界面，确认与我们的矩阵是否一致）
4. Network 面板空白处右键 → **Save all as HAR with content**，存成 `smartorder-finance.har`。
5. 把 HAR 交给接手方。

**HAR 里能读出什么**（接手方按这个顺序读）：

```bash
# 1. 只看 XHR 接口，按出现顺序
python3 - <<'PY'
import json
h=json.load(open('smartorder-finance.har'))
for e in h['log']['entries']:
    u=e['request']['url']
    if '/v2/' not in u: continue
    ct=[x['value'] for x in e['response']['headers'] if x['name'].lower()=='content-type']
    print(e['request']['method'],u.split('?')[0],ct[0] if ct else '')
PY

# 2. 看某个接口的请求体（字段名就是数据模型的真相）
#    Request 里 postData.text 是 JSON，Response 里 content.text 是返回体
```

**读 HAR 的三条纪律**：

- **只提取结构，不抄实现**：字段名、枚举值、必填项、状态流转是事实；对方的代码、文案、图标不是我们的。
- **脱敏**：HAR 里有 token、手机号、客人姓名、金额。入库前必须删掉 `Authorization`、`Cookie`、`token`、`phone`、`guestName` 等字段，只留结构。**绝不把 HAR 原件提交进仓库。**
- **算法仍然没有**：HAR 能告诉你「核销接口收哪些参数、返回哪些字段」，不能告诉你「多笔挂账按什么顺序冲销」。后者必须自己定义并写进文档，标注为「我们的规则」。

---

## 3. 路径 C：客户端二进制逆向（工具能用，但门槛最高、收益最低）

参考产品确实分发客户端，所以逆向工具**有靶子**。但先看清各形态能拿到什么。

### 3.1 它有哪几种客户端（实见）

| 形态 | 证据 | 技术栈（推断） |
|---|---|---|
| Web 后台 | `https://www.smartorder.ai/pmsManage/index` | Vue 3 SPA |
| 桌面端 Windows / macOS | 官网「Desktop · Windows · macOS · Download for Windows / for macOS」；bundle 里有 `isDdllDesktopRuntime()`、`getDdllBusBridge()`、`getDdllPrintBridge()`、`reportPmsSessionToDesktop()` | **Electron 壳**（渲染层就是同一套 Web，主进程管打印、设备授权联动 `poiId`/`clientLoginName`、会话上报） |
| 移动 App | App Store `id6502392484`、Google Play `com.ddll.smart_order` | 原生或跨端（未验证）；移动端只有首页/房态/消息/预订 4 个板块，**财务不在移动端** |

### 3.2 各工具的正确用法

| 工具 | 针对什么 | 命令 | 能拿到 |
|---|---|---|---|
| **jadx**（开源） | APK / DEX → Java | `jadx -d out/ app.apk` | 接口路径、请求字段、加密逻辑、内置 H5 |
| **apktool**（开源） | APK 资源与清单 | `apktool d app.apk -o out/` | `AndroidManifest`、权限、内置网页资源 |
| **Ghidra**（NSA 开源） | 原生 `.so` / `.exe` / `.dylib` | 图形界面或 `analyzeHeadless` | 原生加密、签名、协议；Java 层被混淆时补位 |
| **radare2 / rizin**（开源） | 任意二进制，命令行 | `r2 -A bin` → `afl`、`pdf @ main` | 同上，脚本化批量分析 |
| **IDA Pro / Hex-Rays**（商业，比利时） | 同上，业界最强 | 图形界面 | 同上，反编译质量最好 |
| **asar**（Electron） | 桌面端 `app.asar` | `npx asar extract app.asar out/` | **桌面端主进程逻辑**（打印、授权、本地缓存、更新） |

### 3.3 桌面端怎么拆（如果拿到安装包）

```bash
# Windows 安装包（NSIS）→ 7z 直接解，不用运行
7z x SmartOrder-Setup.exe -o out/
# macOS 的 .dmg → 挂载后取 .app/Contents/Resources/app.asar
hdiutil attach SmartOrder.dmg
npx asar extract "/Volumes/SmartOrder/SmartOrder.app/Contents/Resources/app.asar" out/
```

拆开后能拿到的是**主进程**（打印模板、设备授权、自动更新、本地库）。**渲染层仍然是路径 A 的那套 Web bundle，不会多出财务算法。**

### 3.4 这条路为什么排最后（本沙箱实测记录）

| 实测项 | 结果 |
|---|---|
| APK 镜像站（apkpure / apkcombo / apkmirror / apkfab / apk.support） | **全部不可达**（连接无响应），拿不到 APK 样本 |
| GitHub release 下载 jadx | **失败**（release 资源域名不可达） |
| `apt-get install radare2` | 源里**没有该包** |
| JDK | **有**（OpenJDK 20 / Zulu） |
| Ghidra | 需要样本 + 约 400 MB 分发包，未安装 |
| 桌面端下载地址 | 官网首页未暴露 `.exe` / `.dmg` 直链（走 JS 或按 UA 下发），未取到 |

> 结论：**不是工具不行，是没有样本**。样本必须由能访问 App Store / Google Play / 官网下载页的一方（运营方自己的电脑或手机）下载后提供。拿到样本后，上面三条命令即可复现。

### 3.5 合规红线（写死，不许越）

- **可以**：下载公开分发的客户端、拆包、读结构，用于理解行为并写自己的实现。
- **不可以**：绕过登录/鉴权、破解付费功能、调用他人账号的数据、把对方代码或文案搬进我们仓库、把拆包产物（含其商标与代码）提交到公开仓库。
- 逆向产物只保留**事实性结论**（接口名、字段名、状态枚举），落文档时注明「实见」并附取证方法。

---

## 4. 三条路径怎么配合（建议顺序）

1. **先做路径 B**（运营方抓一次 HAR）——一次拿到财务接口与字段的九成，成本 5 分钟。
2. **路径 A 的成果直接用**（307 权限点 + 241 接口已在仓库）——权限矩阵已经据此对齐，不必重做。
3. **路径 C 仅在 B 有缺口时启用**（例如某个字段只在 App 里出现）。不要为了「用了逆向工具」而逆向。

拿到 B 之后，财务三件的实现顺序：**拆账/账单结账 → AR 账户与核销 → 8 张 AR 报表**。理由：报表的数据来自前两者，先做报表等于先做空壳。
