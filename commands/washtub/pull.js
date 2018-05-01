'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let { WashtubWash, load_wash } = require('../../lib/washtub')
let { ensure_app, ensure_token } = require('../../lib/cli-util')

function * run(context, heroku) {
  let app = ensure_app(context)
  let wash = context.args.wash
  let database = context.args.target

  let config = yield heroku.get(`/apps/${app}/config-vars`)
  let token = ensure_token(config, app)
  let washtub_client = new WashtubWash({ auth_token: token })
  let response = yield washtub_client.download_url(wash)
  if(response.status == 'ok') {
    let download_url = response.data

    cli.action.start(`Pulling into database ${database}`)
    load_wash(download_url, database)
  } else {
    cli.error(`There was a problem pulling your wash: ${response.data}`)
  }
}

module.exports = {
  topic: 'washtub',
  command: 'pull',
  description: 'Pull a wash into a local database',
  help: `Examples:

  $ heroku washtub:pull wash target
  `,

  needsAuth: true,
  needsApp: true,

  args: [
    { name: 'wash', optional: false, description: 'The wash number of the wash to pull' },
    { name: 'target', optional: false, description: 'The target DB to load washed data into' }
  ],

  run: cli.command(co.wrap(run))
}

