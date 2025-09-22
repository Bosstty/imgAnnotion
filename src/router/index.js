import Vue from 'vue';
import VueRouter from 'vue-router';

// 导入页面组件
import Login from '@/views/Login.vue';
import Annotation from '@/views/Annotation.vue';

// 使用 VueRouter 插件
Vue.use(VueRouter);

// 定义路由配置
const routes = [
    {
        path: '/',
        name: 'Login',
        component: Login,
        meta: {
            title: '登录页面',
        },
    },
    {
        path: '/annotation',
        name: 'Annotation',
        component: Annotation,
        meta: {
            title: '智能标注平台',
        },
    },

    {
        path: '*',
        redirect: '/',
    },
];

// 创建路由实例
const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes,
});

// 路由守卫 - 登录验证
router.beforeEach((to, from, next) => {
    // 设置页面标题
    if (to.meta.title) {
        document.title = to.meta.title;
    }

    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

    if (to.path !== '/' && !isLoggedIn) {
        next('/');
        return;
    }

    if (to.path === '/' && isLoggedIn) {
        next('/annotation');
        return;
    }

    next();
});

export default router;
