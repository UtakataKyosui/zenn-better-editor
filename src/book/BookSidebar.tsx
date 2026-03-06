import type { BookChapter } from './book-config';

type BookSidebarProps = {
  slug: string;
  bookTitle: string;
  chapters: BookChapter[];
  activeView: string | null;
  onSelectView: (view: string | null) => void;
  onAddChapter: () => void;
};

export const BookSidebar = ({
  slug,
  bookTitle,
  chapters,
  activeView,
  onSelectView,
  onAddChapter,
}: BookSidebarProps) => {
  return (
    <aside className="book-sidebar" aria-label="本の目次">
      <div className="book-sidebar__header">
        <button
          type="button"
          className={`book-sidebar__config-btn${activeView === null ? ' is-active' : ''}`}
          onClick={() => onSelectView(null)}
          title="本の設定を編集"
        >
          <span className="book-sidebar__book-icon">📚</span>
          <span className="book-sidebar__book-title">{bookTitle || slug || '無題の本'}</span>
        </button>
      </div>

      <div className="book-sidebar__section-label">チャプター</div>

      <ol className="book-sidebar__chapter-list">
        {chapters.map((ch) => (
          <li key={ch.id}>
            <button
              type="button"
              className={`book-sidebar__chapter-btn${activeView === ch.id ? ' is-active' : ''}`}
              onClick={() => onSelectView(ch.id)}
              title={ch.name}
            >
              <span className="book-sidebar__chapter-num">{ch.id}</span>
              <span className="book-sidebar__chapter-title">{ch.title || ch.name}</span>
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="book-sidebar__add-btn"
        onClick={onAddChapter}
      >
        + チャプターを追加
      </button>
    </aside>
  );
};
