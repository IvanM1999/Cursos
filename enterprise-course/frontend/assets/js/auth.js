/**
 * MÓDULO DE AUTENTICAÇÃO
 * Gerencia login, logout e controle de sessão
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
    }

    /**
     * Verificar autenticação
     */
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/verify');
            const data = await response.json();

            if (data.authenticated) {
                this.isAuthenticated = true;
                this.currentUser = data.data;
            } else {
                this.isAuthenticated = false;
                this.currentUser = null;
            }

            return this.isAuthenticated;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    /**
     * Fazer login
     */
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                if (data.token) {
                    setToken(data.token);
                }
                this.isAuthenticated = true;
                this.currentUser = data.data;
                return { success: true, message: 'Login realizado' };
            } else {
                return { success: false, message: data.message || 'Erro no login' };
            }
        } catch (error) {
            return { success: false, message: 'Erro ao conectar ao servidor' };
        }
    }

    /**
     * Fazer registro
     */
    async signup(name, email, password) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, message: 'Conta criada com sucesso' };
            } else {
                return { success: false, message: data.message || 'Erro ao criar conta' };
            }
        } catch (error) {
            return { success: false, message: 'Erro ao conectar ao servidor' };
        }
    }

    /**
     * Fazer logout
     */
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST'
            });

            this.isAuthenticated = false;
            this.currentUser = null;
            localStorage.removeItem('token');

            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verificar se está autenticado
     */
    isLoggedIn() {
        return this.isAuthenticated;
    }

    /**
     * Verificar permissão
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (!this.currentUser.permissions) return false;
        return this.currentUser.permissions.includes(permission);
    }
}

/**
 * GERENCIADOR DE SESSÃO
 */
class SessionManager {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
        this.warningTime = 5 * 60 * 1000; // 5 minutos antes
        this.init();
    }

    init() {
        // Iniciar monitoramento de inatividade
        document.addEventListener('click', () => this.resetTimer());
        document.addEventListener('keypress', () => this.resetTimer());
        this.startTimer();
    }

    startTimer() {
        this.timer = setTimeout(() => {
            this.onSessionExpired();
        }, this.sessionTimeout);

        // Aviso antes do timeout
        this.warningTimer = setTimeout(() => {
            this.onSessionWarning();
        }, this.sessionTimeout - this.warningTime);
    }

    resetTimer() {
        clearTimeout(this.timer);
        clearTimeout(this.warningTimer);
        this.startTimer();
    }

    onSessionWarning() {
        showNotification('Sua sessão expira em 5 minutos de inatividade', 'warning');
    }

    onSessionExpired() {
        showNotification('Sua sessão expirou. Faça login novamente.', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }

    extendSession() {
        this.resetTimer();
        showNotification('Sessão estendida', 'success', 1000);
    }
}

/**
 * PROTETOR DE ROTA
 */
class RouteProtector {
    /**
     * Proteger rota que requer autenticação
     */
    static async protectRoute(requireAuth = true) {
        const auth = new AuthManager();
        const isLoggedIn = await auth.checkAuth();

        if (requireAuth && !isLoggedIn) {
            window.location.href = '/login';
            return false;
        }

        if (!requireAuth && isLoggedIn) {
            window.location.href = '/';
            return false;
        }

        return true;
    }
}

/**
 * Instanciar gerenciadores globais
 */
const authManager = new AuthManager();
const sessionManager = new SessionManager();

console.log('✅ Módulo de autenticação carregado');
