/**
 * Inline composer for a pin that has been placed but not yet committed.
 *
 * The draft is not a pin. Nothing is written until `onSubmit` is called with
 * a non-empty body -- Escape, an outside click, and an empty submit all
 * discard, so an abandoned composer leaves no pin behind for teammates.
 */

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  type ReferenceType,
} from "@floating-ui/react";

export interface MockupCommentComposerProps {
  /** Anchor point in viewport coordinates. */
  anchor: { x: number; y: number };
  authorName: string;
  onSubmit: (body: string) => void;
  onDiscard: () => void;
}

export function MockupCommentComposer({
  anchor,
  authorName,
  onSubmit,
  onDiscard,
}: MockupCommentComposerProps) {
  const { t } = useTranslation("extensions");
  const [body, setBody] = useState("");
  const bodyRef = useRef(body);
  bodyRef.current = body;

  // Virtual anchor: the pin point has no DOM node of its own until the thread
  // exists, and hand-computing `position: fixed` here would break at the
  // viewport edges that flip/shift exist to handle.
  const virtualReference = useMemo<ReferenceType>(
    () => ({
      getBoundingClientRect: () => ({
        x: anchor.x,
        y: anchor.y,
        left: anchor.x,
        top: anchor.y,
        right: anchor.x,
        bottom: anchor.y,
        width: 0,
        height: 0,
      }),
    }),
    [anchor.x, anchor.y]
  );

  const { refs, floatingStyles, context } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) onDiscard();
    },
    placement: "bottom-start",
    middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  useLayoutEffect(() => {
    refs.setPositionReference(virtualReference);
  }, [refs, virtualReference]);

  const { getFloatingProps } = useInteractions([
    useDismiss(context, { escapeKey: true, outsidePress: true }),
    useRole(context, { role: "dialog" }),
  ]);

  const submit = (): void => {
    const trimmed = bodyRef.current.trim();
    if (!trimmed) {
      onDiscard();
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        {...getFloatingProps({
          className:
            "mockup-comment-composer w-72 rounded-md border border-nim bg-nim-secondary p-2 shadow-lg",
          style: { ...floatingStyles, zIndex: 2000 },
        })}
      >
        <textarea
          autoFocus
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder={t("mockup_lm_ui.comment_as", { authorName })}
          aria-label={t("mockup_lm_ui.new_comment")}
          className="mockup-comment-composer-input w-full resize-none rounded border border-nim bg-nim p-2 text-xs text-nim outline-none select-text"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded border border-nim bg-nim px-2 py-1 text-xs text-nim cursor-pointer"
          >
            {t("mockup_lm_ui.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!body.trim()}
            className={`rounded border border-nim-primary bg-nim-primary px-2 py-1 text-xs text-nim-on-primary ${
              body.trim() ? "cursor-pointer opacity-100" : "cursor-default opacity-50"
            }`}
          >
            {t("mockup_lm_ui.comment")}
          </button>
        </div>
      </div>
    </FloatingPortal>
  );
}
