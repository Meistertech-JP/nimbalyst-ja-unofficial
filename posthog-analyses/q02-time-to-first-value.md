# Question 2: Time-to-First-Value for New Users

This is a historical upstream analysis, not current telemetry or acceptance evidence for the unofficial Japanese edition. Reported output is retained below but has not been independently re-queried. The tables use different subsets (472, 159 and 197 users); their denominators must not be interchanged. Without raw output and censoring/selection checks, the reported 100% values do not establish universal activation, and no statistical confidence level is provided.

## Research Question

What is the time-to-first-value for new users: how long between app launch and their first meaningful action (file saved with 500+ words, workspace opened, or AI session started)?

## Query Used

Multiple HogQL queries were used to analyze this question. All queries filtered out cohort ID 200405 (test/internal users) and used data from 2025-11-14 onward (when events were first tracked).

### User Adoption Rates
```sql
WITH user_sessions AS (
  SELECT person_id, min(timestamp) AS first_session
  FROM events
  WHERE event = 'nimbalyst_session_start'
    AND timestamp >= '2025-11-14'
    AND person_id NOT IN (
      SELECT person_id FROM cohort_people WHERE cohort_id = 200405
    )
  GROUP BY person_id
),
workspace_opens AS (
  SELECT person_id, min(timestamp) AS first_workspace
  FROM events
  WHERE event = 'workspace_opened'
    AND timestamp >= '2025-11-14'
    AND person_id NOT IN (
      SELECT person_id FROM cohort_people WHERE cohort_id = 200405
    )
  GROUP BY person_id
),
ai_sessions AS (
  SELECT person_id, min(timestamp) AS first_ai
  FROM events
  WHERE event = 'create_ai_session'
    AND timestamp >= '2025-11-14'
    AND person_id NOT IN (
      SELECT person_id FROM cohort_people WHERE cohort_id = 200405
    )
  GROUP BY person_id
),
file_saves AS (
  SELECT person_id, min(timestamp) AS first_save
  FROM events
  WHERE event = 'file_saved'
    AND timestamp >= '2025-11-14'
    AND person_id NOT IN (
      SELECT person_id FROM cohort_people WHERE cohort_id = 200405
    )
  GROUP BY person_id
)
SELECT
  count(DISTINCT s.person_id) AS total_users,
  countIf(w.first_workspace IS NOT NULL) AS users_opened_workspace,
  countIf(a.first_ai IS NOT NULL) AS users_created_ai,
  countIf(f.first_save IS NOT NULL) AS users_saved_file,
  countIf(w.first_workspace IS NOT NULL OR a.first_ai IS NOT NULL
    OR f.first_save IS NOT NULL) AS users_with_any_action
FROM user_sessions s
LEFT JOIN workspace_opens w ON s.person_id = w.person_id
LEFT JOIN ai_sessions a ON s.person_id = a.person_id
LEFT JOIN file_saves f ON s.person_id = f.person_id
```

### Time-to-First-Action Statistics
```sql
WITH user_sessions AS (...),
workspace_opens AS (...),
ai_sessions AS (...),
file_saves AS (...)
SELECT
  quantile(0.5)(dateDiff('second', s.first_session, w.first_workspace))
    AS median_seconds_to_workspace,
  quantile(0.5)(dateDiff('second', s.first_session, a.first_ai))
    AS median_seconds_to_ai,
  quantile(0.5)(dateDiff('second', s.first_session, f.first_save))
    AS median_seconds_to_save,
  quantile(0.25)(dateDiff('second', s.first_session, w.first_workspace))
    AS p25_to_workspace,
  quantile(0.75)(dateDiff('second', s.first_session, w.first_workspace))
    AS p75_to_workspace,
  quantile(0.25)(dateDiff('second', s.first_session, a.first_ai))
    AS p25_to_ai,
  quantile(0.75)(dateDiff('second', s.first_session, a.first_ai))
    AS p75_to_ai
FROM user_sessions s
INNER JOIN workspace_opens w ON s.person_id = w.person_id
INNER JOIN ai_sessions a ON s.person_id = a.person_id
INNER JOIN file_saves f ON s.person_id = f.person_id
```

### Meaningful File Saves (500+ words)

Note: `wordCount` property is bucketed as:
- **small**: < 500 words
- **medium**: 500-1999 words
- **large**: ≥ 2000 words

```sql
WITH user_sessions AS (...),
meaningful_saves AS (
  SELECT person_id, min(timestamp) AS first_meaningful_save
  FROM events
  WHERE event = 'file_saved'
    AND properties.wordCount IN ('medium', 'large')
    AND timestamp >= '2025-11-14'
    AND person_id NOT IN (
      SELECT person_id FROM cohort_people WHERE cohort_id = 200405
    )
  GROUP BY person_id
)
SELECT
  count(DISTINCT s.person_id) AS total_users,
  countIf(m.first_meaningful_save IS NOT NULL) AS users_with_meaningful_save,
  round(countIf(m.first_meaningful_save IS NOT NULL) * 100.0
    / count(DISTINCT s.person_id), 2) AS pct_meaningful_save
FROM user_sessions s
LEFT JOIN meaningful_saves m ON s.person_id = m.person_id
```

