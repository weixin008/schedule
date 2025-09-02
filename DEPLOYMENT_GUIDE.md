# 排班系统部署指南：使用 1Panel OpenResty 反向代理

本指南将详细说明如何将排班系统部署到生产环境，并使用 1Panel 面板中的 OpenResty（Nginx）进行反向代理。反向代理可以提供更好的安全性、性能和域名管理。

## 1. 前置条件

在开始之前，请确保满足以下条件：

*   **排班系统已通过 Docker Compose 部署**：您已经成功运行了 `docker-compose -f docker-compose.yml up -d --build` 命令，并且 `schedule-api` (后端) 和 `schedule-ui` (前端) 容器正在运行。
*   **1Panel 面板已安装并可访问**：您已在服务器上安装了 1Panel，并且可以通过浏览器访问其管理界面。
*   **域名已准备好（可选，但推荐）**：如果您希望通过域名访问应用，请确保您已购买域名并将其解析到您的服务器公网 IP。

## 2. 步骤一：恢复 `schedule-ui/Dockerfile` 到原始状态 (重要!)

我们之前为了调试，在 `schedule-ui/Dockerfile` 中添加了临时的 `sed` 替换命令。现在，由于我们将使用反向代理，前端的 `API_URL` 将通过 `.env` 文件配置，不再需要这个临时的 `sed` 替换。

请在您的服务器项目目录下执行以下 Git 命令来撤销之前的修改：

```bash
# 1. 确保您在项目根目录
# cd /path/to/your/project/root

# 2. 撤销对 schedule-ui/Dockerfile 的本地修改
git restore schedule-ui/Dockerfile

# 3. 拉取远程仓库的最新代码 (确保没有其他未提交的修改)
git pull

# 4. 重新构建前端镜像，确保 sed 命令已被移除
#    这一步会使用 Dockerfile 中原始的 ARG API_URL 变量
docker-compose -f docker-compose.yml build --no-cache schedule-ui
```

## 3. 步骤二：配置 `.env` 文件以适应反向代理

在反向代理模式下，前端应用将通过代理访问后端。因此，`API_URL` 和 `CORS_ORIGIN` 需要指向您的代理地址。

请编辑您项目根目录下的 `.env` 文件，确保其内容如下所示：

```ini
# API URL (前端通过代理访问后端的地址)
# 如果您使用域名，请替换为您的域名，例如：http://your_domain.com/api
# 如果您没有域名，直接使用服务器公网IP，例如：http://your_server_ip/api
API_URL=http://your_domain.com/api

# CORS 配置 (允许前端域名访问后端)
# 请替换为您的前端访问域名，例如：http://your_domain.com
# 如果您没有域名，直接使用服务器公网IP，例如：http://your_server_ip
CORS_ORIGIN=http://your_domain.com

# 其他配置项保持不变或根据需要修改
# API_PORT=9020
# UI_PORT=80
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**重要提示：**
*   请将 `your_domain.com` 替换为您的实际域名。
*   如果您没有域名，请将 `your_domain.com` 替换为您的服务器公网 IP (`117.72.205.253`)。
*   `API_URL` 的路径通常是 `/api`，因为我们会在反向代理中将所有 `/api` 路径的请求转发给后端。

修改 `.env` 文件后，请重新构建并启动服务，以应用新的配置：

```bash
# 清理旧服务
docker-compose -f docker-compose.yml down

# 使用新的 .env 文件重新构建并启动
docker-compose --env-file .env -f docker-compose.yml up -d --build
```

## 4. 步骤三：在 1Panel 中设置反向代理 (OpenResty)

现在，您需要在 1Panel 中配置 OpenResty 来进行反向代理。

1.  **登录 1Panel 面板**：通过浏览器访问您的 1Panel 管理界面。
2.  **进入“网站”或“应用”管理**：在左侧导航栏中找到“网站”或“应用”相关的菜单项。
3.  **添加反向代理**：
    *   点击“反向代理”或“添加网站” -> “反向代理”。
    *   **域名/IP**：
        *   **域名**：填写您希望通过哪个域名访问应用（例如 `your_domain.com`）。
        *   **端口**：填写 `80`（HTTP）或 `443`（HTTPS）。
    *   **代理目标**：
        *   **协议**：选择 `HTTP`。
        *   **主机**：填写 `127.0.0.1` (因为 OpenResty 和 Docker 容器都在同一台服务器上)。
        *   **端口**：
            *   对于前端 UI：填写 `9010` (这是 `schedule-ui` 容器暴露在主机上的端口)。
            *   对于后端 API：填写 `9020` (这是 `schedule-api` 容器暴露在主机上的端口)。
    *   **路径映射 (关键!)**：
        您需要为前端和后端分别设置路径映射。
        *   **前端 UI 映射**：
            *   **路径**：`/` (表示所有根路径的请求)
            *   **目标**：`http://127.0.0.1:9010`
            *   **勾选**：通常需要勾选“传递主机头”、“传递协议头”等选项。
        *   **后端 API 映射**：
            *   **路径**：`/api/` (表示所有以 `/api/` 开头的请求)
            *   **目标**：`http://127.00.1:9020/api/` (注意这里目标路径也要带 `/api/`)
            *   **勾选**：通常需要勾选“传递主机头”、“传递协议头”等选项。
    *   **SSL/HTTPS (推荐)**：如果您有域名，强烈建议在这里配置 SSL 证书，启用 HTTPS 访问。1Panel 通常提供免费的 Let's Encrypt 证书申请。
    *   **保存并部署**：完成配置后，保存并部署反向代理。

## 5. 步骤四：验证部署

1.  **访问应用**：在浏览器中输入您的域名（或服务器公网 IP），例如 `http://your_domain.com`。
2.  **检查网络请求**：打开浏览器开发者工具（F12），切换到“网络”选项卡，检查前端发出的 API 请求是否都指向了您的域名（或公网 IP），并且状态码是 `200 OK`。
3.  **检查容器日志**：如果遇到问题，可以查看 `docker logs schedule-api` 和 `docker logs schedule-ui` 来获取更多信息。

## 6. 重要提示

*   **防火墙/安全组**：确保您的服务器防火墙和云服务商的安全组只开放了 `80` 和 `443` 端口给外部访问。`9010` 和 `9020` 端口**不需要**直接暴露给互联网。
*   **内部通信**：`OpenResty` 会通过 `127.0.0.1:9010` 和 `127.0.0.1:9020` 来访问 Docker 容器暴露的服务。
*   **浏览器缓存**：每次修改配置后，请务必清除浏览器缓存或强制刷新页面。

希望这份指南能帮助您顺利完成部署！
