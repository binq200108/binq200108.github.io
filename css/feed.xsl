<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <xsl:variable name="title">
      <xsl:value-of select="/rss/channel/title | /atom:feed/atom:title"/>
    </xsl:variable>
    <xsl:variable name="description">
      <xsl:value-of select="/rss/channel/description | /atom:feed/atom:subtitle"/>
    </xsl:variable>
    <xsl:variable name="link">
      <xsl:value-of select="/rss/channel/link | /atom:feed/atom:link[@rel='alternate']/@href"/>
    </xsl:variable>
    <html class="dark scroll-smooth">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="referrer" content="unsafe-url"/>
        <title><xsl:value-of select="$title"/></title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          html{line-height:1.6;-webkit-text-size-adjust:100%;tab-size:4;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;scroll-behavior:smooth}
          body{background:#fafafa;color:#333;min-height:100vh;min-height:100svh}
          a{color:inherit;text-decoration:none}
          img,video{max-width:100%;height:auto;display:block}
          :root{--accent:#42b983;--accent-light:#5ec6a0;--text:#333;--text-muted:#888;--bg:#fafafa;--card-bg:#fff;--border:#e5e7eb;--hover-bg:#f3f4f6}
          @media(prefers-color-scheme:dark){
            :root{--text:#e4e6eb;--text-muted:#999;--bg:#111;--card-bg:#1a1a1a;--border:#333;--hover-bg:#222}
            body{background:var(--bg);color:var(--text)}
          }

          .container{max-width:720px;margin:0 auto;padding:2rem 1.25rem}
          header{margin-bottom:2rem}
          .site-title{display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem}
          .site-title svg{width:28px;height:28px;color:var(--accent);flex-shrink:0}
          .site-title h1{font-size:1.5rem;font-weight:700;background:linear-gradient(135deg,var(--accent),#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent}
          .site-title h1:hover{opacity:.85}
          .description{font-size:1.05rem;color:var(--text-muted);margin-bottom:1rem}
          .meta-line{font-size:.875rem;color:var(--text-muted);line-height:1.7}
          .meta-line a{font-weight:600;color:var(--text);border-bottom:1px solid transparent;transition:border-color .2s}
          .meta-line a:hover{border-bottom-color:var(--accent)}
          #subscribe-links{display:none}
          #subscribe-links a{font-weight:600;color:var(--accent);border-bottom:1px dashed var(--accent);transition:opacity .2s}
          #subscribe-links a:hover{opacity:.75}

          hr{border:none;border-top:1px solid var(--border);margin:1.75rem 0}

          .article-list{display:flex;flex-direction:column;gap:.25rem}
          details{border-radius:8px;transition:background .15s}
          details[open]{background:var(--card-bg);border:1px solid var(--border);margin:.5rem 0}
          details:not([open]):hover{background:var(--hover-bg)}
          summary{padding:.75rem 1rem;cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem}
          summary::-webkit-details-marker{display:none}
          summary::marker{display:none}
          summary h2{font-size:1rem;font-weight:600;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          summary time{font-size:.8rem;color:var(--text-muted);white-space:nowrap}
          .entry-content{padding:0 1rem 1rem;font-size:.9rem;color:var(--text-muted);line-height:1.7}
          .entry-content p{margin:.5rem 0}
          .read-more{display:inline-block;margin-top:.5rem;font-size:.875rem;font-weight:600;color:var(--accent);border-bottom:1px solid transparent;transition:border-color .2s}
          .read-more:hover{border-bottom-color:var(--accent)}

          footer{margin-top:2rem;text-align:center;font-size:.8rem;color:var(--text-muted)}
          footer a{color:var(--accent);font-weight:600}
        </style>
      </head>
      <body>
        <main class="container">
          <header>
            <a title="{$title}" href="{$link}" target="_blank" rel="noopener noreferrer">
              <div class="site-title">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
                <h1><xsl:value-of select="$title" disable-output-escaping="yes"/></h1>
              </div>
            </a>
            <p class="description"><xsl:value-of select="$description" disable-output-escaping="yes"/></p>
            <p class="meta-line">
              这是来自
              <a title="{$title}" href="{$link}" target="_blank" rel="noopener noreferrer"><xsl:value-of select="$title"/></a>
              的 RSS 订阅源。
            </p>
            <p class="meta-line" id="subscribe-links">
              可以订阅此 RSS 通过
              <a title="Feedly" data-href="https://feedly.com/i/subscription/feed/" target="_blank" rel="noopener noreferrer">Feedly</a>,
              <a title="Inoreader" data-href="https://www.inoreader.com/feed/" target="_blank" rel="noopener noreferrer">Inoreader</a>,
              <a title="Newsblur" data-href="https://www.newsblur.com/?url=" target="_blank" rel="noopener noreferrer">Newsblur</a>,
              <a title="Follow" data-href="follow://add?url=" rel="noopener noreferrer">Follow</a>,
              <a title="RSS Reader" data-href="feed:" data-raw="true" rel="noopener noreferrer">RSS Reader</a>
              或
              <a title="复制订阅链接" data-href="" data-raw="true" rel="noopener noreferrer">本页链接</a>.
            </p>
            <script>
              document.addEventListener('DOMContentLoaded', function () {
                document.querySelectorAll('a[data-href]').forEach(function (a) {
                  var url = new URL(location.href);
                  var feed = url.searchParams.get('url') || location.href;
                  var raw = a.getAttribute('data-raw');
                  if (raw) {
                    a.href = a.getAttribute('data-href') + feed;
                  } else {
                    a.href = a.getAttribute('data-href') + encodeURIComponent(feed);
                  }
                });
                document.getElementById('subscribe-links').style.display = 'block';
              });
            </script>
          </header>

          <hr/>

          <section class="article-list">
            <xsl:choose>
              <!-- RSS 2.0 -->
              <xsl:when test="/rss/channel/item">
                <xsl:for-each select="/rss/channel/item">
                  <article>
                    <details>
                      <summary>
                        <xsl:if test="title">
                          <h2><xsl:value-of select="title" disable-output-escaping="yes"/></h2>
                        </xsl:if>
                        <xsl:if test="pubDate">
                          <time><xsl:value-of select="pubDate"/></time>
                        </xsl:if>
                      </summary>
                      <div class="entry-content">
                        <xsl:if test="description">
                          <p><xsl:value-of select="description" disable-output-escaping="yes"/></p>
                        </xsl:if>
                        <xsl:if test="link">
                          <a class="read-more" href="{link}" target="_blank" rel="noopener noreferrer">继续阅读 →</a>
                        </xsl:if>
                      </div>
                    </details>
                  </article>
                </xsl:for-each>
              </xsl:when>
              <!-- Atom -->
              <xsl:when test="/atom:feed/atom:entry">
                <xsl:for-each select="/atom:feed/atom:entry">
                  <article>
                    <details>
                      <summary>
                        <xsl:if test="atom:title">
                          <h2><xsl:value-of select="atom:title" disable-output-escaping="yes"/></h2>
                        </xsl:if>
                        <xsl:if test="atom:published">
                          <time><xsl:value-of select="substring(atom:published, 1, 10)"/></time>
                        </xsl:if>
                      </summary>
                      <div class="entry-content">
                        <xsl:choose>
                          <xsl:when test="atom:summary">
                            <p><xsl:value-of select="atom:summary" disable-output-escaping="yes"/></p>
                          </xsl:when>
                          <xsl:when test="atom:content">
                            <p><xsl:value-of select="atom:content" disable-output-escaping="yes"/></p>
                          </xsl:when>
                        </xsl:choose>
                        <xsl:if test="atom:link/@href">
                          <a class="read-more" href="{atom:link/@href}" target="_blank" rel="noopener noreferrer">继续阅读 →</a>
                        </xsl:if>
                      </div>
                    </details>
                  </article>
                </xsl:for-each>
              </xsl:when>
            </xsl:choose>
          </section>

          <hr/>

          <footer>
            Styled by <a href="https://github.com/ccbikai/RSS.Beauty" target="_blank" rel="noopener noreferrer">RSS.Beauty</a>
          </footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
