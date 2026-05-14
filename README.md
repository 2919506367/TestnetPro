# Cloud Drive - 个人网盘 MVP

一个本地可运行的个人网盘 Web 应用，支持用户注册/登录、文件上传/下载/删除。

## 一、技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| 后端 | Next.js API Routes |
| 数据库 | SQLite (通过 Prisma ORM + libsql 适配器) |
| 认证 | JWT (jose) + httpOnly Cookie |
| 密码加密 | bcryptjs (12 rounds) |
| 文件上传 | busboy 流式解析 |
| 文件存储 | 本地磁盘 storage/uploads/ |

## 二、已实现功能

- ✅ 用户注册（邮箱 + 密码，密码加密存储）
- ✅ 用户登录（JWT + httpOnly Cookie，7天有效期）
- ✅ 用户登出
- ✅ 登录状态检查 (/api/auth/me)
- ✅ 未登录鉴权拦截
- ✅ 文件上传（busboy 流式解析，支持大文件）
- ✅ 5GB 单文件大小限制（前后端双重校验）
- ✅ 文件列表（仅显示当前用户的文件）
- ✅ 文件下载（流式传输，验证文件归属）
- ✅ 文件删除（确认弹窗，同时删除数据库记录和磁盘文件）
- ✅ 账号隔离（用户只能操作自己的文件）
- ✅ 路径穿越防护
- ✅ 原始文件名保留，服务器端 UUID 重命名存储
- ✅ 上传失败时清理残留文件
- ✅ 磁盘文件不存在时优雅处理

## 三、项目目录结构

```
cloud-drive/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/       # POST 注册
│   │   │   ├── login/          # POST 登录
│   │   │   ├── logout/         # POST 登出
│   │   │   └── me/             # GET 当前用户
│   │   └── drive/
│   │       ├── files/          # GET 文件列表
│   │       │   └── [id]/       # DELETE 删除文件
│   │       ├── upload/         # POST 上传文件
│   │       └── download/
│   │           └── [id]/       # GET 下载文件
│   ├── drive/
│   │   └── page.tsx            # 网盘页面
│   ├── layout.tsx              # 根布局
│   ├── globals.css             # 全局样式
│   └── page.tsx                # 首页（登录/注册）
├── components/
│   ├── FileList.tsx            # 文件列表组件
│   ├── UploadArea.tsx          # 上传区域组件
│   └── ConfirmDialog.tsx       # 确认对话框组件
├── lib/
│   ├── db.ts                   # Prisma 客户端单例
│   ├── auth.ts                 # 认证工具（JWT、密码、Cookie）
│   └── storage.ts              # 文件存储工具
├── prisma/
│   ├── schema.prisma           # 数据库模型定义
│   └── migrations/             # 数据库迁移文件
├── storage/
│   └── uploads/                # 用户上传文件存储目录（已加入 .gitignore）
├── package.json
├── next.config.ts
├── tsconfig.json
├── prisma.config.ts
├── .env
├── .gitignore
└── README.md
```

## 四、核心文件说明

| 文件 | 作用 |
|------|------|
| `lib/db.ts` | Prisma 客户端初始化，使用 PrismaLibSql 适配器连接 SQLite |
| `lib/auth.ts` | JWT 创建与验证、密码哈希与验证、Cookie 管理 |
| `lib/storage.ts` | 文件存储路径管理、文件名清洗、防路径穿越 |
| `app/api/auth/register/route.ts` | 注册接口：校验邮箱密码、查重、创建用户、签发 JWT |
| `app/api/auth/login/route.ts` | 登录接口：验证密码、签发 JWT |
| `app/api/drive/upload/route.ts` | 上传接口：busboy 流式解析 multipart，pipe 写入磁盘 |
| `app/api/drive/download/[id]/route.ts` | 下载接口：验证权限后流式传输文件 |
| `app/api/drive/files/route.ts` | 列表接口：查询当前用户的文件 |
| `app/api/drive/files/[id]/route.ts` | 删除接口：验证权限后删除记录+磁盘文件 |

## 五、数据库结构说明

### User 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (自增) | 主键 |
| email | String (唯一) | 邮箱/用户名 |
| password | String | bcrypt 加密的密码 |
| createdAt | DateTime | 注册时间 |

