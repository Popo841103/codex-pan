# CO-HUB｜固定部署约定：GitHub 自动部署

确认日期：2026-10-25。此为用户明确的长期偏好。

## 固定工作方式
旧网站继续修改和新网站项目均以GitHub自动部署为标准。流程：读取项目资料和既有代码 → 核查已有GitHub部署工作流及目标站点 → 修改与验证 → 推送授权分支 → 检查自动部署结果和线上页面。
优先复用已有部署流程，保护其他站点；正式更新应有备份和回滚办法。不得因为当前云环境公网SSH失败，就反复要求用户安装Tailscale、下载更新包、复制终端命令。
没有工作流或缺少权限时，先明确缺什么；不能猜测部署目录、覆盖其他网站，或承诺尚未验证的自动上线。需要调整发布方式时先说明具体原因并与用户确认。

## 当前已知与尚待核实
当前本地仓库origin为 https://github.com/Popo841103/codex-pan 。用户说之前用过GitHub自动部署；实际用于生产的仓库、Actions工作流、部署分支及服务器凭据配置仍需核查。本文件不代表已推送、已配置工作流或已上线。

## 新聊天直接复制
继续维护或新建CO-HUB项目。固定使用GitHub自动部署，先读AGENTS.md、docs/project-brief.md、docs/deployment-policy.md，核查并复用已有仓库与部署流程。基于现有代码修改、验证，再通过GitHub部署并检查线上结果。由你操作终端，不让我下载更新包或复制命令。新项目使用独立目录和部署目标，保护现有网站。缺少代码、权限或配置时报告具体缺项，不擅自改换部署方式。我的本次需求是：【填写需求】。

## 保存范围
此约定保存在当前云端项目文件中，尚未证明已提交到GitHub或收藏到账号资料库。新聊天只有获得这些文件或上述指令，才能可靠沿用；不依赖跨聊天自动记忆。文件不含任何密码或密钥。

## 已核查GitHub实际情况（2026-10-25）
远程main只有README。仓库有jovian-pms-test及jovian-pms-deploy-20261020分支。现有Actions为.github/workflows/jovian-pms-test.yml，推送jovian-pms-test分支的pms目录触发，目标https://pms.jovianhome.com/web/。最近运行39977218415成功；实际步骤状态另核查。使用secrets.PMS_SSH_KEY与PMS_KNOWN_HOSTS。服务器receive-release.sh为forced-command密钥，仅允许status或deploy <sha>，固定/opt/jovian-pms-test，不允许通用shell。不能复用其权限部署CO-HUB官网，更不能通过PMS入口写入其他路径。Actions secrets元数据API当前403，不代表密钥不存在。官网独立自动部署尚待配置；不得声称官网已部署。

## 官网GitHub接入进度（2026-10-25）
网站源码及本规则已推送cohub-website分支；不再仅存在当前云工作区。工作流.github/workflows/cohub-website.yml专用于官网；7项部署测试及67个静态文件打包在GitHub运行40146936228通过。运行因缺少COHUB_SSH_KEY或COHUB_KNOWN_HOSTS停止，官网部署步骤跳过，未触及服务器。需要在服务器一次性安装scripts/deploy/ci/setup-server.sh和配套文件，并在GitHub填写官网独立密钥，之后重跑。既有PMS流程不改。未来聊天读取本分支AGENTS.md、docs/project-brief.md、docs/deployment-policy.md；main当前尚未包含官网源码。

## 已成功上线（2026-10-25 16:32，马来西亚时间，以此为准）
GitHub运行40146936228重跑成功，实际部署步骤完成；提交61a548d056c0ea93c81a98b569811161a854bf16。服务器已安装官网独立receiver，并有COHUB_SSH_KEY、COHUB_KNOWN_HOSTS可用。上线前备份/var/backups/cohub/cohub-20261025T083250Z-uc4cefp2/site-before.tar.gz。首页、住宿、社区、指南、咨询、languages.js、咖啡、啤酒共8项公网HTTPS200且SHA256与本地一致。未重启服务。后续在cohub-website分支修改并推送相关网站文件即自动触发，不再要求用户下载包、复制终端命令或配置Tailscale。docs单独修改不会触发部署。main尚未合并官网源码，未来聊天必须读取cohub-website分支。此前“配置尚缺”记录为历史状态。

## 图片目录部署注意事项（2026-10-25）
服务器receiver使用umask077，已安装版本的atomic_copy对新建子目录未显式设置0755。新建assets/cafe目录曾导致图片公网404，已通过将照片部署到原有可读assets/coffee目录解决，并以运行40178244013及公网SHA256核实成功。后续不要假定新建目录可被Web服务读取；应优先使用既有可读目录，或在正式维护receiver时修正新目录权限并验证。旧不可读assets/cafe文件未被再次使用，未擅自删除服务器目录。

## 19语种正式上线（2026-10-25 17:35，马来西亚时间）
GitHub Actions40181279754部署a20b174成功。新增16份locale-*.json与既有3语合计19语，本地切换、不调用Google实时翻译。官网名称CO-HUB Hostel & Café，新增共享办公未开放FAQ。262固定文案覆盖检查、7部署测试、既有3语浏览器回归以及8页×16扩展语×3宽度检查通过，包含RTL、语言记忆、购物车金额、WhatsApp与原始用户输入不变；请求失败重试也验证。部署备份/var/backups/cohub/cohub-20261025T093544Z-tgkgybra/site-before.tar.gz；公网26文件（8页、2脚本、16语言包）HTTP与SHA256全一致。长篇专业译文为预置初稿，非全量母语专业审校，后续继续润色。Google商家资料只整理成docs/google-business-profile-staff-en.md，未提交后台。

## 会员邮箱前端上线（2026-10-26）
GitHub运行40279423892成功部署162a82b。会员弹窗、邮箱密码表单、个人活动中心与本地官方SDK已发布；公网10个HTML/JS/CSS/语言文件HTTP与SHA256匹配，中文注册窗口、真实SDK加载及未配置Google入口隐藏已由本地浏览器验证。云端Chromium公网检查因执行环境代理CA不在浏览器信任库而停止；公网内容校验使用受信HTTPS客户端，未关闭TLS验证。未代用户注册、未发真实验证邮件。用户已发截图确认Site URL和community.html Redirect URL填写正确；SMTP及真实注册送达仍待用户邮箱测试，Google/钱包未开通，不宣称所有渠道可用。
