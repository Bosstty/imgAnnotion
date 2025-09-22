import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { MessageBox } from 'element-ui';

Vue.config.productionTip = false;

Vue.use(ElementUI);

new Vue({
    router,
    store,
    render: h => h(App),
}).$mount('#app');

Vue.prototype.$confirm = function (message, title = '提示', options = {}) {
    const defaultOptions = {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        center: false,
        showCancelButton: true,
        closeOnClickModal: false,
        closeOnPressEscape: true,
        beforeClose: null,
    };

    const finalOptions = Object.assign({}, defaultOptions, options);

    return MessageBox.confirm(message, title, finalOptions);
};