### DriveFile 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int (自增) | 主键 |
| userId | Int | 所属用户 ID（外键） |
| originalName | String | 用户上传的原始文件名 |
| storedName | String | 服务器存储名（UUID + 扩展名） |
| mimeType | String | 文件 MIME 类型 |
| size | BigInt | 文件大小（字节） |
| storagePath | String | 服务器绝对路径 |
| createdAt | DateTime | 上传时间 |

## 六、本地运行步骤

### 前置要求
- Node.js 18+
- npm

### 1. 安装依赖
```bash
npm install
```

### 2. 初始化数据库
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. 启动开发服务器
```bash
npm run dev
```

### 4. 浏览器访问
打开 http://localhost:3000

## 七、完整测试步骤

### 1. 注册账号
打开 http://localhost:3000，切换到「注册」标签，输入邮箱和密码（至少6位），点击注册。

### 2. 登录测试
注册成功后会自动跳转到网盘页面。也可以注销后用同一账号登录。

### 3. 上传小文件测试
在网盘页面点击上传区域，选择一个小于 5GB 的文件上传。上传成功后文件列表会自动刷新。

### 4. 下载测试
点击文件卡片上的「下载」按钮，浏览器会下载该文件，文件名为原始文件名。

### 5. 删除测试
点击「删除」按钮，弹出确认对话框，点击「确认删除」后文件从列表消失。

### 6. 刷新页面后文件列表是否还在
刷新页面，文件列表中的数据仍然存在（数据持久化在 SQLite 中）。

### 7. 换账号登录测试账号隔离
退出当前账号，注册一个新账号登录。新账号的网盘应该看不到第一个账号上传的文件。

### 8. 测试超过 5GB 限制
尝试上传一个超过 5GB 的文件：
- 前端：选择文件后会立即提示「文件大小超过限制 (最大 5GB)」
- 后端：即使用工具绕过前端校验，后端也会拒绝并返回 413 错误

## 八、安全设计说明

| 安全措施 | 实现方式 |
|----------|----------|
| 密码加密 | bcryptjs，12 rounds salt |
| 会话管理 | JWT 存储在 httpOnly Cookie 中 |
| 防 XSS | Token 不暴露给 JavaScript |
| 文件归属验证 | 所有文件操作都验证 `file.userId === currentUserId` |
| 路径穿越防护 | `path.basename()` + `path.resolve()` 后检查路径前缀 |
| 文件名冲突 | UUID + 原始扩展名重命名 |
| 上传限制 | 前后端双重 5GB 校验 |
| 文件隔离 | 用户文件存储在 storage/uploads，不在 public 目录 |
| 错误信息 | 不泄露服务器路径和敏感信息 |
| 上传失败清理 | 写入失败时主动删除磁盘残留文件 |

## 九、当前已知限制

1. **断点续传**：当前不支持。大文件上传中断后需要重新上传。
2. **上传进度**：前端暂未显示实时上传进度条。
3. **分片上传**：未实现，整文件一次性上传。
4. **秒传**：不支持相同文件识别。
5. **文件夹**：不支持，所有文件扁平展示。
6. **搜索/过滤**：未实现，文件列表不支持搜索。
7. **回收站**：删除操作不可撤销。
8. **在线预览**：不支持，只能下载。
9. **分享链接**：不支持文件分享。
10. **多设备并发**：当前使用 SQLite，高并发场景有限制。
11. **5GB 上传在 Next.js 中的实际表现**：当前 MVP 使用 busboy 流式解析，理论上支持流式写入不占满内存。但 Next.js App Router 的 Request body 通过 `Readable.fromWeb()` 转换，实际 5GB 上传的稳定性需要进一步验证。

## 十、后续部署到服务器时要注意什么

1. **数据库迁移**：将 SQLite 改为 PostgreSQL，修改 `prisma/schema.prisma` 中的 provider 和 `db.ts` 中的适配器。
2. **环境变量**：生产环境务必设置 `JWT_SECRET` 环境变量。
3. **文件存储**：考虑使用 S3/R2/MinIO 等对象存储替代本地磁盘。
4. **反向代理**：使用 Nginx 配置 `client_max_body_size 5500m;` 以支持 5GB 上传。
5. **HTTPS**：生产环境必须启用 HTTPS，Cookie 的 `secure` 标志会自动启用。
6. **进程管理**：使用 PM2 或 systemd 管理 Next.js 进程。
7. **存储目录**：将 `storage/uploads` 放在项目目录外，使用环境变量配置路径。
8. **构建命令**：`npm run build && npm run start`。
