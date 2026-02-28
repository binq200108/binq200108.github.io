(function () {
  var header = document.querySelector('.header');
  var bgDots = document.getElementById('bgDots');
  var progressBar = document.getElementById('readingProgress');
  var backToTop = document.getElementById('backToTop');
  var lastY = 0;

  /* ========== Dark mode toggle ========== */
  var darkToggle = document.getElementById('darkModeToggle');

  function setStoredTheme(theme) {
    try {
      if (window.localStorage) localStorage.setItem('theme', theme);
    } catch (_err) {}
  }

  function getStoredTheme() {
    try {
      return window.localStorage ? localStorage.getItem('theme') : null;
    } catch (_err) {
      return null;
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setStoredTheme(theme);
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  if (darkToggle) {
    darkToggle.addEventListener('click', function () {
      setTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  // Listen for system preference changes (only if user hasn't manually chosen)
  if (window.matchMedia) {
    var darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemThemeChange = function (e) {
      if (!getStoredTheme()) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };
    if (darkMedia.addEventListener) {
      darkMedia.addEventListener('change', onSystemThemeChange);
    } else if (darkMedia.addListener) {
      darkMedia.addListener(onSystemThemeChange);
    }
  }

  // Prevent browser double-tap zoom on touch devices, keep pinch zoom available.
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    var lastTouchEndAt = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      var delta = now - lastTouchEndAt;
      var target = e.target;
      if (
        delta > 0 && delta < 280 &&
        target &&
        target.closest &&
        !target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        e.preventDefault();
      }
      lastTouchEndAt = now;
    }, { passive: false });
  }

  /* ========== Reading progress bar ========== */
  function updateProgress() {
    if (!progressBar) return;
    // Use full-page scroll range so it always reaches 100% at bottom
    var scrollHeight = document.documentElement.scrollHeight;
    var viewportHeight = window.innerHeight;
    var maxScroll = scrollHeight - viewportHeight;
    if (maxScroll <= 0) {
      progressBar.style.width = '100%';
      return;
    }
    var progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    progressBar.style.width = (progress * 100) + '%';
  }

  function syncScrollUI() {
    var y = window.scrollY || 0;

    // Header auto-hide
    if (header) {
      if (y > lastY && y > 80) {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
    }

    // Background dots fade with scroll
    if (bgDots) {
      if (y > 80) {
        bgDots.classList.add('fade-out');
      } else {
        bgDots.classList.remove('fade-out');
      }
    }

    // Back to top button
    if (backToTop) {
      if (y > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }

    // Reading progress
    updateProgress();

    lastY = y;
  }

  /* ========== Unified scroll handler ========== */
  window.addEventListener('scroll', syncScrollUI, { passive: true });
  window.addEventListener('pageshow', syncScrollUI, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });

  // Initial progress calculation
  syncScrollUI();

  // Back to top: click to scroll
  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Hide progress bar on non-article pages
  if (progressBar && !document.querySelector('.post-content')) {
    progressBar.style.display = 'none';
  }

  /* ========== Image loading buffer (lazy-friendly) ========== */
  (function initImageBuffering() {
    var images = Array.prototype.slice.call(document.querySelectorAll('img.cg-lazy'));
    if (!images.length) return;

    function markLoaded(img) {
      img.classList.remove('is-loading');
      img.classList.add('is-loaded');
    }

    images.forEach(function (img) {
      if (!img) return;
      if (img.complete && img.naturalWidth > 0) {
        markLoaded(img);
        return;
      }
      if (img.complete && img.naturalWidth === 0) {
        img.classList.add('is-error');
        return;
      }
      img.classList.add('is-loading');
      img.addEventListener('load', function () {
        markLoaded(img);
      });
      img.addEventListener('error', function () {
        img.classList.remove('is-loading');
        img.classList.add('is-error');
      });
    });
  })();

  /* ========== Meta tags dropdown ========== */
  (function initMetaTagsDropdown() {
    var toggle = document.querySelector('.meta-tags-toggle');
    if (!toggle) return;
    var more = toggle.closest('.meta-tags-more');
    if (!more) return;
    var metaRow = more.closest('.post-detail-meta');

    function openDropdown() {
      more.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      if (metaRow) metaRow.classList.add('tags-dropdown-open');
    }

    function closeDropdown() {
      more.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      if (metaRow) metaRow.classList.remove('tags-dropdown-open');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (more.classList.contains('open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    document.addEventListener('click', function (e) {
      if (!more.classList.contains('open')) return;
      if (!more.contains(e.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && more.classList.contains('open')) {
        closeDropdown();
        toggle.focus();
      }
    });
  })();

  /* ========== Live Photos (hover on desktop, button on touch) ========== */
  (function initLivePhotos() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.live-photo'));
    if (!cards.length) return;

    var coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var liveBadgeMarkup = '' +
      '<span class="live-photo-chip" aria-hidden="true">' +
        '<svg class="live-photo-icon" viewBox="0 0 24 24">' +
          '<g class="live-photo-icon-ring" fill="currentColor">' +
            '<circle cx="12.00" cy="2.20" r="0.62"/>' +
            '<circle cx="14.54" cy="2.53" r="0.62"/>' +
            '<circle cx="16.90" cy="3.51" r="0.62"/>' +
            '<circle cx="18.93" cy="5.07" r="0.62"/>' +
            '<circle cx="20.49" cy="7.10" r="0.62"/>' +
            '<circle cx="21.47" cy="9.46" r="0.62"/>' +
            '<circle cx="21.80" cy="12.00" r="0.62"/>' +
            '<circle cx="21.47" cy="14.54" r="0.62"/>' +
            '<circle cx="20.49" cy="16.90" r="0.62"/>' +
            '<circle cx="18.93" cy="18.93" r="0.62"/>' +
            '<circle cx="16.90" cy="20.49" r="0.62"/>' +
            '<circle cx="14.54" cy="21.47" r="0.62"/>' +
            '<circle cx="12.00" cy="21.80" r="0.62"/>' +
            '<circle cx="9.46" cy="21.47" r="0.62"/>' +
            '<circle cx="7.10" cy="20.49" r="0.62"/>' +
            '<circle cx="5.07" cy="18.93" r="0.62"/>' +
            '<circle cx="3.51" cy="16.90" r="0.62"/>' +
            '<circle cx="2.53" cy="14.54" r="0.62"/>' +
            '<circle cx="2.20" cy="12.00" r="0.62"/>' +
            '<circle cx="2.53" cy="9.46" r="0.62"/>' +
            '<circle cx="3.51" cy="7.10" r="0.62"/>' +
            '<circle cx="5.07" cy="5.07" r="0.62"/>' +
            '<circle cx="7.10" cy="3.51" r="0.62"/>' +
            '<circle cx="9.46" cy="2.53" r="0.62"/>' +
          '</g>' +
          '<circle cx="12" cy="12" r="6.96" fill="none" stroke="currentColor" stroke-width="0.81"/>' +
          '<circle cx="12" cy="12" r="2.96" fill="none" stroke="currentColor" stroke-width="1.21"/>' +
        '</svg>' +
        '<span class="live-photo-chip-label">实况</span>' +
      '</span>';

    function ensureToggleIcon(toggle) {
      if (!toggle) return;
      toggle.innerHTML = liveBadgeMarkup;
      if (!toggle.getAttribute('title')) {
        toggle.setAttribute('title', '播放实况');
      }
    }

    function setToggleLoading(toggle, isLoading) {
      if (!toggle) return;
      if (isLoading) {
        toggle.classList.add('is-loading');
        toggle.setAttribute('aria-busy', 'true');
      } else {
        toggle.classList.remove('is-loading');
        toggle.removeAttribute('aria-busy');
      }
    }

    function setVideoAudio(video, muted, volume) {
      if (!video) return;
      var shouldMute = !!muted;
      video.muted = shouldMute;
      if (shouldMute) {
        video.setAttribute('muted', '');
        return;
      }
      video.removeAttribute('muted');
      if (typeof volume === 'number' && isFinite(volume)) {
        var safeVolume = Math.min(1, Math.max(0, volume));
        try { video.volume = safeVolume; } catch (_err) {}
      }
    }

    function isAutoplayBlocked(err) {
      if (!err) return false;
      if (err.name === 'NotAllowedError') return true;
      var msg = String(err.message || '').toLowerCase();
      return (
        msg.indexOf('notallowederror') !== -1 ||
        (msg.indexOf('play() failed') !== -1 && msg.indexOf('user') !== -1) ||
        msg.indexOf('user gesture') !== -1 ||
        msg.indexOf("didn't interact") !== -1 ||
        msg.indexOf('did not interact') !== -1
      );
    }

    var liveAudioUnlocked = !!(window.navigator && window.navigator.userActivation && window.navigator.userActivation.hasBeenActive);
    var liveAudioUnlockListenersBound = false;

    function tryResumeHoverSound() {
      cards.forEach(function (card) {
        if (!card || !card._lpShouldPlay || !card._lpMutedByAutoplayBlock) return;
        var video = card.querySelector('.live-photo-video');
        if (!video) return;
        card._lpMutedByAutoplayBlock = false;
        card._lpTargetMuted = !!card._lpDefaultMuted;
        setVideoAudio(video, card._lpTargetMuted, card._lpDefaultVolume);
      });
    }

    function bindLiveAudioUnlockListeners() {
      if (liveAudioUnlockListenersBound || liveAudioUnlocked) return;
      liveAudioUnlockListenersBound = true;

      function onUserGesture(evt) {
        if (evt && evt.isTrusted === false) return;
        liveAudioUnlocked = true;
        tryResumeHoverSound();
        document.removeEventListener('pointerdown', onUserGesture, true);
        document.removeEventListener('mousedown', onUserGesture, true);
        document.removeEventListener('click', onUserGesture, true);
        document.removeEventListener('keydown', onUserGesture, true);
        document.removeEventListener('touchstart', onUserGesture, true);
      }

      document.addEventListener('pointerdown', onUserGesture, true);
      document.addEventListener('mousedown', onUserGesture, true);
      document.addEventListener('click', onUserGesture, true);
      document.addEventListener('keydown', onUserGesture, true);
      document.addEventListener('touchstart', onUserGesture, true);
    }

    function pauseCard(card, resetTime) {
      if (!card) return;
      var video = card.querySelector('.live-photo-video');
      var toggle = card.querySelector('.live-photo-toggle');
      if (!video) return;
      card._lpShouldPlay = false;
      card._lpPlayPending = false;
      card._lpRetryOnCanPlay = false;
      card._lpClickedPlay = false;
      card._lpMutedByAutoplayBlock = false;
      card.classList.remove('is-loading');
      /* 1. 先移除 class → 触发视频 opacity 淡出（图片一直可见，无闪烁） */
      card.classList.remove('is-playing');
      if (toggle) {
        setToggleLoading(toggle, false);
        toggle.setAttribute('aria-pressed', 'false');
      }
      /* 2. 等 CSS 过渡结束后再暂停 & 重置，避免可见时跳帧 */
      clearTimeout(card._lpTimer);
      card._lpTimer = setTimeout(function () {
        video.pause();
        if (resetTime) {
          try { video.currentTime = 0; } catch (_err) {}
        }
      }, 320);
    }

    function playCard(card, opts) {
      if (!card) return;
      opts = opts || {};
      var video = card.querySelector('.live-photo-video');
      var toggle = card.querySelector('.live-photo-toggle');
      if (!video) return;
      if (card._lpPlayPending) return;
      var shouldMute = (typeof opts.mute === 'boolean') ? opts.mute : !!card._lpDefaultMuted;
      card._lpTargetMuted = shouldMute;
      card._lpMutedByAutoplayBlock = false;
      setVideoAudio(video, shouldMute, card._lpDefaultVolume);
      /* 取消排队中的暂停 */
      clearTimeout(card._lpTimer);
      card._lpShouldPlay = true;
      card.classList.remove('is-fallback');
      card.classList.add('is-loading');
      if (!card._lpLoadRequested && video.readyState === 0) {
        card._lpLoadRequested = true;
        try { video.load(); } catch (_err) {}
      }

      function show() {
        if (!card._lpShouldPlay) return;
        card._lpRetryOnCanPlay = false;
        card.classList.remove('is-loading');
        card.classList.add('is-playing');
        if (toggle) {
          setToggleLoading(toggle, false);
          toggle.setAttribute('aria-pressed', 'true');
        }
      }

      if (toggle) {
        setToggleLoading(toggle, true);
        toggle.setAttribute('aria-pressed', 'true');
      }

      card._lpPlayPending = true;
      var playPromise = video.play();
      /* play() 返回 Promise 时，等视频真正可播放再淡入，杜绝黑帧闪烁 */
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(function () {
          card._lpPlayPending = false;
          show();
        }).catch(function (err) {
          card._lpPlayPending = false;
          if (!card._lpShouldPlay) return;
          /* 仅在明确是自动播放策略拦截时，才降级为静音重试 */
          if (!shouldMute && isAutoplayBlocked(err)) {
            setVideoAudio(video, true, card._lpDefaultVolume);
            card._lpTargetMuted = true;
            card._lpMutedByAutoplayBlock = true;
            card._lpPlayPending = true;
            var muteRetry = video.play();
            if (muteRetry && typeof muteRetry.then === 'function') {
              muteRetry.then(function () {
                card._lpPlayPending = false;
                show();
                if (liveAudioUnlocked) {
                  card._lpMutedByAutoplayBlock = false;
                  setVideoAudio(video, card._lpDefaultMuted, card._lpDefaultVolume);
                }
              }).catch(function () {
                card._lpPlayPending = false;
                if (!card._lpShouldPlay) return;
                card._lpRetryOnCanPlay = true;
                card.classList.add('is-loading');
              });
            } else {
              card._lpPlayPending = false;
              show();
            }
            return;
          }
          card._lpRetryOnCanPlay = true;
          card.classList.add('is-loading');
        });
      } else {
        /* 旧浏览器回退 */
        card._lpPlayPending = false;
        show();
      }
    }

    cards.forEach(function (card, idx) {
      var image = card.querySelector('.live-photo-image');
      var video = card.querySelector('.live-photo-video');
      var toggle = card.querySelector('.live-photo-toggle');
      if (!image || !video) return;
      card._lpShouldPlay = false;
      card._lpPlayPending = false;
      card._lpRetryOnCanPlay = false;
      card._lpLoadRequested = false;
      card._lpReadyEventsBound = false;
      card._lpBlobUrl = '';
      card._lpTargetMuted = false;
      card._lpClickedPlay = false;
      card._lpMutedByAutoplayBlock = false;
      ensureToggleIcon(toggle);

      var liveVideoUrl = card.getAttribute('data-live-video') || video.getAttribute('data-src');

      if (!video.id) {
        video.id = 'live-photo-video-' + (idx + 1);
      }

      card._lpDefaultMuted = card.getAttribute('data-live-muted') === 'true';
      var volumeAttr = parseFloat(card.getAttribute('data-live-volume') || '');
      card._lpDefaultVolume = (isFinite(volumeAttr) && volumeAttr >= 0 && volumeAttr <= 1) ? volumeAttr : 1;

      setVideoAudio(video, card._lpDefaultMuted, card._lpDefaultVolume);
      video.loop = false;
      video.removeAttribute('loop');
      video.preload = 'auto';
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');

      function triggerPlayback(e) {
        e.preventDefault();
        e.stopPropagation();
        if (card.classList.contains('is-pending') || card.classList.contains('is-fallback')) return;
        if (card._lpPlayPending) return;
        liveAudioUnlocked = true;
        /* 已在播放（例如悬停预览静音中）→ 解除静音，并标记为用户主动点击 */
        if (card._lpShouldPlay) {
          setVideoAudio(video, card._lpDefaultMuted, card._lpDefaultVolume);
          card._lpMutedByAutoplayBlock = false;
          card._lpClickedPlay = true;
          return;
        }
        try { video.currentTime = 0; } catch (_err) {}
        card._lpClickedPlay = true;
        playCard(card, { mute: card._lpDefaultMuted });
      }

      if (!coarsePointer && !prefersReducedMotion) {
        card.addEventListener('mouseenter', function () {
          if (card.classList.contains('is-pending') || card.classList.contains('is-fallback')) return;
          if (card._lpShouldPlay) return;
          try { video.currentTime = 0; } catch (_err) {}
          /* 尝试带声音播放；若浏览器因无手势拦截，playCard 内会自动降级为静音 */
          playCard(card, { mute: card._lpDefaultMuted });
        });
        card.addEventListener('mouseleave', function () {
          /* 用户主动点击过按钮 → 不因鼠标离开而暂停，等视频播完自动停止 */
          if (card._lpClickedPlay) return;
          pauseCard(card, true);
        });
      }

      if (toggle) {
        toggle.setAttribute('aria-controls', video.id);
        toggle.addEventListener('click', triggerPlayback);
      }

      function revealCardIfReady() {
        if (card.classList.contains('is-fallback')) return;
        if (!card._lpPosterReady || !card._lpMediaReady) return;
        card.classList.remove('is-pending');
        if (toggle) {
          toggle.disabled = false;
          toggle.removeAttribute('aria-disabled');
        }
      }

      function maybeMarkMediaReady() {
        if (card._lpMediaReady) return;
        if (video.readyState >= 4) {
          card._lpMediaReady = true;
          revealCardIfReady();
          return;
        }
        var duration = video.duration;
        if (video.buffered && video.buffered.length && duration && isFinite(duration) && duration > 0) {
          var loadedUntil = video.buffered.end(video.buffered.length - 1);
          if (loadedUntil >= duration - 0.2) {
            card._lpMediaReady = true;
            revealCardIfReady();
          }
        }
      }

      function bindNativeReadyEvents() {
        if (card._lpReadyEventsBound) return;
        card._lpReadyEventsBound = true;
        video.addEventListener('loadedmetadata', maybeMarkMediaReady);
        video.addEventListener('loadeddata', maybeMarkMediaReady);
        video.addEventListener('canplay', maybeMarkMediaReady);
        video.addEventListener('canplaythrough', function () {
          card._lpMediaReady = true;
          revealCardIfReady();
        });
        video.addEventListener('progress', maybeMarkMediaReady);
        video.addEventListener('suspend', maybeMarkMediaReady);
      }

      function startNativePreload() {
        if (!liveVideoUrl) {
          card._lpMediaReady = true;
          revealCardIfReady();
          return;
        }
        bindNativeReadyEvents();
        if (!video.getAttribute('src')) {
          video.setAttribute('src', liveVideoUrl);
        }
        card._lpLoadRequested = true;
        try { video.load(); } catch (_err) {}
      }

      function prefetchVideoAsBlob() {
        if (!liveVideoUrl || !window.fetch || !window.URL || !window.URL.createObjectURL) {
          startNativePreload();
          return;
        }
        fetch(liveVideoUrl, { cache: 'force-cache' }).then(function (response) {
          if (!response || !response.ok) {
            throw new Error('live video fetch failed');
          }
          return response.blob();
        }).then(function (blob) {
          if (!blob || !blob.size) {
            throw new Error('live video blob empty');
          }
          bindNativeReadyEvents();
          card._lpBlobUrl = window.URL.createObjectURL(blob);
          video.setAttribute('src', card._lpBlobUrl);
          card._lpLoadRequested = true;
          try { video.load(); } catch (_err) {}
          maybeMarkMediaReady();
        }).catch(function () {
          startNativePreload();
        });
      }

      card._lpPosterReady = image.complete && image.naturalWidth > 0;
      card._lpMediaReady = !liveVideoUrl;
      if (card._lpPosterReady && card._lpMediaReady) {
        card.classList.remove('is-pending');
      } else {
        card.classList.add('is-pending');
        if (toggle) {
          toggle.disabled = true;
          toggle.setAttribute('aria-disabled', 'true');
        }
      }

      if (!card._lpPosterReady) {
        image.addEventListener('load', function () {
          card._lpPosterReady = true;
          revealCardIfReady();
        });
      }

      if (!card._lpMediaReady) {
        prefetchVideoAsBlob();
      }

      if (!coarsePointer) {
        image.addEventListener('click', function () {
          pauseCard(card, false);
        });
      }

      video.addEventListener('playing', function () {
        if (!card._lpShouldPlay) return;
        card._lpPlayPending = false;
        card._lpRetryOnCanPlay = false;
        card.classList.remove('is-loading');
        card.classList.add('is-playing');
        if (toggle) {
          setToggleLoading(toggle, false);
          toggle.setAttribute('aria-pressed', 'true');
        }
      });

      video.addEventListener('waiting', function () {
        if (!card._lpShouldPlay) return;
        card.classList.add('is-loading');
        if (toggle) {
          setToggleLoading(toggle, true);
        }
      });

      video.addEventListener('canplay', function () {
        if (!card._lpShouldPlay || card.classList.contains('is-playing') || card._lpPlayPending) return;
        if (!card._lpRetryOnCanPlay) return;
        playCard(card, { mute: card._lpTargetMuted });
      });

      video.addEventListener('ended', function () {
        if (!card._lpShouldPlay) return;
        pauseCard(card, true);
      });

      video.addEventListener('error', function () {
        if (card._lpBlobUrl) {
          try { window.URL.revokeObjectURL(card._lpBlobUrl); } catch (_err) {}
          card._lpBlobUrl = '';
        }
        pauseCard(card, false);
        card.classList.remove('is-pending');
        card.classList.add('is-fallback');
        if (toggle) {
          toggle.disabled = true;
          toggle.setAttribute('aria-disabled', 'true');
        }
      });
    });

    bindLiveAudioUnlockListeners();

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) return;
      cards.forEach(function (card) {
        pauseCard(card, false);
      });
    });

    window.addEventListener('pagehide', function () {
      cards.forEach(function (card) {
        if (!card || !card._lpBlobUrl) return;
        try { window.URL.revokeObjectURL(card._lpBlobUrl); } catch (_err) {}
        card._lpBlobUrl = '';
      });
    });
  })();

  /* ========== Code blocks: card style + copy + collapse ========== */
  (function initCodeBlocks() {
    var shells = Array.prototype.slice.call(document.querySelectorAll('.markdown-body .cg-code-shell'));
    if (!shells.length) return;
    var copyToast = null;
    var copyToastTimer = null;

    function debounce(fn, delay) {
      var timer = null;
      return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
      };
    }

    function getCollapsedHeight() {
      return window.innerWidth <= 768 ? 148 : 160;
    }

    function setToggleState(shell, expanded) {
      var toggle = shell.querySelector('.cg-code-toggle');
      if (!toggle) return;
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.setAttribute('aria-label', expanded ? '收起代码块' : '展开代码块');
    }

    function syncShellHeight(shell, keepState) {
      if (!shell) return;
      var body = shell.querySelector('.cg-code-body');
      if (!body) return;
      var collapsedHeight = getCollapsedHeight();
      var totalHeight = body.scrollHeight;
      var canCollapse = totalHeight > collapsedHeight + 26;
      var shouldCollapse = keepState ? shell.classList.contains('is-collapsed') : true;

      shell.classList.toggle('is-collapsible', canCollapse);
      if (!canCollapse) {
        shell.classList.remove('is-collapsed');
        body.style.maxHeight = 'none';
        setToggleState(shell, true);
        return;
      }

      if (shouldCollapse) {
        shell.classList.add('is-collapsed');
        body.style.maxHeight = collapsedHeight + 'px';
        setToggleState(shell, false);
      } else {
        shell.classList.remove('is-collapsed');
        body.style.maxHeight = totalHeight + 'px';
        setToggleState(shell, true);
      }
    }

    function showCopyToast(message) {
      if (!copyToast) {
        copyToast = document.createElement('div');
        copyToast.className = 'code-copy-toast';
        document.body.appendChild(copyToast);
      }
      copyToast.textContent = message;
      copyToast.classList.add('show');
      clearTimeout(copyToastTimer);
      copyToastTimer = setTimeout(function () {
        copyToast.classList.remove('show');
      }, 1400);
    }

    function fallbackCopyText(text) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (_err) {
        ok = false;
      }
      document.body.removeChild(textarea);
      return ok;
    }

    function copyText(text, onSuccess, onFail) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
          if (fallbackCopyText(text)) onSuccess();
          else onFail();
        });
        return;
      }
      if (fallbackCopyText(text)) onSuccess();
      else onFail();
    }

    function extractCodeText(figure) {
      var lineNodes = figure.querySelectorAll('td.code .line');
      if (lineNodes.length) {
        var parts = [];
        lineNodes.forEach(function (line) {
          parts.push((line.textContent || '').replace(/\u00a0/g, ' '));
        });
        return parts.join('\n').replace(/\s+$/, '');
      }
      var pre = figure.querySelector('td.code pre, pre');
      if (!pre) return '';
      return (pre.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+$/, '');
    }

    function updateCopyButton(btn, state) {
      if (!btn) return;
      btn.classList.remove('is-success', 'is-fail');
      if (state) btn.classList.add(state);
      clearTimeout(btn._copyResetTimer);
      btn._copyResetTimer = setTimeout(function () {
        btn.classList.remove('is-success', 'is-fail');
      }, 1200);
    }

    shells.forEach(function (shell) {
      var figure = shell.querySelector('figure.highlight');
      if (!figure) return;
      var copyBtn = shell.querySelector('.cg-code-copy');
      var toggleBtn = shell.querySelector('.cg-code-toggle');
      var body = shell.querySelector('.cg-code-body');
      if (!body) return;

      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var codeText = extractCodeText(figure);
          if (!codeText) return;
          copyText(codeText, function () {
            updateCopyButton(copyBtn, 'is-success');
            showCopyToast('代码已复制');
          }, function () {
            updateCopyButton(copyBtn, 'is-fail');
            showCopyToast('复制失败');
          });
        });
      }

      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          if (!shell.classList.contains('is-collapsible')) return;
          var collapsed = shell.classList.contains('is-collapsed');
          if (collapsed) {
            shell.classList.remove('is-collapsed');
            body.style.maxHeight = body.scrollHeight + 'px';
            setToggleState(shell, true);
          } else {
            shell.classList.add('is-collapsed');
            body.style.maxHeight = getCollapsedHeight() + 'px';
            setToggleState(shell, false);
          }
        });
      }

      syncShellHeight(shell, false);
    });

    var syncAllShellHeights = debounce(function () {
      shells.forEach(function (shell) {
        syncShellHeight(shell, true);
      });
    }, 120);

    window.addEventListener('resize', syncAllShellHeights, { passive: true });
    window.addEventListener('load', syncAllShellHeights);
  })();

  /* ========== Mobile bottom sheets (TOC / Series) ========== */
  (function initMobileSheets() {
    var tocBtn = document.getElementById('mobileTocTrigger');
    var seriesBtn = document.getElementById('mobileSeriesTrigger');
    var backdrop = document.getElementById('mobileSheetBackdrop');
    var tocSheet = document.getElementById('tocSheet');
    var seriesSheet = document.getElementById('seriesSheet');
    var tocSheetBody = document.getElementById('tocSheetBody');
    var seriesSheetBody = document.getElementById('seriesSheetBody');
    var seriesSheetTitle = document.getElementById('seriesSheetTitle');
    if (!tocBtn || !seriesBtn || !backdrop || !tocSheet || !seriesSheet || !tocSheetBody || !seriesSheetBody) return;

    var tocSource = document.getElementById('tocSidebar');
    var seriesSource = document.querySelector('.sidebar-right');
    var activeSheet = null;
    var lastTrigger = null;

    function syncTriggerState(openSheetId) {
      tocBtn.setAttribute('aria-expanded', openSheetId === 'tocSheet' ? 'true' : 'false');
      seriesBtn.setAttribute('aria-expanded', openSheetId === 'seriesSheet' ? 'true' : 'false');
    }

    var tocContent = tocSource ? tocSource.querySelector('.toc-wrapper') : null;
    if (tocContent && tocContent.innerHTML.trim()) {
      tocSheetBody.innerHTML = tocContent.innerHTML;
    } else {
      tocBtn.classList.add('is-hidden');
      tocBtn.setAttribute('aria-hidden', 'true');
      tocBtn.setAttribute('aria-expanded', 'false');
      tocBtn.tabIndex = -1;
    }

    var seriesList = seriesSource ? seriesSource.querySelector('.sidebar-list') : null;
    var seriesHead = seriesSource ? seriesSource.querySelector('.sidebar-header') : null;
    if (seriesList && seriesList.innerHTML.trim()) {
      seriesSheetBody.innerHTML = seriesList.outerHTML;
      if (seriesSheetTitle && seriesHead) {
        seriesSheetTitle.textContent = seriesHead.textContent.trim() || '系列';
      }
    } else {
      seriesBtn.classList.add('is-hidden');
      seriesBtn.setAttribute('aria-hidden', 'true');
      seriesBtn.setAttribute('aria-expanded', 'false');
      seriesBtn.tabIndex = -1;
    }

    syncTriggerState('');

    function closeSheets() {
      if (!activeSheet) return;
      activeSheet.style.transform = '';
      activeSheet.classList.remove('active');
      activeSheet.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sheet-open');
      syncTriggerState('');
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      activeSheet = null;
      lastTrigger = null;
    }

    function openSheet(sheet, trigger) {
      if (!sheet || sheet === activeSheet) return;
      if (activeSheet) closeSheets();
      activeSheet = sheet;
      lastTrigger = trigger || null;
      sheet.style.transform = '';
      sheet.classList.add('active');
      sheet.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('active');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('sheet-open');
      syncTriggerState(sheet.id);

      var focusTarget = sheet.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
      if (focusTarget && typeof focusTarget.focus === 'function') {
        setTimeout(function () { focusTarget.focus(); }, 20);
      }
    }

    tocBtn.addEventListener('click', function () {
      if (activeSheet === tocSheet) {
        closeSheets();
      } else {
        openSheet(tocSheet, tocBtn);
      }
    });

    seriesBtn.addEventListener('click', function () {
      if (activeSheet === seriesSheet) {
        closeSheets();
      } else {
        openSheet(seriesSheet, seriesBtn);
      }
    });

    backdrop.addEventListener('click', closeSheets);

    var closeBtns = document.querySelectorAll('.mobile-sheet-close');
    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', closeSheets);
    });

    [tocSheet, seriesSheet].forEach(function (sheet) {
      var bodyEl = sheet.querySelector('.mobile-sheet-body');
      if (!bodyEl) return;

      bodyEl.addEventListener('click', function (e) {
        var anchor = e.target.closest('a');
        if (anchor) closeSheets();
      });

      var dragStartY = 0;
      var dragging = false;
      sheet.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        dragging = true;
        dragStartY = e.touches[0].clientY;
      }, { passive: true });

      sheet.addEventListener('touchmove', function (e) {
        if (!dragging || e.touches.length !== 1) return;
        var dy = e.touches[0].clientY - dragStartY;
        if (dy > 8 && bodyEl.scrollTop === 0) {
          sheet.style.transform = 'translateY(' + Math.min(dy, 120) + 'px)';
        }
      }, { passive: true });

      sheet.addEventListener('touchend', function (e) {
        if (!dragging) return;
        dragging = false;
        var endY = e.changedTouches[0].clientY;
        var delta = endY - dragStartY;
        sheet.style.transform = '';
        if (delta > 72) closeSheets();
      }, { passive: true });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSheets();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeSheets();
    });
  })();

  /* ========== Lightbox — mobile-first gestures + immersive viewer ========== */
  (function initLightbox() {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    var lightboxImg = document.getElementById('lightbox-img');
    var lightboxImgBuffer = document.getElementById('lightbox-img-buffer');
    var flipGhost = document.getElementById('lightbox-flip-ghost');
    if (!flipGhost) {
      flipGhost = document.createElement('img');
      flipGhost.id = 'lightbox-flip-ghost';
      flipGhost.alt = '';
      flipGhost.setAttribute('aria-hidden', 'true');
      var lightboxContentEl = lightbox.querySelector('.lightbox-content');
      if (lightboxContentEl) {
        lightboxContentEl.appendChild(flipGhost);
      }
    }
    var lbCounter = document.getElementById('lbCounter');
    var lbZoomLevel = document.getElementById('lbZoomLevel');
    var lbExif = document.getElementById('lbExif');
    var btnClose = document.getElementById('lbClose');
    var btnPrev = document.getElementById('lbPrev');
    var btnNext = document.getElementById('lbNext');
    var btnZoomIn = document.getElementById('lbZoomIn');
    var btnZoomOut = document.getElementById('lbZoomOut');
    var btnZoomReset = document.getElementById('lbZoomReset');
    var btnRotate = document.getElementById('lbRotate');
    // btnDownload removed

    var images = Array.from(document.querySelectorAll('.post-cover-large img, .markdown-body img, .stream-cover img'));
    if (!images.length) return;

    var currentIndex = 0;
    var zoomScale = 1;
    var fitScale = 1;
    var rotation = 0;
    var translateX = 0;
    var translateY = 0;
    var swipeOffsetX = 0;
    var isZoomed = false;
    var isDragging = false;
    var isPinching = false;
    var uiHidden = false;

    var touchMode = 'none';
    var touchStartX = 0;
    var touchStartY = 0;
    var touchMoved = false;
    var startTranslateX = 0;
    var startTranslateY = 0;
    var pinchStartDist = 0;
    var pinchStartScale = 1;
    var lastTapAt = 0;
    var singleTapTimer = null;
    var exifRepositionTimer = null;

    var mouseStartX = 0;
    var mouseStartY = 0;
    var dragMoved = false;
    var swipeTimer = null;
    var swipeAnimating = false;
    var interactiveSwipeDir = 0;
    var interactiveSwipeNextIdx = -1;
    var interactiveSwipeActive = false;
    var dismissDragActive = false;
    var bodyScrollLocked = false;
    var bodyOverflowBeforeLock = '';
    var bodyPaddingRightBeforeLock = '';
    var activeAnims = [];

    var ZOOM_FACTOR = 1.2;
    var MIN_ZOOM = 1;
    var MAX_ZOOM = 16;
    var coarseMatcher = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var flipMotionConfig = window.CG_LIGHTBOX_FLIP_CONFIG || {};

    function clampMotionNumber(value, min, max, fallback) {
      var n = Number(value);
      if (!isFinite(n)) return fallback;
      if (n < min) return min;
      if (n > max) return max;
      return n;
    }

    var flipMotion = {
      /* Snappier open/close motion for natural preview feel */
      openDuration: clampMotionNumber(flipMotionConfig.openDuration, 260, 560, 380),
      closeDuration: clampMotionNumber(flipMotionConfig.closeDuration, 220, 480, 300),
      openEasing: flipMotionConfig.openEasing || 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      closeEasing: flipMotionConfig.closeEasing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      overlayOpenDuration: clampMotionNumber(flipMotionConfig.overlayOpenDuration, 160, 360, 240),
      overlayCloseDuration: clampMotionNumber(flipMotionConfig.overlayCloseDuration, 140, 320, 200),
      overlayOpenDelay: clampMotionNumber(flipMotionConfig.overlayOpenDelay, 0, 80, 0),
      overlayCloseDelay: clampMotionNumber(flipMotionConfig.overlayCloseDelay, 0, 80, 0)
    };

    var exifIcons = {
      camera: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
      lens: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 2v4 M12 18v4 M2 12h4 M18 12h4" stroke-width="1.2" opacity="0.6"/></svg>',
      iso: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>',
      focal: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="22" x2="12" y2="15.5"></line><line x1="12" y1="2" x2="12" y2="8.5"></line><line x1="2" y1="12" x2="8.5" y2="12"></line><line x1="22" y1="12" x2="15.5" y2="12"></line></svg>',
      aperture: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"></path></svg>',
      shutter: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 1.5"></path><path d="M12 2v3"></path><path d="M9 3l-1.5 1.5 M15 3l1.5 1.5"></path></svg>',
      location: '<svg class="lb-exif-icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
    };
    var exifFields = ['camera', 'lens', 'iso', 'focal', 'aperture', 'shutter', 'location'];

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function getTouchDistance(a, b) {
      var dx = a.clientX - b.clientX;
      var dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getRotationState() {
      var r = ((rotation % 360) + 360) % 360;
      return r;
    }

    function getEffectiveNaturalSize() {
      var nw = lightboxImg.naturalWidth || 1;
      var nh = lightboxImg.naturalHeight || 1;
      var r = getRotationState();
      if (r === 90 || r === 270) {
        return { width: nh, height: nw };
      }
      return { width: nw, height: nh };
    }

    function computeFitScale() {
      if (!lightboxImg.naturalWidth || !lightboxImg.naturalHeight) {
        fitScale = 1;
        return;
      }
      var effective = getEffectiveNaturalSize();
      var computed = window.getComputedStyle(lightboxImg);
      var maxW = parseFloat(computed.maxWidth);
      var maxH = parseFloat(computed.maxHeight);
      if (!maxW) maxW = window.innerWidth * 0.9;
      if (!maxH) maxH = window.innerHeight * 0.9;
      fitScale = Math.min(maxW / effective.width, maxH / effective.height, 1);
    }

    function getRenderedSize() {
      var effective = getEffectiveNaturalSize();
      return {
        width: effective.width * fitScale * zoomScale,
        height: effective.height * fitScale * zoomScale
      };
    }

    function clampPan() {
      if (!isZoomed) {
        translateX = 0;
        translateY = 0;
        return;
      }
      var rendered = getRenderedSize();
      var maxX = Math.max(0, (rendered.width - window.innerWidth) / 2);
      var maxY = Math.max(0, (rendered.height - window.innerHeight) / 2);
      translateX = clamp(translateX, -maxX, maxX);
      translateY = clamp(translateY, -maxY, maxY);
    }

    function updateZoomDisplay() {
      if (!lbZoomLevel) return;
      var pct = Math.round(Math.max(1, zoomScale * fitScale * 100));
      lbZoomLevel.textContent = pct + '%';
    }

    function applyTransform(opts) {
      opts = opts || {};
      isZoomed = zoomScale > 1.001;
      clampPan();

      if (opts.immediate || isDragging || isPinching) {
        lightboxImg.style.transition = 'none';
      } else if (opts.swipe) {
        lightboxImg.style.transition = 'transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.22s ease';
      } else {
        lightboxImg.style.transition = 'transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.2s ease';
      }

      var tx = translateX + swipeOffsetX;
      lightboxImg.style.transform = 'translate3d(' + tx + 'px,' + translateY + 'px,0) rotate(' + rotation + 'deg) scale(' + zoomScale + ')';
      lightbox.classList.toggle('zoomed', isZoomed);
      updateZoomDisplay();
    }

    function setUiHidden(hidden) {
      uiHidden = !!hidden;
      lightbox.classList.toggle('ui-hidden', uiHidden);
      if (!uiHidden) requestAnimationFrame(positionExifNearImage);
    }

    function resetView(resetRotation) {
      zoomScale = 1;
      translateX = 0;
      translateY = 0;
      swipeOffsetX = 0;
      if (resetRotation) rotation = 0;
      isDragging = false;
      isPinching = false;
      touchMode = 'none';
      interactiveSwipeDir = 0;
      interactiveSwipeNextIdx = -1;
      interactiveSwipeActive = false;
      lightbox.classList.remove('dragging');
      applyTransform({ immediate: true });
    }

    function hideBuffer() {
      if (!lightboxImgBuffer) return;
      lightboxImgBuffer.classList.remove('active');
      lightboxImgBuffer.style.transition = 'none';
      lightboxImgBuffer.style.opacity = '0';
      lightboxImgBuffer.style.transform = 'translate3d(0,0,0) rotate(0deg) scale(1)';
    }

    function setMainImageOpacity(opacity, duration, easing) {
      if (!lightboxImg) return;
      var nextOpacity = String(opacity);
      if (!duration || duration <= 0) {
        lightboxImg.style.transition = '';
        lightboxImg.style.opacity = nextOpacity;
        return;
      }
      lightboxImg.style.transition = 'opacity ' + duration + 'ms ' + (easing || 'ease');
      lightboxImg.style.opacity = nextOpacity;
      setTimeout(function () {
        if (!lightbox.classList.contains('active')) return;
        lightboxImg.style.transition = '';
      }, duration + 36);
    }

    function lockBodyScroll() {
      if (bodyScrollLocked) return;
      bodyOverflowBeforeLock = document.documentElement.style.overflow;
      bodyPaddingRightBeforeLock = document.body.style.paddingRight;
      var scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarGap > 0) {
        var currentPaddingRight = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = (currentPaddingRight + scrollbarGap) + 'px';
      }
      document.documentElement.style.overflow = 'hidden';
      bodyScrollLocked = true;
    }

    function unlockBodyScroll() {
      if (!bodyScrollLocked) return;
      document.documentElement.style.overflow = bodyOverflowBeforeLock;
      document.body.style.paddingRight = bodyPaddingRightBeforeLock;
      bodyScrollLocked = false;
    }

    function getImageDisplaySrc(img) {
      if (!img) return '';
      return img.currentSrc || img.getAttribute('data-src') || img.getAttribute('src') || '';
    }

    function assignLightboxImageFrom(sourceImg) {
      var src = getImageDisplaySrc(sourceImg);
      if (!src) return '';
      if (lightboxImg.getAttribute('src') !== src) {
        lightboxImg.src = src;
      }
      lightboxImg.alt = sourceImg.alt || '';
      return src;
    }

    function buildCenteredRect(width, height) {
      var w = Math.max(1, width || 1);
      var h = Math.max(1, height || 1);
      var maxW = window.innerWidth * 0.9;
      var maxH = window.innerHeight * 0.9;
      var scale = Math.min(maxW / w, maxH / h, 1);
      var finalW = Math.max(1, w * scale);
      var finalH = Math.max(1, h * scale);
      return {
        left: (window.innerWidth - finalW) / 2,
        top: (window.innerHeight - finalH) / 2,
        width: finalW,
        height: finalH
      };
    }

    function getTargetRectForImage(sourceImg) {
      var nw = lightboxImg.naturalWidth || sourceImg.naturalWidth || sourceImg.width || 1;
      var nh = lightboxImg.naturalHeight || sourceImg.naturalHeight || sourceImg.height || 1;
      return buildCenteredRect(nw, nh);
    }

    function hideFlipGhost() {
      if (!flipGhost) return;
      flipGhost.classList.remove('active');
      flipGhost.style.transition = 'none';
      flipGhost.style.opacity = '0';
      flipGhost.style.transform = 'translate3d(0,0,0) scale(1,1)';
      flipGhost.style.left = '0px';
      flipGhost.style.top = '0px';
      flipGhost.style.width = '1px';
      flipGhost.style.height = '1px';
      flipGhost.style.borderRadius = '0px';
      flipGhost.style.objectFit = 'contain';
    }

    function showFlipGhost(sourceEl, src, fromRect, toRect) {
      if (!flipGhost || !src || !fromRect || !toRect) return false;
      var toW = Math.max(1, toRect.width);
      var toH = Math.max(1, toRect.height);
      var scaleX = Math.max(0.0001, fromRect.width / toW);
      var scaleY = Math.max(0.0001, fromRect.height / toH);
      var dx = fromRect.left - toRect.left;
      var dy = fromRect.top - toRect.top;
      var computed = sourceEl ? window.getComputedStyle(sourceEl) : null;

      flipGhost.src = src;
      flipGhost.alt = sourceEl ? (sourceEl.alt || '') : '';
      flipGhost.style.left = toRect.left + 'px';
      flipGhost.style.top = toRect.top + 'px';
      flipGhost.style.width = toW + 'px';
      flipGhost.style.height = toH + 'px';
      flipGhost.style.transition = 'none';
      flipGhost.style.borderRadius = computed ? (computed.borderRadius || '0px') : '0px';
      flipGhost.style.objectFit = computed ? (computed.objectFit || 'cover') : 'cover';
      flipGhost.style.opacity = '1';
      flipGhost.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) scale(' + scaleX.toFixed(5) + ',' + scaleY.toFixed(5) + ')';
      flipGhost.classList.add('active');
      return true;
    }

    function playFlipGhost(duration, easing) {
      if (!flipGhost || !flipGhost.classList.contains('active')) return null;
      var raf1 = 0;
      var raf2 = 0;
      var timer = 0;
      var done = false;
      var resolveDone;
      var startTransform = flipGhost.style.transform;
      var endTransform = 'translate3d(0,0,0) scale(1,1)';
      var anim = {
        finished: new Promise(function (resolve) {
          resolveDone = resolve;
        }),
        cancel: function () {
          if (done) return;
          done = true;
          cleanup();
          resolveDone();
        }
      };

      function cleanup() {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(timer);
        flipGhost.removeEventListener('transitionend', onEnd);
      }

      function finish() {
        if (done) return;
        done = true;
        cleanup();
        resolveDone();
      }

      function onEnd(e) {
        if (e.target !== flipGhost) return;
        if (e.propertyName !== 'transform') return;
        finish();
      }

      flipGhost.addEventListener('transitionend', onEnd);
      flipGhost.style.transition = 'none';
      flipGhost.style.transform = startTransform;
      flipGhost.style.opacity = '1';
      raf1 = requestAnimationFrame(function () {
        raf2 = requestAnimationFrame(function () {
          if (done) return;
          flipGhost.style.transition = 'transform ' + duration + 'ms ' + easing + ', opacity ' + duration + 'ms ' + easing;
          flipGhost.style.transform = endTransform;
          flipGhost.style.opacity = '1';
          timer = setTimeout(finish, duration + 90);
        });
      });
      activeAnims.push(anim);
      return anim;
    }

    function playOverlayFade(fromOpacity, toOpacity, duration, easing, delay) {
      var raf1 = 0;
      var raf2 = 0;
      var timer = 0;
      var done = false;
      var resolveDone;
      var safeDelay = Math.max(0, delay || 0);
      var anim = {
        finished: new Promise(function (resolve) {
          resolveDone = resolve;
        }),
        cancel: function () {
          if (done) return;
          done = true;
          cleanup();
          resolveDone();
        }
      };

      function cleanup() {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        clearTimeout(timer);
        lightbox.removeEventListener('transitionend', onEnd);
      }

      function finish() {
        if (done) return;
        done = true;
        cleanup();
        resolveDone();
      }

      function onEnd(e) {
        if (e.target !== lightbox) return;
        if (e.propertyName !== 'opacity') return;
        finish();
      }

      lightbox.addEventListener('transitionend', onEnd);
      lightbox.style.transition = 'none';
      lightbox.style.opacity = String(fromOpacity);
      raf1 = requestAnimationFrame(function () {
        raf2 = requestAnimationFrame(function () {
          if (done) return;
          lightbox.style.transition = 'opacity ' + duration + 'ms ' + easing + ' ' + safeDelay + 'ms';
          lightbox.style.opacity = String(toOpacity);
          timer = setTimeout(finish, duration + safeDelay + 100);
        });
      });
      activeAnims.push(anim);
      return anim;
    }

    function getThumbnailRect(index) {
      var thumb = images[index];
      if (!thumb) return null;
      var rect = thumb.getBoundingClientRect();
      // Thumbnail is off-screen or invisible
      if (rect.width < 1 || rect.height < 1) return null;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return null;
      if (rect.right < 0 || rect.left > window.innerWidth) return null;
      return rect;
    }

    function isUsableRect(rect) {
      return !!(rect && rect.width > 1 && rect.height > 1);
    }

    function computeZoomTransform(thumbRect) {
      if (!thumbRect || !lightboxImg) return null;
      var vw = window.innerWidth;
      var vh = window.innerHeight;

      // Lightbox image display size (CSS constrained: max 90vw × 90vh, object-fit: contain)
      var nw = lightboxImg.naturalWidth || 1;
      var nh = lightboxImg.naturalHeight || 1;
      var maxW = vw * 0.9;
      var maxH = vh * 0.9;
      var displayScale = Math.min(maxW / nw, maxH / nh, 1);
      var displayW = nw * displayScale;
      var displayH = nh * displayScale;

      if (displayW < 1 || displayH < 1) return null;

      // Lightbox image is centered by flexbox → center is at (vw/2, vh/2)
      var thumbCX = thumbRect.left + thumbRect.width / 2;
      var thumbCY = thumbRect.top + thumbRect.height / 2;
      var dx = thumbCX - vw / 2;
      var dy = thumbCY - vh / 2;
      var s = Math.min(thumbRect.width / displayW, thumbRect.height / displayH);

      return {
        tx: dx,
        ty: dy,
        scale: s,
        css: 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')'
      };
    }

    function getThumbClipRadius(index, scale) {
      var thumb = images[index];
      if (!thumb || scale < 0.001) return 0;
      var style = window.getComputedStyle(thumb);
      var r = parseFloat(style.borderRadius) || 0;
      return r > 0.5 ? r / scale : 0;
    }

    function positionExifNearImage() {
      if (!lbExif || !lbExif.classList.contains('visible')) return;
      if (isZoomed) return;
      // Hide when rotated
      var r = ((rotation % 360) + 360) % 360;
      if (r !== 0) return;
      if (!lightboxImg || !lightboxImg.naturalWidth) return;
      var rect = lightboxImg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      // Keep EXIF close to image top and fit to current image width.
      var w = Math.max(240, Math.min(window.innerWidth - 14, rect.width + 20));
      lbExif.style.width = Math.round(w) + 'px';
      lbExif.style.maxWidth = Math.round(w) + 'px';
      lbExif.style.left = Math.round(rect.left + rect.width / 2) + 'px';
      lbExif.style.transform = 'translateX(-50%)';

      var exifH = lbExif.offsetHeight || 18;
      var top = rect.top - exifH - 6;
      if (top < 4) top = rect.top + 6;
      lbExif.style.top = Math.round(top) + 'px';
    }

    function scheduleExifReposition() {
      if (!lbExif || !lbExif.classList.contains('visible')) return;
      requestAnimationFrame(function () {
        requestAnimationFrame(positionExifNearImage);
      });
      if (exifRepositionTimer) {
        clearTimeout(exifRepositionTimer);
      }
      // Recompute again after transform easing settles to avoid stale mid-animation rects.
      exifRepositionTimer = setTimeout(function () {
        exifRepositionTimer = null;
        positionExifNearImage();
      }, 280);
    }

    function createExifIcon(field) {
      var holder = document.createElement('span');
      holder.innerHTML = exifIcons[field] || '';
      return holder.firstElementChild;
    }

    function buildExifContent(sourceImg) {
      var frag = document.createDocumentFragment();
      var hasAny = false;
      exifFields.forEach(function (field) {
        var value = sourceImg.getAttribute('data-' + field);
        if (!value) return;
        hasAny = true;
        var item = document.createElement('div');
        item.className = 'lb-exif-item';
        var icon = createExifIcon(field);
        if (icon) item.appendChild(icon);
        var text = document.createElement('span');
        text.className = 'lb-exif-text';
        text.textContent = value;
        item.appendChild(text);
        frag.appendChild(item);
      });
      return hasAny ? frag : null;
    }

    function updateExif(sourceImg) {
      if (!lbExif) return;
      var newContent = buildExifContent(sourceImg);
      var wasVisible = lbExif.classList.contains('visible');
      var alreadyFading = lbExif.classList.contains('fade-out');

      if (!newContent) {
        // No EXIF: fade out if visible, then clear
        if (wasVisible) {
          if (!alreadyFading) lbExif.classList.add('fade-out');
          setTimeout(function () {
            lbExif.innerHTML = '';
            lbExif.classList.remove('visible', 'fade-out');
          }, 280);
        } else {
          lbExif.innerHTML = '';
          lbExif.classList.remove('visible', 'fade-out');
        }
        return;
      }

      if (wasVisible && alreadyFading) {
        // Already fading from swipe — swap content, reposition, then fade back in
        lbExif.innerHTML = '';
        lbExif.appendChild(newContent);
        lbExif.style.transition = 'none';
        void lbExif.offsetWidth;
        positionExifNearImage();
        lbExif.style.transition = '';
        lbExif.classList.remove('fade-out');
      } else if (wasVisible) {
        // Normal: fade out then swap then fade in
        lbExif.classList.add('fade-out');
        setTimeout(function () {
          lbExif.innerHTML = '';
          lbExif.appendChild(newContent);
          lbExif.style.transition = 'none';
          void lbExif.offsetWidth;
          positionExifNearImage();
          lbExif.style.transition = '';
          lbExif.classList.remove('fade-out');
        }, 280);
      } else {
        // Fresh show: position at opacity 0, then fade in
        lbExif.innerHTML = '';
        lbExif.appendChild(newContent);
        lbExif.classList.add('visible');
        lbExif.style.transition = 'none';
        lbExif.style.opacity = '0';
        void lbExif.offsetWidth;
        positionExifNearImage();
        lbExif.style.transition = '';
        lbExif.style.opacity = '';
      }
    }

    function updateLightboxImage(opts) {
      opts = opts || {};
      var img = images[currentIndex];
      if (swipeTimer && !opts.keepSwipeTimer) {
        clearTimeout(swipeTimer);
        swipeTimer = null;
      }
      swipeAnimating = false;
      resetView(true);
      hideBuffer();
      setUiHidden(opts.immersive !== false);
      lightboxImg.style.opacity = '1';

      assignLightboxImageFrom(img);
      if (lbCounter) lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
      updateExif(img);

      function onImageReady() {
        computeFitScale();
        applyTransform({ immediate: true });
        requestAnimationFrame(positionExifNearImage);
      }

      lightboxImg.onload = onImageReady;
      if (lightboxImg.complete && lightboxImg.naturalWidth) {
        onImageReady();
      }
    }

    function cancelActiveAnims() {
      activeAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      activeAnims = [];
    }

    function openLightbox() {
      if (singleTapTimer) {
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
      }
      lastTapAt = 0;
      cancelActiveAnims();
      var img = images[currentIndex];
      var thumbRect = getThumbnailRect(currentIndex);
      var thumbSrc = getImageDisplaySrc(img);
      var disableFlipOnCoarse = !!(coarseMatcher && coarseMatcher.matches);
      var canFlipOpen = isUsableRect(thumbRect) && !!thumbSrc && !disableFlipOnCoarse && !(reducedMotion && reducedMotion.matches);
      var imageReady = false;
      var flipReady = !canFlipOpen;
      var openFinalized = false;

      resetView(true);
      hideBuffer();
      hideFlipGhost();
      setUiHidden(false);
      assignLightboxImageFrom(img);
      if (lbCounter) lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
      updateExif(img);

      function maybeFinalizeOpen() {
        if (openFinalized || !imageReady || !flipReady) return;
        openFinalized = true;
        setMainImageOpacity(1, canFlipOpen ? 140 : 90, 'cubic-bezier(0.2, 0.8, 0.2, 1)');
        hideFlipGhost();
        lightbox.style.opacity = '1';
        computeFitScale();
        applyTransform({ immediate: true });
        requestAnimationFrame(positionExifNearImage);
      }

      function onMainImageReady() {
        imageReady = true;
        lightboxImg.onload = null;
        maybeFinalizeOpen();
      }

      if (lightboxImg.complete && lightboxImg.naturalWidth) {
        imageReady = true;
      } else {
        lightboxImg.onload = onMainImageReady;
      }

      lockBodyScroll();
      lightbox.classList.add('active');
      lightbox.style.opacity = '0';
      if (!canFlipOpen) {
        setMainImageOpacity(1, 0);
      } else {
        setMainImageOpacity(0, 0);
      }

      var overlayOpen = playOverlayFade(0, 1, flipMotion.overlayOpenDuration, flipMotion.openEasing, flipMotion.overlayOpenDelay);
      if (overlayOpen && overlayOpen.finished) {
        overlayOpen.finished.then(function () {
          lightbox.style.opacity = '1';
        }).catch(function () {});
      } else {
        lightbox.style.opacity = '1';
      }

      if (canFlipOpen) {
        var targetRect = getTargetRectForImage(img);
        if (showFlipGhost(img, thumbSrc, thumbRect, targetRect)) {
          var ghostOpenAnim = playFlipGhost(flipMotion.openDuration, flipMotion.openEasing);
          if (ghostOpenAnim && ghostOpenAnim.finished) {
            ghostOpenAnim.finished.then(function () {
              flipReady = true;
              maybeFinalizeOpen();
            }).catch(function () {
              flipReady = true;
              maybeFinalizeOpen();
            });
          } else {
            setTimeout(function () {
              flipReady = true;
              maybeFinalizeOpen();
            }, flipMotion.openDuration + 100);
          }
        } else {
          flipReady = true;
        }
      }

      maybeFinalizeOpen();
    }

    function closeLightbox() {
      if (singleTapTimer) {
        clearTimeout(singleTapTimer);
        singleTapTimer = null;
      }
      if (swipeTimer) {
        clearTimeout(swipeTimer);
        swipeTimer = null;
      }
      swipeAnimating = false;
      cancelActiveAnims();

      function finishClose() {
        cancelActiveAnims();
        hideFlipGhost();
        lightbox.classList.remove('active', 'ui-hidden', 'zoomed', 'dragging');
        lightbox.style.opacity = '';
        unlockBodyScroll();
        resetView(true);
        hideBuffer();
        setUiHidden(false);
        lightboxImg.style.opacity = '1';
        lightboxImg.style.clipPath = '';
        if (exifRepositionTimer) {
          clearTimeout(exifRepositionTimer);
          exifRepositionTimer = null;
        }
        // Reset EXIF state to prevent leakage into next open
        if (lbExif) {
          lbExif.classList.remove('visible', 'fade-out');
          lbExif.innerHTML = '';
          lbExif.removeAttribute('style');
        }
      }

      var activeImage = images[currentIndex];
      var thumbRect = getThumbnailRect(currentIndex);
      var r = ((rotation % 360) + 360) % 360;
      var disableFlipOnCoarse = !!(coarseMatcher && coarseMatcher.matches);
      var canFlipBack = isUsableRect(thumbRect) && !isZoomed && r === 0 && !disableFlipOnCoarse && !(reducedMotion && reducedMotion.matches);

      // Hide UI immediately
      setUiHidden(true);

      // Fade out EXIF gracefully
      if (lbExif && lbExif.classList.contains('visible')) {
        lbExif.classList.add('fade-out');
      }

      if (!canFlipBack) {
        var fadeOnlyAnim = playOverlayFade(1, 0, flipMotion.overlayCloseDuration, flipMotion.closeEasing, flipMotion.overlayCloseDelay);
        if (fadeOnlyAnim && fadeOnlyAnim.finished) {
          fadeOnlyAnim.finished.then(finishClose).catch(finishClose);
        } else {
          finishClose();
        }
        return;
      }

      var fromRect = lightboxImg.getBoundingClientRect();
      if (!isUsableRect(fromRect)) {
        fromRect = getTargetRectForImage(activeImage);
      }
      if (!isUsableRect(fromRect)) {
        var fadeAnim = playOverlayFade(1, 0, flipMotion.overlayCloseDuration, flipMotion.closeEasing, flipMotion.overlayCloseDelay);
        if (fadeAnim && fadeAnim.finished) {
          fadeAnim.finished.then(finishClose).catch(finishClose);
        } else {
          finishClose();
        }
        return;
      }

      var closeSrc = lightboxImg.currentSrc || lightboxImg.getAttribute('src') || getImageDisplaySrc(activeImage);
      if (!closeSrc || !showFlipGhost(activeImage, closeSrc, fromRect, thumbRect)) {
        var fallbackAnim = playOverlayFade(1, 0, flipMotion.overlayCloseDuration, flipMotion.closeEasing, flipMotion.overlayCloseDelay);
        if (fallbackAnim && fallbackAnim.finished) {
          fallbackAnim.finished.then(finishClose).catch(finishClose);
        } else {
          finishClose();
        }
        return;
      }

      setMainImageOpacity(0, 120, 'cubic-bezier(0.4, 0, 1, 1)');
      var ghostCloseAnim = playFlipGhost(flipMotion.closeDuration, flipMotion.closeEasing);
      var overlayCloseAnim = playOverlayFade(1, 0, flipMotion.overlayCloseDuration, flipMotion.closeEasing, flipMotion.overlayCloseDelay);
      if (overlayCloseAnim && overlayCloseAnim.finished) {
        overlayCloseAnim.finished.then(function () {
          lightbox.style.opacity = '0';
        }).catch(function () {});
      }

      if (ghostCloseAnim && ghostCloseAnim.finished && overlayCloseAnim && overlayCloseAnim.finished) {
        Promise.all([ghostCloseAnim.finished, overlayCloseAnim.finished]).then(finishClose).catch(finishClose);
      } else if (ghostCloseAnim && ghostCloseAnim.finished) {
        ghostCloseAnim.finished.then(finishClose).catch(finishClose);
      } else {
        setTimeout(finishClose, Math.max(flipMotion.closeDuration, flipMotion.overlayCloseDuration + flipMotion.overlayCloseDelay) + 120);
      }
    }

    function changeImage(direction) {
      currentIndex += direction;
      if (currentIndex >= images.length) currentIndex = 0;
      if (currentIndex < 0) currentIndex = images.length - 1;
      updateLightboxImage({ immersive: uiHidden });
    }

    function zoomToFit() {
      zoomScale = 1;
      translateX = 0;
      translateY = 0;
      swipeOffsetX = 0;
      computeFitScale();
      applyTransform();
    }

    function zoomToOriginal() {
      computeFitScale();
      var originalScale = fitScale >= 1 ? 1 : clamp(1 / fitScale, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(zoomScale - originalScale) < 0.04) {
        zoomToFit();
      } else {
        zoomScale = originalScale;
        translateX = 0;
        translateY = 0;
        swipeOffsetX = 0;
        applyTransform();
      }
    }

    function getOriginalScale() {
      computeFitScale();
      if (fitScale >= 1) return 1;
      return clamp(1 / fitScale, MIN_ZOOM, MAX_ZOOM);
    }

    function zoomAtPoint(nextScale, clientX, clientY) {
      nextScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(nextScale - zoomScale) < 0.001) return;

      var oldScale = zoomScale;
      var centerX = window.innerWidth / 2;
      var centerY = window.innerHeight / 2;
      var relX = clientX - centerX - translateX;
      var relY = clientY - centerY - translateY;

      zoomScale = nextScale;
      translateX = translateX - relX * (nextScale / oldScale - 1);
      translateY = translateY - relY * (nextScale / oldScale - 1);
      applyTransform();
    }

    function zoomIn() {
      zoomAtPoint(zoomScale * ZOOM_FACTOR, window.innerWidth / 2, window.innerHeight / 2);
    }

    function zoomOut() {
      zoomAtPoint(zoomScale / ZOOM_FACTOR, window.innerWidth / 2, window.innerHeight / 2);
    }

    function toggleOriginalAtPoint(clientX, clientY) {
      var originalScale = getOriginalScale();
      if (originalScale <= 1.001) {
        zoomToFit();
        return;
      }
      if (Math.abs(zoomScale - originalScale) < 0.04) {
        zoomToFit();
      } else {
        zoomAtPoint(originalScale, clientX, clientY);
      }
    }

    function rotateCW() {
      var absScale = zoomScale * fitScale;
      rotation += 90;
      computeFitScale();
      if (fitScale > 0) {
        zoomScale = clamp(absScale / fitScale, MIN_ZOOM, MAX_ZOOM);
      }
      translateX = 0;
      translateY = 0;
      swipeOffsetX = 0;
      applyTransform();

      // Hide EXIF when rotated, restore when back to 0°
      if (lbExif && lbExif.classList.contains('visible')) {
        var r = ((rotation % 360) + 360) % 360;
        if (r !== 0) {
          lbExif.classList.add('fade-out');
        } else {
          lbExif.classList.remove('fade-out');
          scheduleExifReposition();
        }
      }
    }

    /* Shared swipe animation: slides both images in sync.
       startDx = current finger offset (0 for button/keyboard triggers). */
    function startSwipeAnimation(direction, nextIdx, nextImg, startDx) {
      if (swipeTimer) { clearTimeout(swipeTimer); swipeTimer = null; }
      swipeAnimating = true;

      // Fade out EXIF at swipe start (for button/keyboard triggers)
      if (lbExif && lbExif.classList.contains('visible') && !lbExif.classList.contains('fade-out')) {
        lbExif.classList.add('fade-out');
      }

      var vw = Math.max(window.innerWidth, 320);

      var nextSrc = getImageDisplaySrc(nextImg);
      if (!nextSrc) {
        changeImage(direction);
        return;
      }
      if (lightboxImgBuffer.src !== nextSrc) {
        lightboxImgBuffer.src = nextSrc;
        lightboxImgBuffer.alt = nextImg.alt || '';
      }
      lightboxImgBuffer.style.opacity = '1';
      lightboxImgBuffer.classList.add('active');

      // Set current positions (no transition)
      lightboxImg.style.transition = 'none';
      lightboxImgBuffer.style.transition = 'none';
      lightboxImg.style.transform = 'translate3d(' + startDx + 'px,0,0) rotate(0deg) scale(1)';
      lightboxImgBuffer.style.transform = 'translate3d(' + (startDx + direction * vw) + 'px,0,0) scale(1)';

      // Duration proportional to remaining distance
      var remaining = vw - Math.abs(startDx);
      var duration = Math.max(0.18, Math.min(0.34, remaining / vw * 0.34));
      var timing = 'transform ' + duration.toFixed(2) + 's cubic-bezier(0.25, 0.1, 0.25, 1)';

      // Force reflow then animate
      void lightboxImg.offsetWidth;

      lightboxImg.style.transition = timing;
      lightboxImgBuffer.style.transition = timing;
      lightboxImg.style.transform = 'translate3d(' + (-direction * vw) + 'px,0,0) rotate(0deg) scale(1)';
      lightboxImgBuffer.style.transform = 'translate3d(0,0,0) scale(1)';

      var finished = false;
      function finalize() {
        if (finished) return;
        finished = true;
        if (swipeTimer) { clearTimeout(swipeTimer); swipeTimer = null; }

        currentIndex = nextIdx;

        // Swap: place main image at center with the new src (already cached)
        lightboxImg.style.transition = 'none';
        lightboxImg.src = nextSrc;
        lightboxImg.alt = nextImg.alt || '';
        lightboxImg.style.opacity = '1';
        lightboxImg.style.transform = 'translate3d(0,0,0) rotate(0deg) scale(1)';

        hideBuffer();

        rotation = 0;
        zoomScale = 1;
        translateX = 0;
        translateY = 0;
        swipeOffsetX = 0;
        isZoomed = false;
        swipeAnimating = false;
        interactiveSwipeActive = false;
        interactiveSwipeDir = 0;
        interactiveSwipeNextIdx = -1;
        lightbox.classList.remove('zoomed', 'dragging');

        if (lbCounter) lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
        updateExif(nextImg);
        computeFitScale();
        updateZoomDisplay();
      }

      lightboxImgBuffer.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'transform') return;
        lightboxImgBuffer.removeEventListener('transitionend', handler);
        finalize();
      });
      swipeTimer = setTimeout(finalize, Math.round(duration * 1000) + 80);
    }

    function cancelInteractiveSwipe() {
      var vw = window.innerWidth;
      var timing = 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)';
      lightboxImg.style.transition = timing;
      lightboxImg.style.transform = 'translate3d(0,0,0) rotate(' + rotation + 'deg) scale(' + zoomScale + ')';
      if (lightboxImgBuffer) {
        lightboxImgBuffer.style.transition = timing;
        lightboxImgBuffer.style.transform = 'translate3d(' + (interactiveSwipeDir * vw) + 'px,0,0) scale(1)';
        setTimeout(hideBuffer, 280);
      }
      // Restore EXIF if swipe cancelled
      if (lbExif && lbExif.classList.contains('fade-out') && lbExif.classList.contains('visible')) {
        lbExif.classList.remove('fade-out');
      }
      interactiveSwipeActive = false;
      interactiveSwipeDir = 0;
      interactiveSwipeNextIdx = -1;
      swipeOffsetX = 0;
    }

    function applyDismissDrag(dy) {
      var maxShift = Math.max(window.innerHeight * 0.78, 1);
      var safeDy = clamp(dy, -maxShift, maxShift);
      var progress = Math.min(1, Math.abs(safeDy) / Math.max(window.innerHeight * 0.72, 1));
      var scale = 1 - progress * 0.16;
      var overlayOpacity = 1 - progress * 0.62;

      lightbox.style.transition = 'none';
      lightbox.style.opacity = String(clamp(overlayOpacity, 0.35, 1));
      lightboxImg.style.transition = 'none';
      lightboxImg.style.transform = 'translate3d(0,' + safeDy + 'px,0) rotate(' + rotation + 'deg) scale(' + scale.toFixed(4) + ')';
    }

    function resetDismissDragVisual() {
      lightboxImg.style.transition = 'transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)';
      lightbox.style.transition = 'opacity 220ms ease';
      lightboxImg.style.transform = 'translate3d(0,0,0) rotate(' + rotation + 'deg) scale(' + zoomScale + ')';
      lightbox.style.opacity = '1';
      setTimeout(function () {
        if (!lightbox.classList.contains('active')) return;
        lightboxImg.style.transition = '';
        lightbox.style.transition = '';
      }, 240);
    }

    /* For button / keyboard triggers */
    function animateSwipe(direction) {
      if (swipeAnimating) return;
      if (isZoomed) { changeImage(direction); return; }
      if (!lightboxImgBuffer) { changeImage(direction); return; }

      var nextIdx = currentIndex + direction;
      if (nextIdx >= images.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = images.length - 1;
      var nextImg = images[nextIdx];
      if (!nextImg || !getImageDisplaySrc(nextImg)) { changeImage(direction); return; }

      startSwipeAnimation(direction, nextIdx, nextImg, 0);
    }

    function processTap(clientX, clientY) {
      var now = Date.now();
      if (now - lastTapAt < 280) {
        if (singleTapTimer) {
          clearTimeout(singleTapTimer);
          singleTapTimer = null;
        }
        toggleOriginalAtPoint(clientX, clientY);
        lastTapAt = 0;
      } else {
        lastTapAt = now;
        singleTapTimer = setTimeout(function () {
          setUiHidden(!uiHidden);
          singleTapTimer = null;
        }, 220);
      }
    }

    images.forEach(function (img, index) {
      img.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = index;
        openLightbox();
      });
    });

    if (btnZoomIn) btnZoomIn.addEventListener('click', function (e) { e.stopPropagation(); zoomIn(); });
    if (btnZoomOut) btnZoomOut.addEventListener('click', function (e) { e.stopPropagation(); zoomOut(); });
    if (btnZoomReset) btnZoomReset.addEventListener('click', function (e) { e.stopPropagation(); zoomToOriginal(); });
    if (btnRotate) btnRotate.addEventListener('click', function (e) { e.stopPropagation(); rotateCW(); });
    if (btnPrev) btnPrev.addEventListener('click', function (e) { e.stopPropagation(); animateSwipe(-1); });
    if (btnNext) btnNext.addEventListener('click', function (e) { e.stopPropagation(); animateSwipe(1); });
    if (btnClose) btnClose.addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });

    lightboxImg.addEventListener('mousedown', function (e) {
      if (!isZoomed) return;
      e.preventDefault();
      isDragging = true;
      dragMoved = false;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      lightbox.classList.add('dragging');
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      dragMoved = true;
      translateX = startTranslateX + (e.clientX - mouseStartX);
      translateY = startTranslateY + (e.clientY - mouseStartY);
      applyTransform({ immediate: true });
    });

    document.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      lightbox.classList.remove('dragging');
      applyTransform();
      if (dragMoved) {
        setTimeout(function () { dragMoved = false; }, 20);
      }
    });

    lightboxImg.addEventListener('click', function (e) {
      e.stopPropagation();
      if (dragMoved) return;
      if (coarseMatcher && coarseMatcher.matches) return;
      setUiHidden(!uiHidden);
    });

    lightboxImg.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (coarseMatcher && coarseMatcher.matches) return;
      toggleOriginalAtPoint(e.clientX, e.clientY);
    });

    lightboxImg.addEventListener('transitionend', function (e) {
      if (e.propertyName !== 'transform') return;
      if (!lbExif || !lbExif.classList.contains('visible')) return;
      if (lbExif.classList.contains('fade-out')) return;
      if (isZoomed) return;
      var r = ((rotation % 360) + 360) % 360;
      if (r !== 0) return;
      positionExifNearImage();
    });

    lightbox.addEventListener('wheel', function (e) {
      if (!lightbox.classList.contains('active')) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomAtPoint(zoomScale * ZOOM_FACTOR, e.clientX, e.clientY);
      } else {
        zoomAtPoint(zoomScale / ZOOM_FACTOR, e.clientX, e.clientY);
      }
    }, { passive: false });

    lightboxImg.addEventListener('touchstart', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (swipeAnimating) return;
      if (e.touches.length === 2) {
        if (singleTapTimer) {
          clearTimeout(singleTapTimer);
          singleTapTimer = null;
        }
        isPinching = true;
        touchMode = 'pinch';
        pinchStartDist = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartScale = zoomScale;
        return;
      }

      if (e.touches.length !== 1) return;
      var touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchMoved = false;

      if (isZoomed) {
        touchMode = 'pan';
        isDragging = true;
        startTranslateX = translateX;
        startTranslateY = translateY;
        lightbox.classList.add('dragging');
      } else {
        touchMode = 'swipe';
        swipeOffsetX = 0;
        interactiveSwipeDir = 0;
        interactiveSwipeNextIdx = -1;
        interactiveSwipeActive = false;
        dismissDragActive = false;
      }
    }, { passive: true });

    lightboxImg.addEventListener('touchmove', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (swipeAnimating) return;

      if (touchMode === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        var dist = getTouchDistance(e.touches[0], e.touches[1]);
        zoomScale = clamp(pinchStartScale * (dist / Math.max(1, pinchStartDist)), MIN_ZOOM, MAX_ZOOM);
        touchMoved = true;
        applyTransform({ immediate: true });
        return;
      }

      if (e.touches.length !== 1) return;
      var touch = e.touches[0];
      var dx = touch.clientX - touchStartX;
      var dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) touchMoved = true;

      if (touchMode === 'pan' && isZoomed) {
        e.preventDefault();
        translateX = startTranslateX + dx;
        translateY = startTranslateY + dy;
        applyTransform({ immediate: true });
        return;
      }

      if (touchMode === 'swipe' && !isZoomed) {
        if (dismissDragActive) {
          e.preventDefault();
          touchMoved = true;
          applyDismissDrag(dy);
          return;
        }

        /* Vertical drag-to-close gesture (mobile): pull image up/down to dismiss */
        if (!interactiveSwipeActive && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          e.preventDefault();
          touchMoved = true;
          dismissDragActive = true;
          hideBuffer();
          interactiveSwipeActive = false;
          interactiveSwipeDir = 0;
          interactiveSwipeNextIdx = -1;
          swipeOffsetX = 0;
          applyDismissDrag(dy);
          return;
        }

        if (Math.abs(dx) < Math.abs(dy) && !interactiveSwipeActive) return;
        e.preventDefault();
        touchMoved = true;

        // Detect direction and prepare buffer
        if (Math.abs(dx) > 6 && lightboxImgBuffer) {
          var currentDir = dx < 0 ? 1 : -1;
          if (!interactiveSwipeActive || currentDir !== interactiveSwipeDir) {
            var nextIdx = currentIndex + currentDir;
            if (nextIdx >= images.length) nextIdx = 0;
            if (nextIdx < 0) nextIdx = images.length - 1;
            interactiveSwipeDir = currentDir;
            interactiveSwipeNextIdx = nextIdx;
            interactiveSwipeActive = true;
            var previewSrc = getImageDisplaySrc(images[nextIdx]);
            if (!previewSrc) return;
            lightboxImgBuffer.src = previewSrc;
            lightboxImgBuffer.alt = images[nextIdx].alt || '';
            lightboxImgBuffer.style.transition = 'none';
            lightboxImgBuffer.style.opacity = '1';
            lightboxImgBuffer.classList.add('active');
            // Fade out EXIF during interactive swipe
            if (lbExif && lbExif.classList.contains('visible') && !lbExif.classList.contains('fade-out')) {
              lbExif.classList.add('fade-out');
            }
          }
        }

        // Move main image with finger
        lightboxImg.style.transition = 'none';
        lightboxImg.style.transform = 'translate3d(' + dx + 'px,0,0) rotate(' + rotation + 'deg) scale(' + zoomScale + ')';

        // Move buffer alongside (peeking from edge)
        if (interactiveSwipeActive && lightboxImgBuffer) {
          var bufX = dx + interactiveSwipeDir * window.innerWidth;
          lightboxImgBuffer.style.transition = 'none';
          lightboxImgBuffer.style.transform = 'translate3d(' + bufX + 'px,0,0) scale(1)';
        }
      }
    }, { passive: false });

    lightboxImg.addEventListener('touchend', function (e) {
      if (!lightbox.classList.contains('active')) return;
      if (swipeAnimating) return;
      var changed = e.changedTouches[0];

      if (touchMode === 'pinch') {
        isPinching = false;
        touchMode = 'none';
        applyTransform();
        return;
      }

      if (touchMode === 'pan') {
        isDragging = false;
        lightbox.classList.remove('dragging');
        touchMode = 'none';
        applyTransform();
        if (!touchMoved) {
          processTap(changed.clientX, changed.clientY);
        }
        return;
      }

      if (touchMode !== 'swipe') return;
      touchMode = 'none';

      var dx = changed.clientX - touchStartX;
      var rawDy = changed.clientY - touchStartY;
      var dy = Math.abs(rawDy);

      if (dismissDragActive) {
        dismissDragActive = false;
        var closeThreshold = Math.max(92, Math.min(window.innerHeight * 0.15, 160));
        if (dy > closeThreshold) {
          closeLightbox();
        } else {
          resetDismissDragVisual();
        }
        return;
      }

      var threshold = Math.abs(dx) > 56 && Math.abs(dx) > dy * 1.1;

      if (interactiveSwipeActive && threshold) {
        // Complete the connected swipe
        var nextImg = images[interactiveSwipeNextIdx];
        startSwipeAnimation(interactiveSwipeDir, interactiveSwipeNextIdx, nextImg, dx);
        return;
      }

      if (interactiveSwipeActive) {
        // Cancel — snap back
        cancelInteractiveSwipe();
        var isTap = !touchMoved && Math.abs(dx) < 8 && dy < 8;
        if (isTap) processTap(changed.clientX, changed.clientY);
        return;
      }

      // No interactive swipe occurred
      lightbox.style.transition = '';
      lightbox.style.opacity = '1';
      swipeOffsetX = 0;
      applyTransform({ swipe: true });
      var isTap = !touchMoved && Math.abs(dx) < 8 && dy < 8;
      if (isTap) processTap(changed.clientX, changed.clientY);
    }, { passive: true });

    lightboxImg.addEventListener('touchcancel', function () {
      touchMode = 'none';
      isPinching = false;
      isDragging = false;
      dismissDragActive = false;
      lightbox.style.transition = '';
      lightbox.style.opacity = '1';
      swipeOffsetX = 0;
      if (interactiveSwipeActive) {
        interactiveSwipeActive = false;
        interactiveSwipeDir = 0;
        interactiveSwipeNextIdx = -1;
        hideBuffer();
      }
      lightbox.classList.remove('dragging');
      applyTransform();
    }, { passive: true });

    lightbox.addEventListener('click', function (e) {
      if (isZoomed) return;
      if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });

    window.addEventListener('resize', function () {
      if (!lightbox.classList.contains('active')) return;
      computeFitScale();
      applyTransform({ immediate: true });
      positionExifNearImage();
    });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('active')) return;
      var keyCode = e.code || '';
      if (e.key === 'Escape') {
        closeLightbox();
      }
      if (e.key === 'ArrowLeft' && !isZoomed) animateSwipe(-1);
      if (e.key === 'ArrowRight' && !isZoomed) animateSwipe(1);
      if (e.key === '+' || e.key === '=' || keyCode === 'NumpadAdd') zoomIn();
      if (e.key === '-' || e.key === '_' || keyCode === 'NumpadSubtract') zoomOut();
      if (e.key === '1') zoomToOriginal();
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setUiHidden(!uiHidden);
      }
    });
  })();

  /* ========== Selection Quote Tooltip ========== */
  (function () {
    var postContent = document.querySelector('.post-content.markdown-body');
    var gitalkContainer = document.getElementById('gitalk-container');
    if (!postContent || !gitalkContainer) return;

    var tooltip = document.getElementById('selectionTooltip');
    var quoteBtn = document.getElementById('selectionQuoteBtn');
    if (!tooltip || !quoteBtn) return;

    var lightbox = document.getElementById('lightbox');
    var MAX_CHARS = 500;
    var MIN_CHARS = 2;
    var selectionChangeTimer = null;

    function isLightboxOpen() {
      return lightbox && lightbox.classList.contains('active');
    }

    function hideTooltip() {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }

    function getSelectedText() {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return '';
      var text = sel.toString().trim();
      if (text.length < MIN_CHARS) return '';

      // Check if selection is within post content
      var range = sel.getRangeAt(0);
      var container = range.commonAncestorContainer;
      if (container.nodeType === 3) container = container.parentNode;
      if (!postContent.contains(container)) return '';

      return text;
    }

    function showTooltip() {
      if (isLightboxOpen()) return;

      var text = getSelectedText();
      if (!text) { hideTooltip(); return; }

      var sel = window.getSelection();
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();

      // Position: centered above selection
      var tooltipWidth = 120; // approximate
      var left = rect.left + rect.width / 2 - tooltipWidth / 2;
      var top = rect.top - 42;

      // Boundary checks
      if (left < 8) left = 8;
      if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - 8 - tooltipWidth;

      // If not enough space above, show below
      if (top < 8) {
        top = rect.bottom + 8;
      }

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
    }

    function formatQuote(text) {
      if (text.length > MAX_CHARS) {
        text = text.slice(0, MAX_CHARS) + '...';
      }
      // Split into lines and prefix each with >
      var lines = text.split('\n');
      var quoted = lines.map(function (line) {
        return '> ' + line;
      }).join('\n');
      return quoted + '\n\n';
    }

    function fillGitalkTextarea(quotedText) {
      var textarea = gitalkContainer.querySelector('.gt-header-textarea');
      if (textarea) {
        textarea.value = quotedText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        return true;
      }
      return false;
    }

    function scrollToComments() {
      var offsetTop = gitalkContainer.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }

    quoteBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      var text = getSelectedText();
      if (!text) return;

      var quotedText = formatQuote(text);

      // Clear selection
      var sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      hideTooltip();

      // Scroll to comment area
      scrollToComments();

      // Try to fill textarea; if not rendered yet, retry after 800ms
      setTimeout(function () {
        if (!fillGitalkTextarea(quotedText)) {
          setTimeout(function () {
            fillGitalkTextarea(quotedText);
          }, 800);
        }
      }, 500);
    });

    // PC: mouseup on post content
    postContent.addEventListener('mouseup', function () {
      // Small delay to let selection finalize
      setTimeout(showTooltip, 10);
    });

    // Mobile: selectionchange with throttle
    document.addEventListener('selectionchange', function () {
      if (selectionChangeTimer) clearTimeout(selectionChangeTimer);
      selectionChangeTimer = setTimeout(function () {
        // Only process if no mouse is involved (mobile scenario)
        var text = getSelectedText();
        if (text) {
          showTooltip();
        }
      }, 300);
    });

    // Hide on scroll
    var scrollHideTimer = null;
    window.addEventListener('scroll', function () {
      if (tooltip.classList.contains('visible')) {
        hideTooltip();
      }
      if (scrollHideTimer) clearTimeout(scrollHideTimer);
    }, { passive: true });

    // Hide on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && tooltip.classList.contains('visible')) {
        hideTooltip();
      }
    });

    // Hide when clicking outside tooltip
    document.addEventListener('mousedown', function (e) {
      if (tooltip.classList.contains('visible') && !tooltip.contains(e.target)) {
        hideTooltip();
      }
    });
  })();

  /* ========== TOC scroll tracking ========== */
  var tocSidebar = document.getElementById('tocSidebar');
  if (!tocSidebar) return;

  var tocLinks = tocSidebar.querySelectorAll('.toc-link');
  if (!tocLinks.length) return;
  var mobileTocLinks = document.querySelectorAll('#tocSheetBody .toc-link');

  var pairs = [];

  tocLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;

    var id = decodeURIComponent(href.slice(1));
    var heading = document.getElementById(id);
    if (heading) pairs.push({ heading: heading, link: link });
  });

  if (!pairs.length) return;

  function onScroll() {
    var scrollTop = window.scrollY;
    var currentIndex = -1;

    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i].heading.offsetTop <= scrollTop + 150) {
        currentIndex = i;
      }
    }

    if (currentIndex < 0) currentIndex = 0;

    for (var j = 0; j < pairs.length; j++) {
      var item = pairs[j].link.parentElement;
      item.classList.remove('active', 'passed');

      if (j < currentIndex) {
        item.classList.add('passed');
      } else if (j === currentIndex) {
        item.classList.add('active');
      }

      if (mobileTocLinks.length && mobileTocLinks[j] && mobileTocLinks[j].parentElement) {
        var mobileItem = mobileTocLinks[j].parentElement;
        mobileItem.classList.remove('active', 'passed');
        if (j < currentIndex) {
          mobileItem.classList.add('passed');
        } else if (j === currentIndex) {
          mobileItem.classList.add('active');
        }
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
