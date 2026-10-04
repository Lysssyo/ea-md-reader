interface MarkdownDocument { id: string; path: string; name: string; text: string; }
interface Window {
  emd: {
    window(action: 'minimize' | 'maximize' | 'close'): Promise<void>;
    onWindowState(listener: (maximized: boolean) => void): () => void;
    ready(): Promise<void>;
    open(): Promise<void>;
    save(id: string): Promise<string | null>;
    close(id: string): Promise<void>;
    reload(id: string): Promise<MarkdownDocument | null>;
    link(id: string, href: string): Promise<void>;
    find(text: string, forward: boolean): Promise<void>;
    onDocument(listener: (document: MarkdownDocument) => void): () => void;
    onActivate(listener: (id: string) => void): () => void;
    onAction(listener: (action: string) => void): () => void;
    onAnchor(listener: (anchor: string) => void): () => void;
    onError(listener: (message: string) => void): () => void;
  };
}

/// <reference types="vite/client" />
