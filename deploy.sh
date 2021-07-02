rm archive.zip
zip archive.zip -r \
    node_modules \
    src \
    package.json \
    start.sh \
    stop.sh
    
scp archive.zip rikolamp@185.155.19.84:/var/www/data/
rm archive.zip
ssh rikolamp@185.155.19.84 '
    cd /var/www/data/scrum-poker
    ./stop.sh
    rm -rf *
    unzip ../archive.zip -d .
    ./start.sh
    rm -f ../archive.zip
'
