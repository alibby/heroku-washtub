'use strict'

const {spawn} = require('child_process')

module.exports = function(database) {
  let pg = spawn('pg_restore', ['--clean', '--no-owner', '--dbname', database])

  pg.on('error', (error) => {
    console.log('pgrestore error:')
    console.log(error)
  })

  pg.stdin.on('error', (error) => {
    console.log('pgrestore error:')
    console.log(error)
  })

  pg.stdout.on('data', (data) => {
    console.log(data.toString())
  })

  pg.stderr.on('data', (data) => {
    console.log(data.toString())
  })

  return pg
}
