# JOVIAN PMS · 资料库最新镜像导航（2026-11-04）

> 本文件夹是 **2026-11-04 自主推进队列 P1–P5 收敛后的最新镜像**。同一父文件夹「JOVIAN PMS 续写档案」下 2026-11-04 早些时候建立的同名文档是**历史快照，状态已过期**，不要用来判断当前进度（那些文档停在代码 `2792aec`、Node 325）。

## 权威来源

**永远以 GitHub 为准**：私有仓库 `Popo841103/codex-pan` 的 `jovian-pms-test` 分支，读 `continuity/README.md` → `continuity/PROJECT-STATE.md` → `continuity/AUTONOMOUS-RUN.md` → `WORKBUDDY-HANDOFF.md`。资料库是只读镜像，可能落后于仓库；若两者不一致，以仓库 `git log -1` 为准。

| 项目 | 当前值 |
|---|---|
| 最新代码提交 | `0ad964c`（管理员显式清除到期身份资料、访客数据密钥随发布备份） |
| 最新文档提交 | `73fd793` |
| 线上测试服务 | https://pms.jovianhome.com （`/healthz` 200） |
| Node 测试 | **374/374**（Ubuntu，Node 24） |
| Python / DOM / 语法 | Python 5/5、16 个 DOM 脚本、38 个运行时 JS 语法、部署 shell `bash -n` |
| 自主队列 | P1–P5 **全部完成**，详见 `continuity/AUTONOMOUS-RUN.md` |

## 本文件夹内容

| 文档 | 对应仓库文件 |
|---|---|
| 续写入口 | `continuity/README.md` |
| 项目状态与续写地图 | `continuity/PROJECT-STATE.md` |
| 自主连续推进记录 | `continuity/AUTONOMOUS-RUN.md` |
| 会话上下文重建 | `continuity/SESSION-LOG.md` |
| 验证与发布核验清单 | `continuity/VERIFICATION.md` |
| 归档内容清单 | `continuity/MANIFEST.md` |
| WORKBUDDY-HANDOFF 逐批交接 | `WORKBUDDY-HANDOFF.md` |
| 当前状态索引 | `JOVIAN-CURRENT-STATUS.md` |
| 完整源码快照 zip | `git archive` 导出的全量 tracked 文件（无 `.git`、无凭据） |

各文档与快照的具体节点链接记录在仓库 `continuity/MANIFEST.md` 第六节；本文件夹内可直接点开上表所有条目。

## 最新一批做了什么（P5）

身份资料保存期限与显式清除：门店可配保留天数（默认 90），服务端按 UTC+8 本地日与离店日期算 cut-off；管理员看到截止日与到期条数后二次确认才清除，只清加密证件与 PIN，不动订单、账务与审计，且**没有任何定时器或自动删除**。发布备份把 `self-checkin.key` 一并纳入（仅主机本地复制，密钥不进仓库）。同时修掉一个真实部署隐患：`BOOTSTRAP.txt` 内嵌的部署脚本校验副本不同步会让新服务器装回旧脚本。

## 仍然不能当作已完成

真实支付 / OTA / 消息 / 门锁 / 设备发码（NOBEDS、TTHotel 只是目标接口，严禁伪造联调）；PostgreSQL 迁移与真实并发验证；真机 Edge / 手机视觉验收；Windows 两项私有文件权限失败用例需用户本机复核；照片 / 自拍 / OCR 自动核验；身份资料自动到期删除（刻意不做）、备份目录加密、密钥轮换与「数据库 + 原密钥」恢复演练。这些是既定产品边界，不是待修 bug。

## 换工具接手时贴这段话

> 请阅读仓库根目录下的 `continuity/README.md`、`continuity/PROJECT-STATE.md`、`continuity/AUTONOMOUS-RUN.md`、`continuity/SESSION-LOG.md` 和 `WORKBUDDY-HANDOFF.md`。这是 JOVIAN PMS 的续写交接；先复述当前状态与剩余缺口，再按我的要求继续开发。不要重建系统、不要重置数据、不要伪造外部接口、不要提交凭据。
