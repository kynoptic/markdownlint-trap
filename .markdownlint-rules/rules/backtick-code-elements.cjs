"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _sharedConstants = require("./shared-constants.cjs");
var _autofixSafety = require("./autofix-safety.cjs");
var _configValidation = require("./config-validation.cjs");
// @ts-check

/**
 * Rule that requires code snippets, file names and directory paths
 * to be wrapped in backticks when used in prose.
 */
// Import the centralized ignoredTerms Set

/**
 * Generate a contextual error message based on the type of violation detected.
 * @param {string} text - The text that triggered the violation
 * @param {string} line - The full line context
 * @returns {string} A descriptive error message
 */
function generateContextualErrorMessage(text, line) {
  // eslint-disable-line no-unused-vars
  // Shell commands with arguments (highest priority)
  if (/^(git|npm|pip|yarn|docker|brew|cargo|pnpm|curl|wget|ssh|scp|rsync|grep|sed|awk|find|ls|cd|mkdir|rm|cp|mv|chmod|chown|sudo|su|ps|top|htop|kill|killall|systemctl|service|crontab|tar|gzip|zip|unzip|cat|head|tail|less|more|vim|nano|emacs|code|ping|traceroute|nslookup|dig|netstat|ss)\s/.test(text)) {
    return `Command '${text}' should be wrapped in backticks to distinguish it from regular text`;
  }

  // Shell commands with $ variables
  if (text.includes('$') && (text.includes('grep') || text.includes('export') || text.includes('set'))) {
    return `Shell command '${text}' should be wrapped in backticks to show it's a code example`;
  }

  // File paths (containing forward slashes)
  if (text.includes('/')) {
    if (/\.[a-zA-Z0-9]+$/.test(text)) {
      return `File path '${text}' should be wrapped in backticks for clarity and to distinguish it from regular text`;
    } else if (/\/$/.test(text)) {
      return `Directory path '${text}' should be wrapped in backticks to show it's a file system location`;
    } else {
      return `Path '${text}' should be wrapped in backticks to indicate it's a file system reference`;
    }
  }

  // File names with extensions
  if (/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{1,5}$/.test(text)) {
    return `Filename '${text}' should be wrapped in backticks to distinguish it from regular text`;
  }

  // Dotfiles (starting with .)
  if (/^\.[a-zA-Z]/.test(text)) {
    return `Configuration file '${text}' should be wrapped in backticks to show it's a filename`;
  }

  // Environment variables (ALL_CAPS with underscores)
  if (/^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/.test(text) || /^(?:PATH|HOME|TEMP|TMPDIR|USER|SHELL|PORT|HOST)$/.test(text)) {
    return `Environment variable '${text}' should be wrapped in backticks to indicate it's a system variable`;
  }

  // Shell variables (starting with $)
  if (/^\$/.test(text)) {
    return `Shell variable '${text}' should be wrapped in backticks to show it's a variable reference`;
  }

  // Command line flags (starting with - or --)
  if (/^--?[a-zA-Z]/.test(text)) {
    return `Command flag '${text}' should be wrapped in backticks to show it's a command option`;
  }

  // Function calls (text with parentheses)
  if (/\([^)]*\)$/.test(text)) {
    return `Function call '${text}' should be wrapped in backticks to show it's code`;
  }

  // Import statements
  if (/^import\s+/.test(text)) {
    return `Import statement '${text}' should be wrapped in backticks to show it's code`;
  }

  // Key combinations (CTRL+C, ALT+TAB, etc.)
  if (/^[A-Z]+\+[A-Z]+$/.test(text)) {
    return `Key combination '${text}' should be wrapped in backticks to distinguish it from regular text`;
  }

  // Host:port patterns
  if (/^[A-Za-z0-9.-]+:\d+$/.test(text)) {
    return `Network address '${text}' should be wrapped in backticks to show it's a technical reference`;
  }

  // Variable assignments (export VAR=value, set VAR=value)
  if (/^(?:export|set)\s+/.test(text)) {
    return `Variable assignment '${text}' should be wrapped in backticks to show it's a shell command`;
  }

  // Default fallback message
  return `Code-like element '${text}' should be wrapped in backticks for better readability`;
}

