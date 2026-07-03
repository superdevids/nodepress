export enum PostFormat {
  STANDARD = "standard",
  ASIDE = "aside",
  GALLERY = "gallery",
  LINK = "link",
  IMAGE = "image",
  QUOTE = "quote",
  STATUS = "status",
  VIDEO = "video",
  AUDIO = "audio",
  CHAT = "chat",
}

export const POST_FORMATS: PostFormat[] = [
  PostFormat.STANDARD,
  PostFormat.ASIDE,
  PostFormat.GALLERY,
  PostFormat.LINK,
  PostFormat.IMAGE,
  PostFormat.QUOTE,
  PostFormat.STATUS,
  PostFormat.VIDEO,
  PostFormat.AUDIO,
  PostFormat.CHAT,
];

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  [PostFormat.STANDARD]: "Standard",
  [PostFormat.ASIDE]: "Aside",
  [PostFormat.GALLERY]: "Gallery",
  [PostFormat.LINK]: "Link",
  [PostFormat.IMAGE]: "Image",
  [PostFormat.QUOTE]: "Quote",
  [PostFormat.STATUS]: "Status",
  [PostFormat.VIDEO]: "Video",
  [PostFormat.AUDIO]: "Audio",
  [PostFormat.CHAT]: "Chat",
};

export interface PostFormatValidation {
  format: PostFormat;
  requiredFields: string[];
  suggestedFields: string[];
}

const POST_FORMAT_VALIDATIONS: Record<PostFormat, PostFormatValidation> = {
  [PostFormat.STANDARD]: {
    format: PostFormat.STANDARD,
    requiredFields: ["title", "content"],
    suggestedFields: ["excerpt"],
  },
  [PostFormat.ASIDE]: {
    format: PostFormat.ASIDE,
    requiredFields: ["content"],
    suggestedFields: [],
  },
  [PostFormat.GALLERY]: {
    format: PostFormat.GALLERY,
    requiredFields: ["gallery_ids"],
    suggestedFields: ["title", "content"],
  },
  [PostFormat.LINK]: {
    format: PostFormat.LINK,
    requiredFields: ["url"],
    suggestedFields: ["title", "content"],
  },
  [PostFormat.IMAGE]: {
    format: PostFormat.IMAGE,
    requiredFields: ["image_id"],
    suggestedFields: ["title", "caption", "alt_text"],
  },
  [PostFormat.QUOTE]: {
    format: PostFormat.QUOTE,
    requiredFields: ["content"],
    suggestedFields: ["citation", "title"],
  },
  [PostFormat.STATUS]: {
    format: PostFormat.STATUS,
    requiredFields: ["content"],
    suggestedFields: [],
  },
  [PostFormat.VIDEO]: {
    format: PostFormat.VIDEO,
    requiredFields: ["video_url"],
    suggestedFields: ["title", "content"],
  },
  [PostFormat.AUDIO]: {
    format: PostFormat.AUDIO,
    requiredFields: ["audio_url"],
    suggestedFields: ["title", "content"],
  },
  [PostFormat.CHAT]: {
    format: PostFormat.CHAT,
    requiredFields: ["content"],
    suggestedFields: ["title"],
  },
};

export class PostFormats {
  private supportedFormats: Set<PostFormat>;

  constructor(supportedFormats?: PostFormat[]) {
    this.supportedFormats = new Set(supportedFormats ?? [PostFormat.STANDARD]);
  }

  setSupportedFormats(formats: PostFormat[]): void {
    this.supportedFormats = new Set(formats);
  }

  getSupportedFormats(): PostFormat[] {
    return Array.from(this.supportedFormats);
  }

  isFormatSupported(format: PostFormat): boolean {
    return this.supportedFormats.has(format);
  }

  validateFormat(format: PostFormat, data: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const validation = POST_FORMAT_VALIDATIONS[format];
    if (!validation) {
      return { valid: false, errors: [`Unknown post format: "${format}"`] };
    }

    const errors: string[] = [];
    for (const field of validation.requiredFields) {
      if (!data[field] && !data[field.replace("_id", "_url")]) {
        errors.push(`Field "${field}" is required for "${format}" format`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getValidation(format: PostFormat): PostFormatValidation | undefined {
    return POST_FORMAT_VALIDATIONS[format];
  }
}

export function isPostFormat(value: string): value is PostFormat {
  return POST_FORMATS.includes(value as PostFormat);
}
