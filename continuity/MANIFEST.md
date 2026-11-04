# JOVIAN PMS · 归档内容清单

建立时间：2026-11-04。目的：办公电脑 WorkBuddy 云端不可用时，全部内容仍可从 GitHub 和资料库取回，供其它电脑 / 本地 WorkBuddy / Codex 继续修改与续写。

## 一、GitHub（主存档）

- 仓库：`Popo841103/codex-pan`（私有）
- 分支：`jovian-pms-test`
- 本清单写于 `ba64db0` 时期，只记录当时的归档快照；**后续批次不改写本行**，以仓库 `git log -1` 与 `continuity/PROJECT-STATE.md` / `WORKBUDDY-HANDOFF.md` 为准（截至 2026-11-04 为 `0ad964c`）。
- 归档目录：`continuity/`
- 线上测试服务：`https://pms.jovianhome.com`

仓库本身就是完整源码存档，包含：

| 目录 | 内容 |
|---|---|
| `pms/` | 运行时代码（`server/`、`src/`、`web/`、`deploy/`）、测试 `test/`、DOM 验证 `verification/` |
| `docs/pms/` | 需求、架构、清单、各版本开发与部署记录、`research/` 调研 |
| `handoff/research/` | SmartOrder 四份调研原文（完整对照、深度增量、逐页补充、只读核查进行中） |
| `WORKBUDDY-HANDOFF.md` | 逐批次英文交接（权威、最详细） |
| `JOVIAN-CURRENT-STATUS.md` | 当前发布状态与验证索引 |
| `.github/workflows/` | 持续测试与部署工作流（**不要修改**） |
| `continuity/` | 本次新增的续写归档 |

`continuity/` 内：

| 文件 | 用途 |
|---|---|
| `README.md` | 换电脑 / 换工具的入口、上手步骤、硬约束 |
| `PROJECT-STATE.md` | 架构、批次、当前状态、真实接入状态、剩余缺口 |
| `SESSION-LOG.md` | 会话上下文重建：决策、坑与修法、验证演进 |
| `VERIFICATION.md` | 测试命令、线上核验、证据边界 |
| `MANIFEST.md` | 本文 |
| `assets/github-deploy-keys-empty.png` | GitHub Deploy keys 设置页空状态截图，**不含任何凭据** |

## 二、资料库（镜像与在线阅读）

个人资料库中的文件夹「**JOVIAN PMS 续写档案**」，内含在线文档与完整源码快照。具体节点链接：

- 文件夹「JOVIAN PMS 续写档案」：https://www.workbuddy.cn/space/d/gNlfjv1toVvAtB2qSIvW7k
- JOVIAN PMS · 续写入口（2026-11-04）：https://www.workbuddy.cn/space/d/8kIr7aPgGP0GPGLh74iBxN
- JOVIAN PMS · 项目状态与续写地图（2026-11-04）：https://www.workbuddy.cn/space/d/9TIelxQ9ITkK7TOoTCkS9R
- JOVIAN PMS · 会话上下文重建（2026-11-04）：https://www.workbuddy.cn/space/d/6XvRfhofA1RKeTBxK2FnKV
- JOVIAN PMS · 验证与发布核验清单（2026-11-04）：https://www.workbuddy.cn/space/d/VO36Bzqmnp0cRkrA9yVDhr
- JOVIAN PMS · WORKBUDDY-HANDOFF 逐批交接（2026-11-04）：https://www.workbuddy.cn/space/d/QFXraBd7xMKzvKY0MKJ2fO
- JOVIAN PMS · 当前状态索引（2026-11-04）：https://www.workbuddy.cn/space/d/QRpDEheef5z1gLKIgwQnl3
- SmartOrder 完整页面功能对照：https://www.workbuddy.cn/space/d/240gVU2BL6yAnFNtoPb0lc
- SmartOrder 深度调研增量 2026-10-27：https://www.workbuddy.cn/space/d/VnSODm07CEJnXUfvLWlRZ5
- SmartOrder 补充逐页调研 2026-10-26：https://www.workbuddy.cn/space/d/Mc671DjBaW2uXPz0VcpUy0
- SmartOrder 只读核查与功能对照（进行中）：https://www.workbuddy.cn/space/d/5qSiW3pqMz8W40CpaPMKm7
- JOVIAN NOBEDS 渠道接入方向：https://www.workbuddy.cn/space/d/HeqMXqFNE15FwWCeeEf2YP
- SmartOrder 深度调研增量（docs 版）2026-10-27：https://www.workbuddy.cn/space/d/Z2kE6ccf5CwU4NRiwR4WOE
- SmartOrder 补充逐页调研（docs 版）2026-10-26：https://www.workbuddy.cn/space/d/tiPJ8mMMIGmuwq9s94ZQy3
- 完整源码快照 zip 与本文自身：见同一文件夹下的同名节点（打包时链接尚未产生）。

