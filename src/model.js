import { writable } from './writable.js';
import { DEFAULT_VARIANTS } from './variants.js';

export class User {
    constructor(name, answer = '') {
        this.id = (Math.random() * 1000000 | 0) + '';
        this.name = name ?? 'User ' + this.id;
        this.answer = answer;
    }
}

export class Room {
    constructor() {
        this.users = writable([]);
        this.question = writable('');
        this.variants = writable(DEFAULT_VARIANTS);
    }
}