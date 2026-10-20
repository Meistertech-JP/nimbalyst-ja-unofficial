/**
 * PlanListItem - Individual plan item in the sidebar plans list
 */

import type { JSX } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

export interface PlanData {
  id: string;
  title: string;
  isTitleFallback?: boolean;
  status: string;
  owner: string;
  priority: string;
  progress: number;
  path: string;
  lastUpdated: Date;
  tags?: string[];
  planType?: string;
}

interface PlanListItemProps {
  plan: PlanData;
  isActive?: boolean;
  onClick: (plan: PlanData) => void;
}

function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'completed': '#22c55e',
    'in-progress': '#eab308',
    'in-development': '#eab308',
    'active': '#22c55e',
    'cancelled': '#ef4444',
    'blocked': '#ef4444',
    'draft': '#6b7280',
    'ready-for-development': '#3b82f6',
    'in-review': '#8b5cf6',
    'rejected': '#dc2626',
  };
  return statusColors[status.toLowerCase()] || '#6b7280';
}

function getPriorityColor(priority: string): string {
  const priorityColors: Record<string, string> = {
    'critical': '#dc2626',
    'high': '#ef4444',
    'medium': '#f59e0b',
    'low': '#6b7280',
  };
  return priorityColors[priority.toLowerCase()] || '#6b7280';
}

function getPlanTypeIcon(planType?: string): string {
  const icons: Record<string, string> = {
    'feature': 'add_circle',
    'bug-fix': 'bug_report',
    'refactor': 'construction',
    'system-design': 'architecture',
    'research': 'science',
  };
  return icons[planType?.toLowerCase() || ''] || 'description';
}

function formatDate(date: Date, t: TFunction, language: string): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return t('tracker:plans.now');
  if (hours < 24) return t('tracker:plans.hours_ago', { count: hours });
  if (days === 1) return t('tracker:plans.yesterday');
  if (days < 7) return t('tracker:plans.days_ago', { count: days });
  if (days < 30) return t('tracker:plans.weeks_ago', { count: Math.floor(days / 7) });
  return date.toLocaleDateString(language, { month: 'short', day: 'numeric' });
}

export function PlanListItem({ plan, isActive, onClick }: PlanListItemProps): JSX.Element {
  const { t, i18n } = useTranslation(['tracker', 'common']);
  const statusKeys: Record<string, string> = {
    draft: 'status_draft',
    'ready-for-development': 'status_ready',
    'in-development': 'status_in_dev',
    'in-review': 'status_review',
    completed: 'status_done',
    blocked: 'status_blocked',
    rejected: 'status_rejected',
    'in-progress': 'status_in_progress',
    active: 'status_active',
    cancelled: 'status_cancelled',
  };
  const statusKey = statusKeys[plan.status.toLowerCase()];
  const statusLabel = statusKey ? t(`plans.${statusKey}`) : plan.status.replace('-', ' ');
  const priorityLabel = t(`plans.priority_${plan.priority.toLowerCase()}`, { defaultValue: plan.priority });
  const planTypeLabel = plan.planType
    ? t(`common:plan_types.${plan.planType.toLowerCase()}`, { defaultValue: plan.planType })
    : t('plans.plan_type');
  const statusColor = getStatusColor(plan.status);
  const priorityColor = getPriorityColor(plan.priority);
  const planTypeIcon = getPlanTypeIcon(plan.planType);

  return (
    <div
      className={`plan-list-item px-3 py-2 border-b border-nim cursor-pointer transition-colors duration-150 hover:bg-nim-hover ${isActive ? 'active bg-nim-secondary border-l-[3px] border-l-nim-accent pl-[9px]' : ''}`}
      onClick={() => onClick(plan)}
    >
      <div className="plan-list-item-header flex items-start gap-1.5 mb-1.5">
        <span
          className="plan-priority-indicator text-[11px] font-bold tracking-tighter shrink-0 min-w-4"
          style={{ color: priorityColor }}
          title={t('plans.priority_title', { priority: priorityLabel })}
        >
          {plan.priority === 'critical' && '!!!'}
          {plan.priority === 'high' && '!!'}
          {plan.priority === 'medium' && '!'}
        </span>
        <span className="material-symbols-outlined plan-type-icon text-base text-nim-faint shrink-0 mt-px" title={planTypeLabel}>
          {planTypeIcon}
        </span>
        <div className="plan-list-item-title flex-1 text-[13px] font-medium text-nim-primary leading-snug overflow-hidden text-ellipsis line-clamp-2">{plan.isTitleFallback ? t('common:collab.untitled') : plan.title}</div>
      </div>

      {plan.progress > 0 && (
        <div className="plan-progress-bar h-[3px] bg-nim-secondary rounded-sm overflow-hidden mb-1.5">
          <div
            className="plan-progress-fill h-full transition-[width] duration-300 ease-in-out"
            style={{
              width: `${plan.progress}%`,
              backgroundColor: plan.progress === 100 ? '#22c55e' : '#60a5fa'
            }}
          />
        </div>
      )}

      <div className="plan-list-item-footer flex items-center justify-between gap-2">
        <span className="plan-updated-time text-[11px] text-nim-faint">{formatDate(plan.lastUpdated, t, i18n.resolvedLanguage ?? i18n.language)}</span>
        <span
          className="plan-status-badge text-[10px] px-1.5 py-0.5 rounded-sm border capitalize font-medium whitespace-nowrap"
          style={{
            backgroundColor: `${statusColor}20`,
            color: statusColor,
            borderColor: statusColor
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
