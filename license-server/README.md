# 空隼·无限永航 — 授权码服务

规则（码即账号 · 宽松版，用户 2026-11-07 定版）：一码绑 3 台设备，第 4 台自助踢最久未用的一台；
同时在线 1 处；昵称/排行榜/云存档挂码上；不收集个人信息；
10 分钟内 >6 个不同 IP 自动冻结待人工解冻；输错 10 次/10 分钟冷却 15 分钟。

## 运行
```
LICENSE_ADMIN_KEY=<管理密钥> PORT=8910 node server.js
```
零依赖（Node 内置模块）。数据存同目录 data.json（免费档磁盘临时，重启/重部署会清空；
正式售卖前须升 Starter + 持久存储）。

## 接口（POST JSON）
- /api/admin/gen {adminKey, count, note} → {codes[]}（8 位字母数字，去易混字符）
- /api/admin/status {adminKey} → 全部码状态
- /api/admin/unfreeze {adminKey, code}
- /api/activate {code, deviceId} → {token, evicted, devices, nickname, best, admin}
- /api/session {code, deviceId, token} → 心跳校验
- /api/score {code, deviceId, token, nickname, score, layer} → 更新最佳成绩
- /api/save {code, deviceId, token, save} / /api/load {code, deviceId, token} → 云存档
- /api/leaderboard {} → 前 20 名

## 部署版游戏（game.html）
由 `../build_deploy_kongyuan.py` 从桌面母本「空鸢.html」生成（游戏升版后重跑即可）；
服务启动后根路径 `/` 即游戏页（同源调 /api）。
- 开局门禁：未激活点「新游戏/继续游戏」只弹授权框、不开局；激活状态存 localStorage，同浏览器免再输；本地 file:// 母本不设卡。
- 标题页右下角「授权码」按钮走服务器激活，状态显示 未验证/已激活/管理员。
- 管理员码（值只见 server.js 字面量；生成码字母表不含 0，永不撞码）：服务器激活返回 admin:true，
  并同步游戏内管理员解锁（全部模式与管理员功能），免设备上限、免异常冻结。
- 游戏内续战/暂停等内部规则按新游戏原设计，未做改动。
