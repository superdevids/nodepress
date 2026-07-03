/**
 * Default Tiptap extensions for the block editor.
 * WordPress-compatible block set with custom NodePress extensions.
 */

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import type { Extensions } from "@tiptap/core";

import {
  CoverBlockExtension,
  MediaTextExtension,
  ButtonsExtension,
  ButtonItemExtension,
  ColumnsExtension,
  ColumnItemExtension,
  SpacerExtension,
  DetailsExtension,
} from "./extensions/custom-extensions.js";

import "./blocks/block-declarations.js";
import "./styles/block-styles.js";
import "./variations/block-variations.js";
import "./transformations/block-transformations.js";
import "./categories/block-categories.js";
import "./dynamic/dynamic-blocks.js";

export function getDefaultExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      history: {
        depth: 100,
      },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer",
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
    Youtube.configure({
      controls: true,
      modestBranding: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    TextStyle,
    FontFamily,
    Highlight.configure({
      multicolor: true,
    }),
    Subscript,
    Superscript,

    CoverBlockExtension,
    MediaTextExtension,
    ButtonsExtension,
    ButtonItemExtension,
    ColumnsExtension,
    ColumnItemExtension,
    SpacerExtension,
    DetailsExtension,
  ];
}