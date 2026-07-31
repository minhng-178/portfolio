document.addEventListener('DOMContentLoaded', () => {
    // Local dev talks to the backend on localhost; any other hostname (i.e.
    // the live site) talks to the deployed backend. Update PRODUCTION_API_BASE
    // once you know your VPS's sslip.io hostname (or real domain).
    const PRODUCTION_API_BASE = 'https://203.0.113.10.sslip.io';
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const CHAT_API_BASE = isLocalDev ? 'http://localhost:8001' : PRODUCTION_API_BASE;

    // ─── Smart Suggestion Pool ────────────────────────────────────────────────
    // Each question is tagged with topics so we can pick contextually relevant
    // follow-ups after the bot replies.
    const SUGGESTION_POOL = [
        // Skills & Tech
        { text: "What are your core technical skills?",       topics: ['skills', 'tech'] },
        { text: "What's your React Native experience?",       topics: ['skills', 'mobile', 'react'] },
        { text: "Do you know TypeScript?",                    topics: ['skills', 'tech'] },
        { text: "What backend technologies do you use?",      topics: ['skills', 'tech', 'backend'] },
        { text: "Are you familiar with cloud services?",      topics: ['skills', 'tech', 'cloud'] },
        { text: "What databases have you worked with?",       topics: ['skills', 'tech', 'backend'] },
        { text: "Do you have UI/UX design experience?",       topics: ['skills', 'design'] },

        // Projects
        { text: "Tell me about your most impressive project.", topics: ['projects'] },
        { text: "What is BonVoye?",                           topics: ['projects', 'mobile'] },
        { text: "What is GPBMT CRM?",                         topics: ['projects', 'backend'] },
        { text: "Tell me about HD Booking App.",              topics: ['projects', 'mobile'] },
        { text: "What is Responsum?",                         topics: ['projects', 'backend'] },

        // Experience & Career
        { text: "What is your work experience?",              topics: ['experience', 'career'] },
        { text: "How many years of experience do you have?",  topics: ['experience', 'career'] },
        { text: "Have you worked in a team or solo?",         topics: ['experience', 'career'] },
        { text: "Have you worked with international clients?", topics: ['experience', 'career'] },
        { text: "What type of roles are you looking for?",    topics: ['career', 'availability'] },

        // Salary & Availability
        { text: "What's your expected salary?",               topics: ['salary', 'availability'] },
        { text: "Are you open to remote work?",               topics: ['availability', 'career'] },
        { text: "When can you start?",                        topics: ['availability'] },
        { text: "Are you available full-time?",               topics: ['availability'] },

        // Contact
        { text: "How can I contact you?",                     topics: ['contact'] },
        { text: "Do you have a LinkedIn profile?",            topics: ['contact'] },
        { text: "Can I see your GitHub?",                     topics: ['contact', 'projects'] },
    ];

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
    const widget = document.querySelector('.chat-widget');
    if (!widget) return;

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
    let isOnline   = null;

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

    // ─── Health check ─────────────────────────────────────────────────────────
    async function checkHealth() {
        try {
            const res = await fetch(`${CHAT_API_BASE}/api/health`);
            isOnline = res.ok;
        } catch (err) {
            isOnline = false;
        }
        onlineDot.classList.toggle('online',  isOnline === true);
        onlineDot.classList.toggle('offline', isOnline === false);
        statusEl.textContent = isOnline ? 'Online' : 'Offline';
    }

    // ─── Panel open / close ───────────────────────────────────────────────────
    function openPanel() {
        panel.classList.add('open');
        toggleBtn.classList.add('active');
        if (!hasGreeted) {
            hasGreeted = true;
            typewriterBubble(
                "Hi there! I'm Minh AI — Minh Nguyễn's virtual assistant. What would you like to know about his skills, experience, or projects?",
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
            typewriterBubble("Sorry, Minh AI is temporarily offline. Feel free to reach out directly via the contact form below!");
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

    checkHealth();
});
