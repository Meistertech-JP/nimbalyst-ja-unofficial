import { expect, it } from 'vitest';
import { normalizeMarkdown } from '../../utils/comprehensiveDiffTester';

it('canonicalizes thematic breaks identically in LF and CRLF checkouts', () => {
  const source = ['# Header', '', '***', '', 'Text', '', '___'].join('\n');
  expect(normalizeMarkdown(source.replace(/\n/g, '\r\n'))).toBe(normalizeMarkdown(source));
  expect(normalizeMarkdown(source)).toBe('# Header\n\n---\n\nText\n\n---');
});

it('preserves literal thematic-break text inside fenced code for either line ending', () => {
  const source = ['```text', '***', '___', '```', '', '***'].join('\n');
  for (const text of [source, source.replace(/\n/g, '\r\n')]) {
    expect(normalizeMarkdown(text)).toBe('```text\n***\n___\n```\n\n---');
  }
  expect(normalizeMarkdown('different text')).not.toBe(normalizeMarkdown('original text'));
});
