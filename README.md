# Snowpass

This is a password management system written in NodeJS designed with the purpose of self custody of passwords, which allows retrieval on remote devices using the Signal application and two factor authentication

The setup uses a headless ubuntu system, that allows access via ssh on a local network. It is intended to be a dedicated device.

The signald program keeps a socket open with the signal protocol and messages are relayed using their double ratchet algorithm. 

The password file is encrypted using Argon2. 

