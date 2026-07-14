export type ToolContentSection = {
  heading: string
  html: string
}

export type ToolFaq = {
  question: string
  answer: string
}

export type ToolPageContent = {
  seoTitle: string
  heading: string
  description: string
  sections: ToolContentSection[]
  faqs: ToolFaq[]
}

export const TOOL_PAGE_CONTENT: Record<string, ToolPageContent> = {
  'twitter-follower-count': {
    seoTitle: 'Live Twitter Follower Count',
    heading: 'Watch a live Twitter follower count for any public 𝕏 account',
    description:
      'See the number move during a launch, milestone, or viral moment without refreshing the 𝕏 profile yourself.',
    sections: [
      {
        heading: 'What this counter actually shows',
        html: `<p>Paste any public 𝕏 handle and the page pulls the current follower count from public profile data. It re-checks every 30 seconds, with a manual refresh button if you want the number sooner. The big number is the current follower count. The small badge underneath shows how much it has moved since you opened the page.</p><p>It is the same data the profile header on x.com is built from, just pulled into a focused page so you can keep an eye on a launch, a post going viral, or a milestone without scrubbing the 𝕏 UI.</p>`,
      },
      {
        heading: 'Why a Twitter follower count can drift in the short term',
        html: `<p>𝕏 serves profile data from several caches. The count on the profile page, the count in the API, and the count returned by public data can disagree for a few seconds after a follow or unfollow. That is normal. The number here lines up within a refresh or two.</p><p>Spam removals, banned accounts being purged, and the usual cleanup also cause counts to wobble. A drop of a few hundred followers across an account is rarely a real loss, just 𝕏 tidying up.</p>`,
      },
      {
        heading: 'When you actually want a follower history, not a live count',
        html: `<p>A live counter is useful for a moment, like a launch or a milestone. For week-on-week growth, daily snapshots, or comparing accounts over time, you want a follower tracker. That is what ilo is for. Add a handle and ilo records the account over time, then gives your agent the context to understand the trend.</p><p>If you want the broader performance picture, <a href="/twitter-profile-analytics">Twitter profile analytics</a> pairs well with this counter.</p>`,
      },
      {
        heading: 'Other Twitter tools that pair with this one',
        html: `<p>If you came here looking for a specific account, the <a href="/twitter-id">Twitter ID finder</a> and <a href="/twitter-profile-picture-downloader">Twitter profile picture downloader</a> work the same way. Paste a handle, get the data, no login.</p>`,
      },
    ],
    faqs: [
      {
        question: 'How live is "live" here?',
        answer:
          'The page re-fetches the public profile every 30 seconds and refreshes when you click the refresh button. 𝕏 itself caches some profile data for a few seconds, so a brand-new follow can take a moment to show up.',
      },
      {
        question: 'Can I track follower count changes over time?',
        answer:
          'This tool only shows the current count and the change since you opened the page. For long-term Twitter follower history, use ilo tracking and reports.',
      },
      {
        question: 'Why does the count look slightly different from x.com?',
        answer:
          '𝕏 serves the follower number from a few different caches. The number on the profile page, the number in the API, and the number a third party sees through public data can drift by a few followers for a short window after a change.',
      },
      {
        question: 'Does this work for protected or suspended accounts?',
        answer:
          'No. Protected accounts return limited profile data, and suspended or deleted accounts return a not-found error. The follower count needs to be public for the live counter to work.',
      },
    ],
  },
  'twitter-search-without-account': {
    seoTitle: 'Twitter Search Without Account',
    heading: 'Search Twitter without logging in',
    description:
      'Find public posts, media, and operator matches without getting stopped by the 𝕏 login wall.',
    sections: [
      {
        heading: 'Search public Twitter posts without logging in',
        html: `<p>𝕏 often asks people to log in before showing search results. This page gives you a lighter route for public posts. Enter normal text, a phrase, or an 𝕏 search operator and the tool returns public matches from the latest, top, or media feed.</p>`,
      },
      {
        heading: '𝕏 search operators work here too',
        html: `<p>The useful operators still work. Try <code>from:username</code> for posts from one account, <code>min_faves:100</code> for popular posts, <code>filter:links</code> for posts with links, or dates such as <code>since:2026-01-01</code>. The <a href="/twitter-advanced-search">Twitter advanced search builder</a> can help build a longer query.</p>`,
      },
      {
        heading: 'What this tool cannot show',
        html: `<p>This is public search. It does not bypass privacy controls, recover deleted posts, or show posts 𝕏 no longer exposes through public data. If a search comes back empty, the post may be private, deleted, too old for the current index, or just not returned for that query.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Can I search Twitter without an account?',
        answer:
          'Yes. This tool searches public 𝕏 posts without asking you to log in. It cannot show private posts, deleted posts, or anything 𝕏 does not return publicly.',
      },
      {
        question: 'Do 𝕏 search operators work here?',
        answer:
          'Yes. You can use normal 𝕏 search operators such as from:username, min_faves:100, filter:links, since:YYYY-MM-DD, and exact phrases in quotes.',
      },
      {
        question: 'Why are results different from x.com?',
        answer:
          '𝕏 changes ranking and availability by surface. This tool uses publicly available 𝕏 results, so results can differ from the logged-in 𝕏 app.',
      },
    ],
  },
  'twitter-profile-analytics': {
    seoTitle: 'Twitter Profile Analytics',
    heading: 'Check Twitter profile analytics for any public 𝕏 account',
    description:
      'See follower totals, recent views, engagement rate, and profile context before you judge an account.',
    sections: [
      {
        heading: 'Check any public 𝕏 profile',
        html: `<p>Paste a username or a profile URL and you get the public profile back, plus a quick read on how the account is performing. No login, no API key.</p><p>The profile section is the same data you would see if you opened the account in a browser: display name, bio, follower and following counts, post count, joined date, verification, website. The recent activity section covers the latest public posts and shows views, engagements, bookmarks, and the rate at which viewers are interacting.</p>`,
      },
      {
        heading: 'How to read the numbers',
        html: `<p><strong>Followers</strong> and <strong>posts</strong> are lifetime totals from the profile. <strong>Recent views</strong> is the sum of views across the latest public posts in the sample, so it reflects how the account is performing right now rather than a lifetime figure. <strong>Engagement rate</strong> is engagements divided by views on those same posts.</p><p>One number on its own is not very useful. The combination is. A 100k-follower account with 2,000 recent views is a different shape from one with 500,000. Treat the recent metrics as a sample, not a verdict.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Can I check any Twitter profile?',
        answer:
          'Any public 𝕏 profile, by username or profile URL. Protected, suspended, or deleted accounts may return limited data or no result.',
      },
      {
        question: 'How fresh are the numbers?',
        answer:
          'Each lookup checks the public profile and the most recent posts, so the numbers reflect what is visible on the account at that moment.',
      },
      {
        question: 'Why is engagement rate calculated from recent posts?',
        answer:
          '𝕏 does not publish a lifetime engagement rate, so the most honest read is to take the last few public posts and divide engagements by views. It is a sample, not a full audit, and that is why we say so.',
      },
      {
        question: 'Is this the same as 𝕏 Analytics?',
        answer:
          'No. 𝕏 Analytics is for your own account. This is for any public profile, no login needed.',
      },
    ],
  },
  'twitter-advanced-search': {
    seoTitle: 'Twitter Advanced Search Builder',
    heading: 'Build a Twitter advanced search URL faster',
    description:
      'Turn accounts, dates, media, links, replies, and engagement filters into a reusable 𝕏 search query.',
    sections: [
      {
        heading: 'How to use the advanced search builder',
        html: `<ol><li>Fill in any of the fields above. Everything combines with AND unless you use the any words field.</li><li>The query preview and the full 𝕏 search URL update as you type.</li><li>Open the results on 𝕏, or copy the raw query and paste it into the 𝕏 app search bar.</li></ol>`,
      },
      {
        heading: 'Every operator this builder generates',
        html: `<p>All 𝕏 advanced search operators are space-separated in a single query string. The form can generate exact phrases, OR groups, excluded words, hashtags, <code>from:user</code>, <code>to:user</code>, <code>@user</code>, reply filters, media filters, link filters, verified filters, engagement thresholds, language filters, and date bounds.</p><p>The most useful filters are usually <code>from:</code>, <code>min_faves:</code>, <code>filter:links</code>, <code>filter:media</code>, <code>since:</code>, and <code>until:</code>. Combine those and you can cut most noisy searches down fast.</p>`,
      },
      {
        heading: 'When to use this instead of the 𝕏 form',
        html: `<p>The built-in advanced search page is useful, but it does not expose every operator people rely on. This builder keeps the query visible, lets you copy it as plain text, and makes it easier to reuse the same search later.</p><p>If you already have a query and want to run it without logging in, use <a href="/twitter-search-without-account">Twitter search without an account</a>.</p>`,
      },
    ],
    faqs: [
      {
        question: 'What is Twitter advanced search?',
        answer:
          'Twitter advanced search is a set of query operators you can combine in the search bar on x.com to filter results by author, recipient, engagement, media type, language, and date.',
      },
      {
        question: "Why use this instead of X's built-in advanced search page?",
        answer:
          'The 𝕏 form is missing several operators people rely on, including min_faves, min_retweets, min_replies, and the lang filter. This builder exposes the useful operators in one place.',
      },
      {
        question: 'Can I search for posts between two dates?',
        answer:
          'Yes. since:YYYY-MM-DD and until:YYYY-MM-DD take exact dates. Since is inclusive. Until is exclusive.',
      },
      {
        question: 'Can I search for posts with images or videos only?',
        answer:
          'Yes. Use filter:images for images, filter:videos for videos, filter:media for any media, or -filter:media for plain-text posts.',
      },
    ],
  },
  'twitter-thread-reader': {
    seoTitle: 'Twitter Thread Reader',
    heading: 'Read a Twitter thread as one clean page',
    description:
      'Pull a public thread into order, keep the useful context, and export it when you need to save it.',
    sections: [
      {
        heading: 'Read a Twitter thread as one clean page',
        html: `<p>Long 𝕏 threads are awkward to read in the timeline. Paste one post from the thread above and the reader pulls the author's posts into a single page with media, metrics, and export options.</p>`,
      },
      {
        heading: 'What gets included in the thread',
        html: `<p>The reader keeps posts from the thread author and filters out replies from other accounts. That avoids mixing the conversation into the actual thread. If 𝕏 only returns part of the thread, the result will only include the public posts available at lookup time.</p>`,
      },
      {
        heading: 'Save the thread for later',
        html: `<p>Once the thread loads, you can copy it as Markdown or download the normalized thread data as JSON. Markdown is better for notes and research. JSON is better if you want the post metrics and URLs for another workflow.</p>`,
      },
    ],
    faqs: [
      {
        question: 'How do I unroll a Twitter thread?',
        answer:
          'Paste any public post URL from the thread. The reader finds the thread, keeps posts from the thread author, and shows them in order.',
      },
      {
        question: 'Can this read private or deleted threads?',
        answer:
          'No. The reader only works with public posts returned by 𝕏 through public data. Private, deleted, suspended, or unavailable posts cannot be recovered here.',
      },
      {
        question: 'Can I save the thread?',
        answer:
          'Yes. You can copy the thread as Markdown or download the normalized thread data as JSON.',
      },
    ],
  },
  'twitter-video-downloader': {
    seoTitle: 'Twitter Video Downloader',
    heading: 'Download public Twitter videos from a post URL',
    description:
      'Find the available MP4 versions for a public 𝕏 video or GIF and choose the file you need.',
    sections: [
      {
        heading: 'Download public Twitter videos as MP4 files',
        html: `<p>𝕏 stores videos in a few different sizes. Paste a public post URL and this downloader lists the MP4 variants available for that post, usually with the highest quality first.</p>`,
      },
      {
        heading: 'GIFs usually download as video files',
        html: `<p>𝕏 converts animated GIFs into short MP4 videos. That is why a GIF post will usually show up here as an MP4 download instead of a <code>.gif</code> file.</p>`,
      },
      {
        heading: 'Use downloaded media carefully',
        html: `<p>A public media URL does not grant usage rights. Download your own videos, assets you have permission to use, or posts where saving a local copy is allowed by the rights holder.</p>`,
      },
    ],
    faqs: [
      {
        question: 'How do I download a Twitter video?',
        answer:
          'Paste the public 𝕏 or Twitter post URL above. If the post contains a video or GIF, the tool shows the MP4 variants 𝕏 makes available.',
      },
      {
        question: 'Does this work for GIFs?',
        answer:
          'Yes. 𝕏 stores animated GIFs as MP4 files, so GIF posts usually download as MP4 videos.',
      },
      {
        question: 'Can this download private videos?',
        answer:
          'No. It only works for public posts returned by 𝕏 through public data. Private, deleted, or unavailable videos cannot be recovered here.',
      },
      {
        question: 'Does ilo store the video?',
        answer:
          'No. The page returns direct public media URLs. ilo does not proxy, store, or rehost the video files.',
      },
    ],
  },
  'twitter-id': {
    seoTitle: 'Twitter ID Lookup And Finder',
    heading: 'Find the Twitter ID behind any public 𝕏 username',
    description:
      'Get the permanent user ID behind a handle so old exports, API rows, and changed usernames still match.',
    sections: [
      {
        heading: 'What is a Twitter ID?',
        html: `<p>A Twitter ID, now an 𝕏 user ID, is the permanent internal identifier for an account. Unlike the @username, which can change, the numerical ID is assigned once and stays attached to that account.</p><p>For example, Jack Dorsey's @username is <code>@jack</code>, but his Twitter ID is <code>12</code>. Modern accounts have much longer IDs because they are issued from a global counter.</p>`,
      },
      {
        heading: 'How to find a Twitter ID',
        html: `<p>The finder accepts a handle with the at-sign, a handle without the at-sign, or a full profile URL like <code>https://x.com/elonmusk</code>. It returns the numerical user ID, current handle, display name, avatar, bio, joined date, and public profile stats.</p>`,
      },
      {
        heading: 'When you need a Twitter user ID',
        html: `<ul><li>Working with API exports, webhooks, or old analytics tables.</li><li>De-duplicating accounts after handles have changed.</li><li>Building tools that need a stable user identifier instead of a mutable @handle.</li></ul><p>If you already have the ID and need the current username, use the <a href="/twitter-id-to-username">Twitter ID to username converter</a>.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Is this Twitter ID finder free?',
        answer:
          'Yes. Paste a username or profile URL and you get the numerical ID and profile data without signup.',
      },
      {
        question: "Can I look up any account's Twitter ID?",
        answer:
          'You can look up any public 𝕏 account by @username. Protected, suspended, or deleted accounts may return limited data or no result.',
      },
      {
        question: 'What happens when someone changes their @username?',
        answer:
          'The numerical Twitter ID never changes. It stays attached to the same account even if the handle changes.',
      },
      {
        question: 'Is a Twitter user ID the same as a tweet ID?',
        answer:
          'No. A user ID identifies an account. A tweet ID identifies a single post.',
      },
    ],
  },
  'twitter-id-to-username': {
    seoTitle: 'Twitter ID To Username Converter',
    heading: 'Find the current username behind a Twitter ID',
    description:
      'Turn a saved user ID into the live handle, profile link, and public account details attached to it now.',
    sections: [
      {
        heading: 'Convert a Twitter ID to the current username',
        html: `<p>A Twitter ID is the permanent numerical ID behind an 𝕏 account. The @username can change, but the ID stays attached to the same account. Paste the ID above and the lookup returns the current handle, profile link, avatar, and public profile stats.</p>`,
      },
      {
        heading: 'When this lookup is useful',
        html: `<p>This is handy when you have an API export, an old analytics table, a webhook payload, or a saved dataset with user IDs but no handles. It also helps when an account has changed usernames and you need to reconnect the old record to the current profile.</p>`,
      },
      {
        heading: 'Find the ID from a username',
        html: `<p>If you have the @username and need the numerical ID, use <a href="/twitter-id">ilo's Twitter ID finder</a>. Use that for handle to ID lookups. Use this page when you already have the ID.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Can I convert any Twitter ID to a username?',
        answer:
          'You can look up any public 𝕏 account by numerical user ID. Deleted, suspended, or private accounts may fail or return limited public data.',
      },
      {
        question: 'Is a Twitter user ID the same as a tweet ID?',
        answer:
          'No. A user ID identifies an account. A tweet ID identifies a single post.',
      },
      {
        question: 'Does the username stay the same forever?',
        answer:
          'No. The @username can change. The numerical user ID stays attached to the same account.',
      },
    ],
  },
  'twitter-profile-picture-downloader': {
    seoTitle: 'Twitter Profile Picture Downloader',
    heading: 'Download Twitter profile pictures and banners in full size',
    description:
      'Grab the largest public avatar and banner image for a profile without digging through page source.',
    sections: [
      {
        heading: 'Download a Twitter profile picture in full size',
        html: `<p>Paste an @username or profile URL and the tool loads the public avatar and banner for that 𝕏 account. It removes the small thumbnail suffix from the avatar URL where 𝕏 provides one, so you get the largest public version available.</p>`,
      },
      {
        heading: 'What the downloader can return',
        html: `<p>The result includes the profile picture, the banner image when one exists, the profile name, handle, and a link back to the account on 𝕏. If the account does not expose a banner, the banner panel stays empty.</p>`,
      },
      {
        heading: 'Private and unavailable accounts may not work',
        html: `<p>This tool only uses public profile data. If 𝕏 does not return the profile or image URL, ilo cannot recover it. That usually means the account is deleted, suspended, unavailable, or has no public image for that field.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Can I download any Twitter profile picture?',
        answer:
          'You can view and save public profile images from public 𝕏 accounts. Deleted, suspended, or unavailable accounts may not return an image.',
      },
      {
        question: 'Does this also download Twitter banners?',
        answer:
          'Yes. If the account has a public banner image, the result shows it next to the profile picture.',
      },
      {
        question: 'Does the image get uploaded anywhere?',
        answer:
          'No. The lookup fetches public profile data, then your browser loads the image from the public image URL.',
      },
    ],
  },
  'twitter-card-validator': {
    seoTitle: 'Twitter Card Validator',
    heading: 'Preview and fix Twitter Cards before you post',
    description:
      'See the title, description, image, and tags 𝕏 can read before a bad link preview goes live.',
    sections: [
      {
        heading: 'Check the card before you post the link',
        html: `<p>The Twitter Card Validator shows the preview 𝕏 is likely to build from your page metadata. Paste a URL and it checks the Twitter Card tags, Open Graph fallbacks, image URL, title, description, and card type.</p><p>Most people landing here are trying to answer one practical question: what will 𝕏 scrape from this page when I share it? The preview, tag checklist, and image notes are built around that check.</p>`,
      },
      {
        heading: 'How 𝕏 chooses a link preview',
        html: `<p>𝕏 looks for Twitter-specific tags first. The most important ones are <code>twitter:card</code>, <code>twitter:title</code>, <code>twitter:description</code>, and <code>twitter:image</code>. If those are missing, it can fall back to Open Graph tags such as <code>og:title</code>, <code>og:description</code>, and <code>og:image</code>.</p>`,
      },
      {
        heading: 'Why a fixed page can still show an old card',
        html: `<p>Link previews are cached. You can update the metadata, test the page, and still see the old image for a while. This tool cache-busts the image request in the browser so you can see whether the image itself has changed, but 𝕏 may still keep its own cached preview.</p>`,
      },
    ],
    faqs: [
      {
        question: 'What does a Twitter Card Validator check?',
        answer:
          'It fetches a URL, reads the Twitter Card and Open Graph tags, and shows the title, description, image, and card type 𝕏 is likely to use.',
      },
      {
        question: 'Do I need to log in to X to use this validator?',
        answer:
          'No. Paste a public URL and the tool checks the page metadata without asking for an 𝕏 account.',
      },
      {
        question: 'Why does my Twitter card show the wrong image?',
        answer:
          '𝕏 may be using cached metadata, the image may be too small, or the page may be missing twitter:image or og:image.',
      },
    ],
  },
  'threads-link-preview': {
    seoTitle: 'Threads Link Previewer',
    heading: 'Preview a Threads link card before you publish',
    description:
      'Check the title, description, and image Threads can pull from your page before you share the URL.',
    sections: [
      {
        heading: 'Preview the Threads card before the post is live',
        html: `<p>Threads builds link cards from the metadata on your page. This previewer fetches the URL, reads the Open Graph title, description, and image, then shows a compact Threads-style card.</p>`,
      },
      {
        heading: 'Metadata that usually controls Threads previews',
        html: `<p>Start with <code>og:title</code>, <code>og:description</code>, and <code>og:image</code>. Keep the title direct, write the description like a normal sentence, and use an image that still works when cropped. If the image URL needs authentication or blocks crawlers, Threads may show a blank preview.</p>`,
      },
      {
        heading: 'Compare the same page across networks',
        html: `<p>If you are checking the same page across social networks, compare this result with the <a href="/twitter-card-validator">Twitter Card Validator</a> and <a href="/bluesky-link-preview">Bluesky Link Previewer</a>.</p>`,
      },
    ],
    faqs: [
      {
        question: 'What metadata does Threads use for link previews?',
        answer:
          'Threads usually relies on Open Graph tags, especially og:title, og:description, and og:image.',
      },
      {
        question: 'Why is my Threads preview missing an image?',
        answer:
          'The page may be missing og:image, the image may be blocked, or the image may be too small for a clean card preview.',
      },
      {
        question: 'Can this tool post to Threads?',
        answer:
          'No. It only previews the link card metadata so you can fix the page before sharing it.',
      },
    ],
  },
  'bluesky-link-preview': {
    seoTitle: 'Bluesky Link Previewer',
    heading: 'Preview a Bluesky link card before you share',
    description:
      'See whether Bluesky can read the right title, image, and description before the post goes out.',
    sections: [
      {
        heading: 'Check how a link will look on Bluesky',
        html: `<p>Bluesky link cards are simple, which is mostly a good thing. Paste a URL and this tool shows the title, description, image, and URL that can be read from the page metadata.</p>`,
      },
      {
        heading: 'What to check when a Bluesky preview looks off',
        html: `<p>Check <code>og:title</code>, <code>og:description</code>, and <code>og:image</code>. The image should be public, absolute, and large enough to crop cleanly. Avoid relying only on Twitter-specific tags because they may not give Bluesky everything it needs.</p>`,
      },
      {
        heading: 'Useful Bluesky account tools',
        html: `<p>If you are working on a Bluesky tool or profile page, the <a href="/bluesky-did">Bluesky DID Lookup</a> and <a href="/bluesky-id">Bluesky ID Finder</a> can help with account identifiers too.</p>`,
      },
    ],
    faqs: [
      {
        question: 'What does Bluesky use for link previews?',
        answer:
          'Bluesky reads the page metadata and builds a card from the title, description, URL, and image it can fetch.',
      },
      {
        question: 'Why does my Bluesky card have no image?',
        answer:
          'The image may be missing, too small, blocked from fetchers, or set only in a platform-specific tag that Bluesky does not use.',
      },
      {
        question: 'Does this change the preview inside Bluesky?',
        answer:
          'No. This only checks the metadata your page returns. Update the page metadata first, then share the link again.',
      },
    ],
  },
  'bluesky-id': {
    seoTitle: 'Bluesky ID Finder',
    heading: 'Get your numerical Bluesky ID with an app password',
    description:
      'Use a revocable app password to find the older account number some exports and tools still need.',
    sections: [
      {
        heading: 'Find the older numerical Bluesky account ID',
        html: `<p>Bluesky accounts have more than one identifier. The handle is human-friendly. The permanent identifier is the DID, which looks like <code>did:plc:...</code>. There is also an older numerical signup number that some people still want for screenshots, migration notes, or debugging old tools.</p>`,
      },
      {
        heading: 'Use an app password, then revoke it if you want',
        html: `<p>The numerical ID is not available through the normal public profile lookup, so this tool asks for your handle and a Bluesky app password. Create an app password in Bluesky settings, paste that here instead of your main password, and revoke it after the lookup if you want.</p>`,
      },
      {
        heading: 'When a Bluesky DID is the better identifier',
        html: `<p>For most technical work, the DID is the useful value. It stays tied to the account even when the handle changes, and it is the identifier AT Protocol services expect. If you only need the public account identifier, use the <a href="/bluesky-did">Bluesky DID Lookup</a>.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Why does this Bluesky ID tool ask for an app password?',
        answer:
          'The numerical signup number comes from a Bluesky endpoint that requires an authenticated session.',
      },
      {
        question: 'Should I use my main Bluesky password?',
        answer:
          'No. Create an app password in Bluesky settings. App passwords are made for third-party tools and can be deleted without changing your main account password.',
      },
      {
        question: 'Is a Bluesky ID the same as a DID?',
        answer:
          'No. The numerical ID is a signup-style number. A DID is the permanent atproto identifier used by Bluesky and other AT Protocol services.',
      },
    ],
  },
  'bluesky-did': {
    seoTitle: 'Bluesky DID Lookup',
    heading: 'Find the Bluesky DID behind any public handle',
    description:
      'Resolve a handle to its permanent AT Protocol identity so account mapping does not break later.',
    sections: [
      {
        heading: 'Look up the permanent Bluesky account identifier',
        html: `<p>A Bluesky DID is the permanent identifier behind a handle. Handles are human-friendly and can move. DIDs are the stable account identity used by the AT Protocol.</p><p>Paste a handle such as <code>bsky.app</code> or <code>@bsky.app</code> and the tool resolves it to the DID. No login is needed because handle resolution is public.</p>`,
      },
      {
        heading: 'Why DIDs matter more than handles in integrations',
        html: `<p>Handles are great for people. They are less ideal for systems because they can change. A DID gives your code a stable value to store when you are building importers, analytics, profile links, or account mapping.</p>`,
      },
      {
        heading: 'When to use the numerical Bluesky ID instead',
        html: `<p>Use the numerical ID only when you specifically need the older signup-style number. For integrations and identity lookup, the DID is usually the useful value. Use the <a href="/bluesky-id">Bluesky ID Finder</a> if you need the numerical account number.</p>`,
      },
    ],
    faqs: [
      {
        question: 'Can I find a Bluesky DID without logging in?',
        answer:
          'Yes. A Bluesky DID can be resolved from a public handle without asking for account credentials.',
      },
      {
        question: 'What does a Bluesky DID look like?',
        answer:
          'Most Bluesky DIDs look like did:plc followed by a long string. Some AT Protocol accounts may use did:web instead.',
      },
      {
        question: 'Does a DID change when the handle changes?',
        answer:
          'No. The handle can change, but the DID is designed to stay attached to the account.',
      },
    ],
  },
}

export const getToolPageContent = (slug: string) =>
  TOOL_PAGE_CONTENT[slug] ?? null
