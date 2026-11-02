# CO-HUB 到店页面

新增 today.html、today.css、today.js；沿用仓库根目录 styles.css。无需 React、Tailwind、npm 或构建步骤。网站实际为原生静态站。页面中文采用用户提供的文案；阿罗街按最新要求为步行5分钟。19种预置语言在本地切换，沿用 cohub-language 存储键，阿拉伯语支持 RTL。扩展译文尚未母语审校。

## 页面与交互

部署后原生路径为 /today.html。预约按钮触发本页 #host-event，直接复用 community.html 的原弹窗标记与 host-event.js、member-config.js、languages.js，沿用登录、填写时间及需求、待审核提交；这不是即时确认的设备预约。来源以可见的 [source=in_venue_screen] 追加至原 description 字段；不新增数据库字段或 API。scripts/member-system/build-today.py 从 community.html 同步弹窗，避免维护第二套表单。WhatsApp 使用既有 60178497319。地图为地点搜索链接，不虚构策划好的漫步路线。

## 配置 /today 或 /live

把下列规则加入现有 cohub.jovianhome.com 的 Caddy 站点块，放在 file_server 前，保留原 root、TLS 及其他规则：

```caddy
@arrival path /today /live
rewrite @arrival /today.html
redir /today/ /today 308
redir /live/ /live 308
```

这是建议的增量配置，本次没有修改服务器 Caddy，也未将路由上线。应通过既有受管理部署流程应用并验证配置；不使用手工SCP或替换现有部署。配置后 /today 和 /live 均读取同一页面；尾斜杠重定向保证相对资源和活动链接正确。

新增根目录HTML/CSS/JS已符合现有GitHub Actions路径触发与打包规则。源码推送cohub-website会自动触发原官网工作流；服务器配置不属于当前静态文件包，需另由既有基础设施流程维护。未配置短路由前，桌码可在确认部署成功后使用 https://cohub.jovianhome.com/today.html 。

## 验证

通过：既有322条文案语言覆盖检查；7项部署安全测试（Windows临时目录改用工作区后通过）；106个静态文件打包；新增页19语运行时切换、语言记忆、RTL、所有步行时间5分钟；既有活动hash处理器及链接检查。

限制：Playwright已准备，但Edge无头启动崩溃，未完成浏览器截图/实际多宽度验收。CSS设置680px断点、单列手机卡片及可访问焦点样式，仍需浏览器实测。发布沿用 cohub-website 的 GitHub Actions，最终状态以工作流与公网校验为准。未修改数据库、会员记录、既有页面或商品。

## 2026-11-02 修正
补齐原控制器依赖的 member-open-mine、member-load-events 与 member-public-list，防止初始化提前异常造成关闭按钮无响应。场地免费，发起者可说明并收取活动成本费用；19语同步。
