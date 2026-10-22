/**
 * CloudflareSandboxesPanel — Settings > Application > Cloudflare Sandboxes.
 *
 * Walks four gates in order, each of which must be satisfied explicitly:
 *   1. prerequisites (Wrangler with profile support; no local container runtime)
 *   2. a Wrangler profile, chosen from `wrangler auth list` or created through
 *      Wrangler's browser SSO flow
 *   3. a Cloudflare account, always chosen by hand — a single account is still
 *      a choice, never a silent default
 *   4. a reviewed deployment plan (resources + cost) acknowledged before deploy
 *
 * There are no API-key or token fields anywhere in this panel by design;
 * authentication belongs to Wrangler. See ../../../../shared/cloudflareSandbox.
 *
 * Async loads are sequenced: a profile switch invalidates in-flight account
 * loads, and any selection change invalidates the plan, so a slow response for
 * a superseded selection can never populate the UI it no longer describes.
 */

import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialSymbol } from '@nimbalyst/runtime/ui/icons/MaterialSymbol';
import {
  CLOUDFLARE_SANDBOX_CHANNELS,
  RESERVED_WRANGLER_PROFILE_NAMES,
  WRANGLER_PROFILE_NAME_PATTERN,
  type CloudflareAccount,
  type CloudflareSandboxError,
  type CloudflareSandboxErrorCode,
  type CloudflareSandboxPrerequisites,
  type DeploymentPlan,
  type SandboxDeployment,
  type WranglerProfile,
} from '../../../../shared/cloudflareSandbox';
import { invokeSandbox } from './CloudflareSandboxClient';
import { CloudflareSandboxStatusCard } from './CloudflareSandboxStatusCard';

type PendingOperation = 'none' | 'signing-in' | 'planning' | 'deploying';

const sectionClass = 'cloudflare-sandbox-section py-4 border-b border-[var(--nim-border)] last:border-b-0';
const headingClass = 'text-[13px] font-semibold text-[var(--nim-text)] mb-1';
const hintClass = 'text-[12px] leading-relaxed text-[var(--nim-text-muted)]';
const buttonClass =
  'px-3 py-1.5 text-[13px] rounded-md border border-[var(--nim-border)] bg-[var(--nim-bg)] text-[var(--nim-text)] hover:border-[var(--nim-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const primaryButtonClass =
  'px-3 py-1.5 text-[13px] rounded-md bg-[var(--nim-primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity';

const SANDBOX_ERROR_KEYS: Record<CloudflareSandboxErrorCode, string> = {
  'wrangler-missing': 'errors.codes.wrangler_missing',
  'wrangler-unsupported': 'errors.codes.wrangler_unsupported',
  'not-authenticated': 'errors.codes.not_authenticated',
  'profile-exists': 'errors.codes.profile_exists',
  'login-cancelled': 'errors.codes.login_cancelled',
  'account-required': 'errors.codes.account_required',
  'plan-stale': 'errors.codes.plan_stale',
  'deploy-failed': 'errors.codes.deploy_failed',
  'deployment-stale': 'errors.codes.deployment_stale',
  'worker-missing': 'errors.codes.worker_missing',
  'confirmation-required': 'errors.codes.confirmation_required',
  'container-unavailable': 'errors.codes.container_unavailable',
  'node-not-provisioned': 'errors.codes.node_not_provisioned',
  'node-provision-failed': 'errors.codes.node_provision_failed',
  'node-start-failed': 'errors.codes.node_start_failed',
  'grant-failed': 'errors.codes.grant_failed',
  unknown: 'errors.codes.unknown',
};

/**
 * A plan is only ever shown or deployable while it still describes the current
 * selection. A review that arrives after the user moved on describes an account
 * they never agreed to deploy to, so this is the one test both the rendering
 * and the deploy handler use.
 */
