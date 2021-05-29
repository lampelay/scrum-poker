import http from 'http';
import fs from 'fs';
import ws from 'ws';
import { writable } from './writable.js';
import mimeTypes from './mime-types.js';
import { USERS, QUESTION, ANSWER, NAME, CONNECT } from './actions.js';

http.createServer((req, res) => {
    let path = './src' + req.url.split('?')[0];
    if (path.endsWith('/')) {
        path += 'index.html';
    }

    if (!fs.existsSync(path)) {
        path += '.html';
    }

    if (fs.existsSync(path)) {
        const ext = path.split('.').slice(-1)[0].toLowerCase();
        const mimeType = mimeTypes[ext];
        if (mimeType) {
            res.setHeader('Content-Type', mimeType + ';charset=UTF-8');
        }
        fs.createReadStream(path).pipe(res);
    } else {
        res.statusCode = 404;
        res.end('Not found');
    }
}).listen(5002);

const wss = new ws.Server({ port: 5003 });

class User {
    constructor(name, answer = '') {
        this.id = (Math.random() * 1000000 | 0) + '';
        this.name = name ?? 'User ' + this.id;
        this.answer = answer;
    }
}

class Room {
    constructor() {
        this.users = writable([]);
        this.question = writable('');
    }
}

const rooms = {};

wss.on('connection', ws => {
    const user = new User();

    ws.send(JSON.stringify({
        type: CONNECT,
        payload: user.id
    }));

    let users;
    let question;

    let unsubUsers = () => { };

    let unsubQuestion = () => { };

    ws.on('message', messageStr => {
        const action = JSON.parse(messageStr);
        switch (action.type) {
            case CONNECT:
                const roomId = action.payload;
                if (!rooms[roomId]) {
                    rooms[roomId] = new Room();
                }
                users = rooms[roomId].users;
                question = rooms[roomId].question;
                unsubUsers = users.subscribe(usrs => {
                    ws.send(JSON.stringify({
                        type: USERS,
                        payload: usrs
                    }));
                });
                unsubQuestion = question.subscribe(q => {
                    ws.send(JSON.stringify({
                        type: QUESTION,
                        payload: q
                    }));
                });
                users.set(usrs => {
                    usrs.push(user);
                    return [...usrs];
                });
                break;
            case NAME:
                users.set(usrs => {
                    user.name = action.payload;
                    return [...usrs];
                });
                break;
            case QUESTION:
                question.set(action.payload);
                users.set(usrs => {
                    usrs.forEach(u => u.answer = '');
                    return [...usrs];
                })
                break;
            case ANSWER:
                users.set(usrs => {
                    user.answer = action.payload;
                    return [...usrs];
                });
                break;
        }
    });

    ws.on('close', () => {
        users && users.set(usrs => usrs.filter(u => u !== user));
        unsubUsers();
        unsubQuestion();
    });
});