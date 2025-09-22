const { defineConfig } = require('@vue/cli-service');
module.exports = defineConfig({
    transpileDependencies: true,
});
module.exports = { devServer: { disableHostCheck: true } };
module.exports = {
    devServer: {
        allowedHosts: 'all',
    },
};
