/**
 * Custom widget for the display_visual MCP tool
 *
 * Renders visual content inline in the AI transcript.
 * Supports:
 * - Charts (bar, line, pie, area, scatter) using Recharts
 * - Image galleries with file path loading
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { FullscreenModal } from '../FullscreenModal';
import { ZoomableImageSurface } from '../ZoomableImageSurface';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ErrorBar
} from 'recharts';
import type { CustomToolWidgetProps } from './index';
import type { TranscriptViewMessage } from '../../../../ai/server/transcript/TranscriptProjector';
type ToolCall = NonNullable<TranscriptViewMessage['toolCall']>;
import { isDarkThemeAtom } from '../../../../store/atoms/theme';
import { GifPlayer } from './GifPlayer';
import { localAssetUrl } from '../../../../utils/localAssetUrl';
import { useRuntimeTranslation, type RuntimeTranslate } from '../../../RuntimeTranslation';

// Theme-aware color palettes
const LIGHT_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316'  // orange
];

const DARK_COLORS = [
  '#818cf8', // lighter indigo
  '#34d399', // lighter emerald
  '#fbbf24', // lighter amber
  '#f87171', // lighter red
  '#a78bfa', // lighter violet
  '#f472b6', // lighter pink
  '#22d3ee', // lighter cyan
  '#fb923c'  // lighter orange
];

/**
 * Get the appropriate color palette based on current theme
 */
function getThemeColors(isDark: boolean): string[] {
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}

/**
 * Render error bar component based on configuration
 * Supports both symmetric (errorKey) and asymmetric (errorKeyLower/errorKeyUpper) error bars
 */
function renderErrorBar(errorBars: ErrorBarConfig | undefined, isDark: boolean) {
  if (!errorBars) return null;

  // Validate that we have either symmetric or asymmetric error data
  const hasSymmetric = !!errorBars.errorKey;
  const hasAsymmetric = !!(errorBars.errorKeyLower && errorBars.errorKeyUpper);

  if (!hasSymmetric && !hasAsymmetric) {
    console.warn('[VisualDisplayWidget] Error bars configured but no error data keys provided');
    return null;
  }

  const strokeWidth = errorBars.strokeWidth ?? 2;
  const stroke = isDark ? 'var(--nim-text-muted)' : 'var(--nim-text)';

  if (hasSymmetric) {
    // Symmetric error bars
    return <ErrorBar dataKey={errorBars.errorKey!} stroke={stroke} strokeWidth={strokeWidth} />;
  } else {
    // Asymmetric error bars (lower and upper bounds)
    return (
      <>
        <ErrorBar dataKey={errorBars.errorKeyLower!} direction="y" stroke={stroke} strokeWidth={strokeWidth} />
        <ErrorBar dataKey={errorBars.errorKeyUpper!} direction="y" stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  }
}

// Error bar configuration
interface ErrorBarConfig {
  dataKey?: string; // For multi-series charts, specify which series to add error bars to
  errorKey?: string; // Symmetric error values
  errorKeyLower?: string; // Lower error values (asymmetric)
  errorKeyUpper?: string; // Upper error values (asymmetric)
  strokeWidth?: number; // Line width
}

// Chart configuration for rendering
interface ChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data: Record<string, unknown>[];
  xAxisKey: string;
  yAxisKey: string | string[];
  colors?: string[];
  errorBars?: ErrorBarConfig;
}

// New schema types
interface ImageContent {
  path: string;
}

interface ChartContent {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data: Record<string, unknown>[];
  xAxisKey: string;
  yAxisKey: string | string[];
  colors?: string[];
  errorBars?: ErrorBarConfig;
}

interface DisplayItem {
  description: string;
  image?: ImageContent;
  chart?: ChartContent;
}

interface DisplayArgs {
  items: DisplayItem[];
}

/**
 * Type guard to check if value is DisplayArgs
 */
