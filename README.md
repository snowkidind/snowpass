# Snowpass

This is a password management system written in NodeJS designed with the purpose of self custody of passwords, which allows retrieval on remote devices using the Signal application and two factor authentication

The setup uses a headless ubuntu system, that allows access via ssh on a local network. It is intended to be a dedicated device.

The signald program keeps a socket open with the signal protocol and messages are relayed using their double ratchet algorithm. 

The password file is encrypted using Argon2. 

# Making it work

The steps involved in this are as follows
- Get a box
- Get an alternate Twilio phone number
- Install signald on the box and get it working
- Captcha
- Install the snowpass application
- Install node modules
- Configure the .env file
- Import your password file
- Test run the application
- Install pm2 and configure to run on reboot

## Get a box

Get a raspberry pi or similar ubuntu device rolling. You can test this without using a cloud instance, but be warned, there is a known issue synchronizing signal with anything on a digital ocean domain. With that in mind, the process here will be described to that spec.

## Get an alternate Twilio phone number

It is ideal to have a second number running your password bot. Mostly, you need this number to get it up and running. To connect with the signal protocol, you must have an active phone number, but its not ideal to have your own phone number controlling your password messages. You can pretty much register the bot on a new phone number and then cancel the service for that number once you get things running, but you will need to reconfigure the bot down the road should there be a major upgrade to signal, etc. The issue at hand however, is that when configuring Twilio numbers, signal does not allow SMS messages to short code numbers, (or something to this nature) so in order to facilitate twilio verification for signal, you will need to install a script that forwards calls to your normal phone line. The code for the script is in the resources directory, in this repository, called callForward.js. 

Here are the instructions from the twilio site:
```
    Access the Functions (Classic) page in Console.
    Click Create a Function, or the blue plus + sign button.
    Select the Call Forward template, and then click Create.
    Add a Path and update the CODE field, and then click Save.
        Path: This is up to you - we select using something that gives an idea of what the Function will do like “forwardCalls”.
        CODE: In this field, find and update line 13. At the end of this line, "NUMBER TO FORWARD To" should be changed to your target phone number for receiving forwarded calls, "+13105555555" for example.
    Configure this Function on your Twilio number by following the steps here: Configuring phone numbers to receive calls or SMS messages.
```

Do not proceed until you are able to receive a phone call through the twilio interface. This will greatly improve the experience going forward. (or proceed weary-eyed)

## Install signald on the box and get it working
Instructions to install signald are at https://signald.org/articles/install/debian/
The biggest issue (save from the verify function which is its own beast) with the signal installation is that sometimes the signing key doesnt allow proper downloads from updates.signald.org
When following the install instructions above, if you have signing key issues, change the source list url in /etc/apt/sources.list.d/signald.list to:
```
deb http://updates.signald.org unstable main
```

Once you have completed the signald install, you need to do some configurations to the system to allow your user to connect to the signal socket, which is the interface your application uses to broadcast and receive messages from signald.

```
usermod -a -G signald youruser
groups youruser
```

Ensure that youruser is part of the signald group in order to read and write to the signal socket. 

## Captcha

The next thing we must do is make sure the captcha and verify process works, and if you configured your twilio account this might go smoother. 

there are basically two ways to do this: 
1. use the **link** command. Digital Ocean bots are pretty much banned so if you are spawning on DO, use the link command. Note This downloads all of your contacts to the device
```
signaldctl account link
```
This pops up a QR code you can scan with your phone. But in order to not link it to your normal phone number you need a separate device to do this. 

- Install a fresh signal app on a second device, using the phone number from twilio. 
- Scan the QR code from the fresh signal app to link the bot account.
- Note that this method copies all of your contacts on your device to the signald application. 
- when you are finished setting the bot account up, delete the signal app on the second device, and then close the twilio phone number, because its no longer useful. Note removing the account and app will require this linking process again from the ground up.

2. Use the **captcha**. The captcha thing has many issues. Try using voice verify. See https://signald.org/articles/captcha/

