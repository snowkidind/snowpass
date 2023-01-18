# Snowpass

This is a password management system written in NodeJS designed with the purpose of self custody of passwords, which allows retrieval on remote devices using the Signal application.

The setup uses a headless ubuntu system, that allows access via ssh on a local network. It is intended to be implemented as a dedicated device.

The signald program keeps a socket open with the signal protocol and messages are relayed using their double ratchet encryption algorithm. 

The password file itself is encrypted using Argon2. 

# Making it work

NOTE: There is no point in proceeding with the snowpass installation until you have a working copy of the signald application up and communicating with your regular signal chat client. Please refer to [VERIFY.md](./VERIFY.md) for these instructions before proceeding with the install here.

The steps involved in this are as follows
- Install the snowpass application
- Install node modules
- Configure the .env file
- Import your password file
- Test run the application
- Install pm2 and configure to run on reboot


## Install the snowpass application
```
git clone git@github.com:snowkidind/snowpass.git && cd ./snowpass

```

## Install node modules

Make sure you install node first
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
# export the printed line or restart the shell here
nvm install 18.13
node -v
```

```
npm install
```

## Configure the .env file
```
cp .env.example .env
pico .env
```
Be sure to set the appropriate things there:

> ENCRYPTION_KEY=yoursupersecurekeyhere 

Make this a nice strong password-like field. it is the key to unlocking your password file. It is not intended to be changed once the datastore is created. This will be hashed with Argon2 and then used as the key to your data file, which is encrypted with AES-CBC

> USE_ENCRYPTION_PREFIX=true

This is a prefix to add to your encryption key in order to make your application more secure. Since the encryption key above is stored in plain text, The prefix, which is added through the signal app will only be stored in memory. The combination of these two values will comprise the complete encryption key.

> UNIX_SOCKET=/var/run/signald/signald.sock

This is the location of the signald socket, should not need to modify

> BOT_ACCOUNT=+BOT_PHONE_NUMBER

This is the Bot account, that will be used to send messages

> LINKED_ACCOUNT=+YOUR_PHONE_NUMBER

This is the number of your regular signal account

> BACKUP_EVERY=5

This is the time in minutes to auto backup, which triggers when data mods happen

> BACKUP_CRON=24

Time in hours to run a backup regardless of whether or not mods happened

> PRERUN_PAUSE=30
time in seconds to wait to attempt to connect to socket. If you are having issues on slower systems, you might want to set this higher

> PASSWORD_LENGTH=18

The default length a password generated should be. Passwords are automatically assigned, but can be modified with custom passwords.

> CHECK_IN_MIN=1

to use the remote check in feature, enter the time in minutes to check in to external url if provided

> CHECK_IN_URL=http://123.456.789.12/watch/checkin

url for external check in - make sure to comment it out if not using

## Import your password file
The password format is pretty simple: 
its a JSON array of objects, each object has 4 parameters, as such
```
[
  {
    "name": "chatgpt",
    "user": "snow@gmail.com",
    "password": "kjshfkwjdfhskdjfh",
    "note": "this is an example password"
  },
  ...
]
```
Eventually, I will set up an importer tool but for now you can either add passwords manually, or make a JSON file like this to import all passwords at once. There is a template file in the data directory. Once your initial import is completed, be sure to delete the JSON file.

To import the file, run the command `node cli` from the snowpass directory. There you will find an interactive menu that helps with the actual import. The file's contents will be encrypted and saved to disk.

## Test run the application

To start the app, type node monitor. The logging is very minimal but there are some clues to the log. 
the first message, "NOTICE: the socket is connected" will mark a successful connection to the signal protocol. You should see a message to your normal signal app that says "Notice: SnowPass was restarted." Which is good to make note of. 

In the chat window with the bot, try the / command to display the menu. From there you are ready to begin journeying into the commands and retrieving passwords.

To retrieve a password just type a few letters of the name of the site you are trying to retrieve:

```
- git
> github
> snow@gmail.com
> this is an example password
> admin123
```

Two messages are sent, containing the site name, the user name, and any notes. to make it easier to copy deterministically, separate messages are provided with the password.

## Install pm2 and configure to run on reboot

To get the program to persist over startups configure PM2, using a file called ecosystem.config.js
```
npm install pm2 -g
cp ecosystem.config.js.example ecosystem.config.js
pico ecosystem.config.js # modify script field to reflect the fullpath to the monitor.js file
pm2 start ecosystem.config.js
pm2 startup # displays a link to copy paste to get the monitor to persist over system restarts
pm2 save
pm2 status
pm2 logs
```

thats it should be up and running, that is _should_

# SOFTWARE IS AS IS AND COMES WITH ZERO WARRANTIES ESPECIALLY IF YOU GET HACKED AND LOSE YOUR STUFF - I AM NOT IN ANY WAY RESPONSIBLE NOR HAVE ANY LEGAL OBLIGATIONS.


# Operating the bot

If the bot is properly configured, you should be able to do almost everything through the signal interface. Just hit / for the menu:

Create a new entry, with an auto assigned password - this will generate a new entry with the specified information. The program will assign a new password for it and return the password. You can then copy the password from signal and update the password on the website with it.
> /new <company> <userid> <note>

List entries - This displays a list of all the entries by name. For details about an entry just send a signal message with the name of the entry
> /ls

Append note information for specified entry - This adds a line to the note field of a given entry, you can add several notes to a entry.
> /note <company> <note>

Clear note information for specified company - this removes all notes associated with an entry. 
> /noteclear <company>

Change item to user defined password - If you are not satisfied with the password given, or wish to assign your own password, this allows for that functionality. It overwrites the currently assigned password.
> /change <company> <newPassword>

Update a company with a new auto assigned password - When it is time to update passwords, this will replace the old password with a newly generated one.
> /update <company>

Remove a company from password tracking entirely - This deletes an entry. Note theres no undo here.
> /rm <company> <password>

Create a Argon2 encrypted backup copy of the password data - This forces a backup. Note that backups are generated upon actions, but not for every action. Backups are made every process.env.BACKUP_EVERY minutes. This can be set in .env
> /backup <company>

# TESTING

This is a summary of the devices the software has been tested on

| Device  | Specs  | OS  | Performance  | Notes  | 
|---|---|---|---|---|
| Digital Ocean Droplet  | 2G/25g/2vCPU  | Ubuntu 22.04  | Good | No performance Issues |
| Raspberry Pi 4 | 8G / 16g ssd UHS class 1  |  Ubuntu Server 22.1 LTS | Signal slow to respond but somewhat reliable. | Should be more responsive, slow to apt as well. Message latency is about 6 - 10 seconds  |
| Raspberry pi 4 | 8G / 128g SD Extreme XC  | Ubuntu Server 22.1+ |  | Much more responsive than older microSD, Message latency is about 1 - 1.5 seconds |

## NEXT STEPS

- initialize both back and front seeds via signal app
- change profile pic on runOnce
- debug pid files to include same pids that are not node
- Check that dissappearing messages are turned on and warn if they arent