const path = require('path');

/** @type {import('webpack').Configuration} */
const config = {
    target: 'node',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            'uuid': require.resolve('uuid')
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    stats: {
        errorDetails: true
    },
    ignoreWarnings: [
        {
            module: /node_modules\/prettier\/index\.js/,
            message: /Critical dependency: the request of a dependency is an expression/
        },
        {
            module: /node_modules\/prettier\/third-party\.js/,
            message: /Critical dependency: the request of a dependency is an expression/
        },
        {
            module: /node_modules\/prettier\/index\.js/,
            message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/
        }
    ]
};

module.exports = config;