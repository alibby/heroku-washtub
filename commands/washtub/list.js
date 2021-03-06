'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let _ = require('lodash')
let { WashtubWash } = require('../../lib/washtub')
let { ensure_app, ensure_token } = require('../../lib/cli-util')

function * run(context, heroku) {
  let app = ensure_app(context)
  let config = yield heroku.get(`/apps/${app}/config-vars`)
  let token = ensure_token(config, app)
  let washtub_client = new WashtubWash({ auth_token: token })

  co(function *() {
    let response = yield washtub_client.list()
    let washes = response.data

    let data = _.map(washes, function(wash) {
      return {
        wid: wash.wid,
        state: wash.completed_at ? 'complete' : 'incomplete',
        started_at: wash.started_at ? new Date(wash.started_at).toLocaleString() : '',
        completed_at: wash.completed_at ? new Date(wash.completed_at).toLocaleString() : ''
      }
    })

    cli.styledHeader("Washes")

    cli.table(data, {
      columns: [
        { key: 'wid', label: 'wash' },
        { key: 'state', label: 'state' },
        { key: 'started_at', label: 'started' },
        { key: 'completed_at', label: 'completed' }
      ]
    })
    console.log()
  }).catch( (error) => {
    cli.error(`There was a problem retrieving your wash list: ${error.message}`)
    cli.exit(1)
  })
}

module.exports = {
  topic: 'washtub',
  command: 'list',
  description: "List washes available for pull",
  help: `Examples:

  $ heroku washtub:list
  `,

  needsAuth: true,
  needsApp: true,

  run: cli.command(co.wrap(run))
}

