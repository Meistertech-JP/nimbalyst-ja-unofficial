import { describe, expect, it } from 'vitest';
import { createMockupContent } from '../fileUtils';

describe('createMockupContent', () => {
  it('uses localized copy and document language when provided', () => {
    const content = createMockupContent({
      language: 'ja',
      title: 'モックアップ',
      heading: '新しいモックアップ',
      description: 'ここからモックアップの作成を始めます。',
    });

    expect(content).toContain('<html lang="ja">');
    expect(content).toContain('<title>モックアップ</title>');
    expect(content).toContain('<h1>新しいモックアップ</h1>');
    expect(content).toContain('<p>ここからモックアップの作成を始めます。</p>');
    expect(content).not.toContain('New Mockup');
  });

  it('retains the English template defaults for existing callers', () => {
    const content = createMockupContent();

    expect(content).toContain('<html lang="en">');
    expect(content).toContain('<title>Mockup</title>');
    expect(content).toContain('<h1>New Mockup</h1>');
  });
});
