const webpack = require("webpack");
const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
    entry: "./index.js",
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "build"),
        library: {
            type: "commonjs2",
        },
    },
    plugins: [new webpack.IgnorePlugin({ resourceRegExp: /^(axios)$/u })],
    target: "node",
    mode: "production",
    externals: [nodeExternals()],
};
