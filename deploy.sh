#!/bin/sh
sudo -i 
yum update -y;
yum install -y git;
yum install -y docker;
service docker start;
usermod -a -G docker ec2-user;
curl -L https://github.com/docker/compose/releases/download/1.17.0/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose;
chmod +x /usr/local/bin/docker-compose;
iptables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-port 8000;
git clone https://github.com/jere1862/GelScraper.git;
cd GelScraper/build/;
echo "GEL_USERNAME=" >> .env;
echo "GEL_PASSWORD=" >> .env;
echo "MESSENGER_KEY=" >> .env;
echo "PAGE_URL=http://www.gel.usherbrooke.ca/s5info/a17/doc/evaluations/notesEtu.php" >> .env;
/usr/local/bin/docker-compose build;
/usr/local/bin/docker-compose up;
