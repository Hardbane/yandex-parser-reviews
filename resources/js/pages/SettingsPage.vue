<script setup>
import axios from 'axios';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const user = ref(null);
const yandexUrl = ref('');
const organization = ref(null);

const reviews = ref([]);
const pagination = ref(null);

const loading = ref(true);
const saving = ref(false);
const reviewsLoading = ref(false);

const error = ref('');
const success = ref('');

let pollingInterval = null;



async function refreshOrganization() {
    saving.value = true;
    error.value = '';
    success.value = '';

    try {
        const response = await axios.post('/api/organization/refresh');

        organization.value = response.data.organization;
        success.value = response.data.message;

        startPolling();
    } catch (e) {
        error.value =
            e.response?.data?.message ||
            'Не удалось запустить обновление';
    } finally {
        saving.value = false;
    }
}
function startPolling() {
    stopPolling();

    pollingInterval = setInterval(async () => {
        await loadOrganization();

        if (
            organization.value &&
            ['success', 'failed'].includes(organization.value.parse_status)
        ) {
            stopPolling();
        }
    }, 5000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

async function loadUser() {
    const response = await axios.get('/api/me');
    user.value = response.data.user;
}

async function loadOrganization() {
    const response = await axios.get('/api/organization');

    organization.value = response.data.organization;

    if (organization.value) {
        yandexUrl.value = organization.value.yandex_url;
        await loadReviews();
    }
}

async function loadReviews(page = 1) {
    reviewsLoading.value = true;

    try {
        const response = await axios.get('/api/reviews', {
            params: { page },
        });

        organization.value = response.data.organization;
        reviews.value = response.data.reviews.data;
        pagination.value = {
            current_page: response.data.reviews.current_page,
            last_page: response.data.reviews.last_page,
            total: response.data.reviews.total,
            from: response.data.reviews.from,
            to: response.data.reviews.to,
        };
    } finally {
        reviewsLoading.value = false;
    }
}

async function saveOrganization() {
    saving.value = true;
    error.value = '';
    success.value = '';

    try {
        const response = await axios.post('/api/organization', {
            yandex_url: yandexUrl.value,
        });

        organization.value = response.data.organization;
        success.value = response.data.message;
        startPolling();

        await loadReviews();
    } catch (e) {
        error.value =
            e.response?.data?.message ||
            e.response?.data?.errors?.yandex_url?.[0] ||
            'Не удалось сохранить ссылку';
    } finally {
        saving.value = false;
    }
}

async function logout() {
    await axios.post('/api/logout');
    router.push('/login');
}

onMounted(async () => {
    try {
        await loadUser();
        await loadOrganization();
    } catch (e) {
        router.push('/login');
    } finally {
        loading.value = false;
    }
});

onUnmounted(() => {
    stopPolling();
});
</script>

<template>
    <main class="page page-top">
        <section class="card card-wide">
            <p v-if="loading">Загрузка...</p>

            <template v-else>
                <div class="topbar">
                    <div>
                        <h1>Настройки</h1>
                        <p>
                            Вы вошли как:
                            <strong>{{ user?.email }}</strong>
                        </p>
                    </div>

                    <button class="secondary" @click="logout">
                        Выйти
                    </button>
                </div>

                <form @submit.prevent="saveOrganization">
                    <label>
                        Ссылка на организацию в Яндекс.Картах
                        <input
                            v-model="yandexUrl"
                            type="url"
                            placeholder="https://yandex.ru/maps/org/..."
                        />
                    </label>

                    <button type="submit" :disabled="saving">
                        {{ saving ? 'Сохраняем и парсим...' : 'Сохранить и загрузить отзывы' }}
                    </button>
                    <button
                        v-if="organization"
                        class="secondary refresh-button"
                        :disabled="saving || organization.parse_status === 'parsing'"
                        @click="refreshOrganization"
                    >
                        Обновить отзывы
                    </button>
                </form>

                <p v-if="success" class="success">{{ success }}</p>
                <p v-if="error" class="error">{{ error }}</p>

                <div v-if="organization" class="organization-box">
                    <h2>{{ organization.title || 'Организация' }}</h2>

                    <p>
                        <strong>Ссылка:</strong>
                        {{ organization.yandex_url }}
                    </p>

                    <div class="stats">
                        <div>
                            <span>Средний рейтинг</span>
                            <strong>{{ organization.rating ?? '—' }}</strong>
                        </div>

                        <div>
                            <span>Количество оценок</span>
                            <strong>{{ organization.ratings_count }}</strong>
                        </div>

                        <div>
                            <span>Количество отзывов</span>
                            <strong>{{ organization.reviews_count }}</strong>
                        </div>

                        <div>
                            <span>Статус</span>
                            <strong>{{ organization.parse_status }}</strong>
                            <p v-if="organization.parsed_at">
                                Последнее обновление:
                                {{ organization.parsed_at }}
                            </p>
                            <p v-if="organization.parse_error" class="error">
                                {{ organization.parse_error }}
                            </p>
                        </div>
                    </div>
                </div>

                <div v-if="organization" class="reviews-section">
                    <div class="reviews-header">
                        <h2>Отзывы</h2>

                        <p v-if="pagination">
                            Показаны {{ pagination.from }}–{{ pagination.to }}
                            из {{ pagination.total }}
                        </p>
                    </div>

                    <p v-if="reviewsLoading">Загружаем отзывы...</p>

                    <template v-else>
                        <div v-if="reviews.length === 0" class="empty">
                            Отзывов пока нет.
                        </div>

                        <article
                            v-for="review in reviews"
                            :key="review.id"
                            class="review-card"
                        >
                            <div class="review-top">
                                <strong>{{ review.author || 'Без имени' }}</strong>
                                <span>{{ review.review_date || 'Без даты' }}</span>
                            </div>

                            <div class="rating">
                                Оценка: {{ review.rating ?? '—' }}
                            </div>

                            <p>{{ review.text || 'Без текста' }}</p>
                        </article>

                        <div
                            v-if="pagination && pagination.last_page > 1"
                            class="pagination"
                        >
                            <button
                                class="secondary"
                                :disabled="pagination.current_page === 1"
                                @click="loadReviews(pagination.current_page - 1)"
                            >
                                Назад
                            </button>

                            <span>
                                Страница {{ pagination.current_page }}
                                из {{ pagination.last_page }}
                            </span>

                            <button
                                class="secondary"
                                :disabled="pagination.current_page === pagination.last_page"
                                @click="loadReviews(pagination.current_page + 1)"
                            >
                                Вперёд
                            </button>
                        </div>
                    </template>
                </div>
            </template>
        </section>
    </main>
</template>
