# Vercel Corepack 配置指南

为保证在 Vercel 上使用与本地一致的包管理器版本（pnpm@10.11.1），需要开启 Corepack 并设置环境变量。

## 必做配置

1. 在项目根的 `package.json` 已添加：
   - `"packageManager": "pnpm@10.11.1"`

2. 到 Vercel 项目设置中添加环境变量（需在 Vercel 控制台完成）：
   - 名称：`ENABLE_EXPERIMENTAL_COREPACK`
   - 值：`1`
   - 环境：Production 与 Preview 都添加

参考：
- Vercel Changelog：Corepack（experimental）支持（https://vercel.com/changelog/corepack-experimental-is-now-available）
- Vercel 文档：Configuring a Build（https://vercel.com/docs/deployments/configure-a-build）

## 可选项（如遇到安装阶段识别问题）

- 在 Vercel 项目设置的 Build & Development Settings 中，显式覆盖 Install Command：
  - `pnpm install --frozen-lockfile`

一般无需覆盖，Vercel 会根据 `pnpm-lock.yaml` 自动识别 `pnpm`，但若你的项目框架或自定义脚本有特殊要求，可考虑此项。

## 验证

配置完成后触发一次新的部署，日志中应能看到：
- 检测到 `ENABLE_EXPERIMENTAL_COREPACK=1` 与 `packageManager: pnpm@10.11.1`
- 安装与构建阶段正常进行，无 "packageManager 版本不匹配" 报错。