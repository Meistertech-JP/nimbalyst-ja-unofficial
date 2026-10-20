import { describe, expect, it } from 'vitest';
import { createMockupContent } from '../fileUtils';

describe('createMockupContent', () => {
  it('preserves the existing English template when called without options', () => {
    const content = createMockupContent();

    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html lang="en">');
    expect(content).toContain('<title>Mockup</title>');
    expect(content).toContain('<h1>New Mockup</h1>');
    expect(content).toContain(
      '<p>Edit this mockup using the AI chat or edit the HTML directly.</p>',
    );
  });

  it('uses the localized template values supplied by the caller', () => {
    const content = createMockupContent({
      language: 'ja',
      title: 'モックアップ',
      heading: '新しいモックアップ',
      description: 'AIチャットを使うか、HTMLを直接編集してください。',
    });

    expect(content).toContain('<html lang="ja">');
    expect(content).toContain('<title>モックアップ</title>');
    expect(content).toContain('<h1>新しいモックアップ</h1>');
    expect(content).toContain(
      '<p>AIチャットを使うか、HTMLを直接編集してください。</p>',
    );
  });

  it('preserves pre-escaped values and the surrounding HTML structure', () => {
    const content = createMockupContent({
      title: 'Design &amp; Review',
      heading: '&lt;Prototype&gt;',
      description: '&quot;Ready&quot;',
    });

    expect(content).toContain('<title>Design &amp; Review</title>');
    expect(content).toContain('<h1>&lt;Prototype&gt;</h1>');
    expect(content).toContain('<p>&quot;Ready&quot;</p>');
    expect(content).not.toContain('&amp;amp;');
    expect(content).toMatch(
      /<head>[\s\S]*<\/head>\s*<body>[\s\S]*<div class="container">[\s\S]*<\/div>\s*<\/body>\s*<\/html>$/,
    );
  });
});
