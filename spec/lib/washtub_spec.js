let {expect} = require('chai')
let assert = require('assert')
let {Washtub, WashtubDatabase} = require('../../lib/washtub')

let hostname = "sometesturl.com"
let url = `https://${hostname}`
let token = '12341234123412342134'

describe('Washtub', function() {
  describe('constructor', function() {
    describe('when not passed an auth_token', function() {
      it('should throw an error', function() {
        expect(function() {
          new Washtub({url: url})
        }).to.throw()
      })
    })

    describe('when passed an auth token', function() {
      it('should not throw an error', function() {
        expect(function() {
          new Washtub({url: url, auth_token: token})
        }).to.not.throw()
      })
    })
  })
})

describe('WashtubDatabase', function() {
  describe('#post_body', function() {
    delete process.env.WASHTUB_URL
    let washtub_db = new WashtubDatabase({auth_token: token})
    let body = JSON.parse(washtub_db.post_body({ joe: 'mamma' }))

    it('should contain the auth_token', function() {
      expect(body.auth_token).to.equal(token)
    })

    it('should contain joe: mamma', function() {
      expect(body.joe).to.equal('mamma')
    })
  })

  describe('#request_options', function() {
    delete process.env.WASHTUB_URL
    let washtub_db = new WashtubDatabase({auth_token: token, url: url})

    let body = JSON.stringify('12345678')
    let options = washtub_db.request_options({ path: '/joe/mamma' }, body)

    it('should use POST method', function() {
      expect(options.method).to.equal('POST')
    })

    it('should set the hostname', function() {
      expect(options.hostname).to.equal(hostname)
    })

    it('should set the port', function() {
      expect(options.port).to.equal(443)
    })

    it('should set the content type header', function() {
      expect(options.headers['Content-Type']).to.equal('application/json')
    })

    it('should set the content length header according to the body', function() {
      expect(options.headers['Content-Length']).to.equal(body.length)
    })

    it('should set the path', function() {
      expect(options.path).to.equal('/joe/mamma')
    })
  })

  describe('#create', function() {
    delete process.env.WASHTUB_URL
    let body = JSON.stringify('12345678')
    let washtub_db = new WashtubDatabase({auth_token: token}, body)
    it('should return a promise', function() {
      console.dir(washtub_db.create({addon: 'info'}, 'someurl'))
    })
  })

  describe('#wash', function() {
    let body = JSON.stringify('12345678')
    let washtub_db = new WashtubDatabase({auth_token: token}, body)

    it('should return a promise', function() {
      console.dir(washtub_db.wash('b004'))
    })
  })
})
