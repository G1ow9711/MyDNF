# 运行说明

## 安装

```powershell
$env:npm_config_cache="F:\My_DNF\.codex-local\cache\npm"
npm install
```

## 开发运行

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

打开 Vite 输出的本地地址，例如 `http://127.0.0.1:5173/`。

## 验证

```powershell
npm test
npm run build
```

## 存档

浏览器本地存档键：`mydnf-save-v1`。

游戏内进入 `设置` 面板后可使用 `保存` 和 `读取`。
