# 易学音乐沙龙

基于 WebRTC P2P 的在线音乐教学平台。老师端共享屏幕+麦克风，学员端实时观看，支持连线语音互动和公屏聊天。

## 特性

- **屏幕共享**：支持窗口/屏幕捕获，全屏应用也可正常显示
- **WebRTC P2P**：音视频直连，低延迟，服务器只负责信令
- **公屏聊天**：老师和学员可实时文字交流
- **连线互动**：学员可申请连线发言，老师一键邀请
- **课堂录制**：老师端可录制课堂视频（WebM 格式）

## 快速开始

### 本地运行

```bash
cd ~/Desktop/易学音乐
docker compose up -d --build
```

访问 `http://localhost:3000`

### 部署到云端

参见 [DEPLOY.md](./DEPLOY.md) 详细指南。

推荐平台：**Railway.app**（免费额度充足）

### 使用流程

1. 老师打开 `http://your-domain.com`
2. 输入姓名进入，选择麦克风/扬声器
3. 点击「开始上课」，分享房间号给学生
4. 学生打开 `http://your-domain.com/student/房间号`
5. 输入姓名进入，看到老师画面
6. 学生点击「申请连线」，老师点击「邀请」即可语音互动

## 技术栈

- 前端：Vue 3 + Element Plus + Vite
- 后端：Node.js + Express + Socket.IO
- 音视频：WebRTC (simple-peer)
- 容器化：Docker + Caddy (自动 HTTPS)

## 环境变量

| 变量 | 默认值 | 说明 |
|-----|-------|------|
| PORT | 3000 | 服务端口 |
| NODE_ENV | production | 运行环境 |

## 注意事项

- 学生端浏览器需支持 WebRTC（Chrome/Firefox/Safari 最新两版）
- 部分企业网络可能阻断 P2P，需配置 TURN 中继
- 免费云平台的「休眠」机制：30天无访问会自动暂停

## License

ISC
