# 社区会员系统：确认需求与开通交接

2026-10-26，用户参考Sola/4Seas，明确不接受首屏始终展开的提案框，也不接受仅WhatsApp／邮件转交代替会员系统。

## 当前已实现与未实现

社区首屏保留参加／发起入口；发起打开原生dialog，支持关闭、Escape和焦点恢复。账户服务尚未配置，弹窗如实说明注册准备中，并可联系团队；未向客人索取密码、伪造注册、伪造邮箱验证或保存个人活动记录。旧enquiry.html?type=host转到此弹窗，防止绕过新的账号入口。常规咨询不受影响。

Sola公开https://sola.day/signin 可见Email+Go、Google Auth、Ethereum Wallet。没有提交邮箱、发送邮件、连接钱包或登录他人账号。用户提供的个人中心截图列出“已参加／我发起的／已关注／联合主办／待处理”，这是目标需求，不是已完成能力。不能因有Google邮箱就认定已完成Google OAuth；邮箱所有权需由身份服务核验。

## 用户确认的目标

- 邮箱注册及验证；用户此前要求邮箱密码登录，Sola的邮箱入口可能为免密码认证，不照截图猜测。
- Google登录；以太坊钱包签名登录（不是收集钱包私钥/助记词，也不是转账）。
- 登录后创建活动，结构化信息含名称、介绍、时间、地点、人数、语言、费用；活动及参与关系真实持久化。
- 我的活动：已参加、我发起的、已关注、联合主办、待处理。
- 活动审核、报名确认、角色与状态由服务端权限控制；浏览器隐藏按钮不能代替权限校验。
- 继续维护19种内置语言，账号输入不翻译、不入网址、不入日志。

## 一次性开通（用户表示尚无Supabase账号）

1. https://supabase.com/dashboard 注册/登录，可使用GitHub。
2. New project，使用自己的组织，项目cohub-community，免费方案，地区Singapore。
3. 数据库密码由用户自行保存，不在聊天、仓库或截图分享。
4. 项目就绪后再检查当前控制台，获取Project URL和浏览器可用publishable key。secret key/service_role/数据库密码不放浏览器，也不公开索取。
5. 由助手完成接入源码与必要的SQL；现有静态站点发布权限不等于Supabase项目管理权限。实际配置方式待账号就绪确认，不能假定已获得管理访问。

## 开通后必须实际完成

- 邮箱验证与找回密码；开启确认邮箱；生产SMTP。Supabase默认发信有收件人和频率限制，不能未经检查就向公众发布。
- 站点URL与精确回调白名单https://cohub.jovianhome.com/，不使用任意外部redirect。
- Google OAuth需另在Google Cloud配置OAuth客户端、回调、同意屏幕；开Supabase项目不会自动获得Google登录资格。
- 钱包登录先核实Supabase当前Web3认证功能与SDK支持，使用域名绑定的一次性签名挑战、防重放与服务端验证；不自行模拟验签。是否同时要求绑定邮箱待业务确认。
- profiles、events、participations、follows、cohost invitations等数据，逐表行级权限；普通人只改自己的草稿、不能自行审核，报名人数和状态服务端原子处理。
- 重置密码、验证链接失效、限流、错误提示、退出及跨设备个人活动；验证他人记录不可读写和未验证账号不可发布。
- 完整联调后使用既有GitHub自动部署。未配置前不对外展示可工作的注册/Google/钱包按钮，也不声称“我的活动”已可用。

## 已创建项目与初始化步骤（2026-10-26最新）

用户已创建自己的Supabase项目，提供Project URL与publishable key；公开连接信息保存scripts/member-system/project.json，均为浏览器可见信息，不是后台管理密钥。2026-10-26只读检查auth/settings：email=true、disable_signup=false、mailer_autoconfirm=false，Google=false；REST查询cohub_events返回PGRST205（表不存在）。未注册任何真实会员、未向客人发验证邮件、未修改该项目。

SQL Editor入口：https://supabase.com/dashboard/project/qwdhiwghyclpkzwavhjf/sql/new
脚本：scripts/member-system/setup.sql。用户须在自己的Supabase SQL Editor粘贴全文并Run，原因是公开密钥无权创建表、函数和权限；不能用它伪装项目管理员。无需终端、数据库密码或service_role。

