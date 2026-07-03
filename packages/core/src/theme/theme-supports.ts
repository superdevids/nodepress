export enum ThemeFeature {
  PostThumbnails = "post-thumbnails",
  CustomLogo = "custom-logo",
  CustomHeader = "custom-header",
  CustomBackground = "custom-background",
  TitleTag = "title-tag",
  Html5 = "html5",
  AlignWide = "align-wide",
  ResponsiveEmbeds = "responsive-embeds",
  BlockStyles = "block-styles",
  DisableCustomColors = "disable-custom-colors",
  DisableCustomFontSizes = "disable-custom-font-sizes",
  EditorGradientPresets = "editor-gradient-presets",
  CustomSpacing = "custom-spacing",
  CustomUnits = "custom-units",
  CustomLineHeight = "custom-line-height",
  Widgets = "widgets",
  Menus = "menus",
  AutomaticFeedLinks = "automatic-feed-links",
  CustomizeSelectiveRefresh = "customize-selective-refresh",
  StarterContent = "starter-content",
}

export interface ThemeFeatureEffect {
  feature: ThemeFeature;
  label: string;
  description: string;
  effects: string[];
}

export class ThemeSupportsManager {
  private supports: Map<string, Set<string>> = new Map();

  static getFeatureEffects(): ThemeFeatureEffect[] {
    return [
      {
        feature: ThemeFeature.PostThumbnails,
        label: "Post Thumbnails",
        description: "Enable featured images for content entries",
        effects: ["Shows featured image upload box in Content Editor", "Enables thumbnail size in media library"],
      },
      {
        feature: ThemeFeature.CustomLogo,
        label: "Custom Logo",
        description: "Enable custom logo upload in Customizer",
        effects: ["Shows logo upload field in Site Identity panel", "Adds custom-logo theme mod"],
      },
      {
        feature: ThemeFeature.CustomHeader,
        label: "Custom Header",
        description: "Enable custom header image upload",
        effects: ["Adds Header Image panel in Customizer", "Enables header-text color control"],
      },
      {
        feature: ThemeFeature.CustomBackground,
        label: "Custom Background",
        description: "Enable custom background color/image",
        effects: ["Adds Background panel in Customizer", "Enables background_color theme mod"],
      },
      {
        feature: ThemeFeature.TitleTag,
        label: "Document Title Tag",
        description: "Let WordPress manage the document title",
        effects: ["Removes hardcoded <title> from theme", "Enables SEO-friendly title generation"],
      },
      {
        feature: ThemeFeature.Html5,
        label: "HTML5 Markup",
        description: "Use HTML5 markup for content elements",
        effects: ["Uses HTML5 comment list markup", "Uses HTML5 search form", "Uses HTML5 gallery markup"],
      },
      {
        feature: ThemeFeature.AlignWide,
        label: "Wide Alignment",
        description: "Enable wide and full alignment in editor",
        effects: ["Shows wide/full alignment buttons in Block Editor", "Adds alignwide and alignfull CSS classes"],
      },
      {
        feature: ThemeFeature.ResponsiveEmbeds,
        label: "Responsive Embeds",
        description: "Auto-wrap embeds in responsive containers",
        effects: ["Wraps oEmbed content in responsive container", "Prevents embeds from breaking layout"],
      },
      {
        feature: ThemeFeature.BlockStyles,
        label: "Block Styles",
        description: "Enable theme-defined block style variations",
        effects: ["Shows block style selector in editor sidebar", "Applies theme block styles to editor"],
      },
      {
        feature: ThemeFeature.DisableCustomColors,
        label: "Disable Custom Colors",
        description: "Restrict users to theme-defined color palette",
        effects: ["Hides custom color picker in editor", "Only theme palette colors are available"],
      },
      {
        feature: ThemeFeature.DisableCustomFontSizes,
        label: "Disable Custom Font Sizes",
        description: "Restrict users to theme-defined font sizes",
        effects: ["Hides custom font size input", "Only theme preset sizes are available"],
      },
      {
        feature: ThemeFeature.EditorGradientPresets,
        label: "Editor Gradient Presets",
        description: "Use theme-defined gradient presets in editor",
        effects: ["Shows gradient presets in color picker", "Enables gradient background on blocks"],
      },
      {
        feature: ThemeFeature.CustomSpacing,
        label: "Custom Spacing",
        description: "Enable custom padding/margin controls in editor",
        effects: ["Shows padding and margin controls in block settings", "Enables spacing presets from theme.json"],
      },
      {
        feature: ThemeFeature.CustomUnits,
        label: "Custom Units",
        description: "Use custom CSS units in spacing controls",
        effects: ["Shows unit selector (px, em, rem, %) in spacing controls", "Uses theme spacing units"],
      },
      {
        feature: ThemeFeature.CustomLineHeight,
        label: "Custom Line Height",
        description: "Enable line-height control in editor",
        effects: ["Shows line-height input in block typography settings", "Allows fine-grained text spacing"],
      },
      {
        feature: ThemeFeature.Widgets,
        label: "Widgets",
        description: "Enable block-based widget areas",
        effects: ["Enables Widgets admin screen", "Block Areas manager becomes available"],
      },
      {
        feature: ThemeFeature.Menus,
        label: "Menus",
        description: "Enable navigation menu management",
        effects: ["Enables Menus admin screen", "Nav menu locations are configurable"],
      },
      {
        feature: ThemeFeature.AutomaticFeedLinks,
        label: "Automatic Feed Links",
        description: "Auto-add RSS feed links to <head>",
        effects: ["Adds RSS feed link tags automatically", "Enables feed discovery"],
      },
    ];
  }

