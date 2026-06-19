(function () {
  const script = document.currentScript;
  const organizationId = script && script.getAttribute('data-org-id');
  const previewMode = script && script.dataset && script.dataset.previewMode === 'true';
  const FUNCTIONS_BASE_URL = 'https://tgvzduhzzevnvkxqdswf.supabase.co/functions/v1';

  if (!organizationId) {
    console.error('[MaximumAI widget] Missing data-org-id attribute.');
    return;
  }

  const CONFIG_URL = `${FUNCTIONS_BASE_URL}/widget-config?organization_id=${encodeURIComponent(organizationId)}`;
  const CHAT_URL = `${FUNCTIONS_BASE_URL}/chat`;

  const state = {
    open: false,
    loading: true,
    streaming: false,
    messages: [],
    botName: 'MaximumAI Chatbot',
    welcomeMessage: 'Hello! How can I help you today?',
    brandColor: '#3B82F6',
    whiteLabel: false,
    supportEmail: null,
    sessionId: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `session-${Date.now()}`,
  };


  const els = {};

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Streaming state — kept outside the messages list so per-token updates
  // mutate a single dedicated DOM node (textContent) instead of rebuilding innerHTML.
  let streamingBubbleEl = null;
  let streamingTextEl = null;
  let pendingStreamText = '';
  let streamRafId = null;

  function buildBubble(role, content) {
    const isUser = role === 'user';
    const row = document.createElement('div');
    row.style.cssText = `display:flex;justify-content:${isUser ? 'flex-end' : 'flex-start'};margin-bottom:12px;`;
    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width:80%;border-radius:18px;padding:10px 14px;font-size:14px;line-height:1.5;white-space:pre-wrap;${
      isUser ? `background:${state.brandColor};color:#ffffff;` : 'background:#f3f4f6;color:#111827;'
    }`;
    bubble.textContent = content;
    row.appendChild(bubble);
    return { row: row, text: bubble };
  }

  function renderMessages() {
    if (!els.messages) return;
    // Tear down any in-flight streaming node — it will be re-created if still streaming.
    streamingBubbleEl = null;
    streamingTextEl = null;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < state.messages.length; i++) {
      const m = state.messages[i];
      frag.appendChild(buildBubble(m.role, m.content).row);
    }
    els.messages.replaceChildren(frag);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function ensureStreamingBubble() {
    if (streamingBubbleEl) return;
    const built = buildBubble('bot', '');
    streamingBubbleEl = built.row;
    streamingTextEl = built.text;
    els.messages.appendChild(streamingBubbleEl);
  }

  function flushStreamingText() {
    streamRafId = null;
    if (streamingTextEl) {
      streamingTextEl.textContent = pendingStreamText;
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  function scheduleStreamingFlush() {
    if (streamRafId !== null) return;
    streamRafId = requestAnimationFrame(flushStreamingText);
  }

  function cancelStreamingFlush() {
    if (streamRafId !== null) {
      cancelAnimationFrame(streamRafId);
      streamRafId = null;
    }
  }

  function commitStreamingMessage(finalContent) {
    cancelStreamingFlush();
    // Remove the in-flight node and push the finalized message into the list.
    if (streamingBubbleEl && streamingBubbleEl.parentNode) {
      streamingBubbleEl.parentNode.removeChild(streamingBubbleEl);
    }
    streamingBubbleEl = null;
    streamingTextEl = null;
    pendingStreamText = '';
    state.messages.push({ id: `bot-${Date.now()}-${Math.random()}`, role: 'bot', content: finalContent });
    // Append just the new bubble — no full re-render.
    const built = buildBubble('bot', finalContent);
    els.messages.appendChild(built.row);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function setStreaming(value) {
    state.streaming = value;
    if (els.send) els.send.disabled = value;
    if (els.input) els.input.disabled = value;
    if (els.sendLabel) els.sendLabel.textContent = value ? '...' : '➜';
  }

  function syncOpenState() {
    if (!els.panel || !els.fab) return;
    els.panel.style.display = state.open ? 'flex' : 'none';
    els.fab.textContent = state.open ? '✕' : '💬';
    els.fab.setAttribute('aria-label', state.open ? 'Close chat' : 'Open chat');
  }

  function pushMessage(role, content, id) {
    const msg = { id: id || `${role}-${Date.now()}-${Math.random()}`, role, content };
    state.messages.push(msg);
    // Append a single bubble — no full re-render.
    if (els.messages) {
      els.messages.appendChild(buildBubble(role, content).row);
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  async function loadConfig() {
    const response = await fetch(CONFIG_URL, { headers: { Accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load widget configuration');
    }

    state.botName = result.bot_name || state.botName;
    state.welcomeMessage = result.welcome_message || state.welcomeMessage;
    state.brandColor = result.primary_color || state.brandColor;
    state.whiteLabel = result.white_label === true;
    state.supportEmail = result.support_email || null;

    if (els.headerTitle) els.headerTitle.textContent = state.botName;
    if (els.fab) els.fab.style.background = state.brandColor;
    if (els.send) els.send.style.background = state.brandColor;
    if (els.footer) els.footer.style.display = state.whiteLabel ? 'none' : '';
    if (els.header) els.header.style.background = state.brandColor;
    if (els.supportLink) {
      if (state.supportEmail) {
        els.supportLink.style.display = '';
        els.supportLink.href = 'mailto:' + encodeURIComponent(state.supportEmail) + '?subject=Support%20Request';
      } else {
        els.supportLink.style.display = 'none';
      }
    }

    state.messages = [{ id: 'welcome', role: 'bot', content: state.welcomeMessage }];
    renderMessages();
    state.loading = false;
  }

  async function sendMessage() {
    const text = (els.input && els.input.value || '').trim();
    if (!text || state.streaming) return;

    pushMessage('user', text);
    els.input.value = '';
    setStreaming(true);

    let assistantContent = '';
    pendingStreamText = '';
    ensureStreamingBubble();

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(previewMode ? { 'X-MaximumAI-Preview': 'true' } : {}),
        },
        body: JSON.stringify({
          organization_id: organizationId,
          session_id: state.sessionId,
          message: text,
          preview_mode: previewMode,
        }),
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to connect');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex;

        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line || line.startsWith(':') || !line.startsWith('data: ')) continue;

          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(payload);
            const chunk = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
            if (chunk) {
              assistantContent += chunk;
              pendingStreamText = assistantContent;
              // Direct textContent mutation, batched to one update per frame.
              scheduleStreamingFlush();
            }
          } catch (error) {
            console.warn('[MaximumAI widget] Failed to parse stream chunk', error);
          }
        }
      }

      const finalContent = assistantContent || 'Sorry, I could not generate a response.';
      // Commit only once the stream is [DONE]: removes the in-flight node and
      // appends the finalized message into state.messages + DOM.
      commitStreamingMessage(finalContent);
    } catch (error) {
      cancelStreamingFlush();
      if (streamingBubbleEl && streamingBubbleEl.parentNode) {
        streamingBubbleEl.parentNode.removeChild(streamingBubbleEl);
      }
      streamingBubbleEl = null;
      streamingTextEl = null;
      pendingStreamText = '';
      pushMessage('bot', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setStreaming(false);
      if (els.input) els.input.focus();
    }
  }

  function mount() {
    const root = document.createElement('div');
    root.id = 'maximumai-chat-widget';
    root.innerHTML = `
        <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div id="maximumai-chat-panel" style="display:none;position:fixed;right:24px;bottom:96px;flex-direction:column;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 120px));z-index:2147483000;background:#ffffff;border:1px solid rgba(15,23,42,0.1);border-radius:20px;box-shadow:0 24px 80px rgba(15,23,42,0.2);overflow:hidden;">
          <div id="maximumai-chat-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;color:#ffffff;background:${state.brandColor};">
            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
              <div style="width:10px;height:10px;border-radius:999px;background:rgba(255,255,255,0.85);"></div>
              <div id="maximumai-chat-title" style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(state.botName)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <a id="maximumai-chat-support" href="#" target="_blank" style="display:none;border:1px solid rgba(255,255,255,0.35);border-radius:6px;padding:4px 10px;color:#ffffff;font-size:12px;text-decoration:none;background:rgba(255,255,255,0.12);white-space:nowrap;">✉ Support</a>
              <button id="maximumai-chat-close" type="button" style="border:0;background:transparent;color:#ffffff;font-size:18px;cursor:pointer;line-height:1;padding:4px 6px;">✕</button>
            </div>
          </div>
          <div id="maximumai-chat-messages" style="flex:1;overflow:auto;padding:16px;background:#ffffff;"></div>
          <form id="maximumai-chat-form" style="display:flex;align-items:center;gap:10px;padding:14px 16px 8px;border-top:1px solid rgba(15,23,42,0.08);background:#ffffff;">
            <input id="maximumai-chat-input" type="text" maxlength="500" placeholder="Type a message..." style="flex:1;border:1px solid rgba(15,23,42,0.12);border-radius:999px;padding:12px 14px;font-size:14px;outline:none;">
            <button id="maximumai-chat-send" type="submit" style="width:42px;height:42px;border-radius:999px;border:0;background:${state.brandColor};color:#ffffff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">
              <span id="maximumai-chat-send-label">➜</span>
            </button>
          </form>
          <div id="maximumai-chat-footer" style="padding:0 16px 12px;font-size:11px;color:#94a3b8;text-align:center;background:#ffffff;">
            Powered by <a href="https://chat.maximumaiconsulting.com" target="_blank" rel="noopener" style="color:#64748b;text-decoration:none;">MaximumAI</a> · <a href="https://chat.maximumaiconsulting.com/privacy" target="_blank" rel="noopener" style="color:#64748b;text-decoration:none;">Privacy</a>
          </div>
        </div>
        <button id="maximumai-chat-fab" type="button" aria-label="Open chat" style="position:fixed;right:24px;bottom:24px;z-index:2147483001;width:58px;height:58px;border-radius:999px;border:0;background:${state.brandColor};color:#ffffff;box-shadow:0 20px 60px rgba(15,23,42,0.28);cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center;">💬</button>
      </div>
    `;

    document.body.appendChild(root);

    els.panel = root.querySelector('#maximumai-chat-panel');
    els.fab = root.querySelector('#maximumai-chat-fab');
    els.header = root.querySelector('#maximumai-chat-header');
    els.headerTitle = root.querySelector('#maximumai-chat-title');
    els.supportLink = root.querySelector('#maximumai-chat-support');
    els.close = root.querySelector('#maximumai-chat-close');
    els.messages = root.querySelector('#maximumai-chat-messages');
    els.form = root.querySelector('#maximumai-chat-form');
    els.input = root.querySelector('#maximumai-chat-input');
    els.send = root.querySelector('#maximumai-chat-send');
    els.sendLabel = root.querySelector('#maximumai-chat-send-label');
    els.footer = root.querySelector('#maximumai-chat-footer');


    els.fab.addEventListener('click', function () {
      state.open = !state.open;
      syncOpenState();
      if (state.open && els.input) els.input.focus();
    });

    els.close.addEventListener('click', function () {
      state.open = false;
      syncOpenState();
    });

    els.form.addEventListener('submit', function (event) {
      event.preventDefault();
      sendMessage();
    });

    syncOpenState();

    loadConfig().catch(function (error) {
      console.error('[MaximumAI widget]', error);
      state.loading = false;
      state.messages = [{ id: 'error', role: 'bot', content: 'Unable to load chat right now.' }];
      renderMessages();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
