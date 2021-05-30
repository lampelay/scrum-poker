import { writable } from './writable.js';
import { USERS, QUESTION, ANSWER, NAME, CONNECT, VARIANTS, KICK } from './actions.js';
import { DEFAULT_VARIANTS } from './variants.js';
import { User } from './model.js';
import { askToKick } from './ask-to-kick.js';

const getUserNameFromLocalStorage = () => {
    try {
        return localStorage.getItem('userName');
    } catch (e) {
        return undefined;
    }
};

const saveUserNameInLocalStorage = name => {
    try {
        localStorage.setItem('userName', name);
        return true;
    } catch (e) {
        return false;
    }
};

let answerVariants = DEFAULT_VARIANTS;

/** @type {import('./writable.js').Writable<User[]>} */
const usersStore = writable([]);
const questionStore = writable('');
let userId = '';

const roomId = new URLSearchParams(location.search).get('id');
if (!roomId) {
    location.href = '/';
}

const roomIdField = document.getElementById('room');
roomIdField.textContent = location;

const s = new WebSocket(`ws://${location.host}`);
addEventListener('beforeunload', () => s.close());

s.onopen = () => {
    s.send(JSON.stringify({
        type: CONNECT,
        payload: roomId
    }));
    const name = getUserNameFromLocalStorage();
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
        case VARIANTS:
            answerVariants = action.payload;
            variantsField.value = answerVariants.join('; ');
            usersStore.set(users => [...users]);
            break;
    }
};

const variantsField = document.getElementById('variants');
variantsField.value = answerVariants.join('; ')
variantsField.addEventListener('change', e => {
    answerVariants = variantsField
        .value
        .split(';')
        .map(v => v.trim())
        .filter(Boolean);
    if (answerVariants.length === 0) {
        answerVariants = DEFAULT_VARIANTS;
    }
    s.send(JSON.stringify({
        type: VARIANTS,
        payload: answerVariants
    }));
    variantsField.blur();
});

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
            let kickButton = userNode.querySelector('button');
            if (!kickButton) {
                kickButton = document.createElement('button');
                kickButton.textContent = 'Выгнать';
                kickButton.addEventListener('click', () => {
                    askToKick(user.name)
                        .then(() => {
                            s.send(JSON.stringify({
                                type: KICK,
                                payload: user.id
                            }));
                        });
                });
                userNode.append(' ', kickButton);
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
                    saveUserNameInLocalStorage(name);
                    s.send(JSON.stringify({
                        type: NAME,
                        payload: name
                    }));
                    input.blur();
                });
                input.value = getUserNameFromLocalStorage() || user.name;
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
        const buttonsToDelete = new Set(Object.keys(buttonNodes));
        for (const answer of answerVariants) {
            buttonsToDelete.delete(answer);
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
        buttonsToDelete.forEach(v => {
            buttonNodes[v].remove()
            delete buttonNodes[v];
        });
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