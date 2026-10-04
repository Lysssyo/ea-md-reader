import { useState } from 'react';
import type { RenderResult } from '../lib/markdown';

type Heading = RenderResult['headings'][number];
interface Branch { heading: Heading; children: Branch[]; }

function headingTree(headings: Heading[]): Branch[] {
  const roots: Branch[] = [];
  const stack: Branch[] = [];
  for (const heading of headings) {
    const branch: Branch = { heading, children: [] };
    while (stack.length && stack[stack.length - 1].heading.depth >= heading.depth) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(branch);
    else roots.push(branch);
    stack.push(branch);
  }
  return roots;
}

function Chapter({ branch, onSelect }: { branch: Branch; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const { heading, children } = branch;
  return <li>
    <div className="toc-row">
      {children.length ? <button className="toc-toggle" aria-label={`${expanded ? '折叠' : '展开'} ${heading.text}`} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><svg viewBox="0 0 12 12" className={expanded ? 'expanded' : ''} aria-hidden="true"><path d="m4 2 4 4-4 4" /></svg></button> : <span className="toc-spacer" />}
      <button className="toc-link" title={heading.text} onClick={() => onSelect(heading.id)}>{heading.text}</button>
    </div>
    {children.length > 0 && expanded && <ul>{children.map((child, index) => <Chapter key={`${child.heading.id}-${index}`} branch={child} onSelect={onSelect} />)}</ul>}
  </li>;
}

export default function Outline({ headings, onSelect }: {
  headings: Heading[]; onSelect: (id: string) => void;
}) {
  const roots = headingTree(headings);
  return <>
    <div className="sidebar-header"><p className="sidebar-title">本文目录</p></div>
    <nav className="sidebar-scroll" aria-label="本文目录">
      {roots.length ? <ul>{roots.map((branch, index) => <Chapter key={`${branch.heading.id}-${index}`} branch={branch} onSelect={onSelect} />)}</ul> : <p className="toc-empty">此文档暂无标题</p>}
    </nav>
  </>;
}