资料库文档清单（与 GitHub `continuity/` 及仓库根文档一一对应）：

1. 续写入口（`README.md`）
2. 项目状态与续写地图（`PROJECT-STATE.md`）
3. 会话上下文重建（`SESSION-LOG.md`）
4. 验证与发布核验清单（`VERIFICATION.md`）
5. 归档内容清单（`MANIFEST.md`）
6. WORKBUDDY-HANDOFF（逐批次交接）
7. JOVIAN 当前状态索引
8. SmartOrder 完整页面功能对照
9. SmartOrder 深度调研增量
10. SmartOrder 补充逐页调研
11. SmartOrder 只读核查与功能对照（进行中）
12. 完整源码快照 zip（GitHub 打不开时取回源码）

## 三、明确不放进归档的内容

- 任何凭据：密码、deploy key 私钥、token、Cookie、`.env`、数据库导出、客人身份资料。
- `.git/`、依赖目录 `node_modules/`、`__pycache__/`、字节码缓存。
- WorkBuddy 的原始会话缓存、内部工具输出、本地沙箱路径、推理过程。归档只放面向读者的成品。
- 线上数据库与测试账号数据：保留在测试环境，不导出、不重置。

## 四、快照内容

资料库里的 zip 是同一仓库的工作树快照（含 `continuity/`），排除上述第三项内容。取回后解压即可得到一个可直接 `git init` + 继续开发的代码树；如需完整提交历史，仍以 GitHub 仓库为准。

## 五、恢复检查

- [ ] 能从 GitHub clone 并切到 `jovian-pms-test`
- [ ] 能读到 `continuity/README.md` 与 `WORKBUDDY-HANDOFF.md`
- [ ] 资料库里能打开续写文档并下载源码快照 zip
- [ ] `npm test` 与 Python 测试能跑通（Node 24）
- [ ] 线上 `/healthz` 仍返回 200

## 六、上一批镜像（2026-11-04，代码 `0ad964c`，已被第七节取代）

父文件夹「JOVIAN PMS 续写档案」：https://www.workbuddy.cn/space/d/gNlfjv1toVvAtB2qSIvW7k

**本批最新镜像子文件夹「最新状态 · 代码 0ad964c（2026-11-04）」：https://www.workbuddy.cn/space/d/pusBqavOwyeJ6buww4QxKe**

上面第二节列出的 2026-11-04 早期同名文档是历史快照（停在 `2792aec` / Node 325），状态已过期；判断当前进度请以下表的最新镜像或以 GitHub `git log -1` 为准。

