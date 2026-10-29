/**
 * The words the ontology inspector's domain model speaks: category copy, verbs
 * for relationship fields and predicates, and the small formatters every view
 * shares. Split from `ontologyDomain.ts`, which decides what is true; this only
 * decides how it reads.
 */
import { ENTITY_TYPE, CLAIM_TYPE } from './ontologyKnowledge';
import { ontologyRecordTitle, type OntologyRecordLike } from './ontologyRecords';
import type { DomainModel, MemberCell } from './ontologyDomain';
import { buildDisplaySummary } from './ontologyDomainSummary';

/** Provenance for product copy only. User strings are values, never lookup keys. */
export interface DisplayCopy {
  key: string;
  english: string;
  values?: Record<string, string | number>;
}
export const displayCopy = (key: string, english: string, values?: DisplayCopy['values']): DisplayCopy => ({ key, english, values });

// Exact built-in option identities. Overrides, unknown values and other fields
// remain schema-owned, even when their text resembles a product status.
const BUILT_IN_STATUSES: Record<string, Record<string, string>> = {
  bug: { 'to-do': 'To Do', 'in-progress': 'In Progress', 'in-review': 'In Review', 'changes-requested': 'Changes Requested', approved: 'Approved', done: 'Done', 'wont-do': "Won't Do", duplicate: 'Duplicate' },
  decision: { 'to-do': 'To Decide', 'in-progress': 'Evaluating', decided: 'Decided', implemented: 'Implemented' },
  plan: { draft: 'Draft', 'ready-for-development': 'Ready', 'in-development': 'In Development', 'in-review': 'In Review', 'changes-requested': 'Changes Requested', approved: 'Approved', completed: 'Completed', rejected: 'Rejected', blocked: 'Blocked' },
};

export function productStatusCopy(type: string, field: string, value: unknown, label: string): DisplayCopy | undefined {
  return field === 'status' && typeof value === 'string' && BUILT_IN_STATUSES[type]?.[value] === label
    ? displayCopy(`statuses.${type}.${value}`, label) : undefined;
}

/** Called only for product-owned verbs at their producer, not for schema labels. */
export function productVerbCopy(verb: string): DisplayCopy | undefined {
  return verb ? displayCopy(`verbs.${verb.replace(/[^a-z]+/g, '_').replace(/_$/, '')}`, verb) : undefined;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** A disposable display projection; raw domain text remains authoritative for requests. */
export function displayDomainModel(model: DomainModel, language: string | undefined, t: Translate): DomainModel {
  if (!language || language.startsWith('en')) return model;
  const tr = (key: string, english: string, values?: Record<string, unknown>) => t(`ontology_domain_display.${key}`, { ...values, defaultValue: english });
  const copy = (value: DisplayCopy | undefined, raw: string) => value ? tr(value.key, raw, value.values) : raw;
  const us = model.categories.find(category => category.us)?.name ?? 'us';
  const categoryName = (id: string, raw: string) => model.categories.find(category => category.id === id)?.displayBuiltIn && id !== 'us'
    ? tr(`categories.${id}.name`, raw) : raw;
  const cell = (value: MemberCell): MemberCell => {
    if (value.displayParts) return { ...value, text: value.displayParts.map(part => copy(part.displayCopy, part.text)).join('') };
    if (value.displayFact) {
      const fact = value.displayFact;
      const date = fact.asOf?.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
      const asOf = date ? tr('date.year', date[1]!, { year: date[1] })
        + (fact.precision !== 'year' && date[2] ? tr('date.month', date[2], { month: Number(date[2]) }) : '')
        + (fact.precision !== 'year' && fact.precision !== 'month' && date[3] ? tr('date.day', date[3], { day: Number(date[3]) }) : '')
        : tr('cells.undated', 'undated');
      return { ...value, text: `${fact.value} · ${asOf}${fact.state === 'current' ? '' : ` (${tr(`cells.${fact.state}`, fact.state)})`}` };
    }
    return { ...value, text: copy(value.displayCopy, value.text) };
  };
  const categories = model.categories.map(category => ({
    ...category,
    name: categoryName(category.id, category.name),
    singular: categoryName(category.id, category.singular),
    role: category.displayBuiltIn ? category.countLabel === 'open'
      ? tr('role_counts', category.role, { total: category.total, count: category.count })
      : tr(`categories.${category.id}.role`, category.role, { us }) : category.role,
    blurb: category.displayBuiltIn ? tr(`categories.${category.id}.blurb`, category.blurb, { us }) : category.blurb,
    countLabel: category.countLabel === 'open' ? tr('open', 'open') : category.countLabel,
    example: category.displayExampleParts
      ? category.displayExampleParts.map(part => copy(part.displayCopy, part.text)).join('')
      : copy(category.displayExample, category.example),
    note: category.note ? copy(category.displayNote, category.note) : null,
    lines: category.lines.map(line => ({ ...line, verb: copy(line.displayVerb, line.verb), via: copy(line.displayVia, line.via) })),
    schema: category.schema ? {
      stored: category.schema.stored.map(part => ({ ...part, text: copy(part.displayCopy, part.text) })),
      rows: category.schema.rows.map(row => ({ ...row, label: copy(row.displayCopy, row.label) })),
    } : null,
    table: {
      ...category.table,
      openable: category.table.openable ?? category.table.columns[0] !== 'Recorded',
      columns: category.table.columns.map((column, index) => copy(category.table.displayColumns?.[index], column)),
      rows: category.table.rows.map(row => ({ ...row, cells: row.cells.map(cell) })),
    },
  }));
  const lineById = new Map(categories.flatMap(category => category.lines.map(line => [line.id, line] as const)));
  return {
    ...model, categories,
    groups: model.groups.map(group => ({ ...group, label: tr(`groups.${group.id}.label`, group.label), question: tr(`groups.${group.id}.question`, group.question, { us }) })),
    edges: model.edges.map(edge => ({ ...edge, verb: lineById.get(edge.id)?.verb ?? edge.verb })),
    also: model.also.map(chip => chip.id === 'type:competitor' ? { ...chip, name: tr('competitor_chip', chip.name) } : chip),
    summary: buildDisplaySummary(model.categories, categoryName, tr),
  };
}

export type DomainGroupId = 'market' | 'product' | 'customers' | 'work';
// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export interface CategoryCopy {
  id: string;
  name: string;
  singular: string;
  group: DomainGroupId;
  role: string;
  blurb: string;
}

