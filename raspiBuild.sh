# Stage one, working computer with signald installed

# burn ubuntu to micro sd
sudo apt update
sudo apt upgrade
# there was a prompt to restart the system and restart services, ok but didnt restart
# this isnt allowed:
# sudo echo "deb http://updates.signald.org unstable main" > /etc/apt/sources.list.d/signald.list
sudo pico /etc/apt/sources.list.d/signald.list
   deb http://updates.signald.org unstable main
# save exit
curl https://updates.signald.org/apt-signing-key.asc | sudo apt-key add -
sudo apt update
sudo apt install signald
sudo systemctl start signald
sudo usermod -a -G signald youruser # youruser being the user you set up in the raspberry pi OS setup
sudo shutdown -r now
signaldctl version

# Stage 2 get a working second signal account and trust it by passing messages to and fro
bot app -> install signal, and verify phone number for the bot
bot app -> start signal / enter phone, fail text auth, call me, add code
bot app -> register without, enter pin profile first last
personal app -> with regular signal app, send bot number a message
personal app -> view safety number and mark as verified
bot app -> receive message from personal app
bot app -> view safety number and mark as verified
ubuntu -> signaldctl account link
bot app -> settings -> linked devices -> link new device -> scan qr and link new device
ubuntu -> "linking successful"
personal app -> set dissappearing messages to 5 minutes
bot app -> verify dissappearing messages are set

# stage 3 confirm bot internals are working
nc -U /var/run/signald/signald.sock
{"type": "subscribe", "username": "+BOT_PHONE_NUMBER"}
{"type":"send","username":"+BOT_PHONE_NUMBER","recipientAddress":{"number": "+YOUR_PHONE_NUMBER"},"messageBody":"test 12","version":"v1"}
# close netcat, everything good?

# stage 4 SW pipeline
Add to .ssh/config 
Host ssh.github.com
  ForwardAgent yes
chmod 600 config
# exit enter
git clone git@github.com:snowkidind/snowpass.git
fingerprint? yes
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install 19.3
cd snowpass && npm install
cp .env.example .env
pico .env ( see readme)
# crown jewels
scp ./data.enc youruser@192.168.1.108:/home/youruser/snowpass/data/data.enc
# startup 1st time to test overall 
# did everything work? did you get messages? 
npm install pm2 -g
cp ecosystem.config.js.example ecosystem.config.js
pico ecosystem.config.js # update to reflect your user
pm2 start ecosystem.config.js
pm2 startup
pm2 save

sudo shutdown -r now

# power down and restart your raspberry pi for keeps. The system should resume normally. 
# If it doesnt, pm2 doesnt appear to take always try redoing pm2 config.
# then in signal, set the key prefix to complete the setup. 
# Note that on subsequent restarts the key prefix must be set every time

