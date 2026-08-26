
        // ============================================================
        // 0. Интерактивное 3D-ядро на главной
        // ============================================================
        (function initCoreScene() {
            const container = document.getElementById('cube-container');
            if (!container) return;

            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const lowPowerDevice = (navigator.hardwareConcurrency || 8) <= 4;

            function showFallback() {
                container.classList.add('webgl-fallback');
                container.innerHTML = '<div class="scene-fallback" aria-hidden="true">PT</div>';
            }

            if (!window.THREE) {
                showFallback();
                return;
            }

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
            camera.position.set(0, 0.15, 5.6);

            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({
                    antialias: !lowPowerDevice,
                    alpha: true,
                    powerPreference: 'high-performance'
                });
            } catch (error) {
                showFallback();
                return;
            }

            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 1.75));
            renderer.outputEncoding = THREE.sRGBEncoding;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.12;
            renderer.domElement.setAttribute('aria-hidden', 'true');
            container.appendChild(renderer.domElement);

            const world = new THREE.Group();
            world.rotation.set(0.14, -0.2, -0.04);
            scene.add(world);

            const ambient = new THREE.HemisphereLight(0xcfc7ff, 0x090718, 1.35);
            const violetLight = new THREE.PointLight(0x8f70ff, 2.4, 11);
            const cyanLight = new THREE.PointLight(0x4fdcff, 1.8, 10);
            violetLight.position.set(2.4, 2.1, 3.4);
            cyanLight.position.set(-2.5, -1, 2.2);
            scene.add(ambient, violetLight, cyanLight);

            const coreMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x7254f4,
                emissive: 0x2d147e,
                emissiveIntensity: 0.95,
                metalness: 0.36,
                roughness: 0.2,
                clearcoat: 0.9,
                clearcoatRoughness: 0.18,
                transparent: true,
                opacity: 0.97
            });
            const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.83, lowPowerDevice ? 2 : 3), coreMaterial);
            world.add(core);

            const innerGlow = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.62, 2),
                new THREE.MeshBasicMaterial({
                    color: 0xc0b2ff,
                    transparent: true,
                    opacity: 0.2,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
            );
            world.add(innerGlow);

            const shell = new THREE.Mesh(
                new THREE.IcosahedronGeometry(1.08, 1),
                new THREE.MeshBasicMaterial({
                    color: 0xbaa9ff,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.32,
                    blending: THREE.AdditiveBlending
                })
            );
            world.add(shell);

            const orbitRadii = [1.28, 1.48, 1.68];
            const haloMaterials = [
                new THREE.MeshBasicMaterial({ color: 0x9b82ff, transparent: true, opacity: 0.42 }),
                new THREE.MeshBasicMaterial({ color: 0x58d9ff, transparent: true, opacity: 0.3 }),
                new THREE.MeshBasicMaterial({ color: 0xe1d9ff, transparent: true, opacity: 0.18 })
            ];
            const halos = haloMaterials.map((material, index) => {
                const halo = new THREE.Mesh(
                    new THREE.TorusGeometry(orbitRadii[index], index === 0 ? 0.014 : 0.009, 6, lowPowerDevice ? 64 : 120),
                    material
                );
                halo.rotation.set(
                    [1.1, 0.48, 1.55][index],
                    [0.08, 0.95, -0.62][index],
                    [0.22, -0.35, 0.64][index]
                );
                world.add(halo);
                return halo;
            });

            const pedestal = new THREE.Group();
            pedestal.position.y = -1.55;
            const pedestalDisc = new THREE.Mesh(
                new THREE.CircleGeometry(0.74, 64),
                new THREE.MeshBasicMaterial({ color: 0x4c39a8, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
            );
            pedestalDisc.rotation.x = -Math.PI / 2;
            const pedestalRing = new THREE.Mesh(
                new THREE.TorusGeometry(0.83, 0.015, 6, 96),
                new THREE.MeshBasicMaterial({ color: 0x69ddff, transparent: true, opacity: 0.42 })
            );
            pedestalRing.rotation.x = Math.PI / 2;
            pedestal.add(pedestalDisc, pedestalRing);
            world.add(pedestal);

            function createLabelTexture(label, color) {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 80;
                const context = canvas.getContext('2d');
                context.fillStyle = 'rgba(9, 9, 25, 0.86)';
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.beginPath();
                context.roundRect(3, 3, 250, 74, 18);
                context.fill();
                context.stroke();
                context.fillStyle = '#f6f3ff';
                context.font = '700 24px Inter, Arial, sans-serif';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(label, 128, 41);
                const texture = new THREE.CanvasTexture(canvas);
                texture.encoding = THREE.sRGBEncoding;
                return texture;
            }

            const orbitSpecs = [
                { label: 'CFG', color: '#a88cff', radius: orbitRadii[0], speed: 0.42, phase: 0 },
                { label: 'LUA', color: '#58d9ff', radius: orbitRadii[1], speed: -0.34, phase: 1.65 },
                { label: 'LIVE', color: '#53f0a6', radius: orbitRadii[2], speed: 0.31, phase: 3.25 }
            ];
            const orbitNodes = orbitSpecs.map((spec, index) => {
                const group = new THREE.Group();
                const node = new THREE.Mesh(
                    new THREE.SphereGeometry(0.075, 18, 18),
                    new THREE.MeshBasicMaterial({ color: spec.color })
                );
                const aura = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 14, 14),
                    new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending })
                );
                const label = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: createLabelTexture(spec.label, spec.color),
                    transparent: true,
                    depthWrite: false
                }));
                label.position.y = 0.28;
                label.scale.set(0.67, 0.21, 1);
                group.add(aura, node, label);
                halos[index].add(group);
                return { group, spec };
            });

            const pointCount = lowPowerDevice ? 70 : 150;
            const pointPositions = new Float32Array(pointCount * 3);
            for (let i = 0; i < pointCount; i++) {
                const radius = 2.15 + Math.random() * 1.55;
                const angle = Math.random() * Math.PI * 2;
                const elevation = (Math.random() - 0.5) * 2.4;
                pointPositions[i * 3] = Math.cos(angle) * radius;
                pointPositions[i * 3 + 1] = elevation;
                pointPositions[i * 3 + 2] = Math.sin(angle) * radius;
            }
            const pointsGeometry = new THREE.BufferGeometry();
            pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
            const dataPoints = new THREE.Points(
                pointsGeometry,
                new THREE.PointsMaterial({
                    color: 0x9f8bff,
                    size: lowPowerDevice ? 0.025 : 0.032,
                    transparent: true,
                    opacity: 0.55,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
            );
            world.add(dataPoints);

            let isDragging = false;
            let previousPointer = { x: 0, y: 0 };
            let pointerParallax = { x: 0, y: 0 };
            let targetRotation = { x: 0.14, y: -0.2 };
            let currentRotation = { x: 0.14, y: -0.2 };
            let autoRotate = true;
            let autoRotateTimer = null;
            let animationFrame = null;
            let lastFrameTime = performance.now();
            let sceneIsVisible = true;

            function updatePointerParallax(event) {
                const rect = container.getBoundingClientRect();
                pointerParallax.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
                pointerParallax.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
            }

            container.addEventListener('pointerdown', (event) => {
                isDragging = true;
                previousPointer.x = event.clientX;
                previousPointer.y = event.clientY;
                autoRotate = false;
                clearTimeout(autoRotateTimer);
                container.setPointerCapture?.(event.pointerId);
                updatePointerParallax(event);
            });
            container.addEventListener('pointermove', (event) => {
                updatePointerParallax(event);
                if (!isDragging) return;
                const dx = event.clientX - previousPointer.x;
                const dy = event.clientY - previousPointer.y;
                targetRotation.y += dx * 0.01;
                targetRotation.x += dy * 0.01;
                targetRotation.x = Math.max(-0.85, Math.min(0.85, targetRotation.x));
                previousPointer.x = event.clientX;
                previousPointer.y = event.clientY;
                if (reducedMotion) renderScene(performance.now(), false);
            });

            function releasePointer(event) {
                if (!isDragging) return;
                isDragging = false;
                container.releasePointerCapture?.(event.pointerId);
                autoRotateTimer = setTimeout(() => { autoRotate = true; }, 2400);
            }
            container.addEventListener('pointerup', releasePointer);
            container.addEventListener('pointercancel', releasePointer);
            container.addEventListener('pointerleave', () => {
                if (!isDragging) pointerParallax = { x: 0, y: 0 };
            });

            container.addEventListener('keydown', (event) => {
                const step = 0.14;
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
                event.preventDefault();
                if (event.key === 'ArrowLeft') targetRotation.y -= step;
                if (event.key === 'ArrowRight') targetRotation.y += step;
                if (event.key === 'ArrowUp') targetRotation.x -= step;
                if (event.key === 'ArrowDown') targetRotation.x += step;
                if (event.key === ' ') autoRotate = !autoRotate;
                targetRotation.x = Math.max(-0.85, Math.min(0.85, targetRotation.x));
                if (reducedMotion) {
                    currentRotation = { ...targetRotation };
                    renderScene(performance.now(), false);
                }
            });

            function renderScene(time, animateObjects = true) {
                const seconds = time * 0.001;
                const delta = Math.min((time - lastFrameTime) / 1000, 0.05);
                lastFrameTime = time;

                if (animateObjects && autoRotate) targetRotation.y += delta * 0.26;
                const easing = animateObjects ? 0.065 : 1;
                currentRotation.x += (targetRotation.x - currentRotation.x) * easing;
                currentRotation.y += (targetRotation.y - currentRotation.y) * easing;
                world.rotation.x = currentRotation.x;
                world.rotation.y = currentRotation.y;

                if (animateObjects) {
                    core.rotation.x = seconds * 0.18;
                    core.rotation.y = -seconds * 0.24;
                    shell.rotation.x = -seconds * 0.11;
                    shell.rotation.z = seconds * 0.08;
                    innerGlow.scale.setScalar(1 + Math.sin(seconds * 2.2) * 0.045);
                    halos[0].rotation.z += delta * 0.1;
                    halos[1].rotation.y -= delta * 0.12;
                    halos[2].rotation.x += delta * 0.08;
                    dataPoints.rotation.y = -seconds * 0.025;
                    pedestalRing.rotation.z = seconds * 0.16;
                }

                orbitNodes.forEach(({ group, spec }) => {
                    const angle = spec.phase + (animateObjects ? seconds * spec.speed : 0);
                    group.position.set(
                        Math.cos(angle) * spec.radius,
                        Math.sin(angle) * spec.radius,
                        0
                    );
                });

                camera.position.x += (pointerParallax.x * 0.22 - camera.position.x) * 0.04;
                camera.position.y += (-pointerParallax.y * 0.16 + 0.15 - camera.position.y) * 0.04;
                camera.lookAt(0, 0, 0);
                violetLight.position.x = 2.4 + pointerParallax.x * 0.8;
                cyanLight.position.y = -1 - pointerParallax.y * 0.55;
                renderer.render(scene, camera);
            }

            function animate(time) {
                animationFrame = null;
                if (!sceneIsVisible || document.hidden || reducedMotion) return;
                renderScene(time, true);
                animationFrame = requestAnimationFrame(animate);
            }

            function startAnimation() {
                if (!animationFrame && sceneIsVisible && !document.hidden && !reducedMotion) {
                    lastFrameTime = performance.now();
                    animationFrame = requestAnimationFrame(animate);
                }
            }

            function stopAnimation() {
                if (animationFrame) cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }

            function resizeScene() {
                const rect = container.getBoundingClientRect();
                const w = Math.max(1, Math.round(rect.width));
                const h = Math.max(1, Math.round(rect.height));
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h, false);
                renderScene(performance.now(), !reducedMotion);
            }

            const resizeObserver = new ResizeObserver(resizeScene);
            resizeObserver.observe(container);

            if ('IntersectionObserver' in window) {
                const visibilityObserver = new IntersectionObserver((entries) => {
                    sceneIsVisible = entries[0].isIntersecting;
                    if (sceneIsVisible) startAnimation();
                    else stopAnimation();
                }, { threshold: 0.05 });
                visibilityObserver.observe(container);
            }

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) stopAnimation();
                else startAnimation();
            });

            container.dataset.sceneReady = 'true';
            resizeScene();
            startAnimation();
        })();

        // ============================================================
        // 1. ГЕНЕРАЦИЯ ПАРТИКЛОВ (CSS)
        // ============================================================
        (function createParticles() {
            const container = document.getElementById('particles');
            for (let i = 0; i < 80; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                const size = Math.random() * 4 + 2;
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDuration = (Math.random() * 15 + 10) + 's';
                p.style.animationDelay = (Math.random() * 10) + 's';
                p.style.opacity = Math.random() * 0.4 + 0.2;
                container.appendChild(p);
            }
        })();

        // ============================================================
        // 2. ХРАНИЛИЩЕ
        // ============================================================
        const STORAGE_USERS = 'pastateam_users';
        const STORAGE_FILES = 'pastateam_files';
        const STORAGE_SESSION = 'pastateam_session';
        const STORAGE_CHAT = 'pastateam_chat';
        const STORAGE_TICKETS = 'pastateam_tickets';
        const STORAGE_PRIVATE_CHATS = 'pastateam_private_chats';
        const STORAGE_BLOCKED = 'pastateam_blocked';

        // Инициализация с аккаунтом maesto
        if (!localStorage.getItem(STORAGE_USERS)) {
            localStorage.setItem(STORAGE_USERS, JSON.stringify([
                { username: 'admin', password: '123', email: 'admin@pt.cc', coins: 9999, subscription: '2027-12-31',
                    bio: 'Администратор', roles: ['admin'], avatar: '', registered: new Date().toISOString(),
                    lastLogin: null },
                { username: 'maesto', password: 'maesto123', email: 'maesto@pt.cc', coins: 9999,
                    subscription: '2027-12-31', bio: 'Разработчик и кодер', roles: ['developer', 'coder'], avatar: '',
                    registered: new Date().toISOString(), lastLogin: null }
            ]));
        }
        if (!localStorage.getItem(STORAGE_FILES)) {
            localStorage.setItem(STORAGE_FILES, JSON.stringify([
                { id: 1, name: 'Aimbot Pro.cfg', type: 'cfg', content: '// Aimbot config', author: 'admin',
                    uploaded: new Date().toISOString() },
                { id: 2, name: 'Wallhack Lite.lua', type: 'lua', content: '-- Wallhack script', author: 'admin',
                    uploaded: new Date().toISOString() }
            ]));
        }
        if (!localStorage.getItem(STORAGE_CHAT)) {
            localStorage.setItem(STORAGE_CHAT, JSON.stringify([
                { user: 'System', text: 'Добро пожаловать в чат!', time: Date.now() }
            ]));
        }
        if (!localStorage.getItem(STORAGE_TICKETS)) {
            localStorage.setItem(STORAGE_TICKETS, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_PRIVATE_CHATS)) {
            localStorage.setItem(STORAGE_PRIVATE_CHATS, JSON.stringify({}));
        }
        if (!localStorage.getItem(STORAGE_BLOCKED)) {
            localStorage.setItem(STORAGE_BLOCKED, JSON.stringify([]));
        }

        function getUsers() { return JSON.parse(localStorage.getItem(STORAGE_USERS)); }

        function saveUsers(u) { localStorage.setItem(STORAGE_USERS, JSON.stringify(u)); }

        function getFiles() { return JSON.parse(localStorage.getItem(STORAGE_FILES)); }

        function saveFiles(f) { localStorage.setItem(STORAGE_FILES, JSON.stringify(f)); }

        function getChat() { return JSON.parse(localStorage.getItem(STORAGE_CHAT)); }

        function saveChat(c) { localStorage.setItem(STORAGE_CHAT, JSON.stringify(c)); }

        function getTickets() { return JSON.parse(localStorage.getItem(STORAGE_TICKETS)); }

        function saveTickets(t) { localStorage.setItem(STORAGE_TICKETS, JSON.stringify(t)); }

        function getPrivateChats() { return JSON.parse(localStorage.getItem(STORAGE_PRIVATE_CHATS)); }

        function savePrivateChats(p) { localStorage.setItem(STORAGE_PRIVATE_CHATS, JSON.stringify(p)); }

        function getBlocked() { return JSON.parse(localStorage.getItem(STORAGE_BLOCKED)); }

        function saveBlocked(b) { localStorage.setItem(STORAGE_BLOCKED, JSON.stringify(b)); }

        function getSession() { return localStorage.getItem(STORAGE_SESSION); }

        function setSession(u) { localStorage.setItem(STORAGE_SESSION, u); }

        function clearSession() { localStorage.removeItem(STORAGE_SESSION); }

        // ============================================================
        // 3. МОДАЛКИ
        // ============================================================
        let modalReturnFocus = null;
        let authToastTimer = null;

        function resetPasswordToggles(scope) {
            scope.querySelectorAll('.password-toggle').forEach(button => {
                const input = document.getElementById(button.dataset.passwordTarget);
                const icon = button.querySelector('i');
                if (input) input.type = 'password';
                button.setAttribute('aria-pressed', 'false');
                button.setAttribute('aria-label', 'Показать пароль');
                if (icon) icon.className = 'fas fa-eye';
            });
        }

        function resetAuthFeedback(scope) {
            if (!scope) return;
            scope.querySelectorAll('.auth-field').forEach(field => field.classList.remove('has-error'));
            scope.querySelectorAll('.auth-field input').forEach(input => input.setAttribute('aria-invalid', 'false'));
            scope.querySelectorAll('.field-error').forEach(error => {
                error.textContent = '';
                error.hidden = true;
            });
            scope.querySelectorAll('.auth-message').forEach(message => {
                message.textContent = '';
                message.hidden = true;
                message.classList.remove('success');
            });
            scope.querySelector('.auth-card')?.classList.remove('shake');
        }

        function openModal(id, preserveReturnFocus = false) {
            const modal = document.getElementById(id);
            if (!modal) return;
            if (!preserveReturnFocus && !document.querySelector('.modal.show')) {
                modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            }
            if (modal.classList.contains('auth-modal')) resetAuthFeedback(modal);
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            requestAnimationFrame(() => {
                const focusTarget = modal.querySelector('.auth-form input') ||
                    modal.querySelector('.modal-content input, .modal-content button');
                focusTarget?.focus();
            });
        }

        function closeModal(id, restoreFocus = true) {
            const modal = document.getElementById(id);
            if (!modal) return;
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            if (modal.classList.contains('auth-modal')) {
                resetAuthFeedback(modal);
                resetPasswordToggles(modal);
            }

            const remainingModal = [...document.querySelectorAll('.modal.show')].pop();
            if (remainingModal) {
                remainingModal.querySelector('.modal-content')?.focus();
                return;
            }

            document.body.classList.remove('modal-open');
            if (restoreFocus && modalReturnFocus?.isConnected) modalReturnFocus.focus();
            modalReturnFocus = null;
        }

        function switchModal(id) {
            const target = document.getElementById(id);
            if (!target || target.classList.contains('show')) return;
            document.querySelectorAll('.auth-modal.show').forEach(modal => {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
                resetAuthFeedback(modal);
                resetPasswordToggles(modal);
            });
            openModal(id, true);
        }

        function setFieldError(input, message) {
            const field = input.closest('.auth-field');
            const error = document.getElementById(input.id + 'Error');
            field?.classList.toggle('has-error', !!message);
            input.setAttribute('aria-invalid', message ? 'true' : 'false');
            if (error) {
                error.textContent = message;
                error.hidden = !message;
            }
        }

        function setAuthMessage(id, text, type = 'error') {
            const message = document.getElementById(id);
            if (!message) return;
            message.textContent = text;
            message.hidden = !text;
            message.classList.toggle('success', type === 'success');
        }

        function shakeAuthCard(form) {
            const card = form.closest('.auth-card');
            if (!card) return;
            card.classList.remove('shake');
            void card.offsetWidth;
            card.classList.add('shake');
            card.addEventListener('animationend', () => card.classList.remove('shake'), { once: true });
        }

        function focusFirstInvalid(form) {
            form.querySelector('[aria-invalid="true"]')?.focus();
            shakeAuthCard(form);
        }

        function showAuthToast(text) {
            const toast = document.getElementById('authToast');
            if (!toast) return;
            clearTimeout(authToastTimer);
            toast.textContent = text;
            toast.classList.add('show');
            authToastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
        }

        document.getElementById('authButtons').addEventListener('click', function(e) {
            const trigger = e.target.closest('#loginBtn, #registerBtn, #logoutBtn');
            if (!trigger) return;
            e.preventDefault();
            closeMobileMenu(true);
            if (trigger.id === 'loginBtn') openModal('loginModal');
            if (trigger.id === 'registerBtn') openModal('registerModal');
            if (trigger.id === 'logoutBtn') {
                clearSession();
                location.reload();
            }
        });

        document.querySelectorAll('[data-close-modal]').forEach(button => {
            button.addEventListener('click', () => closeModal(button.dataset.closeModal));
        });

        document.querySelectorAll('[data-auth-target]').forEach(button => {
            button.addEventListener('click', () => switchModal(button.dataset.authTarget));
        });

        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const input = document.getElementById(button.dataset.passwordTarget);
                const icon = button.querySelector('i');
                if (!input) return;
                const shouldShow = input.type === 'password';
                input.type = shouldShow ? 'text' : 'password';
                button.setAttribute('aria-pressed', String(shouldShow));
                button.setAttribute('aria-label', shouldShow ? 'Скрыть пароль' : 'Показать пароль');
                if (icon) icon.className = shouldShow ? 'fas fa-eye-slash' : 'fas fa-eye';
                input.focus();
            });
        });

        document.querySelectorAll('.auth-form input').forEach(input => {
            input.addEventListener('input', () => {
                setFieldError(input, '');
                const message = input.form?.querySelector('.auth-message');
                if (message) {
                    message.textContent = '';
                    message.hidden = true;
                    message.classList.remove('success');
                }
            });
        });

        document.getElementById('loginForm').addEventListener('submit', login);
        document.getElementById('registerForm').addEventListener('submit', register);
        document.querySelectorAll('.auth-form').forEach(form => {
            form.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && e.target.matches('input')) {
                    e.preventDefault();
                    this.requestSubmit();
                }
            });
        });

        document.querySelectorAll('.modal').forEach(m => {
            m.addEventListener('click', function(e) {
                if (e.target === this) closeModal(this.id);
            });
        });

        document.addEventListener('keydown', function(e) {
            const modal = [...document.querySelectorAll('.modal.show')].pop();
            if (!modal) return;
            if (e.key === 'Escape') {
                closeModal(modal.id);
                return;
            }
            if (e.key !== 'Tab') return;

            const focusable = [...modal.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )].filter(element => element.getClientRects().length > 0);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        // ============================================================
        // 4. АВТОРИЗАЦИЯ
        // ============================================================
        function login(event) {
            event?.preventDefault();
            const form = document.getElementById('loginForm');
            resetAuthFeedback(form);
            const username = document.getElementById('loginUser').value.trim();
            const password = document.getElementById('loginPass').value.trim();
            const usernameInput = document.getElementById('loginUser');
            const passwordInput = document.getElementById('loginPass');

            if (!username) setFieldError(usernameInput, 'Введите логин.');
            if (!password) setFieldError(passwordInput, 'Введите пароль.');
            if (!username || !password) {
                focusFirstInvalid(form);
                return;
            }

            const users = getUsers();
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                user.lastLogin = new Date().toISOString();
                saveUsers(users);
                setSession(username);
                form.reset();
                closeModal('loginModal', false);
                updateUI();
                showAuthToast('Добро пожаловать, ' + username + '!');
            } else {
                passwordInput.value = '';
                setAuthMessage('loginMessage', 'Не удалось войти. Проверьте логин и пароль.');
                setFieldError(passwordInput, 'Пароль не подошёл.');
                passwordInput.focus();
                shakeAuthCard(form);
            }
        }

        function register(event) {
            event?.preventDefault();
            const form = document.getElementById('registerForm');
            resetAuthFeedback(form);
            const username = document.getElementById('regUser').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPass').value.trim();
            const invite = document.getElementById('regInvite').value.trim().toUpperCase();
            const usernameInput = document.getElementById('regUser');
            const emailInput = document.getElementById('regEmail');
            const passwordInput = document.getElementById('regPass');
            const inviteInput = document.getElementById('regInvite');
            const validInvites = ['INVITE-2026', 'PASTA-CODE', 'GLAMOUR', 'THEFOG-777', 'DEVELOPER'];

            if (username.length < 3) setFieldError(usernameInput, 'Логин должен содержать минимум 3 символа.');
            if (!email || !emailInput.validity.valid) setFieldError(emailInput, 'Введите корректный email.');
            if (password.length < 6) setFieldError(passwordInput, 'Пароль должен содержать минимум 6 символов.');
            if (!invite) setFieldError(inviteInput, 'Введите инвайт-код.');
            if (form.querySelector('[aria-invalid="true"]')) {
                focusFirstInvalid(form);
                return;
            }

            if (!validInvites.includes(invite)) {
                setFieldError(inviteInput, 'Инвайт-код не найден или уже недействителен.');
                focusFirstInvalid(form);
                return;
            }
            const users = getUsers();
            if (users.find(u => u.username === username)) {
                setFieldError(usernameInput, 'Этот логин уже занят.');
                focusFirstInvalid(form);
                return;
            }
            users.push({
                username,
                password,
                email,
                coins: 1000,
                subscription: null,
                bio: 'Новый пользователь',
                roles: ['user'],
                avatar: '',
                registered: new Date().toISOString(),
                lastLogin: null
            });
            saveUsers(users);
            form.reset();
            switchModal('loginModal');
            document.getElementById('loginUser').value = username;
            setAuthMessage('loginMessage', 'Аккаунт создан. Осталось ввести пароль.', 'success');
            requestAnimationFrame(() => document.getElementById('loginPass').focus());
        }

        // ============================================================
        // 5. ПОДПИСКА
        // ============================================================
        function setStoreMessage(text, type = 'info') {
            const message = document.getElementById('storeMessage');
            if (!message) return;
            message.textContent = text;
            message.hidden = !text;
            message.classList.toggle('success', type === 'success');
            message.classList.toggle('error', type === 'error');
        }

        function updateStoreUI() {
            const user = getCurrentUserData();
            const balance = document.getElementById('storeBalance');
            const accessStatus = document.getElementById('storeAccessStatus');
            if (!balance || !accessStatus) return;

            balance.textContent = user ? user.coins.toLocaleString('ru-RU') : '0';
            if (!user) {
                accessStatus.textContent = 'Войдите, чтобы оформить доступ';
            } else if (hasSubscription(user)) {
                accessStatus.textContent = 'Доступ до ' + new Date(user.subscription).toLocaleDateString('ru-RU');
            } else {
                accessStatus.textContent = 'Подписка пока не активна';
            }

            document.querySelectorAll('.store-buy-button').forEach(button => {
                const cost = Number(button.dataset.cost);
                const days = Number(button.dataset.days);
                const planName = button.closest('.store-card')?.querySelector('.plan-name')?.textContent || 'тариф';
                const label = button.querySelector('span');
                const missingCoins = user ? Math.max(0, cost - user.coins) : 0;

                button.classList.toggle('is-insufficient', Boolean(user && missingCoins));
                if (!user) label.textContent = 'Войти и выбрать';
                else if (missingCoins) label.textContent = 'Не хватает ' + missingCoins.toLocaleString('ru-RU');
                else if (hasSubscription(user)) label.textContent = 'Продлить на ' + days + ' дн.';
                else label.textContent = 'Выбрать ' + planName;

                button.setAttribute('aria-label', label.textContent + '. Стоимость ' + cost + ' PASTA COIN');
            });
        }

        function buySubscription(days, cost) {
            const user = getCurrentUserData();
            if (!user) {
                setStoreMessage('Сначала войдите в аккаунт — после входа выбранный тариф останется доступен.', 'info');
                openModal('loginModal');
                return;
            }
            if (user.coins < cost) {
                const missing = cost - user.coins;
                setStoreMessage('Для этого тарифа не хватает ' + missing.toLocaleString('ru-RU') + ' PASTA COIN.', 'error');
                document.getElementById('storeMessage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const now = new Date();
            const currentExpiry = user.subscription ? new Date(user.subscription) : null;
            const extensionStart = currentExpiry && currentExpiry > now ? currentExpiry : now;
            const expiry = new Date(extensionStart.getTime() + days * 24 * 60 * 60 * 1000);
            user.coins -= cost;
            user.subscription = expiry.toISOString();
            const users = getUsers();
            const idx = users.findIndex(u => u.username === user.username);
            users[idx] = user;
            saveUsers(users);
            setSession(user.username);
            updateUI();
            setStoreMessage(
                'Готово! Доступ активен до ' + expiry.toLocaleDateString('ru-RU') + '. Списано ' + cost.toLocaleString('ru-RU') + ' PASTA COIN.',
                'success'
            );
            document.getElementById('storeMessage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.getElementById('storeGrid')?.addEventListener('click', function(event) {
            const button = event.target.closest('.store-buy-button');
            if (!button) return;
            setStoreMessage('');
            buySubscription(Number(button.dataset.days), Number(button.dataset.cost));
        });

        function hasSubscription(user) {
            if (!user || !user.subscription) return false;
            return new Date(user.subscription) > new Date();
        }

        // ============================================================
        // 6. ПОЛЬЗОВАТЕЛЬСКИЕ ДАННЫЕ
        // ============================================================
        function getCurrentUserData() {
            const session = getSession();
            if (!session) return null;
            const users = getUsers();
            return users.find(u => u.username === session) || null;
        }

        // ============================================================
        // 7. ЗАГРУЗКА ФАЙЛОВ
        // ============================================================
        let librarySearchQuery = '';

        function showLibraryMessage(message = '', type = 'success') {
            const messageBox = document.getElementById('libraryMessage');
            messageBox.className = 'library-message';
            if (!message) {
                messageBox.hidden = true;
                messageBox.textContent = '';
                return;
            }
            if (type === 'error') messageBox.classList.add('is-error');
            const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
            messageBox.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${escapeUserHTML(message)}</span>`;
            messageBox.hidden = false;
        }

        function formatLibraryFileCount(count) {
            const lastTwo = count % 100;
            const last = count % 10;
            const word = lastTwo >= 11 && lastTwo <= 14 ? 'файлов' :
                last === 1 ? 'файл' : last >= 2 && last <= 4 ? 'файла' : 'файлов';
            return `${count} ${word}`;
        }

        function formatLibraryFileSize(content) {
            const bytes = new Blob([String(content || '')]).size;
            if (bytes < 1024) return `${bytes} Б`;
            return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} КБ`;
        }

        function updateLibraryMode(resetSelection = false) {
            const activeTab = document.querySelector('.sub-link.active');
            const type = activeTab?.dataset.sub === 'lua' ? 'lua' : 'cfg';
            const fileInput = document.getElementById('fileInput');
            document.getElementById('libraryUploadType').textContent = type.toUpperCase();
            document.getElementById('libraryFileHint').textContent = type === 'lua'
                ? 'LUA или TXT · до 1 МБ'
                : 'CFG или TXT · до 1 МБ';
            fileInput.accept = type === 'lua' ? '.lua,.txt,text/plain' : '.cfg,.txt,text/plain';
            if (resetSelection) {
                fileInput.value = '';
                document.getElementById('librarySelectedFile').hidden = true;
                document.getElementById('librarySelectedFileName').textContent = '';
                showLibraryMessage();
            }
        }

        document.getElementById('libraryUploadForm').addEventListener('submit', function(event) {
            event.preventDefault();
            const user = getCurrentUserData();
            showLibraryMessage();
            if (!user) {
                showLibraryMessage('Войдите в аккаунт, чтобы загружать файлы.', 'error');
                openModal('loginModal');
                return;
            }
            if (!hasSubscription(user)) {
                showLibraryMessage('Для загрузки файлов нужна активная подписка.', 'error');
                return;
            }

            const fileInput = document.getElementById('fileInput');
            const nameInput = document.getElementById('fileName');
            const file = fileInput.files[0];
            if (!file) {
                showLibraryMessage('Сначала выберите файл.', 'error');
                return;
            }
            if (file.size > 1024 * 1024) {
                showLibraryMessage('Файл слишком большой. Максимальный размер — 1 МБ.', 'error');
                return;
            }

            const activeSub = document.querySelector('.sub-link.active');
            const type = activeSub?.dataset.sub === 'lua' ? 'lua' : 'cfg';
            const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
            const allowedExtensions = type === 'lua' ? ['lua', 'txt'] : ['cfg', 'txt'];
            if (!allowedExtensions.includes(extension)) {
                showLibraryMessage(
                    type === 'lua' ? 'Для раздела Lua выберите файл .lua или .txt.' : 'Для раздела CFG выберите файл .cfg или .txt.',
                    'error'
                );
                return;
            }

            let fileName = (nameInput.value.trim() || file.name).slice(0, 80);
            if (nameInput.value.trim() && !fileName.includes('.')) fileName += '.' + extension;
            const reader = new FileReader();
            const uploadButton = document.getElementById('uploadBtn');
            uploadButton.disabled = true;
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Добавляем...</span>';
            reader.onload = function(loadEvent) {
                const content = loadEvent.target.result;
                const files = getFiles();
                files.push({
                    id: Date.now(),
                    name: fileName,
                    type: type,
                    content: content,
                    author: user.username,
                    uploaded: new Date().toISOString()
                });
                try {
                    saveFiles(files);
                    fileInput.value = '';
                    nameInput.value = '';
                    document.getElementById('librarySelectedFile').hidden = true;
                    document.getElementById('librarySelectedFileName').textContent = '';
                    updateUI();
                    showLibraryMessage(`Файл «${fileName}» добавлен в библиотеку.`);
                } catch (error) {
                    showLibraryMessage('Не удалось сохранить файл. Возможно, хранилище браузера заполнено.', 'error');
                } finally {
                    uploadButton.disabled = false;
                    uploadButton.innerHTML = '<span>Добавить файл</span><i class="fas fa-arrow-right" aria-hidden="true"></i>';
                }
            };
            reader.onerror = function() {
                uploadButton.disabled = false;
                uploadButton.innerHTML = '<span>Добавить файл</span><i class="fas fa-arrow-right" aria-hidden="true"></i>';
                showLibraryMessage('Не удалось прочитать выбранный файл.', 'error');
            };
            reader.readAsText(file);
        });

        document.getElementById('fileInput').addEventListener('change', function() {
            const selected = this.files[0];
            const selectedBlock = document.getElementById('librarySelectedFile');
            document.getElementById('librarySelectedFileName').textContent = selected ? selected.name : '';
            selectedBlock.hidden = !selected;
            showLibraryMessage();
        });

        document.getElementById('librarySearch').addEventListener('input', function() {
            librarySearchQuery = this.value.trim().toLowerCase();
            renderFiles();
        });

        // ============================================================
        // 8. ОТОБРАЖЕНИЕ ФАЙЛОВ
        // ============================================================
        function renderFiles() {
            const files = getFiles();
            const cfgFiles = files.filter(f => f.type === 'cfg');
            const luaFiles = files.filter(f => f.type === 'lua');
            const activeType = document.querySelector('.sub-link.active')?.dataset.sub === 'lua' ? 'lua' : 'cfg';

            document.getElementById('libraryTotalCount').textContent = files.length;
            document.getElementById('libraryCfgCount').textContent = cfgFiles.length;
            document.getElementById('libraryLuaCount').textContent = luaFiles.length;
            document.getElementById('cfgTabCount').textContent = cfgFiles.length;
            document.getElementById('luaTabCount').textContent = luaFiles.length;
            document.getElementById('libraryCollectionTitle').textContent = activeType === 'lua' ? 'Lua-скрипты' : 'CFG-конфиги';

            function renderGrid(typeFiles, containerId, type) {
                const container = document.getElementById(containerId);
                const visibleFiles = typeFiles
                    .filter(file => !librarySearchQuery ||
                        String(file.name || '').toLowerCase().includes(librarySearchQuery) ||
                        String(file.author || '').toLowerCase().includes(librarySearchQuery))
                    .sort((first, second) => new Date(second.uploaded).getTime() - new Date(first.uploaded).getTime());

                if (activeType === type) {
                    document.getElementById('libraryResultCount').textContent = formatLibraryFileCount(visibleFiles.length);
                }
                if (visibleFiles.length === 0) {
                    const hasFiles = typeFiles.length > 0;
                    container.innerHTML = `
                        <div class="library-empty">
                            <span><i class="fas ${hasFiles ? 'fa-magnifying-glass' : 'fa-folder-open'}" aria-hidden="true"></i></span>
                            <strong>${hasFiles ? 'Ничего не найдено' : `Раздел ${type.toUpperCase()} пока пуст`}</strong>
                            <p>${hasFiles ? 'Попробуйте изменить поисковый запрос.' : 'Добавьте первый файл через форму загрузки.'}</p>
                        </div>`;
                    return;
                }

                container.innerHTML = visibleFiles.map(file => {
                    const uploadDate = new Date(file.uploaded);
                    const dateLabel = Number.isNaN(uploadDate.getTime()) ? 'Дата не указана' :
                        uploadDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
                    const isOwner = file.author === getSession();
                    return `
                        <article class="file-card">
                            <div class="library-file-top">
                                <span class="library-file-icon ${type}"><i class="fas ${type === 'lua' ? 'fa-terminal' : 'fa-sliders'}" aria-hidden="true"></i></span>
                                <span class="library-file-type">${type}</span>
                            </div>
                            <div class="file-info">
                                <div class="name">${escapeUserHTML(file.name || 'Без названия')}</div>
                                <div class="meta">
                                    <span><i class="fas fa-user" aria-hidden="true"></i>${escapeUserHTML(file.author || 'Неизвестно')}</span>
                                    <span><i class="fas fa-calendar" aria-hidden="true"></i>${dateLabel}</span>
                                    <span><i class="fas fa-hard-drive" aria-hidden="true"></i>${formatLibraryFileSize(file.content)}</span>
                                </div>
                            </div>
                            <div class="file-actions">
                                <button type="button" class="btn btn-small btn-primary" data-file-action="download" data-file-id="${escapeUserHTML(file.id)}">
                                    <i class="fas fa-download" aria-hidden="true"></i><span>Скачать</span>
                                </button>
                                ${isOwner ? `<button type="button" class="btn btn-small btn-danger" data-file-action="delete" data-file-id="${escapeUserHTML(file.id)}" aria-label="Удалить ${escapeUserHTML(file.name || 'файл')}"><i class="fas fa-trash" aria-hidden="true"></i></button>` : ''}
                            </div>
                        </article>`;
                }).join('');
            }
            renderGrid(cfgFiles, 'cfgGrid', 'cfg');
            renderGrid(luaFiles, 'luaGrid', 'lua');
        }

        function downloadFile(id) {
            const files = getFiles();
            const file = files.find(item => String(item.id) === String(id));
            if (!file) return;
            const blob = new Blob([file.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = String(file.name || 'file.txt').replace(/[\\/:*?"<>|]/g, '_');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 0);
        }

        function deleteFile(id) {
            if (!confirm('Удалить файл?')) return;
            const files = getFiles();
            const file = files.find(item => String(item.id) === String(id));
            if (!file || file.author !== getSession()) return;
            saveFiles(files.filter(item => String(item.id) !== String(id)));
            updateUI();
            showLibraryMessage(`Файл «${file.name || 'Без названия'}» удалён.`);
        }

        document.getElementById('page-cfg').addEventListener('click', function(event) {
            const actionButton = event.target.closest('[data-file-action]');
            if (!actionButton) return;
            if (actionButton.dataset.fileAction === 'download') downloadFile(actionButton.dataset.fileId);
            if (actionButton.dataset.fileAction === 'delete') deleteFile(actionButton.dataset.fileId);
        });

        updateLibraryMode();

        // ============================================================
        // 9. СПИСОК ПОЛЬЗОВАТЕЛЕЙ
        // ============================================================
        let usersSearchQuery = '';
        let usersRoleFilter = 'all';

        function escapeUserHTML(value) {
            const element = document.createElement('div');
            element.textContent = String(value ?? '');
            return element.innerHTML;
        }

        function getUserFlags(user) {
            const roles = user.roles || [];
            return {
                hasSub: hasSubscription(user),
                isAdmin: roles.includes('admin'),
                isDev: roles.includes('developer'),
                isCoder: roles.includes('coder'),
                isTeam: roles.some(role => ['admin', 'developer', 'coder'].includes(role))
            };
        }

        function renderUserRoles(user) {
            const { hasSub, isAdmin, isDev, isCoder } = getUserFlags(user);
            const roles = [];
            if (isAdmin) roles.push('<span class="user-role-chip admin"><i class="fas fa-crown" aria-hidden="true"></i> Admin</span>');
            if (isDev) roles.push('<span class="user-role-chip developer"><i class="fas fa-code" aria-hidden="true"></i> Developer</span>');
            if (isCoder) roles.push('<span class="user-role-chip coder"><i class="fas fa-terminal" aria-hidden="true"></i> Coder</span>');
            if (!roles.length) {
                roles.push(hasSub
                    ? '<span class="user-role-chip premium"><i class="fas fa-gem" aria-hidden="true"></i> Premium</span>'
                    : '<span class="user-role-chip"><i class="fas fa-user" aria-hidden="true"></i> Member</span>');
            }
            return roles.join('');
        }

        function renderUsers() {
            const users = getUsers();
            const files = getFiles();
            const container = document.getElementById('usersList');
            const emptyState = document.getElementById('usersEmpty');
            const normalizedQuery = usersSearchQuery.trim().toLocaleLowerCase('ru-RU');
            const premiumCount = users.filter(user => hasSubscription(user)).length;
            const teamCount = users.filter(user => getUserFlags(user).isTeam).length;
            const visibleUsers = users.filter(user => {
                const flags = getUserFlags(user);
                const matchesSearch = !normalizedQuery || user.username.toLocaleLowerCase('ru-RU').includes(normalizedQuery);
                const matchesFilter = usersRoleFilter === 'all' ||
                    (usersRoleFilter === 'premium' && flags.hasSub) ||
                    (usersRoleFilter === 'team' && flags.isTeam);
                return matchesSearch && matchesFilter;
            });

            document.getElementById('usersTotalCount').textContent = users.length;
            document.getElementById('usersPremiumCount').textContent = premiumCount;
            document.getElementById('usersTeamCount').textContent = teamCount;
            document.getElementById('usersResultCount').textContent = 'Показано: ' + visibleUsers.length;
            emptyState.hidden = visibleUsers.length > 0;
            container.hidden = visibleUsers.length === 0;

            container.innerHTML = visibleUsers.map(user => {
                const { hasSub } = getUserFlags(user);
                const userFiles = files.filter(file => file.author === user.username).length;
                const username = escapeUserHTML(user.username);
                const avatarHtml = user.avatar
                    ? `<img src="${escapeUserHTML(user.avatar)}" alt="">`
                    : '<i class="fas fa-user" aria-hidden="true"></i>';
                const registrationDate = user.registered
                    ? new Date(user.registered).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
                    : '—';
                return `
                        <button type="button" class="user-card-item" data-username="${username}"
                            aria-label="Открыть профиль пользователя ${username}">
                            <div class="user-card-head">
                                <div class="user-avatar">${avatarHtml}</div>
                                <div class="user-card-identity">
                                    <div class="username">${username}</div>
                                    <div class="user-status">${renderUserRoles(user)}</div>
                                </div>
                                <span class="user-card-access ${hasSub ? 'active' : ''}">${hasSub ? 'Access' : 'Basic'}</span>
                            </div>
                            <p class="user-card-bio">${escapeUserHTML(user.bio || 'Участник сообщества PastaTeam.')}</p>
                            <div class="user-card-footer">
                                <span><i class="fas fa-file-alt" aria-hidden="true"></i> ${userFiles}</span>
                                <span><i class="fas fa-calendar" aria-hidden="true"></i> ${registrationDate}</span>
                                <span class="user-card-open"><i class="fas fa-arrow-right" aria-hidden="true"></i></span>
                            </div>
                        </button>
                    `;
            }).join('');
        }

        document.getElementById('usersSearchInput').addEventListener('input', function() {
            usersSearchQuery = this.value;
            renderUsers();
        });

        document.querySelectorAll('.users-filter').forEach(button => {
            button.addEventListener('click', function() {
                usersRoleFilter = this.dataset.userFilter;
                document.querySelectorAll('.users-filter').forEach(filter => {
                    const isActive = filter === this;
                    filter.classList.toggle('active', isActive);
                    filter.setAttribute('aria-pressed', String(isActive));
                });
                renderUsers();
            });
        });

        document.getElementById('usersList').addEventListener('click', function(event) {
            const card = event.target.closest('.user-card-item');
            if (card) openUserModal(card.dataset.username);
        });

        document.addEventListener('keydown', function(event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' &&
                document.getElementById('page-users').classList.contains('active')) {
                event.preventDefault();
                document.getElementById('usersSearchInput').focus();
            }
        });

        // ============================================================
        // 10. МОДАЛКА ПОЛЬЗОВАТЕЛЯ
        // ============================================================
        let selectedUser = null;

        function openUserModal(username) {
            const users = getUsers();
            const user = users.find(item => item.username === username);
            if (!user) return;
            selectedUser = username;
            const currentUser = getCurrentUserData();
            const isAdmin = Boolean(currentUser?.roles?.includes('admin'));
            const isSelf = Boolean(currentUser && currentUser.username === username);
            const hasSub = hasSubscription(user);
            const filesCount = getFiles().filter(file => file.author === username).length;
            const blocked = getBlocked();
            const isBlocked = blocked.includes(username);
            const canViewEmail = Boolean(currentUser && (isAdmin || isSelf));

            document.getElementById('userModalTitle').textContent = username;
            document.getElementById('userModalAvatar').innerHTML = user.avatar
                ? `<img src="${escapeUserHTML(user.avatar)}" alt="">`
                : '<i class="fas fa-user" aria-hidden="true"></i>';
            document.getElementById('userModalRoles').innerHTML = renderUserRoles(user);

            const access = document.getElementById('userModalAccess');
            access.textContent = isBlocked ? 'Заблокирован' : (hasSub ? 'Premium access' : 'Basic access');
            access.classList.toggle('active', hasSub && !isBlocked);

            document.getElementById('userModalBody').innerHTML = `
                    <div class="user-detail-bio">
                        <span>О пользователе</span>
                        <p>${escapeUserHTML(user.bio || 'Пользователь пока ничего о себе не рассказал.')}</p>
                    </div>
                    <div class="user-detail-stats">
                        <div class="user-detail-info-card">
                            <span>Загрузки</span>
                            <strong>${filesCount} файлов</strong>
                        </div>
                        <div class="user-detail-info-card">
                            <span>В сообществе</span>
                            <strong>${user.registered ? new Date(user.registered).toLocaleDateString('ru-RU') : '—'}</strong>
                        </div>
                        <div class="user-detail-info-card">
                            <span>${canViewEmail ? 'Email' : 'Контакты'}</span>
                            <strong>${canViewEmail ? escapeUserHTML(user.email || '—') : 'Скрыты пользователем'}</strong>
                        </div>
                    </div>
                `;

            const modalMessage = document.getElementById('userModalMessage');
            modalMessage.hidden = true;
            modalMessage.textContent = '';

            const messageButton = document.getElementById('userModalMsgBtn');
            const blockButton = document.getElementById('userModalBlockBtn');
            messageButton.hidden = !(currentUser && !isSelf);
            blockButton.hidden = !(isAdmin && !isSelf);
            blockButton.className = isBlocked ? 'btn' : 'btn btn-danger';
            blockButton.innerHTML = isBlocked
                ? '<i class="fas fa-unlock" aria-hidden="true"></i><span>Разблокировать</span>'
                : '<i class="fas fa-ban" aria-hidden="true"></i><span>Заблокировать</span>';

            openModal('userModal');
        }

        // ============================================================
        // 11. БЛОКИРОВКА
        // ============================================================
        function blockUser() {
            if (!selectedUser) return;
            const blocked = getBlocked();
            const index = blocked.indexOf(selectedUser);
            let message = '';
            if (index > -1) {
                blocked.splice(index, 1);
                message = 'Пользователь разблокирован.';
            } else {
                blocked.push(selectedUser);
                message = 'Пользователь заблокирован.';
            }
            saveBlocked(blocked);
            renderUsers();
            openUserModal(selectedUser);
            const modalMessage = document.getElementById('userModalMessage');
            modalMessage.textContent = message;
            modalMessage.hidden = false;
        }

        document.getElementById('userModalMsgBtn').addEventListener('click', openPrivateChat);
        document.getElementById('userModalBlockBtn').addEventListener('click', blockUser);

        // ============================================================
        // 12. ПРИВАТНЫЙ ЧАТ
        // ============================================================
        let privateChatPartner = null;

        function openPrivateChat() {
            if (!selectedUser) return;
            privateChatPartner = selectedUser;
            document.getElementById('privateChatTitle').textContent = 'Чат с ' + selectedUser;
            renderPrivateMessages();
            openModal('privateChatModal');
        }

        function getPrivateChatKey(user1, user2) {
            return [user1, user2].sort().join('_');
        }

        function getPrivateMessages(partner) {
            const current = getSession();
            if (!current) return [];
            const key = getPrivateChatKey(current, partner);
            const chats = getPrivateChats();
            return chats[key] || [];
        }

        function savePrivateMessages(partner, messages) {
            const current = getSession();
            const key = getPrivateChatKey(current, partner);
            const chats = getPrivateChats();
            chats[key] = messages;
            savePrivateChats(chats);
        }

        function renderPrivateMessages() {
            const container = document.getElementById('privateChatMessages');
            const msgs = getPrivateMessages(privateChatPartner);
            if (msgs.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">Сообщений пока нет.</p>';
                return;
            }
            const current = getSession();
            container.innerHTML = msgs.map(m => `
                    <div style="display:flex; justify-content:${m.user === current ? 'flex-end' : 'flex-start'}; margin-bottom:6px;">
                        <div style="background:${m.user === current ? 'var(--bg-elevated)' : 'var(--bg-primary)'}; padding:6px 12px; border-radius:12px; max-width:70%; border:1px solid var(--border-color);">
                            <div style="font-size:12px; color: var(--text-muted);">${m.user}</div>
                            <div style="font-size:14px;">${m.text}</div>
                            <div style="font-size:10px; color: var(--text-muted); text-align:right;">${new Date(m.time).toLocaleTimeString()}</div>
                            ${m.user === current ? `<button class="btn btn-small btn-danger" onclick="deletePrivateMessage('${m.id}')" style="margin-top:4px;">Удалить</button>` : ''}
                        </div>
                    </div>
                `).join('');
            container.scrollTop = container.scrollHeight;
        }

        function sendPrivateMessage() {
            const input = document.getElementById('privateChatInput');
            const text = input.value.trim();
            if (!text) return;
            const current = getSession();
            if (!current) { alert('Войдите, чтобы отправлять сообщения.'); return; }
            // Проверка блокировки
            const blocked = getBlocked();
            if (blocked.includes(current) || blocked.includes(privateChatPartner)) {
                alert('Вы или собеседник заблокированы.');
                return;
            }
            const msgs = getPrivateMessages(privateChatPartner);
            msgs.push({ id: Date.now() + Math.random() * 1000, user: current, text: text, time: Date.now() });
            savePrivateMessages(privateChatPartner, msgs);
            input.value = '';
            renderPrivateMessages();
        }

        function deletePrivateMessage(id) {
            if (!confirm('Удалить сообщение?')) return;
            const msgs = getPrivateMessages(privateChatPartner);
            const newMsgs = msgs.filter(m => m.id != id);
            savePrivateMessages(privateChatPartner, newMsgs);
            renderPrivateMessages();
        }

        function clearPrivateChat() {
            if (!confirm('Очистить весь чат?')) return;
            savePrivateMessages(privateChatPartner, []);
            renderPrivateMessages();
        }

        document.getElementById('privateChatInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') sendPrivateMessage();
        });

        // ============================================================
        // 13. ОБЩИЙ ЧАТ
        // ============================================================
        function formatChatParticipantCount(count) {
            const lastTwo = count % 100;
            const last = count % 10;
            const word = lastTwo >= 11 && lastTwo <= 14 ? 'участников' :
                last === 1 ? 'участник' : last >= 2 && last <= 4 ? 'участника' : 'участников';
            return `${count} ${word}`;
        }

        function showChatComposerMessage(message = '') {
            const messageBox = document.getElementById('chatComposerMessage');
            messageBox.textContent = message;
            messageBox.hidden = !message;
        }

        function renderChat() {
            const messages = getChat();
            const container = document.getElementById('chatMessages');
            const currentUser = getSession();
            const users = getUsers();
            const participantCount = new Set(messages
                .map(message => String(message.user || ''))
                .filter(username => username && username.toLowerCase() !== 'system')).size;
            document.getElementById('chatUsers').textContent = formatChatParticipantCount(participantCount);

            if (messages.length === 0) {
                container.innerHTML = `
                    <div class="chat-empty">
                        <span><i class="fas fa-comment-dots" aria-hidden="true"></i></span>
                        <strong>Сообщений пока нет</strong>
                        <p>Начните разговор с участниками сообщества.</p>
                    </div>`;
                return;
            }

            container.innerHTML = messages.map(message => {
                const username = String(message.user || 'Неизвестно');
                const isSystem = username.toLowerCase() === 'system';
                const isOwn = Boolean(currentUser && username === currentUser);
                const userData = users.find(user => user.username === username);
                const messageDate = new Date(message.time);
                const isValidDate = !Number.isNaN(messageDate.getTime());
                const isToday = isValidDate && messageDate.toDateString() === new Date().toDateString();
                const displayTime = !isValidDate ? 'без даты' : isToday
                    ? messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    : messageDate.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
                const initial = escapeUserHTML(username.charAt(0).toUpperCase() || '?');
                const avatar = userData?.avatar
                    ? `<img src="${escapeUserHTML(userData.avatar)}" alt="">`
                    : initial;
                return `
                        <article class="msg${isOwn ? ' is-own' : ''}${isSystem ? ' is-system' : ''}">
                            <div class="avatar" aria-hidden="true">${avatar}</div>
                            <div class="chat-message-content">
                                <div class="chat-message-meta">
                                    <strong>${escapeUserHTML(username)}</strong><span>${displayTime}</span>
                                </div>
                            <div class="bubble">
                                    <div class="text">${escapeUserHTML(message.text || '')}</div>
                            </div>
                            </div>
                        </article>
                    `;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }

        function sendMessage(event) {
            event?.preventDefault();
            const user = getCurrentUserData();
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            showChatComposerMessage();

            if (!user) {
                showChatComposerMessage('Войдите в аккаунт, чтобы отправлять сообщения.');
                openModal('loginModal');
                return;
            }
            if (!hasSubscription(user)) {
                showChatComposerMessage('Для общего чата нужна активная подписка.');
                return;
            }
            if (!text) {
                showChatComposerMessage('Введите сообщение перед отправкой.');
                input.focus();
                return;
            }

            const chat = getChat();
            chat.push({ user: user.username, text: text.slice(0, 500), time: Date.now() });
            saveChat(chat);
            input.value = '';
            document.getElementById('chatInputCount').textContent = '0';
            renderChat();
            document.getElementById('profileChatCount').textContent = String(
                getChat().filter(message => message.user === user.username).length
            );
            input.focus();
        }

        document.getElementById('publicChatForm').addEventListener('submit', sendMessage);
        document.getElementById('chatInput').addEventListener('input', function() {
            document.getElementById('chatInputCount').textContent = String(this.value.length);
            showChatComposerMessage();
        });

        // ============================================================
        // 14. ТИКЕТЫ
        // ============================================================
        const TICKET_CATEGORIES = {
            general: { label: 'Общий вопрос', icon: 'fa-comment-dots' },
            technical: { label: 'Техническая проблема', icon: 'fa-microchip' },
            billing: { label: 'Оплата', icon: 'fa-credit-card' }
        };
        let supportTicketFilter = 'all';

        function getSupportTicketScope() {
            const user = getSession();
            const userData = user ? getUsers().find(item => item.username === user) : null;
            const isAdmin = Boolean(userData?.roles?.includes('admin'));
            const tickets = getTickets();
            return {
                user,
                isAdmin,
                tickets: isAdmin ? tickets : tickets.filter(ticket => ticket.author === user)
            };
        }

        function formatTicketCount(count) {
            const lastTwo = count % 100;
            const last = count % 10;
            const word = lastTwo >= 11 && lastTwo <= 14 ? 'обращений' :
                last === 1 ? 'обращение' : last >= 2 && last <= 4 ? 'обращения' : 'обращений';
            return `${count} ${word}`;
        }

        function setSupportFieldError(fieldId, errorId, message = '') {
            const field = document.getElementById(fieldId);
            const error = document.getElementById(errorId);
            field.classList.toggle('has-error', Boolean(message));
            error.textContent = message;
            error.hidden = !message;
        }

        function showSupportMessage(message = '', type = '') {
            const messageBox = document.getElementById('supportFormMessage');
            messageBox.className = 'support-form-message';
            if (!message) {
                messageBox.hidden = true;
                messageBox.textContent = '';
                return;
            }
            if (type) messageBox.classList.add(`is-${type}`);
            const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
            messageBox.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${escapeUserHTML(message)}</span>`;
            messageBox.hidden = false;
        }

        function syncSupportTopicButtons(category) {
            document.querySelectorAll('[data-support-category]').forEach(button => {
                const isActive = button.dataset.supportCategory === category;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
        }

        function syncTicketFilterButtons() {
            document.querySelectorAll('[data-ticket-filter]').forEach(button => {
                const isActive = button.dataset.ticketFilter === supportTicketFilter;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', String(isActive));
            });
        }

        function createTicket(event) {
            event?.preventDefault();
            const user = getSession();
            setSupportFieldError('ticketTitleField', 'ticketTitleError');
            setSupportFieldError('ticketBodyField', 'ticketBodyError');
            showSupportMessage();

            if (!user) {
                showSupportMessage('Войдите в аккаунт — после этого форма и история обращений будут доступны.', 'error');
                openModal('loginModal');
                return;
            }

            const title = document.getElementById('ticketTitle').value.trim();
            const category = document.getElementById('ticketCategory').value;
            const body = document.getElementById('ticketBody').value.trim();
            let firstInvalidField = null;

            if (title.length < 4) {
                setSupportFieldError('ticketTitleField', 'ticketTitleError', 'Добавьте понятный заголовок — минимум 4 символа.');
                firstInvalidField = document.getElementById('ticketTitle');
            }
            if (body.length < 12) {
                setSupportFieldError('ticketBodyField', 'ticketBodyError', 'Опишите ситуацию чуть подробнее — минимум 12 символов.');
                firstInvalidField ||= document.getElementById('ticketBody');
            }
            if (firstInvalidField) {
                showSupportMessage('Проверьте выделенные поля перед отправкой.', 'error');
                firstInvalidField.focus();
                return;
            }

            const tickets = getTickets();
            tickets.push({
                id: Date.now(),
                author: user,
                title,
                category: TICKET_CATEGORIES[category] ? category : 'general',
                body,
                status: 'open',
                date: new Date().toISOString()
            });
            saveTickets(tickets);
            document.getElementById('ticketForm').reset();
            document.getElementById('ticketBodyCount').textContent = '0';
            syncSupportTopicButtons('general');
            supportTicketFilter = 'all';
            syncTicketFilterButtons();
            renderTickets();
            updateTicketStats();
            showSupportMessage('Обращение создано. Его статус уже появился в истории ниже.', 'success');
        }

        function renderTickets() {
            const container = document.getElementById('ticketList');
            const filters = document.getElementById('supportTicketFilters');
            const count = document.getElementById('ticketResultCount');
            const historyTitle = document.getElementById('supportHistoryTitle');
            const historyDescription = document.getElementById('supportHistoryDescription');
            const scope = getSupportTicketScope();

            historyTitle.textContent = scope.isAdmin ? 'Все обращения' : 'Мои обращения';
            historyDescription.textContent = scope.isAdmin
                ? 'Администратор видит обращения всех пользователей и их текущий статус.'
                : 'Здесь появятся созданные вами тикеты и их текущий статус.';
            filters.hidden = !scope.user || scope.tickets.length === 0;

            const visibleTickets = scope.tickets
                .filter(ticket => supportTicketFilter === 'all' || ticket.status === supportTicketFilter)
                .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
            count.textContent = formatTicketCount(visibleTickets.length);

            if (!scope.user) {
                container.innerHTML = `
                    <div class="support-empty">
                        <span class="support-empty-icon"><i class="fas fa-lock" aria-hidden="true"></i></span>
                        <h4>История доступна после входа</h4>
                        <p>Авторизуйтесь, чтобы создать обращение и отслеживать его статус на любом разделе сайта.</p>
                        <button type="button" class="btn btn-primary" data-support-login><i class="fas fa-right-to-bracket" aria-hidden="true"></i> Войти</button>
                    </div>`;
                return;
            }

            if (visibleTickets.length === 0) {
                const hasTickets = scope.tickets.length > 0;
                container.innerHTML = `
                    <div class="support-empty">
                        <span class="support-empty-icon"><i class="fas ${hasTickets ? 'fa-filter-circle-xmark' : 'fa-inbox'}" aria-hidden="true"></i></span>
                        <h4>${hasTickets ? 'По этому фильтру ничего нет' : 'Обращений пока нет'}</h4>
                        <p>${hasTickets ? 'Выберите другой статус, чтобы увидеть остальные обращения.' : 'Заполните форму выше — новый тикет сразу появится здесь.'}</p>
                    </div>`;
                return;
            }

            container.innerHTML = visibleTickets.map(ticket => {
                const categoryKey = TICKET_CATEGORIES[ticket.category] ? ticket.category : 'general';
                const category = TICKET_CATEGORIES[categoryKey];
                const isAnswered = ticket.status === 'answered';
                const date = new Date(ticket.date);
                const dateLabel = Number.isNaN(date.getTime()) ? 'Дата не указана' :
                    date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const ticketNumber = String(ticket.id || '').slice(-6).padStart(6, '0');
                const authorMeta = scope.isAdmin
                    ? `<span><i class="fas fa-user" aria-hidden="true"></i>${escapeUserHTML(ticket.author || 'Неизвестно')}</span>`
                    : '';
                return `
                    <article class="ticket-item">
                        <div class="ticket-item-top">
                            <span class="ticket-type-icon ${categoryKey}"><i class="fas ${category.icon}" aria-hidden="true"></i></span>
                            <div class="ticket-heading">
                                <div class="ticket-kicker"><span>Тикет #${ticketNumber}</span><span>·</span><span>${category.label}</span></div>
                                <h4>${escapeUserHTML(ticket.title || 'Без заголовка')}</h4>
                            </div>
                            <span class="ticket-status ${isAnswered ? 'answered' : 'open'}">${isAnswered ? 'Есть ответ' : 'Открыт'}</span>
                        </div>
                        <p class="ticket-body">${escapeUserHTML(ticket.body || 'Описание не добавлено.')}</p>
                        <footer class="ticket-meta">
                            <span><i class="fas fa-calendar" aria-hidden="true"></i>${dateLabel}</span>
                            ${authorMeta}
                        </footer>
                    </article>`;
            }).join('');
        }

        function updateTicketStats() {
            const scope = getSupportTicketScope();
            document.getElementById('totalTicketsLabel').textContent = scope.isAdmin ? 'Все тикеты' : 'Мои тикеты';
            document.getElementById('totalTickets').textContent = scope.tickets.length;
            document.getElementById('openTickets').textContent = scope.tickets.filter(ticket => ticket.status === 'open').length;
            document.getElementById('avgResponseTime').textContent = '~2 ч';
        }

        function updateSupportUI() {
            const isLoggedIn = Boolean(getSession());
            const submit = document.getElementById('supportSubmitBtn');
            submit.innerHTML = isLoggedIn
                ? '<span>Отправить обращение</span><i class="fas fa-arrow-right" aria-hidden="true"></i>'
                : '<span>Войти и создать тикет</span><i class="fas fa-right-to-bracket" aria-hidden="true"></i>';
            showSupportMessage();
        }

        document.getElementById('ticketForm').addEventListener('submit', createTicket);
        document.getElementById('ticketTitle').addEventListener('input', function() {
            if (this.value.trim().length >= 4) setSupportFieldError('ticketTitleField', 'ticketTitleError');
            showSupportMessage();
        });
        document.getElementById('ticketBody').addEventListener('input', function() {
            document.getElementById('ticketBodyCount').textContent = String(this.value.length);
            if (this.value.trim().length >= 12) setSupportFieldError('ticketBodyField', 'ticketBodyError');
            showSupportMessage();
        });
        document.getElementById('ticketCategory').addEventListener('change', function() {
            syncSupportTopicButtons(this.value);
        });
        document.querySelectorAll('[data-support-category]').forEach(button => {
            button.addEventListener('click', function() {
                document.getElementById('ticketCategory').value = this.dataset.supportCategory;
                syncSupportTopicButtons(this.dataset.supportCategory);
                document.getElementById('ticketTitle').focus();
            });
        });
        document.querySelectorAll('[data-ticket-filter]').forEach(button => {
            button.addEventListener('click', function() {
                supportTicketFilter = this.dataset.ticketFilter;
                syncTicketFilterButtons();
                renderTickets();
            });
        });
        document.getElementById('ticketList').addEventListener('click', function(event) {
            if (event.target.closest('[data-support-login]')) openModal('loginModal');
        });
        syncSupportTopicButtons(document.getElementById('ticketCategory').value);

        // ============================================================
        // 15. ЛОАДЕР
        // ============================================================
        let loaderDownloadInterval = null;

        function showLoaderMessage(message = '', type = 'success') {
            const messageBox = document.getElementById('loaderStatus');
            messageBox.className = 'loader-message';
            if (!message) {
                messageBox.hidden = true;
                messageBox.textContent = '';
                return;
            }
            if (type === 'error') messageBox.classList.add('is-error');
            const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
            messageBox.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${escapeUserHTML(message)}</span>`;
            messageBox.hidden = false;
        }

        function updateLoaderProgress(progress, label) {
            const roundedProgress = Math.round(progress);
            document.getElementById('loaderProgressBar').style.width = roundedProgress + '%';
            document.getElementById('loaderProgressText').textContent = roundedProgress + '%';
            document.getElementById('loaderProgressLabel').textContent = label;
            document.getElementById('loaderProgressTrack').setAttribute('aria-valuenow', String(roundedProgress));
        }

        function updateLoaderUI() {
            const user = getCurrentUserData();
            const hasAccess = Boolean(user && hasSubscription(user));
            const accessCard = document.getElementById('loaderAccessCard');
            const liveStatus = accessCard.querySelector('.loader-access-live');
            const accessIcon = document.getElementById('loaderAccessIcon');
            const accessTitle = document.getElementById('loaderAccessStatus');
            const accessMeta = document.getElementById('loaderAccessMeta');
            const downloadButton = document.getElementById('downloadLoaderBtn');

            accessCard.classList.toggle('is-locked', !hasAccess);
            liveStatus.innerHTML = hasAccess
                ? '<i aria-hidden="true"></i> Active'
                : '<i aria-hidden="true"></i> Locked';
            accessIcon.innerHTML = hasAccess
                ? '<i class="fas fa-crown" aria-hidden="true"></i>'
                : '<i class="fas fa-lock" aria-hidden="true"></i>';
            accessTitle.textContent = hasAccess ? 'Premium access' : 'Доступ закрыт';
            accessMeta.textContent = hasAccess
                ? 'Активен до ' + new Date(user.subscription).toLocaleDateString('ru-RU')
                : (user ? 'Активируйте подписку в Store' : 'Войдите в аккаунт для проверки доступа');

            if (!loaderDownloadInterval) {
                downloadButton.innerHTML = hasAccess
                    ? '<i class="fas fa-cloud-arrow-down" aria-hidden="true"></i><span>Запустить демо-загрузку</span>'
                    : '<i class="fas fa-lock" aria-hidden="true"></i><span>Нужна активная подписка</span>';
            }
        }

        document.getElementById('downloadLoaderBtn').addEventListener('click', function(e) {
            const user = getCurrentUserData();
            if (!user) {
                showLoaderMessage('Войдите в аккаунт, чтобы открыть загрузку.', 'error');
                openModal('loginModal');
                return;
            }
            if (!hasSubscription(user)) {
                showLoaderMessage('Подписка не активна. Выберите подходящий доступ в Store.', 'error');
                return;
            }
            if (loaderDownloadInterval) return;

            const btn = this;
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            const pointerX = e.clientX || rect.left + rect.width / 2;
            const pointerY = e.clientY || rect.top + rect.height / 2;
            ripple.style.left = (pointerX - rect.left - size / 2) + 'px';
            ripple.style.top = (pointerY - rect.top - size / 2) + 'px';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);

            showLoaderMessage();
            updateLoaderProgress(0, 'Подготовка пакета');
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Подготовка...</span>';
            let progress = 0;
            loaderDownloadInterval = setInterval(() => {
                progress += Math.random() * 8 + 2;
                if (progress > 100) progress = 100;
                const progressLabel = progress < 24 ? 'Подготовка пакета' :
                    progress < 88 ? 'Демо-загрузка' : progress < 100 ? 'Проверка сборки' : 'Загрузка завершена';
                updateLoaderProgress(progress, progressLabel);
                if (progress >= 100) {
                    clearInterval(loaderDownloadInterval);
                    loaderDownloadInterval = null;
                    btn.disabled = false;
                    btn.removeAttribute('aria-busy');
                    btn.innerHTML = '<i class="fas fa-rotate-right" aria-hidden="true"></i><span>Повторить демо-загрузку</span>';
                    showLoaderMessage('Демо-загрузка завершена. Реальный файл в этой версии проекта не создаётся.');
                }
            }, 120);
        });

        // ============================================================
        // 16. ПРОФИЛЬ
        // ============================================================
        let profileMessageTimer = null;

        function showProfileMessage(text, type = 'success') {
            const message = document.getElementById('profileMessage');
            clearTimeout(profileMessageTimer);
            message.textContent = text;
            message.classList.toggle('error', type === 'error');
            message.hidden = !text;
            if (text) {
                profileMessageTimer = setTimeout(() => {
                    message.hidden = true;
                }, 4200);
            }
        }

        const profileAvatarInput = document.getElementById('profileAvatarInput');

        document.getElementById('avatarContainer').addEventListener('click', function() {
            const user = getCurrentUserData();
            if (!user) {
                showProfileMessage('Войдите в аккаунт, чтобы изменить аватар.', 'error');
                openModal('loginModal');
                return;
            }
            profileAvatarInput.value = '';
            profileAvatarInput.click();
        });

        profileAvatarInput.addEventListener('change', function(event) {
            const user = getCurrentUserData();
            const file = event.target.files[0];
            if (!user || !file) return;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                showProfileMessage('Выберите изображение PNG, JPG или WEBP.', 'error');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showProfileMessage('Изображение слишком большое. Максимальный размер — 2 МБ.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(loadEvent) {
                const users = getUsers();
                const index = users.findIndex(item => item.username === user.username);
                if (index < 0) return;
                users[index].avatar = loadEvent.target.result;
                try {
                    saveUsers(users);
                    updateUI();
                    showProfileMessage('Аватар обновлён.');
                } catch (error) {
                    showProfileMessage('Не удалось сохранить изображение. Попробуйте файл меньшего размера.', 'error');
                }
            };
            reader.readAsDataURL(file);
        });

        const profileNameForm = document.getElementById('profileNameForm');
        const profileNameInput = document.getElementById('profileNameInput');
        const profileNameError = document.getElementById('profileNameError');

        function closeProfileNameEditor() {
            profileNameForm.hidden = true;
            profileNameError.hidden = true;
            profileNameError.textContent = '';
            document.getElementById('profileEditNameBtn').focus();
        }

        function editNick() {
            const user = getCurrentUserData();
            if (!user) {
                showProfileMessage('Войдите в аккаунт, чтобы изменить ник.', 'error');
                openModal('loginModal');
                return;
            }
            profileNameInput.value = user.username;
            profileNameForm.hidden = false;
            profileNameError.hidden = true;
            requestAnimationFrame(() => {
                profileNameInput.focus();
                profileNameInput.select();
            });
        }

        document.getElementById('profileEditNameBtn').addEventListener('click', editNick);
        document.getElementById('profileNameCancel').addEventListener('click', closeProfileNameEditor);

        profileNameForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const user = getCurrentUserData();
            if (!user) return;
            const newNick = profileNameInput.value.trim();
            profileNameError.hidden = true;
            profileNameError.textContent = '';

            if (newNick.length < 3 || newNick.length > 24) {
                profileNameError.textContent = 'Ник должен содержать от 3 до 24 символов.';
                profileNameError.hidden = false;
                profileNameInput.focus();
                return;
            }
            if (newNick === user.username) {
                closeProfileNameEditor();
                return;
            }

            const users = getUsers();
            if (users.some(item => item.username.toLocaleLowerCase('ru-RU') === newNick.toLocaleLowerCase('ru-RU'))) {
                profileNameError.textContent = 'Этот ник уже занят.';
                profileNameError.hidden = false;
                profileNameInput.focus();
                return;
            }

            const index = users.findIndex(item => item.username === user.username);
            users[index].username = newNick;
            saveUsers(users);
            setSession(newNick);
            const files = getFiles();
            files.forEach(file => { if (file.author === user.username) file.author = newNick; });
            saveFiles(files);
            const tickets = getTickets();
            tickets.forEach(ticket => { if (ticket.author === user.username) ticket.author = newNick; });
            saveTickets(tickets);
            const chat = getChat();
            chat.forEach(message => { if (message.user === user.username) message.user = newNick; });
            saveChat(chat);
            updateUI();
            closeProfileNameEditor();
            showProfileMessage('Ник изменён на ' + newNick + '.');
        });

        document.querySelectorAll('[data-profile-page]').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelector(`.nav-link[data-page="${this.dataset.profilePage}"]`)?.click();
            });
        });

        document.getElementById('profilePrimaryAction').addEventListener('click', function() {
            const action = this.dataset.profileAction;
            if (action === 'login') openModal('loginModal');
            if (action === 'store' || action === 'loader') {
                document.querySelector(`.nav-link[data-page="${action}"]`)?.click();
            }
        });

        // ============================================================
        // 17. UI ОБНОВЛЕНИЕ
        // ============================================================
        function updateUI() {
            const user = getCurrentUserData();
            const isLoggedIn = !!user;
            const hasSub = user ? hasSubscription(user) : false;

            const authDiv = document.getElementById('authButtons');
            if (isLoggedIn) {
                const userInitial = user.username.charAt(0).toUpperCase();
                authDiv.innerHTML = `
                        <span id="userInfo" class="user-chip" title="${user.username}">
                            <span class="user-chip-avatar" aria-hidden="true">${userInitial}</span>
                            <span class="user-chip-copy">
                                <strong>${user.username}</strong>
                                <small>${hasSub ? 'Premium access' : 'Базовый доступ'}</small>
                            </span>
                        </span>
                        <a href="#" class="btn nav-logout" id="logoutBtn" aria-label="Выйти из аккаунта">
                            <i class="fas fa-right-from-bracket" aria-hidden="true"></i><span class="logout-label">Выйти</span>
                        </a>
                    `;
            } else {
                authDiv.innerHTML = `
                        <a href="#" class="btn nav-auth-link" id="loginBtn">
                            <i class="fas fa-right-to-bracket" aria-hidden="true"></i><span>Вход</span>
                        </a>
                        <a href="#" class="btn btn-primary nav-auth-link" id="registerBtn">
                            <i class="fas fa-user-plus" aria-hidden="true"></i><span>Регистрация</span>
                        </a>
                    `;
            }

            document.getElementById('profileName').textContent = isLoggedIn ? user.username : 'Гость';
            document.getElementById('profileCoins').textContent = isLoggedIn ? user.coins.toLocaleString('ru-RU') : '0';
            const userFiles = getFiles().filter(f => f.author === (isLoggedIn ? user.username : ''));
            document.getElementById('profileUploads').textContent = userFiles.length;
            const chatCount = getChat().filter(m => m.user === (isLoggedIn ? user.username : '')).length;
            document.getElementById('profileChatCount').textContent = chatCount;
            document.getElementById('profileBio').textContent = isLoggedIn ? (user.bio || 'Нет описания') :
                'Войдите, чтобы увидеть свой профиль.';
            document.getElementById('profileEmail').textContent = isLoggedIn ? (user.email || '—') : '—';

            document.getElementById('profileRegistered').textContent = isLoggedIn ? new Date(user.registered)
                .toLocaleDateString('ru-RU') : '—';
            document.getElementById('profileLastLogin').textContent = isLoggedIn && user.lastLogin ? new Date(user.lastLogin)
                .toLocaleString('ru-RU') : '—';

            const profileRoles = document.getElementById('profileRoles');
            const profileMemberType = document.getElementById('profileMemberType');
            const profileAccessCard = document.querySelector('.profile-access-card');
            const profileAccessIcon = document.getElementById('profileAccessIcon');
            const profileAccessTitle = document.getElementById('profileAccessTitle');
            const profileSub = document.getElementById('profileSub');
            const profilePrimaryAction = document.getElementById('profilePrimaryAction');

            if (isLoggedIn) {
                const flags = getUserFlags(user);
                profileRoles.innerHTML = renderUserRoles(user);
                profileMemberType.textContent = flags.isAdmin ? 'Admin' : flags.isDev ? 'Developer' :
                    flags.isCoder ? 'Coder' : hasSub ? 'Premium' : 'Member';
            } else {
                profileRoles.innerHTML = '<span class="user-role-chip"><i class="fas fa-user" aria-hidden="true"></i> Guest</span>';
                profileMemberType.textContent = 'Guest';
            }

            profileAccessCard.classList.toggle('is-premium', hasSub);
            profileAccessIcon.innerHTML = hasSub
                ? '<i class="fas fa-crown" aria-hidden="true"></i>'
                : '<i class="fas fa-lock" aria-hidden="true"></i>';
            profileAccessTitle.textContent = hasSub ? 'Premium access' : 'Basic access';
            profileSub.textContent = hasSub
                ? 'Активен до ' + new Date(user.subscription).toLocaleDateString('ru-RU')
                : (isLoggedIn ? 'Подписка не активна' : 'Доступен после входа');

            if (!isLoggedIn) {
                profilePrimaryAction.dataset.profileAction = 'login';
                profilePrimaryAction.innerHTML = '<i class="fas fa-right-to-bracket" aria-hidden="true"></i><span>Войти в аккаунт</span>';
            } else if (hasSub) {
                profilePrimaryAction.dataset.profileAction = 'loader';
                profilePrimaryAction.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i><span>Открыть Loader</span>';
            } else {
                profilePrimaryAction.dataset.profileAction = 'store';
                profilePrimaryAction.innerHTML = '<i class="fas fa-crown" aria-hidden="true"></i><span>Выбрать доступ</span>';
            }

            const avatarImg = document.getElementById('avatarImg');
            const avatarIcon = document.getElementById('avatarIcon');
            if (isLoggedIn && user.avatar) {
                avatarImg.src = user.avatar;
                avatarImg.hidden = false;
                avatarIcon.hidden = true;
            } else {
                avatarImg.hidden = true;
                avatarIcon.hidden = false;
            }
            document.getElementById('avatarContainer').setAttribute('aria-label', isLoggedIn ? 'Изменить аватар' : 'Войти, чтобы изменить аватар');
            document.getElementById('profileEditNameBtn').setAttribute('aria-label', isLoggedIn ? 'Изменить ник' : 'Войти, чтобы изменить ник');

            const profileFilesList = document.getElementById('profileFilesList');
            if (userFiles.length === 0) {
                profileFilesList.innerHTML = '<div class="profile-files-empty"><i class="fas fa-folder-plus" aria-hidden="true"></i><span>Загрузок пока нет</span></div>';
            } else {
                profileFilesList.innerHTML = userFiles.map(f => `
                        <div class="file-item">
                            <span class="name">${escapeUserHTML(f.name)}</span>
                            <span>${new Date(f.uploaded).toLocaleDateString('ru-RU')}</span>
                        </div>
                    `).join('');
            }

            document.getElementById('navCfg').style.display = (isLoggedIn && hasSub) ? 'inline-flex' : 'none';
            document.getElementById('navLoader').style.display = (isLoggedIn && hasSub) ? 'inline-flex' : 'none';
            document.getElementById('uploadArea').hidden = !(isLoggedIn && hasSub);

            updateStoreUI();
            updateSupportUI();
            updateLoaderUI();

            const activePage = document.querySelector('.nav-link.active');
            if (activePage) {
                const page = activePage.dataset.page;
                if ((page === 'cfg' || page === 'loader') && !(isLoggedIn && hasSub)) {
                    document.querySelector('.nav-link[data-page="store"]').click();
                }
            }

            renderFiles();
            renderTickets();
            updateTicketStats();
            renderChat();
            renderUsers();
        }

        // ============================================================
        // 18. НАВИГАЦИЯ
        // ============================================================
        const siteHeader = document.getElementById('siteHeader');
        const menuToggle = document.getElementById('menuToggle');
        const mobileNavQuery = window.matchMedia('(max-width: 760px)');

        function setMobileMenu(open, restoreFocus = false) {
            const shouldOpen = Boolean(open && mobileNavQuery.matches);
            siteHeader.classList.toggle('menu-open', shouldOpen);
            menuToggle.setAttribute('aria-expanded', String(shouldOpen));
            menuToggle.setAttribute('aria-label', shouldOpen ? 'Закрыть меню' : 'Открыть меню');
            document.body.classList.toggle('nav-open', shouldOpen);

            if (shouldOpen) {
                setTimeout(() => {
                    siteHeader.querySelector('.nav-link.active:not([style*="display:none"])')?.focus();
                }, 60);
            } else if (restoreFocus && mobileNavQuery.matches) {
                menuToggle.focus();
            }
        }

        function closeMobileMenu(restoreFocus = false) {
            setMobileMenu(false, restoreFocus);
        }

        menuToggle.addEventListener('click', () => {
            setMobileMenu(!siteHeader.classList.contains('menu-open'));
        });

        document.getElementById('brandHome').addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector('.nav-link[data-page="home"]').click();
        });

        document.addEventListener('click', function(e) {
            if (siteHeader.classList.contains('menu-open') && !siteHeader.contains(e.target)) {
                closeMobileMenu(false);
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && siteHeader.classList.contains('menu-open')) {
                closeMobileMenu(true);
            }
        });

        mobileNavQuery.addEventListener('change', function(e) {
            if (!e.matches) closeMobileMenu(false);
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const pageId = this.dataset.page;
                const user = getCurrentUserData();
                const hasSub = user ? hasSubscription(user) : false;
                if ((pageId === 'cfg' || pageId === 'loader') && !(user && hasSub)) {
                    alert('Доступ к этой вкладке только с активной подпиской!');
                    return;
                }
                document.querySelectorAll('.nav-link').forEach(l => {
                    l.classList.remove('active');
                    l.removeAttribute('aria-current');
                });
                this.classList.add('active');
                this.setAttribute('aria-current', 'page');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('page-' + pageId).classList.add('active');
                if (pageId === 'loader') {
                    updateLoaderUI();
                    renderChat();
                }
                if (pageId === 'users') renderUsers();
                if (pageId === 'support') {
                    updateSupportUI();
                    renderTickets();
                    updateTicketStats();
                }
                closeMobileMenu(true);
            });
        });

        document.querySelectorAll('.home-page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetPage = this.dataset.targetPage;
                document.querySelector(`.nav-link[data-page="${targetPage}"]`)?.click();
            });
        });

        document.querySelectorAll('.home-scroll-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href'))?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    block: 'start'
                });
            });
        });

        document.querySelectorAll('.sub-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.sub-link').forEach(l => {
                    const isActive = l === this;
                    l.classList.toggle('active', isActive);
                    l.setAttribute('aria-selected', String(isActive));
                });
                const sub = this.dataset.sub;
                document.querySelectorAll('.subpage').forEach(p => p.classList.remove('active'));
                document.getElementById('sub-' + sub).classList.add('active');
                updateLibraryMode(true);
                renderFiles();
            });
        });

        // ============================================================
        // 19. ИНИЦИАЛИЗАЦИЯ
        // ============================================================
        window.addEventListener('load', function() {
            setTimeout(() => document.getElementById('preloader').classList.add('hide'), 800);
            updateUI();
            renderFiles();
            renderTickets();
            updateTicketStats();
            renderChat();
            renderUsers();

            // Проверим, есть ли maesto (для уверенности)
            const users = getUsers();
            if (!users.find(u => u.username === 'maesto')) {
                users.push({
                    username: 'maesto',
                    password: 'maesto123',
                    email: 'maesto@pt.cc',
                    coins: 9999,
                    subscription: '2027-12-31',
                    bio: 'Разработчик и кодер',
                    roles: ['developer', 'coder'],
                    avatar: '',
                    registered: new Date().toISOString(),
                    lastLogin: null
                });
                saveUsers(users);
            }
        });

        setInterval(() => {
            if (document.getElementById('page-loader').classList.contains('active')) {
                renderChat();
            }
        }, 5000);

        console.log('🔥 PastaTeam|cc с кубом, maesto и приватными чатами загружен! Слава Императору!');
        console.log('👤 Аккаунт maesto | пароль: maesto123');
    
