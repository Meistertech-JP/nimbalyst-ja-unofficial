// @vitest-environment node
import * as path from "path";
import { describe, expect, it, vi } from "vitest";
import { createMainI18nController } from "../../../i18n/mainI18n";
import {
  seedTutorialTrackers,
  type SeededTutorialTracker,
} from "../TutorialTrackerSeeder";

const FIXTURE_PATH = path.resolve(
  __dirname,
  "../../../../../resources/tutorial-project/trackers.json"
);

const createResult = vi.hoisted(() => vi.fn());
vi.mock('../../../mcp/tools/trackerToolHandlers', () => ({ handleTrackerCreate: createResult }));

describe("seedTutorialTrackers", () => {
  it('localizes internally generated tracker creation errors in Japanese and English', async () => {
    const settings = { get: () => 'ja', subscribe: () => () => undefined };
    const controller = await createMainI18nController(settings, 'ja-JP', () => undefined);
    try {
      createResult.mockResolvedValue({ isError: true, content: [] });
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => FIXTURE_PATH }))
        .rejects.toThrow('チュートリアルのTracker項目を作成できませんでした: PLAN_DASHBOARD_REFINEMENT');
      createResult.mockResolvedValue({ isError: false, content: [] });
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => FIXTURE_PATH }))
        .rejects.toThrow('チュートリアルのTracker項目の作成結果がありません: PLAN_DASHBOARD_REFINEMENT');
      const nonArrayFixture = path.join(path.dirname(FIXTURE_PATH), 'architecture.excalidraw');
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => nonArrayFixture }))
        .rejects.toThrow(`チュートリアルのTrackerデータが空です: ${nonArrayFixture}`);
      createResult.mockResolvedValue({ isError: true, content: [{ type: 'text', text: 'external error detail' }] });
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => FIXTURE_PATH }))
        .rejects.toThrow('external error detail');
      await controller.i18n.changeLanguage('en');
      createResult.mockResolvedValue({ isError: true, content: [] });
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => FIXTURE_PATH }))
        .rejects.toThrow('Failed to create PLAN_DASHBOARD_REFINEMENT');
      createResult.mockResolvedValue({ isError: false, content: [] });
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => FIXTURE_PATH }))
        .rejects.toThrow('Tracker create returned no result for PLAN_DASHBOARD_REFINEMENT');
      await expect(seedTutorialTrackers('/tmp/Nimbalyst Tutorial', { getFixturePath: () => nonArrayFixture }))
        .rejects.toThrow(`Tutorial tracker fixture is empty: ${nonArrayFixture}`);
    } finally {
      controller.dispose();
    }
  });
  it('uses the captured Japanese template while preserving stable tracker identities and fields', async () => {
    const createdFixtures: any[] = [];
    const result = await seedTutorialTrackers('/tmp/Nimbalyst Tutorial', {
      getFixturePath: () => { throw new Error('Must not resolve another template'); },
      createTrackerItem: vi.fn(async (_workspace, fixture, id) => {
        createdFixtures.push(fixture);
        return { key: fixture.key, id, type: fixture.type, title: fixture.title };
      }),
    }, path.resolve(FIXTURE_PATH, '../../tutorial-project-ja'));
    expect(result).toHaveLength(11);
    expect(result.find(item => item.key === 'EXAMPLE_BUG')?.title).toBe('日付範囲を変更してもエクスポートが無効のままになる');
    expect(createdFixtures.find(item => item.key === 'EXAMPLE_BUG').description).toContain('## 再現手順');
    expect(createdFixtures.find(item => item.key === 'PLAN_DASHBOARD_REFINEMENT').fields).toEqual({ planId: 'tutorial-dashboard-refinement', planType: 'feature', progress: 60 });
    expect(createdFixtures.every(item => /[\u3040-\u9fff]/.test(item.title) && /[\u3040-\u9fff]/.test(item.description))).toBe(true);
  });
  it("creates the native tutorial items and exposes the example bug reference", async () => {
    const created: SeededTutorialTracker[] = [];

    const result = await seedTutorialTrackers("/tmp/Nimbalyst Tutorial", {
      getFixturePath: () => FIXTURE_PATH,
      createTrackerItem: vi.fn(async (_workspacePath, fixture, id) => {
        const item = {
          key: fixture.key,
          id,
          issueKey: `NIM-${created.length + 1}`,
          type: fixture.type,
          title: fixture.title,
        } satisfies SeededTutorialTracker;
        created.push(item);
        return item;
      }),
      deleteTrackerItem: vi.fn(async () => undefined),
    });

    expect(result).toHaveLength(11);
    expect(result.filter((item) => item.type === "plan")).toHaveLength(2);
    expect(result.filter((item) => item.type === "decision")).toHaveLength(3);
    expect(result.filter((item) => item.type === "bug")).toHaveLength(3);
    expect(result.filter((item) => item.type === "task")).toHaveLength(3);
    expect(result.find((item) => item.key === "EXAMPLE_BUG")).toMatchObject({
      issueKey: "NIM-6",
      type: "bug",
      title: "Export remains disabled after changing the date range",
    });
    expect(new Set(result.map((item) => item.id)).size).toBe(result.length);
  });

  it("removes already-created tracker rows when a later fixture fails", async () => {
    const deleteTrackerItem = vi.fn(async () => undefined);
    let calls = 0;

    await expect(
      seedTutorialTrackers("/tmp/Nimbalyst Tutorial", {
        getFixturePath: () => FIXTURE_PATH,
        createTrackerItem: vi.fn(async (_workspacePath, fixture, id) => {
          calls += 1;
          if (calls === 3) throw new Error("tracker store unavailable");
          return {
            key: fixture.key,
            id,
            issueKey: `NIM-${calls}`,
            type: fixture.type,
            title: fixture.title,
          };
        }),
        deleteTrackerItem,
      })
    ).rejects.toThrow("tracker store unavailable");

    expect(deleteTrackerItem).toHaveBeenCalledTimes(2);
  });
});
