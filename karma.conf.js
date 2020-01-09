module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ["jasmine", "karma-typescript"],
        plugins: [
            'karma-chrome-launcher',
            'karma-jasmine',
            'karma-jasmine-html-reporter',
            'karma-typescript',
        ],
        files: [
            "src/**/*.ts",
            "tests/*.ts"
        ],
        preprocessors: {
            "**/*.ts": "karma-typescript"
        },
        client: {
            clearContext: false
        },
        reporters: ["progress", "karma-typescript", "kjhtml"],
        browsers: ["Chrome"],
        karmaTypescriptConfig: {
            "compilerOptions": {
                "target": "es6",
                "module": "commonjs",
                "declaration": true,
                "strict": true,
                "suppressImplicitAnyIndexErrors": true,
                "strictPropertyInitialization": false,
                "strictNullChecks": false
            },
            "exclude": ["node_modules"]
        }
    });
};