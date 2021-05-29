import { writable } from './writable.js';
import { USERS, QUESTION, ANSWER, NAME, CONNECT } from './actions.js';

const answerVariants = ['3', '5', '13', '?'];

const usersStore = writable([]);
const questionStore = writable('');
let userId = '';

const roomId = new URLSearchParams(location.search).get('id');
if (!roomId) {
    location.href = '/';
}

const roomIdField = document.getElementById('room');
roomIdField.textContent = location;

const s = new WebSocket(`ws://${location.hostname}:5003`);

s.onopen = () => {
    s.send(JSON.stringify({
        type: CONNECT,
        payload: roomId
    }));
    const name = localStorage.getItem('userName');
    if (name) {
        s.send(JSON.stringify({
            type: NAME,
            payload: name
        }));
    }
}

s.onmessage = e => {
    const action = JSON.parse(e.data);
    switch (action.type) {
        case CONNECT:
            userId = action.payload;
            break;
        case USERS:
            usersStore.set(action.payload);
            break;
        case QUESTION:
            questionStore.set(action.payload);
            break;
    }
}

const questionField = document.getElementById('questionField');

questionField.addEventListener('change', e => {
    s.send(JSON.stringify({
        type: QUESTION,
        payload: questionField.value
    }));
    questionField.blur();
});

questionStore.subscribe(q => questionField.value = q);

const usersList = document.getElementById('usersList');
const userNodes = {};
usersStore.subscribe(users => {
    const nodesToDelete = new Set(Object.keys(userNodes));
    for (const user of users) {
        nodesToDelete.delete(user.id);
        let userNode = userNodes[user.id];
        if (!userNode) {
            userNode = document.createElement('li');
            userNodes[user.id] = userNode;
            usersList.appendChild(userNode);
        }
        if (user.id !== userId) {
            let nameNode = userNode.querySelector('span');
            if (!nameNode) {
                nameNode = document.createElement('span');
                userNode.append(nameNode);
            }
            let answerNode = userNode.querySelector('i');
            if (!answerNode) {
                answerNode = document.createElement('i');
                userNode.append(' ', answerNode);
            }
            if (nameNode.textContent !== user.name) {
                nameNode.textContent = user.name;
            }
            if (!!answerNode.textContent !== !!user.answer) {
                answerNode.textContent = user.answer ? 'Есть ответ' : '';
            }
        } else {
            let input = userNode.querySelector('input');
            if (!input) {
                input = document.createElement('input');
                userNode.appendChild(input);
                input.addEventListener('change', e => {
                    const name = input.value;
                    localStorage.setItem('userName', name);
                    s.send(JSON.stringify({
                        type: NAME,
                        payload: name
                    }));
                    input.blur();
                });
            }
            if (input.value !== user.name) {
                input.value = user.name;
            }
        }
    }
    nodesToDelete.forEach(n => {
        userNodes[n].remove();
        delete userNodes[n];
    });
});

const answers = document.getElementById('answers');
const answersTitle = document.getElementById('answers-title');
const buttonNodes = {};
usersStore.subscribe(users => {
    const user = users.find(u => u.id === userId);
    if (users.some(u => !u.answer)) {
        if (!Object.keys(buttonNodes).length) {
            answersTitle.textContent = 'Выбери карту';
            answers.innerHTML = '';
        }
        for (const answer of answerVariants) {
            let button = buttonNodes[answer];
            if (!button) {
                button = document.createElement('button');
                buttonNodes[answer] = button;
                button.className = 'card';
                const div = document.createElement('div');
                div.innerHTML = answer;
                button.append(div);
                button.addEventListener('click', e => {
                    s.send(JSON.stringify({
                        type: ANSWER,
                        payload: answer
                    }));
                });
                answers.append(button);
            }
            if (user?.answer === answer) {
                button.classList.add('selected');
                button.disabled = true;
            } else {
                button.classList.remove('selected');
                button.disabled = false;
            }
        }
    } else {
        if (Object.keys(buttonNodes).length) {
            for (const answer in buttonNodes) {
                buttonNodes[answer].remove();
                delete buttonNodes[answer];
            }
            answersTitle.textContent = 'Результат';
            answers.innerHTML = users
                .map(u => `
                            <div class="card selected">
                                <div>${u.answer}</div>
                            </div>
                        `)
                .join('');
        }
    }
})