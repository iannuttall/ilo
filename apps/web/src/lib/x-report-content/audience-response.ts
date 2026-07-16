import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const audienceResponseReportContent = {
  'reply-drivers': {
    lead: 'Find the topics, openings, prompts, and formats that repeatedly appear in posts with more replies for this account.',
    question:
      'What do reply-heavy posts have in common, and which traits still matter after exposure, topic, and outliers are considered?',
    dataSources: [
      'Original public posts with full text, URLs, dates, topics, formats, replies, and views when available.',
      'A comparison group of posts with similar exposure but fewer replies.',
      'Reply text or reply-author evidence only when it was collected lawfully and the analysis needs conversation quality, not only count.',
    ],
    bestFor: [
      'Writing posts meant to start useful conversation rather than collect passive likes.',
      'Finding prompts that attract relevant answers without generic engagement bait.',
      'Separating high reply totals from strong view-normalized reply response.',
    ],
    evidence: [
      {
        label: 'Reply outcome',
        detail:
          'Show raw replies and replies per 1,000 views where views exist. Exclude known thread roots or subtract observed self-replies. If thread evidence is incomplete, label the total as a raw count.',
      },
      {
        label: 'Invitation type',
        detail:
          'Label direct questions, requests for experience, disagreements, unresolved problems, personal updates, and posts with no explicit invitation.',
      },
      {
        label: 'Conversation value',
        detail:
          'When reply text is available, note whether responses add examples, answer the question, challenge the claim, ask for support, or mostly contain low-information reactions.',
      },
    ],
    method: [
      {
        title: 'Rank totals and rates separately',
        instruction:
          'Build one list for total replies and another for reply rate among posts with views. Mark high-view posts and quote amplification.',
        evidence:
          'Every selected post needs its URL, replies, views state, reply rate when valid, topic, format, and post age.',
      },
      {
        title: 'Compare the invitation',
        instruction:
          'Match reply-heavy and reply-light posts on subject and exposure. Inspect the opening, specificity, tension, question, and amount of context supplied.',
        evidence:
          'Support a driver with several strong examples and at least one weak use of the same tactic.',
      },
      {
        title: 'Check who and what came back',
        instruction:
          'If reply evidence exists, sample response substance and author relevance. Keep this qualitative review separate from the numeric ranking.',
        evidence:
          'State how many replies were reviewed and what was unavailable rather than generalizing from the visible first few.',
      },
    ],
    interpretation: [
      'Replies measure conversation volume, not automatic conversation quality.',
      'Questions work differently when they ask for a concrete experience instead of a broad opinion. Preserve that distinction.',
      'Controversy can raise replies while weakening the audience relationship. The content and tone of responses matter when the goal is useful discussion.',
    ],
    caveats: [
      'Public search may return only part of a reply tree, and deleted or restricted replies are missing.',
      "A root post reply count can include the author's own thread continuations. Do not call every raw reply an audience response when thread membership is incomplete.",
      'Views are snapshots and may be absent. Reply-rate rankings must use only valid denominators.',
      'Repeated traits correlate with replies in the sample. They do not prove the trait caused the conversation.',
    ],
    returns: [
      'Separate reply-total and reply-rate shortlists with full post evidence.',
      'Repeated invitation patterns, weak counterexamples, and suitable topics.',
      'One conversation test with a quality check as well as a reply count.',
    ],
    example: {
      title: 'A specific experience question beats a broad prompt',
      sample:
        'A hypothetical sample has ten direct questions. Four ask practitioners for a recent example, while six end with thoughts?',
      finding:
        'The specific questions beat the reply-rate median in three of four cases and receive detailed examples. The broad prompts produce more short agreement replies.',
      decision:
        'Test one concrete experience question on a previously strong topic and review a sample of reply substance, not only the count.',
    },
    agentPrompt:
      'Find reply drivers for @handle. Rank total replies and replies per 1,000 views separately, excluding missing denominators from rates. Match strong and weak posts by topic, format, exposure, and age. Label invitation type, specificity, tension, context, and call to response. If reply text is supplied, state the reply sample and assess substance separately from volume. Cite supporting and contradicting post URLs. Return one conversation test with numeric and quality measures. Do not use generic engagement bait and do not publish anything.',
    surfaceFocus:
      'Separate reply totals from valid reply rates, compare invitation types on matched posts, and inspect reply substance only when the reply sample is available.',
  },
  'repost-drivers': {
    lead: 'Find the ideas people repeatedly chose to pass to their own audience and identify the utility, identity, or novelty behind that sharing.',
    question:
      'Which post traits are associated with stronger reposting for this account, and what value does the reader appear able to pass on?',
    dataSources: [
      'Original public posts with full text, URLs, topics, formats, reposts, quotes, and views when available.',
      'Comparable posts with similar exposure but ordinary repost response.',
      'Quote-post text when available for understanding how other accounts framed the shared idea.',
    ],
    bestFor: [
      'Finding reference, identity, news, or useful-summary formats the audience shares.',
      'Separating broad distribution from a strong repost rate.',
      'Planning content that gives followers a clear reason to pass it on.',
    ],
    evidence: [
      {
        label: 'Share outcome',
        detail:
          'Show reposts and quotes separately, plus reposts per 1,000 views where the denominator exists.',
      },
      {
        label: 'Transferable value',
        detail:
          'Label practical utility, concise explanation, new information, identity signal, entertainment, endorsement, or timely update.',
      },
      {
        label: 'Quoted framing',
        detail:
          'When quote text is available, sample why people shared the post. Keep that sample size and availability explicit.',
      },
    ],
    method: [
      {
        title: 'Build share rankings',
        instruction:
          'Rank raw reposts, valid repost rates, and quote counts separately. Flag posts with outside amplification or unusually high views.',
        evidence:
          'Return post URL, post age, exposure state, topic, format, reposts, quotes, and rates where valid.',
      },
      {
        title: 'Identify what travels',
        instruction:
          'Compare high-share posts with matched ordinary posts. Inspect whether the strong post contains a portable claim, useful artifact, identity statement, novelty, or timely information.',
        evidence:
          'Require repeated examples before describing a transferable-value pattern.',
      },
      {
        title: 'Design a shareable test',
        instruction:
          'Choose one recurring subject and preserve the useful ingredient without copying the original wording. Decide whether reposts, quotes, or both are the success measure.',
        evidence:
          'State the content promise, format, comparison post, and maturity period in advance.',
      },
    ],
    interpretation: [
      'A repost can signal utility, identity, agreement, surprise, or entertainment. The count alone does not reveal which one.',
      'Quotes add framing and may include disagreement. Do not combine them with unquoted reposts without showing both values.',
      'High raw reposts from huge exposure can coexist with an ordinary sharing rate. That is distribution evidence, not necessarily stronger reader motivation.',
    ],
    caveats: [
      'Public records may omit some quote posts, deleted shares, or private activity.',
      'Views can be missing or continue changing, which limits rate comparisons.',
      'The analysis cannot prove why an individual shared a post unless their public quote text states it clearly.',
    ],
    returns: [
      'Raw repost, repost-rate, and quote shortlists with linked evidence.',
      'Repeated transferable-value patterns and ordinary counterexamples.',
      'One subject-specific share test with a declared outcome.',
    ],
    example: {
      title: 'A useful artifact gives the audience something to pass on',
      sample:
        'A hypothetical sample contains seven high-repost posts. Four include a checklist or small reference image, two announce news, and one is a broad opinion amplified by a large account.',
      finding:
        'Reference posts show repeated above-median repost rates across ordinary exposure. The opinion leads raw reposts but loses that advantage after exposure is considered.',
      decision:
        'Test another compact reference artifact on a well-supported topic and keep the amplified opinion as an outlier example.',
    },
    agentPrompt:
      'Find repost drivers for @handle. Separate raw reposts, quotes, and valid reposts per 1,000 views. Mark missing views, post age, and outside amplification. Match strong posts with ordinary posts on topic and format. Label the transferable value as utility, explanation, novelty, identity, entertainment, endorsement, or timely news, and support patterns with several URLs. If quote text is available, state the sample before interpreting it. Return one precise share test and do not publish anything.',
    surfaceFocus:
      'Separate raw reposts, valid rates, and quotes, then identify repeated transferable value rather than treating every share as the same behavior.',
  },
  'bookmark-drivers': {
    lead: 'Use available bookmark counts to find posts that behave like references, while keeping missing bookmark data and reading assumptions explicit.',
    question:
      'Which posts are saved more often, and what reusable detail, process, or reference value do those posts contain?',
    dataSources: [
      'Original public posts with full text, URLs, topics, formats, bookmarks, and views when available.',
      'A clear completeness check showing which posts expose bookmark counts and which do not.',
      'Comparable posts from the same topic that received ordinary save response.',
    ],
    bestFor: [
      'Finding tutorials, checklists, resources, and frameworks worth expanding.',
      'Separating reference value from conversation and broad exposure.',
      'Designing useful posts without claiming that a bookmark proves a later read.',
    ],
    evidence: [
      {
        label: 'Bookmark coverage',
        detail:
          'Count how many posts have known bookmark values. Unknown must remain separate from zero before any ranking or rate is calculated.',
      },
      {
        label: 'Save outcome',
        detail:
          'Show raw bookmarks and bookmarks per 1,000 views for posts with both fields available.',
      },
      {
        label: 'Reference structure',
        detail:
          'Label steps, checklists, templates, code, tools, data, definitions, examples, and other details a reader may want later.',
      },
    ],
    method: [
      {
        title: 'Audit metric completeness',
        instruction:
          'Split known bookmark counts, known zero values, and unavailable values. Report coverage before selecting winners.',
        evidence:
          'State the number and share of posts eligible for raw and rate comparisons.',
      },
      {
        title: 'Compare useful ingredients',
        instruction:
          'Match high-bookmark posts with ordinary posts in the same topic. Identify the concrete artifact, detail, or sequence present in the stronger example.',
        evidence:
          'Cite exact sections or short excerpts and preserve the post URL.',
      },
      {
        title: 'Plan a reference test',
        instruction:
          'Choose one well-supported topic and create a new artifact or process that stands on its own. Keep the next test distinct enough to add value.',
        evidence:
          'Declare format, topic, expected reader use, bookmark measure, and maturity period.',
      },
    ],
    interpretation: [
      'A bookmark is a save action. It does not prove the person returned, read the whole post, or acted on it.',
      'Reference posts may receive fewer replies because the reader job is different. Compare bookmarks without treating conversation as failure.',
      'High bookmarks from high views need a rate check when exposure is available.',
    ],
    caveats: [
      'Bookmark counts may be absent from public data for part or all of the sample.',
      'Private reasons for saving are not observable, and some people use likes or external tools as bookmarks.',
      'A useful artifact can correlate with saves without being the only reason for them.',
    ],
    returns: [
      'A bookmark coverage statement before any result.',
      'Raw and exposure-normalized save shortlists with reference-value labels.',
      'One new reference post test based on a repeated useful ingredient.',
    ],
    example: {
      title: 'Unknown bookmarks cannot be treated as zero',
      sample:
        'A hypothetical 80-post sample exposes bookmark counts for 46 posts. Six of those contain step-by-step checklists and four rank in the top ten for bookmark rate.',
      finding:
        'Checklists look promising inside the eligible sample, but 34 posts cannot be compared on this outcome.',
      decision:
        'Report the 57.5 percent coverage, test another checklist, and avoid an account-wide claim until more bookmark data is available.',
    },
    agentPrompt:
      'Analyze bookmark drivers for @handle. Split known counts, known zeroes, and unavailable values before ranking. State bookmark and view coverage. Show raw bookmarks and bookmarks per 1,000 views only for valid rows. Match strong and ordinary posts by topic, then identify concrete reference ingredients such as steps, templates, code, tools, data, or examples. Cite exact post URLs and include counterexamples. Describe bookmarks as saves, not completed reads. Return one reference-value test and do not publish anything.',
    surfaceFocus:
      'Audit bookmark coverage first, rank only valid rows, and connect repeated save response to concrete reference ingredients without claiming later reading.',
  },
  'view-to-reply-gaps': {
    lead: 'Find posts that received substantial public exposure but produced little conversation relative to comparable posts.',
    question:
      'Which posts attracted views without replies, and does the gap reflect the post job, audience fit, opening, clarity, or invitation to respond?',
    dataSources: [
      'Original public posts with known views, replies, full text, URLs, dates, topics, and formats.',
      'Comparable posts with similar views and more replies per 1,000 views.',
      'Optional reply samples for checking whether a low count still contained useful responses.',
    ],
    bestFor: [
      'Diagnosing attention that did not become visible conversation.',
      'Finding high-view announcements or media posts whose job may not require replies.',
      'Improving response invitations without trying to manufacture engagement on every post.',
    ],
    evidence: [
      {
        label: 'Valid gap rate',
        detail:
          'Calculate replies per 1,000 views only where both values are known and the post has had a reasonable maturity period.',
      },
      {
        label: 'Post job',
        detail:
          'Label announcement, reference, opinion, question, entertainment, support, or another clear job before judging the gap.',
      },
      {
        label: 'Matched converter',
        detail:
          'Find a post with similar exposure, topic, and format but a stronger reply rate. Compare specificity, tension, context, and invitation.',
      },
    ],
    method: [
      {
        title: 'Select real exposure gaps',
        instruction:
          'Set an exposure floor and reply-rate threshold from the sample distribution. Exclude missing views and posts too new for comparison.',
        evidence:
          'Publish the thresholds, eligible row count, maturity rule, and account median reply rate.',
      },
      {
        title: 'Respect the post job',
        instruction:
          'Remove or annotate posts whose intended outcome is not conversation. Keep announcements and reference posts if the user still wants to understand their response mix.',
        evidence:
          'Every candidate needs a job label and a reason the reply gap is or is not a problem.',
      },
      {
        title: 'Compare the response ingredients',
        instruction:
          'Pair each meaningful gap with a stronger converter and inspect opening, clarity, specificity, controversy, call to response, and audience fit.',
        evidence:
          'Return both URLs and avoid claiming a cause when several traits changed.',
      },
    ],
    interpretation: [
      'Views without replies can be normal for announcements, entertainment, and reference posts. The post job decides whether the gap matters.',
      'A low reply rate can still produce many useful replies at large scale. Keep count and rate together.',
      'A high view count may include repeated views and people outside the core audience. That can change the normalized reply ratio without showing how individuals responded.',
    ],
    caveats: [
      'View counts can be missing, delayed, or measured differently over time.',
      "A thread root can count the author's own continuations as replies. Exclude known thread roots or label their reply totals as raw when the thread is incomplete.",
      'The public record cannot show silent satisfaction, link clicks, conversions, private replies, or whether viewers read the post.',
      'Matched posts rarely differ in only one trait, so the report generates hypotheses rather than causes.',
    ],
    returns: [
      'A thresholded gap list with views, replies, rate, post job, and URLs.',
      'Matched stronger converters and visible differences worth testing.',
      'A decision to accept, revise, or test the gap for each post type.',
    ],
    example: {
      title: 'A product announcement can succeed without a reply prompt',
      sample:
        "A hypothetical announcement receives 300,000 views and 90 replies, below the account reply-rate median. It also becomes the month's most-reposted product post.",
      finding:
        'The conversation gap is real, but the post job appears to be broad product distribution rather than discussion.',
      decision:
        'Do not force a question into every announcement. Test a follow-up build note for conversation and keep the announcement judged on sharing and downstream evidence.',
    },
    agentPrompt:
      'Find view-to-reply gaps for @handle using only posts with known views and replies that meet a stated maturity rule. Publish the exposure floor, reply-rate threshold, eligible count, and account baseline. Label each post job before treating the gap as a problem. Pair meaningful gaps with similar-view posts that have more replies per 1,000 views and compare visible ingredients. Keep reply count and rate together, cite both URLs, and return accept, revise, or test decisions. Do not infer silent dissatisfaction and do not publish anything.',
    surfaceFocus:
      'Threshold valid replies-per-view ratios, label each post job, and compare meaningful gaps with similar-view posts that received more replies.',
  },
  'conversation-starters': {
    lead: 'Find posts that begin substantive public exchanges and separate useful discussion from high counts made of short reactions.',
    question:
      'Which claims, questions, and angles start relevant conversations for this account, and what makes the replies worth continuing?',
    dataSources: [
      'Original public posts with full text, URLs, topics, formats, and reply counts.',
      'A documented sample of public replies and reply authors for selected posts.',
      'Views when available for distinguishing conversation volume from exposure.',
    ],
    bestFor: [
      'Planning posts that invite examples, disagreement, or useful questions from the right audience.',
      'Finding conversation openings that produce more than agreement emojis or one-word answers.',
      'Giving an agent guidance for reply-oriented content without using engagement bait.',
    ],
    evidence: [
      {
        label: 'Starter structure',
        detail:
          'Label the opening claim, unresolved tension, question, request for experience, or invitation to challenge the idea.',
      },
      {
        label: 'Reply sample',
        detail:
          'Review a stated number of public replies and classify examples, questions, disagreement, support needs, low-information reactions, and spam.',
      },
      {
        label: 'Relevant participation',
        detail:
          'Use public bio or relationship evidence carefully to describe visible participant relevance. Unknown follower relationships must stay unknown.',
      },
    ],
    method: [
      {
        title: 'Select candidates by more than count',
        instruction:
          "Start with reply-heavy posts, then separate the author's self-replies from audience responses before sampling the exchange. Include some ordinary-count posts known to have detailed replies.",
        evidence:
          'State candidate rule, view coverage, number of posts, and reply sample per post.',
      },
      {
        title: 'Score substance transparently',
        instruction:
          'Classify replies with a small documented rubric. Keep disagreement and support questions separate from spam or empty reactions.',
        evidence:
          'Return category counts and representative public reply URLs where available, without exposing more personal data than the analysis needs.',
      },
      {
        title: 'Extract the invitation pattern',
        instruction:
          'Compare strong conversation starters with flat uses of the same question or claim shape. Note specificity, stakes, audience, and how the author joins the replies.',
        evidence:
          'Support every pattern with several root posts and at least one counterexample.',
      },
    ],
    interpretation: [
      'A smaller thread of detailed practitioner answers can be more useful than hundreds of short reactions. State the chosen quality criteria.',
      'Disagreement is not automatically bad. Good disagreement can expose assumptions and produce a useful follow-up post.',
      "The author's own replies can shape the thread after publication. Keep post design and follow-up behavior as separate observations.",
    ],
    caveats: [
      'Public reply trees can be incomplete, reordered, deleted, or restricted.',
      'Bio and relationship fields are limited proxies for relevance and must not become demographic or intent claims.',
      'Qualitative reply coding involves judgment. Publish the rubric and sample size so it can be challenged.',
    ],
    returns: [
      'A root-post shortlist with reply volume, valid rate, and sampled conversation substance.',
      'A transparent reply rubric with representative examples and limitations.',
      'Two conversation patterns and one author follow-up behavior to test.',
    ],
    example: {
      title: 'Twenty detailed answers can beat two hundred reactions',
      sample:
        'A hypothetical post asking for browser automation failures receives 46 replies, including 28 concrete examples. A broad hot take receives 210 replies, mostly short agreement or disagreement.',
      finding:
        'The first post produces less volume but a denser set of reusable practitioner evidence. Its question names the audience and asks for a specific event.',
      decision:
        'Use concrete experience requests for research-oriented conversations and judge them with substance as well as reply count.',
    },
    agentPrompt:
      'Find conversation starters for @handle. State how root posts and public replies were collected, the candidate rule, and the number of replies reviewed. Classify reply substance with a documented rubric covering examples, questions, disagreement, support needs, low-information reactions, and spam. Compare strong and flat uses of similar starter structures, including specificity, audience, stakes, and author follow-up. Cite root and representative reply URLs where available. Keep unknown relationships unknown, avoid demographic inference, and do not publish anything.',
    surfaceFocus:
      'Sample public replies with a stated rubric, compare conversation substance as well as volume, and extract starter patterns with counterexamples.',
  },
} satisfies Record<string, XReportSpecificContent>
