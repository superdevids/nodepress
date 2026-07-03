/**
 * @nodepressjs/testing
 *
 * Test utilities for NodePress projects.
 * Provides factories, fixtures, plugin test utils, and test server helpers.
 */

export {
  createUser,
  createEntry,
  createEntryBuilder,
  createContentType,
  createTerm,
  createMedia,
  createComment,
  createTaxonomy,
} from "./factories.js";

export type {
  UserInput,
  EntryInput,
  TermInput,
  MediaInput,
  CommentInput,
  ContentTypeInput,
} from "./factories.js";

export {
  loadFixture,
  loadAllFixtures,
  setFixturesDir,
  sampleContent,
  sampleHtml,
  sampleShortcodeContent,
  samplePost,
} from "./fixtures.js";

export { TestServer } from "./test-server.js";
export type { TestServerOptions } from "./test-server.js";

export {
  createPluginSDKMock,
  createHookRegistryMock,
  createPrismaMock,
  createLoggerMock,
  PluginTestHarness,
} from "./plugin-test-utils.js";
export type { PluginTestHarnessOptions } from "./plugin-test-utils.js";
