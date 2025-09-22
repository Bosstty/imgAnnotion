<template>
    <div class="login-container">
        <div class="login-wrapper">
            <div class="login-header">
                <h2>LogIn</h2>
                <!-- <p>请输入您的登录凭据</p> -->
            </div>

            <form class="form" @submit.prevent="handleLogin">
                <span class="input-span">
                    <label for="username" class="label">用户名</label>
                    <input
                        type="text"
                        name="username"
                        id="username"
                        v-model="loginForm.username"
                        required
                    />
                </span>

                <span class="input-span">
                    <label for="password" class="label">密码</label>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        v-model="loginForm.password"
                        required
                    />
                </span>

                <input
                    class="submit"
                    type="submit"
                    :value="loading ? '登录中...' : '登录'"
                    :disabled="loading"
                />

                <div v-if="errorMessage" class="error-message">
                    {{ errorMessage }}
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Login',
    data() {
        return {
            loginForm: {
                username: '',
                password: '',
            },
            loading: false,
            errorMessage: '',

            credentials: {
                username: 'cqt',
                passwordHash: 'a495a8d32bfb8e209eaff14ccb84ef91808f84272467dbd841eac53c98769b70',
            },
        };
    },
    mounted() {
        if (sessionStorage.getItem('isLoggedIn') === 'true') {
            this.$router.push('/annotation');
        }
    },
    methods: {
        async handleLogin() {
            this.loading = true;
            this.errorMessage = '';

            try {
                if (this.loginForm.username !== this.credentials.username) {
                    this.errorMessage = '用户名或密码错误';
                    this.loading = false;
                    return;
                }
                const inputPasswordHash = await this.sha256(this.loginForm.password);
                console.log(inputPasswordHash, this.credentials.passwordHash, 'in', 'passwordHash');
                if (inputPasswordHash !== this.credentials.passwordHash) {
                    this.errorMessage = '用户名或密码错误';
                    this.loading = false;
                    return;
                }

                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('username', this.credentials.username);

                this.loginForm = {
                    username: '',
                    password: '',
                };

                this.$router.push('/annotation');
            } catch (error) {
                this.errorMessage = '登录过程中出现错误，请重试';
                console.error('Login error:', error);
            } finally {
                this.loading = false;
            }
        },

        async sha256(message) {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        },
    },
};
</script>

<style type="scss">
body {
    background: #2a2a2a;
}
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    /* background: linear-gradient(135deg, #efefef 0%, #d4d4d4 50%, #b8b8b8 100%); */
    font-family: 'Courier New', Courier, monospace;
    padding: 20px;
}

.login-wrapper {
    font-family: 'Courier New', Courier, monospace;
    background: rgba(38, 36, 36, 0.95);
    backdrop-filter: blur(10px);
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
}

.login-header {
    text-align: center;
    margin-bottom: 30px;
}

.login-header h2 {
    margin: 0 0 8px 0;
    color: #58bc82;
    font-size: 28px;
    font-weight: 600;
}

.login-header p {
    margin: 0;
    color: #707070;
    font-size: 16px;
}

.form {
    --bg-light: #efefef;
    --bg-dark: #707070;
    --clr: #58bc82;
    --clr-alpha: #9c9c9c60;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
}

.form .input-span {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form input[type='text'],
.form input[type='password'] {
    border-radius: 0.5rem;
    padding: 1rem 0.75rem;
    width: 100%;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--clr-alpha);
    outline: 2px solid var(--bg-dark);
    box-sizing: border-box;
    font-size: 16px;
    transition: all 0.3s ease;
}

.form input[type='text']:focus,
.form input[type='password']:focus {
    outline: 2px solid var(--clr);
}

.label {
    align-self: flex-start;
    color: var(--clr);
    font-weight: 600;
    font-size: 14px;
}

.form .submit {
    font-family: 'Courier New', Courier, monospace;
    padding: 1rem 0.75rem;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 3rem;
    background-color: var(--bg-dark);
    color: var(--bg-light);
    border: none;
    cursor: pointer;
    transition: all 300ms;
    font-weight: 600;
    font-size: 0.9rem;
    box-sizing: border-box;
}

.form .submit:hover:not(:disabled) {
    background-color: var(--clr);
    color: var(--bg-dark);
}

.form .submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background-color: var(--bg-dark);
}

/* 错误信息样式 */
.error-message {
    width: 100%;
    background-color: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 12px;
    border-radius: 0.5rem;
    font-size: 14px;
    text-align: center;
    animation: shake 0.5s ease-in-out;
}

@keyframes shake {
    0%,
    100% {
        transform: translateX(0);
    }
    25% {
        transform: translateX(-3px);
    }
    75% {
        transform: translateX(3px);
    }
}

/* 响应式设计 - 黑色主题适配 */
@media (max-width: 480px) {
    .login-container {
        padding: 15px;
        background: #2a2a2a;
    }

    .login-wrapper {
        padding: 30px 25px;
        background: #3a3a3a;
    }

    .login-header h2 {
        font-size: 24px;
        color: #ffffff;
    }

    .form input[type='text'],
    .form input[type='password'] {
        padding: 14px 12px;
    }

    .form .submit {
        padding: 14px;
    }
}

@media (max-width: 360px) {
    .login-wrapper {
        padding: 25px 20px;
        background: #3a3a3a;
    }
}
</style>
