# Portfolio V2 发布验收报告

日期：2026-10-24
对象：分支 `v2-optimize`（HEAD `70cb2b5`），基线 `main` `8c4f64b`
结论：**功能与视觉验收通过，建议合并；推送远程分支这最后一步被本机凭据卡住，需要你执行一条命令。尚未合并、尚未上线。**

---

## 一、通过项

### 1. 分支完整性（`main` 未被修改）

| 项 | 结果 |
|---|---|
| `main` | `8c4f64b`（与验收开始时一致） |
| `origin/main` | `8f17e2f`（未被移动） |
| `v2-optimize` | `70cb2b5`，在 `8c4f64b` 之上 **5 个提交** |
| 改动规模 | 61 文件，+939 / −51 |
| 部署配置 | **未触碰**（`.github/`、`CNAME`、`.nojekyll` 均无改动） |
| 原始 PNG | **22 张一张未删**（`assets/` 现有 png 22、jpg 32、webp 24、avif 51） |

提交清单：

```
90ad4cc  Load section assets on first entry instead of all at once         4 files  +231 −21
78df309  Ship per-image AVIF encodes and stop over-thumbnailing inner pages 58 files +56 −41
a28ede7  Subset the Chinese face to the 798 codepoints the site actually renders 5 files +9 −6
e3c3b60  Open on a frontispiece, and let ENTER work from the first frame      2 files  +556 −1
70cb2b5  Fall back to WebP when an AVIF file is actually missing…            4 files  +113 −8
```

第四阶段之后追加的 `70cb2b5` 是本次验收专用修补，只改健壮性，不动配色/尺寸/位置/字体/排版/动画。

### 2. 资源失败路径（重点：AVIF → WebP）

| 造的场景 | 修复前 | 修复后 |
|---|---|---|
| 全部 `*.avif` 404（15 次命中） | 首页 15/15 全坏、0 张退到 WebP | **首页 15/15 全部由 WebP 正常渲染，坏图 0**；About 6/6、Music 20/20、Travel 14/14 同 |
| AVIF 与 WebP 同时缺失（`orbit-a`、`photo-front`） | 开屏照写 `READY` | **`READY · 3 MISSING`**，`marks.missing=3`，不再谎报 |
| 单张 `mac.avif` 永久掐断 | — | 1 次 + 3 次重试后放弃，开屏自行放行，不卡死 |

根因：`<picture>` 只认"浏览器不支持 avif"，不认"这个文件 404"——`<source>` 一旦匹配就永远压过 `img.src`，往 `src` 上加 `?retry=` 无效。现改为显式摘掉 `<source>` 再换 `src`，并在 `tiered.js` 的同一次预载里直接改试 WebP。

### 3. ENTER 三态 × 两个口径

口径分开记：**交互解锁** = `dataset.splashDone === '1'`（撤命中区、解滚动、焦点交回）；**首页真正可见** = 第一个"DOM 里已无 `.splash`"的帧。

本地 HTTPS + HTTP/2，1.5 Mbps / 150 ms RTT / 冷缓存 / gzip：

| 模式 | 点下 | 交互解锁 | 首页可见 | 退场动画 |
|---|---|---|---|---|
| A 进站即点（0%） | 696 ms | 9533 ms（+8837） | 9544 ms（+8848） | 11 ms |
| B 加载中点（20%） | 2590 ms | 9491 ms（+6901） | 9517 ms（+6927） | 26 ms |
| C 就绪后点（READY） | 9634 ms | 9635 ms（**+1**） | 10078 ms（+444） | 443 ms |

本地 HTTP/1.1 复测结论一致（C 模式 +1 ms）。A/B 的长等待是**在等剩余资源**，不是点击失灵；C 模式的 444 ms 是纯退场动画，此时页面已经可点。

### 4. 视觉核查

- 6 栏目 × 1440 / 390 共 12 个上下文与阶段三快照比对：**TOTAL DIFFS: 0**（多轮复跑均为 0）。
- `/tmp/v2/final/` 下 1440@2×、390@3× 裁片逐张肉眼核过：EMAIL 撕纸标签边缘干净无白边；自拍主视觉清晰；飞机撕纸抠像完整；Music 封面与留声机贴纸锐利；Travel 390@3× 网格正常。

