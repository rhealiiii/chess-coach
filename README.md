# Chess Coach

面向初学者的人机国际象棋教学棋盘。你执白棋、电脑执黑棋；点击棋子、再点击绿色目的地。电脑在同一搜索深度的前 4 个候选中，从落后首选不超过 0.65 兵的走法中加权随机选择；将杀局面遵循首选。悔棋会撤销一整轮（含电脑应手）。

- 响应式棋盘，明确的 8×8 网格尺寸和内置 SVG 棋子，不依赖棋子字体或图片 CDN。
- Stockfish 19 Lite 单线程 WASM，在 Web Worker 内分析，无需跨域隔离或分析 API。
- 每步比较同一局面下最佳走法与实际走法的评分，显示估计损失和评级；显示搜索深度。将杀单独判断。
- 合法走法、王车易位、吃过路兵、四种升变、将军和将死；支持悔棋、重开和翻转。
- 不自动判定三次重复、50 步与子力不足平局；不是联网对弈工具。

## 本地运行

需要 Node.js 24。

```sh
npm ci
npm run build
npm test
python3 -m http.server 8080 --directory _site
```

用 HTTP/HTTPS 打开，不能直接用文件预览运行 Web Worker。GitHub Pages 的项目子路径可以直接使用。

## 发布

Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
推送 main 后，工作流安装锁定依赖、打包引擎、运行规则和 UI DOM 测试，再发布 `_site`。

## 评级

引擎每次最多深度 14 / 200,000 节点。分值以兵为单位；白方视角显示局面分数。
实际走法用 UCI `searchmoves` 在走棋前的同一局面独立搜索。损失小于 0.5 兵：不错；0.5–1：不精确；1–2：失误；2 及以上：严重失误。与引擎首选相同：最佳走法。有限搜索的近似结果可能随设备和搜索变化，不是权威评级。

## 验证边界

自动验证初始局面 perft 20/400/8902、将死、易位、吃过路兵、32 个 SVG、合法点击走棋、实际 Stockfish 评级及重开时的过期结果。DOM 测试不等于真实 Safari 排版或 iPhone 实机测试。

## 许可与引擎来源

GPL-3.0-only，见 LICENSE。Stockfish.js 19.0.1 来自 npm 包 `stockfish@19.0.1`。
对应源代码与构建说明：https://github.com/nmrugg/stockfish.js/tree/v19.0.1
源代码归档：https://github.com/nmrugg/stockfish.js/archive/refs/tags/v19.0.1.tar.gz
上游引擎：https://github.com/official-stockfish/Stockfish