该增量脚本可重复运行，不删除现有数据，包含活动、报名请求、关注、联合主办邀请；RLS与服务端邮箱验证、本人数据权限、活动待审核、报名请求幂等、管理员确认和人数上限。活动新提交必须pending，普通用户无审核权限；正式报名先requested，非自动占位或支付。管理员暂在Supabase Table Editor处理；尚未实现后台审批网页。

本地PGlite Postgres兼容执行tests/member-database.mjs验证：重复运行脚本、真实数据库规则验证邮箱身份、禁止伪造owner、禁止自行批准、私人记录隔离、幂等报名、禁止直接确认、人数上限、邀请归属。测试不是Supabase远端验收；远端脚本仍未执行。运行方式：安装固定版本@electric-sql/pglite@0.3.14，用PGLITE_MODULE指向其dist/index.js，再node tests/member-database.mjs。

接下来：远端SQL成功后检查匿名只能看到approved活动；再完成并接入邮箱注册／密码登录／找回密码／我的活动前端，配置精确回调和可用SMTP，联调验证。Google OAuth及Ethereum钱包尚未开启，不能声称已接通。当前官网仍为点击弹窗和账号准备提示。

## 会员前端实现与远端验收（2026-10-26最新）

用户执行SQL后截图Success；只读远端再次核查：cohub_events匿名GET=200[]，cohub_registrations匿名GET=401 permission denied。符合公开已审核活动与私人报名隔离的设计。没有注册真实用户、没有代客发送邮件、没有发布活动或报名。

前端host-event.js已接Supabase官方JS SDK2.99.1（member-sdk.js本地打包，MIT许可保留），浏览器仅使用公开URL和publishable key。scripts/member-system/build-ui.py维护注册、邮箱密码登录、重发确认、找回／更新密码、退出、结构化活动提交、我的活动五类及公开活动请求参加／关注。注册至少8位密码，发布前getUser核验邮箱确认，服务端RLS再次限制；提交活动固定pending，参加为requested，须团队确认。账号会话由官方SDK保存在当前浏览器localStorage，密码不保存；PKCE支持同一浏览器不同标签页验证回跳，SDK清理回调code。UI不接受或存储管理员密钥。会员用户内容不经过语言替换、以textContent显示，避免活动标题HTML执行。

源码重新生成：完整运行scripts/build-community.py，勿单独重复运行build-ui.py。SDK重建：bash scripts/member-system/build-sdk.sh（固定直接版本和锁文件；node_modules不应提交或部署）。当前网站打包自动包含根目录JS，不打包scripts/member-system的SQL/依赖。

验证：tests/member-browser.py使用真实打包SDK+隔离API fixture，无真实邮件或账号写入，覆盖注册待确认、错误密码、getUser后登录、pending保存、马来西亚时区、五类个人记录、申请参加、退出、找回密码PKCE回调、密码不进浏览器存储、多语不改用户文本及HTML注入不可执行。已通过原3语全页回归、16扩展语全页宽度回归、320固定文案覆盖、7部署测试以及PGlite权限测试。这些本地联调不等同于正式邮件/OAuth验收。

尚需用户在Supabase URL Configuration设置Site URL=https://cohub.jovianhome.com，Redirect URLs加入https://cohub.jovianhome.com/community.html。生产SMTP未获管理端验证，默认Supabase发信有收件人/速率限制；需自有邮箱真实验证可送达，再决定公开推广注册。客户端对邮件限额/服务错误只显示可理解的错误，不冒充验证成功。
Google提供商当前false，按钮保持隐藏，仅后台开启后显示；Ethereum钱包尚未接入。不能将当前邮箱功能宣称为Google/钱包已开通。

团队暂通过Supabase Table Editor审核cohub_events.status为approved或rejected，确认cohub_registrations.status为confirmed（数据库检查名额），cohub_cohosts由团队创建邀请，接收者仅能接受或拒绝自己的邀请。不要在数据库未批准时宣称场地已经确认；也不要给前端service_role来绕过审核。初期只向已approved活动发出联合主办邀请。