function isDisplayArgs(value: unknown): value is DisplayArgs {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (!obj.items || !Array.isArray(obj.items) || obj.items.length === 0) {
    return false;
  }

  // Validate each item
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return false;
    const typedItem = item as Record<string, unknown>;

    // Check description
    if (!typedItem.description || typeof typedItem.description !== 'string') return false;

    const hasImage = !!typedItem.image;
    const hasChart = !!typedItem.chart;

    // Must have exactly one content type
    if (!hasImage && !hasChart) return false;
    if (hasImage && hasChart) return false;

    // Validate image content
    if (hasImage) {
      const image = typedItem.image as Record<string, unknown>;
      if (!image || typeof image !== 'object' || !image.path || typeof image.path !== 'string') {
        return false;
      }
    }

    // Validate chart content
    if (hasChart) {
      const chart = typedItem.chart as Record<string, unknown>;
      if (!chart || typeof chart !== 'object') return false;
      if (!chart.chartType || !chart.data || !chart.xAxisKey || !chart.yAxisKey) {
        return false;
      }
      if (!Array.isArray(chart.data)) return false;
    }
  }

  return true;
}

/**
 * Extract display items from tool arguments
 */
function extractDisplayItems(tool: ToolCall): DisplayItem[] | null {
  if (!tool?.arguments) return null;

  if (!isDisplayArgs(tool.arguments)) {
    return null;
  }

  return tool.arguments.items;
}

/**
 * Check if the tool result indicates an error
 */
function isToolError(result: unknown, message: { isError?: boolean }): boolean {
  if (message.isError) return true;
  if (typeof result === 'object' && result !== null && 'isError' in result) {
    return (result as { isError?: boolean }).isError === true;
  }
  return false;
}

/**
 * Make technical error messages more user-friendly
 * Handles various error formats from MCP server and Claude Code SDK
 */
function formatErrorMessage(rawMessage: string, t: RuntimeTranslate): string {
  // Handle "items[N].image.path file does not exist: /path" format (from Claude Code SDK)
  const fileNotExistMatch = rawMessage.match(/items\[\d+\]\.image\.path file does not exist:\s*"?([^"]+)"?/);
  if (fileNotExistMatch) {
    const filePath = fileNotExistMatch[1];
    return t('aichat:visual.file_not_found', 'File not found at "{{path}}". Please verify the file exists and the path is correct.', { path: filePath });
  }

  // Handle "items[N].image.path must be..." format
  const pathValidationMatch = rawMessage.match(/items\[\d+\]\.image\.path\s+(.*)/);
  if (pathValidationMatch) {
    return pathValidationMatch[1]; // Return just the validation message without the prefix
  }

  // Handle "Error: items[N]..." prefix - strip the technical prefix
  const errorPrefixMatch = rawMessage.match(/^Error:\s*items\[\d+\]\.?\s*(.*)/);
  if (errorPrefixMatch) {
    return errorPrefixMatch[1];
  }

  return rawMessage;
}

/**
 * Extract error message from tool result
 * Server returns errors in format: { content: [{ type: 'text', text: 'Error: ...' }], isError: true }
 * Claude Code SDK may also return errors as plain strings
 */
function extractErrorMessage(result: unknown, t: RuntimeTranslate): string | null {
  let rawMessage: string | null = null;

  if (!result || typeof result !== 'object') {
    // If result is a string, use it directly
    if (typeof result === 'string') {
      rawMessage = result;
    }
  } else {
    const resultObj = result as Record<string, unknown>;

    // Handle MCP-style content array response
    if (Array.isArray(resultObj.content)) {
      for (const item of resultObj.content) {
        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          rawMessage = item.text;
          break;
        }
      }
    }

    // Handle simple text response
    if (!rawMessage && typeof resultObj.text === 'string') {
      rawMessage = resultObj.text;
    }

    // Handle error message field
    if (!rawMessage && typeof resultObj.error === 'string') {
      rawMessage = resultObj.error;
    }

    if (!rawMessage && typeof resultObj.message === 'string') {
      rawMessage = resultObj.message;
    }

    // Last resort: if result is truthy and we couldn't extract a message,
    // try to stringify it (but only if it looks like it might contain useful info)
    if (!rawMessage) {
      try {
        const stringified = JSON.stringify(resultObj);
        // Only return if it's not just "{}" or similar
        if (stringified && stringified.length > 2 && stringified !== '{}') {
          rawMessage = stringified;
        }
      } catch {
        // Ignore stringify errors
      }
    }
  }

  if (!rawMessage) {
    return null;
  }

  // Format the message to be more user-friendly
  return formatErrorMessage(rawMessage, t);
}

