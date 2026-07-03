/**
 * Custom Tiptap extensions for NodePress blocks.
 */

import { Node, mergeAttributes } from "@tiptap/core";

export const CoverBlockExtension = Node.create({
  name: "nodepress/cover",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      backgroundImage: { default: "" },
      backgroundColor: { default: "#1e293b" },
      backgroundVideo: { default: "" },
      gradient: { default: "" },
      overlayColor: { default: "rgba(0,0,0,0.4)" },
      fixedBackground: { default: false },
      focalPoint: { default: { x: 50, y: 50 } },
      minHeight: { default: "400px" },
      textColor: { default: "#ffffff" },
      contentWidth: { default: "800px" },
      align: { default: "full" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type=cover]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const bgStyle: string[] = [];

    if (HTMLAttributes.backgroundImage) {
      bgStyle.push(`background-image: url(${HTMLAttributes.backgroundImage})`);
      bgStyle.push("background-size: cover");
      bgStyle.push("background-position: center");
      if (HTMLAttributes.fixedBackground) {
        bgStyle.push("background-attachment: fixed");
      }
    } else if (HTMLAttributes.gradient) {
      bgStyle.push(`background: ${HTMLAttributes.gradient}`);
    } else {
      bgStyle.push(`background-color: ${HTMLAttributes.backgroundColor}`);
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "cover",
        style: [
          ...bgStyle,
          `min-height: ${HTMLAttributes.minHeight}`,
          "display: flex",
          "align-items: center",
          "justify-content: center",
          "position: relative",
          "overflow: hidden",
          "width: 100%",
        ].join("; "),
      }),
      [
        "div",
        {
          style: [
            "position: absolute",
            "inset: 0",
            `background: ${HTMLAttributes.overlayColor}`,
          ].join("; "),
        },
      ],
      [
        "div",
        {
          style: [
            "position: relative",
            "z-index: 1",
            `color: ${HTMLAttributes.textColor}`,
            `max-width: ${HTMLAttributes.contentWidth}`,
            "width: 100%",
            "padding: 40px 20px",
          ].join("; "),
        },
        0,
      ],
    ];
  },
});

export const MediaTextExtension = Node.create({
  name: "nodepress/media-text",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      mediaUrl: { default: "" },
      mediaType: { default: "image" },
      mediaPosition: { default: "left" },
      imageFill: { default: true },
      verticalAlignment: { default: "center" },
      mediaWidth: { default: 50 },
      stackOnMobile: { default: true },
      backgroundColor: { default: "" },
      textColor: { default: "" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type=media-text]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const isLeft = HTMLAttributes.mediaPosition === "left";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "media-text",
        style: [
          "display: flex",
          `flex-direction: ${isLeft ? "row" : "row-reverse"}`,
          "align-items: center",
          "gap: 24px",
          HTMLAttributes.backgroundColor ? `background: ${HTMLAttributes.backgroundColor}` : "",
          "border-radius: 8px",
          "overflow: hidden",
        ]
          .filter(Boolean)
          .join("; "),
      }),
      [
        "div",
        {
          style: [
            `flex: ${HTMLAttributes.mediaWidth}`,
            "min-width: 0",
          ].join("; "),
        },
        [
          HTMLAttributes.mediaType === "video" ? "video" : "img",
          {
            src: HTMLAttributes.mediaUrl || "https://placehold.co/600x400",
            style: [
              "width: 100%",
              "height: 100%",
              "object-fit: cover",
              "display: block",
            ].join("; "),
          },
        ],
      ],
      [
        "div",
        {
          style: [
            `flex: ${100 - (HTMLAttributes.mediaWidth as number)}`,
            "padding: 24px",
            HTMLAttributes.textColor ? `color: ${HTMLAttributes.textColor}` : "",
          ]
            .filter(Boolean)
            .join("; "),
        },
        0,
      ],
    ];
  },
});

export const ButtonsExtension = Node.create({
  name: "nodepress/buttons",

  group: "block",

  content: "buttonItem*",

  defining: true,

  addAttributes() {
    return {
      align: { default: "left" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type=buttons]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "buttons",
        style: [
          "display: flex",
          "flex-wrap: wrap",
          "gap: 12px",
          `justify-content: ${HTMLAttributes.align === "center" ? "center" : HTMLAttributes.align === "right" ? "flex-end" : "flex-start"}`,
        ].join("; "),
      }),
      0,
    ];
  },
});

export const ButtonItemExtension = Node.create({
  name: "buttonItem",

  group: "block",

  content: "text*",

  inline: false,

  addAttributes() {
    return {
      url: { default: "" },
      text: { default: "Button" },
      backgroundColor: { default: "#3b82f6" },
      textColor: { default: "#ffffff" },
      size: { default: "medium" },
      borderRadius: { default: "6px" },
      target: { default: "" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-node-type=button-item]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const sizes: Record<string, string> = {
      small: "8px 16px; font-size: 14px",
      medium: "12px 24px; font-size: 16px",
      large: "16px 32px; font-size: 18px",
    };

    return [
      "a",
      {
        "data-node-type": "button-item",
        href: HTMLAttributes.url || "#",
        target: HTMLAttributes.target || undefined,
        style: [
          `background: ${HTMLAttributes.backgroundColor}`,
          `color: ${HTMLAttributes.textColor}`,
          `border-radius: ${HTMLAttributes.borderRadius}`,
          `padding: ${sizes[(HTMLAttributes.size as string) ?? "medium"]}`,
          "text-decoration: none",
          "display: inline-block",
          "font-weight: 500",
          "cursor: pointer",
          "transition: opacity 0.2s",
        ].join("; "),
      },
      HTMLAttributes.text as string,
    ];
  },
});

export const ColumnsExtension = Node.create({
  name: "nodepress/columns",

  group: "block",

  content: "columnItem+",

  defining: true,

  addAttributes() {
    return {
      columns: { default: 2 },
      layout: { default: "50-50" },
      gap: { default: "24px" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type=columns]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "columns",
        style: [
          "display: flex",
          `gap: ${HTMLAttributes.gap}`,
          "width: 100%",
        ].join("; "),
      }),
      0,
    ];
  },
});

export const ColumnItemExtension = Node.create({
  name: "columnItem",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      flex: { default: "1" },
      verticalAlign: { default: "top" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type=column-item]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-node-type": "column-item",
        style: [
          `flex: ${HTMLAttributes.flex}`,
          "min-width: 0",
          "overflow-wrap: break-word",
        ].join("; "),
      },
      0,
    ];
  },
});

export const SpacerExtension = Node.create({
  name: "nodepress/spacer",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      height: { default: "40px" },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-node-type=spacer]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "spacer",
        "aria-hidden": "true",
        style: `height: ${HTMLAttributes.height}`,
      }),
    ];
  },
});

export const DetailsExtension = Node.create({
  name: "nodepress/details",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      summary: { default: "Click to expand" },
      open: { default: false },
      className: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "details[data-node-type=details]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "details",
        open: HTMLAttributes.open ? "true" : undefined,
        style: [
          "border: 1px solid #e5e7eb",
          "border-radius: 8px",
          "padding: 12px",
          "overflow: hidden",
        ].join("; "),
      }),
      [
        "summary",
        {
          style: [
            "cursor: pointer",
            "font-weight: 600",
            "padding: 8px 0",
            "user-select: none",
          ].join("; "),
        },
        HTMLAttributes.summary as string,
      ],
      [
        "div",
        {
          style: [
            "padding: 12px 0 4px",
          ].join("; "),
        },
        0,
      ],
    ];
  },
});