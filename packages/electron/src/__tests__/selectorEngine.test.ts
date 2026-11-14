// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

it('evaluates :has styles without corrupting decimal utility classes', () => {
  const style = document.createElement('style');
  style.textContent = '.copy { opacity: 0 } .copy:has(.copied) { opacity: 1 }';
  document.head.append(style);
  document.body.innerHTML = '<span class="w-3.5"></span><button class="copy"><span class="copied"></span></button><button class="copy"></button>';

  expect(() => getComputedStyle(document.querySelector('span')!)).not.toThrow();
  const buttons = document.querySelectorAll('button');
  expect(getComputedStyle(buttons[0]).opacity).toBe('1');
  expect(getComputedStyle(buttons[1]).opacity).toBe('0');
});
