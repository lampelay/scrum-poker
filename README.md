# Scrum poker

Вход по ссылке или по ID комнаты.

Когда все участники выберут карту, откроется результат.

При изменении вопроса начинается новое голосование.

Варианты ответов можно менять.
Если оставить поле пустым, установятся варианты по-умолчанию: 
<kbd>?</kbd>, <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>5</kbd>, <kbd>8</kbd>, <kbd>13</kbd>.

Если кто-то из участников уснул и не выбирает ответ, 
можно выгнать его специальной кнопкой <kbd>Выгнать</kbd>.

# Установка

```shell
git clone git@github.com:lampelay/scrum-poker.git
cd scrum-poker
yarn
cp src/config.js.dist src/config.js
cp .env.dist .env
docker-compose up
``` 
