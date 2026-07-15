# Aerith Agent

一个参考 [pi](https://github.com/earendil-works/pi) 架构、从 MVP 开始逐步迭代的 AI coding agent。

## 当前目录结构

```
Aerith-agent/
├── .gitignore              # Git 忽略规则：不提交 node_modules、dist、reference、docs 等
├── biome.json              # 代码格式和 lint 规则配置
├── package.json            # 根 package.json：npm workspaces 和脚本入口
├── package-lock.json       # npm 依赖锁定文件
├── tsconfig.base.json      # 根 TypeScript 基础配置
├── tsconfig.json           # 根 TypeScript 检查配置，包含 workspace 包的路径映射
│
├── packages/
│   ├── ai/                 # LLM 层：统一接口、OpenAI 兼容 provider、provider 工厂、mock provider
│   ├── agent/              # Agent 层：工具注册、Agent 循环、会话管理（SessionManager + JSON 存储）
│   ├── coding-agent/       # CLI 应用：参数解析、首次引导、配置读取、交互模式、TUI 集成
│   └── tui/                # 终端 UI 层：ProcessTerminal、ScreenBuffer（差分渲染）、TUI 主循环
│
├── reference/              # 本地参考：克隆的 pi 仓库，方便随时对照（未提交到 Git）
└── docs/                   # 本地文档：迭代记录和 TypeScript 入门教程（未提交到 Git）
```

## 常用命令

```bash
# 安装依赖
npm install

# 代码检查（Biome + TypeScript 类型检查）
npm run check

# 构建所有包
npm run build

# 本地测试（不依赖真实 API）
npm run test:local
npm run test:session
npm run test:tools

# 运行 CLI（开发）
npx tsx packages/coding-agent/src/cli.ts -p "hello"

# 运行构建后的 CLI
./packages/coding-agent/dist/cli.js -p "hello"
```

## 快速配置

首次在 TTY 运行不带 `-p` 的 CLI 会启动引导，自动写入 `~/.aerith/config.json`：

```bash
./packages/coding-agent/dist/cli.js
```

也可以手动创建 `~/.aerith/config.json`：

```json
{
  "model": "kimi-for-coding",
  "apiKey": "sk-..."
}
```

如果你使用的是 Kimi 开放平台（非 Code Plan），配置示例：

```json
{
  "model": "kimi-k2.7-code",
  "apiKey": "sk-...",
  "baseURL": "https://api.moonshot.cn/v1"
}
```

## 主要包说明

### @aerith/ai

- `src/types.ts`：核心类型（Message、Tool、ToolCall、LLMProvider 等）。
- `src/openai.ts`：OpenAI 兼容 provider，支持流式输出。
- `src/providers/factory.ts`：provider 工厂，根据 provider 名称（openai、kimi 等）创建对应实例。
- `src/providers/faux.ts`：mock provider，用于本地测试。

### @aerith/agent

- `src/agent.ts`：Agent 主循环，反复调用 LLM、执行工具、拼接对话。
- `src/tools.ts`：内置工具（read_file、write_file、edit_file、bash、list_dir、grep、git）。
- `src/extensions/`：扩展/插件系统，支持从 `~/.aerith/extensions/*.js` 加载自定义工具和 provider。
- `src/compaction.ts`：上下文压缩/摘要，防止长会话 token 爆炸。

### @aerith/coding-agent

- `src/cli.ts`：CLI 入口。
- `src/main.ts`：主流程，区分打印模式、交互模式、首次引导。
- `src/args.ts`：命令行参数解析。
- `src/settings.ts`：配置管理（全局 + 项目级）。
- `src/first-time-setup.ts`：首次启动引导。
- `src/tui-mode.ts`：TUI 交互模式集成。

### @aerith/tui

- `src/terminal.ts`：终端接口，处理原始输入、键盘解析、光标移动，支持 PageUp/PageDown。
- `src/screen.ts`：屏幕缓冲区，前后两帧对比，只渲染变化的部分。
- `src/tui.ts`：TUI 主循环，维护输入、历史、消息列表、滚动偏移。
- `src/components/`：多行输入、Markdown 渲染（含代码高亮）、选择列表。

## TUI 命令

在 TUI 交互模式下，可以使用以下斜杠命令：

- `/model`：列出所有可用模型。
- `/model provider/model`：切换当前使用的模型。
- `/clear`：清空当前会话的屏幕消息。

也可以按 `PageUp` / `PageDown` 滚动浏览历史消息。

## Provider 支持

Aerith 原生支持：

- OpenAI 兼容协议（OpenAI、Kimi 开放平台、Kimi Code Plan 等）。
- Anthropic Messages API。
- Google Gemini API。

Kimi Code Plan 用户使用 `-m kimi-for-coding` 即可自动使用 `https://api.kimi.com/coding/v1`。

## 扩展

将自定义扩展放到 `~/.aerith/extensions/*.js`，启动时自动加载。扩展可以注册新工具和自定义 provider。详见 `docs/iterations/12-extension-system.md`（本地文档）。

- `reference/`：pi 仓库克隆，用于对照源码和架构。
- `docs/`：迭代记录和 `TypeScript入门.md` 教程。

这两个目录只在本地，未提交到 Git。

## License

MIT
