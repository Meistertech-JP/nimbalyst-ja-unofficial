# Question 12: Slash Command Usage Analysis

This is a historical upstream analysis of aggregate events from 2025–2026, not telemetry from the unofficial Japanese edition. The recorded counts below have not been independently re-queried here. Messages, clicks, sessions and unique users are different populations; unmatched totals do not establish discovery, conversion, repeat use or a user-adoption rate. Product suggestions are hypotheses for further research, not measured causes.

## Research Question

What percentage of AI chat messages use slash commands, which slash commands are most frequently used, and how do users discover them (suggestion pills vs manual typing)?

## Query Used

Multiple PostHog Trends queries were used to analyze slash command usage. Note: Complex HogQL queries with user-level analysis timed out due to database performance issues, so we relied on event-level trends aggregations.

### Overall Slash Command Usage
```
Trends Query:
- Event: ai_message_sent
- Property filter: usedSlashCommand = true
- Date range: 2025-12-10 to 2026-01-05
- Comparison: All ai_message_sent events vs. those with usedSlashCommand
```

### Slash Command Breakdown
```
Trends Query with Breakdown:
- Event: ai_message_sent (where usedSlashCommand = true)
- Breakdown by: slashCommandName property
- Display: ActionsTable (to see aggregated counts)
```

### Suggestion Pill Clicks
```
Trends Query:
- Event: slash_command_suggestion_clicked
- Breakdown by: commandName property
- Date range: 2025-12-10 to 2026-01-05
```

## Raw Results

### Overall Usage (Dec 10, 2025 - Jan 5, 2026)

**Total AI Messages**: 11,007
**Messages with Slash Commands**: 58
**Slash Command Usage Rate**: 0.53%

### Slash Commands Used in Messages

| Slash Command | Count | Percentage of Slash Command Messages |
| --- | --- | --- |
| /plan | 41 | 70.7% |
| /mockup | 17 | 29.3% |
| **Total** | **58** | **100%** |

### Slash Command Suggestion Clicks

**Total Suggestion Clicks**: 47

| Command Clicked | Count | Percentage |
| --- | --- | --- |
| datamodellm:datamodel | 16 | 34.0% |
| plan | 12 | 25.5% |
| mockup | 6 | 12.8% |
| roadmap | 3 | 6.4% |
| track | 3 | 6.4% |
| write-tests | 3 | 6.4% |
| analyze-code | 2 | 4.3% |
| user-research | 2 | 4.3% |
| **Total** | **47** | **100%** |

### Discovery Method Comparison

**Commands actually used**: 58 messages
**Suggestion pills clicked**: 47 events

The numerical ratio of these totals is 47/58, approximately 81%. It is not the share of uses discovered through suggestions. Clicks have not been joined to messages or users, and subtracting 47 from 58 does not identify manually typed uses. The discovery split remains unknown.

## Visualizations

### Slash Command Usage Rate
```
Messages without slash commands: ████████████████████████████████████ 99.47% (10,949)
Messages with slash commands:    ▌                                     0.53% (58)
```

### Top Slash Commands Used
```
/plan:    ██████████████████████████████ 70.7% (41)
/mockup:  ████████████                   29.3% (17)
```

### Top Suggestion Pills Clicked
```
datamodellm:datamodel: ██████████████████ 34.0% (16)
plan:                  █████████████      25.5% (12)
mockup:                ██████             12.8% (6)
roadmap:               ███                 6.4% (3)
track:                 ███                 6.4% (3)
write-tests:           ███                 6.4% (3)
analyze-code:          ██                  4.3% (2)
user-research:         ██                  4.3% (2)
```

### Aggregate totals, not a discovery funnel
```
Suggestion clicks recorded: 47
Slash-command messages recorded: 58
Click-to-message attribution: not measured
```

### Claude Code Sessions Without Slash Commands

**Total Claude Code Sessions (Nov 14 - Jan 5)**: 2,695
**Slash-command messages (Dec 10 - Jan 5)**: 58, not a count of sessions.

The session total covers a different observation window. Neither subtraction from 2,695 nor a unique-user percentage is justified by these message counts. Sessions without commands, users who have never used a command, and users who returned to a command remain unmeasured.

## Takeaways

### 1. Recorded slash-command message share (0.53%)

About 1 in 189 recorded AI messages carries the slash-command property. This is a message share, not a unique-user adoption rate or evidence of product differentiation.

