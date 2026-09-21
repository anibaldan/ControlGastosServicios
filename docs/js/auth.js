/**
 * AuthManager - Gestión de autenticación con Firebase
 * Soporta: Email/Link (magic link) y Anonymous
 */

class AuthManager {
    constructor() {
        this.user = null;
        this.db = null;
        this._onAuthChangeCallbacks = [];
    }

    init(firebaseApp) {
        this.db = firebaseApp;
    }

    onAuthChange(callback) {
        this._onAuthChangeCallbacks.push(callback);
    }

    _notifyAuthChange(user) {
        this.user = user;
        this._onAuthChangeCallbacks.forEach(cb => cb(user));
    }

    getUser() {
        return this.user;
    }

    getUserId() {
        return this.user ? this.user.uid : null;
    }

    isAuthenticated() {
        return this.user !== null && !this.user.isAnonymous;
    }

    isAnonymous() {
        return this.user !== null && this.user.isAnonymous;
    }

    async sendLoginLink(email) {
        if (!email || !email.trim()) {
            throw new Error('El email es obligatorio');
        }

        const actionCodeSettings = {
            url: window.location.href.split('?')[0],
            handleCodeInApp: true
        };

        await sendSignInLinkToEmail(this.db.auth, email.trim(), actionCodeSettings);
        localStorage.setItem('emailForSignIn', email.trim());
    }

    async signInWithEmailLink(email) {
        if (!email || !email.trim()) {
            throw new Error('El email es obligatorio');
        }

        const result = await signInWithEmailLink(this.db.auth, email.trim(), window.location.href);
        localStorage.removeItem('emailForSignIn');
        return result.user;
    }

    async signInAnonymously() {
        const result = await signInAnonymously(this.db.auth);
        return result.user;
    }

    async signOut() {
        await this.db.signOut();
        this._notifyAuthChange(null);
    }
}

const authManager = new AuthManager();
