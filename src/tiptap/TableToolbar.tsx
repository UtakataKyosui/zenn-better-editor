import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';

type TableToolbarProps = {
  editor: Editor;
};

export const TableToolbar = ({ editor }: TableToolbarProps) => {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: intentional preventDefault to keep editor focus
    <div
      className="tiptap-table-toolbar"
      aria-label="Table actions"
      role="toolbar"
      onMouseDown={(e) => e.preventDefault()}
    >
      <span className="tiptap-table-toolbar__group-label">行</span>
      <Button
        variant="outline"
        size="sm"
        title="上に行を追加"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        ↑ 追加
      </Button>
      <Button
        variant="outline"
        size="sm"
        title="下に行を追加"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        ↓ 追加
      </Button>
      <Button
        variant="destructive"
        size="sm"
        title="行を削除"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        削除
      </Button>
      <span className="tiptap-table-toolbar__divider" aria-hidden="true" />
      <span className="tiptap-table-toolbar__group-label">列</span>
      <Button
        variant="outline"
        size="sm"
        title="左に列を追加"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        ← 追加
      </Button>
      <Button
        variant="outline"
        size="sm"
        title="右に列を追加"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        → 追加
      </Button>
      <Button
        variant="destructive"
        size="sm"
        title="列を削除"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        削除
      </Button>
      <span className="tiptap-table-toolbar__divider" aria-hidden="true" />
      <Button
        variant="destructive"
        size="sm"
        title="テーブルを削除"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        テーブル削除
      </Button>
    </div>
  );
};
