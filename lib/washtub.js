'use strict'

let { URL } = require('url')

class Washtub {
  constructor(options) {
    let defaults = {
      url: process.env.WASHTUB_URL || 'https://washtubapp.com'
    }

    this.options = Object.assign(defaults, options)

    if(! this.options.auth_token) throw new Error('please pass washtub auth_token')

    this.url = new URL(this.options.url)
    this.auth_token = this.options.auth_token
  }

  request(options, body) {
    return new Promise((resolve, reject) => {
      let http = require(this.url.protocol.replace(':', ''))
      let data = ''

      let req = http.request(options, (res) => {
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          let parsed = JSON.parse(data)

          if(res.statusCode == 200) {
            resolve(parsed)
          } else {
            reject(new Error(parsed.data))
          }
        })
      })

      if(body) {
        req.write(body)
      }
      req.end()
    })
  }

  get_washtub_port() {
    if(this.url.port == '') {
      if(this.url.protocol == 'https:') {
        return 443
      } else if(this.url.protocol == 'http:') {
        return 80
      }
    } else {
      return this.url.port
    }
  }

  post_body(params) {
    let defaults = { auth_token: this.auth_token }
    return JSON.stringify(Object.assign(defaults, params))
  }

  request_options(options, body) {
    let defaults = {
      method: 'POST',
      hostname: this.url.hostname,
      port: this.get_washtub_port(),
      headers: { 'Content-Type': 'application/json' }
    }

    if(body) {
      defaults.headers['Content-Length'] = Buffer.byteLength(body)
    }

    return Object.assign(defaults, options)
  }
}

class WashtubDatabase extends Washtub {
  create(addon_info, db_url) {
    let body = this.post_body({ database: addon_info, connect_url: db_url })
    let options = this.request_options({ path: '/api/v1/databases' }, body)

    return this.request(options, body)
  }
}

class WashtubWash extends Washtub {
  create(backup_info, backup_url) {
    let body = this.post_body({backup_info: backup_info, url_info: backup_url})
    let options = this.request_options({ path: '/api/v1/washes' }, body)

    return this.request(options, body)
  }

  list() {
    let options = this.request_options({ method: 'GET', path: `/api/v1/washes?auth_token=${this.auth_token}` })
    return this.request(options)
  }

  status(wash_id) {
    let options = this.request_options({ method: 'GET', path: `/api/v1/washes/${wash_id}/status?auth_token=${this.auth_token}` })
    return this.request(options)
  }

  download_url(wash_id) {
    let options = this.request_options({ method: 'GET', path: `/api/v1/washes/${wash_id}/download_url?auth_token=${this.auth_token}` })
    return this.request(options)
  }
}

const load_wash = function(wash_url, database) {
  let cli = require('heroku-cli-util')
  let {spawnSync} = require('child_process')
  let curl = `curl --silent '${wash_url}'`
  let pg_restore = `pg_restore --create --no-acl --clean --no-owner --dbname '${database}'`

  cli.action.start(`Pulling into database ${database}`)
  cli.action.status("loading")

  let result = ''
  let errors = ''
  let opts = { encoding: 'utf8', stdio: ['ignore', 'pipe'], shell: true}
  let cmd = spawnSync(`${curl} | ${pg_restore}`, [], opts)

  if(cmd.status === 0) {
    cli.action.done("Done")
  } else if(cmd.stderr) {
    cli.action.done("Error")
    cli.error(`Error: ${cmd.stderr}`)
  } else {
    cli.action.done("Error")
    cli.error(`Load dump and resture exited with non-zero exit status: ${cli.status}`)
  }

  return cmd
}

module.exports = {
  Washtub: Washtub,
  WashtubDatabase: WashtubDatabase,
  WashtubWash: WashtubWash,
  load_wash: load_wash
}
