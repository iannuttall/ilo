import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const nextStepReportContent = {
  'what-to-post-more': {
    lead: 'Turn several supported account patterns into a small repeat plan without flattening the next month into copies of the same winner.',
    question:
      'Which topics, formats, and audience jobs deserve more publishing space because they have worked repeatedly and still offer new angles?',
    dataSources: [
      'A representative public post sample with topics, formats, URLs, dates, and visible metrics.',
      'Completed findings from top posts, topic winners, audience response, and cadence checks when available.',
      'A record of how often each candidate theme already appeared so repetition risk is visible.',
    ],
    bestFor: [
      'Building a four-week content emphasis from several supported signals.',
      'Choosing what to repeat at the level of job and angle rather than copying exact posts.',
      'Balancing well-supported themes with enough variety to keep learning.',
    ],
    evidence: [
      {
        label: 'Repeated strength',
        detail:
          'Require several above-baseline examples across more than one date. Keep isolated viral posts outside the primary recommendation.',
      },
      {
        label: 'Audience job',
        detail:
          'Name whether the candidate helps people learn, reply, share, save, follow a build, or understand a product. Different jobs need different metrics.',
      },
      {
        label: 'Angle headroom',
        detail:
          'List unexplored examples, questions, stages, audiences, or formats inside the theme. More of the same wording is not a strategy.',
      },
    ],
    method: [
      {
        title: 'Collect supported candidates',
        instruction:
          'Start with patterns backed by several post URLs and a clear comparison baseline. Record topic, format, audience job, metric, and counterexamples.',
        evidence:
          'Every candidate needs at least two independent strong examples and one reason it may fail to repeat.',
      },
      {
        title: 'Score evidence and room to vary',
        instruction:
          'Prioritize themes with stable response and several unused angles. Lower the priority when the sample is tiny, one event dominates, or recent repetition is already heavy.',
        evidence:
          'Show evidence strength and angle headroom as separate judgments rather than one opaque score.',
      },
      {
        title: 'Reserve a limited share',
        instruction:
          'Allocate a portion of the next plan to two or three candidates and keep room for current events, necessary updates, and experiments.',
        evidence:
          'The plan should state post count, period, angle list, format options, and the outcome used to review each candidate.',
      },
    ],
    interpretation: [
      'Post more means give a supported idea more chances to develop. It does not mean repeat the winning sentence.',
      'A theme can be strategically important even when its strongest metric is saves rather than replies. Preserve the audience job.',
      'Evidence strength and creative headroom both matter. A well-supported topic with nothing new to say will become stale fast.',
    ],
    caveats: [
      'Public response does not reveal business value, private sharing, clicks, or whether the audience wants an unlimited amount of the theme.',
      'Past performance can weaken as the account, audience, or news cycle changes.',
      'The recommendations are bounded tests, not guarantees of views or follower growth.',
    ],
    returns: [
      'Two or three candidates with supporting posts, audience jobs, and evidence limits.',
      'A bank of distinct angles and suitable formats for each candidate.',
      'A four-week allocation with review metrics and space left for experiments.',
    ],
    example: {
      title: 'Repeat the audience job, not the post',
      sample:
        'A hypothetical account has six strong build logs that explain one decision and show the result. They outperform the reply median across four months.',
      finding:
        'The stable pattern is transparent decision-making, not one product or opening line. Several future decisions can support distinct examples.',
      decision:
        'Reserve one weekly build log for four weeks, vary the decision and format, and review replies and bookmarks against ordinary technical posts.',
    },
    agentPrompt:
      'Recommend what @handle should post more often using only supported patterns in the supplied reports and post rows. For each candidate show at least two independent strong URLs, the comparison baseline, audience job, strongest metric, counterexamples, and evidence limits. List distinct unused angles so the plan does not copy a winner. Allocate a bounded four-week share to no more than three candidates, keep room for experiments, and name the review metric for each. Do not promise growth, write final posts, or publish anything.',
    surfaceFocus:
      'Combine repeated strong patterns with audience job and unused angle headroom, then allocate a limited four-week repeat plan.',
  },
  'what-to-stop-doing': {
    lead: 'Find repeated habits that consume publishing space without supporting the intended outcome, then decide what to stop, reduce, or redesign.',
    question:
      'Which recurring topics, formats, openings, or schedule habits underperform fair comparisons often enough to change?',
    dataSources: [
      'A representative post sample with URLs, topics, formats, timestamps, and visible metrics.',
      'Weak-post, language, format, and timing findings with their comparison groups.',
      'The intended job of recurring posts, including necessary announcements or support information that engagement cannot judge alone.',
    ],
    bestFor: [
      'Freeing space in a crowded content plan without reacting to one miss.',
      'Reducing stale framing, weak recurring series, or format habits supported by repeated evidence.',
      'Separating habits that need removal from necessary posts that need a better delivery.',
    ],
    evidence: [
      {
        label: 'Repeated miss',
        detail:
          'Require several below-baseline examples from separate dates and a fair comparison group.',
      },
      {
        label: 'Intended job',
        detail:
          'State what the recurring post is meant to accomplish and whether the public metrics can measure that job.',
      },
      {
        label: 'Opportunity cost',
        detail:
          'Count how much schedule space the habit uses and which supported work it displaces. Avoid inventing revenue or follower loss.',
      },
    ],
    method: [
      {
        title: 'Build the candidate list',
        instruction:
          'Gather patterns from weak posts and format or timing reviews. Remove one-offs and candidates with too little data.',
        evidence:
          'Each candidate needs linked examples, sample size, comparison baseline, and intended job.',
      },
      {
        title: 'Test the competing fix',
        instruction:
          'Ask whether changing the opening, timing, media, frequency, or audience could preserve a necessary idea. Stop only when the habit itself lacks a supported job or repeated redesigns have failed.',
        evidence:
          'Show stronger examples that use the topic differently when they exist.',
      },
      {
        title: 'Choose stop, reduce, redesign, or keep',
        instruction:
          'Use a specific decision and set a review period. A reduction can create a cleaner comparison without deleting the series forever.',
        evidence:
          'State how many slots change, what replaces them, and which evidence would reverse the decision.',
      },
    ],
    interpretation: [
      'Weak engagement does not make necessary product, hiring, support, or legal communication optional.',
      'A repeated weak format can hide a useful topic. Inspect stronger treatments before removing the subject.',
      'Stopping something creates a new content mix, so review the result rather than treating the decision as permanent truth.',
    ],
    caveats: [
      'Public metrics cannot measure all business outcomes, clicks, conversions, or the cost of producing each post.',
      'Small comparison groups and missing history can make a habit look more settled than it is.',
      'Removing a pattern based on correlation does not prove it caused weak account performance.',
    ],
    returns: [
      'A limited candidate list with repeated evidence and intended job.',
      'Stop, reduce, redesign, or keep decisions with reversal conditions.',
      'A replacement plan that makes the opportunity cost concrete without inventing value.',
    ],
    example: {
      title: 'Necessary announcements need redesign, not deletion',
      sample:
        'A hypothetical account publishes a generic weekly release announcement twelve times. Ten fall below the repost and reply median, while two release demos perform normally.',
      finding:
        'The release information is necessary, but the repeated text-only format adds little context. Demonstration posts show a viable alternative.',
      decision:
        'Stop the generic template, keep release communication, and test four concise demos against the old baseline.',
    },
    agentPrompt:
      "Identify what @handle should stop, reduce, redesign, or keep. Require repeated below-baseline examples from separate dates and a fair comparison group. State each habit's intended job and whether public metrics can measure it. Check stronger treatments of the same topic before removing it. Return linked evidence, schedule share, decision, replacement, review period, and the evidence that would reverse the decision. Preserve necessary announcements and support communication. Do not claim lost growth and do not publish anything.",
    surfaceFocus:
      'Require repeated fair misses, respect each post job, and choose stop, reduce, redesign, or keep with a replacement and reversal condition.',
  },
  'experiments-to-run': {
    lead: 'Turn uncertain performance patterns into small content tests that change one useful variable and record the result clearly.',
    question:
      'Which unanswered content decisions can be tested next with enough control to learn something from a small number of posts?',
    dataSources: [
      'Supported findings and open questions from topic, hook, format, timing, and audience-response reports.',
      'Baseline posts with URLs, dates, formats, and the metric the experiment intends to move.',
      'A realistic publishing calendar showing how many comparable tests can run without crowding each other.',
    ],
    bestFor: [
      'Choosing the next few tests after an audit produces several plausible ideas.',
      'Preventing an agent from changing topic, hook, format, and timing at the same time.',
      'Creating a simple learning record the next monthly review can inspect.',
    ],
    evidence: [
      {
        label: 'Observed uncertainty',
        detail:
          'Tie every experiment to a pattern with support and a real competing explanation. Do not invent tests from generic advice.',
      },
      {
        label: 'Comparable baseline',
        detail:
          'Name the existing posts, normal result, and content job used for comparison.',
      },
      {
        label: 'One primary variable',
        detail:
          'Choose topic angle, opening, format, length, media, link treatment, or timing. Hold the other important choices as steady as practical.',
      },
    ],
    method: [
      {
        title: 'Write the learning question',
        instruction:
          'Frame a question the sample could answer, such as whether concrete experience questions produce more substantive replies than broad prompts on the same topic.',
        evidence:
          'Cite the report finding, supporting posts, counterexample, and uncertainty that earned the test.',
      },
      {
        title: 'Design the smallest fair comparison',
        instruction:
          'Set variant, baseline, topic, format, window, post count, maturity period, primary metric, and a secondary guardrail. Avoid several overlapping experiments.',
        evidence:
          'The test card should be complete enough for another agent to run without inventing parameters.',
      },
      {
        title: 'Record a decision rule',
        instruction:
          'Decide in advance what result means continue, retest, or stop. Use a cautious threshold appropriate for the small sample rather than false statistical certainty.',
        evidence:
          'Keep every published post URL, collection time, metrics, deviations, and outside events in the result.',
      },
    ],
    interpretation: [
      'A small social content experiment produces directional evidence. It rarely isolates causation perfectly.',
      'One variable does not mean every other condition is identical. Record the differences you can see.',
      'A useful failed test narrows a decision. Do not rewrite the success rule after seeing the result.',
    ],
    caveats: [
      'X distribution, audience growth, news, and post quality introduce noise that a small test cannot remove.',
      'Running several changes at once makes attribution weaker, even if the new post performs well.',
      'Public metrics do not cover clicks, conversions, private sharing, or qualitative reply value unless separate evidence is collected.',
    ],
    returns: [
      'A prioritized list of evidence-backed learning questions.',
      'Complete test cards with baseline, variable, schedule, metrics, and decision rule.',
      'A result log format for the next review.',
    ],
    example: {
      title: 'Test one opening without changing the whole post',
      sample:
        'A hypothetical hook report finds that concrete result-first openings perform well in tutorials, but most were also posted in a strong Tuesday window.',
      finding:
        'Opening and timing are confounded. Changing both again would not clarify which signal is useful.',
      decision:
        'Publish four comparable tutorials in the same normal window, alternating result-first and context-first openings, then compare replies and bookmarks after seven days.',
    },
    agentPrompt:
      'Design content experiments for @handle from the supplied report findings. Each experiment must cite supporting posts, a counterexample or competing explanation, and one clear learning question. Specify baseline, primary variable, held-steady choices, topic, format, timing, number of posts, maturity period, primary metric, guardrail, and continue, retest, or stop rule. Prioritize no more than three non-overlapping tests and provide a result log. Treat results as directional, do not move the goalposts, and do not publish anything.',
    surfaceFocus:
      'Turn supported uncertainties into complete one-variable test cards with baselines, maturity periods, metrics, guardrails, and prewritten decision rules.',
  },
  'agent-brief': {
    lead: 'Compress the most useful account evidence into a working brief an agent can apply before it researches, drafts, or reviews a post.',
    question:
      'What does an agent need to know about this account, its audience response, and its writing boundaries before suggesting the next post?',
    dataSources: [
      'A current public profile snapshot and representative post sample with URLs and dates.',
      'Supported findings from account, topic, hook, voice, format, timing, and audience-response reviews.',
      'Explicit human constraints such as subjects to avoid, product facts, review rules, and the current publishing goal.',
    ],
    bestFor: [
      'Giving a coding or writing agent stable context without pasting an entire post history.',
      'Keeping drafts tied to observed account patterns and source examples.',
      'Separating evidence, editorial choices, and untested hypotheses in one reusable artifact.',
    ],
    evidence: [
      {
        label: 'Account context',
        detail:
          'Include profile promise, current subjects, usual cadence, audience job, sample dates, and coverage limits.',
      },
      {
        label: 'Supported patterns',
        detail:
          'Keep only patterns backed by linked posts and a fair comparison. Label the strongest metric and counterexample.',
      },
      {
        label: 'Human constraints',
        detail:
          'Record product truth, prohibited claims, preferred language, confirmation rules, and goals supplied by the owner. Do not infer them from metrics.',
      },
    ],
    method: [
      {
        title: 'Separate facts from instructions',
        instruction:
          'Write observed evidence, interpretation, and editorial rule in distinct fields. This keeps an agent from treating a preference as measured truth.',
        evidence:
          'Every measured claim needs source URLs, sample dates, and the metric or text evidence behind it.',
      },
      {
        title: 'Keep the brief selective',
        instruction:
          'Include only patterns that affect the next job. Link to supporting report guides or source rows rather than copying every analysis table.',
        evidence:
          'A reader should be able to identify what to repeat, avoid, test, and verify without searching the raw history.',
      },
      {
        title: 'Add operating rules',
        instruction:
          'State how the agent should research, cite evidence, draft, ask for missing facts, and stop for review. Publishing remains a separate confirmed action.',
        evidence:
          'The brief should include the exact no-publish boundary and the conditions that require human input.',
      },
    ],
    interpretation: [
      'The brief is working context, not a permanent brand constitution. Date it and refresh it when the content or goals change.',
      'Evidence-backed patterns tell the agent what has happened. Human constraints decide what the account should do.',
      'Examples are more useful than adjectives. A linked strong and weak post can teach a boundary faster than ten vague voice words.',
    ],
    caveats: [
      'A brief built from partial public history inherits that coverage limit.',
      'Public performance cannot supply private product facts, legal boundaries, customer context, or business priorities.',
      'An agent brief does not authorize publishing. ilo still requires explicit confirmation for the exact final post and destination.',
    ],
    returns: [
      'A dated one-page brief with account context, audience jobs, and sample limits.',
      'Supported do, avoid, and test guidance with linked examples.',
      'Research, drafting, review, and publishing boundaries an agent can follow.',
    ],
    example: {
      title: 'A useful brief distinguishes evidence from preference',
      sample:
        'A hypothetical account has repeated evidence that build logs attract detailed replies. The owner also prefers never to use vague growth claims, a choice not derived from metrics.',
      finding:
        'Both belong in the brief, but they need different labels. One is an observed content pattern and the other is an editorial rule.',
      decision:
        'Cite build-log examples under evidence. Record the claim boundary under human constraints and require fact checking before drafts mention outcomes.',
    },
    agentPrompt:
      'Build a dated working brief for @handle from the supplied profile, post rows, report findings, and human constraints. Separate observed evidence, interpretation, editorial rules, and untested hypotheses. Include sample dates and coverage, account promise, audience jobs, topics to repeat, formats and openings, voice rules with linked examples, habits to avoid, active experiments, facts that require verification, and current goal. Add explicit research, drafting, review, and no-publish boundaries. Keep the brief concise enough to use and cite every measured claim.',
    surfaceFocus:
      'Compress source-backed account patterns and explicit human constraints into a dated brief with research, drafting, review, and no-publish rules.',
  },
  'voice-guide': {
    lead: 'Turn observable writing patterns and explicit editorial choices into a practical guide for drafting new posts without cloning old sentences.',
    question:
      'How should this account sound in new work, which choices make that voice recognizable, and where are the hard editorial boundaries?',
    dataSources: [
      'Representative strong, ordinary, and weak public posts with full text and URLs.',
      'Voice-pattern and language-repeat findings with exact excerpts and counterexamples.',
      'Human-approved terminology, claim rules, tone boundaries, and examples that remain current.',
    ],
    bestFor: [
      'Helping an agent draft in a recognizable style without impersonating exact posts.',
      'Giving editors concrete checks for evidence, rhythm, claims, and calls to action.',
      'Keeping measured patterns separate from owner preferences.',
    ],
    evidence: [
      {
        label: 'Observable traits',
        detail:
          'Describe sentence shape, point of view, specificity, evidence, uncertainty, humor, openings, transitions, and endings with exact short examples.',
      },
      {
        label: 'Strong and weak uses',
        detail:
          'Pair each recommended choice with a weak or generic counterexample so the boundary is visible.',
      },
      {
        label: 'Approved constraints',
        detail:
          'Mark terminology, forbidden claims, product facts, and tone choices supplied by the owner as editorial rules rather than performance findings.',
      },
    ],
    method: [
      {
        title: 'Write instructions a draft can follow',
        instruction:
          'Replace vague adjectives with observable actions. Specify how claims are introduced, how examples support them, and how uncertainty is stated.',
        evidence:
          'Every rule should include a short excerpt, source URL, and a plain non-example.',
      },
      {
        title: 'Cover structure and language',
        instruction:
          'Document openings, paragraph rhythm, sentence variation, direct address, vocabulary, formatting, calls to action, and endings. Keep topic-specific moves labeled.',
        evidence:
          'Use examples across more than one subject so the guide does not describe a single successful series.',
      },
      {
        title: 'Add a review checklist',
        instruction:
          'Turn the rules into checks for evidence, specificity, voice, claim safety, repetition, and fit with the post job. Require human review for product facts and final publishing.',
        evidence:
          'The checklist should catch both generic writing and overfitted imitation.',
      },
    ],
    interpretation: [
      'A voice guide preserves repeated choices while leaving room for new subjects and moods.',
      'Strong performance can inform the guide, but identity does not need to optimize every sentence for engagement.',
      'Exact excerpts demonstrate a rule. They are not templates to reproduce with nouns swapped.',
    ],
    caveats: [
      "Public writing does not reveal the author's private personality or intent.",
      'A historic voice can change deliberately. Date the guide and let the owner override old patterns.',
      'Performance association cannot prove a tone choice caused the result.',
    ],
    returns: [
      'Observable voice rules with source excerpts, URLs, and non-examples.',
      'Owner-approved language and claim boundaries clearly labeled.',
      'A practical draft-review checklist with a no-publish boundary.',
    ],
    example: {
      title: 'Direct is useful only when the guide explains what direct means',
      sample:
        'A hypothetical sample shows strong posts begin with the result, use one concrete example, and end without a generic call to action. Weak posts spend two sentences setting the scene.',
      finding:
        'The observable rule is result first with evidence, not merely a direct tone.',
      decision:
        'Write the guide around that structure, include linked examples and counterexamples, and allow narrative openings when the post job genuinely needs context.',
    },
    agentPrompt:
      'Create a voice guide for @handle from the supplied post sample and approved human constraints. Use observable drafting instructions, short exact excerpts, source URLs, and non-examples. Cover openings, sentence and paragraph rhythm, point of view, specificity, evidence, uncertainty, humor, vocabulary, formatting, calls to action, and endings. Separate measured associations from owner preferences. Add a review checklist that catches generic writing and copied phrasing, plus explicit fact-check and no-publish boundaries. Do not infer personality or clone exact sentences.',
    surfaceFocus:
      'Turn observable cross-topic writing choices and approved human constraints into source-backed rules, non-examples, and a draft review checklist.',
  },
  'monthly-report': {
    lead: 'Review one complete month against a fair earlier period and connect account movement to the posts, patterns, and tests behind it.',
    question:
      'What changed during the month, which posts and patterns explain the visible movement, and what should the account keep, investigate, or test next?',
    dataSources: [
      'A complete calendar month of original public posts with URLs, timestamps, topics, formats, and visible metrics.',
      'An earlier complete comparison month or matched period collected with the same rules.',
      'Dated profile snapshots for follower change and a log of launches, experiments, and important external events when those sections are required.',
    ],
    bestFor: [
      'A recurring owner, client, or team review with evidence behind every conclusion.',
      'Combining performance, content, timing, and audience-response findings into a short action plan.',
      'Keeping missing history and unavailable metrics visible instead of polishing them out of the summary.',
    ],
    evidence: [
      {
        label: 'Complete periods',
        detail:
          'Use full dates and the same post inclusion and maturity rules in both periods. State any history or metric coverage gap.',
      },
      {
        label: 'Account and output movement',
        detail:
          'Compare follower snapshots when available, post volume, active days, topic share, format share, and response totals and medians.',
      },
      {
        label: 'Posts behind the story',
        detail:
          'Link the strongest, weakest, most representative, and most surprising posts. Keep launches and amplification events beside the movement they may affect.',
      },
    ],
    method: [
      {
        title: 'Lock the period and coverage',
        instruction:
          'Use the latest complete calendar month and a comparable earlier month. Apply one timezone, original-post rule, and metric maturity cutoff.',
        evidence:
          'Open with exact dates, collection time, post counts, snapshot availability, missing metrics, and whether the source reached the requested history end.',
      },
      {
        title: 'Move from totals to causes worth checking',
        instruction:
          'Compare output and content mix before response. Then identify the post rows, topics, formats, windows, and experiments associated with the largest changes.',
        evidence:
          'Every narrative claim needs a metric table or linked example and should remain an association unless stronger evidence exists.',
      },
      {
        title: 'End with a bounded next month',
        instruction:
          'Choose a small keep, stop or redesign, and experiment list. Carry unfinished tests forward instead of declaring results early.',
        evidence:
          'Each next action needs an owner or agent job, number of posts, review metric, and review date.',
      },
    ],
    interpretation: [
      'Read coverage, output volume, and content mix before celebrating or diagnosing metric movement.',
      "Totals show the month's combined outcome. Medians show what happened to the typical post. One can improve while the other falls.",
      'A monthly report should narrow decisions. It should not turn every fluctuation into a story.',
    ],
    caveats: [
      'ilo does not currently generate this monthly report automatically or maintain all recurring profile and post snapshots. Supply the dated evidence and retain it for the next comparison.',
      'Public data may omit views, bookmarks, deleted posts, private activity, link clicks, conversions, and part of the history.',
      'Before-and-after movement and timing overlap do not prove a content change caused the result.',
    ],
    returns: [
      'A dated coverage statement and matched account, output, and response table.',
      'A concise narrative supported by linked posts and report-specific evidence.',
      'A next-month plan with keep, redesign, and experiment actions plus review dates.',
    ],
    example: {
      title: 'Higher typical response can coexist with lower totals',
      sample:
        'A hypothetical account publishes 48 posts in May and 31 in June. Total replies fall 12 percent, while median replies rise 35 percent and tutorial share doubles.',
      finding:
        'Lower volume explains part of the total decline. Tutorials repeatedly beat the June median, but one May launch still dominates raw views.',
      decision:
        'Report stronger typical response and lower total conversation as separate facts. Keep the tutorial test, review cadence, and leave the launch outlier outside the normal baseline.',
    },
    agentPrompt:
      'Create a monthly performance review for @handle using the latest complete calendar month and a comparable earlier period. Open with exact dates, timezone, collection time, post rules, maturity cutoff, sample sizes, snapshot coverage, and missing metrics. Compare follower change only from dated snapshots. Show post volume, active days, topic and format mix, totals, medians, outliers, and the linked posts behind major movement. Separate observation from interpretation and correlation from cause. End with bounded keep, redesign, and experiment actions with post counts, metrics, and review dates. Do not publish anything.',
    surfaceFocus:
      'Compare complete matched months, show coverage and content mix before response, cite the posts behind movement, and end with dated bounded actions.',
  },
} satisfies Record<string, XReportSpecificContent>