  addSupport(themeSlug: string, feature: ThemeFeature | string): void {
    if (!this.supports.has(themeSlug)) {
      this.supports.set(themeSlug, new Set());
    }
    this.supports.get(themeSlug)!.add(feature);
  }

  removeSupport(themeSlug: string, feature: ThemeFeature | string): void {
    this.supports.get(themeSlug)?.delete(feature);
  }

  hasSupport(themeSlug: string, feature: ThemeFeature | string): boolean {
    return this.supports.get(themeSlug)?.has(feature) ?? false;
  }

  getSupportedFeatures(themeSlug: string): string[] {
    return Array.from(this.supports.get(themeSlug) ?? []);
  }

  getAllSupports(): Map<string, Set<string>> {
    return this.supports;
  }

  isUiControlVisible(themeSlug: string, controlName: string): boolean {
    switch (controlName) {
      case "featured_image":
        return this.hasSupport(themeSlug, ThemeFeature.PostThumbnails);
      case "custom_colors":
        return !this.hasSupport(themeSlug, ThemeFeature.DisableCustomColors);
      case "custom_font_sizes":
        return !this.hasSupport(themeSlug, ThemeFeature.DisableCustomFontSizes);
      case "custom_spacing":
        return this.hasSupport(themeSlug, ThemeFeature.CustomSpacing);
      case "custom_line_height":
        return this.hasSupport(themeSlug, ThemeFeature.CustomLineHeight);
      case "align_wide":
        return this.hasSupport(themeSlug, ThemeFeature.AlignWide);
      case "gradient_presets":
        return this.hasSupport(themeSlug, ThemeFeature.EditorGradientPresets);
      case "custom_logo":
        return this.hasSupport(themeSlug, ThemeFeature.CustomLogo);
      case "widgets":
        return this.hasSupport(themeSlug, ThemeFeature.Widgets);
      case "menus":
        return this.hasSupport(themeSlug, ThemeFeature.Menus);
      default:
        return true;
    }
  }

  async syncToDatabase(themeSlug: string, themeId: string, prisma: import("@nodepress/db").PrismaClient): Promise<void> {
    const features = this.getSupportedFeatures(themeSlug);
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (theme) {
      await prisma.theme.update({
        where: { id: themeId },
        data: { supports: features },
      });
    }
  }

  async loadFromDatabase(themeSlug: string, themeId: string, prisma: import("@nodepress/db").PrismaClient): Promise<void> {
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (theme?.supports) {
      for (const feature of theme.supports) {
        this.addSupport(themeSlug, feature);
      }
    }
  }
}
