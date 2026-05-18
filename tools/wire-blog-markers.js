#!/usr/bin/env node
/**
 * Adds `data-blog-*` markers to the 3 existing static blog post pages so
 * admin edits to blog.json can override their content at runtime.
 *
 * Markers added:
 *   - data-blog-hero       on the hero <img>
 *   - data-blog-meta       on the .eyebrow span (category · X min read)
 *   - data-blog-title      on the .page-hero__title <h1>
 *   - data-blog-tldr-wrap  on the <aside class="tldr"> wrapper
 *   - data-blog-tldr       on the inner <p class="tldr__body">
 *   - data-blog-lede       on the <p class="lede">
 *   - data-blog-body       wraps the body paragraphs
 *
 * Idempotent: re-running skips files already wired (checks for data-blog-body).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'blog/moroccan-bath-guide.html',
  'blog/beard-care-abu-dhabi.html',
  'blog/choosing-the-right-facial.html'
];

let touched = 0;
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('data-blog-body')) { console.log('skip (already wired):', rel); continue; }

  // 1. Hero image
  c = c.replace(/(<div class="page-hero__media"[^>]*><img\s+)(src=)/, '$1data-blog-hero $2');

  // 2. Meta line (eyebrow)
  c = c.replace(/<span class="eyebrow">([^<]+)<\/span>/, '<span class="eyebrow" data-blog-meta>$1</span>');

  // 3. Page title
  c = c.replace(/<h1 class="page-hero__title"([^>]*)>/, '<h1 class="page-hero__title" data-blog-title$1>');

  // 4. TL;DR wrapper + body
  c = c.replace(/<aside class="tldr">/, '<aside class="tldr" data-blog-tldr-wrap>');
  c = c.replace(/<p class="tldr__body">/, '<p class="tldr__body" data-blog-tldr>');

  // 5. Lede paragraph
  c = c.replace(/<p class="lede"([^>]*)>/, '<p class="lede" data-blog-lede$1>');

  // 6. Wrap body — body starts AFTER the lede's closing </p> and ends BEFORE
  // the closing </div> of the .container. We slip a wrapper in.
  // Strategy: find "</p>\n\n        <p>Here is" -> "</p>\n\n        <div data-blog-body>\n        <p>Here is"
  // And the last paragraph (typically the CTA button) -> add </div> after it before container close.
  //
  // Generic: find ` data-blog-lede"...>...</p>` then insert opening tag after it,
  // and find the LAST `</p>` before `      </div>\n    </section>` to close.
  const ledeCloseRe = /(<p class="lede" data-blog-lede[^>]*>[\s\S]*?<\/p>)\s*\n\s*\n(\s*)(<p\b)/;
  c = c.replace(ledeCloseRe, '$1\n\n$2<div data-blog-body>\n$2$3');
  // Close the wrapper just before the container's closing </div>
  // Last `      </div>\n    </section>` in the file (assumes the article's container is the LAST one before </section>).
  // Use a non-greedy regex finding the article section close.
  c = c.replace(/(<\/p>)\s*\n\s*<\/div>\s*\n\s*<\/section>(\s*<div class="share-bar")/,
                '$1\n        </div>\n      </div>\n    </section>$2');

  fs.writeFileSync(p, c, 'utf8');
  console.log('wired', rel);
  touched++;
}
console.log('\nTouched', touched, 'files');
