'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let http = require('https')
let wait = require('co-wait')
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
  let wash_id = x.data.id
  let stat = yield wash_client.status(wash_id)

  cli.action.start("Waiting for wash to complete")
  while(stat.data != 'complete') {
    cli.action.status("Waiting for wash to complete")
    yield wait(5000)
    stat = yield wash_client.status(wash_id)
  }

  cli.action.done("Waiting for wash to complete")

  let download_url = (yield wash_client.download_url(wash_id)).data
  console.log(download_url)

  let req = http.get(download_url, (res) => {
    let pgrestore = require('../../lib/pgrestore')(context.args.target)

    res.on('data', (data) => {
      pgrestore.stdin.write(data)
    })

    res.on('end', () => {
      pgrestore.stdin.end()
    })
  })
  req.end()
}


module.exports = {
  topic: 'washtub',
  command: 'wash',
  description: "Create and wash a database from the given backup id",
  help: `Examples:

  $ heroku washtub:wash backup database
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

