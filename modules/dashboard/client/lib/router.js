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
Router.map(function() {
    this.route('dashboard', {
        path: '/dashboard',
        onAfterAction: function() {
            var site_name = get_sitename();
            if (site_name !== undefined) {
                document.title = site_name + ': ' + this.route.name;
            } else {
                document.title = this.route.name;
            }
        },
        onBeforeAction: function() {
            Meteor.subscribe("userdashboard");
            Meteor.subscribe('ticketstatus', function() {
                var tstatus = TicketStatus.find({});
                tstatus.forEach(function(status) {
                    var name = status.name;
                    Meteor.subscribe("counts-by-ticketstate", name, function() {
                        Session.set(name + 'ticketcountready', name);
                    });
                });
            });
            this.next();
        }
    });
});
