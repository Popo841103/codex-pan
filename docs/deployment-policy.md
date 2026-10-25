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