**Why this matters**:
- Slash commands provide structured, predefined AI workflows
- Discoverability and perceived value are possible research questions, not conclusions from message share
- Messages without the property need not represent users who rejected guided commands

**Possible reasons for low adoption**:
- Users don't know slash commands exist
- The available commands don't match user needs
- Freeform chat is "good enough" for their use cases
- Slash command UI is not prominent enough

### 2. /plan Dominates Usage (71% of Slash Command Messages)

The recorded command-message breakdown contains 41 `/plan` and 17 `/mockup` messages. It does not establish preferences across unique users.

**Insights**:
- `/plan` is the most common command name in the recorded message breakdown.
- Whether it provides value beyond freeform chat needs separate investigation.
- The smaller `/mockup` count does not by itself establish a distinct user segment.

**Research direction**: Study the workflows behind these messages before drawing conclusions about command value.

### 3. Discovery attribution is not established

Suggestion pills received 47 recorded clicks. Without impression data and a user/session-level join to later messages, these counts do not show how many clicks led to use, how often commands were typed, or whether suggestions caused adoption.

### 4. Click and Message Breakdowns Contain Different Command Names

8 different commands were clicked (47 total clicks) but only 2 commands were actually used in messages (58 uses).

**Discrepancy analysis**:
- `datamodellm:datamodel`: 16 clicks but **NOT in top 2 used commands**
- `/plan`: 12 recorded clicks and 41 command messages; repeat use by the same users is not established
- `/mockup`: 6 recorded clicks and 17 command messages; repeat use by the same users is not established

**Interpretation**:
- Different event names, instrumentation coverage or populations may explain the discrepancy; the recorded tables alone do not distinguish them.
- `datamodellm:datamodel` accounts for 34% of clicks in this table, but its follow-through is unknown.
- More messages than clicks does not measure repeat users or comparative value.

### 5. Available Commands and Observed Names Need Coverage Checks

8 different commands were clicked via suggestions:
- datamodellm:datamodel, plan, mockup, roadmap, track, write-tests, analyze-code, user-research

Only `/plan` and `/mockup` appear in the recorded message breakdown. Regular use by individual people is not established.

**Implications**:
- Whether the command set has a clear value proposition requires usability research
- Whether commands were tried once and abandoned is not established by these aggregates
- Do not remove commands on the basis of these aggregate counts alone

### 6. A click-to-use funnel requires linked events

There are 47 recorded suggestion-click events and 58 command messages. These are not sequential funnel stages with known membership. No unique-user totals, manual-entry count, conversion rate or causal effect of visibility can be inferred from this comparison.

## Suggested Actions / Product Direction

### 1. Test Slash Command Discoverability

**Recorded observation**: 99.47% of messages in this sample did not carry the slash-command property. User adoption and discovery source are unknown.

**Recommendations**:
- **Always show suggestion pills** for first-time users in every new AI session
- **Add slash command menu** to AI input (like Discord, Slack) with "/" trigger
- **In-app tutorial** specifically for slash commands during onboarding
- **Highlight in UI**: Add visual indicator (icon, button) for "Browse Slash Commands"
- **Track impressions**: Measure how many users SEE suggestions vs. click them

### 2. Double Down on /plan; Investigate /mockup

**Recorded observation**: /plan accounts for about 71% of the 58 command messages. Repeat adoption was not measured.

**Recommendations**:
- **Feature /plan prominently**: Make it the default suggestion shown to new users
- **Study /plan workflows**: Interview or survey users who use /plan to understand its value
- **Expand /plan capabilities**: If it's working, make it more powerful
- **Validate value before promotion**: Message counts alone are not effectiveness evidence
- **A/B test**: Show /plan suggestion to 100% of new AI sessions for one cohort

**For /mockup**:
- Accounts for 29% of the recorded command messages; comparative value and repeat users remain unknown
- Investigate if it should be promoted to specific user segments (designers, PMs)

### 3. Deprecate or Improve Underperforming Commands

**Recorded observation**: Six names in the click breakdown do not appear in the message breakdown. Check naming and instrumentation coverage before interpreting this as little or no use.

**Recommendations**:
- **Audit low-performing commands**: Why were they clicked but not used?
  - `datamodellm:datamodel`: 16 recorded clicks, but no corresponding name in the message table; first check event coverage
  - Interview users who clicked but didn't use
  - Check error logs for failures
- **Evaluate cognitive load**: Compare alternatives through usability research
- **Compare outcomes**: Do not rank command quality from aggregate frequency alone
- **Test and iterate**: For promising commands (datamodel?), fix issues and relaunch

