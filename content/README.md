# content/ 目录说明

`content/` 存放 COHUB 社媒内容的流水线文件，只记录**内容本身与状态**，不存放任何凭据。
所有状态流转规则见 [`cohub/WORKFLOW.md`](../cohub/WORKFLOW.md)，以该文件为准。

## 状态 ↔ 目录对应关系

| 状态 | 存放位置 |
|------|----------|
| 想法 Ideas | `content/ideas/` |
| 草稿 Drafts | `content/drafts/` |
| 待业主审核 / 已批准待排期 | `content/approved/`（仅业主明确批准后放入，批准记录写在文件内） |
| 已排期 / 已发布 | `content/published/`（记录排期链接、实际发布时间与帖子链接） |

## 文件命名

`YYYYMMDD-平台-简述.md`，例如 `20261101-ig-digital-nomad-morning.md`。
平台缩写：`fb`（Facebook）、`ig`（Instagram）、`tt`（TikTok）。

## 每篇内容文件建议包含

- 编号与主题、核心信息
- 文案正文及语言（中文 / 英文 / 中英）
- 素材：仓库内路径或素材描述
- 目标平台账号
- 当前状态、计划发布时间（Asia/Kuala_Lumpur）
- 审核记录（谁批准、何时批准）
- 素材清单也同步登记到 `content/assets/`（如该目录后续建立）

## 通用约定

- 明确标注待确认事项为「待 COHUB 确认」，禁止推测价格、菜单成分、过敏原、营业状态等信息。
- 只有业主明确批准的具体文案才可标记为「已批准」，修改后必须重新审核。
- 未经批准不排期、不发布。