/**
 * Error boundary for visual rendering
 */
class VisualErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; context?: string },
  { hasError: boolean; errorMessage: string | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = this.props.context || 'unknown';
    console.error(`[VisualDisplayWidget] Rendering error in ${context}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Render a bar chart
 */
function renderBarChart(config: ChartConfig, colors: string[], isDark: boolean) {
  const yKeys = Array.isArray(config.yAxisKey) ? config.yAxisKey : [config.yAxisKey];

  // Determine which series to attach error bars to
  const errorBarDataKey = config.errorBars?.dataKey || yKeys[0];

  return (
    <BarChart data={config.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--nim-border)" />
      <XAxis dataKey={config.xAxisKey} stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} />
      <YAxis stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} />
      <Tooltip
        contentStyle={{
          background: 'var(--nim-bg-secondary)',
          border: '1px solid var(--nim-border)',
          borderRadius: '6px',
          color: 'var(--nim-text)'
        }}
      />
      {yKeys.length > 1 && <Legend />}
      {yKeys.map((key, index) => (
        <Bar key={key} dataKey={key} fill={colors[index % colors.length]} isAnimationActive={false}>
          {key === errorBarDataKey && renderErrorBar(config.errorBars, isDark)}
        </Bar>
      ))}
    </BarChart>
  );
}

/**
 * Render a line chart
 */
function renderLineChart(config: ChartConfig, colors: string[], isDark: boolean) {
  const yKeys = Array.isArray(config.yAxisKey) ? config.yAxisKey : [config.yAxisKey];

  // Determine which series to attach error bars to
  const errorBarDataKey = config.errorBars?.dataKey || yKeys[0];

  return (
    <LineChart data={config.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--nim-border)" />
      <XAxis dataKey={config.xAxisKey} stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} />
      <YAxis stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} />
      <Tooltip
        contentStyle={{
          background: 'var(--nim-bg-secondary)',
          border: '1px solid var(--nim-border)',
          borderRadius: '6px',
          color: 'var(--nim-text)'
        }}
      />
      {yKeys.length > 1 && <Legend />}
      {yKeys.map((key, index) => (
        <Line
          key={key}
          type="monotone"
          dataKey={key}
          stroke={colors[index % colors.length]}
          strokeWidth={2}
          dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 3 }}
          isAnimationActive={false}
        >
          {key === errorBarDataKey && renderErrorBar(config.errorBars, isDark)}
        </Line>
      ))}
    </LineChart>
  );
}

/**
 * Render a pie chart
 */
function renderPieChart(config: ChartConfig, colors: string[]) {
  const yKey = Array.isArray(config.yAxisKey) ? config.yAxisKey[0] : config.yAxisKey;

  return (
    <PieChart>
      <Pie
        data={config.data}
        dataKey={yKey}
        nameKey={config.xAxisKey}
        cx="50%"
        cy="50%"
        outerRadius="70%"
        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
        labelLine={{ stroke: 'var(--nim-text-muted)' }}
        isAnimationActive={false}
      >
        {config.data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          background: 'var(--nim-bg-secondary)',
          border: '1px solid var(--nim-border)',
          borderRadius: '6px',
          color: 'var(--nim-text)'
        }}
      />
    </PieChart>
  );
}

/**
 * Render an area chart
 */
function renderAreaChart(config: ChartConfig, colors: string[], isDark: boolean) {
  const yKeys = Array.isArray(config.yAxisKey) ? config.yAxisKey : [config.yAxisKey];

  // Determine which series to attach error bars to
  const errorBarDataKey = config.errorBars?.dataKey || yKeys[0];

  return (
    <AreaChart data={config.data}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--nim-border)" />
      <XAxis dataKey={config.xAxisKey} stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} />
      <YAxis stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} />
      <Tooltip
        contentStyle={{
          background: 'var(--nim-bg-secondary)',
          border: '1px solid var(--nim-border)',
          borderRadius: '6px',
          color: 'var(--nim-text)'
        }}
      />
      {yKeys.length > 1 && <Legend />}
      {yKeys.map((key, index) => (
        <Area
          key={key}
          type="monotone"
          dataKey={key}
          stroke={colors[index % colors.length]}
          fill={colors[index % colors.length]}
          fillOpacity={0.3}
          isAnimationActive={false}
        >
          {key === errorBarDataKey && renderErrorBar(config.errorBars, isDark)}
        </Area>
      ))}
    </AreaChart>
  );
}

/**
 * Render a scatter chart
 */
function renderScatterChart(config: ChartConfig, colors: string[], isDark: boolean) {
  const yKey = Array.isArray(config.yAxisKey) ? config.yAxisKey[0] : config.yAxisKey;

  return (
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--nim-border)" />
      <XAxis dataKey={config.xAxisKey} stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} name={config.xAxisKey} />
      <YAxis dataKey={yKey} stroke="var(--nim-text-muted)" tick={{ fontSize: 12 }} name={yKey} />
      <Tooltip
        contentStyle={{
          background: 'var(--nim-bg-secondary)',
          border: '1px solid var(--nim-border)',
          borderRadius: '6px',
          color: 'var(--nim-text)'
        }}
        cursor={{ strokeDasharray: '3 3' }}
      />
      <Scatter data={config.data} fill={colors[0]} isAnimationActive={false}>
        {config.data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
        {renderErrorBar(config.errorBars, isDark)}
      </Scatter>
    </ScatterChart>
  );
}

/**
 * Component for displaying a single image with loading state
 */
const ImageDisplay: React.FC<{
  image: ImageContent;
  description?: string;
  readFile?: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  className?: string;
}> = ({ image, description, readFile, className }) => {
  const { t } = useRuntimeTranslation();
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ kind: 'load'; detail?: string } | { kind: 'render'; path: string } | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      // Try to load the image via file protocol (for local files)
      // In Electron, we can use file:// protocol for local images
      try {
        // First try using readFile if available (for base64 loading)
        if (readFile) {
          const result = await readFile(image.path);
          if (result.success && result.content) {
            // Check if content is already base64 or needs conversion
            if (result.content.startsWith('data:')) {
              setImageData(result.content);
            } else {
              // Determine MIME type from extension
              const ext = image.path.split('.').pop()?.toLowerCase();
              const mimeTypes: Record<string, string> = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
                'bmp': 'image/bmp'
              };
              const mimeType = mimeTypes[ext || ''] || 'image/png';
              setImageData(`data:${mimeType};base64,${result.content}`);
            }
            setLoading(false);
            return;
          } else if (result.error) {
            console.error('[VisualDisplayWidget] Failed to read image file:', {
              path: image.path,
              error: result.error
            });
            setError({ kind: 'load', detail: result.error });
            setLoading(false);
            return;
          }
        }

        // Fall back to a renderer-loadable URL for local Electron images.
        // `localAssetUrl` returns `nim-asset://` in Electron (the main window
        // runs with `webSecurity: true` and cannot load `file://`) and
        // `file://` for non-Electron consumers.
        setImageData(localAssetUrl(image.path));
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[VisualDisplayWidget] Image load exception:', {
          path: image.path,
          error: errorMessage
        });
        setError({ kind: 'load', detail: err instanceof Error ? err.message : undefined });
        setLoading(false);
      }
    };

    loadImage();
  }, [image.path, readFile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-nim-secondary rounded-md border border-nim">
        <span className="text-nim-muted text-sm">{t('common:image_viewer.loading', 'Loading...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-nim-secondary rounded-md border border-nim">
        <span className="text-nim-error text-sm">{error.kind === 'render'
          ? t('aichat:visual.image_render_failed', 'Failed to render image from: {{path}}', { path: error.path })
          : t('aichat:visual.image_load_failed', 'Failed to load image: {{error}}', { error: error.detail ?? t('dialogs:error.unknown', 'Unknown error') })}</span>
        <span className="font-mono text-xs text-nim-faint break-all">{image.path}</span>
      </div>
    );
  }

  const isGif = image.path.toLowerCase().endsWith('.gif');

  return (
    <div className="overflow-hidden rounded-md">
      {isGif && imageData ? (
        <GifPlayer
          src={imageData}
          alt={description || t('aichat:media.animated_gif', 'Animated GIF')}
          className="max-w-full"
        />
      ) : (
        <img
          src={imageData || ''}
          alt={description || t('aichat:visual.image', 'Image')}
          className={`max-w-full h-auto block ${className || ''}`.trim()}
          onError={(e) => {
            console.error('[VisualDisplayWidget] Image element failed to load:', {
              path: image.path,
              src: imageData?.substring(0, 100) + (imageData && imageData.length > 100 ? '...' : '')
            });
            setError({ kind: 'render', path: image.path });
          }}
        />
      )}
    </div>
  );
};