### 4. Make Slash Commands a Standalone Feature

**Recorded observation**: Command messages comprise less than 1% of this sample; exposure, discovery and user adoption were not measured.

**Recommendations**:
- **Dedicated "Commands" panel**: Like Slack's slash command menu
- **Command palette (Cmd+K style)**: Universal shortcut to browse all commands
- **Empty state education**: When user creates first AI session, show "Try /plan to get started"
- **Success stories**: Show example outputs from slash commands to inspire use

### 5. Measure and Track the Full Funnel

**Finding**: We can't currently track user-level funnel (saw suggestion → clicked → used → returned).

**Recommendations**:
- **Add events**:
  - `slash_command_suggestion_shown` (currently not tracked)
  - `slash_command_menu_opened`
  - `slash_command_abandoned` (started typing "/" but didn't complete)
- **Calculate**:
  - Impression-to-click rate
  - Click-to-use rate
  - First-use-to-repeat rate
- **Set targets**: E.g., "Increase slash command usage from 0.53% to 5% of messages"

### 6. Investigate the datamodellm:datamodel measurement discrepancy

**Recorded observation**: 34% of suggestion clicks (16/47), with no corresponding command name in the message breakdown shown here. Whether those clicks led to later use is unknown.

**Questions for investigation**:
- Is the command broken? Check error logs.
- Is the output confusing? Test the command yourself.
- Is the name unclear? "datamodellm:datamodel" is not intuitive.
- Did users click by mistake?

**Research action**: Check event coverage and linked outcomes before attributing the discrepancy to a broken command or deciding to rebrand it.

### 7. Consider Renaming/Rebranding Slash Commands

**Hypothesis**: Technical names such as "datamodellm:datamodel" may be unclear to some users; this analysis did not test comprehension.

**Recommendations**:
- **Use clear, action-oriented names**:
  - `/plan` (short action-oriented example; effectiveness not measured here)
  - `/create-mockup` instead of `/mockup`?
  - `/build-datamodel` instead of `datamodellm:datamodel`
- **Add descriptions**: When showing suggestions, include a one-line "what this does"
- **Group by category**: "Planning", "Design", "Code", etc.

## Confidence Level

The counts are retained as historical query output. No statistical confidence level or independent raw-data validation is established by this document.

### Recorded evidence and its limits:
- **Recorded event counts**: 11,007 messages, 58 with slash commands, 47 suggestion clicks; not re-queried for this audit
- **Recorded breakdown**: /plan (41), /mockup (17); not counts of unique or returning users
- **Trends data worked**: Unlike retention queries, trends aggregations succeeded

### Limitations reducing confidence:
- **Cannot track user-level funnel**: Don't know if the same users click and use, or if they're different groups
- **Cannot calculate conversion rates**: The 81% aggregate ratio is not an estimate of suggestion-attributed usage, and its complement is not a manual-entry count
- **No impression data**: Don't know how many users SAW suggestions but didn't click
- **No cohort analysis**: Can't segment by user characteristics (new vs experienced, etc.)
- **Short time window**: Only 27 days of data (Dec 10 - Jan 5) since properties added
- **Test data possibly included**: Cannot filter by cohort ID 200405 due to database timeouts

### What we DON'T know:
- How many unique users used slash commands (vs. one power user using them 58 times)
- Repeat usage rate per user
- Whether suggestion clicks lead to immediate use or future use
- If users who try a slash command once come back to use it again
- Which user segments (by role, tenure, etc.) use slash commands

## Recommended Follow-up Analysis

**Once PostHog performance issues are resolved**:

1. **User-level funnel**: Track individual users through: saw suggestion → clicked → used → repeated use
2. **Power user identification**: Find users who use slash commands frequently and interview them
3. **Command effectiveness**: For each command, calculate: first use → second use retention
4. **Segmentation**: Do certain user types (roles from onboarding) prefer certain commands?
5. **Timing analysis**: How quickly after clicking a suggestion do users actually use the command?
6. **Competitive analysis**: Compare slash command usage to similar features in other tools

**Immediate next steps** (can do without PostHog):
1. **Qualitative research**: Interview 5-10 users about slash command awareness and usage
2. **Error log review**: Check if slash commands are failing silently
3. **UI audit**: Screenshot and review how prominently slash commands are presented
4. **dogfood**: Have team members use only slash commands for a week and report feedback
