import http from 'http';
import fs from 'fs';
import ws from 'ws';
import mimeTypes from './mime-types.js';
import { USERS, QUESTION, ANSWER, NAME, CONNECT, VARIANTS, KICK } from './actions.js';
import { User, Room } from './model.js';

const PORT = process.env.PORT || 3000;

const server = http
    .createServer(async (req, res) => {
        let path = './src' + req.url.split('?')[0];
        if (path.endsWith('/')) {
            path += 'index.html';
        }
        const stat = await fs.promises.stat(path).catch(() => null);
        if (!stat) {
            path += '.html';
        } else if (stat.isDirectory()) {
            path += '/index.html';
        }

        fs.promises
            .stat(path)
            .then(() => {
                const ext = path.split('.').slice(-1)[0].toLowerCase();
                const mimeType = mimeTypes[ext];
                if (mimeType) {
                    res.setHeader('Content-Type', mimeType + ';charset=UTF-8');
                }
                fs.createReadStream(path).pipe(res);
            })
            .catch(() => {
                res.statusCode = 404;
                res.end('Not found');
            });

    })
    .listen(PORT);

const wss = new ws.Server({ server });

const rooms = {};

wss.on('connection', ws => {
    const user = new User();

    ws.send(JSON.stringify({
        type: CONNECT,
        payload: user.id
    }));

    let usersStore;
    let questionStore;
    let variantsStore;

    let unsubUsers = () => { };
    let unsubQuestion = () => { };
    let unsubVariants = () => { };

    ws.on('message', messageStr => {
        const action = JSON.parse(messageStr);
        switch (action.type) {
            case CONNECT:
                const roomId = action.payload;
                if (!rooms[roomId]) {
                    rooms[roomId] = new Room();
                }
                usersStore = rooms[roomId].users;
                questionStore = rooms[roomId].question;
                variantsStore = rooms[roomId].variants;
                usersStore.set(users => [...users, user]);
                unsubUsers = usersStore.subscribe(users => {
                    ws.send(JSON.stringify({
                        type: USERS,
                        payload: users
                    }));
                });
                unsubQuestion = questionStore.subscribe(q => {
                    ws.send(JSON.stringify({
                        type: QUESTION,
                        payload: q
                    }));
                });
                unsubVariants = variantsStore.subscribe(v => {
                    ws.send(JSON.stringify({
                        type: VARIANTS,
                        payload: v
                    }));
                });
                break;
            case NAME:
                usersStore.set(users => {
                    user.name = action.payload;
                    return [...users];
                });
                break;
            case QUESTION:
                questionStore.set(action.payload);
                usersStore.set(users => {
                    users.forEach(u => u.answer = '');
                    return [...users];
                })
                break;
            case ANSWER:
                usersStore.set(users => {
		    if (user.answer === action.payload) {
		        user.answer = '';
		    } else {
                        user.answer = action.payload;
		    }
                    return [...users];
                });
                break;
            case VARIANTS:
                variantsStore.set(action.payload);
                usersStore.set(users => {
                    users.forEach(u => {
                        if (!action.payload.includes(u.answer)) {
                            u.answer = '';
                        }
                    });
                    return [...users];
                });
                break;
            case KICK:
                usersStore.set(users => users.filter(u => u.id !== action.payload));
                break;
        }
    });

    ws.on('close', () => {
        usersStore && usersStore.set(users => users.filter(u => u !== user));
        unsubUsers();
        unsubQuestion();
        unsubVariants();
    });
});