export const GROUP_COPY: Record<DomainGroupId, { label: string; question: (us: string) => string }> = {
  market: { label: 'The market', question: () => 'Who else is out there, and where do they play?' },
  product: { label: 'Our product', question: (us) => `What ${us} can do and what it is built on` },
  customers: { label: 'Customers', question: () => 'Who uses and buys it' },
  work: { label: 'The work', question: () => 'What we are fixing, building, and deciding' },
};

export const KNOWLEDGE_COPY: Record<string, CategoryCopy> = {
  competitors: {
    id: 'competitors', name: 'Competitors', singular: 'competitor', group: 'market',
    role: 'Products that compete with {us}',
    blurb: 'Every product we record a "competes with" statement for, each with the market it competes in and a threat level. Not a page type: a product becomes a competitor when that statement exists.',
  },
  markets: {
    id: 'markets', name: 'Markets', singular: 'market', group: 'market',
    role: 'The spaces products compete in',
    blurb: 'A tree of market categories. A product can sit in several.',
  },
  organizations: {
    id: 'organizations', name: 'Companies', singular: 'company', group: 'market',
    role: 'Who makes the products',
    blurb: 'The companies behind products. Revenue, valuation, and headcount are dated, cited facts on the company.',
  },
  capabilities: {
    id: 'capabilities', name: 'Capabilities', singular: 'capability', group: 'product',
    role: 'What {us} can do, as the wiki describes it',
    blurb: 'Wiki pages for what the product does.',
  },
  technologies: {
    id: 'technologies', name: 'Technologies', singular: 'technology', group: 'product',
    role: 'What it is built on',
    blurb: 'Libraries, protocols, and infrastructure the product depends on, including ones we moved away from.',
  },
};

export const KIND_CATEGORY: Record<string, string> = {
  market: 'markets',
  organization: 'organizations',
  capability: 'capabilities',
  technology: 'technologies',
  protocol: 'technologies',
};

/** Work trackers with a place on the page. Every other type with items is a chip under "Also tracked". */
export const WORK_COPY: Record<string, CategoryCopy> = {
  'feature-module': { id: 'areas', name: 'Product areas', singular: 'product area', group: 'product', role: 'How the work is organized', blurb: 'The modules bugs, features, and decisions are filed against.' },
  'product-feature': { id: 'features', name: 'Features', singular: 'feature', group: 'product', role: 'What exists in the product, feature by feature', blurb: 'The fine-grained catalog of what the product can do.' },
  customer: { id: 'customers', name: 'Customers', singular: 'customer', group: 'customers', role: 'Companies and individuals using {us}', blurb: 'Who uses the product, from targets to teams with several users.' },
  user: { id: 'people', name: 'People', singular: 'person', group: 'customers', role: 'Individual users', blurb: 'Individual users and their activity, each tied to a customer.' },
  bug: { id: 'bugs', name: 'Bugs', singular: 'bug', group: 'work', role: 'Defects', blurb: 'Defects, filed against a product area when someone says which.' },
  decision: { id: 'decisions', name: 'Decisions', singular: 'decision', group: 'work', role: 'Choices the team made or is making', blurb: 'Choices the team made or is making, and what they affect.' },
  plan: { id: 'plans', name: 'Plans', singular: 'plan', group: 'work', role: 'Design and implementation plans', blurb: 'Design and implementation plans.' },
  goal: { id: 'goals', name: 'Goals', singular: 'goal', group: 'work', role: 'What the company is aiming for', blurb: 'Company-level goals.' },
};

