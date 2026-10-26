# 易学音乐 - 云端部署指南

## 快速部署到 Railway.app（推荐，免费）

### 前置条件
1. GitHub 账号
2. 将本项目推送到 GitHub 仓库

### 部署步骤

#### 1. 准备代码
```bash
# 克隆或创建仓库
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/yixue-music.git
git push -u origin main
```

#### 2. 部署到 Railway
```bash
# 方式一：网页操作
1. 打开 https://railway.app
2. 用 GitHub 账号登录
3. 点击「New Project」→「Deploy from Git repo」
4. 选择 yixue-music 仓库
5. Railway 自动识别 Dockerfile 并部署

# 方式二：CLI 操作
npm install -g @railway/cli
railway login
railway init -n yixue-music
railway up
```

#### 3. 获取访问地址
部署成功后，Railway 会生成一个地址：
```
https://yixue-music-production.up.railway.app
```

#### 4. 绑定自定义域名（可选）
```
设置 → Domains → 添加你的域名
Caddy 会自动申请 HTTPS 证书
```
然后修改 `Caddyfile` 中的 `example.com` 为你的域名。

### 费用说明
- **免费版**：$5/月额度（足够正常教学使用）
- 免费计划有休眠机制：30天无访问会自动暂停
- 下次访问需等待 1-2 分钟冷启动

---

## 部署到传统 VPS

### 阿里云/腾讯云轻量应用服务器
```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 3. 上传代码
scp -r ~/Desktop/易学音乐/ root@你的服务器IP:/opt/

# 4. 启动服务
cd /opt/易学音乐
docker compose up -d --build

# 5. 访问
http://你的服务器IP:3000
```

### 费用
- 阿里云轻量：2核2G ≈ 50元/月
- 腾讯云轻量：2核2G ≈ 60元/月
- 搬瓦工：19.99美元/年（不限流量）

---

## 本地开发启动

```bash
cd ~/Desktop/易学音乐
docker compose up -d --build
# 访问 http://localhost:3000
```

---

## 注意事项

⚠️ **WebRTC 穿透问题**
- 部分公司/学校网络可能阻断 P2P
- 解决方案：服务器配置 TURN 中继
- 或使用 WebRTC 中继转发（需要额外配置）

⚠️ **免费计划休眠**
- Railway/Fly.io 免费版有自动休眠
- 上课前建议先打开页面唤醒服务