/**
 * Mirrors Wrangler's own `validateProfileName`. `default` and `staging` are
 * reserved — `wrangler auth create` refuses them, and `default` is instead
 * managed by plain `wrangler login`, which is what the existing profile list
 * offers. Returns null when the name is usable.
 */
function newProfileNameError(name: string): { key: 'profile_errors.reserved'; profileName: string } | { key: 'profile_errors.invalid_characters' } | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if ((RESERVED_WRANGLER_PROFILE_NAMES as readonly string[]).includes(trimmed.toLowerCase())) {
    return { key: 'profile_errors.reserved', profileName: trimmed };
  }
  if (!WRANGLER_PROFILE_NAME_PATTERN.test(trimmed)) {
    return { key: 'profile_errors.invalid_characters' };
  }
  return null;
}

function planAppliesTo(
  plan: DeploymentPlan | null,
  profileName: string | null,
  accountId: string | null,
): plan is DeploymentPlan {
  return plan !== null && plan.profileName === profileName && plan.account.id === accountId;
}

function ErrorNote({ message }: { message: string }): JSX.Element {
  return (
    <p className="cloudflare-sandbox-error text-[12px] text-[var(--nim-error)] mt-2" role="alert">
      {message}
    </p>
  );
}

export function CloudflareSandboxesPanel({ workspacePath }: { workspacePath?: string }): JSX.Element {
  return <CloudflareSandboxesContent key={workspacePath ?? "global"} workspacePath={workspacePath} />;
}

