'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let http = require('https')
let wait = require('co-wait')
let { WashtubWash, load_wash } = require('../../lib/washtub')
let { ensure_app, ensure_token } = require('../../lib/cli-util')

function * run(context, heroku) {
  let backupid = context.args.backup

  if(! backupid.match(/^[a-z]+\d+$/)) {
    throw new Error(`Please specify backup id.  ${backupid} does not seem to be a valid backup`)
  }

  let bid = backupid.replace(/^[a-z]+/, '')
  let app = ensure_app(context)

  co(function *() {
    cli.action.start("Performing database wash")
    cli.action.status("looking up configs")
    let config = yield heroku.get(`/apps/${app}/config-vars`)
    cli.action.status('Looking up backup')
    let path = `/client/v11/apps/${app}/transfers/${bid}?verbose=false`
    let options = { host: 'https://postgres-api.heroku.com' }
    let backup = yield heroku.get(path, options)
    cli.action.status('Looking up backup URL')
    let url_body = `/client/v11/apps/${app}/transfers/${bid}/actions/public-url`
    let url = yield heroku.post(url_body, options)

    let token = ensure_token(config, app)
    cli.action.status('Submitting wash request')
    let wash_client = new WashtubWash({ auth_token: token })

    let x = yield wash_client.create(backup, url)
    let wash_id = x.data.wid
    let stat = yield wash_client.status(wash_id)

    while(stat.data != 'complete') {
      cli.action.status("Washing")
      yield wait(2000)
      stat = yield wash_client.status(wash_id)
    }

    let download_url = (yield wash_client.download_url(wash_id)).data
    let database = context.args.target

    load_wash(download_url, database)
  }).catch( (error) => {
    cli.error(`Washtub encountered an error: ${error.message}`)
    cli.exit(1)
  })
}

module.exports = {
  topic: 'washtub',
  command: 'wash',
  description: "Create and wash a database from the given backup id",
  help: `Examples:

  $ heroku washtub:wash backup target
  `,

  needsAuth: true,
  needsApp: true,

  args: [
    { name: 'backup', optional: false, description: 'The backup_id of a backup to load and wash' },
    { name: 'target', optional: false, description: 'The target DB to load washed data into' }
  ],

  run: cli.command(co.wrap(run))
}

