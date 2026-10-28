import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
const render = (ui: React.ReactElement) => baseRender(ui, { wrapper: ({ children }) => <LexicalComposer initialConfig={{ namespace: 'embed-test', onError: error => { throw error; } }}>{children}</LexicalComposer> });
import { act, cleanup, render as baseRender, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getEmbedPluginCallbacks } from '@nimbalyst/runtime/editor/plugins/EmbedPlugin/EmbedPluginCallbacks';
import { registerBrowserDocumentEmbeds, setBrowserPlacedViewRenderer } from '../documentEmbeds';
import { AuthorDeviceReferenceChip } from '../authorDeviceReference';

describe('browser document embeds', () => {
  afterEach(cleanup);

  it('updates view and author-device guidance on language changes without translating user labels', async () => {
    const i18n = await createI18nInstance('ja');
    registerBrowserDocumentEmbeds();
    const Renderer = getEmbedPluginCallbacks().renderEmbed!;
    render(<I18nextProvider i18n={i18n}><Renderer src="https://console.nimbalyst.com/org/o1/project/p1/view/type/competitor" label="My view" attrs={{}} nodeKey="2" /><AuthorDeviceReferenceChip referenceKey="ABC-1" href="https://console.nimbalyst.com/app/item/ABC-1" /></I18nextProvider>);
    expect(screen.getByTestId('placed-view-unavailable').textContent).toContain('My view: このライブビュー');
    expect(screen.getByRole('link', { name: 'My viewを開く' })).toBeTruthy();
    expect(screen.getByTestId('tracker-reference-author-device').getAttribute('title')).toContain('作成者');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('link', { name: 'Open My view' })).toBeTruthy();
    expect(screen.getByTestId('tracker-reference-author-device').textContent).toContain("on the author's device");
  });

  it('says where a placed view can be seen instead of a broken document preview', () => {
    registerBrowserDocumentEmbeds();
    const Renderer = getEmbedPluginCallbacks().renderEmbed!;
    render(<Renderer src="nimbalyst://view/type/competitor" label="Competitors" attrs={{ mode: '2x2' }} nodeKey="1" />);
    expect(screen.getByTestId('placed-view-unavailable').textContent).toBe('Competitors: this live view shows in the Nimbalyst desktop app.');
  });

  it('offers a console view link as a link to its console page', () => {
    registerBrowserDocumentEmbeds();
    const Renderer = getEmbedPluginCallbacks().renderEmbed!;
    const href = 'https://console.nimbalyst.com/org/o1/project/p1/view/type/competitor';
    render(<Renderer src={href} label="Competitors" attrs={{}} nodeKey="2" />);
    expect(screen.getByRole('link', { name: 'Open Competitors' }).getAttribute('href')).toBe(href);
  });

  it('retains readable English preview fallback when the host provides no i18n instance', () => {
    registerBrowserDocumentEmbeds();
    const Renderer = getEmbedPluginCallbacks().renderEmbed!;
    render(<Renderer src="/example.mockup.html" label="My preview" attrs={{}} nodeKey="fallback" />);
    expect(screen.getByText('My preview: preview unavailable in this view.')).toBeTruthy();
  });

  it('renders a placed view through the host renderer while one is installed', () => {
    registerBrowserDocumentEmbeds();
    const Renderer = getEmbedPluginCallbacks().renderEmbed!;
    const remove = setBrowserPlacedViewRenderer(({ src, label, target, attrs }) => (
      <div data-testid="host-view">{label} {src} {target.kind === 'type' ? target.typeId : ''} {attrs.columns}</div>
    ));
    const { unmount } = render(<Renderer src="nimbalyst://view/type/competitor" label="Competitors" attrs={{ columns: 'title' }} nodeKey="3" />);
    expect(screen.getByTestId('host-view').textContent).toBe('Competitors nimbalyst://view/type/competitor competitor title');
    unmount();
    remove();
    render(<Renderer src="nimbalyst://view/type/competitor" label="Competitors" attrs={{}} nodeKey="4" />);
    screen.getByTestId('placed-view-unavailable');
  });
});
