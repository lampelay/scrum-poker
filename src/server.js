import http from 'http';
import fs from 'fs';
import ws from 'ws';
import mimeTypes from './mime-types.js';
import { USERS, QUESTION, ANSWER, NAME, CONNECT, VARIANTS } from './actions.js';
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

    let users;
    let question;
    let variants;

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
                users = rooms[roomId].users;
                question = rooms[roomId].question;
                variants = rooms[roomId].variants;
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
                unsubVariants = variants.subscribe(v => {
                    ws.send(JSON.stringify({
                        type: VARIANTS,
                        payload: v
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
            case VARIANTS:
                variants.set(action.payload);
                users.set(usrs => {
                    usrs.forEach(u => {
                        if (!action.payload.includes(u.answer)) {
                            u.answer = '';
                        }
                    });
                    return [...usrs];
                });
                break;
        }
    });

    ws.on('close', () => {
        users && users.set(usrs => usrs.filter(u => u !== user));
        unsubUsers();
        unsubQuestion();
        unsubVariants();
    });
});