rm archive.zip
zip archive.zip -r \
    node_modules \
    actions.js \
    favicon.ico \
    index.html \
    mime-types.js \
    package.json \
    server.js \
    writable.js

scp archive.zip rikolamp@185.155.19.84:/var/www/data/
ssh rikolamp@185.155.19.84 '
    cd /var/www/data/scrum-poker
    kill $(cat process)
    rm -rf *
    unzip ../archive.zip -d .
    /home/rikolamp/.nvm/versions/node/v14.16.1/bin/node server.js &
    echo $! > process
    rm -f ../archive.zip
'