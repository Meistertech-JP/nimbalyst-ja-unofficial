import type { StateTransition } from './trackerReferenceLifecycle';
type Translate = (key: string, values?: Record<string, string>) => string;
interface QuestionContext {
    type: string;
    position?: string | null;
    owner?: string | null;
}
export declare function transitionDisplayCopy(transition: StateTransition, t: Translate, context: QuestionContext): {
    label: string;
    description: string | undefined;
    prompt: {
        field: "whyNot" | "revisitWhen" | "supersededBy";
        label: string;
        placeholder: string;
        confirmLabel: string;
    } | undefined;
};
export {};
