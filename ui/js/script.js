document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // Fetch and Render Portfolio Data
    // ==========================================================================
    // cv_data.json is generated from content/ by `npm run sync` and served next
    // to index.html (symlink locally, copied in CI) — see js/runtime.js.
    window.Portfolio.loadPortfolioData()
        .then(data => {
            renderPortfolio(data);
            initializeInteractiveElements(data);
        })
        .catch(err => {
            console.error('Error fetching CV data:', err);
            handleCORSError();
        });

    function renderPortfolio(data) {
        const info = data.personal_info;

        // 1. Populate Hero
        document.getElementById('hero-name-title').innerHTML = `Hi, I'm <span class="highlight name-span">${info.name}</span>`;
        // Role title is replaced by typing effect
        document.getElementById('hero-summary-text').textContent = data.summary;
        
        // Profile Card
        const shortName = info.name.split(' ').slice(-2).join(' ');
        document.getElementById('card-name').textContent = shortName;
        document.getElementById('card-location').textContent = info.location;
        document.getElementById('card-socials').innerHTML = `
            <a href="mailto:${info.email}" title="Email"><i class="fa-solid fa-envelope"></i></a>
            <a href="${info.linkedin_url}" target="_blank" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
            <a href="${info.github_url}" target="_blank" title="GitHub"><i class="fa-brands fa-github"></i></a>
            <a href="tel:${info.phone}" title="Phone"><i class="fa-solid fa-phone"></i></a>
        `;


        // 3. Populate Work Experience Timeline
        const timelineHtml = `
            <div class="timeline-progress-line"></div>
        ` + data.work_experience.map(job => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-date">${job.dates}</div>
                <div class="timeline-content card">
                    <div class="job-header">
                        <h3>${job.role}</h3>
                        <h4>${job.company}</h4>
                    </div>
                    <ul class="job-bullets">
                        ${job.bullets.map(b => `<li>${b}</li>`).join('')}
                    </ul>
                    ${job.tech ? `
                        <div class="job-tech">
                            ${job.tech.map(t => `<span class="tech-badge">${t}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        document.getElementById('timeline-container').innerHTML = timelineHtml;

        // 4. Populate Projects Grid
        const projectsHtml = data.projects.map(p => `
            <div class="project-card card">
                <div class="project-header">
                    <div class="project-icon"><i class="${p.icon || 'fa-solid fa-code'}"></i></div>
                    <span class="project-date">${p.dates}</span>
                </div>
                <h3>${p.name}</h3>
                <p class="project-role">${p.role}</p>
                <p class="project-desc">${p.description}</p>
                <div class="project-tech">
                    ${p.tech.map(t => `<span>${t}</span>`).join('')}
                </div>
            </div>
        `).join('');
        document.getElementById('projects-container').innerHTML = projectsHtml;

        // 5. Populate Skills List
        function getSkillIcon(itemText) {
            const t = itemText.toLowerCase().trim();
            if (t.includes('javascript') || t === 'js') return '<i class="devicon-javascript-plain colored skill-item-icon"></i>';
            if (t.includes('typescript') || t === 'ts') return '<i class="devicon-typescript-plain colored skill-item-icon"></i>';
            if (t.includes('dart')) return '<i class="devicon-dart-plain colored skill-item-icon"></i>';
            if (t.includes('python')) return '<i class="devicon-python-plain colored skill-item-icon"></i>';
            if (t.includes('react native')) return '<i class="devicon-react-original colored skill-item-icon"></i>';
            if (t.includes('react')) return '<i class="devicon-react-original colored skill-item-icon"></i>';
            if (t.includes('redux')) return '<i class="devicon-redux-original colored skill-item-icon"></i>';
            if (t.includes('zustand')) return '<i class="fa-solid fa-cubes skill-item-icon" style="color: #ffb703;"></i>';
            if (t.includes('rest')) return '<i class="fa-solid fa-network-wired skill-item-icon" style="color: #38bdf8;"></i>';
            if (t.includes('fastlane')) return '<i class="fa-solid fa-rocket skill-item-icon" style="color: #00f200;"></i>';
            if (t.includes('firebase')) return '<i class="devicon-firebase-plain colored skill-item-icon"></i>';
            if (t.includes('git')) return '<i class="devicon-git-plain colored skill-item-icon"></i>';
            if (t.includes('flutter')) return '<i class="devicon-flutter-plain colored skill-item-icon"></i>';
            if (t.includes('next.js') || t.includes('nextjs')) return '<i class="devicon-nextjs-plain skill-item-icon"></i>';
            if (t.includes('mongodb') || t.includes('mongoose')) return '<i class="devicon-mongodb-plain colored skill-item-icon"></i>';
            if (t.includes('graphql')) return '<i class="devicon-graphql-plain colored skill-item-icon"></i>';
            if (t.includes('socket.io') || t.includes('socket')) return '<i class="devicon-socketio-original skill-item-icon"></i>';
            if (t.includes('docker')) return '<i class="devicon-docker-plain colored skill-item-icon"></i>';
            if (t.includes('english')) return '<i class="fa-solid fa-globe skill-item-icon" style="color: #38bdf8;"></i>';
            if (t.includes('vietnamese')) return '<i class="fa-solid fa-flag skill-item-icon" style="color: #ef4444;"></i>';
            return '<i class="fa-solid fa-angle-right skill-item-icon" style="color: var(--primary-color);"></i>';
        }

        const skillsHtml = data.skills.map(cat => `
            <div class="skill-category card">
                <h3><i class="${cat.icon}"></i> ${cat.category}</h3>
                <ul class="skills-list">
                    ${cat.items.split(',').map(item => {
                        const trimmed = item.trim();
                        return `<li>${getSkillIcon(trimmed)} <span>${trimmed}</span></li>`;
                    }).join('')}
                </ul>
            </div>
        `).join('');
        document.getElementById('skills-container').innerHTML = skillsHtml;

        // 6. Populate Education Cards
        const eduHtml = data.education.map(edu => `
            <div class="education-card card">
                <div class="edu-header">
                    <span class="edu-date">${edu.dates}</span>
                    <div class="edu-icon"><i class="${edu.icon}"></i></div>
                </div>
                <h3>${edu.degree}</h3>
                <h4>${edu.school}</h4>
                <p class="gpa">GPA: <strong>${edu.gpa}</strong></p>
                <p class="edu-desc">${edu.desc}</p>
            </div>
        `).join('');
        document.getElementById('education-container').innerHTML = eduHtml;

        // 7. Populate Contact Panel Info
        document.getElementById('contact-details-container').innerHTML = `
            <div class="contact-item">
                <div class="contact-icon-box"><i class="fa-solid fa-phone"></i></div>
                <div>
                    <h4>Phone</h4>
                    <p><a href="tel:${info.phone}">${info.phone}</a></p>
                </div>
            </div>
            <div class="contact-item">
                <div class="contact-icon-box"><i class="fa-solid fa-envelope"></i></div>
                <div>
                    <h4>Email</h4>
                    <p><a href="mailto:${info.email}">${info.email}</a></p>
                </div>
            </div>
            <div class="contact-item">
                <div class="contact-icon-box"><i class="fa-brands fa-linkedin"></i></div>
                <div>
                    <h4>LinkedIn</h4>
                    <p><a href="${info.linkedin_url}" target="_blank">linkedin.com/in/minhng178</a></p>
                </div>
            </div>
            <div class="contact-item">
                <div class="contact-icon-box"><i class="fa-brands fa-github"></i></div>
                <div>
                    <h4>GitHub</h4>
                    <p><a href="${info.github_url}" target="_blank">github.com/minhng-178</a></p>
                </div>
            </div>
            <div class="contact-item">
                <div class="contact-icon-box"><i class="fa-solid fa-location-dot"></i></div>
                <div>
                    <h4>Location</h4>
                    <p>${info.location}</p>
                </div>
            </div>
        `;

        // 8. Footer Text (Dynamic current year)
        const currentYear = new Date().getFullYear();
        document.getElementById('footer-text').innerHTML = `&copy; ${currentYear} ${info.name}. All rights reserved.`;
    }

    function handleCORSError() {
        if (window.location.protocol === 'file:') {
            document.body.innerHTML = `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 3rem; text-align: center; max-width: 650px; margin: 8rem auto; border: 1px solid #e5e7eb; background: #ffffff; border-radius: 20px; color: #1f2937; box-shadow: 0 10px 30px rgba(0,0,0,0.05); line-height: 1.6;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1.5rem;">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h2 style="margin-bottom: 1rem; font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: #111827;">Local File Access Restricted</h2>
                    <p style="margin-bottom: 1.5rem; color: #4b5563;">To dynamically load content from the shared <strong>cv_data.json</strong> database, browsers require a local server environment (CORS restrictions prevent AJAX reads from direct <code>file://</code> paths).</p>
                    <p style="font-weight: 700; margin-bottom: 0.8rem; font-family: 'Outfit', sans-serif; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; color: #4f46e5;">Please run a local server in the portfolio folder:</p>
                    <code style="background: #f3f4f6; padding: 0.75rem 1.25rem; border-radius: 8px; display: inline-block; font-family: monospace; font-size: 0.95rem; border: 1px solid #e5e7eb; margin-bottom: 1.5rem; color: #1f2937;">python3 -m http.server 8000</code>
                    <p style="margin-top: 1rem; color: #4b5563;">Then open the link in your browser: <br><a href="http://localhost:8000" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">http://localhost:8000</a></p>
                </div>
            `;
        } else {
            document.body.innerHTML = `
                <div style="font-family: sans-serif; padding: 3rem; text-align: center; color: red;">
                    <h2>Error: Failed to load portfolio details from cv_data.json.</h2>
                </div>
            `;
        }
    }

    // ==========================================================================
    // Interactive Behaviors (Theme, Navs, Forms, Scroll Animations)
    // ==========================================================================
    function initializeInteractiveElements(data) {
        // Theme Switcher (Dark / Light Mode)
        const themeToggleBtn = document.getElementById('theme-toggle');
        const themeIcon = themeToggleBtn.querySelector('i');
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark') {
            enableDarkMode();
        } else {
            enableLightMode();
        }
        
        themeToggleBtn.addEventListener('click', () => {
            if (document.body.classList.contains('dark-mode')) {
                enableLightMode();
            } else {
                enableDarkMode();
            }
        });
        
        function enableLightMode() {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'light');
        }
        
        function enableDarkMode() {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'dark');
        }

        // Mobile Navigation Menu Toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileNavOverlay = document.getElementById('mobile-nav');
        const mobileNavLinks = mobileNavOverlay.querySelectorAll('a');
        
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('open');
            mobileNavOverlay.classList.toggle('open');
            document.body.classList.toggle('no-scroll');
        });
        
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('open');
                mobileNavOverlay.classList.remove('open');
                document.body.classList.remove('no-scroll');
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                mobileMenuBtn.classList.remove('open');
                mobileNavOverlay.classList.remove('open');
                document.body.classList.remove('no-scroll');
            }
        });

        // Scroll-Spy (Active Nav Links on Scroll)
        const sections = document.querySelectorAll('section, header');
        const navLinks = document.querySelectorAll('.nav-links a');
        
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -60% 0px',
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const activeId = entry.target.getAttribute('id');
                    
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${activeId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);
        
        sections.forEach(section => {
            observer.observe(section);
        });

        // Sticky Navbar shadow on scroll
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.boxShadow = 'var(--card-shadow)';
                navbar.style.height = '70px';
            } else {
                navbar.style.boxShadow = 'none';
                navbar.style.height = 'var(--nav-height)';
            }
        });

        // Form Submission
        // Delivery chain: backend API (when /api/health reports contact) →
        // Web3Forms (when a public key is set in portfolio.yml) → mailto: link.
        const contactForm = document.getElementById('contact-form');
        const formResponse = document.getElementById('form-response');

        function showFormResponse(kind, title, text) {
            const strong = document.createElement('strong');
            strong.textContent = `${title} `;
            formResponse.className = `form-response-msg ${kind}`;
            formResponse.replaceChildren(strong, document.createTextNode(text));
            formResponse.style.display = 'block';
        }

        async function sendViaApi(name, email, message) {
            const res = await fetch(`${window.Portfolio.apiBase(data)}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.status !== 'success') {
                throw new Error(body.detail || 'Failed to send message. Please try again.');
            }
            return body.message;
        }

        async function sendViaWeb3Forms(name, email, message) {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: data.site.web3forms_access_key,
                    name,
                    email,
                    message,
                    subject: `Portfolio Contact Message from ${name}`
                })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.success) {
                throw new Error(body.message || 'Failed to send message via Web3Forms.');
            }
            return `Thank you, ${name}! Your message has been sent successfully.`;
        }

        function openMailDraft(name, email, message) {
            const to = data.personal_info.email;
            const subject = encodeURIComponent(`Portfolio contact from ${name}`);
            const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
            window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
            return `Your email app should open with the message ready to send. If it doesn't, write to ${to}.`;
        }

        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;

                const name = document.getElementById('name').value.trim();
                const email = document.getElementById('email_addr').value.trim();
                const message = document.getElementById('message').value.trim();

                if (!name || !email || !message) {
                    showFormResponse('error', 'Error:', 'Please fill in all required fields.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
                formResponse.style.display = 'none';

                try {
                    const health = await window.Portfolio.apiHealth(data);
                    let responseMsg;
                    if (health.contact) {
                        responseMsg = await sendViaApi(name, email, message);
                    } else if (data.site && data.site.web3forms_access_key) {
                        responseMsg = await sendViaWeb3Forms(name, email, message);
                    } else {
                        responseMsg = openMailDraft(name, email, message);
                    }
                    showFormResponse('success', 'Success!', responseMsg);
                    contactForm.reset();
                } catch (err) {
                    showFormResponse('error', 'Error:', err.message || 'Something went wrong. Please try again.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            });
        }

        // ==========================================================================
        // Typewriter Effect (Hero Section)
        // ==========================================================================
        function startTypewriter() {
            const words = ["React Native Mobile Apps.", "Cross-Platform Mobile Apps.", "AI-Assisted Solutions."];
            let wordIndex = 0;
            let charIndex = 0;
            let isDeleting = false;
            const typedTextSpan = document.getElementById("typed-text");
            
            function type() {
                if (!typedTextSpan) return;
                const currentWord = words[wordIndex];
                
                if (isDeleting) {
                    typedTextSpan.textContent = currentWord.substring(0, charIndex - 1);
                    charIndex--;
                } else {
                    typedTextSpan.textContent = currentWord.substring(0, charIndex + 1);
                    charIndex++;
                }
                
                let typeSpeed = isDeleting ? 30 : 60;
                
                if (!isDeleting && charIndex === currentWord.length) {
                    typeSpeed = 2000; // Pause at end of word
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    typeSpeed = 400; // Pause before typing next word
                }
                
                setTimeout(type, typeSpeed);
            }
            
            type();
        }
        startTypewriter();

        // ==========================================================================
        // Scroll-Linked Timeline Progress Line
        // ==========================================================================
        function initializeTimelineScroll() {
            const timeline = document.getElementById('timeline-container');
            if (!timeline) return;
            
            function updateProgress() {
                const rect = timeline.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                // Timeline progress activates when top reaches 60% down the screen
                const triggerPoint = viewportHeight * 0.6;
                const totalHeight = rect.height;
                const scrolled = Math.max(0, Math.min(totalHeight, triggerPoint - rect.top));
                const progress = (scrolled / totalHeight) * 100;
                
                timeline.style.setProperty('--scroll-progress', `${progress}%`);
            }
            
            window.addEventListener('scroll', updateProgress);
            window.addEventListener('resize', updateProgress);
            updateProgress();
        }
        initializeTimelineScroll();

        // ==========================================================================
        // Timeline Active Items (Observer to animate dots when visible)
        // ==========================================================================
        const timelineItems = document.querySelectorAll('.timeline-item');
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -20% 0px',
            threshold: 0.1
        });
        
        timelineItems.forEach(item => timelineObserver.observe(item));

        // ==========================================================================
        // Dynamic Slide-in Animations on Scroll
        // ==========================================================================
        const scrollAnimateElements = document.querySelectorAll('.card, .stat-card, .timeline-item');
        const scrollObserverOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.15
        };
        
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, scrollObserverOptions);
        
        scrollAnimateElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(25px)';
            el.style.transition = 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
            scrollObserver.observe(el);
        });

        // ==========================================================================
        // Back to Top Button Behavior
        // ==========================================================================
        const backToTopBtn = document.getElementById('back-to-top');
        if (backToTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 400) {
                    backToTopBtn.classList.add('show');
                } else {
                    backToTopBtn.classList.remove('show');
                }
            });
            
            backToTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }
});
