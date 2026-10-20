// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import QRCode from 'qrcode';
import { QRPairingModal } from '../QRPairingModal';

vi.mock('@nimbalyst/runtime', () => ({ copyToClipboard: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,fixture') } }));

describe('QR pairing localization', () => {
  const originalAPI = Object.getOwnPropertyDescriptor(window, 'electronAPI');
  afterEach(async () => {
    cleanup(); vi.clearAllMocks();
    if (originalAPI) Object.defineProperty(window, 'electronAPI', originalAPI);
    else delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18next.changeLanguage('en');
  });

  it('renders one set of labels and options, preserving the QR payload across a language change', async () => {
    const payload = { serverUrl: 'https://sync.example.test', encryptionKeySeed: 'fixture-only-seed' };
    const generateQRPayload = vi.fn(async () => payload);
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { credentials: { generateQRPayload } } });
    const onModeChange = vi.fn();
    const { container } = render(<QRPairingModal isOpen onClose={vi.fn()} serverUrl={payload.serverUrl} preventSleepMode="off" onPreventSleepModeChange={onModeChange} />);
    await waitFor(() => expect(container.querySelector('.qr-code-image')).toBeTruthy());
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(container.querySelectorAll('.qr-step')).toHaveLength(4);
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByRole('heading').textContent).toBe('モバイル端末をペアリング');
    expect(screen.queryByText('Pair Mobile Device')).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(generateQRPayload).toHaveBeenCalledOnce();
    expect(QRCode.toDataURL).toHaveBeenCalledOnce();
    const encoded = vi.mocked(QRCode.toDataURL).mock.calls[0][0] as string;
    expect(JSON.parse(atob(new URL(encoded).searchParams.get('data')!))).toEqual(payload);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pluggedIn' } });
    expect(onModeChange).toHaveBeenCalledWith('pluggedIn');
  });
});
