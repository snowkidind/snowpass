# Snowpass

## Self custodial password manager written in pure JS 

If you are sick of using third parties for password management this may be a solution that is right for you. Signal messenger is an end to end strongly encrypted messenger application. Its been integrated by large platforms like whatsapp and telegram in order to give its users a secure experience. SnowPass leans on this technology to deliver user credentials to any device across platforms. The software can be installed on any personal device like a raspberry pi, an odroid or your laptop to create a safe zone for your passwords, free from dependence on third parties. 

After setting the system up, you interact with it directly on a chat message on the signal messenger app. You can make new entries, add notes to existing entries, change and update passwords and more. On the backend the password file is encrypted in a safe manner, using the latest strong encryption methods for safe storage. The disappearing message feature of signal messenger automatically removes password requests thereby eliminating any correspondence with the app after a set period of time.

>This is a password management system written in NodeJS designed with the purpose of self custody of passwords, which allows retrieval on remote devices using the Signal application.

[Video introduction / live demo](https://drive.google.com/file/d/16ylgFhDaWc00sBvbN2em9ZDIZv4ytUjR/view?usp=share_link)

![info graphic](resources/basic.1800.1200.png)

The setup uses a headless ubuntu system, that allows access via ssh on a local network. It is intended to be implemented as a dedicated device.

The signald program keeps a socket open with the signal protocol and messages are relayed using their double ratchet encryption algorithm. 

The password file itself is encrypted using Argon2. 

# Configuring the bot for the first time

Before operating the bot, you will need to set the encryption key appropriately and initialize a datastore. There is an interactive mode which allows the configuration. To access interactive mode, run node cli from the root directory.

```
node cli
```

- First, generate a encryption key
- Then inject the remote key into memory
- Then create your archive

## Interactive mode commands:

`g`

Generate local encryption key and install

In order to keep encrypted backups, it is necessary to have an encryption key.
The system uses a split encryption key, half stored on the device, the other
injected into ram via the signal interface.This command will automatically
generate the backside key and insert it intothe .env file
To use an existing key, modify the .env file with the key.

`k`    

Set remote encryption key

This allows you use the "import passwords" command below using the split key method.
This command will inject the remote key into the current process without writing
it to disk. To create the password file's encryption key, these keys will be concatenated.

`ir`    

Import raw passwords

This allows you to bring passwords in using the split key method. This command will
read a JSON file and convert the data into a encrypted file. You should remove the JSON file
after performing this operation.

`ie`   

Import encrypted data store

This allows you to import passwords from a previous installation. You will need both
local and remote encryption keys to continue (and work) in order to complete this command.

`e`

Initialize with no passwords

This creates a new encrypted data store with no entries.

# Operating the bot

If the bot is properly configured, you should be able to do almost everything through the signal interface. Just hit / for the menu:

Passwords are automatically assigned on new entries. You can then change them with a custom password or update them with a new auto assigned password.

Create a new entry, with an auto assigned password - this will generate a new entry with the specified information. The program will assign a new password for it and return the password. You can then copy the password from signal and update the password on the website with it.
> /new <entry> <userid> <note>

List entries - This displays a list of all the entries by name. For details about an entry just send a signal message with the name of the entry
> /ls

Append note information for specified entry - This adds a line to the note field of a given entry, you can add several notes to a entry.
> /note <entry> <note>

Clear note information for specified entry - this removes all notes associated with an entry. 
> /noteclear <entry>

Change item to user defined password - If you are not satisfied with the password given, or wish to assign your own password, this allows for that functionality. It overwrites the currently assigned password.
> /change <entry> <newPassword>

Update an entry with a new auto assigned password - When it is time to update passwords, this will replace the old password with a newly generated one.
> /update <entry>

Remove an entry from password tracking entirely - This deletes an entry. Note theres no undo here.
> /rm <entry> <password>

Create a Argon2 encrypted backup copy of the password data - This forces a backup. Note that backups are generated upon actions, but not for every action. Backups are made every process.env.BACKUP_EVERY minutes. This can be set in .env
> /backup <entry>


# Making it work

<table><tr><td>NOTE: There is no point in proceeding with the snowpass installation until you have a working copy of the signald application up and communicating with your regular signal chat client. Please refer to VERIFY.md for these instructions before proceeding with the install here.</td></tr></table>

There is a play-by-play file of sequential commands and things to do to get up and running in rasbiBuild.sh 

The steps involved in this are as follows
- [get signald working on your machine](./VERIFY.md)
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
nvm install 19.3
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

There is a function in interactive mode which allows you to generate this. Make this a nice strong password-like field. it is the key to unlocking your password file. It is not intended to be changed once the datastore is created. This will be hashed with Argon2 and then used as the key to your data file, which is encrypted with AES-CBC

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

# On Security

In order to get some basic security issues out of the way, here are some Security tips
- Change your password from default raspberrry pi settings.
- Update and upgrade `sudo apt update sudo apt full-upgrade`
- Use SSH key authentication
- 2FA your SSH
- Use UFW on the pi to set up a firewall `sudo ufw limit 22/tcp`
- Dont use your password machine for anything else, especially websites connected to the outside world.
- be sure to set your dissappearing messages to the bot in your signal app
- double check that any plain text files with passwords have been deleted properly
- clear system logs (`pm2 logs` for location)

# SOFTWARE IS AS IS AND COMES WITH ZERO WARRANTIES ESPECIALLY IF YOU GET HACKED AND LOSE YOUR STUFF - I AM NOT IN ANY WAY RESPONSIBLE NOR HAVE ANY LEGAL OBLIGATIONS.

# TESTING

This is a summary of the devices the software has been tested on. Please make a pull request or send a message if you have a line to add to this table:

| Device  | Specs  | OS  | Performance  | Notes  | 
|---|---|---|---|---|
| Digital Ocean Droplet  | 2G/25g/2vCPU  | Ubuntu 22.04  | Good | No performance Issues, Message latency: 1 - 1.5 seconds |
| Raspberry pi 4 | 8G / 128g SD Extreme XC  | Ubuntu Server 22.1+ | Good | Much more responsive than older microSD, Message latency: 1 - 1.5 seconds |
| Raspberry Pi 4 | 8G / 16g ssd UHS class 1  |  Ubuntu Server 22.1 LTS | Signal slow to respond but somewhat reliable. | Should be more responsive, slow to apt as well. Message latency: about 6 - 10 seconds  |
