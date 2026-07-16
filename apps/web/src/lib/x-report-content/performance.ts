import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const performanceReportContent = {
  'account-snapshot': {
    lead: 'Build a grounded first read of an X account before deciding what its content is about or what it should publish next.',
    question:
      'What does this account appear to be known for, how active is it, and which recent performance signals deserve a closer look?',
    dataSources: [
      'One current public profile record with bio, follower count, following count, post count, verification state, and collection time.',
      'A dated sample of original public posts with text, format, replies, reposts, likes, quotes, views, and bookmarks when those fields are available.',
      'Earlier profile snapshots when the result needs to discuss follower or activity change rather than current state.',
    ],
    bestFor: [
      'Starting a client review or competitor study without making the reader dig through raw posts first.',
      'Giving an agent enough account context to avoid suggesting topics that do not fit the existing audience.',
      'Choosing which focused report to run next after a broad scan.',
    ],
    evidence: [
      {
        label: 'Profile promise',
        detail:
          'Record the bio, linked site, account age, and visible identity. Compare that promise with the subjects found in the post sample.',
      },
      {
        label: 'Recent output',
        detail:
          'Count original posts by week and separate replies, reposts, quote posts, articles, and obvious announcements. One busy launch week should not define the normal cadence.',
      },
      {
        label: 'Performance range',
        detail:
          'Show the median and the strongest and weakest examples for replies, reposts, likes, and views. Keep missing metrics marked as missing instead of converting them to zero.',
      },
    ],
    method: [
      {
        title: 'Define the sample',
        instruction:
          'Write down the handle, collection date, post date range, number of posts, and exclusions. Use original posts for the main comparison and describe any replies or reposts separately.',
        evidence:
          'The result should state exactly how many posts were reviewed and whether the public source stopped before the requested period ended.',
      },
      {
        title: 'Describe before judging',
        instruction:
          'Summarize the profile promise, repeated subjects, usual formats, and posting rhythm before ranking performance. This stops one large post from rewriting the account identity.',
        evidence:
          'Cite at least three representative posts, not only the top post, and include their dates and visible metrics.',
      },
      {
        title: 'Choose the next investigation',
        instruction:
          'Name one strong signal, one weak signal, and one unanswered question. Route each to a focused report such as top posts, topic winners, cadence check, or reply drivers.',
        evidence:
          'Each follow-up should point to the observed profile or post evidence that made it worth investigating.',
      },
    ],
    interpretation: [
      'Read the profile and sample coverage first. A polished summary based on 12 posts from a launch week is still a launch-week summary.',
      'Use medians to describe normal performance and individual posts to explain the range. Averages can be useful, but one viral post can drag them a long way from normal.',
      'Treat a mismatch between the bio and recent subjects as a question. It may show a deliberate change in direction, a temporary campaign, or an account that has not updated its profile.',
    ],
    caveats: [
      'A single current profile record cannot show follower growth. Growth needs at least two comparable snapshots with dates.',
      'Public X data may omit views, bookmarks, deleted posts, restricted posts, or part of the requested history. Missing data does not mean no activity occurred.',
      'The snapshot can describe observed patterns. It cannot prove why people followed, unfollowed, replied, or ignored a post.',
    ],
    returns: [
      'A one-paragraph account read with the exact sample and collection date.',
      'A compact evidence table covering profile promise, cadence, topic mix, formats, and performance range.',
      'Three focused follow-ups tied to strong, weak, and uncertain signals.',
    ],
    example: {
      title: 'A useful account snapshot does not pretend one launch is normal',
      sample:
        'A hypothetical sample contains 60 original posts across eight weeks. Twenty-two were published during one product launch, and views are missing on nine posts.',
      finding:
        'Product-building notes appear throughout the period, while launch announcements account for four of the five most-viewed posts. Question-led posts receive more replies in both launch and non-launch weeks.',
      decision:
        'Describe product building as the stable subject, treat launch views as event-driven, and run reply drivers on the question-led posts before recommending more of them.',
    },
    agentPrompt:
      'Create an account snapshot for @handle from the supplied public profile and post rows. State the collection date, post range, sample size, exclusions, and missing metrics first. Describe the profile promise, repeated subjects, formats, cadence, median response, strongest examples, weakest examples, and any mismatch between the bio and recent output. Finish with one strong signal, one weak signal, and one question for a focused follow-up. Cite post URLs beside every claim. Do not estimate missing values and do not publish anything.',
    surfaceFocus:
      'Summarize the profile promise, normal cadence, subject mix, median response, and the three post examples that best explain the account.',
  },
  'top-posts': {
    lead: 'Find the posts that performed strongly on more than one useful signal, then work out which parts are worth testing again.',
    question:
      'Which posts earned the strongest response in this sample, and what repeatable traits do they share after outliers and format differences are accounted for?',
    dataSources: [
      'A representative dated post sample with post URLs, text, format, timestamps, and visible engagement counts.',
      'Views or impressions when available so raw response counts can be read beside exposure.',
      'Profile follower snapshots when comparing samples collected far apart or accounts of different sizes.',
    ],
    bestFor: [
      'Finding well-supported examples to use in a content review or agent brief.',
      'Separating posts that start conversation from posts that mainly collect views or likes.',
      'Choosing a small set of topics, hooks, or formats for a controlled repeat test.',
    ],
    evidence: [
      {
        label: 'Rank by outcome',
        detail:
          'Build separate rankings for replies, reposts, likes, bookmarks, and views. A post can lead one list and be ordinary on another.',
      },
      {
        label: 'Normalize exposure',
        detail:
          'When views exist, compare response per 1,000 views beside raw totals. Never mix posts with missing views into a rate ranking.',
      },
      {
        label: 'Record the ingredients',
        detail:
          'For each selected post note its subject, opening, format, length, call to action, timing, and whether an external event or large account amplified it.',
      },
    ],
    method: [
      {
        title: 'Pick the success measure',
        instruction:
          'Decide whether the job is views, conversation, sharing, or useful reference value. Rank that metric first and keep the other metrics visible beside it.',
        evidence:
          'The heading of every ranking should name the metric and sample. Avoid a single unexplained performance score.',
      },
      {
        title: 'Compare the winners with normal posts',
        instruction:
          'Use the sample median as a baseline and compare each winner with posts of a similar format and period. Mark launch posts, giveaways, quote amplification, and other unusual distribution.',
        evidence:
          'A useful row contains the post URL, date, metric, baseline, format, and one observed trait that could be tested again.',
      },
      {
        title: 'Look for repeated traits',
        instruction:
          'Only promote a trait into a recommendation when it appears in several strong posts or survives a comparison with weaker posts. Keep isolated ideas as examples, not rules.',
        evidence:
          'Show both supporting and contradicting posts so the reader can see how stable the pattern is.',
      },
    ],
    interpretation: [
      'The top post is a case study. A repeated trait across several top posts is a pattern worth testing.',
      'High views with ordinary reply and repost rates often indicate distribution rather than unusually strong audience response. That may still be useful, but it answers a different question.',
      'A post can be strategically valuable without winning an engagement ranking. Product announcements, hiring posts, and support updates may have a job that raw interaction does not capture.',
    ],
    caveats: [
      'Public metrics are snapshots and can continue changing after collection. Collect comparable posts at a similar age when possible.',
      'Deleted posts and missing view or bookmark counts can change the ranking. State which metrics were complete.',
      'Shared traits show correlation inside this sample. They do not prove that copying the hook or format will reproduce the result.',
    ],
    returns: [
      'Separate shortlists for views, replies, reposts, and saves when the data supports them.',
      'A comparison table with normal baselines, notable context, and links to every selected post.',
      'Two or three traits to retest, plus counterexamples that keep the recommendation honest.',
    ],
    example: {
      title: 'Three winners beat one viral outlier',
      sample:
        'A hypothetical 90-post sample has one post with 900,000 views after a large quote post, plus three practical tutorials with 80,000 to 120,000 views each.',
      finding:
        'The viral post leads raw views, but the tutorials each earn more bookmarks and reposts per 1,000 views than the sample median and use a concrete before-and-after opening.',
      decision:
        'Keep the viral post as a distribution example. Test the tutorial opening again because the response pattern repeats across three independent posts.',
    },
    agentPrompt:
      'Rank the supplied posts for @handle by replies, reposts, likes, bookmarks, and views. State the sample, date range, missing metrics, and whether posts were measured at comparable ages. Use medians as the normal baseline. For each selected post include its URL, metric, format, subject, opening, and unusual distribution context. Separate isolated outliers from traits repeated across several winners. Return two repeat tests and at least one counterexample. Do not create a combined score unless you show the formula. Do not publish anything.',
    surfaceFocus:
      'Build separate top-post lists for replies, reposts, bookmarks, and views, then identify traits supported by more than one winner.',
  },
  'weak-posts': {
    lead: 'Find posts that underperformed comparable work and turn them into specific review questions instead of vague advice to post better.',
    question:
      'Which posts received a weaker response than similar posts in this sample, and what evidence points to a problem with the topic, opening, format, timing, or distribution?',
    dataSources: [
      'A dated public post sample with text, format, visible metrics, and post URLs.',
      'Views when available so low distribution can be separated from weak response after exposure.',
      'Comparable stronger posts from the same account, period, and format.',
    ],
    bestFor: [
      'Reviewing repeated content habits that may be wasting publishing slots.',
      'Finding posts that attracted views but failed to start conversation or sharing.',
      'Building a stop, revise, or retest list without judging posts against another account.',
    ],
    evidence: [
      {
        label: 'Fair baseline',
        detail:
          'Compare each candidate with the median for similar original posts. Keep replies, quote posts, announcements, and link posts in separate groups when their jobs differ.',
      },
      {
        label: 'Exposure and response',
        detail:
          'Low views suggest a distribution question. Normal views with relatively few replies or reposts show a weaker visible response per view.',
      },
      {
        label: 'Visible friction',
        detail:
          'Inspect the opening, subject clarity, assumed context, link placement, format, length, and call to action. Label these as review signals, not proven causes.',
      },
    ],
    method: [
      {
        title: 'Define weak for this job',
        instruction:
          'Choose the response that mattered for the post and compare it with a relevant baseline. A support notice should not be called weak because it was not widely reposted.',
        evidence:
          'Each candidate needs a stated purpose, comparison group, metric, and gap from the group median.',
      },
      {
        title: 'Find repeated misses',
        instruction:
          'Group weak candidates by topic, opening, format, timing, and length. Give more weight to a pattern that appears across several dates than to one isolated miss.',
        evidence:
          'Cite at least two posts for any habit recommended for reduction or revision.',
      },
      {
        title: 'Choose cut, revise, or retest',
        instruction:
          'Cut a habit only when repeated evidence is strong. Revise when the idea matters but presentation looks weak. Retest when the sample is small or timing and distribution were unusual.',
        evidence:
          'State the smallest change that would make the next post a useful comparison.',
      },
    ],
    interpretation: [
      'A weak result is relative to the post job and comparison set. It is not a verdict on the subject or the writer.',
      'Low exposure and low response are different problems. Diagnose them separately whenever views are available.',
      'Posts that repeat necessary company information may be worth keeping even with low engagement. The useful question is whether their format or frequency can improve.',
    ],
    caveats: [
      'The public record cannot show drafts, deleted posts, private shares, link clicks, conversions, or internal business value.',
      'Small groups create noisy baselines. Three link posts are not enough to declare links harmful.',
      'A visible trait may be associated with a miss without causing it. News cycle, distribution, audience size, and post age also matter.',
    ],
    returns: [
      'A limited weak-post list with purpose, comparison group, metric gap, and post links.',
      'Repeated review signals grouped by topic, opening, format, timing, or length.',
      'A cut, revise, or retest decision with one controlled change for each pattern.',
    ],
    example: {
      title: 'A low-view post and a low-response post need different fixes',
      sample:
        'A hypothetical sample contains 50 text posts. One tutorial gets 8,000 views and 40 replies. Another gets 70,000 views and 12 replies, while the group median is 32 replies at 45,000 views.',
      finding:
        'The first post may have a distribution problem but has more replies per 1,000 views. The second has fewer replies than similar posts despite its larger view count.',
      decision:
        'Do not rewrite both for the same reason. Retest the first in a previously strong window, and review the second post opening and question for response friction.',
    },
    agentPrompt:
      'Find underperforming posts in the supplied @handle sample. Define the job and fair comparison group before calling a post weak. Separate low exposure from weak response after exposure. For every candidate include the URL, date, format, selected metric, group median, and visible review signals. Group repeated misses and require at least two supporting examples before suggesting that a habit should be reduced. Return cut, revise, or retest decisions with one controlled change. Keep missing views and bookmarks as unknown. Do not publish anything.',
    surfaceFocus:
      'Compare weak candidates with similar posts, separate exposure from response, and return a cut, revise, or retest decision for repeated misses.',
  },
  'growth-signals': {
    lead: 'Compare dated account snapshots with the content published between them to find signals that appeared near stronger audience growth.',
    question:
      'Which topics, formats, and publishing periods coincide with stronger follower growth, and how much evidence supports each association?',
    dataSources: [
      'At least two dated public profile snapshots with follower counts, collected on a consistent schedule.',
      'Original public posts published between snapshot dates with visible metrics and format labels.',
      'Notes for launches, giveaways, collaborations, large quote posts, or other events that may affect distribution.',
    ],
    bestFor: [
      'Reviewing which content periods are associated with audience expansion rather than only post engagement.',
      'Finding candidate topics or formats for a longer repeat test.',
      'Keeping an agent from treating one current follower total as a growth trend.',
    ],
    evidence: [
      {
        label: 'Dated follower change',
        detail:
          'Calculate change only between real snapshots. Record the interval length and use followers gained per day when intervals differ.',
      },
      {
        label: 'Content between snapshots',
        detail:
          'Count posts, topics, formats, and response totals inside each interval. Do not assign a gain to a post published after the next snapshot.',
      },
      {
        label: 'External context',
        detail:
          'Mark launches, collaborations, viral quotes, paid activity when known, and long inactive stretches. These can dominate a small content signal.',
      },
    ],
    method: [
      {
        title: 'Build comparable intervals',
        instruction:
          'Use weekly or similarly sized snapshot windows. Exclude intervals with missing endpoints and keep account renames or profile changes in the notes.',
        evidence:
          'Show start count, end count, absolute change, daily change, posts published, and coverage for every interval.',
      },
      {
        title: 'Compare content mixes',
        instruction:
          'Look for topics or formats that recur in several stronger intervals and are less common in slower intervals. Weight repeated periods more than one dramatic week.',
        evidence:
          'Link the posts that support each candidate signal and show how often the pattern appeared in both strong and ordinary intervals.',
      },
      {
        title: 'Set a forward test',
        instruction:
          'Choose one content variable to repeat while keeping cadence roughly stable. Continue collecting follower snapshots so the next review has a comparable result.',
        evidence:
          'The test should name its duration, post count, content variable, and the follower and post metrics to record.',
      },
    ],
    interpretation: [
      'Follower change is an account-level outcome. Assigning it to one post is rarely defensible without better attribution.',
      'A signal becomes more useful when the same topic or format appears in several stronger intervals and ordinary periods provide a comparison.',
      'Rate changes matter beside absolute growth. Gaining 500 followers means something different for accounts starting at 5,000 and 500,000.',
    ],
    caveats: [
      'ilo does not currently collect recurring public profile snapshots for this report. Supply your own dated snapshots or run the analysis only as a plan for future measurement.',
      'Public follower counts can be rounded, delayed, or affected by unavailable accounts and platform cleanup.',
      'Timing overlap cannot prove that a post or topic caused follower growth. Distribution outside the observed posts may explain the movement.',
    ],
    returns: [
      'A dated interval table with follower change, publishing volume, and visible context.',
      'Candidate growth signals supported by repeated periods and linked post examples.',
      'One bounded content test plus a snapshot schedule for checking it later.',
    ],
    example: {
      title: 'One launch week is context, not a content rule',
      sample:
        'A hypothetical account has eight weekly snapshots. Its largest gain is 1,400 followers during a launch week, while three tutorial-heavy weeks each gain 280 to 360 followers against a 120-follower median.',
      finding:
        'The launch is the largest event but cannot be repeated weekly. Tutorial-heavy periods show a smaller pattern across three separate intervals.',
      decision:
        'Keep the launch as external context and test a weekly tutorial series for four more weeks while continuing the same snapshot schedule.',
    },
    agentPrompt:
      'Analyze follower growth signals for @handle using only the supplied dated profile snapshots and posts between them. Reject intervals with a missing start or end count. Show start followers, end followers, absolute change, change per day, post count, content mix, and known events for each interval. Find topics or formats repeated across several stronger intervals and show counterexamples from ordinary periods. Describe associations, never causes. Finish with one controlled four-week test and the snapshot schedule needed to evaluate it. Do not publish anything.',
    surfaceFocus:
      'Join dated follower snapshots to the posts published between them, compare similar intervals, and keep launches or large amplification events beside every growth claim.',
  },
  'recent-changes': {
    lead: 'Compare recent weeks with an earlier matched period to show what actually moved in output, subjects, formats, and audience response.',
    question:
      'How has this account changed recently, which shifts are large enough to inspect, and do the underlying posts support a useful explanation?',
    dataSources: [
      'Original public posts covering a recent window and an adjacent earlier window of the same length.',
      'Post text, timestamps, formats, and visible engagement metrics collected at a comparable post age where possible.',
      'Dated profile snapshots when follower change is included in the comparison.',
    ],
    bestFor: [
      'A weekly review after the account changes cadence, topic mix, or format.',
      'Checking whether a perceived improvement appears in the actual post rows.',
      'Finding a focused follow-up without writing a full monthly report.',
    ],
    evidence: [
      {
        label: 'Matched windows',
        detail:
          'Use adjacent periods of equal length and record the exact dates. Exclude incomplete current days if their posts have not had time to mature.',
      },
      {
        label: 'Mix changes',
        detail:
          'Compare post count, topic share, format share, length, and posting windows before looking at engagement totals.',
      },
      {
        label: 'Response changes',
        detail:
          'Compare medians and distributions for replies, reposts, likes, and views. Link the posts that explain the largest movement.',
      },
    ],
    method: [
      {
        title: 'Choose complete periods',
        instruction:
          'Pick a recent seven, fourteen, or twenty-eight day window and the equal period immediately before it. Apply the same inclusion rules to both.',
        evidence:
          'Report dates, post counts, missing metrics, and the age of the newest posts.',
      },
      {
        title: 'Compare the content mix',
        instruction:
          'Calculate changes in cadence, subject share, format, average length, and time of day. A response change may follow from a very different publishing mix.',
        evidence:
          'Show both absolute counts and shares so a lower posting volume does not masquerade as a topic collapse.',
      },
      {
        title: 'Explain only supported movement',
        instruction:
          'Select the posts that account for the largest gain or decline and describe their visible differences. Leave causes open when the rows do not settle them.',
        evidence:
          'Every explanation needs a before example, an after example, and the metric that changed.',
      },
    ],
    interpretation: [
      'Read volume and mix before totals. Publishing half as often can reduce total replies even when the median post improves.',
      'Recent posts have had less time to accumulate response. Use a maturity cutoff or compare metrics at the same post age.',
      'A change concentrated in one outlier deserves investigation but should not be described as a broad trend.',
    ],
    caveats: [
      'Short windows are noisy and can be dominated by launches, holidays, news, or one large quote post.',
      'Public snapshots do not reveal link clicks, conversions, private sharing, deleted posts, or algorithmic distribution details.',
      'A matched before-and-after comparison can show movement. It cannot prove why the movement happened.',
    ],
    returns: [
      'A matched-period table for cadence, topic mix, format mix, and response medians.',
      'The posts that explain the largest visible changes, with URLs and metrics.',
      'One keep, one investigate, and one wait-for-more-data decision.',
    ],
    example: {
      title: 'Fewer posts can still mean stronger posts',
      sample:
        'A hypothetical account publishes 24 posts in the earlier two weeks and 14 in the recent two weeks. Total replies fall from 600 to 520, while median replies rise from 18 to 31.',
      finding:
        'The account produced less total conversation because it posted less, but the typical post drew a stronger response. Six recent posts used concrete build notes instead of announcements.',
      decision:
        'Do not label the period a decline from totals alone. Keep the build-note pattern under review and check whether the higher median holds in the next matched window.',
    },
    agentPrompt:
      'Compare the most recent complete period for @handle with the adjacent earlier period of equal length. State the exact dates, post counts, exclusions, post maturity rule, and missing metrics. Compare cadence and content mix before response totals. Show medians as well as totals, identify outliers, and link the before and after posts that explain the largest movement. Return one change to keep, one to investigate, and one conclusion that needs more data. Do not claim causation and do not publish anything.',
    surfaceFocus:
      'Compare equal recent and earlier windows, separate volume from per-post response, and cite the posts behind the largest mix or metric change.',
  },
} satisfies Record<string, XReportSpecificContent>
