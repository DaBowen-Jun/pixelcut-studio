# Fiverr 联盟激活说明（审核通过后执行）

## 当你收到审核通过邮件（"Your Fiverr Affiliate Application has been approved"），按以下步骤激活：

### 步骤 1：邮件里找你的 Affiliate ID
邮件里会有一行类似这样的链接：
```
https://www.fiverr.com/search/gigs?query=pixel+art&a_id=8rXkPq2N
```
或者在 Dashboard 里能看到：
- Dashboard → Creatives → Your Affiliate Link
- 形式：`a_id=XXXXXXXX`
- **只需要那串字符（不含 a_id= 这部分）**

### 步骤 2：在项目根目录打开 CMD
按 `Shift + 右键` → "在此处打开 PowerShell 窗口" 或在地址栏输入 `cmd` 回车。

### 步骤 3：执行替换命令
把 `8rXkPq2N` 替换成你自己的 ID：

```bash
cd /d C:\Users\Administrator\WorkBuddy\2026-08-24-15-28-22
sed -i "s/YOUR_FIVERR_ID/8rXkPq2N/g" index.html style.css app.js dist/index.html dist/style.css dist/app.js
```

> 💡 上面那行用 `8rXkPq2N` 举例，**把它替换为你的真实 ID 再执行。**
> 如果你没有 sed，把 `sed -i "s/.../.../g"` 部分改成：
> PowerShell: `(Get-Content ... ) -replace 'YOUR_FIVERR_ID','8rXkPq2N' | Set-Content ...`

### 步骤 4：推 GitHub → Netlify 自动部署

```bash
git add -A
git commit -m "feat: activate Fiverr affiliate with real ID"
git push origin main
```

> Netlify 监听仓库，约 30-60 秒后 `pixcutstudio.netlify.app` 上就能看到联盟卡片。

### 步骤 5：验证
访问 `https://pixcutstudio.netlify.app/` → 上传一张图 → 生成 → 在结果下方看到粉红渐变卡片「推荐服务」。
点卡片上的链接 → URL 末尾应该是 `a_id=你的ID`。

### 完成 🎉
打开 https://affiliates.fiverr.com/dashboard 即可看到点击 / 转化 / 佣金数据。

---

## 常见问题

**Q: 我不想用 PowerShell / sed，只想手动改行吗？**
A: 可以。打开 index.html / app.js，搜索字符串 `YOUR_FIVERR_ID` 一共 2 处（JS 顶部 + CSS 媒体查询注释），全部替换为你的 ID 即可。dist/ 下 3 个文件也改一份。

**Q: 多长时间有第一笔？**
A: 按当前 100 UV/天算，预计 2-4 周内出现第一次 $15 佣金。