/**
 * Render a chart item
 */
const ChartItemRenderer: React.FC<{
  item: DisplayItem;
  isDark: boolean;
}> = ({ item, isDark }) => {
  const { t } = useRuntimeTranslation();
  if (!item.chart) return null;

  const chartConfig: ChartConfig = {
    chartType: item.chart.chartType,
    data: item.chart.data,
    xAxisKey: item.chart.xAxisKey,
    yAxisKey: item.chart.yAxisKey,
    colors: item.chart.colors,
    errorBars: item.chart.errorBars
  };

  const colors = chartConfig.colors || getThemeColors(isDark);
  const height = 300;
  const chartLabel = (() => {
    switch (chartConfig.chartType) {
      case 'bar': return t('aichat:visual.chart_bar', 'bar chart');
      case 'line': return t('aichat:visual.chart_line', 'line chart');
      case 'pie': return t('aichat:visual.chart_pie', 'pie chart');
      case 'area': return t('aichat:visual.chart_area', 'area chart');
      case 'scatter': return t('aichat:visual.chart_scatter', 'scatter chart');
      default: return t('aichat:visual.chart_custom', '{{type}} chart', { type: chartConfig.chartType });
    }
  })();

  const renderChart = () => {
    switch (chartConfig.chartType) {
      case 'bar':
        return renderBarChart(chartConfig, colors, isDark);
      case 'line':
        return renderLineChart(chartConfig, colors, isDark);
      case 'pie':
        return renderPieChart(chartConfig, colors);
      case 'area':
        return renderAreaChart(chartConfig, colors, isDark);
      case 'scatter':
        return renderScatterChart(chartConfig, colors, isDark);
      default:
        return null;
    }
  };

  const errorFallback = (
    <div className="p-3 rounded-md border border-nim-error bg-[color-mix(in_srgb,var(--nim-error)_10%,var(--nim-bg))]">
      <p className="text-nim-muted text-sm mb-2">{item.description}</p>
      <p className="text-nim-error text-sm">
        {t('aichat:visual.chart_render_failed', 'Failed to render {{chart}}. Check that data contains valid "{{x}}" and "{{y}}" fields.', { chart: chartLabel, x: chartConfig.xAxisKey, y: Array.isArray(chartConfig.yAxisKey) ? chartConfig.yAxisKey.join(', ') : chartConfig.yAxisKey })}
      </p>
    </div>
  );

  return (
    <VisualErrorBoundary fallback={errorFallback} context={`${chartConfig.chartType} chart`}>
      <div className="rounded-md overflow-hidden border border-nim bg-nim p-3" role="img" aria-label={t('aichat:visual.chart_description', '{{chart}}: {{description}}', { chart: chartLabel, description: item.description })}>
        <p className="text-nim text-sm font-medium mb-3">{item.description}</p>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </VisualErrorBoundary>
  );
};

