// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { InlineFileDiff } from "../PrFileDiff";

afterEach(cleanup);

describe("InlineFileDiff", () => {
  it("renders a complete working-tree unified diff", async () => {
    const i18n = await createI18nInstance('en');
    const { container } = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <InlineFileDiff
          filePath="src/example.ts"
          status="modified"
          unifiedDiff={[
            "diff --git a/src/example.ts b/src/example.ts",
            "--- a/src/example.ts",
            "+++ b/src/example.ts",
            "@@ -1 +1 @@",
            "-const value = 1;",
            "+const value = 2;",
            "",
          ].join("\n")}
        />
      </UiLanguageProvider>,
    );

    expect(container.querySelector(".diff-code-delete")?.textContent).toBe(
      "const value = 1;"
    );
    expect(container.querySelector(".diff-code-insert")?.textContent).toBe(
      "const value = 2;"
    );
  });

  it("reports an empty text diff in Japanese without throwing", async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <InlineFileDiff filePath="image.png" status="modified" unifiedDiff="" />
      </UiLanguageProvider>,
    );

    screen.getByText("このファイルに表示できるテキスト変更はありません。");
  });
});