function CloudflareSandboxesContent({ workspacePath }: { workspacePath?: string }): JSX.Element {
  const { t } = useTranslation('cloudflareSandboxes');
  const errorMessage = (error: CloudflareSandboxError) => {
    const key = SANDBOX_ERROR_KEYS[error.code];
    // Keep curated per-operation overrides intact; only translate the fixed
    // code message returned by the main-process error table.
    return t(key, { lng: 'en' }) === error.message ? t(key) : error.message;
  };
  const selectionTouched = useRef(false);
  const savedSelection = useRef<{profileName: string; accountId: string | null} | null>(null);
  const saveSelection = useCallback((profileName: string, accountId: string | null) => {
    selectionTouched.current = true;
    if (!workspacePath) return;
    void window.electronAPI.invoke("workspace:update-state", workspacePath, {cloudflareSandboxSelection: {profileName, accountId}})
      .catch(() => setSelectionError(t('errors.selection_save')));
  }, [workspacePath, t]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectionLoaded, setSelectionLoaded] = useState(!workspacePath);
  useEffect(() => {
    if (!workspacePath) return;
    let cancelled = false;
    void window.electronAPI.invoke("workspace:get-state", workspacePath).then(state => {
      if (cancelled || selectionTouched.current) return;
      const saved = state?.cloudflareSandboxSelection;
      if (typeof saved?.profileName === "string") savedSelection.current = saved;
    }).catch(() => { if (!cancelled) setSelectionError(t('errors.selection_load')); })
      .finally(() => { if (!cancelled) setSelectionLoaded(true); });
    return () => { cancelled = true; accountsRequest.current++; };
  }, [workspacePath, t]);
  const [prerequisites, setPrerequisites] = useState<CloudflareSandboxPrerequisites | null>(null);
  const [prerequisitesError, setPrerequisitesError] = useState<CloudflareSandboxError | null>(null);
  const [prerequisitesLoading, setPrerequisitesLoading] = useState(true);

  const [profiles, setProfiles] = useState<WranglerProfile[] | null>(null);
  const [profilesError, setProfilesError] = useState<CloudflareSandboxError | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  const [accounts, setAccounts] = useState<CloudflareAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState<CloudflareSandboxError | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [plan, setPlan] = useState<DeploymentPlan | null>(null);
  const [planError, setPlanError] = useState<CloudflareSandboxError | null>(null);
  const [planAcknowledged, setPlanAcknowledged] = useState(false);

  const [deployment, setDeployment] = useState<SandboxDeployment | null>(null);
  const [deploymentError, setDeploymentError] = useState<CloudflareSandboxError | null>(null);
  const [deploymentLoadError, setDeploymentLoadError] = useState<CloudflareSandboxError | null>(null);
  const [deploymentLoading, setDeploymentLoading] = useState(true);
  const [operation, setOperation] = useState<PendingOperation>('none');

  // Monotonic tokens: a response is applied only if it belongs to the latest
  // request for that family. Without these, switching profiles while an
  // account list is in flight lands the old profile's accounts under the new
  // profile — a wrong-account deployment one click away. A plan needs no token:
  // it names the profile and account it describes, so `planAppliesTo` is the
  // single test of whether it still applies.
  const profilesRequest = useRef(0);
  const accountsRequest = useRef(0);
  // A deploy, a wake/stop, or a delete produces a NEWER record than any read
  // already in flight. Bumping the generation on those writes means a slow
  // get-deployment cannot overwrite the result of an action the user just
  // took — including resurrecting a deployment they just deleted.
  const deploymentGeneration = useRef(0);
  const deploymentRequest = useRef(0);

  /** Applies an authoritative write and invalidates any in-flight read. */
  const applyDeployment = useCallback((next: SandboxDeployment | null) => {
    deploymentGeneration.current += 1;
    setDeployment(next);
    setDeploymentLoadError(null);
  }, []);

  const loadPrerequisites = useCallback(async () => {
    setPrerequisitesLoading(true);
    setPrerequisitesError(null);
    const response = await invokeSandbox<CloudflareSandboxPrerequisites>(
      CLOUDFLARE_SANDBOX_CHANNELS.getPrerequisites,
    );
    if (response.success) setPrerequisites(response.data);
    else {
      setPrerequisites(null);
      setPrerequisitesError(response.error);
    }
    setPrerequisitesLoading(false);
  }, []);

  const loadProfiles = useCallback(async () => {
    const token = ++profilesRequest.current;
    setProfilesLoading(true);
    setProfilesError(null);
    const response = await invokeSandbox<WranglerProfile[]>(CLOUDFLARE_SANDBOX_CHANNELS.listProfiles);
    if (token !== profilesRequest.current) return;
    if (response.success) setProfiles(response.data);
    else {
      setProfiles(null);
      setProfilesError(response.error);
    }
    setProfilesLoading(false);
  }, []);

  const loadDeployment = useCallback(async () => {
    const generation = deploymentGeneration.current;
    const token = ++deploymentRequest.current;
    setDeploymentLoading(true);
    setDeploymentLoadError(null);
    const response = await invokeSandbox<SandboxDeployment | null>(
      CLOUDFLARE_SANDBOX_CHANNELS.getDeployment,
    );
    // Superseded by a newer read, or by a write that happened while this was
    // in flight. Either way this answer is older than what is on screen.
    if (token !== deploymentRequest.current) return;
    if (generation !== deploymentGeneration.current) return;
    setDeploymentLoading(false);
    if (response.success) setDeployment(response.data);
    // A failed read is not evidence the sandbox is gone. Keep the last known
    // record and say the read failed, so a transient IPC error cannot present
    // itself as "no deployment".
    else setDeploymentLoadError(response.error);
  }, []);

  useEffect(() => {
    void loadPrerequisites();
    void loadProfiles();
    void loadDeployment();
  }, [loadPrerequisites, loadProfiles, loadDeployment]);

  /** Any selection change makes an existing plan describe the wrong thing. */
  const invalidatePlan = useCallback(() => {
    setPlan(null);
    setPlanError(null);
    setPlanAcknowledged(false);
  }, []);

  const handleSelectProfile = useCallback(
    async (profileName: string, restoredAccount?: string | null) => {
      if (restoredAccount === undefined) saveSelection(profileName, null);
      setSelectedProfileName(profileName);
      setSelectedAccountId(null);
      setAccounts(null);
      setAccountsError(null);
      invalidatePlan();

      const token = ++accountsRequest.current;
      setAccountsLoading(true);
      const response = await invokeSandbox<CloudflareAccount[]>(
        CLOUDFLARE_SANDBOX_CHANNELS.listAccounts,
        { profileName },
      );
      if (token !== accountsRequest.current) return;
      if (response.success) {
        setAccounts(response.data);
        if (restoredAccount && response.data.some(account => account.id === restoredAccount)) setSelectedAccountId(restoredAccount);
      }
      else setAccountsError(response.error);
      setAccountsLoading(false);
    },
    [invalidatePlan, saveSelection],
  );

  useEffect(() => {
    if (!selectionLoaded || !profiles || selectionTouched.current) return;
    const saved = savedSelection.current;
    savedSelection.current = null;
    if (saved && profiles.some(profile => profile.name === saved.profileName)) void handleSelectProfile(saved.profileName, saved.accountId);
  }, [selectionLoaded, profiles, handleSelectProfile]);

  const handleSignIn = useCallback(
    async (name: string, reauthenticate: boolean) => {
      if (!name.trim() || operation !== 'none') return;
      setOperation('signing-in');
      setProfilesError(null);
      const response = await invokeSandbox<WranglerProfile>(
        CLOUDFLARE_SANDBOX_CHANNELS.createProfile,
        { name: name.trim(), reauthenticate },
      );
      setOperation('none');
      if (!response.success) {
        setProfilesError(response.error);
        return;
      }
      setNewProfileName('');
      await loadProfiles();
      await handleSelectProfile(response.data.name);
    },
    [operation, loadProfiles, handleSelectProfile],
  );

  const handleReviewDeployment = useCallback(async () => {
    if (!selectedProfileName || !selectedAccountId || operation !== 'none') return;
    setOperation('planning');
    setPlanError(null);
    setPlanAcknowledged(false);
    const response = await invokeSandbox<DeploymentPlan>(
      CLOUDFLARE_SANDBOX_CHANNELS.planDeployment,
      { profileName: selectedProfileName, accountId: selectedAccountId },
    );
    setOperation('none');
    if (response.success) setPlan(response.data);
    else setPlanError(response.error);
  }, [selectedProfileName, selectedAccountId, operation]);

  const handleDeploy = useCallback(async () => {
    if (!planAcknowledged || operation !== 'none') return;
    if (!planAppliesTo(plan, selectedProfileName, selectedAccountId)) return;
    if (!selectedProfileName || !selectedAccountId) return;
    setOperation('deploying');
    setDeploymentError(null);
    const response = await invokeSandbox<SandboxDeployment>(CLOUDFLARE_SANDBOX_CHANNELS.deploy, {
      planId: plan.planId,
      profileName: selectedProfileName,
      accountId: selectedAccountId,
    });
    setOperation('none');
    if (response.success) {
      applyDeployment(response.data);
      invalidatePlan();
    } else {
      setDeploymentError(response.error);
    }
  }, [
    plan,
    planAcknowledged,
    selectedProfileName,
    selectedAccountId,
    operation,
    invalidatePlan,
    applyDeployment,
  ]);

  const selectedProfile = profiles?.find((profile) => profile.name === selectedProfileName) ?? null;
  const profileNameError = newProfileNameError(newProfileName);
  const prerequisitesReady = prerequisites?.ready === true;
  const profileReady = selectedProfile?.authenticated === true;
  const planMatchesSelection = planAppliesTo(plan, selectedProfileName, selectedAccountId);
  const canReview = prerequisitesReady && profileReady && !!selectedAccountId && operation === 'none';
  const canDeploy = canReview && planMatchesSelection && planAcknowledged;

  return (
    <div className="cloudflare-sandboxes-panel provider-panel flex flex-col" data-testid="cloudflare-sandboxes-panel">
      <div className="provider-panel-header mb-2 pb-4 border-b border-[var(--nim-border)]">
        <h3 className="provider-panel-title text-xl font-semibold leading-tight mb-1.5 text-[var(--nim-text)]">
          {t('title')}
        </h3>
        <p className="provider-panel-description text-[13px] leading-relaxed text-[var(--nim-text-muted)]">
          {t('description')}
        </p>
      </div>

      {/* 1. Prerequisites */}
      <section className={sectionClass} data-testid="cloudflare-prerequisites-section">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h4 className={headingClass}>{t('prerequisites.title')}</h4>
          <button
            className={buttonClass}
            onClick={() => void loadPrerequisites()}
            disabled={prerequisitesLoading}
            data-testid="cloudflare-recheck-prerequisites"
          >
            {prerequisitesLoading ? t('actions.checking') : t('actions.recheck')}
          </button>
        </div>
        {prerequisitesError ? (
          <ErrorNote message={errorMessage(prerequisitesError)} />
        ) : prerequisites ? (
          <ul className="flex flex-col gap-1.5">
            <PrerequisiteRow
              testId="cloudflare-prereq-wrangler"
              ok={prerequisites.wrangler.installed && prerequisites.wrangler.supportsProfiles}
              label={
                !prerequisites.wrangler.installed
                  ? t('prerequisites.wrangler_missing')
                  : !prerequisites.wrangler.supportsProfiles
                    ? t('prerequisites.wrangler_unsupported', { version: prerequisites.wrangler.version ?? '' }).trim()
                    : `Wrangler ${prerequisites.wrangler.version ?? ''}`.trim()
              }
              hint={
                prerequisites.wrangler.installed
                  ? undefined
                  : t('prerequisites.install_wrangler_hint')
              }
            />
          </ul>
        ) : (
          <p className={hintClass}>{t('prerequisites.checking_machine')}</p>
        )}
      </section>

      {/* 2. Wrangler profile */}
      <section className={sectionClass} data-testid="cloudflare-profile-section">
        <h4 className={headingClass}>{t('profile.title')}</h4>
        <p className={hintClass}>
          {t('profile.description')}
        </p>

        {profilesLoading && !profiles ? (
          <p className={`${hintClass} mt-3`}>{t('profile.loading')}</p>
        ) : (
          <div className="flex flex-col gap-1.5 mt-3" role="radiogroup" aria-label={t('profile.aria_label')}>
            {(profiles ?? []).map((profile) => (
              <label
                key={profile.name}
                className="flex items-center gap-2.5 text-[13px] text-[var(--nim-text)] cursor-pointer"
              >
                <input
                  type="radio"
                  name="cloudflare-wrangler-profile"
                  value={profile.name}
                  checked={selectedProfileName === profile.name}
                  onChange={() => void handleSelectProfile(profile.name)}
                  data-testid={`cloudflare-profile-${profile.name}`}
                />
                <span>{profile.name}</span>
                {profile.identity && (
                  <span className="text-[12px] text-[var(--nim-text-muted)]">{profile.identity}</span>
                )}
                {!profile.authenticated && (
                  <span className="text-[12px] text-[var(--nim-warning)]">{t('profile.signed_out')}</span>
                )}
              </label>
            ))}
            {profiles?.length === 0 && (
              <p className={hintClass} data-testid="cloudflare-no-profiles">
                {t('profile.empty')}
              </p>
            )}
          </div>
        )}

        {selectedProfile && !selectedProfile.authenticated && (
          <button
            className={`${buttonClass} mt-3`}
            onClick={() => void handleSignIn(selectedProfile.name, true)}
            disabled={operation !== 'none'}
            data-testid="cloudflare-reauthenticate"
          >
            {operation === 'signing-in' ? t('profile.waiting_for_browser') : t('profile.sign_in_again', { profile: selectedProfile.name })}
          </button>
        )}

        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            className="px-2.5 py-1.5 text-[13px] bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-md text-[var(--nim-text)] outline-none focus:border-[var(--nim-primary)]"
            placeholder={t('profile.new_name_placeholder')}
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            data-testid="cloudflare-new-profile-name"
          />
          <button
            className={buttonClass}
            onClick={() => void handleSignIn(newProfileName, false)}
            disabled={
              operation !== 'none'
              || newProfileName.trim().length === 0
              || newProfileNameError(newProfileName) !== null
            }
            data-testid="cloudflare-sign-in"
          >
            {operation === 'signing-in' ? t('profile.waiting_for_browser') : t('profile.sign_in_cloudflare')}
          </button>
        </div>
        {profileNameError && (
          <p
            className="text-[12px] text-[var(--nim-error)] mt-2"
            role="alert"
            data-testid="cloudflare-new-profile-name-error"
          >
            {profileNameError.key === 'profile_errors.reserved'
              ? t(profileNameError.key, { profileName: profileNameError.profileName })
              : t(profileNameError.key)}
          </p>
        )}
        {profilesError && <ErrorNote message={errorMessage(profilesError)} />}
      </section>

      {/* 3. Account */}
      <section className={sectionClass} data-testid="cloudflare-account-section">
        <h4 className={headingClass}>{t('account.title')}</h4>
        {selectionError && <p role="alert" className={hintClass}>{selectionError}</p>}
        <p className={hintClass}>
          {t('account.description')}
        </p>
        {!selectedProfileName ? (
          <p className={`${hintClass} mt-3`} data-testid="cloudflare-account-blocked">
            {t('account.select_profile_first')}
          </p>
        ) : accountsLoading ? (
          <p className={`${hintClass} mt-3`}>{t('account.loading')}</p>
        ) : accountsError ? (
          <ErrorNote message={errorMessage(accountsError)} />
        ) : (
          <select
            className="mt-3 w-full max-w-sm px-2.5 py-2 text-[13px] bg-[var(--nim-bg)] border border-[var(--nim-border)] rounded-md text-[var(--nim-text)] outline-none focus:border-[var(--nim-primary)]"
            value={selectedAccountId ?? ''}
            onChange={(event) => {
              setSelectedAccountId(event.target.value || null);
              if (selectedProfileName) saveSelection(selectedProfileName, event.target.value || null);
              invalidatePlan();
            }}
            data-testid="cloudflare-account-select"
            aria-label={t('account.aria_label')}
          >
            <option value="">{t('account.select')}</option>
            {(accounts ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* 4. Review and deploy */}
      <section className={sectionClass} data-testid="cloudflare-deploy-section">
        <h4 className={headingClass}>{t('deploy.title')}</h4>
        <p className={hintClass}>
          {t('deploy.description')}
        </p>

        <button
          className={`${buttonClass} mt-3`}
          onClick={() => void handleReviewDeployment()}
          disabled={!canReview}
          data-testid="cloudflare-review-deployment"
        >
          {operation === 'planning' ? t('deploy.preparing_review') : t('deploy.review')}
        </button>
        {planError && <ErrorNote message={errorMessage(planError)} />}

        {planMatchesSelection && plan && (
          <div
            className="cloudflare-deployment-plan mt-4 p-3 rounded-lg border border-[var(--nim-border)] bg-[var(--nim-bg-secondary)]"
            data-testid="cloudflare-deployment-plan"
          >
            <p className="text-[13px] text-[var(--nim-text)] mb-2">
              {t('deploy.deploying_to')}<strong>{plan.account.name}</strong>{t('deploy.using_profile')}
              <strong>{plan.profileName}</strong>.
            </p>
            <ul className="flex flex-col gap-1 mb-3">
              {plan.resources.map((resource) => (
                <li key={`${resource.kind}:${resource.name}`} className="text-[12px] text-[var(--nim-text-muted)]">
                  {resource.action === 'create' ? t('deploy.resource_create') : resource.action === 'update' ? t('deploy.resource_update') : t('deploy.resource_reuse')}
                  {' '}{resource.kind} <span className="text-[var(--nim-text)]">{resource.name}</span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-[var(--nim-text-muted)] mb-2" data-testid="cloudflare-plan-container">
              {t('deploy.container')}: {plan.container.instanceType}, {t('deploy.at_most')} {plan.container.maxInstances}{' '}
              {t('deploy.instance_count', { count: plan.container.maxInstances })}, {t('deploy.sleeping_after')}{' '}
              {plan.container.sleepAfterMinutes} {t('deploy.minutes_idle')}.
            </p>
            {plan.requiresPaidPlan && (
              <p className="text-[12px] text-[var(--nim-warning)] mb-2">
                {t('deploy.paid_plan_required', { account: plan.account.name })}
              </p>
            )}
            {plan.costNotes.map((note, index) => (
              <p key={note} className="text-[12px] text-[var(--nim-text-muted)] mb-1">
                {index === 0
                  ? t('deploy.cost_note_paid')
                  : index === 1
                    ? t('deploy.cost_note_runtime', { instanceType: plan.container.instanceType })
                    : index === 2
                      ? t('deploy.cost_note_resources')
                      : index === 3
                        ? t('deploy.cost_note_limits', { maxInstances: plan.container.maxInstances, sleepAfterMinutes: plan.container.sleepAfterMinutes })
                        : note}
              </p>
            ))}
            <label className="flex items-center gap-2 mt-3 text-[13px] text-[var(--nim-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={planAcknowledged}
                onChange={(event) => setPlanAcknowledged(event.target.checked)}
                data-testid="cloudflare-acknowledge-plan"
              />
              {t('deploy.acknowledgement')}
            </label>
          </div>
        )}

        <div className="mt-3">
          <button
            className={primaryButtonClass}
            onClick={() => void handleDeploy()}
            disabled={!canDeploy}
            data-testid="cloudflare-deploy"
          >
            {operation === 'deploying' ? t('deploy.deploying') : t('deploy.deploy_sandbox')}
          </button>
        </div>
        {deploymentError && <ErrorNote message={errorMessage(deploymentError)} />}
      </section>

      {/* Deployed sandbox. A deploy is not a running container, so lifecycle
          state lives in its own card with its own separate container line. */}
      {deploymentLoadError && (
        <div className="cloudflare-deployment-load-error py-4" data-testid="cloudflare-deployment-load-error">
          <p className="text-[13px] text-[var(--nim-error)]" role="alert">
            {deployment
              ? t('deployment.refresh_failed', { error: errorMessage(deploymentLoadError) })
              : t('deployment.read_failed', { error: errorMessage(deploymentLoadError) })}
          </p>
          <button
            className={`${buttonClass} mt-2`}
            onClick={() => void loadDeployment()}
            disabled={deploymentLoading}
            data-testid="cloudflare-retry-deployment-load"
          >
            {deploymentLoading ? t('actions.retrying') : t('actions.retry')}
          </button>
        </div>
      )}

      {deployment && deployment.status !== 'not-deployed' && (
        <CloudflareSandboxStatusCard
          deployment={deployment}
          onDeploymentChange={applyDeployment}
          onRefresh={() => void loadDeployment()}
        />
      )}

    </div>
  );
}

function PrerequisiteRow({
  ok,
  label,
  hint,
  testId,
}: {
  ok: boolean;
  label: string;
  hint?: string;
  testId: string;
}): JSX.Element {
  return (
    <li className="flex items-start gap-2 text-[13px] text-[var(--nim-text)]" data-testid={testId}>
      <MaterialSymbol
        icon={ok ? 'check_circle' : 'error'}
        size={16}
        className={ok ? 'text-[var(--nim-success)] shrink-0 mt-0.5' : 'text-[var(--nim-warning)] shrink-0 mt-0.5'}
      />
      <span>
        {label}
        {hint && <span className="block text-[12px] text-[var(--nim-text-muted)]">{hint}</span>}
      </span>
    </li>
  );
}
