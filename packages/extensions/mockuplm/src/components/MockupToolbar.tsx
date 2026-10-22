/**
 * Toolbar for the mockup preview: mode toggles (Select / Interactive /
 * Comment), theme, drawing, and screenshot.
 *
 * Extracted from MockupEditor so the editor keeps its state and effects and
 * this file keeps the markup. Mode exclusivity is decided by the editor, which
 * owns the state; this component only reports intent.
 */

import type { MockupSelection } from "@nimbalyst/runtime";
import { useTranslation } from "react-i18next";
import type { MockupTheme } from "../utils/themeEngine";

export interface MockupToolbarProps {
  fileName: string;

  isInteractive: boolean;
  onToggleInteractive: () => void;

  canComment: boolean;
  isCommentMode: boolean;
  onToggleCommentMode: () => void;

  selectedElement: MockupSelection | null;
  onDeselect: () => void;

  mockupTheme: MockupTheme;
  onToggleTheme: () => void;

  isDrawingMode: boolean;
  onToggleDrawing: () => void;
  drawingColor: string;
  onDrawingColorChange: (color: string) => void;
  onClearDrawing: () => void;

  isCapturing: boolean;
  onCaptureScreenshot: () => void;
}

export function MockupToolbar({
  fileName,
  isInteractive,
  onToggleInteractive,
  canComment,
  isCommentMode,
  onToggleCommentMode,
  selectedElement,
  onDeselect,
  mockupTheme,
  onToggleTheme,
  isDrawingMode,
  onToggleDrawing,
  drawingColor,
  onDrawingColorChange,
  onClearDrawing,
  isCapturing,
  onCaptureScreenshot,
}: MockupToolbarProps) {
  const { t } = useTranslation("extensions");
  return (
    <div className="mockup-toolbar px-4 py-2 border-b border-nim bg-nim-secondary flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm text-nim-muted">{fileName}</span>
        <button
          onClick={onToggleInteractive}
          className={`px-3 py-1 text-xs border rounded cursor-pointer ${
            isInteractive
              ? "bg-nim-primary text-nim-on-primary border-nim-primary font-bold"
              : "bg-nim border-nim text-nim font-normal"
          }`}
          title={
            isInteractive
              ? t("mockup_lm_ui.switch_to_select")
              : t("mockup_lm_ui.switch_to_interactive")
          }
        >
          {isInteractive ? t("mockup_lm_ui.interactive") : t("mockup_lm_ui.select")}
        </button>
        {selectedElement && (
          <div className="flex items-center gap-2 px-2 py-1 bg-[rgba(0,122,255,0.1)] rounded border border-[rgba(0,122,255,0.3)]">
            <span className="text-xs text-nim">
              {t("mockup_lm_ui.selected_element", { tagName: selectedElement.tagName })}
            </span>
            <button
              onClick={onDeselect}
              className="px-1.5 py-0.5 text-[11px] bg-transparent border border-nim rounded-sm text-nim cursor-pointer"
              title={t("mockup_lm_ui.deselect_element")}
            >
              {t("mockup_lm_ui.clear")}
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className="px-2 py-1 text-xs bg-nim border border-nim rounded text-nim cursor-pointer"
          title={
            mockupTheme === "dark"
              ? t("mockup_lm_ui.switch_to_light_theme")
              : t("mockup_lm_ui.switch_to_dark_theme")
          }
        >
          {mockupTheme === "dark" ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        {canComment && (
          <button
            onClick={onToggleCommentMode}
            className={`mockup-comment-mode-toggle px-3 py-1 text-xs border border-nim rounded cursor-pointer ${
              isCommentMode
                ? "bg-nim-primary text-nim-on-primary font-bold"
                : "bg-nim text-nim font-normal"
            }`}
            title={
              isCommentMode
                ? t("mockup_lm_ui.exit_comment_mode")
                : t("mockup_lm_ui.comment_on_mockup")
            }
            aria-pressed={isCommentMode}
          >
            {isCommentMode ? t("mockup_lm_ui.done_commenting") : t("mockup_lm_ui.comment")}
          </button>
        )}
        <button
          onClick={onToggleDrawing}
          className={`px-3 py-1 text-xs border border-nim rounded cursor-pointer ${
            isDrawingMode
              ? "bg-nim-primary text-nim-on-primary font-bold"
              : "bg-nim text-nim font-normal"
          }`}
          title={isDrawingMode ? t("mockup_lm_ui.exit_drawing_mode") : t("mockup_lm_ui.draw_annotations")}
        >
          {isDrawingMode ? t("mockup_lm_ui.done_drawing") : t("mockup_lm_ui.draw")}
        </button>
        {isDrawingMode && (
          <>
            <input
              type="color"
              value={drawingColor}
              onChange={(e) => onDrawingColorChange(e.target.value)}
              className="w-8 h-6 border border-nim rounded cursor-pointer"
              title={t("mockup_lm_ui.choose_drawing_color")}
            />
            <button
              onClick={onClearDrawing}
              className="px-3 py-1 text-xs bg-nim border border-nim rounded text-nim cursor-pointer"
              title={t("mockup_lm_ui.clear_drawings")}
            >
              {t("mockup_lm_ui.clear")}
            </button>
          </>
        )}
        <button
          onClick={onCaptureScreenshot}
          disabled={isCapturing}
          className={`px-3 py-1 text-xs bg-nim border border-nim rounded text-nim ${
            isCapturing ? "cursor-wait opacity-60" : "cursor-pointer opacity-100"
          }`}
          title={t("mockup_lm_ui.capture_screenshot_title")}
        >
          {isCapturing ? t("mockup_lm_ui.capturing") : t("mockup_lm_ui.screenshot")}
        </button>
      </div>
    </div>
  );
}
