// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { KeyboardShortcuts } from "../../../../shared/KeyboardShortcuts";

const tutorialRoot = fileURLToPath(
  new URL("../../../../../resources/tutorial-project/", import.meta.url)
);
const readmePath = resolve(tutorialRoot, "README.md");

function collectShortcutValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap(collectShortcutValues);
}

describe("tutorial project content", () => {
  it('keeps Japanese sample links, data calculations and diagram relationships intact', () => {
    const japaneseRoot = resolve(tutorialRoot, '../tutorial-project-ja');
    const readme = readFileSync(resolve(japaneseRoot, 'README.md'), 'utf8');
    expect(readme).toContain('# Nimbalystへようこそ');
    expect(readme).toContain('nimbalyst://{{TRACKER_ISSUE_KEY:EXAMPLE_BUG}}');
    for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split(' ')[0];
      if (!/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('#')) {
        expect(statSync(resolve(japaneseRoot, target)).isFile(), target).toBe(true);
      }
    }
    const csvRows = (root: string) => readFileSync(resolve(root, 'revenue.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(row => row.split(',').slice(1));
    expect(csvRows(japaneseRoot)).toEqual(csvRows(tutorialRoot));
    expect(readFileSync(resolve(japaneseRoot, 'revenue.csv'), 'utf8').split(/\r?\n/)[0]).toBe('月,新規顧客数,継続売上,拡張売上,解約売上,売上合計');
    const calculations = (root: string) => readFileSync(resolve(root, 'metrics.calc.md'), 'utf8').split(/\r?\n/).filter(line => /^\w+\s*=|^assert /.test(line));
    expect(calculations(japaneseRoot)).toEqual(calculations(tutorialRoot));
    const englishDiagram = JSON.parse(readFileSync(resolve(tutorialRoot, 'architecture.excalidraw'), 'utf8'));
    const japaneseDiagram = JSON.parse(readFileSync(resolve(japaneseRoot, 'architecture.excalidraw'), 'utf8'));
    expect(japaneseDiagram.elements.map((element: any) => ({ ...element, text: undefined, originalText: undefined })))
      .toEqual(englishDiagram.elements.map((element: any) => ({ ...element, text: undefined, originalText: undefined })));
    expect(japaneseDiagram.elements.filter((element: any) => element.type === 'text').every((element: any) => /[\u3040-\u9fff]/.test(element.text))).toBe(true);
    const mockup = readFileSync(resolve(japaneseRoot, 'dashboard.mockup.html'), 'utf8');
    expect(mockup).toContain('<html lang="ja">');
    expect(mockup).toContain('<h1>売上の概要</h1>');
    expect(mockup).toContain('aria-label="主要指標"');
    expect(mockup).not.toContain('>Revenue overview<');
    const plan = readFileSync(resolve(japaneseRoot, 'planning/plan-tutorial-walkthrough.md'), 'utf8');
    expect(plan).toContain('planId: plan-tutorial-walkthrough');
    expect(plan).toContain('status: in-development');
    expect(plan).toContain('title: チュートリアルの実施計画');
    for (const file of readdirSync(resolve(tutorialRoot, 'sessions'))) {
      const english = JSON.parse(readFileSync(resolve(tutorialRoot, 'sessions', file), 'utf8'));
      const japanese = JSON.parse(readFileSync(resolve(japaneseRoot, 'sessions', file), 'utf8'));
      expect(japanese.session.provider).toBe(english.session.provider);
      expect(japanese.session.model).toBe(english.session.model);
      expect(japanese.session.metadata).toEqual(english.session.metadata);
      expect(japanese.messages.map(({ content: _content, ...envelope }: any) => envelope))
        .toEqual(english.messages.map(({ content: _content, ...envelope }: any) => envelope));
      const placeholders = (fixture: any) => JSON.stringify(fixture).match(/\{\{[^}]+\}\}/g)?.sort();
      expect(placeholders(japanese)).toEqual(placeholders(english));
      expect(japanese.key).toBe(file.startsWith('01-') ? 'DRAFT_THE_PRODUCT_BRIEF' : 'TRIAGE_THE_LAUNCH_BUG');
      if (file.startsWith('02-')) {
        const assistantText = japanese.messages
          .map(({ content }: any) => JSON.parse(content))
          .flatMap((payload: any) => payload.message?.content ?? [])
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');
        expect(assistantText).toContain('[製品概要](product-brief.md)');
        expect(assistantText).not.toContain('[product-brief.md]');
      }
      const toolCalls = (fixture: any) => fixture.messages.flatMap((message: any) => {
        const payload = JSON.parse(message.content);
        return payload.type === 'nimbalyst_tool_use' ? [{ id: payload.id, name: payload.name }]
          : (payload.message?.content ?? []).filter((block: any) => block.type === 'tool_use').map((block: any) => ({ id: block.id, name: block.name }));
      });
      expect(toolCalls(japanese)).toEqual(toolCalls(english));
    }
  });
  it("keeps the sample file tree flat except for the walkthrough plan", () => {
    const entries = readdirSync(tutorialRoot, { withFileTypes: true })
      .filter((entry) => entry.name !== "sessions")
      .filter((entry) => entry.name !== "trackers.json");
    const directories = entries.filter((entry) => entry.isDirectory());

    expect(directories.map((entry) => entry.name)).toEqual(["planning"]);
    expect(readdirSync(resolve(tutorialRoot, "planning"))).toEqual([
      "plan-tutorial-walkthrough.md",
    ]);
    expect(existsSync(resolve(tutorialRoot, "bug-example.md"))).toBe(false);
  });

  it("contains the current intro and What to try prompts", () => {
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toContain(
      "Open the files, change some text, prompt and interact with the agent , follow a tracker reference"
    );
    expect(readme).toContain(
      "Type in this document. Try typing  / and # and @"
    );
    expect(readme).toContain("Ask the agent to make changes to the mockup");
    expect(readme).toContain(
      "Go to tracker mode (the third icon from the top on the left nav) and explore integrated trackers"
    );
    expect(readme).toContain(
      "[example bug](nimbalyst://{{TRACKER_ISSUE_KEY:EXAMPLE_BUG}})"
    );
  });

  it("keeps README file links and documented keyboard shortcuts valid", () => {
    const readme = readFileSync(readmePath, "utf8");
    const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
    const relativeTargets = Array.from(readme.matchAll(markdownLinkPattern))
      .map((match) => match[1].trim().match(/^<?([^>\s]+)>?/)?.[1])
      .filter((target): target is string => Boolean(target))
      .filter((target) => !target.startsWith("#"))
      .filter((target) => !/^[a-z][a-z0-9+.-]*:/i.test(target));

    expect(relativeTargets.length).toBeGreaterThan(0);
    for (const target of relativeTargets) {
      const linkedPath = resolve(tutorialRoot, decodeURIComponent(target));
      const templateRelativePath = relative(tutorialRoot, linkedPath);
      const leavesTemplate =
        templateRelativePath === ".." ||
        templateRelativePath.startsWith(`..${sep}`) ||
        isAbsolute(templateRelativePath);
      expect(
        leavesTemplate,
        `README link leaves the tutorial template: ${target}`
      ).toBe(false);
      expect(
        existsSync(linkedPath),
        `README link does not resolve to a file: ${target}`
      ).toBe(true);
      expect(statSync(linkedPath).isFile()).toBe(true);
    }

    const shortcutSection = readme.match(
      /## Keyboard shortcuts\r?\n([\s\S]*?)(?:\r?\n## |\s*$)/
    )?.[1];
    expect(shortcutSection).toBeDefined();

    const documentedShortcuts = shortcutSection!
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .filter((line) => !line.includes("| ---"))
      .slice(1)
      .map((line) => line.split("|")[2]?.trim().replace(/`/g, ""))
      .filter((shortcut): shortcut is string => Boolean(shortcut));
    const appShortcuts = new Set(collectShortcutValues(KeyboardShortcuts));

    expect(documentedShortcuts.length).toBeGreaterThan(0);
    for (const shortcut of documentedShortcuts) {
      expect(
        appShortcuts.has(shortcut),
        `README shortcut is not defined in KeyboardShortcuts.ts: ${shortcut}`
      ).toBe(true);
    }
  });
});
