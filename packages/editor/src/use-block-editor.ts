"use client";

import { useEditor, useEditorState, type EditorOptions } from "@tiptap/react";
import { getDefaultExtensions } from "./extensions.js";
import { editorHooks, EditorHookNames } from "./hooks/editor-hooks.js";
import type { BlockLock, BlockContent } from "./types.js";

export interface UseBlockEditorOptions {
  content?: string | BlockContent | null;
  placeholder?: string;
  editable?: boolean;
  autofocus?: boolean;
  onUpdate?: (html: string, json: unknown) => void;
  extensions?: EditorOptions["extensions"];
  onBlockSelect?: (blockType: string, attrs: Record<string, unknown>) => void;
  onBlockLock?: (blockType: string, lock: BlockLock) => void;
}

export function useBlockEditor({
  content,
  editable = true,
  autofocus = false,
  onUpdate,
  extensions,
  onBlockSelect,
  onBlockLock,
}: UseBlockEditorOptions = {}) {
  const editor = useEditor({
    extensions: extensions ?? getDefaultExtensions(),
    content,
    editable,
    autofocus,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[200px] px-8 py-4",
      },
      handleDOMEvents: {
        keydown: (_view: unknown, event: KeyboardEvent) => {
          if (event.key === "/" && !event.ctrlKey && !event.metaKey) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              if (range.collapsed) {
                const textBefore = range.startContainer.textContent?.slice(0, range.startOffset) ?? "";
                if (textBefore === "" || textBefore.endsWith("\n")) {
                  event.preventDefault();
                  return true;
                }
              }
            }
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const json = ed.getJSON();
      onUpdate?.(html, json);
      editorHooks.applyHooksAsync(EditorHookNames.EDITOR_SAVE, html, json);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from } = ed.state.selection;
      if (from === undefined || from === null) return;
      const resolved = ed.state.doc.resolve(from);
      for (let d = resolved.depth; d >= 0; d--) {
        const node = resolved.node(d);
        if (node && node.type.name !== "doc") {
          const blockName: string = node.type.name;
          const attrs = node.attrs as Record<string, unknown>;
          onBlockSelect?.(blockName, attrs);
          if (onBlockLock && attrs.lock) {
            onBlockLock(blockName, attrs.lock as BlockLock);
          }
          break;
        }
      }
    },
  });

  const state = useEditorState({
    editor,
    selector: (ctx: { editor: typeof editor }) => ({
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isUnderline: ctx.editor?.isActive("underline") ?? false,
      isStrike: ctx.editor?.isActive("strike") ?? false,
      isCode: ctx.editor?.isActive("code") ?? false,
      isLink: ctx.editor?.isActive("link") ?? false,
      isBulletList: ctx.editor?.isActive("bulletList") ?? false,
      isOrderedList: ctx.editor?.isActive("orderedList") ?? false,
      isBlockquote: ctx.editor?.isActive("blockquote") ?? false,
      isCodeBlock: ctx.editor?.isActive("codeBlock") ?? false,
      headingLevel: ctx.editor?.isActive("heading") ? (ctx.editor.getAttributes("heading")?.level as number) ?? 0 : 0,
      textAlign: ctx.editor?.isActive("textAlign") ? (ctx.editor.getAttributes("textAlign")?.textAlign as string) ?? "" : "",
      canUndo: ctx.editor?.can().undo() ?? false,
      canRedo: ctx.editor?.can().redo() ?? false,
    }),
  });

  editorHooks.applyHooksAsync(EditorHookNames.EDITOR_INIT, editor);

  return { editor, state };
}

export type BlockEditorState = ReturnType<typeof useBlockEditor>["state"];