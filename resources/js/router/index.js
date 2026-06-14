import { createRouter, createWebHistory } from 'vue-router';

import LoginPage from '../pages/LoginPage.vue';
import SettingsPage from '../pages/SettingsPage.vue';

const routes = [
    {
        path: '/',
        redirect: '/settings',
    },
    {
        path: '/login',
        component: LoginPage,
    },
    {
        path: '/settings',
        component: SettingsPage,
    },
];

export default createRouter({
    history: createWebHistory(),
    routes,
});
