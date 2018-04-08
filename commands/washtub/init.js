'use strict'

let co = require('co');
let cli = require('heroku-cli-util');
let _ = require('lodash')
let { WashtubDatabase } = require('../../lib/washtub')

function * run(context, heroku) {
  let source = context.args.database || 'DATABASE_URL'
  let app = context.flags.app || process.env.HEROKU_APP

  let addons = yield heroku.get(`/apps/${app}/addons`)
  let db_addon = _.find(addons, (o) => { return _.includes(o.config_vars, source) })

  if( ! db_addon ) throw new Error(`Cannot find DB addon '${source}'`)

  console.log(`Initializing washtub for your database ${source}`)

  let configs = yield heroku.get(`/apps/${app}/config-vars`)
  let washtub_db_client = new WashtubDatabase({ auth_token: configs.WASHTUB_TOKEN })
  let result = yield washtub_db_client.create(db_addon, configs[source])
  let wid = result.data

  console.log('Done.')
}

module.exports = {
  topic: 'washtub',
  command: 'init',
  description: "Initialize Washtub for your application's database",
  help: `Examples:

  $ heroku washtub:init [DATABASE_URL]
  `,

  needsAuth: true,

  args: [
    {name: 'database', optional: true, description: 'The database to add to Washtub, defaults to DATABASE_URL'}
  ],

  flags: [
    {name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use'},
  ],

  run: cli.command(co.wrap(run))
}

