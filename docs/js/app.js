/**
 * app.js - Inicialización de la aplicación con soporte Firebase
 */

let uiManager = null;
let activeDb = null;

async function initializeApp() {
    try {
        let dbToUse;

        await db.init();

        if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
            const firebaseApp = firebase.initializeApp(firebaseConfig);
            const firebaseAuth = firebase.auth();

            firestoreDb.init(firebaseApp, firebaseAuth);
            authManager.init(firebaseApp);

            const user = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 5000);
                firebase.auth().onAuthStateChanged((user) => {
                    clearTimeout(timeout);
                    resolve(user);
                });
            });

            if (user && !user.isAnonymous) {
                firestoreDb.setUser(user.uid);
                dbToUse = firestoreDb;
                console.log('Usando Firestore - usuario autenticado:', user.email || user.uid);
            } else {
                dbToUse = db;
                console.log('Usando IndexedDB - sin autenticación');
            }

            authManager._notifyAuthChange(user);

            authManager.onAuthChange(async (user) => {
                updateAuthUI(user);
                if (user && !user.isAnonymous) {
                    firestoreDb.setUser(user.uid);
                    dbToUse = firestoreDb;
                    console.log('Cambiado a Firestore - usuario:', user.email || user.uid);
                    await reloadApp();
                } else {
                    dbToUse = db;
                    console.log('Cambiado a IndexedDB');
                    await reloadApp();
                }
            });
        } else {
            dbToUse = db;
            console.log('Firebase no disponible - usando IndexedDB');
        }

        activeDb = dbToUse;

        const serviceDb = dbToUse;
        const tempPaymentService = new PaymentService(serviceDb);
        await tempPaymentService.initializeDefaults();

        uiManager = new UIManager(tempPaymentService, chartManager, serviceDb);
        await uiManager.reloadSelectOptions();
        await uiManager.updateResumenHoy();

        setupLoginModal();
        updateAuthUI(authManager.getUser());

    } catch (error) {
        console.error('Error iniciando aplicacion:', error);
        document.body.innerHTML = `<div style="padding:20px;color:red;"><h1>Error al inicializar la aplicacion</h1><p>${error.message}</p></div>`;
    }
}

async function reloadApp() {
    if (!uiManager) return;

    const wasAuthenticated = authManager.isAuthenticated();
    activeDb = wasAuthenticated ? firestoreDb : db;
    uiManager.db = activeDb;
    uiManager.service = new PaymentService(activeDb);

    await uiManager.service.initializeDefaults();
    await uiManager.reloadSelectOptions();
    await uiManager.updateResumenHoy();

    if (wasAuthenticated) {
        showToast('Sesión iniciada - datos sincronizados con la nube', 'success');
    }
}

let isRegisterMode = false;

