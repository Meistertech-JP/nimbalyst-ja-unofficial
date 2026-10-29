/**
 * Return focus to the enclosing editor with its previous selection. The
 * context keeps Lexical out of menu hosts, and menu UI out of inline chips.
 * Without a provider, the menu restores the element previously holding focus.
 */
export declare const TrackerStateMenuFocusContext: import("react").Context<(() => void) | null>;
