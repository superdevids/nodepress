/**
 * @nodepress/editor
 *
 * Block editor based on Tiptap (ProseMirror).
 * WordPress-compatible block editor similar to Gutenberg.
 *
 * Phase 3 - Full Block Editor
 * Includes: Block Supports, Dynamic Blocks, Reusable Blocks,
 * Block Categories, Block Styles, Block Variations,
 * Block Transformations, Block Inserter, Block Locking,
 * Navigation Mode, Cover Block, Media & Text Block, etc.
 */

export { BlockEditor, type BlockEditorProps } from "./block-editor.js";
export { useBlockEditor, type UseBlockEditorOptions } from "./use-block-editor.js";
export { getDefaultExtensions } from "./extensions.js";
export { serializeToHtml } from "./serialize.js";
export { parseFromHtml } from "./parse.js";

export { blockRegistry } from "./block-api.js";

export {
  getBlockSupports,
  hasAlignSupport,
  hasColorSupport,
  hasTypographySupport,
  hasSpacingSupport,
  hasBorderSupport,
  hasShadowSupport,
  hasAnchorSupport,
  getSupportedToolbarControls,
  buildBlockStyleFromSupports,
  getAlignmentClass,
  applySupportsToAttrs,
} from "./supports/block-supports.js";

export {
  registerDynamicBlock,
  getDynamicBlock,
  getDynamicBlocks,
  renderDynamicBlock,
  getCacheKey,
} from "./dynamic/dynamic-blocks.js";

export {
  registerReusableBlock,
  getReusableBlock,
  getReusableBlocks,
  removeReusableBlock,
  createReusableBlockRef,
  isReusableBlock,
  getReusableBlockRefId,
  expandReusableBlock,
  setReusableBlockStore,
  getReusableBlockStore,
  fetchReusableBlocks,
  saveReusableBlock,
  deleteReusableBlock,
  updateReusableBlock,
} from "./reusable/reusable-blocks.js";
export type { ReusableBlockData, ReusableBlockStore } from "./reusable/reusable-blocks.js";

export {
  registerBlockCategory,
  getBlockCategories,
  getBlockCategory,
} from "./categories/block-categories.js";

export {
  registerBlockStyle,
  getBlockStyles,
  applyBlockStyle,
} from "./styles/block-styles.js";

export {
  registerBlockVariation,
  getBlockVariations,
} from "./variations/block-variations.js";

export {
  registerBlockTransform,
  getBlockTransforms,
} from "./transformations/block-transformations.js";

export { BlockInserter } from "./inserter/block-inserter.js";

export {
  createBlockLock,
  isBlockLocked,
  canMoveBlock,
  canRemoveBlock,
  canEditBlock,
  applyBlockLock,
  mergeBlockLock,
  lockEntireContent,
  isTemplateLocked,
} from "./locking/block-locking.js";

export {
  buildBlockTree,
  findBlockById,
  getParentBlockId,
  getPreviousSibling,
  getNextSibling,
  flattenTree,
  buildBreadcrumbs,
} from "./navigation/navigation-mode.js";
export type { BlockTreeNode } from "./navigation/navigation-mode.js";

export { editorHooks, EditorHookNames } from "./hooks/editor-hooks.js";

export {
  serializeBlock,
  deserializeBlock,
  serializeDocument,
  deserializeDocument,
  cloneBlock,
  findBlocksByType,
  countBlocks,
} from "./utils/serialization.js";

export {
  generateId,
  debounce,
  isValidUrl,
  stripHtml,
  truncateText,
  getTextFromBlock,
  isEmptyBlock,
} from "./utils/helpers.js";

export {
  CoverBlockExtension,
  MediaTextExtension,
  ButtonsExtension,
  ButtonItemExtension,
  ColumnsExtension,
  ColumnItemExtension,
  SpacerExtension,
  DetailsExtension,
} from "./extensions/custom-extensions.js";

export type {
  BlockNode,
  BlockContent,
  EditorConfig,
  BlockSupports,
  BlockDeclaration,
  BlockCategoryDef,
  BlockVariationDef,
  BlockTransformDef,
  DynamicBlockDef,
  DynamicBlockContext,
  BlockLock,
  BlockInserterGroup,
  SerializedBlock,
  BlockAttributeDef,
  BlockCategory,
} from "./types.js";