# JOVIAN PMS · 换电脑 / 换工具续写入口

> 建立于 2026-11-04。用途：办公电脑的 WorkBuddy 云端不可用时，把整个项目（代码、文档、上下文、验证方法）完整留在 GitHub 和资料库里，之后用**另一台电脑、本地 WorkBuddy、Codex 或任何能读 Git 仓库的工具**接着改、接着写，不依赖某一次对话或某一台机器。

## 一句话现状

私有仓库 `Popo841103/codex-pan` 的 `jovian-pms-test` 分支，是马来西亚 CO-HUB 青旅与 JOVIAN 公寓共用的 PMS 测试系统。代码、账号、订单、账务和数据库都在线上测试环境里，**不重建、不回退、不重置**。归档时最新代码提交 `2792aec`、最新文档提交 `6251a4b`；此后已继续开发，最新提交请以 `git log -1` 与 `WORKBUDDY-HANDOFF.md` 末尾章节为准（2026-11-04 追加 `ba64db0`：门店可配置提醒级别）。

## 三条恢复路径

| 路径 | 怎么做 | 适合 |
|---|---|---|
| **GitHub（主）** | `git clone` 仓库 → `git checkout jovian-pms-test` → 从本文件开始读 | 继续开发、跑测试、发布 |
| **资料库（镜像）** | 打开个人资料库里的「JOVIAN PMS 续写档案」文件夹，在线读文档或下载完整源码快照 zip | 只查看、只续写文档、GitHub 暂时打不开时 |
| **换 AI 工具** | 把仓库目录交给 Codex / 本地 WorkBuddy / 其它工具，让它先读 `WORKBUDDY-HANDOFF.md` 和 `continuity/` | 让新工具接上上下文 |

## 5 分钟上手

1. 拿到仓库：`git clone git@github.com:Popo841103/codex-pan.git`（私有仓库需要 deploy key 或账号权限；**不要向任何人索取或提交密码**），然后 `git checkout jovian-pms-test`。
2. 按顺序读：
   - `continuity/README.md`（本文）
   - `continuity/PROJECT-STATE.md`（现在做到哪、还剩什么）
   - `WORKBUDDY-HANDOFF.md`（逐批次的完整交接，最重要）
   - `JOVIAN-CURRENT-STATUS.md`（当前发布与验证的索引）
   - `docs/pms/START-HERE.md`、`docs/pms/requirements.md`、`docs/pms/architecture.md`
   - `handoff/research/` 下四份 SmartOrder 调研（区分「实见 / 文档 / 推断 / 未验证」）
3. 环境：Node.js **24**（用 `node:sqlite`），Python 3.11。jsdom 用于可选的 DOM 流程验证。
4. 在 `pms/` 下跑：`npm test`（Node 测试）、`python3 -m unittest discover -s test -p "test_*.py"`（发布包测试）。DOM 脚本见 `continuity/VERIFICATION.md`。
5. 改完 `git push origin jovian-pms-test` → GitHub Actions 自动测试并部署现有测试服务 → 按 `continuity/VERIFICATION.md` 核验线上，别只看 Actions 创建成功。

## 必须守住的约束（改之前先读）

- **不重建、不覆盖、不回退**线上账号、订单、账务、数据库；**不重置线上数据、不写模拟数据**到生产库。
- **不伪造外部接口**：真实 OTA、支付、消息、门锁都还没接通（NOBEDS / TTHotel 是目标）。测试里可以用合成 provider，但不能把合成结果说成真实联调。
- **发布器只刷新已有文件**：新增运行时模块不能作为新文件放进 `pms/server`、`pms/src`、`pms/web`，必须并进既有文件；`/server/` 目录不对外提供。新增文件只放 `test/`、`verification/`、`docs/`、`continuity/`。
- **不碰部署工作流、不提交任何凭据**（密钥、token、Cookie、数据库导出、`.env`）；不问密码。
- **Windows 上已知两项失败不要削弱**：`NOBEDS config requires private files...` 与 `guest encryption keys persist privately...`，测的是 POSIX 私有文件权限语义，Ubuntu CI 全通过即可。
- 调研结论要区分**实见 / 文档 / 推断 / 未验证**，不要把推断写成已验证。
- 中英马来文三语、多门店、房 / 整套 / 床位三种销售单位是既有业务事实，不要简化成单一房型。

## 换工具时怎么把上下文交给新 AI

把下面这段贴给新工具即可：

> 请阅读仓库根目录下的 `continuity/README.md`、`continuity/PROJECT-STATE.md`、`continuity/SESSION-LOG.md` 和 `WORKBUDDY-HANDOFF.md`。这是 JOVIAN PMS 的续写交接；先复述当前状态与剩余缺口，再按我的要求继续开发。不要重建系统、不要重置数据、不要伪造外部接口、不要提交凭据。

`continuity/SESSION-LOG.md` 是专门给「没有本次对话记忆」的工具准备的上下文重建材料。

## 文档地图

| 文件 | 内容 |
|---|---|
| `continuity/README.md` | 本文：恢复路径、上手、约束 |
| `continuity/PROJECT-STATE.md` | 架构、批次、当前状态、剩余缺口 |
| `continuity/SESSION-LOG.md` | 会话上下文重建：做过什么、踩过什么坑、怎么修的 |
| `continuity/VERIFICATION.md` | 测试命令、线上核验清单、证据边界 |
| `continuity/MANIFEST.md` | 全部归档内容清单与资料库对应位置 |
| `WORKBUDDY-HANDOFF.md` | 逐批次英文交接（权威、最详细） |
| `JOVIAN-CURRENT-STATUS.md` | 当前发布状态索引 |
| `docs/pms/` | 需求、架构、部署、各版本开发记录 |
| `handoff/research/` | SmartOrder 四份调研原文 |
| `pms/` | 运行时代码与测试 |

## 关于这份归档

- 归档只放**面向读者的成品**：代码、文档、上下文、验证方法。原始会话缓存、内部工具输出、本地路径、凭据一律不进归档。
- `continuity/assets/github-deploy-keys-empty.png` 是 GitHub Deploy keys 设置页的空状态截图（当时还没有任何部署密钥），**不含任何密钥或凭据**，仅留作访问方式的历史记录。
- 资料库里的 zip 是同一份仓库内容的快照（排除 `.git`、依赖目录、字节码缓存），用于 GitHub 暂时不可访问时取回源码。
