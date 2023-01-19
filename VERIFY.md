# About Signal

Signal is a end to end encrypted messenger application. Whatsapp has integrated it to provide strong encryption in their application. Signal is a cross platform application available on iOS, Android, OSX, Windows etc. Behind signal is the protocol which allows bots to connect to it, called the signal protocol. To use the signal protocol, a machine must integrate the libraries that allow for this connection. 

The bot uses the signald implementation to achieve programattic access to the signal protocol. It runs on Java, there are many ways to install it, and it is usually pretty tedious getting it going. Once its up, it tends to be pretty solid however and the daemon persists through restarts and works. 

>Known issue: There is a delay timer in the snowpass application that pauses startup when the computer starts because sometimes it doesnt connect when PM2 starts suddenly after signalD

## some words
To use this application, first familiarize yourself with the signal client, chat with some friends, I highly recommend using a second device where you can wipe the signal application completely for configuring signal bots. Install signal on your desktop and see how the desktop and mobile apps interact with each other. The link method is much less painful than trying to chase down captchas via captchas.signald.org. Install some [Stickers](https://signalstickers.com/) for the client so it isnt so boring.

# Verifying Singal

Here are some tips on getting the signald application working on your machine.

The steps involved in this are as follows
- Get a dedicated box
- Get an alternate Twilio phone number (Optional)
- Install signald on the box and get it working
- The captcha

## Get a box

Get a raspberry pi or similar ubuntu device rolling. You can test this with using a cloud instance, but be warned, there is a known issue synchronizing signal with anything on a digital ocean domain. With that in mind, the process here will be described to that spec.

## Get an alternate Twilio phone number

There are several ways to get a signal bot up and rolling, this strategy seemed to be pretty reliable for deploying on VPS's, but be warned, that THIS SOFTWARE IS INTENDED TO BE SELF CUSTODIED FROM A DEVICE RUNNING FROM YOUR HOUSE. Getting a Twilio number is one option, other options for this are slack, (might be easier with slack) or perhaps even using your grandmothers phone line to initialize the bot.

It is ideal to have a second number running your password bot. Mostly, you need this number to get the bot up and running. To connect with the signal protocol, you must have an active phone number, but it doesnt work (or at least its not tested) to have your own regular use signal account controlling your password messages. You can register the bot on a new phone number and then cancel the number once you get things running, but down the road you might need to reconfigure the bot should there be a major upgrade to signal, etc. 

The issue at hand however, is that when configuring Twilio numbers, signal does not allow SMS messages to short code numbers, (or something to this nature) so in order to facilitate twilio verification for signal, you will need to install a script that forwards calls to your normal phone line. The code for the script is in this repository, see resources/callForward.js. 

Here are the instructions to set up call forwarding from the twilio site:
```
    Access the Functions (Classic) page in Console.
    Click Create a Function, or the blue plus + sign button.
    Select the Call Forward template, and then click Create.
    Add a Path and update the CODE field, and then click Save.
        Path: This is up to you - we select using something that gives an idea of what the Function will do like “forwardCalls”.
        CODE: In this field, find and update line 13. At the end of this line, "NUMBER TO FORWARD To" should be changed to your target phone number for receiving forwarded calls, "+13105555555" for example.
    Configure this Function on your Twilio number by following the steps here: Configuring phone numbers to receive calls or SMS messages.
```

Do not proceed until you are able to receive a phone call through the twilio interface. This will greatly improve the experience going forward. (or proceed weary-eyed, ymmv)

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

Ensure that youruser is part of the signald group in order to read and write to the signal socket. You may need to restart your terminal in order to continue.

## Captcha

The next thing we must do is make sure the captcha and verify process works, and if you configured your twilio account this might go smoother. 

there are basically two ways to do this: 

> 1. use the **link** command. Digital Ocean bots are pretty much banned so if you are spawning on DO, use the link command. Note This downloads all of your contacts to the device running the bot.
```
signaldctl account link
```
This pops up a QR code you can scan with your phone. But in order to not link it to your normal phone number you need a separate device to do this. 

- Install a fresh signal app on a second device, using the phone number from twilio. 
- Scan the QR code from the fresh signal app to link the bot account.
- Note that this method copies all of your contacts on your device to the signald application. 
- Later when you are finished setting the bot account up, delete the signal app on the second device, and then close the twilio phone number, because its no longer useful, but give yourself a couple days to observe it as needed. Note removing the account and app will require this linking process again from the ground up.

> 2. Use the **captcha**. The captcha thing has many issues. Try using voice verify. See https://signald.org/articles/captcha/

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

IMPORTANT: Finally set dissappearing messages to the message stream with the bot account to 30 seconds or 5 minutes. 
