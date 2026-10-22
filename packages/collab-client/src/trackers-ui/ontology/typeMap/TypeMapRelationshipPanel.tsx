/**
 * One relationship between two types: the sentence both ways, whether the
 * vocabulary declares it, how much it is used and how complete it is, the
 * details its statements carry, and what to do about it. Proposal actions need
 * a writer; a read-only host (the public wiki) gets none.
 */
import { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { TFunction } from 'i18next';
import type { OntologyInspectorWriter } from '../OntologyInspector';
import { typeMapRequestId, type TypeMapModel, type TypeMapRelationship, type TypeMapStatement, type TypeMapType } from '../ontologyLabelMap';
import { createProposalRequest } from '../ontologyWriter';
import type { MapSelection } from './TypeMapCanvas';
import { BarRow, Section, Stat, StatusTag, TypeBadge, lower } from './TypeMapParts';

export interface RelationshipActions {
  /** Opens a page by item id; omitted leaves page names as plain text. */
  onOpenPage?: (id: string) => void;
  /** Files proposal requests; null hides every proposal and review action. */
  writer?: OntologyInspectorWriter | null;
}

interface Props extends RelationshipActions {
  model: TypeMapModel;
  relationship: TypeMapRelationship;
  typeById: ReadonlyMap<string, TypeMapType>;
  zoneTone: ReadonlyMap<string, number>;
  onCenter: (selection: NonNullable<MapSelection>) => void;
}

const LIST_LIMIT = 60;

function statusText(relationship: TypeMapRelationship, from: string, t: TFunction<'tracker'>): string {
  switch (relationship.status) {
    case 'declared-used': return t('type_map_relationship.status_declared_used');
    case 'declared-unused': return t('type_map_relationship.status_declared_unused');
    case 'off-label': return t('type_map_relationship.status_off_label', { from });
    case 'range-violation': return t('type_map_relationship.status_range_violation');
  }
}

/** A sentence about the shape of the statements, when one fact stands out. */
export function relationshipNote(relationship: TypeMapRelationship, from: TypeMapType | undefined, to: TypeMapType | undefined, rangeNames: string, t: TFunction<'tracker'>): string | null {
  const fromPlural = lower(from?.plural ?? relationship.from);
  const toPlural = lower(to?.plural ?? relationship.to);
  const n = relationship.statements;
  if (relationship.status === 'range-violation') {
    return t('type_map_relationship.note_range_violation', { verb: relationship.verb, rangeNames, count: n, toPlural });
  }
  if (relationship.status === 'off-label') {
    return t('type_map_relationship.note_off_label', {
      fromPlural: from?.plural ?? relationship.from,
      verb: relationship.verb,
      count: n,
    });
  }
  if (n >= 3 && relationship.subjects === 1) {
    return t('type_map_relationship.note_all_subject', { count: n, title: relationship.list[0]!.subjectTitle });
  }
  if (n >= 3 && relationship.objects === 1) {
    return t('type_map_relationship.note_all_object', { count: n, title: relationship.list[0]!.objectTitle });
  }
  return null;
}

function requestText(relationship: TypeMapRelationship, fromName: string, toPlural: string, rangeNames: string, t: TFunction<'tracker'>): { title: string; body: string[] } {
  const lines = relationship.list.slice(0, 40).map((statement) => `- ${statement.subjectTitle} ${relationship.verb} ${statement.objectTitle} [${statement.claimId ?? statement.subjectId}]`);
  const more = relationship.list.length > 40 ? [`- ${t('type_map_relationship.request_more', { count: relationship.list.length - 40 })}`] : [];
  if (relationship.status === 'range-violation') {
    return {
      title: t('type_map_relationship.request_title_range', { verb: relationship.verb, toPlural }),
      body: [t('type_map_relationship.request_body_range', { predicate: relationship.predicate, rangeNames, count: relationship.statements, toPlural }), '', ...lines, ...more],
    };
  }
  return {
    title: t('type_map_relationship.request_title_declare', { verb: relationship.verb, fromName }),
    body: [t('type_map_relationship.request_body_declare', {
      count: relationship.statements,
      predicate: relationship.predicate,
      lowerFromName: lower(fromName),
      from: relationship.from,
    }), '', ...lines, ...more],
  };
}

export function TypeMapRelationshipPanel({ model, relationship, typeById, zoneTone, onCenter, onOpenPage, writer }: Props) {
  const { t } = useTranslation('tracker');
  const [showMissing, setShowMissing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filing, setFiling] = useState<'idle' | 'busy' | 'filed' | 'failed'>('idle');
  const from = typeById.get(relationship.from);
  const to = typeById.get(relationship.to);
  const fromPlural = from?.plural ?? relationship.from;
  const toPlural = to?.plural ?? relationship.to;
  const rangeNames = relationship.range.map((id) => lower(typeById.get(id)?.name ?? id)).join(t('type_map_relationship.range_or'));
  const note = relationshipNote(relationship, from, to, rangeNames, t);
  const requestId = typeMapRequestId(relationship);
  const requested = filing === 'filed' || model.openRequests.includes(requestId);
  const canFile = Boolean(writer) && relationship.statements > 0 && (relationship.status === 'off-label' || relationship.status === 'range-violation');
  const page = (id: string, title: string) => (onOpenPage
    ? <button type="button" className="type-map-link" onClick={() => onOpenPage(id)}>{title}</button>
    : <b>{title}</b>);
  const statementRow = (statement: TypeMapStatement, key: string) => (
    <div key={key} className="type-map-example">
      {page(statement.subjectId, statement.subjectTitle)} <em>{relationship.verb}</em> {page(statement.objectId, statement.objectTitle)}
      {statement.detail && <span className="type-map-count"> ({statement.detail})</span>}
    </div>
  );

  const file = async () => {
    if (!writer) return;
    setFiling('busy');
    const text = requestText(relationship, from?.name ?? relationship.from, lower(toPlural), rangeNames, t);
    try {
      await createProposalRequest({ ...writer, now: () => new Date() }, { title: text.title, request: text.body.join('\n'), healthCheck: requestId }, globalThis.crypto.randomUUID());
      setFiling('filed');
    } catch (error) {
      console.error('[type map] filing a proposal request failed', error);
      setFiling('failed');
    }
  };

  return (
    <div className="type-map-relationship-panel" data-relationship-id={relationship.id}>
      <div className="type-map-sentence">
        {from && <TypeBadge type={from} tone={zoneTone.get(from.zone) ?? 0} />}<b>{fromPlural}</b>
        <span className="type-map-verb">{relationship.verb}</span>
        {to && <TypeBadge type={to} tone={zoneTone.get(to.zone) ?? 0} />}<b>{toPlural}</b>
      </div>
      {relationship.inverse && (
        <p>
          {t('type_map_relationship.other_way_intro', {
            toName: lower(to?.name ?? relationship.to),
          })}{' '}
          <b className="type-map-strong">{relationship.inverse}</b>{' '}
          {t('type_map_relationship.other_way_suffix', {
            fromPlural: lower(fromPlural),
            symmetric: relationship.symmetric ? t('type_map_relationship.symmetric') : '',
          })}
        </p>
      )}
      <StatusTag status={relationship.status} long={statusText(relationship, from?.name ?? relationship.from, t)} />
      <div className="type-map-stats">
        <Stat value={relationship.statements} label={t('type_map_relationship.statements')} />
        <Stat value={relationship.subjects} label={lower(fromPlural)} />
        <Stat value={relationship.objects} label={lower(toPlural)} />
      </div>
      {note && <p className="type-map-note">{note}</p>}

      {relationship.expectation && (
        <Section title={t('type_map_relationship.expectation')}>
          <BarRow label={relationship.expectation.min === 1
            ? t('type_map_relationship.with_one', { fromPlural })
            : t('type_map_relationship.with_many', { fromPlural, count: relationship.expectation.min })} value={relationship.expectation.met} of={relationship.expectation.total} text={`${relationship.expectation.met}/${relationship.expectation.total}`} />
          <p>
            {t('type_map_relationship.every_should_have', { typeName: lower(from?.name ?? relationship.from), count: relationship.expectation.min })}{' '}
            {relationship.expectation.missing.length === 0
              ? t('type_map_relationship.all_do')
              : t(relationship.expectation.missing.length === 1 ? 'type_map_relationship.missing_one' : 'type_map_relationship.missing_many', { count: relationship.expectation.missing.length })}{' '}
            {relationship.expectation.missing.length > 0 && (
              <button type="button" className="type-map-link" onClick={() => setShowMissing((shown) => !shown)}>{showMissing ? t('type_map_relationship.hide_missing') : t('type_map_relationship.show_missing')}</button>
            )}
          </p>
          {showMissing && (
            <div className="type-map-list">
              {relationship.expectation.missing.slice(0, LIST_LIMIT).map((missing) => <div key={missing.id} className="type-map-example">{page(missing.id, missing.title)}</div>)}
              {relationship.expectation.missing.length > LIST_LIMIT && <p>{t('type_map_relationship.more', { count: relationship.expectation.missing.length - LIST_LIMIT })}</p>}
            </div>
          )}
        </Section>
      )}

      {relationship.topTargets.length > 1 && (
        <Section title={t('type_map_relationship.most_linked', { toPlural: lower(toPlural) })}>
          {relationship.topTargets.map((target) => (
            <BarRow key={target.id} label={target.title} value={target.count} of={relationship.topTargets[0]!.count} text={String(target.count)} onClick={onOpenPage ? () => onOpenPage(target.id) : undefined} />
          ))}
        </Section>
      )}
      {relationship.list.length > 0 && (
        <Section title={showAll ? t('type_map_relationship.all_statements', { count: relationship.list.length }) : t('type_map_relationship.examples')}>
          {(showAll ? relationship.list.slice(0, LIST_LIMIT * 5) : relationship.list.slice(0, 3)).map((statement, i) => statementRow(statement, `${statement.claimId ?? statement.subjectId}:${i}`))}
        </Section>
      )}
      {relationship.status === 'declared-unused' && (
        <p className="type-map-note">{t('type_map_relationship.declared_unused_note', { fromPlural: lower(fromPlural), typeName: lower(from?.name ?? relationship.from) })}</p>
      )}

      <div className="type-map-actions">
        {canFile && (
          <button type="button" className="type-map-primary" disabled={requested || filing === 'busy'} onClick={() => void file()} title={t('type_map_relationship.file_proposal_title')}>
            {requested ? t('type_map_relationship.request_filed')
              : relationship.status === 'off-label' ? t('type_map_relationship.propose_declaring', { typeName: from?.name ?? relationship.from })
                : t('type_map_relationship.review_wrong')}
          </button>
        )}
        {relationship.list.length > 3 && (
          <button type="button" className={canFile ? '' : 'type-map-primary'} onClick={() => setShowAll((shown) => !shown)}>{showAll ? t('type_map_relationship.show_examples_only') : t('type_map_relationship.open_statements')}</button>
        )}
        <button type="button" onClick={() => onCenter({ kind: 'relationship', id: relationship.id })}>{t('type_map_relationship.center')}</button>
      </div>
      {filing === 'failed' && <p className="type-map-error">{t('type_map_relationship.request_failed')}</p>}
    </div>
  );
}
