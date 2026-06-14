<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

const email = ref('test@example.com');
const password = ref('password');
const loading = ref(false);
const error = ref('');

async function login() {
    loading.value = true;
    error.value = '';

    try {
        await axios.get('/sanctum/csrf-cookie');

        await axios.post('/api/login', {
            email: email.value,
            password: password.value,
        });

        router.push('/settings');
    } catch (e) {
        error.value = e.response?.data?.message || 'Ошибка входа';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <main class="page">
        <section class="card">
            <h1>Вход</h1>

            <form @submit.prevent="login">
                <label>
                    Email
                    <input v-model="email" type="email" />
                </label>

                <label>
                    Пароль
                    <input v-model="password" type="password" />
                </label>

                <button type="submit" :disabled="loading">
                    {{ loading ? 'Входим...' : 'Войти' }}
                </button>

                <p v-if="error" class="error">{{ error }}</p>
            </form>
        </section>
    </main>
</template>
