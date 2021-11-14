/** @type {HTMLElement} */
const popup = document.querySelector('.popup');
/** @type {HTMLFormElement} */
const form = document.querySelector('.popup__window');
/** @type {HTMLButtonElement} */
const ok = popup.querySelector('.popup__button-ok');
/** @type {HTMLButtonElement} */
const cancel = popup.querySelector('.popup__button-cancel');
const background = popup.querySelector('.popup__background');
const questionNode = popup.querySelector('.popup__question');
/** @type {HTMLInputElement} */
const valueNode = popup.querySelector('.popup__value');

/**
 * 
 * @param {string} question
 * @param {string} [defaultValue]
 * @returns {Promise<void>}
 */
export const ask = async (question, defaultValue) => {
    questionNode.textContent = question;
    popup.style.display = 'block';
    if (typeof defaultValue !== 'undefined') {
        valueNode.style.display = 'block';
        valueNode.value = defaultValue;
        valueNode.focus();
        valueNode.select();
    } else {
        valueNode.style.display = 'none';
        ok.focus();
    }
    return new Promise((resolve, reject) => {
        form.onsubmit = function handleOk(e) {
            e.preventDefault();
            form.onsubmit = undefined;
            background.onclick = undefined;
            cancel.onclick = undefined;
            popup.style.display = 'none';
            resolve(valueNode.value);
        };
        function handleCancel() {
            form.onsubmit = undefined;
            cancel.onclick = undefined;
            background.onclick = undefined;
            popup.style.display = 'none';
            reject(defaultValue);
        }
        cancel.onclick = handleCancel;
        background.onclick = handleCancel;
    });
};
