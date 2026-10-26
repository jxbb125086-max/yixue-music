# 易学音乐沙龙 - Render 部署指南

## 平台说明
- **免费额度**：512MB 内存，永久免费（90 天无流量会休眠，首次访问自动唤醒约 30 秒）
- **适用场景**：小流量教学沙龙完全够用
- **节点位置**：选择新加坡（亚太延迟最低）

---

## 第一步：推送代码到 GitHub

1. 打开 https://github.com/new
2. 创建仓库，名称 `yixue-music`，选 Public
3. 复制生成的 HTTPS 地址（类似 `https://github.com/你的用户名/yixue-music.git`）
4. 在终端执行：
```bash
cd ~/Desktop/易学音乐
git remote add origin https://github.com/你的用户名/yixue-music.git
git push -u origin main
```

---

## 第二步：在 Render 创建服务

1. 打开 https://render.com ，用 GitHub 账号一键登录
2. 点击 **New** → **Web Service**
3. 选择刚推送的 `yixue-music` 仓库，点 Continue
4. 填写配置：

| 字段 | 值 |
|------|-----|
| Name | yixue-music |
| Region | Singapore |
| Build Command | `cd frontend && npm install && npm run build && cd .. && cd backend && npm install` |
| Start Command | `cd backend && node server.js` |
| Instance Type | Free |

5. 环境变量（Advanced → Environment Variables）：
```
NODE_ENV = production
PORT = 10000
```

6. 点击 **Create Web Service**，等待编译部署（约 2 分钟）

---

## 第三步：获取 URL

部署成功后 Render 会分配一个域名：
`https://yixue-music.onrender.com`

把这个网址发给学员，他们打开就能上课。

---

## 注意事项

- **冷启动**：首次访问需要等待约 30 秒（服务器重启）
- **内存限制**：512MB 足够，但学员人数建议 ≤ 20 人
- **续费**：免费版永久有效，不需要绑定信用卡
