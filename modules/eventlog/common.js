/*
 * rrequest
 * http://www.rrequest.com/
 * (C) Copyright Bashton Ltd, 2013
 *
 * This file is part of rrequest.
 *
 * rrequest is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * rrequest is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with rrequest.  If not, see <http://www.gnu.org/licenses/>.
 *
*/
Meteor.methods({
  add_navbar_item: function() {
    if (this.isSimulation) {
      var nav = Session.get('navbar');
      nav = _.extend([], nav);
      nav.push({
        name: 'eventlog',
        pageurl: '/eventlog',
        display_name: 'Eventlog',
        user_level: 'staff'
      });
      Session.set('navbar', nav);
    }
  },

  enable_eventlog_module: function(args) {
    args = args || {};

    if (this.isSimulation) {
      var nav = Session.get('navbar');
      nav = _.extend([], nav);
      nav.push({
        name: 'eventlog',
        pageurl: '/eventlog',
        display_name: 'Eventlog',
        user_level: 'staff'
      });
      Session.set('navbar', nav);
    } else {
      var hook = Hooks.findOne({module_id: args.module_id});
      if (hook === undefined) {
        Hooks.insert({
          hook: 'settings_page',
          module_id: args.module_id,
          data: 'eventlog_settings_page'
        });
      }
    }
  },

  disable_eventlog_module: function(args) {
    args = args || {};

    if (this.isSimulation) {
      var nav = Session.get('navbar');
      nav = _.extend([], nav);
      nav = _(nav).reject(function(el) { return el.name === "eventlog"; });
      Session.set('navbar', nav);
    } else {
      Hooks.remove({
        modue_id: args.module_id
      });
    }

  }
});