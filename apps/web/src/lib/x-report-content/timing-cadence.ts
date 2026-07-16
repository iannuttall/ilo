import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const timingCadenceReportContent = {
  'best-posting-windows': {
    lead: 'Use the account history to choose a few posting windows worth testing, with timezone, sample size, topic mix, and post maturity kept visible.',
    question:
      'Which day and time windows have produced stronger results for this account, and which ones have enough repeated evidence to test again?',
    dataSources: [
      'Original public posts with exact timestamps, post URLs, formats, topics, and visible metrics.',
      'The account timezone or the audience timezone the analysis intends to use.',
      'A date range long enough to contain repeated posts in each candidate window.',
    ],
    bestFor: [
      'Selecting two or three account-specific windows for a future posting test.',
      'Replacing generic best-time advice with evidence from the actual account.',
      'Checking whether a supposed strong slot is driven by topic or one outlier.',
    ],
    evidence: [
      {
        label: 'Local timestamps',
        detail:
          'Convert every timestamp into one named timezone before grouping. Keep daylight-saving changes correct for the post date.',
      },
      {
        label: 'Window coverage',
        detail:
          'Show post count, active weeks, topics, and formats in every time bucket. A slot used twice is an anecdote, not a schedule.',
      },
      {
        label: 'Response distribution',
        detail:
          'Compare medians and above-baseline share for replies, reposts, bookmarks, and views. Keep isolated large posts marked.',
      },
    ],
    method: [
      {
        title: 'Set the clock and buckets',
        instruction:
          'Choose the analysis timezone and group posts into useful two-to-three-hour windows. Avoid dozens of tiny buckets that leave one post in each.',
        evidence:
          'Return the timezone, bucket boundaries, date range, and number of posts and active weeks per bucket.',
      },
      {
        title: 'Compare repeated windows',
        instruction:
          'Rank windows only after a minimum sample and repeated-week threshold. Compare topic and format mix so a regular launch slot does not become a universal recommendation.',
        evidence:
          'A candidate needs its median response, account baseline, outliers, and representative post URLs.',
      },
      {
        title: 'Plan a balanced test',
        instruction:
          'Choose one candidate and one ordinary comparison window. Alternate similar post types between them for several weeks rather than moving every post at once.',
        evidence:
          'State the number of posts, weeks, timezone, post type, and primary metric before the test begins.',
      },
    ],
    interpretation: [
      'A posting window describes this sample in the chosen timezone. It does not reveal when the whole audience is online.',
      'Topic and routine often travel with timing. A regular tutorial series can make Tuesday morning look strong because the tutorial is strong.',
      'Medians and repeated weeks are more useful than the highest post in a slot. Outliers still belong in the evidence table.',
    ],
    caveats: [
      'Post timestamps do not show when followers first saw the post or how distribution unfolded later.',
      'Audience location, daylight-saving changes, news events, and account growth can shift a window over time.',
      'Sparse or uneven posting makes timing conclusions fragile. Mark low-sample windows as untested rather than weak.',
    ],
    returns: [
      'A timezone-specific window table with sample size, active weeks, mix, and response medians.',
      'Two or three candidate windows with linked supporting and contradicting posts.',
      'A controlled schedule test against an ordinary comparison slot.',
    ],
    example: {
      title: 'A strong Tuesday slot may really be a tutorial slot',
      sample:
        'A hypothetical account has fourteen Tuesday morning posts and twelve Thursday afternoon posts. Ten Tuesday posts are tutorials, while Thursday contains mixed announcements and opinions.',
      finding:
        'Tuesday leads reposts overall, but the difference shrinks when tutorials are compared with tutorials. Both windows still have enough repeated weeks for a test.',
      decision:
        'Alternate four comparable tutorials across Tuesday morning and Thursday afternoon before moving the whole schedule.',
    },
    agentPrompt:
      'Find candidate posting windows for @handle. Convert every timestamp into the named analysis timezone and state how daylight-saving time was handled. Build broad buckets with useful sample sizes. For each bucket show posts, active weeks, topic and format mix, median replies, reposts, bookmarks, views, above-baseline share, and outliers. Do not rank low-sample slots. Recommend one candidate and one ordinary comparison window for a balanced test with similar content. Cite post URLs and do not publish anything.',
    surfaceFocus:
      'Convert timestamps to one named timezone, require repeated weeks per bucket, control for content mix, and design a balanced timing test.',
  },
  'day-by-day-performance': {
    lead: 'Compare weekdays as a broad scheduling signal and show whether the apparent difference survives posting volume, topic mix, and outliers.',
    question:
      'Which days show stronger typical response for this account, and are the differences stable enough to affect the weekly plan?',
    dataSources: [
      'Original public posts with timestamps, topics, formats, URLs, and visible metrics.',
      'One named timezone applied to the whole sample.',
      'Several weeks of activity so each used weekday has repeated observations.',
    ],
    bestFor: [
      'A simple weekly cadence review before doing a more precise time-window analysis.',
      'Finding overloaded or under-tested days in the current schedule.',
      'Checking whether weekend and weekday content serve different jobs.',
    ],
    evidence: [
      {
        label: 'Posts per weekday',
        detail:
          'Count total posts and active weeks for each day. Show days with no posts as untested, not underperforming.',
      },
      {
        label: 'Typical response',
        detail:
          'Use medians and above-account-baseline share for each metric. Totals mostly reflect how often the account posts that day.',
      },
      {
        label: 'Day content mix',
        detail:
          'Record recurring subjects, formats, and campaigns by weekday so routine programming does not masquerade as a calendar effect.',
      },
    ],
    method: [
      {
        title: 'Group complete local days',
        instruction:
          'Convert timestamps to the selected timezone and exclude incomplete current days or posts too new for the chosen maturity window.',
        evidence:
          'State the timezone, date range, maturity cutoff, and counts for every weekday.',
      },
      {
        title: 'Compare medians and consistency',
        instruction:
          'Calculate median response, spread, and the share of posts above the account median. Mark weekdays dominated by one event or content series.',
        evidence:
          'Link typical and outlier posts for days described as strong or weak.',
      },
      {
        title: 'Adjust the weekly plan carefully',
        instruction:
          'Move or add one recurring post type at a time. Empty days need testing before they can be promoted or avoided.',
        evidence:
          'The decision should identify the post type, source day, test day, duration, and primary metric.',
      },
    ],
    interpretation: [
      'Totals answer how much response happened on a day. Medians answer how the typical post performed. Both are useful, but they are not interchangeable.',
      'A day can look stable because the account publishes the same successful series every week. That is evidence for the series-day combination, not the weekday alone.',
      'An unused day contains no performance evidence. Call it an open test slot if it fits the workflow.',
    ],
    caveats: [
      'Weekdays are coarse buckets and can hide meaningful morning or evening differences.',
      'Holidays, launches, live events, and news can distort a small number of weeks.',
      'Public timestamps and metrics cannot show audience availability or delayed distribution directly.',
    ],
    returns: [
      'A weekday table with posting volume, active weeks, content mix, medians, and above-baseline share.',
      'Typical and outlier post examples for meaningful day differences.',
      'One weekly schedule adjustment framed as a test, not a permanent rule.',
    ],
    example: {
      title: 'Friday is not weak when it has barely been tried',
      sample:
        'A hypothetical twelve-week sample contains thirty Monday posts, twenty-seven Wednesday posts, and only three Friday posts.',
      finding:
        'Monday and Wednesday have stable medians. Friday has one strong and two weak posts, which is too little evidence for a rank.',
      decision:
        'Keep Monday and Wednesday as known baselines and test four comparable posts on Friday before judging it.',
    },
    agentPrompt:
      'Compare weekday performance for @handle in one named timezone. State the period, maturity cutoff, post count, and active weeks per day. Show median and total response separately, plus topic and format mix, above-baseline share, typical examples, and outliers. Label days with few or no posts as untested. Recommend only one schedule adjustment with a post type, comparison day, duration, and success metric. Do not claim the weekday caused the result and do not publish anything.',
    surfaceFocus:
      'Compare weekday medians, active weeks, and content mix, label empty days untested, and propose one small schedule change.',
  },
  'cadence-check': {
    lead: 'Measure publishing rhythm, gaps, bursts, and idea repetition to decide whether the account has enough steady output to learn from.',
    question:
      'Is the account posting at a useful and sustainable rhythm, or do long gaps and crowded bursts make performance harder to interpret?',
    dataSources: [
      'Original public post timestamps over a representative period.',
      'Post topic, format, and URL so clustered output and repeated ideas can be inspected.',
      'Visible response metrics for checking whether cadence periods differ, without assuming frequency caused the change.',
    ],
    bestFor: [
      'Planning a sustainable weekly publishing range.',
      'Finding inactivity gaps, launch bursts, or repeated same-day posts that distort review data.',
      'Checking whether the account produces enough comparable posts to learn from experiments.',
    ],
    evidence: [
      {
        label: 'Publishing intervals',
        detail:
          'Calculate posts per active week, days between posts, active days, and longest gaps. Keep launch periods and planned breaks marked.',
      },
      {
        label: 'Burst shape',
        detail:
          'Identify multiple original posts within short windows and inspect whether they repeat a topic or serve a coordinated event.',
      },
      {
        label: 'Learning volume',
        detail:
          'Count comparable posts for recurring topics, formats, and tests. More output only helps analysis when the posts provide useful comparisons.',
      },
    ],
    method: [
      {
        title: 'Map the publishing rhythm',
        instruction:
          'Plot original posts by local date and calculate weekly counts, active days, median gap, longest gap, and same-day bursts.',
        evidence:
          'Return the exact period and distinguish original posts from replies, reposts, and thread continuations.',
      },
      {
        title: 'Inspect gaps and bursts',
        instruction:
          'Read the posts around the largest gaps and busiest bursts. Mark launches, holidays, events, or automated sequences visible in the content.',
        evidence:
          'Link the posts that define each burst and state whether the gap context is known or unknown.',
      },
      {
        title: 'Set a range the account can maintain',
        instruction:
          'Recommend a weekly range based on the stable parts of the history and the number of experiments the account wants to learn from. Avoid a universal daily target.',
        evidence:
          'The plan should state minimum active weeks, target post range, protected no-post days when relevant, and review date.',
      },
    ],
    interpretation: [
      'Cadence quality is about consistency and learning, not maximizing post count.',
      'A burst can be appropriate during a launch. Judge whether it served the event before labeling it a bad habit.',
      'A stable schedule with repeated weak ideas is not healthy cadence. Topic and format variety belong beside the calendar.',
    ],
    caveats: [
      'Public search can miss or omit posts, making gaps look longer than they were. State collection coverage.',
      'Replies, deleted posts, drafts, and scheduled work outside the collected sample are not visible in the original-post timeline.',
      'Cadence can correlate with response without causing it. Account growth, content quality, and distribution change at the same time.',
    ],
    returns: [
      'A cadence timeline with weekly counts, active days, gaps, and bursts.',
      'Context for the largest irregular periods and the posts involved.',
      'A sustainable weekly range and a review date tied to a learning goal.',
    ],
    example: {
      title: 'A launch burst should not become the default schedule',
      sample:
        'A hypothetical account usually publishes three to five original posts a week, then publishes twenty-two in one launch week and goes quiet for twelve days.',
      finding:
        'The burst serves a clear event, but the following gap leaves no steady stream for testing the tutorial format that performed well during the launch.',
      decision:
        'Keep launch cadence separate and return to three to five weekly posts with one tutorial slot reserved for four weeks.',
    },
    agentPrompt:
      'Audit cadence for @handle using original public posts only. State collection coverage, period, timezone, and exclusions. Calculate posts per week, active days, median interval, longest gaps, and same-day bursts. Inspect and link posts around irregular periods, marking visible launches or events. Count whether recurring topics and formats have enough examples to learn from. Recommend a sustainable weekly range and review date rather than a universal daily target. Do not claim frequency caused performance and do not publish anything.',
    surfaceFocus:
      'Map weekly output, gaps, bursts, and comparable learning volume, then recommend a sustainable range instead of a maximum.',
  },
  'repeatable-windows': {
    lead: 'Find posting windows that have worked across several separate weeks and comparable posts, then turn them into a schedule worth retesting.',
    question:
      'Which day and time combinations have produced above-baseline results more than once, without depending on one topic or outlier?',
    dataSources: [
      'Original public posts with timestamps converted to one named timezone.',
      'Topics, formats, URLs, and visible metrics for each post.',
      'Enough weeks to show whether a window repeats rather than clustering in one event.',
    ],
    bestFor: [
      'Turning a broad best-window analysis into a small set of reliable schedule candidates.',
      'Finding slots that work across more than one topic or format.',
      'Building a recurring content series around a tested window.',
    ],
    evidence: [
      {
        label: 'Independent weeks',
        detail:
          'Count how many separate weeks contain a qualifying post in the window. Several posts from one launch day count as one period of evidence.',
      },
      {
        label: 'Above-baseline rate',
        detail:
          'Show how often posts in the window beat the account median for the selected outcome, alongside the window median and sample size.',
      },
      {
        label: 'Mix resilience',
        detail:
          'Check whether the window appears across several subjects or succeeds only for one recurring series.',
      },
    ],
    method: [
      {
        title: 'Start with tested windows',
        instruction:
          'Use a prior window table or build broad local-time buckets. Remove windows that lack a minimum number of posts and independent weeks.',
        evidence:
          'State the thresholds, timezone, sample dates, and remaining candidate count.',
      },
      {
        title: 'Test repeatability',
        instruction:
          'Calculate median response and above-baseline rate by week. Re-run the comparison after excluding the strongest post and major event weeks.',
        evidence:
          'A repeatable window should remain useful after the outlier check, or be labeled event-specific.',
      },
      {
        title: 'Assign a suitable series',
        instruction:
          'Match the window with a topic or format supported by its history, then reserve enough future slots to test the combination again.',
        evidence:
          'Specify window, timezone, series, number of tests, comparison slot, and primary metric.',
      },
    ],
    interpretation: [
      'Repeatable means observed across independent weeks. It does not mean the window will always win.',
      'A slot tied to one successful series can still be useful when the recommendation stays attached to that series.',
      'Outlier-resistant medians and above-baseline rates are stronger scheduling evidence than total engagement.',
    ],
    caveats: [
      'Audience habits and account size can change, so old windows need periodic retesting.',
      'Public data does not show follower availability or first-impression timing.',
      'A repeated association can still reflect topic, promotion, or routine rather than time itself.',
    ],
    returns: [
      'A shortlist of windows meeting explicit post and independent-week thresholds.',
      'Outlier and event-week checks for every candidate.',
      'A recurring series test with a comparison slot and review date.',
    ],
    example: {
      title: 'Four weeks beat four posts on one day',
      sample:
        'A hypothetical window contains eight posts. Four came during one launch Tuesday, while the other four appeared across four separate weeks.',
      finding:
        'The window still beats the account repost median after removing the launch cluster, and three different topics are represented.',
      decision:
        'Keep it as a repeatable candidate and schedule four more comparable posts against an ordinary slot.',
    },
    agentPrompt:
      'Find repeatable posting windows for @handle in the named timezone. Require explicit minimum post and independent-week counts. For each candidate show sample size, weeks, topic and format mix, median response, above-account-median rate, and linked examples. Recalculate after excluding the strongest post and major event weeks. Label series-specific or event-specific windows. Return a future series test with comparison slot and review date. Do not present a guarantee and do not publish anything.',
    surfaceFocus:
      'Require independent weeks, above-baseline consistency, and outlier checks before calling a posting window repeatable.',
  },
  'stale-slots': {
    lead: 'Find heavily used posting slots that repeatedly underperform comparable content and decide whether to move, repurpose, or retest them.',
    question:
      'Which recurring day and time slots keep producing weak results, and is timing still the most useful thing to change?',
    dataSources: [
      'Original public post timestamps in one named timezone.',
      'Topics, formats, campaigns, URLs, and visible metrics for posts in recurring slots.',
      'Comparable posts published in stronger or ordinary windows.',
    ],
    bestFor: [
      'Auditing a fixed content calendar that may be running on habit.',
      'Finding recurring series whose weak result could come from slot, subject, or format.',
      'Creating a move-versus-rewrite test instead of deleting a slot immediately.',
    ],
    evidence: [
      {
        label: 'Repeated use',
        detail:
          'Only inspect slots used across enough posts and weeks to establish a routine. Empty and rare windows are untested.',
      },
      {
        label: 'Consistent weakness',
        detail:
          'Show median response and the share below account baseline, then recalculate without obvious outliers and event weeks.',
      },
      {
        label: 'Slot-content pairing',
        detail:
          'Record whether the slot always carries the same weak series. A content problem can make a time slot look stale.',
      },
    ],
    method: [
      {
        title: 'Set a stale threshold',
        instruction:
          'Require repeated weeks, a minimum post count, and a meaningful below-baseline share before selecting a slot for review.',
        evidence:
          'Publish the threshold, timezone, date range, sample size, and response metric used.',
      },
      {
        title: 'Test the competing explanation',
        instruction:
          'Compare the slot content with the same topic or format published elsewhere. Also compare other content published in the slot when available.',
        evidence:
          'Link examples that support timing, content, both, or neither as the more useful hypothesis.',
      },
      {
        title: 'Move one recurring unit',
        instruction:
          'Shift one established series to a stronger or ordinary window while holding subject and format steady. Leave other schedule changes alone during the test.',
        evidence:
          'State the source slot, test slot, number of posts, maturity period, and success metric.',
      },
    ],
    interpretation: [
      'A stale slot is a review candidate, not a forbidden hour.',
      'If the same content performs weakly everywhere, moving it will not solve the main problem.',
      'A routine can still have operational value. Team availability and audience expectations may justify a slot with ordinary engagement.',
    ],
    caveats: [
      'Sparse schedules and missing public history can create false stale slots.',
      'Timezone choice, daylight-saving changes, and audience location affect the grouping.',
      'The analysis can show repeated association but cannot prove timing caused weak response.',
    ],
    returns: [
      'A limited stale-slot review list with explicit thresholds and linked evidence.',
      'A timing-versus-content diagnosis for each selected routine.',
      'One controlled move test that preserves topic and format.',
    ],
    example: {
      title: 'The slot may be carrying a weak series',
      sample:
        'A hypothetical Friday afternoon slot contains twelve posts, ten of which are generic weekly recaps. The slot falls below the reply median in nine cases.',
      finding:
        'Two practical tutorials in the same slot perform normally. Weekly recaps also underperform when posted on Tuesday.',
      decision:
        'Revise or retire the recap format before blaming Friday. Use one matched tutorial test if the team still wants to evaluate the slot.',
    },
    agentPrompt:
      'Find stale posting slots for @handle in one named timezone. Require repeated weeks, a minimum post count, and a stated below-baseline threshold. For every candidate show content mix, median response, below-baseline share, outliers, and post URLs. Compare the same topic elsewhere and different topics in the slot so timing is not blamed for a weak series. Return move, repurpose, keep, or retest decisions and design one controlled move. Label rare slots untested and do not publish anything.',
    surfaceFocus:
      'Find repeatedly used below-baseline slots, compare the same content elsewhere, and test timing against the competing content explanation.',
  },
} satisfies Record<string, XReportSpecificContent>
