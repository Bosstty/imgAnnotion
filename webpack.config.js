var path = require('path');
var webpack = require('webpack');
var CleanPlugin = require('clean-webpack-plugin');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var TerserJSPlugin = require('terser-webpack-plugin');
var OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

// 根据环境变量不同获取不同的配置文件
var shell = require('shelljs');

shell.cp('-R', './src/config/production.env.js', './src/config/env.js');

const resolvePath = dir => {
    return path.resolve(__dirname, dir);
};

var webpackConfig = {
    mode: 'production',
    devtool: false,
    // cheap-source-map
    // 指定spa应用的入口文件
    entry: {
        app: ['babel-polyfill', path.resolve(__dirname, 'src/main.js')],
    },
    // 指定项目构建的输出位置
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'js/app_[hash:8].js',
        // 为了做代码的异步加载。注意：这点之前是加点的，然后我在修改的时候给去掉了，如果有问题在给加回来
        publicPath: '/',
        // 分块名称设置
        chunkFilename: 'js/[name]_[chunkhash:8]_chunk.js',
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                    loaders: {
                        js: ['babel-loader'],
                        css: 'style-loader!css-loader!postcss-loader',
                        scss: 'style-loader!css-loader!postcss-loader!sass-loader',
                        sass: 'style-loader!css-loader!postcss-loader!sass-loader',
                    },
                },
            },
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'test'),
                    path.resolve(__dirname, 'example'),
                ],
                use: [
                    {
                        loader: 'babel-loader',
                    },
                ],
            },
            {
                test: /\.yaml$/,
                exclude: /node_modules/,
                loader: 'yaml-loader',
            },
            // 处理在js中引用css文件
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../',
                        },
                    },
                    'css-loader',
                    'postcss-loader',
                ],
            },
            // 处理在js中引用scss文件
            {
                test: /\.scss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../',
                        },
                    },
                    'css-loader',
                    'postcss-loader',
                    'sass-loader',
                ],
            },
            // 处理在js中引用less文件
            {
                test: /\.less$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../',
                        },
                    },
                    'css-loader',
                    'postcss-loader',
                    'less-loader',
                ],
            },
            {
                test: /\.svg$/,
                loader: 'svg-sprite-loader',
                include: [path.resolve(__dirname, 'src/icon')],
                options: {
                    symbolId: 'icon-[name]',
                },
            },
            // 处理图片操作
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                use: 'url-loader?limit=10240&name=./img/[name]_[hash:8].[ext]',
                exclude: [path.resolve(__dirname, 'src/icon')],
            },
            // 处理音频文件
            {
                test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                use: 'url-loader?limit=10000&name=./media/[name]_[hash:8].[ext]',
            },
            // 处理字体文件
            {
                test: /\.(eot|woff|ttf|woff2)$/,
                use: 'url-loader?limit=10000&name=./font/[name]_[hash:8].[ext]',
            },
            {
                test: /\.(csv|tsv)$/,
                use: ['csv-loader'],
            },
            {
                test: /\.xml$/,
                use: ['xml-loader'],
            },
        ],
    },
    externals: {
        window: 'window',
        jquery: 'window.jQuery',
    },
    resolve: {
        extensions: ['.js', '.vue', '.json', '.less', '.scss'],
        alias: {
            '@': resolvePath('src'),
        },
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            minSize: 10000,
            minChunks: 2,
            maxAsyncRequests: 10,
            maxInitialRequests: 10,
            name: true,
            cacheGroups: {
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                },
                commons: {
                    name: 'vendors-commons',
                    chunks: 'async',
                    minChunks: 3, // 最小公用次数
                    priority: 5,
                    reuseExistingChunk: true,
                },
                libs: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'all',
                    priority: 20,
                    name: 'vendors-libs',
                },
                asyncLibs: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'async',
                    priority: 21,
                    name: 'vendors-asynclibs',
                },
                elementUI: {
                    test: /[\\/]node_modules[\\/]element-ui[\\/]/,
                    chunks: 'async',
                    priority: 35, // 权重要大于 libs 和 app 不然会被打包进 libs 或者 app
                    name: 'vendors-elementUI', // 单独将 elementUI 拆包
                },
                echarts: {
                    name: 'vendors-echarts', // 单独将 echart 拆包
                    chunks: 'async',
                    priority: 31, // 权重要大于 libs 和 app 不然会被打包进 libs 或者 app
                    test: /[\\/]node_modules[\\/]echarts[\\/]/,
                },
                konva: {
                    name: 'vendors-konva', // 单独将 konva 拆包
                    chunks: 'async',
                    priority: 34, // 权重要大于 libs 和 app 不然会被打包进 libs 或者 app
                    test: /[\\/]node_modules[\\/]konva[\\/]/,
                },
                three: {
                    name: 'vendors-three', // 单独将 three 拆包
                    chunks: 'async',
                    priority: 33, // 权重要大于 libs 和 app 不然会被打包进 libs 或者 app
                    test: /[\\/]node_modules[\\/]three[\\/]/,
                },
                styles: {
                    name: 'app',
                    chunks: 'initial',
                    test: /\.css$/,
                    enforce: true,
                },
                manifest: {
                    name: 'manifest',
                    minChunks: Infinity,
                },
            },
        },
        runtimeChunk: 'single',
        minimizer: [
            new TerserJSPlugin({
                cache: true,
                parallel: true,
                sourceMap: false, // set to true if you want JS source maps
                // exclude: /\/node_modules\/three\//
            }),
            new OptimizeCSSAssetsPlugin({
                cssProcessorOptions: {
                    safe: true,
                },
            }),
        ],
    },
    plugins: [
        // 删除文件夹的插件
        new CleanPlugin(['dist']),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'assets',
                    to: 'assets/',
                },
            ],
        }),

        // 抽取样式文件的插件
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: 'css/[name]_[hash:8].css',
            // chunkFilename: "[id].css"
        }),
        // 自动生成html插件
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './template.html',
            inject: true,
            minify: {
                caseSensitive: true,
                collapseBooleanAttributes: true,
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true,
                preventAttributesEscaping: true,
                removeAttributeQuotes: true,
                removeComments: true,
                removeCommentsFromCDATA: true,
                removeEmptyAttributes: true,
                removeOptionalTags: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
            },
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: true,
        }),
        // 压缩混淆js代码插件
        new TerserJSPlugin({
            parallel: true,
            // sourceMap: process.env.PROJECT_ENV !== 'production',
            terserOptions: {
                // ie8: false,
                // ecma: 8,
                mangle: {
                    // screw_ie8: true,
                    keep_fnames: false,
                },
                output: {
                    comments: false,
                    beautify: false,
                    // safari10: true,
                },
                compress: {
                    drop_debugger: true,
                    pure_funcs: ['console.log'], // 移除指定函数调用
                    drop_console: true,
                },
                // exclude: /\/node_modules\/three\//
                // warnings: false
            },
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: '"production"',
            },
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
        }),
    ],
};

module.exports = webpackConfig;
