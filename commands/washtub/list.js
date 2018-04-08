'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let _ = require('lodash')
let { WashtubWash } = require('../../lib/washtub')

function * run(context, heroku) {
  let app = context.flags.app || process.env.HEROKU_APP
  let config = yield heroku.get(`/apps/${app}/config-vars`)
  let washtub_client = new WashtubWash({ auth_token: config.WASHTUB_TOKEN })
  let response = yield washtub_client.list()
  let washes = response.data


  let data = _.map(washes, function(wash) {
    return { wid: wash.wid, state: (wash.wash_s3_key ? 'complete' : 'washing') }
  })

  cli.styledHeader("Washes")

  cli.table(data, {
    columns: [
      { key: 'wid', label: 'wash' },
      { key: 'state', label: 'state' }
    ]
  })
  console.log()
}

module.exports = {
  topic: 'washtub',
  command: 'list',
  description: "List washes available for pull",
  help: `Examples:

  $ heroku washtub:list
  `,

  needsAuth: true,

  flags: [
    { name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use' },
  ],

  run: cli.command(co.wrap(run))
}

