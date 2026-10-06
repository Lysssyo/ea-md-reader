type ReaderDocument = { id: string; path: string; name: string; text: string; } & (
  { kind: 'markdown' } | { kind: 'html'; pageUrl: string }
);
interface WorkspaceNode { name: string; path: string; children?: WorkspaceNode[]; }
interface ReaderWorkspace { root: string; name: string; nodes: WorkspaceNode[]; }
interface WorkspaceAction { action: 'open' | 'new-tab' | 'refresh'; path?: string; }
interface Window {
  emd: {
    window(action: 'minimize' | 'maximize' | 'close'): Promise<void>;
    onWindowState(listener: (maximized: boolean) => void): () => void;
    ready(): Promise<void>;
    open(): Promise<void>;
    workspace(id: string, root?: string): Promise<ReaderWorkspace | null>;
    workspaceOpen(root: string, path: string, newTab: boolean, activeId: string): Promise<void>;
    workspaceMenu(root: string, path: string, activeId: string): Promise<void>;
    onWorkspaceAction(listener: (action: WorkspaceAction) => void): () => void;
    save(id: string): Promise<string | null>;
    close(id: string): Promise<void>;
    reload(id: string): Promise<ReaderDocument | null>;
    link(id: string, href: string): Promise<void>;
    find(text: string, forward: boolean): Promise<void>;
    onDocument(listener: (document: ReaderDocument) => void): () => void;
    onActivate(listener: (id: string) => void): () => void;
    onAction(listener: (action: string) => void): () => void;
    onAnchor(listener: (anchor: string) => void): () => void;
    onError(listener: (message: string) => void): () => void;
  };
}

/// <reference types="vite/client" />
