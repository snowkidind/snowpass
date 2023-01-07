# Snowpass

This is a password management system written in NodeJS designed with the purpose of self custody of passwords, which allows retrieval using the Signal application via a deployer program, and a secondary program which manages the password information, on a separate device.

The setup uses two devices, one with a local computer which is used to synchronize new passwords, and the other device contains the password "deployer". The deployer has no HTTP server, only ssh access, but it makes requests on your LAN to the "synchronizer" in order to process commands. Thus, it requires the synchronizing machine to be configured with a static IP.

To deploy a password, the deployer interacts with the signal protocol and delivers "view once and delete" message containing account information through the signal application, using its built in double ratchet encryption algorithm. That is, a user requests a password, the deployer decrypts the password file hosted on it, looks up matches based on the query and returns matches found via signal. Since the device is programmed to only respond to a single user handle, it will ignore requests from all other parties. The encryption key will be optionally stored on a hardware module via the usb interface. The deployer is intended to be installed on a small device like raspberry pi, odroid, jetson or similar. 

The synchronizer does not have to be running ever, but when it does it will wait for an incoming request from the deployer and open an encrypted socket connection with it. Then, it will be ready to make modifications to the encrypted password file, via a control panel which allows it to update and edit password information, among other administrative functions. 


