'use strict'

module.exports = (function() {
  let co = require('co');
  let cli = require('heroku-cli-util');
  let _ = require('lodash');
  let heroku
  let context
  let appname
  let source_db
  let source_db_plan
  let new_db

  let setup = function(c, h) {
    context = c
    heroku = h
    source_db = context.args.DBNAME
    appname = context.flags.app || process.env.HEROKU_APP
  }

  let discover_db = function(data) {
    let db_predicate = (o) => { return _.includes(o.config_vars, source_db) && o.addon_service.name == 'heroku-postgresql' }
    let addon = _.find(data, db_predicate)
    source_db_plan = addon.plan.name
  }

  let create_new_db = function() {

    let body = {
      confirm: appname,
      plan: source_db_plan
    }

    let response = heroku.post(`/apps/${appname}/addons`, { body: body })
    response.then((v) => {
      console.log(v)
    })
  }

  let run = function*(c, h) {
    setup(c, h)
    discover_db(yield heroku.get(`/apps/${appname}/addons`))
    create_new_db()
  }

  return {
    topic: 'washtub',
    command: 'dump',
    description: 'Washes a production database making it suitable for development purposes',
    help: `Examples:

    $ heroku washtub:dump DBNAME`,

    needsAuth: true,

    args: [
      {name: 'DBNAME', optional: false, description: 'The database to wash'}
    ],

    flags: [
      {name: 'app', char: 'a', hasValue: true, description: 'the Heroku app to use'},
    ],

    run: cli.command(co.wrap(run))
  }
})()

