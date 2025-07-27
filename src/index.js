import backtickCodeElements from './rules/backtick-code-elements.js';
import sentenceCaseHeading from './rules/sentence-case-heading.js';
import noBareUrls from './rules/no-bare-urls.js';
import noDeadInternalLinks from './rules/no-dead-internal-links.js';
import noLiteralAmpersand from './rules/no-literal-ampersand.js';

/**
 * Export all custom rules as a single array for markdownlint.
 * @type {import('markdownlint').Rule[]}
 */
export default [backtickCodeElements, sentenceCaseHeading, noBareUrls, noDeadInternalLinks, noLiteralAmpersand];
