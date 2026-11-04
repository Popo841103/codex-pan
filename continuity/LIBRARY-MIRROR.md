# JOVIAN PMS · 资料库最新镜像导航（2026-11-04）

> 本文件夹是 **2026-11-04 自主推进队列 P1–P8 收敛后的最新镜像**。同一父文件夹「JOVIAN PMS 续写档案」下 2026-11-04 早些时候建立的同名文档是**历史快照，状态已过期**，不要用来判断当前进度（那些文档停在代码 `2792aec`、Node 325）。

## 权威来源

**永远以 GitHub 为准**：私有仓库 `Popo841103/codex-pan` 的 `jovian-pms-test` 分支，读 `continuity/README.md` → `continuity/PROJECT-STATE.md` → `continuity/AUTONOMOUS-RUN.md` → `WORKBUDDY-HANDOFF.md`。资料库是只读镜像，可能落后于仓库；若两者不一致，以仓库 `git log -1` 为准。

| 项目 | 当前值 |
|---|---|
| 最新代码提交 | `b4754fc`（佣金更正历史、新建门店零库存、三处空门店 UI 缺陷修复） |
| 最新文档提交 | `73fd793` |
| 线上测试服务 | https://pms.jovianhome.com （`/healthz` 200） |
| Node 测试 | **397/397**（Ubuntu，Node 24） |
| Python / DOM / 语法 | Python 5/5、17 个 DOM 脚本、37 个运行时 JS 语法、部署 shell `bash -n` |
| 自主队列 | P1–P8 **全部完成**，详见 `continuity/AUTONOMOUS-RUN.md` |

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

## 最新一批做了什么（P7 / P8，`b4754fc`）

**最新镜像在「JOVIAN PMS 续写档案」下按代码提交号 `b4754fc` 命名的子文件夹**；链接表见 `continuity/MANIFEST.md` 第七节，若该节尚未更新到 `b4754fc`，以仓库 `git log -1` 为准。旧镜像（`w1TNESL6MOHTBlX5eqC8vb` 对应 `546e331`、`pusBqavOwyeJ6buww4QxKe` 对应 `0ad964c`）均为历史快照。

**新建门店从零开始，全部手填**：用户明确删掉「10 间房 + 30 床位实际布局待确认」这一项，改为新门店默认为空。设置页新增「新建门店」（仅管理员），新门店**没有房型、没有房间、没有床位、没有价计划、没有订单**，房型 / 房号 / 床位全部由管理员在「房型与资源设置」里手动录入；创建动作写 append-only 审计并标记 `starterInventory:'empty'`。原有的演示门店与 `seed()` 完全不动。说明文案改为「系统不预设任何房间数量」，不再暗示存在一份待确认的真实布局。同批修掉三处在全新安装（零门店）才暴露的缺陷：空白安装会显示「服务连接失败」、门店下拉切换失效、从选择器里切换被拒。

**佣金更正保留前后金额**：财务佣金页新增最近 50 条录入 / 更正历史，同时显示变更前与变更后金额、账单号与结算状态，只展示不过账。

全量回归 Node **397/397**、Python **5/5**、**17** 个 DOM 脚本、37 个运行时 JS 语法检查通过；线上 `/healthz` 200，前端新标识外部实见，后端命令属部署重启推断。上一批 P6 是交班现金盘点与差异审批（`546e331`）。

## 上一批（P6，`546e331`）

**当前最新镜像子文件夹**：https://www.workbuddy.cn/space/d/w1TNESL6MOHTBlX5eqC8vb （导航页 https://www.workbuddy.cn/space/d/vWkfdb22h15fItJhr7w9WB ；共 11 个节点：9 份文档 + 1 份源码快照 zip + 1 份导航）。旧的 `pusBqavOwyeJ6buww4QxKe`（代码 0ad964c）与更早镜像是历史快照。完整链接表见 `continuity/MANIFEST.md` 第七节。

交班现金盘点与差异审批：交班时可填「实点现金」（留空=不盘点，系统绝不替人填 0）；期望净现金只算本班收款减退款、按收付方式分列，押金是负债单列、不计入抽屉现金。实点与期望不符时记为「待管理员审批」，只有管理员填原因并二次确认才能审批，且**实点、期望、差异三个金额原样保留**，差异不会被悄悄抹平；旧交班记录形状完全不变。全量回归 Node 385/385、Python 5/5、16 DOM、38 个运行时 JS 语法检查通过。上一批 P5 是身份资料保存期限与显式清除（保留天数默认 90、管理员二次确认清除、`self-checkin.key` 随发布备份）。

## 仍然不能当作已完成

真实支付 / OTA / 消息 / 门锁 / 设备发码（NOBEDS、TTHotel 只是目标接口，严禁伪造联调）；PostgreSQL 迁移与真实并发验证；真机 Edge / 手机视觉验收；Windows 两项私有文件权限失败用例需用户本机复核；照片 / 自拍 / OCR 自动核验；身份资料自动到期删除（刻意不做）、备份目录加密、密钥轮换与「数据库 + 原密钥」恢复演练；现金盘点按面额 / 备用金 / 收银员细分、每日自动现金上缴、差异自动生成调整分录、对账单期结与银行对账（审批只记原因，不过账）；**平台房源链接批量导入**（用户已提出，尚未实现：只在公开可读时抓取，抓不到如实说明，导入前先给用户确认清单，绝不做登录态抓取）。这些是既定产品边界，不是待修 bug。

## 换工具接手时贴这段话

> 请阅读仓库根目录下的 `continuity/README.md`、`continuity/PROJECT-STATE.md`、`continuity/AUTONOMOUS-RUN.md`、`continuity/SESSION-LOG.md` 和 `WORKBUDDY-HANDOFF.md`。这是 JOVIAN PMS 的续写交接；先复述当前状态与剩余缺口，再按我的要求继续开发。不要重建系统、不要重置数据、不要伪造外部接口、不要提交凭据。
