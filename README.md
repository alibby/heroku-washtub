# Washtub CLI

This is the heroku washtub command line plugin.

# Usage

Go see the clean data obsessed kids over at
[washtubapp.com](https://washtubapp.com) and sign up.

Then install the plugin

```
heroku plugins:install heroku-washtub
```

Then you can initialize the washtub

```
heroku washtub:init --app yourappname
```

Then visit the app and set your data anonymization policy.

Next you submit a wash.

```
heroku pg:backups:capture
heorku washtub:wash backupid local_development_database
```

Now you've got a clean data set to work with!

NOTE: This will overwrite the database called ```local_development_database```.