## Raw Results

### Overall Adoption
- **Total users with session start**: 472
- **Users who opened workspace**: 472 (100%)
- **Users who created AI session**: 472 (100%)
- **Users who saved any file**: 472 (100%)
- **Users who saved meaningful file (500+ words)**: 472 (100%)

### Time to First Workspace
- **Median**: 28 seconds
- **P25**: 16 seconds
- **P75**: 58 seconds
- **P90**: 229 seconds (3.8 minutes)
- **P95**: 982 seconds (16.4 minutes)
- **P99**: 239,551 seconds (66.5 hours)

### Time to First AI Session
- **Median**: 30 seconds
- **P25**: 17 seconds
- **P75**: 59 seconds

### Time to First File Save (any size)
- **Median**: 1,050 seconds (17.5 minutes)
- **Distribution within first 5 minutes**: 50 users (10.6%)
- **Distribution 5-30 minutes**: 60 users (12.7%)

### Time to First Meaningful File Save (500+ words)
- **Median**: 1,936 seconds (32.3 minutes)
- **P25**: 431 seconds (7.2 minutes)
- **P75**: 35,264 seconds (9.8 hours)
- **Min**: 47 seconds
- **Max**: 1,991,341 seconds (23 days)

### First Action Distribution
Among the 159 users with all three actions (subset of data):
- **Workspace first**: 158 users (99.4%)
- **AI session first**: 1 user (0.6%)
- **Meaningful file save first**: 0 users (0%)

### Time Bucket Distribution for Each Action

**Workspace within 30 seconds**: 107 users (54.3% of subset)
**Workspace 30-60 seconds**: 41 users (20.8%)
**Workspace 1-5 minutes**: 35 users (17.8%)

**AI within 1 minute**: 148 users (75.1%)
**AI 1-5 minutes**: 36 users (18.3%)

## Visualizations

### Time to First Workspace
```
0-30 sec:  ████████████████████████████ 54.3% (107)
31-60 sec: ████████                     20.8% (41)
1-5 min:   ███████                      17.8% (35)
5+ min:    ███                           7.1% (14)
```

### Time to First AI Session
```
0-60 sec:  ██████████████████████████████████ 75.1% (148)
1-5 min:   ████████                           18.3% (36)
5+ min:    ███                                 6.6% (13)
```

### Time to First Meaningful File Save
```
Median:    32.3 minutes
P25:        7.2 minutes
P75:        9.8 hours
```

### First Action Type (What Users Do First)
```
Workspace:        ████████████████████████████████████ 99.4% (158)
AI Session:       ▌                                     0.6% (1)
Meaningful Save:                                        0.0% (0)
```

## Takeaways

### 1. Reported 100% values require population validation

The recorded aggregate table reports 472 users for each of these actions:
- Opens a workspace
- Creates an AI session
- Saves a file (including a 500+ word file)

This does not establish that every new user completes the actions. Check the query joins, missing-event handling, observation window and non-completing users before treating it as an activation funnel. Onboarding quality and absence of friction cannot be concluded from this table alone.

### 2. Reported Median Time-to-First-Value

**Median time to workspace open: 28 seconds**
**Median time to AI session: 30 seconds**

These are reported medians among the query's completed-event population, not a bound for every user, a cold-start benchmark or a direct measure of interface clarity. Launch performance, setup barriers and workflow usability need separate measurement.

### 3. Workspace Opening Was First for 158 of 159 Selected Users

Among the 159 selected users with all three actions, 158 opened a workspace first. This subset excludes users missing one of those actions. The following sequence combines reported aggregate medians; it is not an individual user trace:

**App Launch → Workspace Open (28s) → AI Session (30s) → File Save (17.5 min) → Meaningful File Save (32 min)**

One workflow hypothesis to investigate, rather than an observed individual sequence, is:
1. Select/open a workspace (project context)
2. Start an AI session (likely for assistance)
3. Create and save content

### 4. File Saving Takes Significantly Longer

The reported file-save medians are longer than the workspace and AI-session medians; these aggregate values do not describe every user's sequence:
- **Any file save**: Median 17.5 minutes
- **Meaningful file save (500+ words)**: Median 32.3 minutes

Possible explanations to investigate include time spent to:
- Interact with AI to generate content
- Edit and refine the content
- Accumulate enough content to warrant saving

### 5. Wide Distribution in Meaningful File Save Timing

The time to first meaningful file save varies dramatically:
- **Fastest**: 47 seconds
- **P25**: 7.2 minutes
- **Median**: 32.3 minutes
- **P75**: 9.8 hours
- **Longest**: 23 days

Possible timing groups for follow-up research are listed below. The counts alone do not establish these personas or their reasons for acting:
- **Power users**: Immediately productive (< 10 minutes)
- **Explorers**: Take time to learn (30 min - 2 hours)
- **Returners**: Try the app, leave, come back later (hours to days)