| 文档 | 链接 |
|---|---|
| JOVIAN PMS · 资料库最新镜像导航（最新 0ad964c） | https://www.workbuddy.cn/space/d/d6CCMtaj97XQ6AWnWlyyZx |
| JOVIAN PMS · 续写入口（最新 0ad964c） | https://www.workbuddy.cn/space/d/3GdfVJtjFYbqbt8OutueLt |
| JOVIAN PMS · 项目状态与续写地图（最新 0ad964c） | https://www.workbuddy.cn/space/d/0A49siWVtfZ7WJrA12U3Vd |
| JOVIAN PMS · 自主连续推进记录（最新 0ad964c） | https://www.workbuddy.cn/space/d/ZNfRmZomMtw8WhVvnWzYVx |
| JOVIAN PMS · 会话上下文重建（最新 0ad964c） | https://www.workbuddy.cn/space/d/I9IZNOH9STAL4trMfqfANB |
| JOVIAN PMS · 验证与发布核验清单（最新 0ad964c） | https://www.workbuddy.cn/space/d/vZeLwHUeuH9u0Oskc2VzmF |
| JOVIAN PMS · 归档内容清单（最新 0ad964c） | https://www.workbuddy.cn/space/d/TroQDCbWSRfTqzbGSG7YHo |
| JOVIAN PMS · WORKBUDDY-HANDOFF 逐批交接（最新 0ad964c） | https://www.workbuddy.cn/space/d/Pu6Tc9IGUHmO33ZOv2zorW |
| JOVIAN PMS · 当前状态索引（最新 0ad964c） | https://www.workbuddy.cn/space/d/axR4gNUDM5WTOKZC9raXXT |
| 完整源码快照 zip（最新 0ad964c） | https://www.workbuddy.cn/space/d/jHXinzS1OC4akj6KfokOpO |

导航说明 `continuity/LIBRARY-MIRROR.md` 也放在该子文件夹内，说明权威来源、当前基线、剩余边界与换工具接手提示词。

## 七、当前最新镜像（2026-11-04，代码 `546e331`）

父文件夹「JOVIAN PMS 续写档案」：https://www.workbuddy.cn/space/d/gNlfjv1toVvAtB2qSIvW7k

**本批最新镜像子文件夹「最新状态 · 代码 546e331（2026-11-04）」：https://www.workbuddy.cn/space/d/w1TNESL6MOHTBlX5eqC8vb**

第六节与更早的同名文档是历史快照，不要用来判断当前进度；以本节的镜像或 GitHub `git log -1` 为准。该子文件夹共 11 个节点（9 份文档 + 1 份源码快照 zip + 1 份导航）：

| 文档 | 链接 |
|---|---|
| 资料库最新镜像导航（最新 546e331） | https://www.workbuddy.cn/space/d/vWkfdb22h15fItJhr7w9WB |
| 续写入口（最新 546e331） | https://www.workbuddy.cn/space/d/HqepwhMoMgxexn2PCzEYQU |
| 项目状态与续写地图（最新 546e331） | https://www.workbuddy.cn/space/d/Xexhj7kmGRjyraZCWYyJ5G |
| 自主连续推进记录（最新 546e331） | https://www.workbuddy.cn/space/d/tQAO74VNieNy0FBFvIej55 |
| 会话上下文重建（最新 546e331） | https://www.workbuddy.cn/space/d/9seHMSehQGiDWoBGhDHu4j |
| 验证与发布核验清单（最新 546e331） | https://www.workbuddy.cn/space/d/L3opxVFVr0wX2eZQcP5ch0 |
| 归档内容清单（最新 546e331） | https://www.workbuddy.cn/space/d/cGddE4uurSbYQ1TIKoAIRc |
| 资料库镜像导航说明（最新 546e331） | https://www.workbuddy.cn/space/d/XlgPDHSLgktvFwWG470P75 |
| WORKBUDDY-HANDOFF 逐批交接（最新 546e331） | https://www.workbuddy.cn/space/d/f5zAEPl1rqdAAIt0m50XJM |
| 当前状态索引（最新 546e331） | https://www.workbuddy.cn/space/d/nsUUSbYLo5pec34ZOqZ6eg |
| 完整源码快照 zip（最新 546e331，932 KB / 202 文件） | https://www.workbuddy.cn/space/d/ujuGpf5gL5XhnV2cAOd347 |

GitHub 对应提交：代码 `546e331`、交接文档 `d9cc9df`，分支 `jovian-pms-test`；已部署并线上核验。`/workspace/JOVIAN-PMS-archive-2026-11-04-P6.zip` 是同一份快照的本地副本（排除 `.git`、依赖目录、数据库导出与凭据）。
