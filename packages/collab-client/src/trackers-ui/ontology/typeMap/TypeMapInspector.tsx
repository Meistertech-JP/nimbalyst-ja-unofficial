/**
 * The panel beside the map: an overview with nothing selected, a type's panel,
 * or a relationship's (`TypeMapRelationshipPanel`).
 */
import type { TypeMapModel, TypeMapRelationship, TypeMapType } from '../ontologyLabelMap';
import type { MapSelection } from './TypeMapCanvas';
import { BarRow, Section, Stat, StatusTag, TypeBadge, lower } from './TypeMapParts';
import { TypeMapRelationshipPanel, type RelationshipActions } from './TypeMapRelationshipPanel';
import { useTranslation } from '@nimbalyst/i18n/react';

export interface TypeMapInspectorProps extends RelationshipActions {
  model: TypeMapModel;
  typeById: ReadonlyMap<string, TypeMapType>;
  /** The relationships the map currently shows (toggles applied). */
  relationships: readonly TypeMapRelationship[];
  zoneTone: ReadonlyMap<string, number>;
  selection: MapSelection;
  /** Select and fly to. */
  onPick: (selection: NonNullable<MapSelection>) => void;
  onCenter: (selection: NonNullable<MapSelection>) => void;
  onOpenLabel: (id: string) => void;
  onOpenUnlabeled?: () => void;
}

export function TypeMapInspector(props: TypeMapInspectorProps) {
  const { t } = useTranslation('tracker', { keyPrefix: 'type_map_inspector' });
  const { selection, typeById, model } = props;
  const type = selection?.kind === 'type' ? typeById.get(selection.id) : undefined;
  const relationship = selection?.kind === 'relationship' ? model.relationships.find((entry) => entry.id === selection.id) : undefined;
  return (
    <aside className="type-map-inspector select-text" aria-label={t('details')} data-testid="type-map-inspector">
      {type ? <TypePanel {...props} type={type} />
        : relationship ? <TypeMapRelationshipPanel {...props} relationship={relationship} />
          : <Overview {...props} />}
    </aside>
  );
}

function RelationshipRow({ relationship, typeById, zoneTone, side, onPick }: {
  relationship: TypeMapRelationship;
  typeById: ReadonlyMap<string, TypeMapType>;
  zoneTone: ReadonlyMap<string, number>;
  /** `out`: this type is the subject; `in`: the object; `both`: name both ends. */
  side: 'out' | 'in' | 'both';
  onPick: (selection: NonNullable<MapSelection>) => void;
}) {
  const from = typeById.get(relationship.from);
  const to = typeById.get(relationship.to);
  const badgeType = side === 'out' ? to : from;
  return (
    <button type="button" className="type-map-row" onClick={() => onPick({ kind: 'relationship', id: relationship.id })}>
      {badgeType && <TypeBadge type={badgeType} tone={zoneTone.get(badgeType.zone) ?? 0} />}
      <span className="type-map-row-text">
        {side !== 'out' && <>{from?.plural ?? relationship.from} </>}
        <span className="type-map-verb">{relationship.verb}</span>
        {side !== 'in' && <> {to?.plural ?? relationship.to}</>}
      </span>
      {relationship.status !== 'declared-used' && <StatusTag status={relationship.status} />}
      <span className="type-map-count">{relationship.statements || ''}</span>
    </button>
  );
}