### 6. AI-session Timing in the 197-user Subset

The time-bucket subset records 148 of 197 users (75.1%) creating an AI session within 60 seconds. This is not 75% of all 472 users, and it does not establish why they acted or whether the interaction was frictionless.

## Suggested Actions / Product Direction

### 1. Optimize the Critical First 30 Seconds

**Recorded observation**: Median workspace and AI-session times are 28 and 30 seconds in the reported query output, not a completion bound for every user.

**Recommendations**:
- Ensure this flow remains fast and reliable in all future updates
- Performance test the workspace opening flow regularly
- Track and alert on any regression in these metrics
- Consider this 30-second window as the "make or break" moment for new users

### 2. Validate the reported activation denominator

**Recorded observation**: The aggregate table reports 100% for 472 selected users; the selection and completeness of that population need validation.

**Recommendations**:
- Do not use this unvalidated result as a marketing claim.
- Reproduce the query with explicit denominators and include non-completing users.
- Define the conversion window and treatment of censored observations before establishing an alert baseline.

### 3. Study the Workspace-First Pattern

**Recorded observation**: 158 of the 159 users selected for having all three actions opened a workspace first. Users without all actions are not represented in that percentage.

**Recommendations**:
- Optimize the workspace selection/opening experience as the primary entry point
- Consider workspace opening as the true "first value" moment
- Ensure workspace opening is fast even for large directories
- Investigate the 1 user who went to AI first - what was different about their flow?

### 4. Support Different User Pacing for File Creation

**Finding**: Wide variance in time to first meaningful file save (7 min to 23 days).

**Recommendations**:
- Don't pressure users to create content immediately
- Provide "quick start" templates for users who want to be productive in < 10 minutes
- Allow exploration mode for users who want to learn before creating
- Track "dormant" users (opened workspace but no meaningful saves in 24 hours) for potential re-engagement

### 5. Monitor for Activation Degradation

**Hypothesis to investigate**: Changes in observed activation may reflect product behavior, instrumentation or population changes; a validated baseline is required.

**Recommendations**:
- Set alert thresholds only after validating the population and historical variability
- Track median time-to-workspace and alert if it exceeds 60 seconds
- A/B test any onboarding changes carefully before full rollout
- Create a daily dashboard showing these activation metrics

### 6. Investigate the 99th Percentile Outliers

**Finding**: Some users take 66+ hours to open workspace, 23 days to save meaningful files.

**Recommendations**:
- Investigate if these are abandoned sessions or genuine delayed activation
- Consider automated check-ins for users who haven't completed actions within expected timeframes
- Determine if these users eventually become active or churn
- May indicate users who downloaded app but weren't ready to use it

### 7. Validate AI-session timing before using it publicly

**Recorded observation**: 148 of 197 users in the time-bucket subset created an AI session within 60 seconds; this is not a general product guarantee.

**Recommendations**:
- Reproduce the metric and its population before using it in public material.
- Do not infer comparative usability without a suitable comparison and direct usability evidence.
- Consider showcasing the AI session creation flow in demos and tutorials
- Do not use these aggregate timings alone to support a product-positioning claim

## Confidence Level

No calculated statistical confidence level is established here. The original 95% judgment was not a confidence interval or independent validation of the queries.

### Recorded observations and limits:
- **Sample size**: 472 recorded users alone does not establish statistical significance or freedom from selection bias
- **Reported 100% adoption**: Requires verification of the denominator and missing observations
- **Workspace-first subset**: 158 of 159 selected users; not a population-wide result
- **Event timestamps**: Their precision and meaning require instrumentation checks
- **Start-date filter**: A shared cutoff does not establish complete or unbiased data

### Additional limitations:
- **Word count bucketing**: We know "medium" or "large" = 500+ words, but can't distinguish between 500 words and 2000+ words
- **Session definition**: We assume `nimbalyst_session_start` represents true app launch, but some users may have multiple sessions
- **Outliers**: The 23-day maximum suggests some users may be returning after abandonment, not continuously using

### Checks still required before relying on the results:
- Reproduce cohort exclusion and establish the actual query population
- Check event availability, timestamps and instrumentation changes
- Validate sample selection and the precision needed for each comparison
- Check event semantics; automatic emission alone does not establish measurement accuracy

## Recommended Follow-up Analysis

1. **User personas by timing**: Cluster users into "Fast" (< 10 min to meaningful save), "Moderate" (10 min - 2 hours), and "Delayed" (2+ hours) groups and analyze their retention
2. **Workspace characteristics**: Do users who open larger workspaces (more files) take longer to create meaningful saves?
3. **AI usage correlation**: Is there a relationship between number of AI messages sent and time to first meaningful file save?
4. **Return user analysis**: For the users taking 23 days, did they churn and return, or were they using the app intermittently?
5. **File type analysis**: Does the type of file (markdown, code, mockup) affect time to first save?
6. **Platform comparison**: Does time-to-first-value differ between desktop (Electron) and mobile (Capacitor)?
