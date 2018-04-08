'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let http = require('https')
let wait = require('co-wait')
let { WashtubWash } = require('../../lib/washtub')
let { ensure_app, ensure_token } = require('../../lib/cli-util')

function * run(context, heroku) {
  let backupid = context.args.backup

  if(! backupid.match(/^b\d+$/)) {
    throw new Error(`Please specify backup id.  ${backupid} does not seem to be a valid backup`)
  }

  let bid = backupid.replace('b', '')
  let app = ensure_app(context)
  let config = yield heroku.get(`/apps/${app}/config-vars`)
  let path = `/client/v11/apps/${app}/transfers/${bid}?verbose=false`
  let options = { host: 'https://postgres-api.heroku.com' }
  let backup = yield heroku.get(path, options)
  let url_body = `/client/v11/apps/${app}/transfers/${bid}/actions/public-url`
  let url = yield heroku.post(url_body, options)

  let token = ensure_token(config, app)
  let wash_client = new WashtubWash({ auth_token: token })

  let x = yield wash_client.create(backup, url)
  let wash_id = x.data.wid
  let stat = yield wash_client.status(wash_id)

  cli.action.start("Wash status: ")

  cli.action.status("washing...")

  while(stat.data != 'complete') {
    yield wait(5000)
    stat = yield wash_client.status(wash_id)
  }

  let download_url = (yield wash_client.download_url(wash_id)).data
  let database = context.args.target

  cli.action.status(`loading data into ${database}`)

  let req = http.get(download_url, (res) => {
    let pgrestore = require('../../lib/pgrestore')(database)

    res.on('data', (data) => {
      pgrestore.stdin.write(data)
    })

    res.on('end', () => {
      pgrestore.stdin.end()
    })
  })
  req.end()

  cli.action.done("Wash complete!")
}


module.exports = {
  topic: 'washtub',
  command: 'wash',
  description: "Create and wash a database from the given backup id",
  help: `Examples:

  $ heroku washtub:wash backup target
  `,

  needsAuth: true,

  args: [
    { name: 'backup', optional: false, description: 'The bakcup_id of a backup to load and wash' },
    { name: 'target', optional: false, description: 'The target DB to load washed data into' }
  ],

  flags: [
    { name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use' },
  ],

  run: cli.command(co.wrap(run))
}