Getting the code: 
1. Go here: https://signalcaptchas.org/registration/generate.html
2. View dev tools
3. Perform captcha
4. copy the captcha code from network activity
5. delete signalcaptcha://signal-recaptcha-v2. from the captcha code
There are two ways to do this, which, if you arent using twilio, and/or are using actual phone lines, it may actually work

signaldctl is a popular add on to the signald interface that lets you send the socket raw commands
Enter signaldctl to get a decent interactive help menu in order to discover available commands:

```
signaldctl
signaldctl account register +BOT_PHONE_NUMBER --captcha 
signaldctl account verify +BOT_PHONE_NUMBER 123456
```

You can also connect directly to the socket using netcat:
```
nc -U /var/run/signald/signald.sock
{"type": "register", "version": "v1","account": "+BOT_PHONE_NUMBER","captcha": "", "voice": "true"}
{"type":"verify","username":"+BOT_PHONE_NUMBER", "code":"123456"}
{"type": "subscribe", "username": "+BOT_PHONE_NUMBER"}
```

Ok once you have successfully verified, pat yourself on the back, thats the worst. Now its time to link your bot account to the phone account you have linked in your regular use signal app. The reason we need to do this is because if the bot account and the signal app dont handshake, the messages get ignored. So there are several things you can do to get them to handshake properly but the goal here is two way comms between the bot and your regular account. 

The easy way: 
- Send a message to the bot account on your regular use version of signal. Then, respond to your message either through your second device, or the unix socket:
```
nc -U /var/run/signald/signald.sock
{"type":"send","username":"+BOT_PHONE_NUMBER","recipientAddress":{"number": "+YOUR_PHONE_NUMBER"},"messageBody":"test 12","version":"v1"}
```

Once you see messages from the bot in your regular account, verify the safety number in YOUR_PHONE_NUMBER's app

Once this two way communication is formed, the machine is ready to set up the snowpass application and start serving passwords.

## Install the snowpass application
```
git clone git@github.com:snowkidind/snowpass.git && cd ./snowpass
```

## Install node modules
```
npm install
```

## Configure the .env file
```
cp .env.example .env
pico .env
```
Be sure to set the appropriate things there:

> PBKDF2_ITERATIONS=deprecated

> ENCRYPTION_KEY=yoursupersecurekeyhere 

Make this a nice strong password like field. it is the key to unlocking your password file. It is not intended to be changed once the datastore is created

> UNIX_SOCKET=/var/run/signald/signald.sock

This is the location of the signald socket, should not need to modify

> BOT_ACCOUNT=+BOT_PHONE_NUMBER

This is the Bot account, that will be used to send messages

> LINKED_ACCOUNT=+YOUR_PHONE_NUMBER

This is the number of your regular signal account

> BACKUP_EVERY=5

This is the time in minutes to auto backup, which triggers when data mods happen

> PASSWORD_LENGTH=18

The default length a password generated should be. Passwords are automatically assigned, but can be modified with custom passwords.

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
Eventually, I will set up an importer tool but for now you can either add passwords manually, or make a JSON file like this to import all passwords at once. Once the import is completed, be sure to delete the JSON file.

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
pm2 status
pm2 logs
```

thats it should be up and running, that is _should_

# SOFTWARE IS AS IS AND COMES WITH ZERO WARRANTIES ESPECIALLY IF YOU GET HACKED AND LOSE YOUR STUFF - I AM NOT IN ANY WAY RESPONSIBLE NOR HAVE ANY LEGAL OBLIGATIONS.

## TODO's
- redo encryption algorithm to use Argon2
- Check devices that are connected and warn if strange devices exist
- Check that dissappearing messages are turned on and warn if they arent
- process job that backs up the data at interval
- url to call for checking in
- documentation on how to get signald working on your box
- documentation on how to operate the bot
- automate initialization as much as possible

## NEXT STEPS
- consider storing pid files to ensure a single process is running
- look into applying the signal protocol on c for potential embedded approach


