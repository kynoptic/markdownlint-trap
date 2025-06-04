/**
 * Test file for the sentence-case-heading custom markdownlint rule.
 * Tests the rule against a fixture file containing examples of passing and failing cases.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, test, expect, beforeAll } from '@jest/globals';

// Import markdownlint using the proper ES modules path
import { lint } from 'markdownlint/promise';

// Import the custom rule
import sentenceCaseHeadingRule from '../.vscode/custom-rules/sentence-case-heading.js';

// Get current file path (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the fixture file
const fixturePath = path.join(__dirname, "basic-sentence-case-heading.fixture.md");

/**
 * Parses a fixture file to extract test cases marked with ✅ (passing) and ❌ (failing)
 * @param {string} filePath - Path to the fixture file
 * @returns {Object} Object containing arrays of passing and failing line numbers
 */
function parseFixture(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  
  const passingLines = [];
  const failingLines = [];
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.includes("<!-- ✅ -->")) {
      passingLines.push(lineNumber);
    } else if (line.includes("<!-- ❌ -->")) {
      failingLines.push(lineNumber);
    }
  });
  
  return { passingLines, failingLines };
}

const fixtureLines = fs.readFileSync(fixturePath, "utf8").split("\n");

const { passingLines, failingLines } = parseFixture(fixturePath);

describe("sentence-case-heading rule", () => {
  let ruleViolations = [];

  beforeAll(async () => {

    const options = {
      customRules: [sentenceCaseHeadingRule],
      files: [fixturePath],
      resultVersion: 3
    };

    const results = await lint(options);
    const violations = results[fixturePath] || [];
    ruleViolations = violations.filter(v =>
      v.ruleNames.includes("sentence-case-heading") || v.ruleNames.includes("SC001")
    );
  });

  /**
   * Extracts the heading text from a fixture line.
   * @param {string} line - Raw line from the fixture file
   * @returns {string}
   */
  function headingTextForLine(line) {
    const match = line.trim().match(/^#+\s*([^<]+)/);
    return match ? match[1].trim() : line.trim();
  }

  test.each(failingLines.map((lineNum) => [lineNum, headingTextForLine(fixtureLines[lineNum - 1])]))(
    "line %i ('%s') should report a violation",
    (lineNum) => {
      const hasViolation = ruleViolations.some((v) => v.lineNumber === lineNum);
      expect(hasViolation).toBe(true);
    }
  );

  test.each(passingLines.map((lineNum) => [lineNum, headingTextForLine(fixtureLines[lineNum - 1])]))(
    "line %i ('%s') should not report a violation",
    (lineNum) => {
      const hasViolation = ruleViolations.some((v) => v.lineNumber === lineNum);
      expect(hasViolation).toBe(false);
    }
  );

  test("provides appropriate error messages", () => {
    ruleViolations.forEach((violation) => {
      expect(violation.errorDetail).toBeTruthy();
      expect([
        "Heading's first word should be capitalized.",
        "Only the first letter of the first word in a heading should be capitalized (unless it's a short acronym).",
        /Word ".*" in heading should be lowercase./,
        /Word ".*" in heading should be capitalized./,
        "Heading should not be in all caps."
      ].some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(violation.errorDetail);
        }
        return violation.errorDetail === pattern;
      })).toBe(true);
    });
  });
});