function Overview({ model, relationships, typeById, zoneTone, onPick, onOpenLabel, onOpenUnlabeled }: TypeMapInspectorProps) {
  const { t } = useTranslation('tracker', { keyPrefix: 'type_map_inspector' });
  const used = relationships.filter((relationship) => relationship.statements > 0);
  const unused = model.relationships.filter((relationship) => relationship.statements === 0).length;
  const statements = used.reduce((sum, relationship) => sum + relationship.statements, 0);
  const decisions = model.relationships.filter((relationship) => relationship.statements > 0 && (relationship.status === 'off-label' || relationship.status === 'range-violation'));
  return (
    <div className="type-map-overview">
      <h2>{t('all_types')}</h2>
      <p>
        {t('types_summary', { typeCount: model.types.length, domainCount: model.zones.length, domainLabel: model.zones.length === 1 ? t('domain') : t('domains') })}
        {t('links_summary', { statementCount: statements, relationshipCount: used.length, relationshipLabel: used.length === 1 ? t('relationship') : t('relationships') })}
        {unused ? t(unused === 1 ? 'unused_one' : 'unused_other', { count: unused }) : '.'}
      </p>
      {used.length > 0 && (
        <Section title={t('most_used_relationships')}>
          <div className="type-map-list">
            {used.slice(0, 6).map((relationship) => <RelationshipRow key={relationship.id} relationship={relationship} typeById={typeById} zoneTone={zoneTone} side="both" onPick={onPick} />)}
          </div>
        </Section>
      )}
      {decisions.length > 0 && (
        <Section title={t('needs_decision')}>
          <div className="type-map-list">
            {decisions.map((relationship) => <RelationshipRow key={relationship.id} relationship={relationship} typeById={typeById} zoneTone={zoneTone} side="both" onPick={onPick} />)}
          </div>
        </Section>
      )}
      <Section title={t('key')}>
        <div className="type-map-legend">
          <span><i data-style="used" data-thick="true" />{t('legend_declared_used')}</span>
          <span><i data-style="unused" />{t('legend_declared_unused')}</span>
          <span><i data-style="off-label" />{t('legend_off_label')}</span>
          <span><i data-style="violation" />{t('legend_range_violation')}</span>
        </div>
      </Section>
      {(model.structure.length > 0 || (onOpenUnlabeled && model.unlabeled > 0)) && (
        <Section title={t('page_structure_triage')}>
          <div className="type-map-list">
            {model.structure.map((entry) => (
              <button key={entry.id} type="button" className="type-map-row" onClick={() => onOpenLabel(entry.id)}>
                <span className="type-map-row-text">{entry.plural}</span><span className="type-map-count">{entry.count}</span>
              </button>
            ))}
            {onOpenUnlabeled && model.unlabeled > 0 && (
              <button type="button" className="type-map-row type-map-unlabeled" onClick={onOpenUnlabeled}>
                <span className="type-map-row-text">{t('unlabeled_pages')}</span><span className="type-map-count">{model.unlabeled}</span>
              </button>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function TypePanel({ type, relationships, typeById, zoneTone, onPick, onCenter, onOpenLabel }: TypeMapInspectorProps & { type: TypeMapType }) {
  const { t } = useTranslation('tracker', { keyPrefix: 'type_map_inspector' });
  const out = relationships.filter((relationship) => relationship.from === type.id);
  const into = relationships.filter((relationship) => relationship.to === type.id && relationship.from !== type.id);
  const total = (list: readonly TypeMapRelationship[]) => list.reduce((sum, relationship) => sum + relationship.statements, 0);
  return (
    <div className="type-map-type-panel" data-type-id={type.id}>
      <h2><TypeBadge type={type} tone={zoneTone.get(type.zone) ?? 0} />{type.plural}</h2>
      <p>
        {type.description}
        {type.broader.length > 0 && ` ${t('kind_of', { names: type.broader.join(', ') })}`}
        {!type.declared && ` ${t('undeclared_type')}`}
      </p>
      <div className="type-map-stats">
        <Stat value={type.count} label={type.count === 1 ? t('page') : t('pages')} />
        <Stat value={total(out)} label={t('links_out')} />
        <Stat value={total(into)} label={t('links_in')} />
      </div>
      {type.properties.length > 0 && (
        <Section title={t('how_complete')}>
          {type.properties.map((property) => (
            <BarRow key={property.id} label={property.name} value={property.filled} of={type.count} text={type.count ? `${property.filled}/${type.count}` : '-'} />
          ))}
        </Section>
      )}
      <Section title={t('links_to')}>
        <div className="type-map-list">
          {out.length ? out.map((relationship) => <RelationshipRow key={relationship.id} relationship={relationship} typeById={typeById} zoneTone={zoneTone} side="out" onPick={onPick} />) : <p>{t('nothing_yet')}</p>}
        </div>
      </Section>
      <Section title={t('linked_from')}>
        <div className="type-map-list">
          {into.length ? into.map((relationship) => <RelationshipRow key={relationship.id} relationship={relationship} typeById={typeById} zoneTone={zoneTone} side="in" onPick={onPick} />) : <p>{t('nothing_yet')}</p>}
        </div>
      </Section>
      <div className="type-map-actions">
        <button type="button" className="type-map-primary" onClick={() => onOpenLabel(type.id)}>{t('open_table', { name: lower(type.plural) })}</button>
        <button type="button" onClick={() => onCenter({ kind: 'type', id: type.id })}>{t('center')}</button>
      </div>
    </div>
  );
}
