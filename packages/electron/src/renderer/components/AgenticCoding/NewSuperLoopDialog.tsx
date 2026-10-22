/**
 * NewSuperLoopDialog - Dialog for creating a new Super Loop
 *
 * Allows users to specify a task description and configuration for a new Super Loop.
 * A dedicated worktree is automatically created for each Super Loop.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import { useTranslation } from '@nimbalyst/i18n/react';
import {
  newSuperLoopDialogOpenAtom,
  upsertSuperLoopAtom,
} from '../../store/atoms/superLoop';
import { SUPER_LOOP_DEFAULTS } from '../../../shared/types/superLoop';
import { getClaudeCodeModelLabel } from '../../utils/modelUtils';

interface AgentModel {
  id: string;
  name: string;
  provider: string;
}

interface NewSuperLoopDialogProps {
  workspacePath: string;
  onSuperLoopCreated?: (superLoopId: string, worktreeId: string) => void;
}

const DEFAULT_MODEL = 'claude-code:opus';

export const NewSuperLoopDialog: React.FC<NewSuperLoopDialogProps> = ({
  workspacePath,
  onSuperLoopCreated,
}) => {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  const [isOpen, setIsOpen] = useAtom(newSuperLoopDialogOpenAtom);
  const upsertSuperLoop = useSetAtom(upsertSuperLoopAtom);

  const [taskDescription, setTaskDescription] = useState('');
  const [maxIterations, setMaxIterations] = useState<number>(SUPER_LOOP_DEFAULTS.maxIterations);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [agentModels, setAgentModels] = useState<AgentModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agent models when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const response = await window.electronAPI.aiGetModels();
        if (response.success && response.grouped) {
          // Only include agent providers (claude-code, openai-codex)
          const agents: AgentModel[] = [];
          for (const [provider, models] of Object.entries(response.grouped)) {
            if (provider === 'claude-code' || provider === 'openai-codex') {
              for (const model of models as AgentModel[]) {
                agents.push(model);
              }
            }
          }
          setAgentModels(agents);

          // If the default model isn't in the list, select the first available
          if (agents.length > 0 && !agents.some(m => m.id === selectedModel)) {
            setSelectedModel(agents[0].id);
          }
        }
      } catch (err) {
        console.error('[NewSuperLoopDialog] Failed to load models:', err);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, [isOpen]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTaskDescription('');
      setMaxIterations(SUPER_LOOP_DEFAULTS.maxIterations);
      setSelectedModel(DEFAULT_MODEL);
      setError(null);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (!isCreating) {
      setIsOpen(false);
    }
  }, [setIsOpen, isCreating]);

  const handleCreate = useCallback(async () => {
    if (!taskDescription.trim()) {
      setError(t('superloop.task_required'));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // The IPC handler will auto-create a dedicated worktree for this Super Loop
      const result = await window.electronAPI.invoke('super-loop:create', workspacePath, taskDescription.trim(), {
        maxIterations,
        modelId: selectedModel,
      });

      if (result.success && result.loop) {
        upsertSuperLoop(result.loop);
        setIsOpen(false);
        onSuperLoopCreated?.(result.loop.id, result.worktree?.id);
      } else {
        setError(result.error || t('superloop.create_failed'));
      }
    } catch (err) {
      console.error('[NewSuperLoopDialog] Failed to create super loop:', err);
      setError(t('superloop.create_failed'));
    } finally {
      setIsCreating(false);
    }
  }, [workspacePath, taskDescription, maxIterations, selectedModel, setIsOpen, upsertSuperLoop, onSuperLoopCreated, t]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleCreate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, handleCreate]);

  const getModelDisplayName = (modelId: string): string => {
    // Check if it's in the loaded list
    const model = agentModels.find(m => m.id === modelId);
    if (model) return model.name;

    // Fallback for claude-code models
    if (modelId.startsWith('claude-code')) {
      return getClaudeCodeModelLabel(modelId);
    }

    // Strip provider prefix
    const [, ...parts] = modelId.split(':');
    return parts.join(':') || modelId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-nim rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-super-loop-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-nim">
          <div className="flex items-center gap-2">
            <MaterialSymbol icon="sync" size={20} className="text-nim-primary" />
            <h2 id="new-super-loop-dialog-title" className="text-lg font-semibold text-nim">{t('superloop.title_new')}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-nim-hover text-nim-muted hover:text-nim transition-colors"
            disabled={isCreating}
            aria-label={tCommon('close')}
            title={tCommon('close')}
          >
            <MaterialSymbol icon="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Description */}
          <div className="text-sm text-nim-muted">
            {t('superloop.description')}{' '}
            <span className="italic">{t('superloop.inspired')}</span>
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <label htmlFor="super-loop-task-description" className="block text-sm font-medium text-nim">
              {t('superloop.task_description')}
            </label>
            <textarea
              id="super-loop-task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={t('superloop.task_placeholder')}
              className="w-full h-40 px-3 py-2 text-sm bg-nim-secondary border border-nim rounded-md text-nim placeholder:text-nim-muted focus:outline-none focus:ring-2 focus:ring-nim-primary resize-none"
              disabled={isCreating}
              autoFocus
            />
            <p className="text-xs text-nim-muted">
              {t('superloop.task_saved')}
            </p>
          </div>

          {/* Model and Max Iterations row */}
          <div className="flex gap-4">
            {/* Model Selector */}
            <div className="space-y-2 flex-1">
              <label htmlFor="super-loop-model" className="block text-sm font-medium text-nim">
                {t('superloop.model')}
              </label>
              <div className="relative">
                <select
                  id="super-loop-model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-nim-secondary border border-nim rounded-md text-nim focus:outline-none focus:ring-2 focus:ring-nim-primary appearance-none pr-8"
                  disabled={isCreating || loadingModels}
                >
                  {loadingModels ? (
                    <option value={selectedModel}>{t('superloop.loading_models')}</option>
                  ) : agentModels.length === 0 ? (
                    <option value={DEFAULT_MODEL}>{getModelDisplayName(DEFAULT_MODEL)}</option>
                  ) : (
                    agentModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))
                  )}
                </select>
                <MaterialSymbol
                  icon="expand_more"
                  size={16}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-nim-muted pointer-events-none"
                />
              </div>
              <p className="text-xs text-nim-muted">
                {t('superloop.model_hint')}
              </p>
            </div>

            {/* Max Iterations */}
            <div className="space-y-2">
              <label htmlFor="super-loop-max-iterations" className="block text-sm font-medium text-nim">
                {t('superloop.max_iterations')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="super-loop-max-iterations"
                  type="number"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={100}
                  className="w-24 px-3 py-2 text-sm bg-nim-secondary border border-nim rounded-md text-nim focus:outline-none focus:ring-2 focus:ring-nim-primary"
                  disabled={isCreating}
                />
                <span className="text-sm text-nim-muted">
                  {t('superloop.iteration_range')}
                </span>
              </div>
              <p className="text-xs text-nim-muted">
                {t('superloop.iterations_stop')}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-nim-error bg-nim-error/10 border border-nim-error/30 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-nim">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-nim bg-nim-secondary hover:bg-nim-hover border border-nim rounded-md transition-colors"
            disabled={isCreating}
          >
            {t('superloop.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !taskDescription.trim()}
            className="px-4 py-2 text-sm font-medium text-nim-on-primary bg-nim-primary hover:bg-nim-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <MaterialSymbol icon="progress_activity" size={16} className="animate-spin" />
                {t('superloop.creating')}
              </>
            ) : (
              <>
                <MaterialSymbol icon="play_arrow" size={16} />
                {t('superloop.create_start')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewSuperLoopDialog;
