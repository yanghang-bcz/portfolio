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

## 文件

- `index.html`：页面与内容。
- `style.css`：样式与响应式布局。
- `app.js`：导航及首页动画。
- `music.js`：唱片数据与交互。
- `reader.js`：文章阅读弹层。
- `assets/`：实际使用的图片、字体及许可证；`manifest.json` 保留素材来源记录。
- `verification/check.html`、`verification/run-checks.mjs`：开发检查工具；运行需要另行安装 Node.js 和 playwright-core。截图及生成的检查结果不提交。

## 素材与署名

© 2026 YangHang / Bryce。字体的授权说明保留在 `assets/`。唱片封面等第三方素材的权利归原权利人所有，网站署名不替代这些素材的使用许可。
