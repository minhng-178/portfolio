document.addEventListener('DOMContentLoaded', async () => {
    const widget = document.querySelector('.chat-widget');
    if (!widget) return;

    // The widget stays hidden unless the backend reports an LLM is configured
    // (GET /api/health) — no "Offline" bot on the live site.
    let data;
    try {
        data = await window.Portfolio.loadPortfolioData();
    } catch (err) {
        return; // script.js already shows the load error
    }
    const health = await window.Portfolio.apiHealth(data);
    if (!health.chat) return;
    widget.hidden = false;

    const CHAT_API_BASE = window.Portfolio.apiBase(data);
    const ASSISTANT_NAME = data.assistant.name;
    const CANDIDATE_NAME = data.personal_info.name.split(' ').slice(-1)[0];

    // ─── Smart Suggestion Pool ────────────────────────────────────────────────
    // Each question is tagged with topics so we can pick contextually relevant
    // follow-ups after the bot replies. Built by `npm run sync` from
    // content/portfolio.yml plus one chip per project in cv.md.
    const SUGGESTION_POOL = data.assistant.suggestions;

    // Keywords in bot reply / user message → boost related topics
    const TOPIC_KEYWORDS = {
        skills:       ['skill', 'technology', 'tech', 'stack', 'language', 'framework', 'tool'],
        tech:         ['javascript', 'python', 'react', 'node', 'typescript', 'css', 'html'],
        mobile:       ['mobile', 'ios', 'android', 'react native', 'flutter', 'app'],
        react:        ['react', 'redux', 'context', 'hooks', 'component'],
        backend:      ['backend', 'api', 'server', 'database', 'rest', 'graphql', 'django', 'fastapi'],
        cloud:        ['cloud', 'aws', 'azure', 'gcp', 'oracle', 'docker', 'kubernetes'],
        design:       ['design', 'ui', 'ux', 'figma', 'layout', 'responsive'],
        projects:     ['project', 'built', 'developed', 'created', 'application', 'system'],
        experience:   ['experience', 'year', 'worked', 'position', 'role'],
        career:       ['career', 'job', 'hire', 'looking', 'seeking', 'position'],
        salary:       ['salary', 'compensation', 'pay', 'rate', 'expect'],
        availability: ['available', 'start', 'full-time', 'part-time', 'freelance', 'remote'],
        contact:      ['contact', 'email', 'linkedin', 'github', 'reach'],
    };

    const MAX_SUGGESTIONS = 3;

    // Track questions already surfaced so they don't repeat
    const usedQuestions = new Set();

    /** Detect which topics appear in a piece of text. */
    function detectTopics(text) {
        const lower = text.toLowerCase();
        const found = new Set();
        for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
            if (keywords.some(kw => lower.includes(kw))) found.add(topic);
        }
        return found;
    }

    /**
     * Pick smart follow-up suggestions based on the latest exchange.
     * @param {string} lastUserMsg  - what the user just sent
     * @param {string} lastBotReply - the bot's latest reply
     * @returns {string[]} up to MAX_SUGGESTIONS question texts
     */
    function pickSmartSuggestions(lastUserMsg = '', lastBotReply = '') {
        const activeTopics = detectTopics(`${lastUserMsg} ${lastBotReply}`);

        const scored = SUGGESTION_POOL
            .filter(q => !usedQuestions.has(q.text))
            .map(q => {
                let score = 0;
                // +2 per topic overlap with current context
                q.topics.forEach(t => { if (activeTopics.has(t)) score += 2; });
                // small random jitter to avoid a static order
                score += Math.random();
                return { q, score };
            })
            .sort((a, b) => b.score - a.score);

        const picks = scored.slice(0, MAX_SUGGESTIONS).map(s => s.q.text);
        picks.forEach(p => usedQuestions.add(p));

        // Auto-reset when pool is nearly exhausted so suggestions keep flowing
        const remaining = SUGGESTION_POOL.filter(q => !usedQuestions.has(q.text));
        if (remaining.length < MAX_SUGGESTIONS) usedQuestions.clear();

        return picks;
    }

    // ─── DOM refs ─────────────────────────────────────────────────────────────

    const toggleBtn  = document.getElementById('chat-toggle-btn');
    const closeBtn   = document.getElementById('chat-close-btn');
    const panel      = document.getElementById('chat-panel');
    const messagesEl = document.getElementById('chat-messages');
    const form       = document.getElementById('chat-form');
    const input      = document.getElementById('chat-input');
    const sendBtn    = document.getElementById('chat-send-btn');
    const statusEl   = document.getElementById('chat-status');
    const onlineDot  = document.getElementById('chat-online-dot');

    let history    = [];
    let hasGreeted = false;

    // ─── Bubble helpers ───────────────────────────────────────────────────────
    function appendBubble(role, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-bubble-${role}`;
        bubble.textContent = text;
        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return bubble;
    }

    /**
     * Render a bot bubble with a typewriter effect.
     * @param {string} text         - Full text to type out
     * @param {Function} [onDone]   - Callback fired when typing finishes
     * @returns {HTMLElement}       - The bubble element
     */
    function typewriterBubble(text, onDone) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-bubble-bot';

        // Cursor element that blinks while typing
        const cursor = document.createElement('span');
        cursor.className = 'chat-cursor';
        cursor.textContent = '\u258C'; // block cursor char
        bubble.appendChild(cursor);

        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        let i = 0;
        // Speed: ~18ms per char feels natural (like GPT)
        const BASE_DELAY = 18;

        function typeNext() {
            if (i < text.length) {
                // Insert char before the cursor
                bubble.insertBefore(document.createTextNode(text[i]), cursor);
                i++;
                messagesEl.scrollTop = messagesEl.scrollHeight;
                // Slightly variable speed for organic feel
                const delay = BASE_DELAY + (Math.random() * 10 - 5);
                setTimeout(typeNext, delay);
            } else {
                // Done typing — remove blinking cursor
                cursor.remove();
                if (typeof onDone === 'function') onDone();
            }
        }

        // Small initial pause (like the AI is "thinking" then starts)
        setTimeout(typeNext, 80);
        return bubble;
    }

    function showTypingIndicator() {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-bubble-bot chat-typing';
        bubble.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(bubble);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return bubble;
    }

    function removeSuggestions() {
        const existing = document.getElementById('chat-suggestions');
        if (existing) existing.remove();
    }

    /** Render suggestion chips for the given question texts. */
    function showSuggestions(questions) {
        removeSuggestions();
        if (!questions || questions.length === 0) return;

        const container = document.createElement('div');
        container.className = 'chat-suggestions';
        container.id = 'chat-suggestions';

        questions.forEach((question) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chat-suggestion-chip';
            chip.textContent = question;
            chip.addEventListener('click', () => {
                removeSuggestions();
                sendMessage(question);
            });
            container.appendChild(chip);
        });

        messagesEl.appendChild(container);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ─── Status ───────────────────────────────────────────────────────────────
    function showOnlineStatus() {
        onlineDot.classList.add('online');
        statusEl.textContent = 'Online';
    }

    // ─── Panel open / close ───────────────────────────────────────────────────
    function openPanel() {
        panel.classList.add('open');
        toggleBtn.classList.add('active');
        if (!hasGreeted) {
            hasGreeted = true;
            typewriterBubble(
                `Hi there! I'm ${ASSISTANT_NAME}, ${CANDIDATE_NAME}'s virtual assistant. What would you like to know about his skills, experience, or projects?`,
                () => showSuggestions(pickSmartSuggestions('', ''))
            );
        }
        input.focus();
    }

    function closePanel() {
        panel.classList.remove('open');
        toggleBtn.classList.remove('active');
    }

    // ─── Send message ─────────────────────────────────────────────────────────
    async function sendMessage(message) {
        message = message.trim();
        if (!message) return;

        removeSuggestions();
        appendBubble('user', message);
        input.disabled = true;
        sendBtn.disabled = true;

        const typingBubble = showTypingIndicator();

        try {
            const res = await fetch(`${CHAT_API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history }),
            });

            if (!res.ok) throw new Error('Backend returned an error');

            const data = await res.json();
            typingBubble.remove();
            typewriterBubble(data.reply, () => {
                // Show suggestions only after typing finishes
                showSuggestions(pickSmartSuggestions(message, data.reply));
            });

            history.push({ role: 'user',      content: message });
            history.push({ role: 'assistant', content: data.reply });
            if (history.length > 20) history = history.slice(-20);

        } catch (err) {
            typingBubble.remove();
            typewriterBubble(`Sorry, ${ASSISTANT_NAME} is temporarily unavailable. Feel free to reach out directly via the contact form below!`);
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    // ─── Event listeners ──────────────────────────────────────────────────────
    toggleBtn.addEventListener('click', () => {
        if (panel.classList.contains('open')) {
            closePanel();
        } else {
            openPanel();
        }
    });

    closeBtn.addEventListener('click', closePanel);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;
        input.value = '';
        sendMessage(message);
    });

    showOnlineStatus();
});
