import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const formatBreakdownReportContent = {
  'threads-vs-single-posts': {
    lead: 'Compare complete thread units with standalone posts and separate total views, per-post response, and the work each format is doing.',
    question:
      'Do threads or standalone posts produce stronger views, conversation, and sharing for this account, and on which subjects does the difference hold?',
    dataSources: [
      'Original public posts with thread membership, post order, timestamps, text, and visible metrics.',
      'A complete thread boundary so replies from other accounts and unrelated self-replies are not counted as part of the format.',
      'Standalone posts from comparable topics and periods.',
    ],
    bestFor: [
      'Deciding when an idea needs a sequence rather than one post.',
      'Checking whether headline thread totals hide weak response on most individual posts.',
      'Designing a fair thread test around subjects already used in both formats.',
    ],
    evidence: [
      {
        label: 'Complete units',
        detail:
          'Aggregate a thread as one publishing unit while retaining every post in order. Keep standalone posts as one unit each.',
      },
      {
        label: 'Several outcomes',
        detail:
          'Compare root-post metrics, whole-thread totals, audience replies, reposts, bookmarks, and views when available. Subtract known author continuations from reply counts. Do not add views across a thread and call the sum unique viewers.',
      },
      {
        label: 'Matched subjects',
        detail:
          'Compare threads and standalone posts covering similar topics and published in similar periods. Format conclusions based on unrelated subjects are weak.',
      },
    ],
    method: [
      {
        title: 'Reconstruct each thread',
        instruction:
          'Identify the root, preserve self-reply order, exclude other authors, and mark incomplete sequences. Record thread length and whether the final post contains a call to action or link.',
        evidence:
          'Every thread row needs the root URL, post count, completeness state, raw replies, known author continuations, audience-reply remainder, and available whole-thread totals.',
      },
      {
        title: 'Compare like with like',
        instruction:
          'Group units by subject and period, then compare medians for roots, standalone posts, and total thread response. Keep sample sizes visible.',
        evidence:
          'Show at least one matched thread and standalone example for any format recommendation.',
      },
      {
        title: 'Choose the job for each format',
        instruction:
          'Decide whether threads help explanation, distribution, or continued conversation. Recommend a format only for the job supported by the observed metrics.',
        evidence:
          'The next test should name one topic, one thread length, one standalone comparison, and the primary outcome.',
      },
    ],
    interpretation: [
      'A thread creates several opportunities for response, so raw totals are not directly comparable with one standalone post. Show per-unit and per-post figures.',
      'Root-post performance matters because readers must enter the thread before later posts can help.',
      'A thread can be useful for explanation even when it does not win views. Match the conclusion to the publishing job.',
    ],
    caveats: [
      'Public search may return an incomplete thread or omit deleted self-replies. Mark those units incomplete and keep them out of total comparisons.',
      'Adding views across posts does not produce a unique audience count because the same person may see several posts.',
      'Topic depth, novelty, and promotion can explain differences that appear to come from format.',
    ],
    returns: [
      'A unit-level table for complete threads and standalone posts with matched outcomes.',
      'Root, whole-thread, and per-post response kept separate.',
      'A subject-specific thread or standalone test with a declared success metric.',
    ],
    example: {
      title: 'A large thread total can hide an ordinary root',
      sample:
        'A hypothetical sample contains eight threads and forty standalone posts. Threads average 220 total replies across all posts, but their roots receive a median of 24 replies against 31 for matched standalone tutorials.',
      finding:
        'The extra thread replies occur mostly on later examples and author clarifications. Root views are ordinary, while the sequence supports longer discussion.',
      decision:
        'Use threads for subjects that benefit from examples and follow-up discussion. Do not claim they improve initial views from the summed totals.',
    },
    agentPrompt:
      'Compare threads and standalone posts for @handle. Reconstruct complete self-authored threads, exclude other authors, and flag missing posts. Separate raw reply counts, known author continuations, and the remaining audience replies. Report root metrics, whole-thread totals, per-post response, thread length, topic, and dates. Never sum views and call the result a unique audience. Match threads with standalone posts on subject and period. Explain which format is associated with initial views, explanation, or conversation, then design one controlled comparison. Cite every root URL and do not publish anything.',
    surfaceFocus:
      'Reconstruct complete thread units, compare roots and whole-thread totals with matched standalone posts, and keep summed views away from unique-audience claims.',
  },
  'long-posts': {
    lead: 'Review extended X posts as their own format and find when the extra space produces useful depth rather than slower, less focused writing.',
    question:
      'When do longer X posts earn stronger reading, saving, sharing, or conversation than shorter posts from the same account?',
    dataSources: [
      'Complete long-post text, post URLs, dates, and visible public metrics.',
      'Comparable shorter posts on similar subjects and from similar periods.',
      'Structure markers such as opening claim, section breaks, examples, lists, links, media, and final call to action.',
    ],
    bestFor: [
      'Deciding which ideas deserve an extended post rather than a short post or article.',
      'Finding long-post structures associated with bookmarks, reposts, or detailed replies.',
      'Spotting long posts that use more space without adding evidence or clarity.',
    ],
    evidence: [
      {
        label: 'Full structure',
        detail:
          'Preserve the full text and mark the opening, claim, examples, transitions, and ending. Character count alone cannot explain the format.',
      },
      {
        label: 'Reading proxies',
        detail:
          'Use bookmarks, reposts, replies, and views as separate public signals. Do not label them completion rate or dwell time.',
      },
      {
        label: 'Short comparison',
        detail:
          'Match long posts with shorter posts on subject and intent. Announcements and tutorials should not share one baseline.',
      },
    ],
    method: [
      {
        title: 'Define long for the sample',
        instruction:
          'Use a documented threshold or the account length distribution. Keep X articles and multi-post threads outside the single long-post group.',
        evidence:
          'State the threshold, number of qualifying posts, median length, and excluded formats.',
      },
      {
        title: 'Audit information density',
        instruction:
          'Count concrete claims, examples, steps, or evidence and inspect whether the opening promises what the body delivers. Mark repetition and context that could be cut.',
        evidence:
          'Pair each structural finding with a quoted excerpt and post URL.',
      },
      {
        title: 'Compare outcomes by job',
        instruction:
          'Separate explanatory posts, stories, announcements, and opinions. Compare long and short versions within a job before setting a length recommendation.',
        evidence:
          'Show sample size and median response for every comparison, plus at least one counterexample.',
      },
    ],
    interpretation: [
      'Long posts often cover subjects that already invite depth. Strong results can reflect the topic as much as the space used.',
      'Bookmarks and detailed replies can support a usefulness claim, but they still do not measure whether the whole post was read.',
      'A strong long post usually earns its length with examples, proof, or a sequence. More words without more value is just more scrolling.',
    ],
    caveats: [
      'Public data does not include completion rate, dwell time, expansion clicks, or private saves when bookmark counts are absent.',
      'Long-post access and display can differ across clients or account capabilities.',
      'Small samples and a few unusually important topics can dominate the result.',
    ],
    returns: [
      'A long-post inventory with structure, subject, length, and response metrics.',
      'Matched short comparisons and the situations where depth appears useful.',
      'An editing checklist for earning the extra length and one bounded test.',
    ],
    example: {
      title: 'Depth helps when the post contains evidence',
      sample:
        'A hypothetical account has fifteen extended posts. Six include a result, method, and concrete example; nine are expanded opinions.',
      finding:
        'The evidence-rich group earns twice the median bookmarks of matched short tutorials. Expanded opinions have no consistent advantage over short opinions.',
      decision:
        'Reserve the format for posts that need proof or a sequence. Keep opinions concise unless extra space adds evidence.',
    },
    agentPrompt:
      'Audit long posts for @handle using a stated threshold. Exclude threads and X articles from the single-post group. For each post record length, topic, job, opening promise, concrete examples, structure, ending, metrics, and URL. Compare long and short posts within the same job and period. Treat bookmarks, reposts, and replies as separate proxies, not reading completion. Return the situations where extra depth appears useful, counterexamples, an editing checklist, and one test. Do not publish anything.',
    surfaceFocus:
      'Separate long posts from threads and articles, audit whether each earns its length, and compare it with shorter posts doing the same job.',
  },
  'media-vs-text': {
    lead: 'Compare posts with images or video against text-only posts while keeping media type, subject, and missing view data visible.',
    question:
      'How do posts with attached media compare with text-only posts for views, sharing, and conversation, and which differences repeat by media type?',
    dataSources: [
      'Public posts with media type, media count, text, URLs, dates, and visible metrics.',
      'Text-only posts from similar topics, periods, and publishing jobs.',
      'Media descriptions or manual labels for screenshots, charts, photos, demos, video, and decorative assets.',
    ],
    bestFor: [
      'Deciding where a screenshot, chart, photo, or demo earns its production cost.',
      'Checking whether media posts have more views but fewer or different replies.',
      'Avoiding a broad media works conclusion built from one successful video.',
    ],
    evidence: [
      {
        label: 'Media type',
        detail:
          'Separate images, multiple-image posts, GIF-like assets when identifiable, and video. Label the role of the media rather than treating every attachment alike.',
      },
      {
        label: 'Matched text posts',
        detail:
          'Compare posts on the same subject and with the same job. Product demos and written opinions should not define the media gap.',
      },
      {
        label: 'Response profile',
        detail:
          'Show views, replies, reposts, likes, quotes, and bookmarks separately. Media can change the mix even when total interaction looks similar.',
      },
    ],
    method: [
      {
        title: 'Classify what the media does',
        instruction:
          'Label each attachment as proof, explanation, demonstration, identity, entertainment, or decoration. Record uncertain labels rather than forcing them.',
        evidence:
          'Every example needs the post URL, media type, role, topic, and visible metrics.',
      },
      {
        title: 'Build matched comparisons',
        instruction:
          'Compare media and text-only posts within repeated topics and similar periods. Use medians and show group sizes.',
        evidence:
          'A recommendation should survive at least one topic-specific comparison and not depend on a single outlier.',
      },
      {
        title: 'Choose media for a job',
        instruction:
          'Recommend the media role supported by the rows. A screenshot may provide proof, while a short demo may explain motion that text cannot.',
        evidence:
          'The next test should specify asset type, topic, text treatment, and the response metric it is meant to affect.',
      },
    ],
    interpretation: [
      'Media is not one format. A product screenshot, chart, selfie, and video demo ask for different attention and deserve separate groups.',
      'Higher views with ordinary replies show a different observed response mix. Whether the media changed distribution needs a controlled comparison.',
      'Strong text may make media useful by explaining what to notice. Inspect the pair rather than scoring the attachment alone.',
    ],
    caveats: [
      'Public records may not identify media variants, autoplay behavior, video completion, or accessibility quality.',
      'Production quality and subject selection can confound a media comparison.',
      'Missing views or bookmarks reduce what can be said about attention or saving. Keep those posts out of rate calculations.',
    ],
    returns: [
      'Media performance split by type and role with matched text-only baselines.',
      'Linked examples showing where media adds proof, explanation, or distraction.',
      'One media test with a declared asset, subject, and outcome.',
    ],
    example: {
      title: 'Screenshots and decorative images tell different stories',
      sample:
        'A hypothetical sample has twenty image posts. Eight screenshots demonstrate a product change, while twelve use decorative branded graphics.',
      finding:
        'Screenshots beat matched text updates on reposts and replies. Decorative graphics receive more likes but no clear reply or repost advantage.',
      decision:
        'Use screenshots when the image proves the claim. Do not recommend images generally from the combined group.',
    },
    agentPrompt:
      'Compare media and text-only posts for @handle. Split images, galleries, and videos, then label whether the asset provides proof, explanation, demonstration, identity, entertainment, or decoration. Match posts by topic, job, and period. Show sample sizes and separate views, replies, reposts, likes, quotes, and bookmarks. Cite strong and weak examples for every media role. Recommend one precise asset test and keep missing metrics unknown. Do not publish anything.',
    surfaceFocus:
      'Classify media by type and job, compare it with matched text-only posts, and avoid a single combined media score.',
  },
  'links-vs-no-links': {
    lead: 'Compare posts with outbound links against posts without links and keep click intent separate from public engagement.',
    question:
      'How do posts containing links differ in visible views and response, and which subjects still justify sending the reader elsewhere?',
    dataSources: [
      'Public posts with expanded link presence, destination type, text, dates, URLs, and visible metrics.',
      'Comparable no-link posts from the same account and period.',
      'First-party click or conversion data when available outside the public X record.',
    ],
    bestFor: [
      'Choosing when a post should carry a destination and when the idea should stand alone.',
      'Checking whether link posts receive a different public response mix.',
      'Avoiding claims about click performance when only X engagement is available.',
    ],
    evidence: [
      {
        label: 'Destination job',
        detail:
          'Label each link as article, product, signup, documentation, source, event, or another clear destination. The purpose shapes the expected outcome.',
      },
      {
        label: 'Public response',
        detail:
          'Compare views, replies, reposts, likes, quotes, and bookmarks. These metrics do not reveal whether anyone clicked.',
      },
      {
        label: 'Matched no-link posts',
        detail:
          'Use similar topics and calls to action. Link-heavy announcements are a poor baseline for no-link observations.',
      },
    ],
    method: [
      {
        title: 'Resolve and label links',
        instruction:
          'Identify whether the post contains an outbound destination, what it leads to, and whether the useful content is also present in the post.',
        evidence:
          'Return the post URL, destination category, topic, call to action, and visible metrics.',
      },
      {
        title: 'Compare public outcomes',
        instruction:
          'Measure link and no-link groups overall and within recurring subjects. Use medians, group sizes, and exposure-normalized response only where views exist.',
        evidence:
          'Show at least one strong and weak link post plus matched no-link examples.',
      },
      {
        title: 'Add click evidence separately',
        instruction:
          'If first-party analytics exists, join it by destination and date without mixing clicks into public engagement. If it does not exist, state that the link job remains partly unmeasured.',
        evidence:
          'A click or conversion conclusion must name its source and measurement window.',
      },
    ],
    interpretation: [
      'A link post can be successful with modest public engagement when it sends qualified readers to the intended page. Public metrics cannot settle that job.',
      'Posts that contain most of the value before the link may behave differently from teaser posts. Keep them separate when the sample allows.',
      'Destination importance matters. Documentation and support links may be necessary even if they never win an engagement comparison.',
    ],
    caveats: [
      'X public data does not expose outbound click totals or conversions through these tools.',
      'Link previews, destination reputation, tracking redirects, and the surrounding news cycle can affect results.',
      'An observed gap does not prove the platform suppressed links. Topic, writing, audience intent, and distribution remain possible explanations.',
    ],
    returns: [
      'A link and no-link comparison with destination categories and public response metrics.',
      'Matched examples showing how much value appears before the click.',
      'A decision on which post jobs need first-party click data before changing the format.',
    ],
    example: {
      title: 'Lower replies do not make a documentation link useless',
      sample:
        'A hypothetical sample has thirty link posts and sixty no-link posts. Link posts receive fewer median replies, while product documentation links send 1,200 measured visits in first-party analytics.',
      finding:
        'The public conversation gap is real, but the documentation posts are completing a different job that the X metrics do not capture.',
      decision:
        'Keep useful documentation links, improve the value stated before the click, and judge them with visit quality as well as public response.',
    },
    agentPrompt:
      'Compare link and no-link posts for @handle. Resolve each destination category and note how much useful content appears before the link. Match posts by topic, job, and period. Report public views, replies, reposts, likes, quotes, and bookmarks separately. Never call these clicks. If first-party click or conversion rows are supplied, cite their source and window in a separate section. Return matched examples and identify which post jobs cannot be judged from public engagement alone. Do not claim platform suppression and do not publish anything.',
    surfaceFocus:
      'Label link destinations, compare matched public response, and keep clicks or conversions outside the conclusion unless first-party evidence is supplied.',
  },
  'quote-posts': {
    lead: "Review quote posts as a combination of someone else's distribution and the account's added argument, context, or endorsement.",
    question:
      'When does quoting another post help this account add useful context or join a conversation, and when does the added text contribute little?',
    dataSources: [
      'Public quote posts with the account text, quoted-post record when available, dates, URLs, and visible metrics.',
      'Quoted author size and quoted-post response as context, not as credit assigned to the account.',
      'Comparable standalone posts on similar subjects.',
    ],
    bestFor: [
      'Finding quote-post styles that add a clear point rather than borrowing attention.',
      'Separating large quoted-post distribution from the account response.',
      'Deciding which conversations are worth joining with a quote.',
    ],
    evidence: [
      {
        label: 'Added contribution',
        detail:
          'Classify the account text as explanation, disagreement, endorsement, example, joke, summary, or low-context reaction.',
      },
      {
        label: 'Quoted context',
        detail:
          'Record the quoted author, quoted text when available, topic, and visible quoted-post metrics. Keep missing quoted records explicit.',
      },
      {
        label: 'Account response',
        detail:
          'Measure the quote post itself and compare it with standalone posts by the account on similar subjects.',
      },
    ],
    method: [
      {
        title: 'Read both halves',
        instruction:
          'Preserve the account commentary and the quoted post as separate evidence. Identify what a reader gains from the added text.',
        evidence:
          'Every row should link both records when available and name the contribution type.',
      },
      {
        title: 'Control for borrowed distribution',
        instruction:
          'Mark large quoted authors, already viral quoted posts, and reciprocal relationships visible in the sample. Do not compare those rows with ordinary standalone posts without context.',
        evidence:
          'Show account response beside quoted-post scale and include medians with and without major amplification outliers.',
      },
      {
        title: 'Set a contribution rule',
        instruction:
          'Find contribution types that repeatedly produce useful replies or reposts. Write a rule for what the account should add before using the format.',
        evidence:
          'Support the rule with several quote posts and at least one flat example.',
      },
    ],
    interpretation: [
      'A successful quote can reflect the quoted post, the added commentary, the relationship between accounts, or all three.',
      'Low-context reactions may work for an audience already following the conversation and fail for everyone else.',
      'Quote posts can demonstrate taste and network position even when their direct engagement is ordinary. State that as interpretation, not measured growth.',
    ],
    caveats: [
      'The quoted post may be deleted, edited, restricted, or missing from the public response.',
      "Public data cannot reveal how much distribution came from each author's network.",
      'A quote-post association cannot prove that the added commentary caused the response.',
    ],
    returns: [
      'A quote-post inventory with contribution type, quoted context, and account metrics.',
      'Results with and without large quoted-post outliers.',
      'A practical rule for when the account has enough to add before quoting.',
    ],
    example: {
      title: 'Adding a useful example beats saying this',
      sample:
        'A hypothetical sample includes eighteen quote posts. Six add a concrete example, five explain disagreement, and seven use a short endorsement such as this.',
      finding:
        'Example and disagreement posts produce repeated replies from the account audience. Short endorsements perform only when the quoted post is already unusually large.',
      decision:
        'Recommend quote posts when the account can add evidence or a clear argument. Treat short reactions as network-dependent, not a repeatable content pattern.',
    },
    agentPrompt:
      'Analyze quote posts for @handle by reading the account commentary and quoted record separately. Label the added contribution, record quoted author and quoted-post scale, and compare the account post with standalone posts on similar subjects. Show results with large amplification outliers included and excluded. Cite both URLs when available. Find contribution types supported by several examples and include flat counterexamples. Do not assign distribution to one side without evidence and do not publish anything.',
    surfaceFocus:
      'Separate the account contribution from quoted-post context, control for large amplification, and compare contribution types with matched standalone posts.',
  },
} satisfies Record<string, XReportSpecificContent>
