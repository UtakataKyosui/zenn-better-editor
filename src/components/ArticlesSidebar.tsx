import { useState } from 'react';
import { FileText, FolderOpen, RefreshCw, PanelLeftClose, PanelLeft, FilePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ArticlesSidebarProps = {
  isOpen: boolean;
  files: string[];
  activeFile: string | null;
  directoryName: string | null;
  onToggle: () => void;
  onOpenDirectory: () => void;
  onRefresh: () => void;
  onSelectFile: (fileName: string) => void;
  onCreateNewArticle: () => void;
  onDeleteArticle: (fileName: string) => void;
};

export const ArticlesSidebar = ({
  isOpen,
  files,
  activeFile,
  directoryName,
  onToggle,
  onOpenDirectory,
  onRefresh,
  onSelectFile,
  onCreateNewArticle,
  onDeleteArticle,
}: ArticlesSidebarProps) => {
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);

  const confirmDelete = () => {
    if (articleToDelete) {
      onDeleteArticle(articleToDelete);
      setArticleToDelete(null);
    }
  };

  return (
    <div className={`articles-sidebar-wrapper ${isOpen ? 'articles-sidebar-wrapper--open' : ''}`}>
      {/* Sidebar panel */}
      <aside
        className={`articles-sidebar ${isOpen ? 'articles-sidebar--open' : ''}`}
        aria-label="Articles"
      >
        <div className="articles-sidebar__header">
          <span className="articles-sidebar__title">
            <FolderOpen size={14} />
            {directoryName ?? 'Articles'}
          </span>
          <div className="articles-sidebar__actions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="articles-sidebar__btn"
                  onClick={onOpenDirectory}
                  aria-label="フォルダを開く"
                >
                  <FolderOpen size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">フォルダを開く</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="articles-sidebar__btn"
                  onClick={onCreateNewArticle}
                  disabled={!directoryName}
                  aria-label="新規記事を作成"
                >
                  <FilePlus size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">新規作成</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="articles-sidebar__btn"
                  onClick={onRefresh}
                  disabled={!directoryName}
                  aria-label="ファイル一覧を更新"
                >
                  <RefreshCw size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">更新</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="sidebar-toggle"
                  onClick={onToggle}
                  aria-label="サイドバーを閉じる"
                >
                  <PanelLeftClose size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">閉じる</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {directoryName ? (
          <nav className="articles-sidebar__list" aria-label="File list">
            {files.length === 0 ? (
              <p className="articles-sidebar__empty">
                .md ファイルが見つかりません
              </p>
            ) : (
              <ul className="articles-sidebar__files">
                {files.map((file) => (
                  <li key={file}>
                    <button
                      type="button"
                      className={`articles-sidebar__file ${
                        activeFile === file
                          ? 'articles-sidebar__file--active'
                          : ''
                      }`}
                      onClick={() => onSelectFile(file)}
                      title={file}
                    >
                      <FileText size={14} className="articles-sidebar__file-icon" />
                      <span className="articles-sidebar__file-name">
                        {file.replace(/\.md$/i, '')}
                      </span>
                      <button
                        type="button"
                        className="articles-sidebar__delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArticleToDelete(file);
                        }}
                        aria-label={`${file} を削除`}
                        title="削除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        ) : (
          <div className="articles-sidebar__placeholder">
            <Button
              variant="outline"
              size="sm"
              className="articles-sidebar__open-btn"
              onClick={onOpenDirectory}
            >
              <FolderOpen size={16} />
              Open articles/
            </Button>
            <p className="articles-sidebar__hint">
              Zennリポジトリの articles ディレクトリを選択してください
            </p>
          </div>
        )}
      </aside>

      {/* Collapsed toggle (only visible when sidebar is closed) */}
      {!isOpen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="sidebar-toggle sidebar-toggle--collapsed"
              onClick={onToggle}
              aria-label="サイドバーを開く"
            >
              <PanelLeft size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">サイドバーを開く</TooltipContent>
        </Tooltip>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>記事の削除</DialogTitle>
            <DialogDescription>
              「{articleToDelete}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setArticleToDelete(null)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