function setupLoginModal() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginCancelBtn = document.getElementById('loginCancelBtn');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const passwordInput = document.getElementById('loginPassword');
    const passwordHint = document.getElementById('passwordHint');
    const passwordGroup = document.getElementById('passwordGroup');

    function resetModal() {
        isRegisterMode = false;
        if (authModalTitle) authModalTitle.textContent = 'Iniciar Sesión';
        if (authSubmitBtn) authSubmitBtn.textContent = 'Iniciar Sesión';
        if (toggleAuthMode) toggleAuthMode.textContent = 'Crear cuenta nueva';
        if (forgotPasswordLink) forgotPasswordLink.style.display = 'block';
        if (passwordGroup) passwordGroup.style.display = 'block';
        if (passwordHint) passwordHint.style.display = 'none';
        if (passwordInput) passwordInput.removeAttribute('minlength');
        loginForm.reset();
        document.getElementById('loginStatus').style.display = 'none';
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            resetModal();
            loginModal.style.display = 'block';
        });
    }

    if (loginCancelBtn) {
        loginCancelBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
            resetModal();
        });
    }

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            if (isRegisterMode) {
                authModalTitle.textContent = 'Crear Cuenta';
                authSubmitBtn.textContent = 'Crear Cuenta';
                toggleAuthMode.textContent = 'Ya tengo cuenta, iniciar sesión';
                forgotPasswordLink.style.display = 'none';
                passwordHint.style.display = 'block';
            } else {
                authModalTitle.textContent = 'Iniciar Sesión';
                authSubmitBtn.textContent = 'Iniciar Sesión';
                toggleAuthMode.textContent = 'Crear cuenta nueva';
                forgotPasswordLink.style.display = 'block';
                passwordHint.style.display = 'none';
            }
            document.getElementById('loginStatus').style.display = 'none';
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const statusEl = document.getElementById('loginStatus');

            if (!email) {
                statusEl.textContent = 'Ingresa tu email para recuperar la contraseña';
                statusEl.className = 'login-status error';
                statusEl.style.display = 'block';
                return;
            }

            try {
                statusEl.textContent = 'Enviando enlace de recuperación...';
                statusEl.className = 'login-status info';
                statusEl.style.display = 'block';

                await authManager.resetPassword(email);
                statusEl.textContent = 'Enviado. Revisa tu correo para restablecer la contraseña.';
                statusEl.className = 'login-status success';
            } catch (error) {
                statusEl.textContent = 'Error: ' + error.message;
                statusEl.className = 'login-status error';
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            if (!isRegisterMode) return;
            const password = passwordInput.value;
            const validation = authManager.validatePassword(password);
            if (password.length === 0) {
                passwordHint.textContent = '8+ caracteres, mayúscula, minúscula y número';
                passwordHint.className = 'password-hint';
            } else if (validation.valid) {
                passwordHint.textContent = 'Contraseña válida';
                passwordHint.className = 'password-hint valid';
            } else {
                passwordHint.textContent = validation.errors.join(' · ');
                passwordHint.className = 'password-hint invalid';
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const statusEl = document.getElementById('loginStatus');

            try {
                statusEl.textContent = isRegisterMode ? 'Creando cuenta...' : 'Iniciando sesión...';
                statusEl.className = 'login-status info';
                statusEl.style.display = 'block';

                if (isRegisterMode) {
                    await authManager.register(email, password);
                    statusEl.textContent = 'Cuenta creada correctamente';
                    statusEl.className = 'login-status success';
                } else {
                    await authManager.login(email, password);
                    statusEl.textContent = 'Sesión iniciada correctamente';
                    statusEl.className = 'login-status success';
                }

                loginModal.style.display = 'none';
                resetModal();
            } catch (error) {
                let msg = error.message;
                if (msg.includes('auth/email-already-in-use')) msg = 'Este email ya está registrado. Iniciá sesión.';
                else if (msg.includes('auth/user-not-found')) msg = 'No existe una cuenta con este email.';
                else if (msg.includes('auth/wrong-password')) msg = 'Contraseña incorrecta.';
                else if (msg.includes('auth/invalid-email')) msg = 'Email inválido.';
                else if (msg.includes('auth/weak-password')) msg = 'La contraseña es muy débil (mínimo 6 caracteres).';
                statusEl.textContent = 'Error: ' + msg;
                statusEl.className = 'login-status error';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await authManager.signOut();
                showToast('Sesión cerrada', 'info');
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            }
        });
    }

    if (window.location.href.includes('continueUrl') || window.location.search.includes('mode=signIn')) {
        handleEmailLinkSignIn();
    }
}

async function handleEmailLinkSignIn() {
    const email = localStorage.getItem('emailForSignIn');
    if (email) {
        try {
            await authManager.signInWithEmailLink(email);
            localStorage.removeItem('emailForSignIn');
            showToast('Sesión iniciada correctamente', 'success');
        } catch (error) {
            console.error('Error al iniciar sesión con link:', error);
        }
    }
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const header = document.querySelector('.header h1');

    if (user && !user.isAnonymous) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-flex';
            logoutBtn.textContent = user.email || 'Cerrar Sesión';
        }
        if (header) header.textContent = 'Control de Gastos - ' + (user.email || '');
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (header) header.textContent = 'Control de Gastos de Servicios';
    }
}

function showToast(message, type = 'info') {
    if (uiManager) {
        uiManager.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
