
# Raspberry pi has a desktop app that you can burn ubuntu to micro sd. 
# https://www.raspberrypi.com/software/
# be sure to set a decent user name and password among other system settings instead of a default burn
# Minimum acceptable sd card size: 16G Shoot for UHS speed class 3 or better, SDXC, SDEXpres
# https://static.techspot.com/articles-info/1591/images/2022-11-14-image-j.webp

# Stage one, working computer with signald installed
sudo apt update
sudo apt upgrade
# there was a prompt to restart the system and restart services, ok but didnt restart
# note this url uses http and not https: thats because using https is buggy (expired key)
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
# allow pulls from private repo
Add to .ssh/config 
Host ssh.github.com
  ForwardAgent yes
chmod 600 config
# exit enter
git clone git@github.com:snowkidind/snowpass.git
fingerprint? yes
# nvm - we need 19.3 or greater because earlier crypto packages are incompatible
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install 19.3
cd snowpass && npm install
cp .env.example .env
pico .env # ( see readme you can use interactive mode eg. node cli to generate ENCRYPTION_KEY )
# set BOT_ACCOUNT
# set LINKED_ACCOUNT
# To copy passwords from a previous installation:
scp ./data.enc youruser@192.168.1.108:/home/youruser/snowpass/data/data.enc

# use interactive mode eg. node cli to generate ENCRYPTION_KEY
node cli
# g, then k, then import a database of a flavor, exit


# startup 1st time to test overall 
# did everything work? did you get messages to your LINKED_ACCOUNT? takes about .env.PRERUN_PAUSE seconds
# restart and persist with pm2
npm install pm2 -g
cp ecosystem.config.js.example ecosystem.config.js
pico ecosystem.config.js # update to reflect your user
pm2 start ecosystem.config.js
pm2 startup #follow instructions printed at the prompt
pm2 save

sudo shutdown -r now

# power down and restart your raspberry pi for keeps. The system should resume normally. 
# If it doesnt, pm2 doesnt appear to take always try redoing pm2 config. 
# then in signal, set the encryption key prefix to complete the setup. 
# Note that on subsequent restarts the key prefix must be set every time, and the prefix should only exist on paper

# see Also: On Security section in README.md
# please make a pull request with your device results inserted at the bottom of README.md in the testing section