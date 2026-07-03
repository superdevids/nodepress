/**
 * BlockEditor component.
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useBlockEditor, type UseBlockEditorOptions } from "./use-block-editor.js";
import { EditorContent, BubbleMenu } from "@tiptap/react";
import { BlockInserter } from "./inserter/block-inserter.js";
import { getBlockStyles } from "./styles/block-styles.js";
import { getBlockTransforms } from "./transformations/block-transformations.js";
import { buildBlockTree, flattenTree } from "./navigation/navigation-mode.js";
import type { BlockNode } from "./types.js";

export interface BlockEditorProps extends UseBlockEditorOptions {
  className?: string;
  onInsertBlock?: (blockName: string, attrs?: Record<string, unknown>) => void;
}

export function BlockEditor({ className, onInsertBlock, ...options }: BlockEditorProps) {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const { editor, state } = useBlockEditor({
    ...options,
    onBlockSelect: (blockType, attrs) => {
      setSelectedBlock(blockType);
      options.onBlockSelect?.(blockType, attrs);
    },
  });
  const [inserterOpen, setInserterOpen] = useState(false);
  const [inserterAnchor, setInserterAnchor] = useState<DOMRect | undefined>();
  const [showListview, setShowListview] = useState(false);
  const [recentBlocks, setRecentBlocks] = useState<string[]>([]);
  const inserterRef = useRef<HTMLButtonElement>(null) as React.RefObject<HTMLButtonElement>;

  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !inserterOpen) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (range.collapsed) {
            const textBefore = range.startContainer.textContent?.slice(0, range.startOffset) ?? "";
            if (textBefore === "" || textBefore.endsWith("\n")) {
              e.preventDefault();
              handleOpenInserter();
            }
          }
        }
      }
      if (e.key === "Escape" && inserterOpen) {
        setInserterOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editor, inserterOpen]);

  const handleOpenInserter = useCallback(() => {
    if (inserterRef.current) {
      setInserterAnchor(inserterRef.current.getBoundingClientRect());
    }
    setInserterOpen((prev) => !prev);
  }, []);

  const handleInsertBlock = useCallback(
    (blockName: string, attrs?: Record<string, unknown>) => {
      if (!editor) return;
      setRecentBlocks((prev: string[]) => {
        const updated = [blockName, ...prev.filter((b: string) => b !== blockName)].slice(0, 10);
        return updated;
      });
      setInserterOpen(false);
      if (onInsertBlock) {
        onInsertBlock(blockName, attrs);
      } else {
        editor.chain().focus().insertContent({ type: blockName, attrs }).run();
      }
    },
    [editor, onInsertBlock],
  );

  if (!editor) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const blockStyles = selectedBlock ? getBlockStyles(selectedBlock) : [];
  const blockTransforms = selectedBlock ? getBlockTransforms(selectedBlock) : [];

  const currentDoc = editor.getJSON() as { type: string; content?: BlockNode[] };
  const blockTree = currentDoc?.content ? buildBlockTree(currentDoc.content) : [];
  const flatTree = flattenTree(blockTree);

  return (
    <div className={className}>
      <Toolbar
        editor={editor}
        state={state!}
        selectedBlock={selectedBlock}
        blockStyles={blockStyles}
        blockTransforms={blockTransforms}
        onOpenInserter={handleOpenInserter}
        onToggleListview={() => setShowListview((v) => !v)}
        showListview={showListview}
        inserterRef={inserterRef}
      />

      <div style={{ display: "flex", position: "relative" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 150, placement: "top" }}
            shouldShow={({ editor: ed }) => {
              return ed.isActive("link") || ed.isActive("text");
            }}
          >
            <BubbleMenuContent editor={editor} state={state!} />
          </BubbleMenu>

          <EditorContent editor={editor} className="min-h-[300px]" />
        </div>

        {showListview && flatTree.length > 0 && (
          <BlockListView tree={flatTree} editor={editor} onClose={() => setShowListview(false)} />
        )}
      </div>

      <BlockInserter
        isOpen={inserterOpen}
        onClose={() => setInserterOpen(false)}
        onInsert={handleInsertBlock}
        anchorRect={inserterAnchor}
        recentBlocks={recentBlocks}
      />
    </div>
  );
}

interface ToolbarProps {
  editor: NonNullable<ReturnType<typeof useBlockEditor>["editor"]>;
  state: NonNullable<ReturnType<typeof useBlockEditor>["state"]>;
  selectedBlock: string | null;
  blockStyles: ReturnType<typeof getBlockStyles>;
  blockTransforms: ReturnType<typeof getBlockTransforms>;
  onOpenInserter: () => void;
  onToggleListview: () => void;
  showListview: boolean;
  inserterRef: React.RefObject<HTMLButtonElement>;
}

function Toolbar({
  editor,
  state,
  blockStyles,
  blockTransforms,
  onOpenInserter,
  onToggleListview,
  showListview,
  inserterRef,
}: ToolbarProps) {
  const [showStylePicker, setShowStylePicker] = useState(false);

  return (
    <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-2">
      <ToolbarButton ref={inserterRef} onClick={onOpenInserter} label="Add Block" active={false}>
        +
      </ToolbarButton>
      <span className="mx-1 w-px bg-border" />
      <ToolbarButton
        active={state.headingLevel > 0}
        onClick={() => {
          const levels = [2, 3, 4, 5, 6, 1];
          const current = state.headingLevel;
          const next = current > 0 ? (levels[(levels.indexOf(current) + 1) % levels.length] ?? 2) : 2;
          editor.chain().focus().toggleHeading({ level: next as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }}
        label={`Heading ${state.headingLevel || ""}`}
      >
        H
      </ToolbarButton>
      <ToolbarButton active={state.isBold} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton active={state.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton active={state.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline">
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton active={state.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough">
        <s>S</s>
      </ToolbarButton>
      <span className="mx-1 w-px bg-border" />
      <ToolbarButton
        active={state.textAlign === "left"} onClick={() => editor.chain().focus().setTextAlign("left").run()} label="Align Left">≡</ToolbarButton>
      <ToolbarButton
        active={state.textAlign === "center"} onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Align Center">≡</ToolbarButton>
      <ToolbarButton
        active={state.textAlign === "right"} onClick={() => editor.chain().focus().setTextAlign("right").run()} label="Align Right">≡</ToolbarButton>
      <span className="mx-1 w-px bg-border" />
      <ToolbarButton active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet List">•≡</ToolbarButton>
      <ToolbarButton active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Ordered List">1.</ToolbarButton>
      <span className="mx-1 w-px bg-border" />
      <ToolbarButton active={state.isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">❝</ToolbarButton>
      <ToolbarButton active={state.isCodeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code Block">{'</>'}</ToolbarButton>
      <span className="mx-1 w-px bg-border" />
      <ToolbarButton
        active={state.isLink}
        onClick={() => {
          const url = window.prompt("Enter URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        label="Link"
      >
        ⊕
      </ToolbarButton>
      <span className="mx-1 w-px bg-border" />
      {blockStyles.length > 0 && (
        <div style={{ position: "relative" }}>
          <ToolbarButton onClick={() => setShowStylePicker((v) => !v)} label="Block Style">✦</ToolbarButton>
          {showStylePicker && (
            <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, minWidth: "150px" }}>
              {blockStyles.map((style) => (
                <button key={style.name} onClick={() => setShowStylePicker(false)}
                  style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", background: "#fff", cursor: "pointer", fontSize: "13px", textAlign: "left" }}>
                  {style.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {blockTransforms.length > 0 && (
        <div style={{ position: "relative" }}>
          <ToolbarButton onClick={() => {}} label="Transform To">↔</ToolbarButton>
        </div>
      )}
      <span className="mx-1 w-px bg-border" />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo" disabled={!state.canUndo}>↶</ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo" disabled={!state.canRedo}>↷</ToolbarButton>
      <span style={{ flex: 1 }} />
      <ToolbarButton onClick={onToggleListview} label="List View" active={showListview}>☰</ToolbarButton>
    </div>
  );
}

function BubbleMenuContent({
  editor,
  state,
}: {
  editor: NonNullable<ReturnType<typeof useBlockEditor>["editor"]>;
  state: NonNullable<ReturnType<typeof useBlockEditor>["state"]>;
}) {
  return (
    <div style={{ display: "flex", gap: "2px", background: "#1f2937", borderRadius: "8px", padding: "4px 6px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
      <BubbleButton active={state.isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong style={{ color: "#fff", fontSize: "13px" }}>B</strong>
      </BubbleButton>
      <BubbleButton active={state.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em style={{ color: "#fff", fontSize: "13px" }}>I</em>
      </BubbleButton>
      <BubbleButton active={state.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span style={{ color: "#fff", fontSize: "13px", textDecoration: "underline" }}>U</span>
      </BubbleButton>
      <BubbleButton active={state.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s style={{ color: "#fff", fontSize: "13px" }}>S</s>
      </BubbleButton>
      <BubbleButton
        onClick={() => {
          const url = window.prompt("Edit URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      >
        <span style={{ color: "#fff", fontSize: "13px" }}>✎</span>
      </BubbleButton>
      <BubbleButton onClick={() => editor.chain().focus().unsetLink().run()}>
        <span style={{ color: "#fff", fontSize: "13px" }}>✕</span>
      </BubbleButton>
    </div>
  );
}

function BubbleButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      style={{
        width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
        border: "none", borderRadius: "4px", background: active ? "rgba(255,255,255,0.2)" : "transparent", cursor: "pointer",
      }}>
      {children}
    </button>
  );
}

function BlockListView({
  tree,
  editor,
  onClose,
}: {
  tree: ReturnType<typeof flattenTree>;
  editor: NonNullable<ReturnType<typeof useBlockEditor>["editor"]>;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <div style={{ width: "280px", borderLeft: "1px solid #e5e7eb", background: "#fafafa", overflow: "auto", maxHeight: "500px", fontSize: "13px" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
        <span>Blocks ({tree.length})</span>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#9ca3af" }}>✕</button>
      </div>
      {tree.map((node) => (
        <div key={node.id} onClick={() => { setSelectedId(node.id); editor.commands.setTextSelection(node.pos); editor.commands.focus(); }}
          style={{ padding: "6px 12px", paddingLeft: `${12 + node.depth * 16}px`, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
            borderLeft: selectedId === node.id ? "3px solid #3b82f6" : "3px solid transparent", background: selectedId === node.id ? "#eff6ff" : "transparent" }}>
          <span style={{ color: "#9ca3af", fontSize: "10px", minWidth: "16px" }}>{node.depth > 0 ? "━".repeat(node.depth) : ""}</span>
          <span>{node.title}</span>
        </div>
      ))}
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButtonInner(props: ToolbarButtonProps, ref: React.Ref<HTMLButtonElement>) {
    const { active, onClick, label, disabled, children } = props;
    return (
      <button ref={ref} type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px",
          border: "none", borderRadius: "6px", fontSize: "14px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.3 : 1 }}
        className={active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}>
        {children}
      </button>
    );
  },
);
