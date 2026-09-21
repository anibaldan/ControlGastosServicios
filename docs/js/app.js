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

    } catch (error) {
        console.error('Error iniciando aplicacion:', error);
        document.body.innerHTML = `<div style="padding:20px;color:red;"><h1>Error al inicializar la aplicacion</h1><p>${error.message}</p></div>`;
    }
}

async function reloadApp() {
    if (!uiManager) return;

    activeDb = authManager.isAuthenticated() ? firestoreDb : db;
    uiManager.db = activeDb;
    uiManager.service = new PaymentService(activeDb);

    await uiManager.service.initializeDefaults();
    await uiManager.reloadSelectOptions();
    await uiManager.updateResumenHoy();
}

function setupLoginModal() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginCancelBtn = document.getElementById('loginCancelBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });
    }

    if (loginCancelBtn) {
        loginCancelBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const statusEl = document.getElementById('loginStatus');

            try {
                statusEl.textContent = 'Enviando enlace...';
                statusEl.className = 'login-status info';
                statusEl.style.display = 'block';

                await authManager.sendLoginLink(email);
                statusEl.textContent = 'Enlace enviado a ' + email + '. Revisa tu correo.';
                statusEl.className = 'login-status success';
            } catch (error) {
                statusEl.textContent = 'Error: ' + error.message;
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

function showToast(message, type = 'info') {
    if (uiManager) {
        uiManager.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
