// Shared runtime for the page scripts, loaded before script.js and chat.js:
// fetches cv_data.json once and works out which backend features are live.
(function () {
    // Local dev (./serve.sh) always talks to the local API (`npm run dev:api`);
    // the deployed site uses site.api_base from content/portfolio.yml.
    const LOCAL_API_BASE = 'http://localhost:8001';
    const HEALTH_TIMEOUT_MS = 4000;
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    let dataPromise = null;
    let healthPromise = null;

    function loadPortfolioData() {
        if (!dataPromise) {
            dataPromise = fetch('cv_data.json').then(res => {
                if (!res.ok) throw new Error(`cv_data.json: HTTP ${res.status}`);
                return res.json();
            });
        }
        return dataPromise;
    }

    function apiBase(data) {
        return isLocalDev ? LOCAL_API_BASE : (data.site && data.site.api_base) || '';
    }

    /** Resolves to {chat, contact} booleans; both false when no API is reachable. */
    function apiHealth(data) {
        if (!healthPromise) {
            const base = apiBase(data);
            const offline = { chat: false, contact: false };
            if (!base) {
                healthPromise = Promise.resolve(offline);
            } else {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
                healthPromise = fetch(`${base}/api/health`, { signal: controller.signal })
                    .then(res => (res.ok ? res.json() : offline))
                    .then(body => ({ chat: body.chat === true, contact: body.contact === true }))
                    .catch(() => offline)
                    .finally(() => clearTimeout(timer));
            }
        }
        return healthPromise;
    }

    window.Portfolio = { loadPortfolioData, apiBase, apiHealth };
})();
