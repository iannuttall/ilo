import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const contentPatternReportContent = {
  'topic-winners': {
    lead: 'Group posts by the subjects they actually cover and find themes that repeatedly outperform the account baseline.',
    question:
      'Which topics earn stronger audience response across several posts, and which only look successful because of one outlier or a larger format?',
    dataSources: [
      'A representative public post sample with complete text, dates, URLs, formats, and visible metrics.',
      'A documented topic label for each post, allowing more than one label only when both subjects are substantial.',
      'Views when available so topic exposure and response after exposure can be compared separately.',
    ],
    bestFor: [
      'Choosing subjects for a repeatable content plan based on the account history.',
      'Checking whether a favorite topic actually earns attention or conversation.',
      'Giving an agent positive and negative examples for each recommended theme.',
    ],
    evidence: [
      {
        label: 'Topic definitions',
        detail:
          'Name each topic plainly and write a one-sentence inclusion rule. Avoid labels so broad that almost every post qualifies.',
      },
      {
        label: 'Topic baselines',
        detail:
          'For each topic show post count, median replies, median reposts, median views, and the share of posts above the account median.',
      },
      {
        label: 'Representative posts',
        detail:
          'Link a typical strong post, a typical weak post, and any major outlier. The topic label should be visible in the actual text.',
      },
    ],
    method: [
      {
        title: 'Label before ranking',
        instruction:
          'Create topic labels from the sample without looking at performance first, then apply them consistently. Merge labels that differ only by wording and keep multi-topic posts explicit.',
        evidence:
          'Return a topic glossary and the number of unclassified or ambiguous posts.',
      },
      {
        title: 'Compare repeated performance',
        instruction:
          'Require enough posts to calculate a useful median and compare each topic with the account baseline and with similar formats.',
        evidence:
          'A winning topic needs repeated above-baseline posts, not only the highest total metric.',
      },
      {
        title: 'Turn the topic into angles',
        instruction:
          'Break each winning topic into the angles, examples, or audience problems that drove its strongest posts. This gives the next post somewhere specific to go.',
        evidence:
          'Link at least two distinct strong angles and one weaker execution for contrast.',
      },
    ],
    interpretation: [
      'Topic size matters. A theme with four strong posts is promising but less settled than one with twenty mixed examples and a stable median.',
      'Format can carry a topic. Compare text, media, links, or articles within the topic before attributing the response to subject alone.',
      'A winning topic can become tired when repeated without a new angle. The report should preserve variety inside the theme.',
    ],
    caveats: [
      'Topic labeling involves judgment. Keep the glossary and ambiguous cases so another reader can challenge the grouping.',
      'Public engagement does not show business relevance, private sharing, or whether the right people responded.',
      'Strong association inside the sample does not guarantee the next post on that topic will perform well.',
    ],
    returns: [
      'A topic table with definitions, sample sizes, medians, and above-baseline shares.',
      'Linked strong, ordinary, and weak examples for every recommended topic.',
      'Two specific angles to test next and one overused angle to avoid repeating unchanged.',
    ],
    example: {
      title: 'A broad label hides the part that works',
      sample:
        'A hypothetical 80-post sample contains 26 posts labeled AI. Seven are build logs, nine are product announcements, and ten are general opinions.',
      finding:
        'The broad AI group looks average. Build logs beat the account reply median in six of seven cases, while announcements do so twice in nine cases.',
      decision:
        'Recommend the build-log angle rather than more AI posts. Keep the narrower label so the next review can test the same claim.',
    },
    agentPrompt:
      'Group the supplied @handle posts into clear topics using a written inclusion rule for each label. Label posts before ranking them and list ambiguous cases. For every topic show sample size, median replies, reposts, and views, plus the share above the account median. Compare similar formats and identify outliers. Link a strong, ordinary, and weak example. Recommend specific angles within repeated winning topics rather than broad subjects. State what the sample cannot prove and do not publish anything.',
    surfaceFocus:
      'Label posts with a documented topic glossary, compare topic medians and above-baseline shares, and turn winning themes into specific angles.',
  },
  'hook-patterns': {
    lead: 'Compare the opening lines of strong and weak posts to find structures that repeatedly earn attention or response for this account.',
    question:
      'Which opening structures appear in stronger posts, and do they still look useful when topic, format, and distribution are considered?',
    dataSources: [
      'Full public post text with the first sentence or first meaningful line preserved.',
      'Dates and post URLs joined to topic labels, format markers, and visible response metrics.',
      'Comparable weaker posts so common openings are not mistaken for winning openings.',
    ],
    bestFor: [
      'Giving an agent opening patterns grounded in the account voice.',
      'Finding hooks that work for replies, reposts, or reading rather than copying generic templates.',
      'Spotting openings that hide the point or require too much context.',
    ],
    evidence: [
      {
        label: 'Opening text',
        detail:
          'Quote the first sentence or line exactly and link the post. Do not reduce the hook to a label without showing what readers saw.',
      },
      {
        label: 'Structure labels',
        detail:
          'Classify openings such as direct claim, question, result first, story scene, list promise, disagreement, announcement, or context first.',
      },
      {
        label: 'Matched response',
        detail:
          'Compare openings across similar topics and formats. A result-first tutorial and a celebrity quote post do not make a fair pair.',
      },
    ],
    method: [
      {
        title: 'Extract hooks consistently',
        instruction:
          'Use the first complete thought rather than an arbitrary character limit. Keep line breaks and punctuation when they carry the structure.',
        evidence:
          'Return the exact opening, its structure label, topic, format, and post URL.',
      },
      {
        title: 'Compare strong and weak uses',
        instruction:
          'Find repeated structures in both stronger and weaker posts. Note what changes after the opening, including specificity, proof, and payoff.',
        evidence:
          'A useful pattern has several examples and at least one counterexample or boundary.',
      },
      {
        title: 'Write a reusable rule',
        instruction:
          'Describe the job the opening performs, then give a fill-free pattern that preserves the account voice. Avoid turning examples into canned templates.',
        evidence:
          'The recommendation should name the suitable topic or format and show an original post that demonstrates it.',
      },
    ],
    interpretation: [
      'A hook earns the next few seconds of attention. The rest of the post still has to deliver the promised value.',
      'Frequent structures can look successful because the account uses them often. Compare success rates and medians, not only winner counts.',
      'Specificity often matters more than the surface form. A question with a concrete tension may work while a broad engagement question falls flat.',
    ],
    caveats: [
      'Public metrics cannot isolate how many people stopped because of the first line. The report uses whole-post response as indirect evidence.',
      'Topic, existing audience interest, media, and outside distribution can outweigh the opening.',
      'Copying exact wording risks making the account repetitive. Reuse the function of the hook, not the sentence.',
    ],
    returns: [
      'A hook library with exact openings, labels, metrics, and post links.',
      'Repeated strong structures with counterexamples and conditions for use.',
      'A small set of account-specific opening rules for the next content test.',
    ],
    example: {
      title: 'Questions are not one pattern',
      sample:
        'A hypothetical sample has twelve question openings. Four ask a specific practitioner problem, while eight ask broad opinion questions.',
      finding:
        'Three of the four specific questions beat the reply median. Only one broad question does. The label question opener hides the useful difference.',
      decision:
        'Recommend questions that name a concrete situation and audience. Do not recommend adding a question mark to every post.',
    },
    agentPrompt:
      'Extract the first complete thought from every supplied @handle post and preserve its exact wording and line breaks. Label the opening structure, then compare response across similar topics and formats. Show repeated strong uses, weak uses of the same structure, and the specificity or payoff that differs. Return account-specific opening rules with post URLs and boundaries. Do not claim the first line caused the result. Do not write canned hooks or publish anything.',
    surfaceFocus:
      'Extract exact opening lines, label their function, compare matched strong and weak uses, and keep counterexamples beside every hook rule.',
  },
  'voice-patterns': {
    lead: 'Identify the writing traits that stay recognizable across strong posts without reducing the account to a list of vague adjectives.',
    question:
      'Which observable choices make this account sound like itself, and which of those choices appear consistently in posts the audience responds to?',
    dataSources: [
      'Full text from a representative mix of strong, ordinary, and weak public posts.',
      'Post URLs, dates, topics, formats, and response metrics.',
      'The current profile bio and longer articles when they help distinguish stable voice from short-post constraints.',
    ],
    bestFor: [
      'Giving an agent evidence-backed writing boundaries before it drafts.',
      'Preserving a recognizable voice while changing topics or formats.',
      'Replacing empty labels such as authentic or punchy with observable examples.',
    ],
    evidence: [
      {
        label: 'Sentence choices',
        detail:
          'Record sentence length shifts, fragments, questions, direct address, contractions, punctuation, and paragraph shape with quoted examples.',
      },
      {
        label: 'Point of view',
        detail:
          'Track first-person experience, direct claims, uncertainty, humor, disagreement, teaching, and how often the writer names evidence.',
      },
      {
        label: 'Stable boundaries',
        detail:
          'Note what strong posts avoid, such as hype, corporate phrasing, vague inspiration, or unsupported certainty.',
      },
    ],
    method: [
      {
        title: 'Sample across performance',
        instruction:
          'Read strong, median, and weak posts across several topics. Traits found only in winners may be format tactics rather than stable voice.',
        evidence:
          'Every voice claim should cite at least two posts and include exact excerpts short enough to inspect.',
      },
      {
        title: 'Name observable behavior',
        instruction:
          'Replace adjectives with instructions a writer can follow. Instead of confident, specify that the account makes a claim, gives one concrete example, and states uncertainty when needed.',
        evidence:
          'Pair each instruction with a matching excerpt and a non-example from the sample.',
      },
      {
        title: 'Separate voice from topic',
        instruction:
          'Check whether the trait appears in technical notes, announcements, opinions, and replies. Keep topic-specific moves labeled as such.',
        evidence:
          'A stable voice rule should survive at least two different subjects or formats.',
      },
    ],
    interpretation: [
      'Voice is a set of repeated choices, not a mood board. The examples matter more than the adjective.',
      'A trait can be recognizable without improving engagement. Keep identity traits separate from performance-linked traits.',
      'Weak posts are useful here because they show when the account sounds generic, rushed, or unlike its stronger work.',
    ],
    caveats: [
      'Short posts provide limited evidence about a writer. Include articles or longer posts when the guide needs nuance.',
      'An agent cannot infer private intent, personality, or demographic traits from public writing choices.',
      'Performance association does not mean every draft should maximize the same voice trait. Some posts need a different job or tone.',
    ],
    returns: [
      'A list of observable voice rules with exact supporting excerpts and post links.',
      'Identity traits separated from traits associated with stronger response.',
      'A do and avoid checklist an agent can apply without impersonating exact sentences.',
    ],
    example: {
      title: 'Specific evidence beats the label conversational',
      sample:
        'A hypothetical sample shows that strong posts often use one first-person observation, a concrete number, and a short final sentence. Weak posts use broad advice with no lived example.',
      finding:
        'The observable pattern is evidence followed by a plain conclusion. Calling the voice conversational would not tell a writer how to reproduce it.',
      decision:
        'Write the guide around first-person evidence, concrete detail, and concise conclusions. Keep conversational only as a secondary description.',
    },
    agentPrompt:
      'Build a voice analysis for @handle from the supplied strong, ordinary, and weak posts. Describe observable writing choices rather than personality labels. For every rule quote short exact excerpts from at least two post URLs and include a non-example. Separate stable identity traits from choices merely associated with stronger response. Cover sentence shape, point of view, evidence, uncertainty, humor, calls to action, and phrases the account avoids. Return a practical do and avoid checklist. Do not imitate exact sentences and do not publish anything.',
    surfaceFocus:
      'Turn repeated sentence, evidence, point-of-view, and tone choices into observable rules with exact examples and non-examples.',
  },
  'language-repeats': {
    lead: 'Find repeated phrases and framing habits, then separate useful signature language from stale wording that appears across weak posts.',
    question:
      'Which words, phrases, claims, and framing devices recur in this account, and how do their stronger and weaker uses differ?',
    dataSources: [
      'Complete public post text from a representative period.',
      'Post URLs, topics, formats, dates, and visible response metrics.',
      'A stop-word and normalization policy that preserves meaningful phrases, handles, product names, and negation.',
    ],
    bestFor: [
      'Finding distinctive phrases an agent should understand before drafting.',
      'Spotting tired framing that has become a default rather than a deliberate choice.',
      'Checking whether repeated claims are backed by examples or merely repeated more often.',
    ],
    evidence: [
      {
        label: 'Phrase frequency',
        detail:
          'Count meaningful two-to-five-word phrases after normalizing case and links. Keep exact examples so the count remains auditable.',
      },
      {
        label: 'Context and function',
        detail:
          'Label whether a repeat opens a post, states a claim, transitions, qualifies uncertainty, asks for response, or closes the idea.',
      },
      {
        label: 'Performance split',
        detail:
          'Compare the phrase in stronger and weaker posts, controlling for topic where possible. Frequent does not mean effective.',
      },
    ],
    method: [
      {
        title: 'Normalize without flattening',
        instruction:
          'Remove URLs and obvious boilerplate while preserving product names, handles, negation, numbers, and punctuation that changes meaning.',
        evidence:
          'Document the normalization rule and show the exact source posts behind every selected repeat.',
      },
      {
        title: 'Inspect repeated frames',
        instruction:
          'Group wording that performs the same job, such as result first, disagreement, confession, prediction, or lesson learned. Keep materially different claims separate.',
        evidence:
          'Return frequency, dates, topics, typical placement, and response range for each group.',
      },
      {
        title: 'Decide keep, vary, or retire',
        instruction:
          'Keep signature language when it stays useful across contexts. Vary a frame when it works but feels repetitive. Retire wording when it repeatedly adds no information and clusters in weak posts.',
        evidence:
          'Each decision needs linked strong and weak uses plus a plain explanation of the difference.',
      },
    ],
    interpretation: [
      'Repeated language can build recognition, but repetition without new evidence becomes empty quickly.',
      'A phrase may look strong because it belongs to a winning topic. Compare other wording within the same subject before crediting the phrase.',
      'Rare phrases can still be valuable. Frequency analysis should not erase memorable one-off lines.',
    ],
    caveats: [
      'Small samples create accidental repeats. Set a minimum frequency and show the count.',
      'Token counts miss sarcasm, context, images, and meaning that spans several sentences.',
      'The report can describe association and repetition. It cannot prove that a phrase caused engagement or audience recognition.',
    ],
    returns: [
      'A phrase and framing inventory with counts, functions, examples, and post links.',
      'Strong and weak uses of the same repeat so context remains visible.',
      'Keep, vary, or retire decisions suitable for an agent writing checklist.',
    ],
    example: {
      title: 'A signature phrase can turn into filler',
      sample:
        'A hypothetical account uses the phrase here is what I learned in fourteen posts. Five include a concrete result in the next sentence, while nine move into general advice.',
      finding:
        'The evidence-backed uses outperform the account reply median. The general uses cluster near the bottom and repeat the frame without a real lesson.',
      decision:
        'Keep the phrase only when the next line names a specific result or mistake. Vary or remove it when it introduces broad advice.',
    },
    agentPrompt:
      'Analyze repeated language in the supplied @handle posts. Document how you normalize links, case, boilerplate, and punctuation. Find meaningful repeated phrases and framing devices, then show frequency, function, topics, dates, performance range, and exact post URLs. Compare strong and weak uses before labeling wording effective. Return keep, vary, or retire decisions with a reason and counterexample. Preserve rare but distinctive lines outside the frequency ranking. Do not infer causation and do not publish anything.',
    surfaceFocus:
      'Count meaningful phrases and framing devices, inspect their context in strong and weak posts, and decide which to keep, vary, or retire.',
  },
  'post-length': {
    lead: 'Compare useful length bands inside the account history and find where extra words help, hurt, or merely reflect a different kind of post.',
    question:
      'Which post lengths are associated with stronger views, conversation, and sharing for this account after topic and format differences are considered?',
    dataSources: [
      'Complete public post text with a consistent character-counting method.',
      'Post URLs, topics, formats, timestamps, and visible response metrics.',
      'Article, thread, quote, link, and media markers so unlike formats can be separated.',
    ],
    bestFor: [
      'Testing whether concise posts or fuller explanations work better for this account.',
      'Finding a practical editing range without treating character count as a universal rule.',
      'Separating the effect of length from the effect of topic and format.',
    ],
    evidence: [
      {
        label: 'Consistent counts',
        detail:
          'Count visible post text with one method and state whether URLs, quoted text, and thread continuations are included.',
      },
      {
        label: 'Length bands',
        detail:
          'Use bands that leave enough posts in each group. Show sample size, median response, and spread rather than only an average.',
      },
      {
        label: 'Matched examples',
        detail:
          'Compare short and long posts on similar subjects and formats. Link representative strong and weak examples from each band.',
      },
    ],
    method: [
      {
        title: 'Build sensible bands',
        instruction:
          'Start with the actual length distribution and choose three to five bands with useful sample sizes. Keep articles and thread totals separate from single-post text.',
        evidence:
          'Return band boundaries, post counts, medians, quartiles when useful, and missing metric coverage.',
      },
      {
        title: 'Control for content type',
        instruction:
          'Compare length within recurring topics and formats. Longer tutorials and short announcements have different jobs, so an overall average can mislead.',
        evidence:
          'Show whether the length pattern survives at least one matched topic or format comparison.',
      },
      {
        title: 'Turn range into an editing test',
        instruction:
          'Choose one repeated post type and draft two future examples that differ mainly in detail, not subject. Measure the same outcome after both mature.',
        evidence:
          'State the target bands, topic, format, posting window, and response metric before publishing either test.',
      },
    ],
    interpretation: [
      'Length is usually a proxy for how much explanation a post contains. Read the actual examples before deciding that characters caused the result.',
      'A narrow winning band may reflect one recurring format. Keep the recommendation attached to that format.',
      'The best range for replies may differ from the best range for reposts or bookmarks. Report those outcomes separately.',
    ],
    caveats: [
      'Character counts do not measure clarity, information density, novelty, or the value of attached media.',
      'Small or uneven bands produce fragile comparisons. Do not rank a band containing only two posts.',
      'Public metrics cannot show reading completion, dwell time, or whether people opened a long-post expansion.',
    ],
    returns: [
      'A length distribution with band sizes and median response by outcome.',
      'Matched short and long examples that show when extra detail helped or hurt.',
      'One controlled length test tied to a repeated topic and format.',
    ],
    example: {
      title: 'Longer works for tutorials, not for everything',
      sample:
        'A hypothetical sample of 100 posts shows that 600-to-1,000-character posts lead bookmarks. Nine of the eleven posts in that band are tutorials.',
      finding:
        'Within tutorials the longer band still beats short tutorials, but long announcements perform no better than concise announcements.',
      decision:
        'Recommend fuller tutorials and concise announcements. Do not turn 600 to 1,000 characters into an account-wide target.',
    },
    agentPrompt:
      'Analyze post length for @handle using a documented character-counting rule. Build bands from the actual distribution and keep articles, threads, quotes, and single posts separate. Show sample size, median replies, reposts, bookmarks, and views for each band, with missing data stated. Compare short and long examples within similar topics and formats. Return format-specific ranges and one controlled length test. Do not claim length alone caused performance and do not publish anything.',
    surfaceFocus:
      'Build sample-aware length bands, compare medians within similar topics and formats, and return a format-specific editing test.',
  },
} satisfies Record<string, XReportSpecificContent>
