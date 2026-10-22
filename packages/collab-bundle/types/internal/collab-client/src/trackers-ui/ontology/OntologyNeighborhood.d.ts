import { type DomainModel } from './ontologyDomain';
import type { OpenCategory } from './OntologyParts';
/** The category and its direct neighbors, for the top of a detail page. */
export declare function OntologyNeighborhood({ model, categoryId, onOpen, onOpenGap }: {
    model: DomainModel;
    categoryId: string;
    onOpen: OpenCategory;
    onOpenGap: (gapId: string) => void;
}): import("react").JSX.Element | null;
