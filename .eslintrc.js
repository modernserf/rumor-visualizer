module.exports = {
    "parser": "babel-eslint",
    "plugins": [
        "react",
        "jest",
    ],
    "extends": [
        "standard",
        "plugin:react/recommended",
        "plugin:jest/recommended",
    ],
    "rules": {
        "indent": ["error", 4],
        "comma-dangle": ["error", "always-multiline"],
        "react/prop-types": ["off"],
        "object-curly-spacing": ["error", "always"],
        "react/display-name": ["off"],
    },
    "env": {
        "jest/globals": true
    },
};
