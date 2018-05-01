'use strict'

module.exports.ensure_app = function(context) {
  let app = context.flags.app || process.env.HEROKU_APP || context.app

  if(! app) {
    throw new Error("Please supply heroku app via --app or HEROKU_APP environment variable.")
  }

  return app
}

module.exports.ensure_token = function(configs, app) {
  let token = configs.WASHTUB_TOKEN

  if(! token) {
    throw new Error(`Unable to retrieve WASHTUB_TOKEN from ${app}`)
  }

  return token
}

