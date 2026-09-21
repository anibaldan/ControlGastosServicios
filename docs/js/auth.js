/**
 * AuthManager - Gestión de autenticación con Firebase
 * Soporta: Email/Link (magic link) y Anonymous
 */

class AuthManager {
    constructor() {
        this.user = null;
        this.firebaseApp = null;
        this._onAuthChangeCallbacks = [];
    }

    init(firebaseApp) {
        this.firebaseApp = firebaseApp;
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

        await firebase.auth().sendSignInLinkToEmail(email.trim(), actionCodeSettings);
        localStorage.setItem('emailForSignIn', email.trim());
    }

    async signInWithEmailLink(email) {
        if (!email || !email.trim()) {
            throw new Error('El email es obligatorio');
        }

        const result = await firebase.auth().signInWithEmailLink(email.trim(), window.location.href);
        localStorage.removeItem('emailForSignIn');
        return result.user;
    }

    async signInAnonymously() {
        const result = await firebase.auth().signInAnonymously();
        return result.user;
    }

    async signOut() {
        await firebase.auth().signOut();
        this._notifyAuthChange(null);
    }
}

const authManager = new AuthManager();
