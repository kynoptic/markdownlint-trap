import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, test, expect } from '@jest/globals';
import { lint } from 'markdownlint/promise';
import sentenceCaseHeadingRule from '../.vscode/custom-rules/sentence-case-heading.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(__dirname, 'emoji-heading.fixture.md');

function parseFixture(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .reduce(
      (acc, line, index) => {
        if (line.includes('<!-- ✅ -->')) {
          acc.passingLines.push(index + 1);
        } else if (line.includes('<!-- ❌ -->')) {
          acc.failingLines.push(index + 1);
        }
        return acc;
      },
      { passingLines: [], failingLines: [] }
    );
}

describe('emoji sentence-case-heading rule', () => {
  const { passingLines, failingLines } = parseFixture(fixturePath);

  test('handles emoji-prefixed headings correctly', async () => {
    const options = {
      customRules: [sentenceCaseHeadingRule],
      files: [fixturePath],
      resultVersion: 3
    };

    const results = await lint(options);
    const violations = results[fixturePath] || [];
    const ruleViolations = violations.filter(v =>
      v.ruleNames.includes('sentence-case-heading') || v.ruleNames.includes('SC001')
    );

    const failingNumbers = ruleViolations.map(v => v.lineNumber);
    failingLines.forEach(line => {
      expect(failingNumbers).toContain(line);
    });
    passingLines.forEach(line => {
      expect(failingNumbers).not.toContain(line);
    });
  });
});
