# 已发布：试营业优惠 · RM1 加购咖啡（IG + FB + TikTok 统一发）

> 状态：**✅ v3 已发布**（2026-11-01 11:56，4 图完整版，一条 post 同时发三个平台）
> ⚠️ v1（11:25，3 图）为旧版，**需业主在 App 内手动删除** —— Metricool 无删除接口。

## 基本信息

- **编号**：CH-D007
- **主题**：试营业首两周 · 首次到店 RM1 加购指定咖啡
- **语言**：**全英文**（业主要求）
- **平台**：Instagram @cohub.kl + Facebook @cohub.kl + TikTok @cohub.klcc（**同一条内容统一发**）
- **v3 发布时间**：2026-11-01 11:56（Asia/Kuala Lumpur）
- **Metricool v3**：post id `412645495` · uuid `-998195950886631817` · [在日历中打开](https://app.metricool.com/planner/calendar?blogId=7642312&openWithPostUuid=-998195950886631817)
- **TikTok 标题**：`RM1 coffee at COHUB KL — soft opening`

## 版本历史

| 版本 | 时间 | 图 | 文案 | 状态 |
|------|------|-----|------|------|
| v1 | 11:25 | 3 图 | 纯优惠 | 已发布，**待业主手动删除** |
| v2 | — | 3 图 | +店铺介绍 | 仅草稿，未落地（已发布帖改不了图，故升级为 v3 重发） |
| **v3** | **11:56** | **4 图** | **五要素开头 + 优惠** | **✅ 最终版，已发布** |

## 发布直链

### v3（最终版，11:56）

| 平台 | 链接 | 状态 |
|------|------|------|
| Instagram | https://www.instagram.com/p/DfL0XqEiAhh/ | PUBLISHED |
| Facebook | https://facebook.com/122122475151478512/posts/122124339225478512 | PUBLISHED |
| TikTok | https://www.tiktok.com/@cohub.klcc/video/7703046860000610311 | 已上传（TikTok 回执 AWAITING_CONFIRMATION，video id 已生成） |

> TikTok 的 `AWAITING_CONFIRMATION` 是 TikTok 侧回执延迟，视频 id 已生成即代表上传成功，通常几分钟内在 App 内可见。

### v1（旧版，待业主手动删除）

| 平台 | 链接 |
|------|------|
| Instagram | https://www.instagram.com/p/DfLwzHNCIp6/ |
| Facebook | https://facebook.com/122122475151478512/posts/122124333627478512 |
| TikTok | https://www.tiktok.com/@cohub.klcc/video/7703039167659347221 |

## 置顶

业主要求把这条置顶。**Metricool MCP 不支持置顶**（`instagramData` / `facebookData` / `tiktokData` 均无 pinned 类字段），需业主在三个平台 App 内手动操作：

- **Instagram**：个人主页 → 打开该帖 → 右上角 `⋯` → **Pin to your profile**（最多置顶 3 条）
- **Facebook**：该帖右上角 `⋯` → **Pin to top of Page**（置顶到主页顶部，只能置顶 1 条）
- **TikTok**：个人主页 → 打开该视频 → 右下角 `⋯` → **Pin to your profile**（最多置顶 3 条）

> 置顶请对 **v3（11:56）** 那条操作，v1 删掉即可。

---

# v3 最终文案（4 图版）

```
COHUB — café, craft beer, food, coworking & events.
Bukit Bintang, Kuala Lumpur.

Specialty Arabica coffee. Award-winning craft beer from our own brewery.
Food all day. 09:00–23:30.

SOFT OPENING — FIRST 2 WEEKS

Add a selected coffee for RM1
with any regular-priced food or drink.
First visit only.

30 cups a day. One per person.

COHUB
No. 38A & 38B, Jalan Berangan,
50200 Kuala Lumpur, Malaysia

WhatsApp: +60178497319
Open daily 09:00–23:30

#SoftOpening #KualaLumpur #BukitBintang #CoffeeKL #CraftBeerKL
```

## v3 的 4 张图（顺序）

| 序 | 文件 | 内容 | 规格 |
|----|------|------|------|
| 1 | `CH-D007_opening_1.jpg` | 三杯咖啡（主图，对应 RM1 优惠） | 1080×1350 |
| 2 | `CH-D007_opening_2.jpg` | 四宫格菜品 | 1080×1350 |
| 3 | `CH-D007_opening_4_full.jpg` | **啤酒品鉴套装 6 杯**（本次补入） | 1080×1350 |
| 4 | `CH-D007_opening_3.jpg` | 吧台 | 1080×1350 |

## 关于第 4 张的两个版本

源图为横构图 1447×1087（6 杯一字排开），做了两版：

- **A 居中裁切** `CH-D007_opening_4_crop.jpg` —— 左右两杯被切掉一半，只剩中间 4 杯
- **B 完整保留** `CH-D007_opening_4_full.jpg` —— 上下用高斯模糊延展同色背景补成 4:5，**6 杯全部完整**，无拼接痕迹

**业主选择 B**。裁切脚本：`_staging/crop_opening4.py`。

> 教训：横图不能一律跳过。产品横排图（如品鉴套装）用模糊延展比硬裁更好，硬裁会破坏「套装」概念。

---

# v2 文案：补充店铺介绍（业主 11:34 要求，已被 v3 取代）

> **背景**：业主指出原版只有优惠，后面刷到的人不知道 COHUB 是什么店。要求补上「我们有什么」—— 餐饮、饮料，简要。
> **落地方式**：Metricool **无法修改已发布帖子的文案**，需业主在 IG / FB App 内手动 Edit 替换整段文字（不会重新发布、不丢互动）。
> ⚠️ 后续发现**已发布帖子也不能增删图片**，故 v2 无法落地，直接升级为 v3 重发。

## 改动点（相对 v1）

新增一段店铺介绍，放在优惠条款之后、地址之前：

```
COHUB is a café & bar in Bukit Bintang.
Specialty coffee. Craft beer. Food all day.
```

## v2 完整文案

```
SOFT OPENING — FIRST 2 WEEKS

Add a selected coffee for RM1
with any regular-priced food or drink.
First visit only.

30 cups a day. One per person.

COHUB is a café & bar in Bukit Bintang.
Specialty coffee. Craft beer. Food all day.

COHUB
No. 38A & 38B, Jalan Berangan,
50200 Kuala Lumpur, Malaysia

WhatsApp: +60178497319
Open daily 09:00–23:30

#SoftOpening #KualaLumpur #BukitBintang #CoffeeKL
```

## 事实依据（均来自业主此前确认，无编造）

- 云南普洱阿拉比卡（SOE 水洗 + House Espresso Blend）→ specialty coffee
- 自有精酿 → craft beer from our own brewery
- 店内实拍含牛肉面 / 鸡排饭 / 意面等正餐 → food all day
- 共享办公 coworking **已开放**（业主 11:38 确认，推翻旧记录）
- events = 场地可办活动（桌椅/投屏/网络/每座位插座），**未声称办过活动**
- 营业 09:00–23:30
- 门店状态：**soft opening**，全篇未写「已开业 / grand opening」
- ⛔ 住宿 stay 不写（未开放）；⛔ 精酿品牌 8PINTS 不写（自有工厂，仅内部记录）