/**
 * Lightbox component that renders full-screen over the entire app
 */
const Lightbox: React.FC<{
  images: DisplayItem[];
  selectedIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  readFile?: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}> = ({ images, selectedIndex, onClose, onNavigate, readFile }) => {
  const { t } = useRuntimeTranslation();
  return (
    <FullscreenModal
      isOpen={true}
      onClose={onClose}
      ariaLabel={t('aichat:visual.lightbox', 'Image lightbox')}
      contentClassName="h-[92vh] w-[96vw] max-w-[1400px] overflow-hidden rounded-lg border border-nim bg-nim"
    >
      <ZoomableImageSurface
        src={localAssetUrl(images[selectedIndex].image!.path)}
        alt={images[selectedIndex].description}
        copyFilePath={images[selectedIndex].image!.path}
        toolbarLabel={(
          <div className="min-w-0 truncate font-mono text-sm text-nim" title={images[selectedIndex].description}>
            {images[selectedIndex].description}
          </div>
        )}
        toolbarExtras={(
          <>
            {images.length > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] px-2 py-1 text-xs text-[var(--nim-text)] transition-colors duration-150 hover:bg-[var(--nim-bg-hover)]"
                  onClick={() => onNavigate((selectedIndex - 1 + images.length) % images.length)}
                  aria-label={t('aichat:visual.previous_image', 'Previous image')}
                >
                  {t('aichat:visual.previous', 'Prev')}
                </button>
                <div className="min-w-[3.5rem] text-center font-mono text-xs text-[var(--nim-text-muted)]">
                  {selectedIndex + 1} / {images.length}
                </div>
                <button
                  type="button"
                  className="rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] px-2 py-1 text-xs text-[var(--nim-text)] transition-colors duration-150 hover:bg-[var(--nim-bg-hover)]"
                  onClick={() => onNavigate((selectedIndex + 1) % images.length)}
                  aria-label={t('aichat:visual.next_image', 'Next image')}
                >
                  {t('common:next', 'Next')}
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="rounded border border-[var(--nim-border)] bg-[var(--nim-bg)] px-2 py-1 text-xs text-[var(--nim-text)] transition-colors duration-150 hover:bg-[var(--nim-bg-hover)]"
              onClick={onClose}
              aria-label={t('common:close', 'Close')}
            >
              {t('common:close', 'Close')}
            </button>
          </>
        )}
      />
    </FullscreenModal>
  );
};

