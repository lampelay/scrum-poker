const popup = document.querySelector('.popup');
const ok = popup.querySelector('.popup__button-ok');
const cancel = popup.querySelector('.popup__button-cancel');
const background = popup.querySelector('.popup__background');
const usernameSpan = popup.querySelector('.popup__username');

export const askToKick = async (username) => {
    usernameSpan.textContent = username;
    popup.style.display = 'block';
    return new Promise((res, rej) => {
        ok.addEventListener('click', function handleOk() {
            ok.removeEventListener('click', handleOk);
            popup.style.display = 'none';
            res();
        });
        function handleCancel() {
            cancel.removeEventListener('click', handleCancel);
            background.removeEventListener('click', handleCancel);
            popup.style.display = 'none';
            rej();
        }
        cancel.addEventListener('click', handleCancel);
        background.addEventListener('click', handleCancel);
    });
};