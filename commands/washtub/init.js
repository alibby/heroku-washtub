'use strict'

let co = require('co');
let cli = require('heroku-cli-util');
let _ = require('lodash')
let querystring = require('querystring')


function get_washtub_url() {
  let { URL } = require('url')
  return new URL(process.env.WASHTUB_URL || 'https://washtub-core-production.herokuapp.com/')
}

function get_http() {
  let { URL } = require('url')
  let url = get_washtub_url()
  return require(url.protocol.replace(':',''))
}

function create_washtub_db(addon_info, db_url, auth_token) {
  return new Promise((resolve, reject) => {
    let post_body = JSON.stringify({
      auth_token: auth_token,
      database: addon_info,
      connect_url: db_url,
    })

    let washtub_url = get_washtub_url()

    let options = {
      method: 'POST',
      hostname: washtub_url.hostname,
      port: washtub_url.port,
      path: '/api/v1/databases',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(post_body)
      }
    }

    let data = ''
    let http = get_http()

    let req = http.request(options, (res) => {
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if(res.statusCode == 200) {
          resolve(data)
        } else {
          reject(new Error(res.statusCode))
        }
      })
    })

    req.write(post_body)
    req.end()
  })
}

function * run(context, heroku) {
  let source = context.args.database || 'DATABASE_URL'
  let app = context.flags.app || process.env.HEROKU_APP

  let addons = yield heroku.get(`/apps/${app}/addons`)
  let db_addon = _.find(addons, (o) => { return _.includes(o.config_vars, source) })

  if( ! db_addon ) throw new Error(`Cannot find DB addon '${source}'`)

  let configs = yield heroku.get(`/apps/${app}/config-vars`)

  let result = yield create_washtub_db(db_addon, configs[source], configs['WASHTUB_TOKEN'])

  console.log(result)
}

module.exports = {
  topic: 'washtub',
  command: 'init',
  description: "Initialize Washtub for your application's database",
  help: `Examples:

  $ heroku washtub:init DATABASE_URL
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

