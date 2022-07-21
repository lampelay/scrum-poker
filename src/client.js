import { writable } from './writable.js';
import { USERS, QUESTION, ANSWER, NAME, CONNECT, VARIANTS, KICK } from './actions.js';
import { DEFAULT_VARIANTS } from './variants.js';
import { User } from './model.js';
import { ask } from './ask.js';

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

(async () => {
    await Promise
        .resolve(getUserNameFromLocalStorage())
        .then(name => name || ask('Введите имя:', ''))
        .catch(d => d)
        .then(n => n.trim())
        .then(saveUserNameInLocalStorage);

    let answerVariants = DEFAULT_VARIANTS;

    /** @type {import('./writable.js').Writable<User[]>} */
    const usersStore = writable([]);

    const questionStore = writable('');
    let userId = '';

    const roomId = new URLSearchParams(location.search).get('id');
    if (!roomId) {
        location.href = location.href.split('/').slice(0, -1).filter((p, i) => i < 2 || !!p).join('/');
    }

    const roomIdField = document.getElementById('room');
    roomIdField.textContent = location;

    // const roomCopyButton = document.getElementById('room-copy-button');
    // roomCopyButton.onclick = function () {
    //     navigator.clipboard.writeText(roomIdField.textContent);
    // }

    const s = new WebSocket(`ws://${location.host}/socket`);
    addEventListener('beforeunload', () => s.close());

    s.onopen = () => {
        s.send(JSON.stringify({
            type: CONNECT,
            payload: roomId
        }));
        usersStore.subscribe(users => {
            if (users.length && users.every(u => u.id !== userId)) {
                location.href = '/';
            }
        });
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
            .sort()
            .sort((a, b) => (+a - +b) || -1)
            .filter(Boolean);
        console.log(answerVariants)
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
                let nameNode = userNode.querySelector('span.name');
                if (!nameNode) {
                    nameNode = document.createElement('span');
                    nameNode.className = 'name';
                    userNode.append(nameNode);
                }
                let answerNode = userNode.querySelector('span.ready');
                if (!answerNode) {
                    answerNode = document.createElement('span');
                    answerNode.className = 'ready';
                    userNode.append(' ', answerNode);
                }

                let kickButton = userNode.querySelector('button');
                if (!kickButton) {
                    kickButton = document.createElement('button');
                    kickButton.textContent = 'Выгнать';
                    kickButton.addEventListener('click', () => {
                        ask(`Выгнать игрока с именем ${nameNode.textContent}?`)
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
                answerNode.textContent = user.answer ? '✅' : "❌";
            } else {
                let input = userNode.querySelector('input');
                if (!input) {
                    input = document.createElement('input');
                    userNode.appendChild(input);
                    input.onchange = e => {
                        const name = input.value.trim();
                        if (name) {
                            saveUserNameInLocalStorage(name);
                        }
                        s.send(JSON.stringify({
                            type: NAME,
                            payload: name
                        }));
                        input.blur();
                    }
                }
                if (document.activeElement !== input) {
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
    //
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
            answers.innerHTML = '';
            for (const answer of answerVariants) {
                buttonsToDelete.delete(answer);
                let button = buttonNodes[answer];
                button = document.createElement('button');
                buttonNodes[answer] = button;
                button.className = 'card';
                const div = document.createElement('div');
                div.innerHTML = answer;
                button.append(div);
                button.onclick = e => {
                    s.send(JSON.stringify({
                        type: ANSWER,
                        payload: answer
                    }));
                }
                answers.append(button);
                if (user?.answer === answer) {
                    button.classList.add('selected');
                } else {
                    button.classList.remove('selected');
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
    });

})();
