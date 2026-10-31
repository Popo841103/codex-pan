# codex-pan

COHUB 内容协作仓库，作为 **Codex 与 WorkBuddy 的共享资料库**。
所有已发布、已排期、待审核内容的**唯一权威记录以本仓库最新版本（main 分支）为准**，不依赖任何工具的本地记忆或聊天历史。

> 原用途：Test repo for Codex

## 目录结构

| 路径 | 说明 |
|------|------|
| [`cohub/WORKFLOW.md`](cohub/WORKFLOW.md) | **协作总规则**（必读）：状态流转、发布记录要求、事实管理、安全约束 |
| [`cohub/brand-and-facts.md`](cohub/brand-and-facts.md) | COHUB 品牌定位与运营资料（品牌事实的唯一来源） |
| [`cohub/customer-support-knowledge-base.md`](cohub/customer-support-knowledge-base.md) | 客服知识库（客服答复的唯一来源） |
| [`content/`](content/README.md) | 社媒内容流水线：ideas / drafts / approved / published |
| [`calendar.md`](calendar.md) | 内容日历总览（平台、时间、状态、链接） |

## 开工必做（Codex 与 WorkBuddy 均须遵守）

1. **先拉取最新内容再动手**（`git pull` / 读取远端最新文件），不要基于本地或记忆判断状态。
2. **一次只改一件事**，改完立即提交并说明实际变更。
3. **禁止 `git push --force`**；推送失败先拉取解决冲突，不静默覆盖他人改动。
4. 同一文件尽量同一时间只由一个工具编辑；发现冲突则**保留现有记录并标注「冲突待裁决」**，由业主裁决，不得自行删除他人内容。
5. 未确定的信息写「待 COHUB 确认」，禁止推测价格、菜单成分、过敏原、营业状态、活动日期/费用等。

## 安全

社交账号密码、访问令牌、Cookie、API Key 等**一律不得写入本仓库**，也不要粘贴到 Issue、提交记录或文件中。
Metricool 与各社媒平台的授权通过各自的官方连接/OAuth 流程单独管理。

## 发布渠道

Metricool 中此前核对到 COHUB KL 连接了 Facebook、Instagram 与 TikTok（分别为页面 ID 1353004484554678、cohub.kl、cohub.klcc）。
每次发布前仍须核对最新连接与账号状态；本记录不等同于发布授权。
