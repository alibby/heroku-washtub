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
    this.request = require(this.url.protocol.replace(':', '')).request
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
}

class WashtubDatabase extends Washtub {
  post_body(params) {
    let defaults = { auth_token: this.auth_token }
    return JSON.stringify(Object.assign(defaults, params))
  }

  request_options(options, body) {
    let defaults = {
      method: 'POST',
      hostname: this.url.hostname,
      port: this.get_washtub_port(),
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }

    return Object.assign(defaults, options)
  }

  create(addon_info, db_url) {
    return new Promise((resolve, reject) => {
      let body = this.post_body({ database: addon_info, connect_url: db_url })
      let options = this.request_options({ path: '/api/v1/databases' }, body)
      let data = ''

      let req = this.request(options, (res) => {
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if(res.statusCode == 200) {
            resolve(data)
          } else {
            reject(new Error(res.statusCode))
          }
        })
      })

      req.write(body)
      req.end()
    })
  }

  wash(backup_info, backup_url) {
    return new Promise((resolve, reject) => {
      let post_body = JSON.stringify({
        auth_token: this.auth_token,
        backup_info: backup_info,
        backup_url: backup_url
      })

      let options = {
        method: 'POST'
      }
    })
  }
}

module.exports = { Washtub: Washtub, WashtubDatabase: WashtubDatabase }
