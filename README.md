# Washtub CLI

This is the heroku washtub command line plugin.

# Development

NOTE: So far this only documents how to get setup for executing
```heroku washtub:init``

## Create Accounts

Over in washtub core, make sure you've run ```kensa test```.  This will
create a few account objects in your local washtub core server.

## Set WASHTUB_TOKEN

In the heroku app you wish to pull the database from, set the WASHTUB_TOKEN
to the value of one of your account object from core.

In the washtub core console:

```
Account.first.auth_token
```

Take that value and set WASHTUB_TOKEN in your heroku app:

```
heroku config:set WASHTUB_TOKEN=tokenstring --app yourheokuapplication
```

From there you should be ready to run the init process:

```
heroku washtub:init --app yourherokuapplication
```




