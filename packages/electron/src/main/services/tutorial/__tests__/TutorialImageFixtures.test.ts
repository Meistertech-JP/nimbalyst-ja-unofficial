// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tutorial screenshot fixtures', () => {
  for (const template of ['tutorial-project', 'tutorial-project-ja']) {
    it(`${template} contains a canonical, complete JPEG payload`, () => {
      const fixture = JSON.parse(readFileSync(resolve(__dirname,
        '../../../../../resources', template, 'sessions/01-draft-product-brief.json'), 'utf8'));
      const images: { source: { data: string; media_type: string } }[] = [];
      for (const message of fixture.messages) {
        const payload = JSON.parse(message.content);
        for (const block of payload.message?.content ?? []) {
          if (block.type !== 'tool_result' || !Array.isArray(block.content)) continue;
          images.push(...block.content.filter((item: { type: string }) => item.type === 'image'));
        }
      }
      expect(images).toHaveLength(1);
      for (const { source } of images) {
        expect(source.media_type).toBe('image/jpeg');
        const bytes = Buffer.from(source.data, 'base64');
        expect(bytes.toString('base64')).toBe(source.data);
        expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);
        expect([...bytes.subarray(-2)]).toEqual([0xff, 0xd9]);
      }
    });
  }
});
