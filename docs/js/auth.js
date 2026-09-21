/**
 * AuthManager - Gestión de autenticación con Firebase
 * Soporta: Email/Password, Email/Link y Anonymous
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

    validatePassword(password) {
        const errors = [];
        if (!password || password.length < 8) {
            errors.push('Mínimo 8 caracteres');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Al menos una mayúscula');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Al menos una minúscula');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Al menos un número');
        }
        return { valid: errors.length === 0, errors };
    }

    async register(email, password) {
        if (!email || !email.trim()) {
            throw new Error('El email es obligatorio');
        }

        const validation = this.validatePassword(password);
        if (!validation.valid) {
            throw new Error('Contraseña no cumple requisitos: ' + validation.errors.join(', '));
        }

        const result = await firebase.auth().createUserWithEmailAndPassword(email.trim(), password);
        return result.user;
    }

    async login(email, password) {
        if (!email || !email.trim()) {
            throw new Error('El email es obligatorio');
        }
        if (!password) {
            throw new Error('La contraseña es obligatoria');
        }

        const result = await firebase.auth().signInWithEmailAndPassword(email.trim(), password);
        return result.user;
    }

    async resetPassword(email) {
        if (!email || !email.trim()) {
            throw new Error('El email es obligatorio');
        }

        await firebase.auth().sendPasswordResetEmail(email.trim());
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
