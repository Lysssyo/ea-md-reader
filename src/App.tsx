import { useEffect, useRef, useState } from 'react';
import Article from './components/Article';
import Outline from './components/Outline';
import type { RenderResult } from './lib/markdown';

function Icon({ name }: { name: 'menu' | 'open' | 'save' | 'close' | 'refresh' | 'outline' | 'search' | 'minimize' | 'maximize' | 'restore' }) {
  const paths = {
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    open: <><path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v2" /><path d="M3 7v12h16l3-10H7L3 19" /></>,
    save: <><path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5" /></>,
    minimize: <path d="M5 12h14" />,
    maximize: <rect x="5" y="5" width="14" height="14" rx="1" />,
    restore: <><path d="M8 5V3h13v13h-2" /><rect x="3" y="8" width="13" height="13" rx="1" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    refresh: <><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" /></>,
    outline: <><path d="M8 5h13M8 12h13M8 19h13" /><circle cx="3" cy="5" r=".5" /><circle cx="3" cy="12" r=".5" /><circle cx="3" cy="19" r=".5" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function App() {
  const [tabs, setTabs] = useState<MarkdownDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<Record<string, RenderResult['headings']>>({});
  const [maximized, setMaximized] = useState(false);
  const [outline, setOutline] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [finding, setFinding] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [fileMenu, setFileMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const findInput = useRef<HTMLInputElement>(null);
  const commands = useRef<(action: string) => void>(() => {});
  const active = tabs.find((tab) => tab.id === activeId);

  async function save() {
    if (!active) return;
    const destination = await window.emd.save(active.id);
    if (destination) setMessage({ text: `已另存为 ${destination}`, error: false });
  }
  async function close(id = activeId) {
    if (!id) return;
    const index = tabs.findIndex((tab) => tab.id === id);
    await window.emd.close(id);
    setTabs((current) => current.filter((tab) => tab.id !== id));
    setHeadings((current) => { const next = { ...current }; delete next[id]; return next; });
    if (id === activeId) setActiveId(tabs[index + 1]?.id ?? tabs[index - 1]?.id ?? null);
  }
  async function reload() {
    if (!active) return;
    const document = await window.emd.reload(active.id);
    if (document) { setTabs((current) => current.map((tab) => tab.id === document.id ? document : tab)); setMessage({ text: '已重新读取文件', error: false }); }
  }
  function nextTab(delta: number) {
    if (!tabs.length) return;
    const index = tabs.findIndex((tab) => tab.id === activeId);
    setActiveId(tabs[(index + delta + tabs.length) % tabs.length].id);
  }
  commands.current = (action) => {
    const actions: Record<string, () => void> = {
      save: () => { void save(); }, close: () => { void close(); }, reload: () => { void reload(); },
      fileMenu: () => setFileMenu((value) => !value), find: () => setFinding(true),
      next: () => nextTab(1), previous: () => nextTab(-1),
    };
    actions[action]?.();
  };

  useEffect(() => {
    const cleanups = [
      window.emd.onWindowState(setMaximized),
      window.emd.onDocument((document) => { setTabs((current) => [...current, document]); setActiveId(document.id); setAnchor(null); }),
      window.emd.onActivate((id) => { setActiveId(id); setAnchor(null); }),
      window.emd.onAction((action) => commands.current(action)),
      window.emd.onAnchor(setAnchor),
      window.emd.onError((text) => setMessage({ text, error: true })),
    ];
    void window.emd.ready();
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 760px)');
    const changed = () => setOutline(!narrow.matches);
    narrow.addEventListener('change', changed);
    return () => narrow.removeEventListener('change', changed);
  }, []);
  useEffect(() => { document.title = active ? `${active.name} — Ea.Md.Reader` : 'Ea.Md.Reader'; setProgress(0); }, [active]);
  useEffect(() => {
    if (finding) findInput.current?.focus();
    else { setQuery(''); void window.emd.find('', true); }
  }, [finding]);
  useEffect(() => {
    if (!query) { void window.emd.find('', true); return; }
    const timer = setTimeout(() => { void window.emd.find(query, true); }, 120);
    return () => clearTimeout(timer);
  }, [query, activeId]);
  useEffect(() => {
    if (!message || message.error) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!fileMenu) return;
    const dismiss = (event: MouseEvent) => { if (!(event.target as Element).closest('.file-menu')) setFileMenu(false); };
    document.addEventListener('click', dismiss);
    return () => document.removeEventListener('click', dismiss);
  }, [fileMenu]);

  const sections = activeId ? headings[activeId] ?? [] : [];
  return <div className="app" onKeyDown={(event) => {
    if (event.key === 'Escape') { setFileMenu(false); setFinding(false); setMessage(null); }
  }}>
    <header className="toolbar" onDoubleClick={(event) => { if (!(event.target as Element).closest('button, .file-menu')) void window.emd.window('maximize'); }}>
      <span className="wordmark">Ea<span className="wordmark-dot">.</span>Md<span className="wordmark-dot">.</span>Reader</span>
      <div className="file-actions">
        <div className="file-menu">
          <button className="icon-button menu-trigger" title="文件菜单 · Alt+F" aria-label="文件" aria-haspopup="menu" aria-expanded={fileMenu} onClick={() => setFileMenu((value) => !value)}><Icon name="menu" /></button>
          {fileMenu && <div className="menu-popup" role="menu">
            <button role="menuitem" onClick={() => { setFileMenu(false); void window.emd.open(); }}>打开… <kbd>Ctrl O</kbd></button>
            <button role="menuitem" disabled={!active} onClick={() => { setFileMenu(false); void save(); }}>另存为… <kbd>Ctrl Shift S</kbd></button>
            <div className="menu-divider" />
            <button role="menuitem" disabled={!active} onClick={() => { setFileMenu(false); void close(); }}>关闭标签页 <kbd>Ctrl W</kbd></button>
            <button role="menuitem" onClick={() => { void window.emd.window('close'); }}>退出 <kbd>Ctrl Q</kbd></button>
          </div>}
        </div>
        <button className="icon-button" title="打开文件 · Ctrl+O" aria-label="打开文件" onClick={() => { void window.emd.open(); }}><Icon name="open" /></button>
        <button className="icon-button" title="另存为 · Ctrl+Shift+S" aria-label="另存为" disabled={!active} onClick={() => { void save(); }}><Icon name="save" /></button>
      </div>
      <span className="toolbar-path" title={active?.path}>{active?.path ?? 'Markdown 阅读器'}</span>
      <div className="toolbar-actions">
        <button className="icon-button" title="查找 · Ctrl+F" aria-label="查找" disabled={!active} onClick={() => setFinding((value) => !value)}><Icon name="search" /></button>
        <button className={`icon-button ${outline ? 'selected' : ''}`} title="显示目录" aria-label="显示目录" aria-pressed={outline} disabled={!active} onClick={() => setOutline((value) => !value)}><Icon name="outline" /></button>
      </div>
      <div className="window-controls">
        <button aria-label="最小化窗口" title="最小化" onClick={() => { void window.emd.window('minimize'); }}><Icon name="minimize" /></button>
        <button aria-label={maximized ? '还原窗口' : '最大化窗口'} title={maximized ? '还原' : '最大化'} onClick={() => { void window.emd.window('maximize'); }}><Icon name={maximized ? 'restore' : 'maximize'} /></button>
        <button className="window-close" aria-label="关闭窗口" title="关闭" onClick={() => { void window.emd.window('close'); }}><Icon name="close" /></button>
      </div>
    </header>
    {tabs.length > 0 && <nav className="tabbar" role="tablist" aria-label="已打开的文件">
      {tabs.map((tab) => <div className={`tab ${tab.id === activeId ? 'active' : ''}`} key={tab.id}>
        <button className="tab-select" role="tab" aria-selected={tab.id === activeId} aria-controls={`panel-${tab.id}`} id={`tab-${tab.id}`} title={tab.path} onClick={() => { setActiveId(tab.id); setAnchor(null); }}><span className="file-badge">MD</span><span className="tab-name">{tab.name}</span></button>
        <button className="tab-close" aria-label={`关闭 ${tab.name}`} title="关闭标签页" onClick={() => { void close(tab.id); }}><Icon name="close" /></button>
      </div>)}
      <button className="new-tab" title="打开更多文件" aria-label="打开更多文件" onClick={() => { void window.emd.open(); }}>+</button>
    </nav>}
    {finding && <div className="findbar"><Icon name="search" /><input ref={findInput} aria-label="查找内容" placeholder="在文档中查找…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void window.emd.find(query, !event.shiftKey); } }} /><button title="上一个" onClick={() => { void window.emd.find(query, false); }}>↑</button><button title="下一个" onClick={() => { void window.emd.find(query, true); }}>↓</button><button className="icon-button" aria-label="关闭查找" onClick={() => setFinding(false)}><Icon name="close" /></button></div>}
    <main className="workspace">
      {!tabs.length && <section className="welcome">
        <div className="welcome-mark"><span>e</span><span className="paper-line" /><span className="paper-line short" /></div>
        <p className="eyebrow">A QUIET PLACE TO READ</p>
        <h1>打开一页，静心阅读。</h1>
        <p className="welcome-description">为 Markdown 留一片安静的空间。<br />公式、代码、图表，保留熟悉的阅读模样。</p>
        <button className="open-button" onClick={() => { void window.emd.open(); }}><Icon name="open" />打开 Markdown<span>Ctrl O</span></button>
        <p className="welcome-hint">也可以在终端运行 <code>emd 文件.md</code></p>
        <div className="welcome-footer"><span>ea-kb 的纸色与排版</span><span>只读阅读 · 多标签页</span></div>
      </section>}
      {tabs.map((tab) => <section className="document-panel" hidden={tab.id !== activeId} role="tabpanel" aria-labelledby={`tab-${tab.id}`} id={`panel-${tab.id}`} key={tab.id} onScroll={(event) => {
        if (tab.id !== activeId) return;
        const target = event.currentTarget;
        const distance = target.scrollHeight - target.clientHeight;
        setProgress(distance > 0 ? Math.round(target.scrollTop / distance * 100) : 100);
      }}>
        <article className="article">
          <div className="document-meta"><span>MARKDOWN</span><span className="meta-dot">·</span><span>{Math.max(1, Math.ceil(tab.text.length / 600))} 分钟阅读</span><span className="readonly-badge">只读</span></div>
          <Article document={tab} active={tab.id === activeId} anchor={tab.id === activeId ? anchor : null} onHeadings={(id, values) => setHeadings((current) => ({ ...current, [id]: values }))} onError={(text) => setMessage({ text, error: true })} />
          <div className="document-end"><span />文档结束<span /></div>
        </article>
      </section>)}
      {active && <Outline key={active.id} headings={sections} expanded={outline} onToggle={() => setOutline((value) => !value)} onSelect={(id) => {
        document.getElementById(`panel-${activeId}`)?.querySelectorAll<HTMLElement>('[id]').forEach((element) => { if (element.id === id) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      }} />}
    </main>
    {message && <div className={`notification ${message.error ? 'error' : ''}`} role={message.error ? 'alert' : 'status'}><span>{message.text}</span><button className="icon-button" aria-label="关闭提示" onClick={() => setMessage(null)}><Icon name="close" /></button></div>}
    <footer className="statusbar"><span><span className="status-dot" />{active ? '只读' : '就绪'}</span><span>{tabs.length ? `${tabs.length} 个标签页` : 'emd 0.1.0'}</span><span className="status-spacer" />{active && <><span>UTF-8</span><button className="status-reload" title="重新读取文件 · Ctrl+R" aria-label="重新读取文件" onClick={() => { void reload(); }}><Icon name="refresh" /></button><span className="progress">{progress}%</span></>}</footer>
  </div>;
}
