'use strict'

let co = require('co')
let wait = require('co-wait')
let cli = require('heroku-cli-util')
let http = require('https')
let { sortBy, last, filter } = require('lodash')
let { WashtubWash, load_wash } = require('../../lib/washtub')
let { ensure_app, ensure_token } = require('../../lib/cli-util')

function * run(context, heroku) {
  let database = context.args.database || 'DATABASE_URL'
  let database_basename = database.replace(/^(?:HEROKU_POSTGRESQL_)?(.*)(?:_URL)?$/, '$1')
  let app = ensure_app(context)
  let target = context.args.target

  co(function *() {
    cli.action.start(`Performing database wash of ${database} into ${target}`)
    cli.action.status("looking up configs")
    let config = yield heroku.get(`/apps/${app}/config-vars`)
    cli.action.status('Looking up backup')
    let path = `/client/v11/apps/${app}/transfers?verbose=false`
    let options = { host: 'https://postgres-api.heroku.com' }
    let predicate = (o) => {
      return o.from_name == database_basename && o.to_name == 'BACKUP'
    }
    let backups = filter(yield heroku.get(path, options), predicate)
    let backup = last(sortBy(backups, ['num']))

    if(!backup.num) {
      cli.error(`I cannot find any backups for app ${app}.  Please create a backup with heroku pg:backups:capture DATABASE_URL.`)
      cli.exit(1)
    }

    let bid = backup.num
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

    load_wash(download_url, target)
  }).catch( (error) => {
    cli.error(`Washtub encountered an error: ${error.message}`)
    cli.exit(1)
  })
}

module.exports = {
  topic: 'washtub',
  command: 'wash',
  description: "Create and wash a given remote database to a given local database",
  help: `Examples:

  $ heroku washtub:wash REMOTE_DATABASE_NAME local_db_name
  `,

  needsAuth: true,
  needsApp: true,

  args: [
    { name: 'database', optional: false, description: 'The database to wash' },
    { name: 'target', optional: false, description: 'The target DB to load washed data into' }
  ],

  run: cli.command(co.wrap(run))
}

