# 战隼·无尽空域 — 授权码服务（原型）

规则（码即账号 · 宽松版）：一码绑 3 台设备，第 4 台自助踢最久未用的一台；同时在线 1 处；
昵称/排行榜/云存档挂码上；不收集个人信息；10 分钟内 >6 个不同 IP 自动冻结；输错 10 次/10 分钟冷却 15 分钟。

## 运行
```
LICENSE_ADMIN_KEY=<管理密钥> PORT=8910 node server.js
```
零依赖（Node 内置模块）。数据存同目录 data.json（原型用；正式售卖前换持久数据库）。

## 接口（POST JSON）
- /api/admin/gen {adminKey, count, note} → {codes[]}（8 位字母数字，去易混字符）
- /api/admin/status {adminKey} → 全部码状态
- /api/admin/unfreeze {adminKey, code}
- /api/activate {code, deviceId} → {token, evicted, devices, nickname, best}（换绑/开会话）
- /api/session {code, deviceId, token} → 心跳校验
- /api/score {code, deviceId, token, nickname, score, layer} → 更新最佳成绩
- /api/save {code, deviceId, token, save} / /api/load {code, deviceId, token} → 云存档
- /api/leaderboard {} → 前 20 名

## 部署待办（开卖前）
1. Render 建 Web Service（node server.js），设环境变量 LICENSE_ADMIN_KEY 与 PORT。
2. 升级 Starter（免费版会休眠 15 分钟、磁盘临时）+ 换持久存储（Render Postgres 或外部 KV），授权/购买记录不能落在临时盘上。
3. 游戏端接入：标题页输码 → /api/activate 存 token 到 localStorage；开始游戏/结算时 /api/session 校验、/api/score 上报；服务端不可达时给离线宽限，不硬锁本地游玩。

## 部署版游戏（game.html）
由 `../build_deploy.py` 从游戏工作副本生成（游戏升版后重跑即可）；服务启动后根路径 `/` 即游戏页（同源调 /api）。
- 普通玩家：阵亡后只能「从头开始」（结算页无续命按钮、回车=重开）。玩到一半的手动保存保留（用户定：保存正当，只限制死了当场接关）。
- 标题页右下角「授权码」入口：输码激活绑设备；状态存 localStorage，开局静默复验。
- 管理员码（用户 2026-11-07 定，值见 server.js 中 RUSH1980 字面量 —— 生成码字母表不含 0，永不撞码）：激活返回 admin:true，免设备上限、免异常冻结；游戏内解锁无限续命。
