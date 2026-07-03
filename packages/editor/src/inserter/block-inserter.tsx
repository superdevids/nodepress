"use client";

import React, { useState, useRef, useEffect } from "react";
import { blockRegistry } from "../block-api.js";
import { getBlockCategories } from "../categories/block-categories.js";
import { getBlockVariations } from "../variations/block-variations.js";
import type { BlockDeclaration, BlockVariationDef } from "../types.js";

export interface BlockInserterProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (blockName: string, attrs?: Record<string, unknown>) => void;
  anchorRect?: DOMRect;
  recentBlocks?: string[];
}

export function BlockInserter({ isOpen, onClose, onInsert, anchorRect, recentBlocks = [] }: BlockInserterProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
      setActiveCategory(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const allBlocks = blockRegistry.getBlocks();

  const filteredBlocks = search
    ? allBlocks.filter((b) => {
        const q = search.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q);
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchKeywords = (b.keywords ?? []).some((k) => k.toLowerCase().includes(q));
        return matchName || matchTitle || matchKeywords;
      })
    : allBlocks;

  const groupedBlocks = getBlockCategories()
    .map((cat) => ({
      category: cat,
      blocks: filteredBlocks.filter((b) => !activeCategory || b.category === activeCategory),
    }))
    .filter((g) => g.blocks.length > 0);

  const recentBlockItems = recentBlocks
    .map((name) => blockRegistry.getBlock(name))
    .filter((b): b is BlockDeclaration => !!b);

  if (!isOpen) return null;

  const positionStyle: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        top: `${anchorRect.bottom + 4}px`,
        left: `${anchorRect.left}px`,
        minWidth: "350px",
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        minWidth: "400px",
      };

  return (
    <div
      ref={containerRef}
      style={{
        ...positionStyle,
        zIndex: 9999,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        maxHeight: "400px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search blocks..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {!search && (
        <div style={{ display: "flex", gap: "4px", padding: "8px", borderBottom: "1px solid #e5e7eb", overflowX: "auto" }}>
          {getBlockCategories().map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "12px",
                border: "1px solid #d1d5db",
                background: activeCategory === cat.name ? "#3b82f6" : "#fff",
                color: activeCategory === cat.name ? "#fff" : "#374151",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      <div style={{ overflow: "auto", flex: 1, padding: "4px 0" }}>
        {recentBlockItems.length > 0 && !search && !activeCategory && (
          <div>
            <div style={{ padding: "6px 12px", fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>
              Recent
            </div>
            {recentBlockItems.map((block) => (
              <BlockItem key={block.name} block={block} onInsert={onInsert} />
            ))}
          </div>
        )}

        {groupedBlocks.map((group) => (
          <div key={group.category.name}>
            {!search && !activeCategory && (
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {group.category.title}
              </div>
            )}
            {group.blocks.map((block) => (
              <div key={block.name}>
                <BlockItem block={block} onInsert={onInsert} />
                {getBlockVariations(block.name)
                  .filter((v) => v.scope?.includes("inserter"))
                  .map((variation) => (
                    <VariationItem
                      key={`${block.name}-${variation.name}`}
                      blockName={block.name}
                      variation={variation}
                      onInsert={onInsert}
                    />
                  ))}
              </div>
            ))}
          </div>
        ))}

        {filteredBlocks.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
            No blocks found
          </div>
        )}
      </div>
    </div>
  );
}

interface BlockItemProps {
  block: BlockDeclaration;
  onInsert: (blockName: string, attrs?: Record<string, unknown>) => void;
}

function BlockItem({ block, onInsert }: BlockItemProps) {
  return (
    <button
      onClick={() => onInsert(block.name)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "13px",
        textAlign: "left",
        color: "#374151",
      }}
    >
      <span style={{ fontSize: "18px" }}>{getBlockIcon(block.icon)}</span>
      <div>
        <div style={{ fontWeight: 500 }}>{block.title}</div>
        {block.description && <div style={{ fontSize: "11px", color: "#9ca3af" }}>{block.description}</div>}
      </div>
    </button>
  );
}

interface VariationItemProps {
  blockName: string;
  variation: BlockVariationDef;
  onInsert: (blockName: string, attrs?: Record<string, unknown>) => void;
}

function VariationItem({ blockName, variation, onInsert }: VariationItemProps) {
  return (
    <button
      onClick={() => onInsert(blockName, variation.attributes)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 12px 6px 44px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "12px",
        textAlign: "left",
        color: "#6b7280",
      }}
    >
      <span>{variation.icon ?? "?"}</span>
      <span>{variation.title}</span>
    </button>
  );
}

function getBlockIcon(icon?: string): string {
  const icons: Record<string, string> = {
    text: "Aa", image: "??", palette: "??", puzzle: "??", layout: "??",
    code: "</>", list: "??", comment: "??", star: "?", archive: "??",
    calendar: "??", video: "??", heading: "H", quote: "??", button: "??",
    columns: "??", spacer: "?", separator: "?", cover: "??", related: "??",
    youtube: "?", twitter: "??", vimeo: "V", github: "¦", table: "?",
    details: "?", media: "??",
  };
  return icons[icon ?? ""] ?? "?";
}