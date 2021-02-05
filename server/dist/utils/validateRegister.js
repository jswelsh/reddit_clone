"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = void 0;
const validateRegister = (options) => {
    if (options.username.length <= 2) {
        return [
            {
                field: 'username',
                message: "Username isn't long enough, must be greater than two characters in length"
            }
        ];
    }
    if (options.username.includes('@')) {
        return [
            {
                field: 'username',
                message: 'Username cannot include an "@"'
            }
        ];
    }
    if (!options.email.includes('@')) {
        return [
            {
                field: 'email',
                message: "Invalid email"
            }
        ];
    }
    if (options.password.length <= 3) {
        return [
            {
                field: 'password',
                message: "Password isn't long enough, must be greater than three characters in length"
            }
        ];
    }
    return null;
};
exports.validateRegister = validateRegister;
//# sourceMappingURL=validateRegister.js.map