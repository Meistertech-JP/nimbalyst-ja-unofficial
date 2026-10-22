/**
 * PullRequestSidebar — filter chips for the PR review list. Mirrors the
 * tracker sidebar's chip pattern.
 *
 * `open` and `closed` are mutually exclusive (a PR is one or the other);
 * the remaining chips are independent client-side narrowing filters.
 *
 * A second chip group is derived from the workflow statuses of tracker items
 * referencing the listed PRs — nothing is hardcoded to a status vocabulary or
 * tracker type, so projects without PR-referencing items simply don't see it.
 */

import type { JSX } from 'react';
import { useMemo } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { useAtomValue } from 'jotai';
import { prListAtom, type PrFilterChip } from '../../store/atoms/pullRequests';
import { usePrTrackerReferences } from './usePrTrackerContext';
import { collectTrackerStatusChips } from './githubTrackerStatusChips';
import { GithubFilterChips } from './GithubFilterChips';

interface PullRequestSidebarProps {
  remote: string | null;
  activeFilters: PrFilterChip[];
  onToggleFilter: (filter: PrFilterChip) => void;
  activeTrackerStatusFilters: string[];
  onToggleTrackerStatusFilter: (status: string) => void;
}

const FILTER_CHIPS: { id: PrFilterChip; key: string; icon: string }[] = [
  { id: 'open', key: 'open', icon: 'radio_button_unchecked' },
  { id: 'closed', key: 'closed', icon: 'cancel' },
  { id: 'awaiting-review', key: 'awaiting_review', icon: 'rate_review' },
  { id: 'created-by-me', key: 'created_by_me', icon: 'person' },
  { id: 'with-conflicts', key: 'with_conflicts', icon: 'merge_type' },
  { id: 'draft', key: 'draft', icon: 'edit_note' },
];

export function PullRequestSidebar({
  remote,
  activeFilters,
  onToggleFilter,
  activeTrackerStatusFilters,
  onToggleTrackerStatusFilter,
}: PullRequestSidebarProps): JSX.Element {
  const { t } = useTranslation('git');
  const prList = useAtomValue(prListAtom);
  const trackerReferences = usePrTrackerReferences(remote);

  // One chip per workflow-status value present among items referencing listed
  // PRs, labeled/colored by each item's own schema. Counts are per PR.
  const trackerStatusChips = useMemo(
    () =>
      collectTrackerStatusChips({
        numbers: prList.map((pr) => pr.number),
        references: trackerReferences,
        activeValues: activeTrackerStatusFilters,
      }),
    [activeTrackerStatusFilters, prList, trackerReferences],
  );

  return (
    <div
      className="pr-sidebar w-full shrink-0 flex flex-col bg-nim-secondary"
      data-testid="pr-sidebar"
    >
      <div className="px-3 py-2 border-b border-nim">
        <div className="text-[11px] font-semibold text-nim-muted uppercase tracking-wider">
          {t('pull_request.title')}
        </div>
        {remote && (
          <div className="text-[11px] text-nim-faint truncate mt-0.5" title={remote}>
            {remote}
          </div>
        )}
      </div>

      <GithubFilterChips
        heading={t('pull_request.filters')}
        chips={FILTER_CHIPS.map((chip) => ({ ...chip, label: t(`pull_request.filters_list.${chip.key}`) }))}
        activeIds={activeFilters}
        onToggle={onToggleFilter}
        testIdPrefix="pr-filter"
      />

      {trackerStatusChips.length > 0 && (
        <GithubFilterChips
          heading={t('pull_request.review_status')}
          chips={trackerStatusChips.map((chip) => ({ ...chip, id: chip.value }))}
          activeIds={activeTrackerStatusFilters}
          onToggle={onToggleTrackerStatusFilter}
          testIdPrefix="pr-tracker-status"
          groupTestId="pr-tracker-status-filters"
        />
      )}
    </div>
  );
}
