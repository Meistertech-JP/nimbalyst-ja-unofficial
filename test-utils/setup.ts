import { vi, describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { setI18n } from 'react-i18next';
import { createI18nInstance } from '../packages/i18n/src/core';

// Legacy component tests omit the application's language provider. Use real
// English resources there; tests with an explicit provider remain isolated.
const defaultTestI18n = await createI18nInstance('en');
setI18n(defaultTestI18n);
beforeEach(async () => {
  setI18n(defaultTestI18n);
  await defaultTestI18n.changeLanguage('en');
});
// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Make vitest globals available globally
(global as any).describe = describe;
(global as any).it = it;
(global as any).test = test;
(global as any).expect = expect;
(global as any).beforeEach = beforeEach;
(global as any).afterEach = afterEach;
(global as any).beforeAll = beforeAll;
(global as any).afterAll = afterAll;
(global as any).vi = vi;

// Mock window.matchMedia if not available
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Mock IntersectionObserver if not available
if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  // @ts-ignore
  window.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  };
}

// Mock ResizeObserver if not available  
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  // @ts-ignore
  window.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };
}

// Mermaid and other SVG tooling rely on getBBox, which jsdom does not implement.
if (typeof window !== 'undefined' && typeof SVGElement !== 'undefined' && !(SVGElement.prototype as any).getBBox) {
  (SVGElement.prototype as any).getBBox = function() {
    const text = (this as SVGElement).textContent || '';
    return {
      x: 0,
      y: 0,
      width: Math.max(1, text.length * 8),
      height: 16,
    };
  };
}

// Mock CSS imports
vi.mock('*.css', () => ({}));
