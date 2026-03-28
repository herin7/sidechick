import globals from "globals";

const sharedRules = {
    "no-const-assign": "warn",
    "no-this-before-super": "warn",
    "no-undef": "warn",
    "no-unreachable": "warn",
    "no-unused-vars": "warn",
    "constructor-super": "warn",
    "valid-typeof": "warn",
};

export default [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "backend/node_modules/**",
            "webview-ui/node_modules/**",
        ],
    },
    {
        files: ["webview-ui/src/**/*.js", "webview-ui/src/**/*.jsx"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            ...sharedRules,
            "no-unused-vars": "off",
        },
    },
    {
        files: ["webview-ui/vite.config.js"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: sharedRules,
    },
    {
        files: ["**/*.js"],
        ignores: ["webview-ui/src/**/*.js", "webview-ui/src/**/*.jsx", "webview-ui/vite.config.js"],
        languageOptions: {
            globals: {
                ...globals.commonjs,
                ...globals.node,
                ...globals.mocha,
            },
            ecmaVersion: 2022,
            sourceType: "commonjs",
        },
        rules: sharedRules,
    },
];
