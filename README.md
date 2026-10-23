# YangHang / Bryce — Portfolio

个人主页，包含 About、Works、Music、Thoughts 和 Travel。使用 HTML、CSS 和原生 JavaScript，无需构建或后端。

## 本地预览

在项目根目录运行：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://127.0.0.1:4173/ 。请通过 HTTP 服务预览，以保证字体正常加载。

## GitHub Pages 部署

1. 将项目提交并推送到 `yanghang-bcz/portfolio` 的 `main` 分支。
2. 仓库 **Settings → Pages → Build and deployment**，选择 **Deploy from a branch**。
3. 选择 **main** 和 **/(root)**，保存。
4. 部署完成后的默认地址为 https://yanghang-bcz.github.io/portfolio/ 。

根目录已有 `index.html` 和 `.nojekyll`，资源使用相对路径，栏目采用 `#about` 等锚点路由，适用于项目子路径。首次配置后，推送到发布分支会触发更新。

## 静态资源自愈（assets.js）

站点上线的实际故障是：**部分图片显示成破损图标 / 只剩 alt 文字，字体退回到系统衬线体**，刷新一次换一批。

排查结论是资源路径全部正确，坏在传输层——线上抓包记录到 `net::ERR_CONNECTION_CLOSED`，连接在传输中途被掐断，HTTP 状态码根本没回来，所以既不是 404 也不是大小写问题。文件本身完好：65 个资源逐个 HEAD 校验，状态码全是 200，`content-length` 与本地字节数逐一相等。

真正的问题是浏览器对失败的 `<img>` 和字体**不会重试**：断一次就永久停在破损状态。`assets.js` 补上这一层，只做重试，不改路径、不改尺寸、不改配色、不改排版：

- **图片**：捕获阶段收 `error`，最多重试 3 次（500 / 1500 / 3500ms），在原 `src` 上挂 `?retry=n` 绕开失败缓存。`music.js` 动态生成的封面同样是 `<img>`，一并覆盖。另有一条打捞逻辑，处理监听器挂上之前就已失败的图。
- **背景图**：`.paper` 是 CSS 背景，失败后只剩底色，用一张探针图走同一套重试，成功后写回元素（此时已在缓存里，不二次下载）。
- **字体**：`document.fonts` 里状态为 `error` 的字体面，用同名 + 新 URL 重新声明 `@font-face`，后声明覆盖前者，字形来自同一份文件，渲染结果不变。
- 重试次数有上限，永久缺失的文件不会无限重试。资源一次就成功时，这段代码不在 DOM 里留下任何痕迹（无 `data-*`、无内联 `<style>`、无查询串）。

回归里为此加了 4 条断言（`verification/check.html`），其中一条用一个故意不存在的路径验证「重试到第 3 次就停」。

## 图片格式：PNG → WebP（保留 PNG 可回退）

首屏需要下载的位图有 22 张，原先是 18.13 MB 的 PNG。同参数转成 WebP（`quality=82, method=6`）后是 2.36 MB，**减少 87.0%**，冷缓存首次访问的总传输量从 26.16 MB 降到 10.62 MB（**-59.4%**）。

- 转换**只改容器**：像素尺寸、RGBA 通道、画面内容逐张校验一致，没有重新采样、没有改尺寸、没有动配色和排版。
- 撕纸边缘和颗粒是重点核对对象：把 PNG 与 WebP 都合成到棋盘格底上做差分，边缘处最大偏差 14–35/255，均值 1.15–1.92，超过 6/255 的像素不超过 4.42%，与转换前的 /tmp 预验证完全一致。
- 原始 PNG **全部保留**在 `assets/` 下，回退只需把 `index.html` / `style.css` 里的 `.webp` 改回 `.png`。
- JPEG（照片与唱片封面）本次不动：重新编码只省 3%，且有 6 张反而变大。
- `assets/manifest.json` 里每条都记了 `pngOriginal` 与 `derivedFrom`，方便追溯。

## 文件

- `index.html`：页面与内容。
- `style.css`：样式与响应式布局。
- `assets.js`：静态资源重试（连接中断后的自愈），正常加载时不干预。
- `app.js`：导航及首页动画。
- `music.js`：唱片数据与交互。
- `reader.js`：文章阅读弹层。
- `assets/`：实际使用的图片、字体及许可证；`manifest.json` 保留素材来源记录。位图以 `.webp` 为准，同名 `.png` 为回退用原件。
- `verification/check.html`、`verification/run-checks.mjs`：开发检查工具，当前 117 条断言全部通过；运行需要另行安装 Node.js 和 playwright-core。截图及生成的检查结果不提交。

## 素材与署名

© 2026 YangHang / Bryce。字体的授权说明保留在 `assets/`。唱片封面等第三方素材的权利归原权利人所有，网站署名不替代这些素材的使用许可。
