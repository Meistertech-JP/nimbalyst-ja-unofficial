// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMainI18nController } from '../../i18n/mainI18n';

type PdfRequest = {
  html: string;
  outputPath: string;
  margins?: Electron.PrintToPDFOptions['margins'];
};
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, options: PdfRequest) => Promise<unknown>>(),
  printToPDF: vi.fn<(options: Electron.PrintToPDFOptions) => Promise<Buffer>>(),
  writeFile: vi.fn(),
  loadURL: vi.fn(),
  close: vi.fn(),
  showSaveDialog: vi.fn(),
  getSession: vi.fn(),
  loadViewMessages: vi.fn(),
}));
vi.mock('electron', () => ({
  BrowserWindow: class {
    static fromWebContents() { return null; }
    webContents = { printToPDF: mocks.printToPDF };
    loadURL = mocks.loadURL;
    close = mocks.close;
    isDestroyed = () => false;
  },
  dialog: { showSaveDialog: mocks.showSaveDialog },
  clipboard: {},
}));
vi.mock('fs/promises', () => ({ writeFile: mocks.writeFile }));
vi.mock('../../utils/ipcRegistry', () => ({
  safeHandle: (channel: string, handler: (event: unknown, options: PdfRequest) => Promise<unknown>) => {
    mocks.handlers.set(channel, handler);
  },
}));
vi.mock('../../utils/logger', () => ({ logger: { file: { info: vi.fn(), error: vi.fn() } } }));
vi.mock('../../services/analytics/AnalyticsService', () => ({ AnalyticsService: {} }));
vi.mock('@nimbalyst/runtime/storage/repositories/AISessionsRepository', () => ({ AISessionsRepository: { get: mocks.getSession } }));
vi.mock('../../services/SessionHtmlExporter', () => ({ exportSessionToHtml: vi.fn(), getExportFilename: vi.fn() }));
vi.mock('../../utils/transcriptHelpers', () => ({ loadViewMessages: mocks.loadViewMessages }));
vi.mock('../../utils/dialogPaths', () => ({ getDialogDefaultPath: vi.fn(), rememberDialogSelection: vi.fn() }));
vi.mock('../../services/AnimationGifRecorder', () => ({ recordAnimationGif: vi.fn() }));
vi.mock('../../services/AnimationVideoRecorder', () => ({ recordAnimationVideo: vi.fn() }));

import { registerExportHandlers } from '../ExportHandlers';

const pdfBuffer = Buffer.from('%PDF-export-regression');
const request = { html: '<p>Export</p>', outputPath: '/unused/pdf-export.pdf' };

async function exportPdf(margins?: Electron.PrintToPDFOptions['margins']) {
  const pending = mocks.handlers.get('export:htmlToPdf')!({}, { ...request, margins });
  await vi.advanceTimersByTimeAsync(500);
  return pending;
}

describe('PDF export margins', () => {
  it('localizes HTML session save options without changing the file extension or canceled result', async () => {
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    mocks.getSession.mockResolvedValue({ id: 'fixture', provider: 'claude-code', createdAt: 0, updatedAt: 0, title: 'Fixture' });
    mocks.loadViewMessages.mockResolvedValue({ success: true, messages: [] });
    mocks.showSaveDialog.mockResolvedValue({ canceled: true });
    const handler = mocks.handlers.get('export:sessionToHtml')! as any;
    try {
      expect(await handler({ sender: {} }, { sessionId: 'fixture' })).toEqual({ success: false, error: 'Export cancelled' });
      expect(mocks.showSaveDialog).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'セッションをHTMLにエクスポート', buttonLabel: 'エクスポート', filters: [{ name: 'HTMLファイル', extensions: ['html'] }] }));
      expect(mocks.writeFile).not.toHaveBeenCalled();
    } finally { controller.dispose(); }
  });
  it('passes localized native save options while retaining PDF filters and cancellation', async () => {
    const controller = await createMainI18nController({ get: () => 'ja', subscribe: () => () => undefined }, 'en-US', () => undefined);
    mocks.showSaveDialog.mockResolvedValue({ canceled: true });
    try {
      const handler = mocks.handlers.get('export:showSaveDialogPdf')!;
      expect(await handler({ sender: {} }, {} as PdfRequest)).toBeNull();
      expect(mocks.showSaveDialog).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'PDFにエクスポート', buttonLabel: 'エクスポート', filters: [{ name: 'PDFファイル', extensions: ['pdf'] }] }));
      await controller.i18n.changeLanguage('en');
      await handler({ sender: {} }, {} as PdfRequest);
      expect(mocks.showSaveDialog).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Export to PDF', buttonLabel: 'Export', filters: [{ name: 'PDF Files', extensions: ['pdf'] }] }));
    } finally { controller.dispose(); }
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.handlers.clear();
    mocks.printToPDF.mockResolvedValue(pdfBuffer);
    mocks.loadURL.mockResolvedValue(undefined);
    registerExportHandlers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    { label: 'Electron defaults when margins are absent', input: undefined, expected: undefined },
    { label: 'existing custom defaults for an empty input', input: {}, expected: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } },
    { label: 'partial inch values including zero', input: { top: 0, left: 0.75 }, expected: { top: 0, bottom: 0.4, left: 0.75, right: 0.4 } },
    { label: 'all custom inch values', input: { top: 0.5, bottom: 1.25, left: 0, right: 2 }, expected: { top: 0.5, bottom: 1.25, left: 0, right: 2 } },
  ])('uses $label without printer-only marginType', async ({ input, expected }) => {
    expect(await exportPdf(input)).toEqual({ success: true });
    expect(mocks.printToPDF).toHaveBeenCalledOnce();
    expect(mocks.printToPDF.mock.calls[0][0].margins).toEqual(expected);
    expect(mocks.writeFile).toHaveBeenCalledWith(request.outputPath, pdfBuffer);
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