/**
 * Render an image gallery with lightbox support
 */
const ImageGallery: React.FC<{
  images: DisplayItem[];
  readFile?: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}> = ({ images, readFile }) => {
  const { t } = useRuntimeTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const imagePaths = images.map(img => img.image?.path).filter(Boolean);
  const errorFallback = (
    <div className="p-3 rounded-md border border-nim-error bg-[color-mix(in_srgb,var(--nim-error)_10%,var(--nim-bg))]">
      <p className="text-nim-error text-sm">
        {t('aichat:visual.gallery_failed', images.length === 1 ? 'Failed to render image gallery ({{count}} image).' : 'Failed to render image gallery ({{count}} images).', { count: images.length })}
        {imagePaths.length > 0 && (
          <span className="block mt-1 text-nim-faint text-xs">
            {t('aichat:visual.paths', 'Paths: {{paths}}', { paths: imagePaths.slice(0, 3).join(', ') })}{imagePaths.length > 3 ? t('aichat:visual.more_paths', ', ...and {{count}} more', { count: imagePaths.length - 3 }) : ''}
          </span>
        )}
      </p>
    </div>
  );

  const isSingleImage = images.length === 1;

  return (
    <VisualErrorBoundary fallback={errorFallback} context="image gallery">
      <div className="rounded-md overflow-hidden">
        <div className={`grid gap-2 ${isSingleImage ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]'}`}>
          {images.map((item, index) => (
            <div
              key={index}
              className={`group cursor-pointer rounded-md overflow-hidden border border-nim bg-nim-secondary transition-all duration-200 hover:border-nim-primary hover:shadow-md ${isSingleImage ? 'max-w-full' : 'aspect-square'}`}
              onClick={() => setSelectedIndex(index)}
            >
              <div className={`${isSingleImage ? 'flex max-h-96 items-center justify-center bg-[var(--nim-bg)] p-2' : 'w-full h-full'} overflow-hidden`}>
                <ImageDisplay
                  image={item.image!}
                  description={item.description}
                  readFile={readFile}
                  className={isSingleImage ? 'mx-auto max-h-[22rem] w-auto object-contain' : ''}
                />
              </div>
              <div className="p-2 bg-nim-secondary text-xs text-nim-muted truncate">{item.description}</div>
            </div>
          ))}
        </div>
        {selectedIndex !== null && (
          <Lightbox
            images={images}
            selectedIndex={selectedIndex}
            onClose={() => setSelectedIndex(null)}
            onNavigate={setSelectedIndex}
            readFile={readFile}
          />
        )}
      </div>
    </VisualErrorBoundary>
  );
};

