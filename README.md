# FunMD Editor V2（Blocksuite Demo）

一个基于 Vite + TypeScript 的轻量协同编辑演示项目，集成 Blocksuite 与 Yjs/Hocuspocus，支持本地协同服务与 IndexedDB 持久化。

## 功能特性
- Blocksuite 富文本与块编辑能力（`@blocksuite/*`）
- Yjs 协同编辑，支持本地 `IndexedDB` 存储（`y-indexeddb`）
- Hocuspocus 协同服务端（`@hocuspocus/server` / `@hocuspocus/provider`）
- 提供示例脚本：上传 Yjs 快照（`scripts/upload-yjs-snapshot.ts`）

## 技术栈
- `Vite 5` + `TypeScript`
- `@blocksuite/blocks` / `@blocksuite/presets` / `@blocksuite/store`
- `yjs` / `y-indexeddb`
- `@hocuspocus/server` / `@hocuspocus/provider` / `@hocuspocus/extension-sqlite`

## 环境要求
- Node.js `>= 18`（与 Vite 5 兼容）
- 推荐包管理器：`pnpm` 或使用 `npm`

## 快速开始

```bash
# 安装依赖（任选其一）
pnpm install
# 或
npm install

# 启动前端开发服务器
pnpm dev
# 或
npm run dev

# 启动本地协同后端（可选）
pnpm server
# 或
npm run server

# 预览生产构建（可选）
pnpm build && pnpm preview
# 或
npm run build && npm run preview
```

> 提示：协同编辑需要前端与协同服务配合；如仅查看前端页面，直接运行 `dev` 即可。

## 目录结构

```
FunMD_Editor_V2/
├── public/               # 静态资源
├── src/
│   ├── main.ts           # 入口文件
│   ├── server.ts         # 本地协同服务示例
│   ├── provider.ts       # Hocuspocus Provider 配置
│   ├── i18n/             # 中文文案示例
│   └── ...               # 其它辅助代码
├── scripts/
│   └── upload-yjs-snapshot.ts # 上传 Yjs 快照脚本
├── index.html
├── package.json
└── pnpm-lock.yaml / bun.lockb
```

## 常见问题
- 如果遇到协同连接失败，确认本地协同服务 `server.ts` 已启动，并检查浏览器控制台与网络面板。
- 如需持久化本地文档，确保浏览器允许 `IndexedDB` 访问。

## 许可
当前示例项目仅用于演示与内部协作，未附加开源协议；如需开源，请在提交前补充 License。