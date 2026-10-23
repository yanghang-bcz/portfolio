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

## 文件

- `index.html`：页面与内容。
- `style.css`：样式与响应式布局。
- `assets.js`：静态资源重试（连接中断后的自愈），正常加载时不干预。
- `app.js`：导航及首页动画。
- `music.js`：唱片数据与交互。
- `reader.js`：文章阅读弹层。
- `assets/`：实际使用的图片、字体及许可证；`manifest.json` 保留素材来源记录。
- `verification/check.html`、`verification/run-checks.mjs`：开发检查工具，当前 117 条断言全部通过；运行需要另行安装 Node.js 和 playwright-core。截图及生成的检查结果不提交。

## 素材与署名

© 2026 YangHang / Bryce。字体的授权说明保留在 `assets/`。唱片封面等第三方素材的权利归原权利人所有，网站署名不替代这些素材的使用许可。
