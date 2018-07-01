const path = require('path');
const NODE_ENV = process.env.NODE_ENV;
const IS_PROD = NODE_ENV !== 'development' ? true : false;
const WATCH_FILES = IS_PROD ? false : true;
const DEV_TOOL = IS_PROD ? 'none' : 'eval-source-map';  // in future we can move from 'none' -> 'source-map'

module.exports = {
    devtool: DEV_TOOL,
    entry: './index.js',
    mode: NODE_ENV,
    watch: WATCH_FILES,
    module: {
        rules: [
            {
                test: /index\.js$/,
                exclude: /node_modules/,
                use: [
                    'babel-loader',
                    'eslint-loader'
                ]
            },
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'htmldiff.js',
        publicPath: '/dist/',
        library: 'HtmlDiff',
        libraryTarget: 'umd'
    }
};