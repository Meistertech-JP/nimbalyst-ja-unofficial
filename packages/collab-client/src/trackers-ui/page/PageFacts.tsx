/**
 * The read-only facts at the end of a page's type row (when it changed, its
 * key). Plain and typed pages show them in the same place, after the fields.
 */
import React from 'react';

interface PageTimeFormatOptions {
  t?: (key: string, options?: { count?: number }) => string;
  locale?: string;
}

export interface PageFact {
  id: string;
  label?: string;
  value: string;
  title?: string;
}

export function relativePageTime(timestamp: number, now = Date.now(), options: PageTimeFormatOptions = {}): string {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return options.t?.('collaboration_surface.just_now') ?? 'just now';
  if (minutes < 60) return options.t?.('collaboration_surface.minutes_ago', { count: minutes }) ?? `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return options.t?.('collaboration_surface.hours_ago', { count: hours }) ?? `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return options.t?.('collaboration_surface.days_ago', { count: days }) ?? `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(options.locale);
}

/** "Updated", then "Created" when known; timestamps in epoch milliseconds. */
export function pageTimeFacts(times: { updatedAt?: number | null; createdAt?: number | null }, now = Date.now(), options: PageTimeFormatOptions = {}): PageFact[] {
  const facts: PageFact[] = [];
  if (times.updatedAt) {
    facts.push({ id: 'updated', label: options.t?.('columns.updated') ?? 'Updated', value: relativePageTime(times.updatedAt, now, options), title: new Date(times.updatedAt).toLocaleString(options.locale) });
  }
  if (times.createdAt) {
    facts.push({ id: 'created', label: options.t?.('columns.created') ?? 'Created', value: new Date(times.createdAt).toLocaleDateString(options.locale), title: new Date(times.createdAt).toLocaleString(options.locale) });
  }
  return facts;
}

export const PageFacts: React.FC<{ facts: readonly PageFact[] }> = ({ facts }) => (
  facts.length === 0 ? null : (
    <span className="page-facts ml-auto inline-flex shrink-0 items-center gap-3 pl-2 text-xs" data-testid="page-facts">
      {facts.map((fact) => (
        <span key={fact.id} className="page-fact inline-flex items-center gap-1" title={fact.title} data-fact={fact.id}>
          {fact.label && <span className="text-nim-faint">{fact.label}</span>}
          <span className="text-nim-muted select-text">{fact.value}</span>
        </span>
      ))}
    </span>
  )
);
