/**
 * 笔记站共享逻辑（LeetCode 算法笔记 / 手搓代码笔记共用）
 * 由页面 <meta name="notes-repo"> 指定数据仓库。
 *
 * 性能策略：
 * 1. localStorage 缓存（SWR）：有缓存先渲染，后台静默更新
 * 2. 清单更新后自动清理过期内容缓存
 * 3. 进入页面预取首篇/上次浏览的笔记，侧边栏悬停预取
 */
(function () {
    const meta = document.querySelector('meta[name="notes-repo"]');
    const REPO = meta && meta.content;
    if (!REPO) return;

    const OWNER = 'PanfengHong';
    const CDN_BASES = [
        `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@main`,
        `https://raw.githubusercontent.com/${OWNER}/${REPO}/main`
    ];
    const KEY_MANIFEST = REPO + ':manifest';
    const KEY_MD = REPO + ':md:';

    const DIFF = {
        easy: { label: '简单', cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', dot: 'bg-emerald-500' },
        medium: { label: '中等', cls: 'text-amber-400 border-amber-500/30 bg-amber-500/10', dot: 'bg-amber-500' },
        hard: { label: '困难', cls: 'text-rose-400 border-rose-500/30 bg-rose-500/10', dot: 'bg-rose-500' }
    };

    let currentGen = '';       // 已渲染清单的 generatedAt
    let currentFile = '';      // 正在浏览的文件
    let currentManifest = null; // 当前清单（用于搜索/上一篇下一篇）

    const el = (id) => document.getElementById(id);

    /* ---------------- localStorage 缓存 ---------------- */
    function readCache(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function writeCache(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 存储满则忽略 */ }
    }

    /** 清理与当前清单代次不一致的内容缓存 */
    function purgeStale() {
        try {
            Object.keys(localStorage)
                .filter((k) => k.startsWith(KEY_MD))
                .forEach((k) => {
                    const v = readCache(k);
                    if (!v || v.gen !== currentGen) localStorage.removeItem(k);
                });
        } catch (e) { /* ignore */ }
    }

    /* ---------------- 数据拉取 ---------------- */
    async function fetchWithFallback(pathname) {
        let lastErr;
        for (const base of CDN_BASES) {
            try {
                const res = await fetch(`${base}/${pathname}`);
                if (res.ok) return res;
                lastErr = new Error(`HTTP ${res.status}`);
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('所有源均不可用');
    }

    function parseFrontMatter(text) {
        const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        const meta = {};
        if (m) {
            for (const line of m[1].split(/\r?\n/)) {
                const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
                if (!kv) continue;
                let v = kv[2].trim();
                if (v.startsWith('[') && v.endsWith(']')) {
                    meta[kv[1]] = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
                } else {
                    meta[kv[1]] = v.replace(/^["']|["']$/g, '');
                }
            }
        }
        return { meta, body: m ? text.slice(m[0].length) : text };
    }

    /** 拉取内容并写入缓存 */
    async function fetchMdIntoCache(file) {
        const res = await fetchWithFallback(file);
        const text = await res.text();
        writeCache(KEY_MD + file, { gen: currentGen, text });
        return text;
    }

    /* ---------------- 渲染 ---------------- */
    function showSidebarSkeleton() {
        el('sidebar').innerHTML = `
            <div class="animate-pulse space-y-5">
                <div>
                    <div class="h-3 w-16 rounded bg-gh-surface mb-3 ml-2"></div>
                    <div class="space-y-2">
                        <div class="h-9 rounded-lg bg-gh-surface"></div>
                        <div class="h-9 rounded-lg bg-gh-surface"></div>
                        <div class="h-9 rounded-lg bg-gh-surface"></div>
                    </div>
                </div>
                <div>
                    <div class="h-3 w-20 rounded bg-gh-surface mb-3 ml-2"></div>
                    <div class="space-y-2">
                        <div class="h-9 rounded-lg bg-gh-surface"></div>
                        <div class="h-9 rounded-lg bg-gh-surface"></div>
                    </div>
                </div>
            </div>`;
    }

    function showContentSkeleton() {
        el('loading').innerHTML = `
            <div class="animate-pulse space-y-4 text-left max-w-2xl mx-auto py-6">
                <div class="h-4 w-40 rounded bg-gh-surface"></div>
                <div class="h-64 rounded-xl bg-gh-surface"></div>
                <div class="h-4 rounded bg-gh-surface"></div>
                <div class="h-4 w-3/4 rounded bg-gh-surface"></div>
            </div>`;
    }

    function renderSidebar(manifest) {
        currentManifest = manifest;
        const stats = manifest.stats;
        el('stats').textContent =
            `共 ${manifest.total} 篇 · 简 ${stats.easy} / 中 ${stats.medium} / 难 ${stats.hard}`;

        el('sidebar').innerHTML = manifest.categories.map((cat) => `
            <div>
                <div class="flex items-center gap-1.5 mb-2 px-2">
                    <span class="text-xs font-semibold uppercase tracking-wider text-gh-muted">${cat.name}</span>
                    <span class="ml-auto text-[10px] text-gh-muted bg-gh-surface px-1.5 py-0.5 rounded-full">${cat.problems.length}</span>
                </div>
                <nav class="space-y-0.5">
                    ${cat.problems.map((p) => {
            const d = DIFF[(p.difficulty || '').toLowerCase()];
            return `
                        <a href="#${p.file}" data-file="${p.file}"
                            class="prob-item flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gh-muted hover:text-gh-text hover:bg-gh-surface transition-colors">
                            <span class="w-1.5 h-1.5 rounded-full shrink-0 ${d ? d.dot : 'bg-gray-600'}"></span>
                            <span class="truncate">${p.id}. ${p.title}</span>
                        </a>`;
        }).join('')}
                </nav>
            </div>
        `).join('');
    }

    function renderContent(file, text) {
        const { meta, body } = parseFrontMatter(text);

        const d = DIFF[(meta.difficulty || '').toLowerCase()];
        const tags = Array.isArray(meta.tags) ? meta.tags : [];
        el('meta').innerHTML = `
            ${d ? `<span class="text-xs px-2 py-0.5 rounded-full border ${d.cls}">${d.label}</span>` : ''}
            ${tags.map((t) => `<span class="text-xs px-2 py-0.5 rounded-full bg-gh-surface border border-gh-border text-gh-muted">${t}</span>`).join('')}
            ${meta.date ? `<span class="text-xs text-gh-muted">${meta.date}</span>` : ''}
            ${meta.juejin ? `<a href="${meta.juejin}" target="_blank" class="text-xs text-indigo-400 hover:text-indigo-300">掘金文章 →</a>` : ''}
        `;

        // DOMPurify 消毒，防笔记内嵌恶意 HTML
        el('md').innerHTML = DOMPurify.sanitize(marked.parse(body));
        document.querySelectorAll('#md pre code').forEach((node) => hljs.highlightElement(node));
        enhanceMarkdown();
        el('content').classList.remove('hidden');
        el('loading').classList.add('hidden');
        el('error').classList.add('hidden');
    }

    /* ---------------- Markdown 增强：标题锚点 / 代码复制 / 目录 ---------------- */
    function enhanceMarkdown() {
        const md = el('md');
        const tocItems = [];

        // 1. 标题 id + 悬浮锚点（锚点不改 hash，避免干扰笔记路由）
        md.querySelectorAll('h1, h2, h3, h4').forEach((h, i) => {
            const slug = h.textContent.trim().toLowerCase()
                .replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
            h.id = `h-${i}-${slug || i}`;
            tocItems.push({ id: h.id, level: +h.tagName[1], text: h.textContent.trim() });

            const a = document.createElement('a');
            a.className = 'md-anchor';
            a.dataset.target = h.id;
            a.textContent = '#';
            a.setAttribute('aria-label', '标题锚点');
            h.appendChild(a);
        });

        // 2. 代码块复制按钮
        md.querySelectorAll('pre').forEach((pre) => {
            pre.style.position = 'relative';
            const btn = document.createElement('button');
            btn.className = 'md-copy-btn';
            btn.type = 'button';
            btn.textContent = '复制';
            btn.addEventListener('click', async () => {
                const code = pre.querySelector('code');
                try {
                    await navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
                    btn.textContent = '已复制';
                    btn.classList.add('copied');
                    setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1500);
                } catch (e) {
                    btn.textContent = '复制失败';
                    setTimeout(() => { btn.textContent = '复制'; }, 1500);
                }
            });
            pre.appendChild(btn);
        });

        // 3. 右侧目录（标题少于 3 个不渲染）
        const toc = el('toc');
        if (toc) {
            if (tocItems.length >= 3) {
                toc.innerHTML = '<div class="text-xs font-semibold uppercase tracking-wider text-gh-muted mb-2 px-3">本页目录</div>' +
                    tocItems.map((t) =>
                        `<a href="javascript:void(0)" data-target="${t.id}" class="toc-link lv${t.level}">${t.text}</a>`
                    ).join('');
            } else {
                toc.innerHTML = '';
            }
        }
    }

    /** 锚点/目录点击：平滑滚动（不改 hash） */
    function bindTocScroll() {
        [el('md'), el('toc')].forEach((container) => {
            if (!container) return;
            container.addEventListener('click', (e) => {
                const t = e.target.closest('[data-target]');
                if (!t) return;
                const node = document.getElementById(t.dataset.target);
                if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    /* ---------------- 上一篇 / 下一篇导航 ---------------- */
    function flatProblems() {
        return currentManifest ? currentManifest.categories.flatMap((c) => c.problems) : [];
    }

    function renderPrevNext(file) {
        const pn = el('prev-next');
        if (!pn) return;
        const flat = flatProblems();
        const i = flat.findIndex((p) => p.file === file);
        if (i === -1 || flat.length < 2) {
            pn.classList.add('hidden');
            return;
        }
        const prev = flat[i - 1];
        const next = flat[i + 1];
        const card = (label, p, align) => p ? `
            <a href="#${p.file}" data-goto="${p.file}"
                class="flex-1 min-w-0 group/pn rounded-xl border border-gh-border hover:border-indigo-500/50 hover:bg-gh-surface/60 transition-all p-3 ${align}">
                <div class="text-xs text-gh-muted mb-1">${label}</div>
                <div class="text-sm text-gh-text truncate group-hover/pn:text-gh-text">${p.title}</div>
            </a>` : '<div class="flex-1 hidden sm:block"></div>';
        pn.innerHTML = card('← 上一篇', prev, 'text-left') + card('下一篇 →', next, 'text-right');
        pn.classList.remove('hidden');
    }

    /* ---------------- 目录搜索过滤 ---------------- */
    function bindSearch() {
        const input = el('search');
        if (!input) return;
        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            el('sidebar').querySelectorAll('.prob-item').forEach((a) => {
                a.style.display = (!q || a.textContent.toLowerCase().includes(q)) ? '' : 'none';
            });
            el('sidebar').querySelectorAll(':scope > div').forEach((group) => {
                const visible = Array.from(group.querySelectorAll('.prob-item'))
                    .some((a) => a.style.display !== 'none');
                group.style.display = visible ? '' : 'none';
            });
        });
    }

    /* ---------------- 深浅主题切换 ---------------- */
    function applyTheme(theme, persist = true) {
        const root = document.documentElement;
        root.classList.add('theme-anim'); // 短暂开启全局颜色过渡
        setTimeout(() => root.classList.remove('theme-anim'), 400);
        root.dataset.theme = theme;
        if (persist) {
            try { localStorage.setItem('notes-theme', theme); } catch (e) { /* ignore */ }
        }
        // 切换 markdown 正文与代码高亮的浅/深样式表
        const mdDark = document.getElementById('md-dark');
        const mdLight = document.getElementById('md-light');
        const hlDark = document.getElementById('hl-dark');
        const hlLight = document.getElementById('hl-light');
        if (mdDark) mdDark.disabled = theme === 'light';
        if (mdLight) mdLight.disabled = theme !== 'light';
        if (hlDark) hlDark.disabled = theme === 'light';
        if (hlLight) hlLight.disabled = theme !== 'light';
        // 切换按钮图标：深色时显示太阳（点击去浅色）
        const sun = document.getElementById('icon-sun');
        const moon = document.getElementById('icon-moon');
        if (sun && moon) {
            sun.classList.toggle('hidden', theme === 'light');
            moon.classList.toggle('hidden', theme !== 'light');
        }
    }

    function bindThemeToggle() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
        });
    }

    /* ---------------- 阅读进度条 + 返回顶部（window 与正文容器双通道） ---------------- */
    function bindScrollUI() {
        const bar = el('progress');
        const backTop = el('back-top');
        const reader = el('reader'); // lg+ 桌面端正文内部滚动容器
        const update = (top, max) => {
            if (bar) bar.style.width = (max > 0 ? (top / max) * 100 : 0) + '%';
            if (backTop) backTop.classList.toggle('hidden', top <= 400);
        };
        // 移动端：整页滚动
        window.addEventListener('scroll', () => {
            const h = document.documentElement;
            update(h.scrollTop, h.scrollHeight - h.clientHeight);
        }, { passive: true });
        // 桌面端：正文内部滚动
        if (reader) {
            reader.addEventListener('scroll', () => {
                update(reader.scrollTop, reader.scrollHeight - reader.clientHeight);
            }, { passive: true });
        }
        if (backTop) backTop.addEventListener('click', () => {
            if (reader && reader.scrollHeight > reader.clientHeight) {
                reader.scrollTo({ top: 0, behavior: 'smooth' });
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ---------------- 加载流程 ---------------- */
    async function openFile(file) {
        currentFile = file;
        el('toc') && (el('toc').innerHTML = '');

        document.querySelectorAll('.prob-item').forEach((a) => {
            a.classList.toggle('bg-gh-surface', a.dataset.file === file);
            a.classList.toggle('text-gh-text', a.dataset.file === file);
            a.classList.toggle('active', a.dataset.file === file);
        });
        renderPrevNext(file);

        el('content').classList.add('hidden');
        el('error').classList.add('hidden');

        const cache = readCache(KEY_MD + file);
        const hasValidCache = !!cache && cache.gen === currentGen;

        if (hasValidCache) {
            renderContent(file, cache.text); // 秒开
        } else {
            el('loading').classList.remove('hidden');
            showContentSkeleton();
        }

        try {
            const text = await fetchMdIntoCache(file);
            if (currentFile !== file) return;                 // 用户已切走
            if (hasValidCache && text === cache.text) return; // 内容无变化
            renderContent(file, text);                        // 首次渲染或后台更新
        } catch (e) {
            if (!hasValidCache && currentFile === file) {
                el('loading').classList.add('hidden');
                el('error-msg').textContent = `内容加载失败：${e.message}`;
                el('error').classList.remove('hidden');
            }
            // 命中缓存时拉取失败：静默降级，继续展示缓存内容
        }
    }

    function route() {
        const file = decodeURIComponent(location.hash.slice(1));
        if (file && file.endsWith('.md')) {
            openFile(file);
            window.scrollTo({ top: 0 });
        }
    }

    /** 悬停/聚焦预取：提前拉取内容进缓存 */
    function prefetchHandler(e) {
        const a = e.target.closest('a[data-file]');
        if (!a) return;
        const file = a.dataset.file;
        const c = readCache(KEY_MD + file);
        if (c && c.gen === currentGen) return;
        fetchMdIntoCache(file).catch(() => { /* 预取失败静默 */ });
    }

    /** 空状态页：未选择笔记时的占位展示 */
    function showEmptyState() {
        el('loading').innerHTML = `
            <div class="py-28 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    class="w-14 h-14 mx-auto text-gh-muted/50">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M9 13h6" />
                    <path d="M9 17h3" />
                </svg>
                <div class="text-sm text-gh-muted mt-4">从左侧目录选择一篇笔记</div>
            </div>`;
    }

    async function init() {
        // 标记本次会话来自笔记页，供主页恢复滚动位置
        try { sessionStorage.setItem('came-from-notes', '1'); } catch (e) { /* ignore */ }
        // 1. 命中缓存：立即渲染目录，无缓存则显示骨架屏
        const cached = readCache(KEY_MANIFEST);
        if (cached) {
            currentGen = cached.generatedAt;
            renderSidebar(cached);
        } else {
            showSidebarSkeleton();
            showContentSkeleton();
        }

        // 2. 拉取最新清单（SWR：后台刷新）
        try {
            const res = await fetchWithFallback('index.json');
            const manifest = await res.json();
            writeCache(KEY_MANIFEST, manifest);
            if (!cached || cached.generatedAt !== manifest.generatedAt) {
                currentGen = manifest.generatedAt;
                renderSidebar(manifest);
            }
            purgeStale();
        } catch (e) {
            if (!cached) {
                el('sidebar').innerHTML =
                    '<div class="text-sm text-rose-400 px-2">目录加载失败，请检查网络后刷新重试</div>';
                el('loading').textContent = '';
                return;
            }
            // 有缓存：静默降级，继续使用旧目录
        }

        // 3. 事件绑定
        el('sidebar').addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            history.replaceState(null, '', a.getAttribute('href'));
            e.preventDefault();
            route();
        });
        el('sidebar').addEventListener('mouseover', prefetchHandler);
        el('sidebar').addEventListener('focusin', prefetchHandler);
        window.addEventListener('hashchange', route);
        bindTocScroll();
        bindSearch();
        bindScrollUI();
        bindThemeToggle();

        // 上一篇/下一篇导航
        const pn = el('prev-next');
        if (pn) pn.addEventListener('click', (e) => {
            const a = e.target.closest('[data-goto]');
            if (!a) return;
            e.preventDefault();
            history.replaceState(null, '', a.getAttribute('href'));
            route();
        });

        // 4. 打开默认篇目；无 hash 时展示空状态页并预取第一篇
        if (location.hash) {
            route();
        } else {
            showEmptyState();
            const firstCat = manifest && manifest.categories[0];
            if (firstCat && firstCat.problems[0]) {
                fetchMdIntoCache(firstCat.problems[0].file).catch(() => { });
            }
        }
    }

    init();
})();
