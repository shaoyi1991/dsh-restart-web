# dsh-restart-web

[English](#english) | [中文](#中文)

---

<a id="english"></a>

## One-click Restart for DeepSeek Harness

Adds a **Restart** button to the DSH Web settings panel. Click it to safely restart the entire DSH process — the browser auto-refreshes after 5 seconds.

### Install

```sh
dsh plugin --profile web add dsh-restart-web
```

Or from GitHub:

```sh
dsh plugin --profile web add github:shaoyi1991/dsh-restart-web
```

After install, restart DSH once, then open **Settings → Restart** in the Web UI.

### Cross-platform

| Platform | Method | Status |
|---|---|---|
| macOS | `lsof` + `kill` + process-group escape | ✅ |
| Linux | `lsof` + `kill` + process-group escape | ✅ |
| Windows | `netstat` + `taskkill` | ✅ |

The restart logic runs as a standalone Node.js script (`lib/restart.js`), spawned as a detached process so it survives DSH's exit cleanup on all platforms.

### How it works

```
Web UI (Settings → Restart)
    │
    ▼  POST /api/dsh-restart
Host plugin (lib/index.js)
    │
    ├── macOS/Linux: bash + set -m → restart.js in new process group
    └── Windows:     node → restart.js directly (detached)
          │
          ├── 1. Wait 2s (let HTTP response return)
          ├── 2. Kill process on port 3080
          ├── 3. Start new DSH: node bin.js web
          └── 4. Exit (DSH keeps running)
```

### Why not just call `dsh`?

DSH is often installed via `npx` and not on PATH inside a subprocess's clean environment. This plugin uses `process.execPath` + `process.argv[1]` to get absolute paths that always work — no PATH dependency.

### License

MIT

---

<a id="中文"></a>

## DeepSeek Harness 一键重启插件

在 DSH Web 设置面板中添加**「重启」**按钮。点击后安全重启整个 DSH 进程，浏览器 5 秒后自动刷新重连。

### 安装

```sh
dsh plugin --profile web add dsh-restart-web
```

或从 GitHub 安装：

```sh
dsh plugin --profile web add github:shaoyi1991/dsh-restart-web
```

安装后重启一次 DSH，然后在 Web UI 中打开 **设置 → 重启** 即可使用。

### 跨平台支持

| 系统 | 重启方式 | 状态 |
|---|---|---|
| macOS | `lsof` + `kill` + 进程组逃逸 | ✅ |
| Linux | `lsof` + `kill` + 进程组逃逸 | ✅ |
| Windows | `netstat` + `taskkill` | ✅ |

重启逻辑是一个独立的 Node.js 脚本（`lib/restart.js`），以独立进程方式启动，不受 DSH 退出清理影响。

### 工作原理

```
Web 界面（设置 → 重启）
    │
    ▼  POST /api/dsh-restart
Host 插件（lib/index.js）
    │
    ├── macOS/Linux: 用 bash set -m → 在新进程组中启动 restart.js
    └── Windows:     直接用 node → 启动 restart.js（detached 模式）
          │
          ├── 1. 等待 2 秒（让 HTTP 响应正常返回）
          ├── 2. 杀掉占用 3080 端口的进程
          ├── 3. 启动新的 DSH：node bin.js web
          └── 4. 退出（DSH 继续运行）
```

### 解决了什么问题

**为什么不直接用 `dsh` 命令？**
DSH 通常通过 `npx` 安装，在子进程的清洁环境中 `dsh` 不在 PATH 上。本插件使用 `process.execPath` + `process.argv[1]` 获取绝对路径，不依赖 PATH。

**为什么需要 `set -m`？**
DSH 退出时会自动清理所有子进程组（`kill(-pid, SIGKILL)`）。`set -m` 让重启脚本进入独立进程组，DSH 的清理杀不到它。（Windows 没有这个问题，直接用 detached 模式。）

### 使用场景

- DSH 卡死、无响应
- 安装新插件或修改配置后需要重新加载
- 内存占用过高，想重启释放

### 开源协议

MIT
