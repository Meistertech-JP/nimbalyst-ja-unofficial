// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TimelineRuler } from '../components/TimelineRuler';

afterEach(cleanup);

it('updates ruler labels when the selected locale changes without changing tick positions', () => {
  const rangeMin = new Date(2026, 7, 1, 12).getTime();
  const props = { rangeMin, rangeMax: rangeMin + 86400000, pxPerDay: 1400, contentWidth: 1400 };
  const view = render(<TimelineRuler {...props} locale="en-US" />);
  const positions = () => [...view.container.querySelectorAll<HTMLElement>('.pg-tl-tick')].map(tick => tick.style.left);
  const initialPositions = positions();
  expect(view.container.textContent).toContain('Aug 2');
  expect(view.container.textContent).toContain('PM');

  view.rerender(<TimelineRuler {...props} locale="ja-JP" />);
  expect(view.container.textContent).toContain('8月2日');
  expect(view.container.textContent).toContain('時');
  expect(view.container.textContent).not.toContain('Aug');
  expect(positions()).toEqual(initialPositions);

  view.rerender(<TimelineRuler {...props} locale="en-US" />);
  expect(view.container.textContent).toContain('Aug 2');
  expect(positions()).toEqual(initialPositions);
});