/**
 * markdownlint rule enforcing backticks around file paths and commands.
 *
 * @param {import('markdownlint').RuleParams} params - Parsed Markdown input.
 * @param {import('markdownlint').RuleOnError} onError - Callback to report violations.
 * @returns {void}
 */
function backtickCodeElements(params, onError) {
  if (!params || !Array.isArray(params.lines) || typeof onError !== 'function') {
    return;
  }
  const config = params.config?.['backtick-code-elements'] || params.config?.BCE001 || {};

  // Validate configuration
  const configSchema = {
    ignoredTerms: _configValidation.validateStringArray,
    skipCodeBlocks: _configValidation.validateBoolean,
    skipMathBlocks: _configValidation.validateBoolean
  };
  const validationResult = (0, _configValidation.validateConfig)(config, configSchema, 'backtick-code-elements');
  if (!validationResult.isValid) {
    (0, _configValidation.logValidationErrors)('backtick-code-elements', validationResult.errors);
    // Continue execution with default values to prevent crashes
  }

  // Extract configuration with defaults
  const userIgnoredTerms = Array.isArray(config.ignoredTerms) ? config.ignoredTerms : [];
  const skipCodeBlocks = typeof config.skipCodeBlocks === 'boolean' ? config.skipCodeBlocks : true;
  const skipMathBlocks = typeof config.skipMathBlocks === 'boolean' ? config.skipMathBlocks : true;

  // Combine default ignored terms with user-provided ones
  const allIgnoredTerms = new Set([..._sharedConstants.backtickIgnoredTerms, ...userIgnoredTerms]);
  const lines = params.lines;
  let inCodeBlock = false;
  let inMathBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];

    // Detect both ``` and ~~~ as code block fences (ATX or tilde).
    const fenceMatch = line.trim().match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Detect $$ as math block fences.
    if (line.trim() === '$$') {
      inMathBlock = !inMathBlock;
      continue;
    }

    // Skip lines that are in a code block or heading based on configuration
    if (skipCodeBlocks && inCodeBlock || /^\s*#/.test(line)) {
      continue;
    }

    // For math blocks, respect configuration but with nuanced handling
    if (skipMathBlocks && inMathBlock) {
      // Check for shell-like patterns that should still be flagged even in math blocks
      // This regex matches:
      // 1. grep/export followed directly by $word: grep $pattern
      // 2. export with variable assignment: export x=$value
      const hasShellPattern = /(?:grep\s+\$\w+|export\s+(?:\w+=)?\$\w+)/.test(line);
      if (!hasShellPattern) {
        continue;
      }
    }
    const codeSpans = [];
    const spanRegex = /`[^`]+`/g;
    let spanMatch;
    while ((spanMatch = spanRegex.exec(line)) !== null) {
      codeSpans.push([spanMatch.index, spanMatch.index + spanMatch[0].length]);
    }
    const patterns = [/\b(?:\.?\/?[\w.-]+\/)+[\w.-]+\b/g,
    // directory or file path
    /\b(?=[^\d\s])[\w.-]*[a-zA-Z][\w.-]*\.[a-zA-Z0-9]{1,5}\b/g,
    // file name with letters
    /\b[a-zA-Z][\w.-]*\([^)]*\)/g,
    // simple function or command()
    /\B\.[\w.-]+\b/g,
    // dotfiles like .env
    /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/g,
    // environment variables like NODE_ENV
    /\b(?:PATH|HOME|TEMP|TMPDIR|USER|SHELL|PORT|HOST)\b/g,
    // env vars
    /\B--?[a-zA-Z][\w-]*\b/g,
    // CLI flags

    // common CLI commands like "git clone" or "npm install"
    /\b(?:git|npm|pip|yarn|docker|brew|cargo|pnpm)\s+[a-z][\w-]*/g,
    // common CLI commands
    /\bimport\s+\w+/g,
    // import statements
    // host:port patterns, avoids bible verses like "1:10"
    /\b(?!\d+:\d+\b)[A-Za-z0-9.-]+:\d+\b/g, /\b[A-Z]+\+[A-Z]\b/g,
    // key combos like CTRL+C
    /\b(?:export|set)\s+[A-Za-z_][\w.-]*=\$?[\w.-]+\b/g,
    // shell variable assignments
    // Permissive shell variable usage, avoids prices like $50 or $19.99.
    // Allows single-digit variables like $1, but not $10 or more.
    /\$(?!\d{2,}(?:\.\d*)?\b|\d\.\d+)\S+/g];
    const flaggedPositions = new Set();
    const linkRegex = /!?\[[^\]]*\]\([^)]*\)/g;
    const wikiLinkRegex = /!?\[\[[^\]]+\]\]/g;
    /**
     * Determine if an index range is within a Markdown link or image.
     *
     * @param {string} text - Line being evaluated.
     * @param {number} start - Start index of match.
     * @param {number} end - End index of match.
     * @returns {boolean}
     */
    function inMarkdownLink(text, start, end) {
      let m;
      linkRegex.lastIndex = 0;
      while ((m = linkRegex.exec(text)) !== null) {
        if (start >= m.index && end <= m.index + m[0].length) {
          return true;
        }
      }
      return false;
    }

    /**
     * Check if an index range falls inside a wiki-style link.
     *
     * @param {string} text - Line being evaluated.
     * @param {number} start - Start index of match.
     * @param {number} end - End index of match.
     * @returns {boolean} True when the range is within a wiki link.
     */
    function inWikiLink(text, start, end) {
      let m;
      wikiLinkRegex.lastIndex = 0;
      while ((m = wikiLinkRegex.exec(text)) !== null) {
        if (start >= m.index && end <= m.index + m[0].length) {
          return true;
        }
      }
      return false;
    }

    /**
     * Check if an index range falls inside an HTML comment.
     *
     * @param {string} text - Line being evaluated.
     * @param {number} start - Start index of match.
     * @param {number} end - End index of match.
     * @returns {boolean} True when the range is within an HTML comment.
     */
    function inHtmlComment(text, start, end) {
      const commentRegex = /<!--.*?-->/g;
      let m;
      while ((m = commentRegex.exec(text)) !== null) {
        if (start >= m.index && end <= m.index + m[0].length) {
          return true;
        }
      }
      return false;
    }

    /**
     * Check if an index range falls inside a LaTeX math expression.
     * Handles both inline ($...$) and block ($$...$$) math expressions.
     * Distinguishes between LaTeX math and shell variables like $value.
     *
     * @param {string} text - Line being evaluated.
     * @param {number} start - Start index of match.
     * @param {number} end - End index of match.
     * @returns {boolean} True when the range is within a LaTeX math expression.
     */
    function inLatexMath(text, start, end) {
      // Check for inline math expressions ($...$)
      const inlineMathRegex = /\$([^$]+?)\$/g;
      let m;
      while ((m = inlineMathRegex.exec(text)) !== null) {
        const content = m[1];
        const isMathLike = /[\\{}^_]/.test(content) ||
        // Contains LaTeX special characters
        /[a-zA-Z][+\-*/=<> ]/.test(content) ||
        // Contains variables in equations
        / [+\-*/=] /.test(content) ||
        // Contains operators with spacing
        !/^\d+(\.\d+)?$/.test(content.trim()); // Not just a number (price)

        if (isMathLike && start >= m.index && end <= m.index + m[0].length) {
          return true;
        }
      }

      // Check for block math expressions ($$...$$) on a single line
      const blockMathRegex = /\$\$([^$]|\$[^\$])*\$\$/g;
      blockMathRegex.lastIndex = 0; // Reset regex state
      while ((m = blockMathRegex.exec(text)) !== null) {
        if (start >= m.index && end <= m.index + m[0].length) {
          return true;
        }
      }

      // If the line contains common LaTeX math functions, it's likely math-related.
      if (/\\(?:sum|frac|int|lim|sqrt|sin|cos|log|alpha|beta|gamma|delta|theta|pi|sigma)\b/.test(text)) {
        return true;
      }
      return false;
    }

    /**
     * Heuristically determine if a string looks like a file path.
     * This is used to reduce false positives from natural language
     * that can resemble a path (e.g., "pass/fail", "read/write").
     *
     * @param {string} str - Text to evaluate.
     * @returns {boolean} True if the string resembles a file path.
     */
    function isLikelyFilePath(str) {
      // Paths must contain a slash.
      if (!str.includes('/')) {
        return false;
      }

      // Paths with spaces are uncommon in un-quoted prose.
      if (/\s/.test(str)) {
        return false;
      }
      const segments = str.split('/');

      // Reject if all segments are numeric (e.g., "1/2", "2023/10/15").
      // Allows for empty segments from leading/trailing slashes.
      if (segments.every(s => /^\d+$/.test(s) || s === '')) {
        return false;
      }

      // For simple "a/b" paths without file extensions, be more skeptical.
      if (segments.length === 2 && !/\.[^/]+$/.test(segments[1])) {
        // Avoids flagging common short phrases like "on/off", "i/o".
        if (segments[0].length <= 2 || segments[1].length <= 2) {
          return false;
        }
      }

      // A likely path should contain at least one letter.
      return /[a-zA-Z]/.test(str);
    }
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const fullMatch = match[0];
        const start = match.index;
        const end = start + fullMatch.length;

        // For the path pattern, apply extra heuristics to avoid false positives
        // on natural language like "read/write" or "pass/fail".
        if (pattern.source.includes('\\/') && !isLikelyFilePath(fullMatch)) {
          continue;
        }

        // Skip if inside a code span
        if (codeSpans.some(([s, e]) => start >= s && end <= e)) {
          continue;
        }
        // Skip if inside a Markdown link, wiki link, or HTML comment
        if (inMarkdownLink(line, start, end) || inWikiLink(line, start, end) || inHtmlComment(line, start, end)) {
          continue;
        }
        // Skip if in ignored terms (default + user-configured)
        if (allIgnoredTerms.has(fullMatch)) {
          continue;
        }
        // Skip if already flagged
        if (flaggedPositions.has(start)) {
          continue;
        }
        // Only skip if this match is inside a true LaTeX math region
        if (inLatexMath(line, start, end)) {
          continue;
        }
        // Skip if inside a URL (e.g., after http:// or https://)
        const urlRegex = /https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/g;
        let urlMatch;
        let isInUrl = false;
        while ((urlMatch = urlRegex.exec(line)) !== null) {
          if (start >= urlMatch.index && end <= urlMatch.index + urlMatch[0].length) {
            isInUrl = true;
            break;
          }
        }
        if (isInUrl) {
          continue;
        }

        // For shell patterns with $ variables, prioritize reporting the whole command
        if (fullMatch.includes('$') && fullMatch.includes(' ') && (fullMatch.includes('grep') || fullMatch.includes('export'))) {
          // This is a shell command - report it and skip further matches on this line
          const originalFixInfo = {
            editColumn: start + 1,
            deleteCount: fullMatch.length,
            insertText: `\`${fullMatch}\``
          };
          const safeFixInfo = (0, _autofixSafety.createSafeFixInfo)(originalFixInfo, 'backtick', fullMatch, `\`${fullMatch}\``, {
            type: 'shell-command',
            line
          });
          onError({
            lineNumber,
            detail: generateContextualErrorMessage(fullMatch, line),
            context: fullMatch,
            range: [start + 1, fullMatch.length],
            // Convert to 1-indexed
            fixInfo: safeFixInfo
          });
        } else if (!fullMatch.startsWith('$')) {
          // For non-shell variables, report normally
          const originalFixInfo = {
            editColumn: start + 1,
            deleteCount: fullMatch.length,
            insertText: `\`${fullMatch}\``
          };
          const safeFixInfo = (0, _autofixSafety.createSafeFixInfo)(originalFixInfo, 'backtick', fullMatch, `\`${fullMatch}\``, {
            type: 'code-element',
            line
          });
          onError({
            lineNumber,
            detail: generateContextualErrorMessage(fullMatch, line),
            context: fullMatch,
            range: [start + 1, fullMatch.length],
            // Convert to 1-indexed
            fixInfo: safeFixInfo
          });
        }
        flaggedPositions.add(start);
      }
    }
  }
}
var _default = exports.default = {
  names: ['backtick-code-elements', 'BCE001'],
  description: 'Require code snippets, folder names and directories to be wrapped in backticks.',
  tags: ['style', 'code', 'prose'],
  parser: 'micromark',
  function: backtickCodeElements,
  fixable: true
};
module.exports = exports.default;