export const PERSONA_COPY: CategoryCopy = {
  id: 'personas', name: 'Personas', singular: 'persona', group: 'customers',
  role: 'Kinds of buyer and user',
  blurb: 'Nothing records who your customers are as types of buyer, so you cannot ask which persona a capability serves or which one a competitor targets.',
};

/** The retired competitor tracker would otherwise read as a second "Competitors". */
export const TYPE_CHIP_NAMES: Record<string, string> = { competitor: 'Competitor tracker items' };

/** Types the knowledge categories already cover, or that are the inspector's own bookkeeping. */
export const HIDDEN_TYPES: ReadonlySet<string> = new Set([ENTITY_TYPE, CLAIM_TYPE, 'ontology-proposal']);

/** Verbs for relationship fields whose key alone reads badly. `type.field` -> plural present tense. */
export const FIELD_VERBS: Record<string, string> = {
  'bug.area': 'are filed against',
  'decision.area': 'are about',
  'user.company': 'work at',
  'customer.users': 'have',
  'customer.requestedFeatures': 'asked for',
  'product-feature.requestedByCustomers': 'were asked for by',
  'product-feature.modules': 'belong to',
  'product-feature.goal': 'serve',
  'plan.goal': 'serve',
  'goal.contributes': 'are served by',
  'feature-module.features': 'group',
  'feature-module.bugs': 'collect',
  'feature-module.decisions': 'are the subject of',
};

export const KEY_VERBS: Record<string, string> = {
  'child-of': 'belong to',
  'parent-of': 'include',
  'relates-to': 'relate to',
  'contributes-to': 'contribute to',
  'contributed-by': 'serve',
  blocks: 'block',
  'depends-on': 'depend on',
};

/** Knowledge predicates as verbs, read from the subject's end and the object's. */
export const PREDICATE_VERBS: Record<string, [string, string]> = {
  'in-market': ['sit in', 'include'],
  'made-by': ['are made by', 'make'],
  'competes-with': ['compete with', 'compete with'],
  requires: ['are built on', 'are used by'],
  'depends-on': ['depend on', 'are depended on by'],
  'component-of': ['are part of', 'are made of'],
  'implements-protocol': ['implement', 'are implemented by'],
  'inspired-by': ['are inspired by', 'inspired'],
  'integrates-with': ['integrate with', 'integrate with'],
};

export const BUILT_ON = ['requires', 'depends-on', 'implements-protocol'];
export const SIZE_FACTS = ['annual-revenue', 'funding-total', 'valuation', 'headcount'];
export const FACT_NOUNS: Record<string, [string, string]> = {
  'annual-revenue': ['revenue figure', 'revenue figures'],
  'funding-total': ['funding total', 'funding totals'],
  valuation: ['valuation', 'valuations'],
  'last-round': ['funding round', 'funding rounds'],
  headcount: ['headcount', 'headcounts'],
  lifecycle: ['"is active" status', '"is active" statuses'],
  pricing: ['price', 'prices'],
  users: ['user count', 'user counts'],
};
export const THREAT_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
export const INACTIVE_CLAIM: ReadonlySet<string> = new Set(['superseded', 'withdrawn']);
export const CLOSED_CATEGORIES: ReadonlySet<string> = new Set(['done', 'cancelled']);
export const NAME_LIST = 4;

export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

export function capitalize(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/** "sit in" -> "sits in", "are made by" -> "is made by": the verb after one subject. */
export function singularVerb(verb: string): string {
  if (verb.startsWith('are ')) return `is ${verb.slice(4)}`;
  if (verb.startsWith('have')) return `has${verb.slice(4)}`;
  if (verb.startsWith('were ')) return `was ${verb.slice(5)}`;
  const [first, ...rest] = verb.split(' ');
  const inflected = /(s|sh|ch|x)$/.test(first!) ? `${first}es` : `${first}s`;
  return [inflected, ...rest].join(' ');
}

/** "Aider, Paseo, CodexMonitor, and 9 more." */
export function nameList(records: readonly OntologyRecordLike[], limit = NAME_LIST): string {
  const names = records.slice(0, limit).map(ontologyRecordTitle);
  if (records.length <= limit) {
    if (names.length <= 1) return `${names.join('')}.`;
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`;
  }
  return `${names.join(', ')}, and ${records.length - limit} more.`;
}

export function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').toLowerCase();
}

export function fill(template: string, us: string): string {
  return template.replace(/\{us\}/g, us);
}
