# Node.js 生产镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装 Python 和构建工具（某些 npm 包需要）
RUN apk add --no-cache python3 make g++

# 复制后端依赖
COPY backend/package*.json ./backend/

# 安装后端依赖
RUN cd backend && npm ci --only=production

# 复制前端并构建
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
RUN cd frontend && npm run build

# 复制应用代码
COPY backend/ ./backend/
COPY frontend/dist ./frontend/dist/

# 设置生产环境
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "backend/server.js"]