### 5. 健壮性

- 每 120 ms 连切 8 次（全部落在 600 ms 转场内）：`is-active` 仅 1 个、无残留 `is-moving`、其余栏目 `inert`、hash 与页面一致、无横向溢出。
- 返回 Home：5 颗卫星归位，首页 15/15。
- 同一会话二次进入 Music：资源请求 16 → 16（不重复下载），封面 20/20。
- 断网 2 s：14/14 坏 → 恢复后 0/14 坏（0.3 s）；断网 12 s：14/14 坏 → 恢复后 **0/14 坏（1.1 s）**。

### 6. 回归

- **133/133 全通过**（本地 HTTP，gzip）。
- 另在本地 HTTPS + HTTP/2 + `/portfolio/` **子路径**下复跑：**133/133**（同时验证了子路径部署不会断链）。
- 断言数 129 → 133，新增 4 条正对本次修补：AVIF 缺失时回退到 WebP；每张 AVIF 图都带 WebP 兜底地址；开屏如实汇报缺失数量；断网重启后重试额度重置。

### 7. 传输量（gzip，实测）

首页阶段 **27 请求 / 1765.8 KB**：image 1038.9（14）· **font 679.0（6）** · html 19.1 · js 17.0（5）· css 11.1 · other 0.6。
全站 **67 请求 / 2662.1 KB**。
字体明细：HuiwenMincho 422.1 · SpecialElite 162.6 · IMFellEnglish 58.8 · ArchitectsDaughter 13.1 · Oswald 12.8 · SpaceMono 9.6。

---

## 二、未通过项

**无。** 唯一没做完的是第 7 项"推送远程分支"——技术上失败，原因与站点无关，见下文。

---

## 三、仍存在的风险

1. **远程分支尚未推送。** 本机没有可用凭据：`GIT_TERMINAL_PROMPT=0`、钥匙串无 `github.com` 条目、未装 `gh`；`git ls-remote --heads origin` 确认远端仍只有 `main` 一条。需要你执行：
   ```
   cd ~/Documents/GitHub/portfolio && git push -u origin v2-optimize
   ```
   推送后建议用 `git ls-remote --heads origin` 复核，不要以 `git push` 的输出为准（本机曾出现过"报 fatal 但其实已推上去"的情况）。
2. **没有预发布环境**，仓库也没有任何 Vercel/Netlify/workflow 配置，Pages 只跟 `main`。所以"真实 HTTPS 冷缓存"只能用本地 TLS + HTTP/2 近似（自签证书、无 CDN、无边缘缓存、回环无真实 RTT）。已在两个最关键的维度上复跑并与 HTTP/1.1 对齐（133/133、ENTER 三态），但这**不等于线上 CDN 的实测**。
3. **首屏 38.5% 的字节是字体**（679 KB / 1765.8 KB）。其中 HuiwenMincho 已子集化到 798 字仍占 422 KB；四个内页拉丁字体（SpecialElite、IMFell、ArchitectsDaughter、Oswald）因六栏都在 DOM 里、`visibility:hidden` 也照样触发下载。还能再省，但属于优化、不属于本次验收范围，未改。
4. **`favicon.ico` 仍 404**（控制台里唯一一条 error）。这是既有问题——`main` 上同样没有 `<link rel="icon">`，**不是 V2 引入的回归**。一行 `<link rel="icon" href="assets/logo.webp">` 即可消掉，要不要加等你发话。
5. **仓库体积**：`assets/` 31 MB，其中 png 19 MB 是为回滚保留的原始图（本次按你的要求未删）。

---

## 四、是否建议合并 main

**建议合并，但不要现在自动合并。** 通过项覆盖了资源失败、交互时序、视觉一致性、健壮性与回归五个维度，未发现阻塞问题；上面 4 条风险中没有一条来自本分支的改动（第 1 条是环境凭据，第 3、4 条是既有的可优化项）。

合并与上线请在推送远程分支、并确认 `git ls-remote` 能看到 `refs/heads/v2-optimize` 之后，再单独授权我执行。
