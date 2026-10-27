# CO-HUB 社区活动日历

2026-10-27。沿用 cohub-website 静态站、Supabase 邮箱身份与四张会员表；不新建站点或项目。参考 Sola 4Seas 周日历的信息组织，不复制其品牌、活动或日期。

## 设计与实现

community.html 首屏后增加周／月视图、前后翻页、今天、十类筛选、吉隆坡时区、跨日活动、详情、地图与原报名请求流程。月视图可以点击日期看当天活动；手机周视图按天纵排，月视图保持七列。十张主题卡片和无人封面保留；筹备主题不会自动成为日历排期。只显示 approved 活动，过去活动不可报名。结束时间为空的旧活动仅按开始日显示并提示待确认。

community-admin.html 复用同一个登录窗口、SDK、语言和站点外壳。管理员可查看全部提案、编辑中英文内容、开始和结束时间、地点、语言、人数、费用、分类、主题封面、发布状态，确认／拒绝／取消报名。发起新活动仍复用已有提案表单，随后在后台设置结束时间和分类后发布。没有自动收款、虚构票券或重复活动规则；不删除历史记录。管理员修改后在“刷新”加载最新数据；首次登录后也点击刷新。

calendar.js/calendar.css 是独立组件；host-event.js 仅增加共享身份动作接口，不向日历暴露 token/password。scripts/member-system/build-calendar.py 在原社区生成器末尾执行，生成社区嵌入和管理页。公共日历使用公开连接 key 及 RLS 读取活动，不要求先加载身份 SDK。新字段尚不存在时回退旧表查询，现有报名继续运行。

## 一次性数据库启用（尚未在生产执行）

1. 登录原有 Supabase 项目 qwdhiwghyclpkzwavhjf，打开 SQL Editor 新查询。
2. 粘贴并执行 scripts/member-system/calendar.sql 全文。该脚本只增加字段、角色表、审计表和受限 RPC，可重复运行；不重建或删除现有资料。
3. 在 Authentication → Users 找到已验证、将管理活动的账号，复制其 User UID。只有由项目管理员在 SQL Editor 执行以下语句才能授权（替换 UUID 占位符）：

```sql
insert into public.cohub_admins(user_id)
values ('这里替换成已验证会员的User UID')
on conflict do nothing;
```

4. 官网打开 community-admin.html，使用该会员邮箱密码登录，然后点“刷新”。先编辑真实提案、填写结束时间和分类，再设为已发布。没有实际排期就保留空日历，不生成演示活动到生产。

撤销管理员：由项目管理员在 SQL Editor 执行 `delete from public.cohub_admins where user_id='需撤销的UUID';`。普通会员和网页不能操作角色表。不提供／存储 service_role key。无需重新创建 Supabase 项目，不需要用户操作服务器终端。

## 数据和权限

cohub_events 新增 ends_at、category、cover_url、title_en/zh、description_en/zh。结束时间必须晚于开始时间，分类只能十种既有ID。管理保存只接受白名单字段，不能修改owner/id；发布必须有结束时间，不能把人数降到低于已确认人数。封面仅选择已部署的主题资源。个人活动内容使用 textContent 和 data-user-content，既不执行 HTML，也不自动翻译。

cohub_admins 角色和 cohub_admin_audit 操作记录开启 RLS，无浏览器表访问权限。所有管理 RPC 每次在数据库核实当前已验证用户的管理员角色。报名邮箱只由受限管理 RPC 返回；匿名／普通会员不能读取。确认报名继续使用已有容量检查与事件行锁。浏览器隐藏入口不作为安全机制。

## 验证与限制

本地 tests/calendar-database.mjs 在 Postgres 兼容引擎验证迁移重跑、旧数据保留、角色提权被拒、非管理员禁止调用、字段白名单、时间校验、审核、私人报名和审计保护；包含原会员 RLS 测试。tests/calendar-browser.py 使用隔离网络夹具验证周月切换、跨日、中英文详情、文本注入防护、筛选、手机宽度、管理角色拒绝、编辑保存和报名确认。原会员及全站浏览器回归、语言和部署测试继续通过。测试不会创建真实账号或发送邮件。

中英马来文原生文案；其余16语言沿用站内 locale 字典（新增短语初稿，不能宣称母语审校）。原邮件由用户确认已收到，但 Google OAuth／Ethereum 登录未因此启用。生产数据库迁移和首位管理员授权需要用户现有 Supabase 管理会话，当前助手只有公开连接 key，不能自动执行。