/**
 * Group items into segments: consecutive images are grouped together, charts are individual
 */
type ItemSegment =
  | { type: 'chart'; item: DisplayItem }
  | { type: 'images'; items: DisplayItem[] };

function groupItemsIntoSegments(items: DisplayItem[]): ItemSegment[] {
  const segments: ItemSegment[] = [];
  let currentImageGroup: DisplayItem[] = [];

  for (const item of items) {
    // Defensive check: ensure image items have valid path
    if (item.image && item.image.path) {
      currentImageGroup.push(item);
    } else if (item.chart) {
      // Flush any pending image group
      if (currentImageGroup.length > 0) {
        segments.push({ type: 'images', items: currentImageGroup });
        currentImageGroup = [];
      }
      // Add chart as individual segment
      segments.push({ type: 'chart', item });
    }
  }

  // Flush remaining images
  if (currentImageGroup.length > 0) {
    segments.push({ type: 'images', items: currentImageGroup });
  }

  return segments;
}

export const VisualDisplayWidget: React.FC<CustomToolWidgetProps> = ({ message, readFile }) => {
  const { t } = useRuntimeTranslation();
  const tool = message.toolCall;
  const isDark = useAtomValue(isDarkThemeAtom);

  if (!tool) {
    console.warn('[VisualDisplayWidget] No tool call in message');
    return null;
  }

  const items = extractDisplayItems(tool);

  // Only show full-widget error if we truly can't extract items
  // (server validation error). Don't let hasError flag override successful item extraction.
  if (!items) {
    const hasError = isToolError(tool.result, message);

    // Extract detailed error message from server response
    const serverErrorMessage = extractErrorMessage(tool.result, t);

    // Try to extract path information from tool arguments for better error context
    const args = tool.arguments as unknown as DisplayArgs | undefined;
    const pathInfo = Array.isArray(args?.items)
      ? args.items.map((item, i) => item.image?.path ? `items[${i}].image.path: "${item.image.path}"` : null)
        .filter(Boolean)
        .join(', ')
      : null;

    // Determine the appropriate error message to display
    let displayErrorMessage: string;
    if (serverErrorMessage) {
      // Server provided an error message - use it directly
      displayErrorMessage = serverErrorMessage;
    } else if (hasError) {
      // Server indicated error but no message extracted - show what we can
      displayErrorMessage = t('aichat:visual.server_rejected', 'Server rejected the request');
      if (pathInfo) {
        displayErrorMessage += '\n\n' + t('aichat:visual.provided_paths', 'Provided paths: {{paths}}', { paths: pathInfo });
      }
      // Also include raw result for debugging
      if (tool.result) {
        try {
          const resultStr = typeof tool.result === 'string'
            ? tool.result
            : JSON.stringify(tool.result);
          if (resultStr && resultStr !== '{}' && resultStr !== 'null') {
            displayErrorMessage += '\n\n' + t('aichat:visual.raw_result', 'Raw result: {{result}}', { result: resultStr.substring(0, 500) });
          }
        } catch {
          // Ignore stringify errors
        }
      }
    } else {
      // No server error but couldn't parse items
      displayErrorMessage = t('aichat:visual.invalid_config', 'Invalid visual configuration: items array is missing or malformed');
      if (pathInfo) {
        displayErrorMessage += '\n\n' + t('aichat:visual.provided_paths', 'Provided paths: {{paths}}', { paths: pathInfo });
      }
    }

    // Log for debugging - use console.log for expected server-side validation rejections,
    // console.error only for unexpected failures (no items and no server error)
    const isExpectedValidationError = hasError && serverErrorMessage;
    if (isExpectedValidationError) {
      console.log('[VisualDisplayWidget] Server rejected request:', {
        serverErrorMessage,
        toolName: tool.toolName
      });
    } else {
      console.error('[VisualDisplayWidget] Unexpected display failure:', {
        hasError,
        hasItems: !!items,
        serverErrorMessage,
        toolName: tool.toolName,
        toolResult: tool.result,
        toolArguments: tool.arguments
      });
    }

    return (
      <div className="visual-display-widget rounded-md border border-nim-error bg-nim-secondary overflow-hidden" role="img" aria-label={t('aichat:visual.error', 'Visual content error')}>
        <div className="flex items-center gap-2 py-2 px-3 border-b border-nim bg-nim-tertiary">
          <span className="text-sm font-medium text-nim">{t('aichat:visual.title', 'Visual')}</span>
          <span className="text-xs font-semibold text-nim-error py-0.5 px-2 rounded-full bg-[color-mix(in_srgb,var(--nim-error)_15%,transparent)]">
            {t('menu:generic_error_title', 'Error')}
          </span>
        </div>
        <div className="p-3 text-sm text-nim-error whitespace-pre-wrap">
          {displayErrorMessage}
        </div>
      </div>
    );
  }

  // If we have items, render them regardless of error flags
  // Individual images will handle their own errors gracefully

  const segments = groupItemsIntoSegments(items);

  // Summarize content for error message
  const chartCount = items.filter(i => i.chart).length;
  const imageCount = items.filter(i => i.image).length;
  const chartsSummary = chartCount > 0 ? t('aichat:visual.charts', chartCount === 1 ? '{{count}} chart' : '{{count}} charts', { count: chartCount }) : '';
  const imagesSummary = imageCount > 0 ? t('aichat:visual.images', imageCount === 1 ? '{{count}} image' : '{{count}} images', { count: imageCount }) : '';
  const contentSummary = chartsSummary && imagesSummary
    ? t('aichat:visual.combined_summary', '{{charts}} and {{images}}', { charts: chartsSummary, images: imagesSummary })
    : chartsSummary || imagesSummary || t('aichat:visual.unknown_content', 'unknown content');

  const errorFallback = (
    <div className="visual-display-widget rounded-md border border-nim-error bg-nim-secondary overflow-hidden" role="img" aria-label={t('aichat:visual.error', 'Visual content error')}>
      <div className="flex items-center gap-2 py-2 px-3 border-b border-nim bg-nim-tertiary">
        <span className="text-sm font-medium text-nim">{t('aichat:visual.title', 'Visual')}</span>
        <span className="text-xs font-semibold text-nim-error py-0.5 px-2 rounded-full bg-[color-mix(in_srgb,var(--nim-error)_15%,transparent)]">
          {t('menu:generic_error_title', 'Error')}
        </span>
      </div>
      <div className="p-3 text-sm text-nim-error">
        {t('aichat:visual.render_failed', 'Failed to render visual content ({{summary}}).', { summary: contentSummary })}
      </div>
    </div>
  );

  return (
    <VisualErrorBoundary fallback={errorFallback} context="main widget">
      <div className="visual-display-widget flex flex-col gap-3" role="img" aria-label={t('aichat:visual.items', '{{count}} visual item(s)', { count: items.length })}>
        {segments.map((segment, index) => {
          if (segment.type === 'chart') {
            return (
              <ChartItemRenderer
                key={index}
                item={segment.item}
                isDark={isDark}
              />
            );
          } else {
            return (
              <ImageGallery
                key={index}
                images={segment.items}
                readFile={readFile}
              />
            );
          }
        })}
      </div>
    </VisualErrorBoundary>
  );
};
