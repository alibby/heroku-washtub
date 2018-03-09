'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let { WashtubWash } = require('../../lib/washtub')

function * run(context, heroku) {
  let backupid = context.args.backup

  if(! backupid.match(/^b\d+$/)) {
    throw new Error(`Please specify backup id.  ${backupid} does not seem to be a valid backup`)
  }

  let bid = backupid.replace('b', '')
  let app = context.flags.app || process.env.HEROKU_APP
  let config = yield heroku.get(`/apps/${app}/config-vars`)
  let path = `/client/v11/apps/${app}/transfers/${bid}?verbose=false`
  let options = { host: 'https://postgres-api.heroku.com' }
  let backup = yield heroku.get(path, options)
  let url_body = `/client/v11/apps/${app}/transfers/${bid}/actions/public-url`
  let url = yield heroku.post(url_body, options)

  let wash_client = new WashtubWash({ auth_token: config.WASHTUB_TOKEN })

  let x = yield wash_client.create(backup, url)
  console.log(x)
}

module.exports = {
  topic: 'washtub',
  command: 'wash',
  description: "Create and wash a database from the given backup id",
  help: `Examples:

  $ heroku washtub:wash backup
  `,

  needsAuth: true,

  args: [
    { name: 'backup', optional: false, description: 'The bakcup_id of a backup to load and wash' }
  ],

  flags: [
    { name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use' },
  ],

  run: cli.command(co.wrap(run))
}

