export class DuplicatedKeyError extends Error {
    constructor(message) {
        super(message);
        this.name = "DuplicatedKeyError";
    }
}

export class EmptyKeyError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmptyKeyError";
    }
}

export class EmptyValueError extends Error {
    constructor(message) {
        super(message);
        this.name = "EmptyValueError";
    }
}