/**
 * @feature
 * Tests for BCE001 false positives covering:
 * - #192: scientific/measurement terms (pH, fMRI, mTOR)
 * - #194: bare URLs flagged as file/directory paths
 * - #196: ellipsis-joined prose words (only...but)
 */
import { describe, test, expect } from "@jest/globals";
import { lint } from "markdownlint/promise";
import backtickRule from "../../src/rules/backtick-code-elements.js";

/**
 * @param {string} markdown
 * @returns {Promise<Array>}
 */
async function getBCE001Violations(markdown) {
  const options = {
    customRules: [backtickRule],
    strings: { "test.md": markdown },
    resultVersion: 3,
  };
  const results = await lint(options);
  const violations = results["test.md"] || [];
  return violations.filter(
    (v) =>
      v.ruleNames.includes("backtick-code-elements") ||
      v.ruleNames.includes("BCE001"),
  );
}

describe("BCE001 scientific and measurement terms (#192)", () => {
  test("does not flag pH in prose", async () => {
    const violations = await getBCE001Violations(
      "The solution has a pH of 7.4.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag fMRI in prose", async () => {
    const violations = await getBCE001Violations(
      "Participants underwent fMRI scanning during the task.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag mTOR in prose", async () => {
    const violations = await getBCE001Violations(
      "The mTOR pathway regulates cell growth.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag mTORC1 in prose", async () => {
    const violations = await getBCE001Violations(
      "Inhibition of mTORC1 suppresses protein synthesis.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag sgRNA in prose", async () => {
    const violations = await getBCE001Violations(
      "The sgRNA guides Cas9 to the target site.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag mL in prose", async () => {
    const violations = await getBCE001Violations(
      "Add 5 mL of buffer to the sample.",
    );
    expect(violations).toHaveLength(0);
  });

  test("still flags genuine camelCase code identifiers", async () => {
    const violations = await getBCE001Violations(
      "Call useEffect to register your side effects.",
    );
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("BCE001 bare URLs flagged as file/directory paths (#194)", () => {
  test("does not flag bare https URL as a file path", async () => {
    const violations = await getBCE001Violations(
      "See https://code.claude.com/docs/en/mcp.md for details.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag bare https URL with directory path", async () => {
    const violations = await getBCE001Violations(
      "Docs: https://github.com/settings/tokens",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag bare https URL ending in slash", async () => {
    const violations = await getBCE001Violations(
      "Visit https://geminicli.com/docs/tools/mcp-server/ for the guide.",
    );
    expect(violations).toHaveLength(0);
  });

  test("still flags actual file paths", async () => {
    const violations = await getBCE001Violations(
      "Edit the file at src/rules/backtick-code-elements.js.",
    );
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("BCE001 ellipsis-joined prose words (#196)", () => {
  test("does not flag ellipsis between common words", async () => {
    const violations = await getBCE001Violations(
      "The idea is only...but not always applicable.",
    );
    expect(violations).toHaveLength(0);
  });

  test("does not flag ellipsis between longer prose words", async () => {
    const violations = await getBCE001Violations(
      "The system...was updated overnight.",
    );
    expect(violations).toHaveLength(0);
  });

  test("still flags actual code identifiers containing dots", async () => {
    const violations = await getBCE001Violations(
      "The file config.json stores settings.",
    );
    expect(violations.length).toBeGreaterThan(0);
  });
});
