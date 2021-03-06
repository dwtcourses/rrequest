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
Meteor.publish('currentUser', function() {
  return Meteor.users.find({_id: this.userId});
});

Meteor.publish('staffUsers', function() {
    return Meteor.users.find({"profile.isStaff": true}, {fields: {
      secret_id: false,
      isAdmin: false,
      emails: false,
      notifications: false,
      'services.password': false,
      'services.resume': false,
      'services.google.accessToken': false,
      'services.google.expiresAt': false,
      'services.google.family_name': false,
      'services.google.gender': false,
      'services.google.given_name': false,
      'services.google.id': false,
      'services.google.locale': false,
      'services.google.verified_email': false
    }});
});

Meteor.publish('sortedUsers', function(sort, filter, limit) {
    var user = Meteor.users.findOne({_id: this.userId});

    if (user !== undefined) {
        if (user.profile.isStaff) {
            var results = Meteor.users.find(filter, {sort: sort, limit: limit});
            return results;
        } else {
            var usergroups = Groups.find({members: {$in: [this.userId]}});
            var groupids = [];
            var userids = [];
            usergroups.forEach(function(group){
              groupids.push(group._id);
              group.members.forEach(function(groupuser){
                userids.push(groupuser);
              });
            });
            newfilter = filter;
            newfilter._id = {$in: userids};
            newfilter.profile.isStaff = true;
            return Meteor.users.find(newfilter, {sort: sort, limit: limit, fields: {
              secret_id: false,
              isAdmin: false,
              emails: false,
              notifications: false,
              'services.password': false,
              'services.resume': false,
              'services.google.accessToken': false,
              'services.google.expiresAt': false,
              'services.google.family_name': false,
              'services.google.gender': false,
              'services.google.given_name': false,
              'services.google.id': false,
              'services.google.locale': false,
              'services.google.verified_email': false
            }});
        }
    }
});

Meteor.startup(function(){
  Meteor.users.allow({
    insert: function(userId, doc) {
      return true;
    },
    update: function(userId, docs, fieldNames, modifier) {
      return _.all(docs, function (doc) {
        if (is_admin_by_id(userId)) {
          return true;
        }
        return false;
      });
    },
    remove: function (userId, docs) {
      return ! _.any(docs, function (doc) {
        if (is_admin_by_id(userId)) {
          return true;
        }
        return false;
      });
    }
  });
});

Meteor.publish('singleTicket', function(id) {
  var user = Meteor.users.findOne({_id: this.userId});
  var usergroups = Groups.find({members: {$in: [this.userId]}});
  var groupids = [];
  usergroups.forEach(function(group){
    groupids.push(group._id);
  });
  if (user && user.profile.isStaff) {
    return Tickets.find({_id: id, isVisible: {$ne: false}});
  } else {
    return Tickets.find({_id: id, isVisible: {$ne: false}, $or: [{groups: {$in: groupids}}, {'requesters.id': {$in: [this.userId]}}]});
  }
});

Meteor.publish('sortedTickets', function(sort, filter, limit) {
    var user = Meteor.users.findOne({_id: this.userId});
    var usergroups = Groups.find({members: {$in: [this.userId]}});
    var groupids = [];
    usergroups.forEach(function(group){
        groupids.push(group._id);
    });
    if (user !== undefined) {
        if (user.profile.isStaff) {
            filter.isVisible = {$ne: false};
            return Tickets.find(filter, {sort: sort, limit: limit});
        } else {
            if (filter['$or'] !== undefined) {
                if (filter.status !== undefined) {
                    var newfilter = {
                        isVisible: {$ne: false},
                        status: filter.status,
                        $and: [
                            {$or: [
                                {groups: {$in: groupids}},
                                {'requesters.id': {$in: [this.userId]}}
                            ]},
                            {$or: filter['$or']}
                        ]
                    };
                } else {
                    newfilter = filter;
                    newfilter.isVisible = {$ne: false};
                }
            } else {
                if (filter.status !== undefined) {
                    var newfilter = {
                        isVisible: {$ne: false},
                        status: filter.status,
                        $or: [
                            {groups: {$in: groupids}},
                            {'requesters.id': {$in: [this.userId]}}
                        ]
                    };
                } else {
                    newfilter = filter;
                    newfilter.isVisible = {$ne: false};
                }
            }
        }
        ticketsCursor = Tickets.find(newfilter, {sort: sort, limit:limit});
        return ticketsCursor;
    }
});

Meteor.publish("counts-by-ticketstate", function (state) {
  var self = this;
  var count = 0;
  var initializing = true;
  var handle = Tickets.find({status: state, isVisible: {$ne: false}}, {fields: {_id: 1, status: 1}}).observeChanges({
    added: function (id) {
      count++;
      if (!initializing)
        self.changed("ticketstatecounts", state, {count: count});
    },
    removed: function (id) {
      count--;
      self.changed("ticketstatecounts", state, {count: count});
    }
  });

  initializing = false;
  self.added("ticketstatecounts", state, {count: count});
  self.ready();

  self.onStop(function () {
    handle.stop();
  });
});


Meteor.publish("counts-by-group", function(group) {
  var self = this;
  var count1 = 0;
  var count7 = 0;
  var count28 = 0;
  var initializing = true;

  var date28 = new Date();
  date28.setDate(date28.getDate() - 28);

  var handle28 = Tickets.find({groups: group, created: {$gte: date28}, isVisible: {$ne: false}}).observeChanges({
      added: function (id, fields) {
        count28++;
        if (!initializing)
          self.changed("groupcount", group, {1: count1, 7: count7, 28: count28});
      },
      removed: function (id) {
        count28--;
        self.changed("groupcount", group, {1: count1, 7: count7, 28: count28});
      }
  });

  var date7 = new Date();
  date7.setDate(date7.getDate() - 7);

  var handle7 = Tickets.find({groups: group, created: {$gte: date7}, isVisible: {$ne: false}}).observeChanges({
      added: function (id, fields) {
        count7++;
        if (!initializing)
          self.changed("groupcount", group, {1: count1, 7: count7, 28: count28});
      },
      removed: function (id) {
        count7--;
        self.changed("groupcount", group, {1: count1, 7: count7, 28: count28});
      }
  });

  var date1 = new Date();
  date1.setDate(date1.getDate() - 1);

  var handle1 = Tickets.find({groups: group, created: {$gte: date1}, isVisible: {$ne: false}}).observeChanges({
      added: function (id, fields) {
        count1++;
        if (!initializing)
          self.changed("groupcount", group, {1: count1, 7: count7, 28: count28});
      },
      removed: function (id) {
        count1--;
        self.changed("groupcount", group, {1: count1, 7: count7, 28: count28});
      }
  });

  initializing = false;
  self.added("groupcount", group, {1: count1, 7:count7, 28: count28});
  self.ready();

  self.onStop(function () {
    handle28.stop();
    handle7.stop();
    handle1.stop();
  });
});

Meteor.startup(function(){
  Tickets.allow({
    insert: function(userId, doc) {
      return true;
    },
    update: function(userId, docs, fieldNames, modifier) {
      return true;
    },
    remove: function(userId, docs) {
      return true;
    }
  });
});

Meteor.publish('ticketstatus', function() {
  return TicketStatus.find();
});

Meteor.startup(function(){
  TicketStatus.allow({
    insert: function(userId, doc) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    },
    update: function(userId, docs, fieldNames, modifier) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    },
    remove: function(userId, docs) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    }
  });
});

Meteor.publish('groups', function() {
    var self = this;
    var user = Meteor.users.findOne({_id: this.userId});
    if (user && user.profile.isStaff) {
        groupsCursor = Groups.find();
    } else {
        groupsCursor = Groups.find({members: {$in: [this.userId]}});
    }

    var userIds = [];
    groupsCursor.forEach(function(group) {
        group.members.forEach(function(member){
            userIds.push(member);
        });
    });

    groupsUsersCursor = Meteor.users.find({_id: {$in: userIds}});
    return [groupsCursor, groupsUsersCursor];
});

Meteor.publish('singleGroup', function(id) {
    var user = Meteor.users.findOne({_id: this.userId});
    var usergroups = Groups.find({members: {$in: [this.userId]}});
    if (user && user.profile.isStaff) {
        return Groups.find();
    } else if (usergroups.count() > 0) {
        return usergroups;
    }
});

Meteor.startup(function(){
  Groups.allow({
    insert: function(userId, doc) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    },
    update: function(userId, docs, fieldNames, modifier) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    },
    remove: function(userId, docs) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    }
  });
});

Meteor.publish('hooks', function() {
  return Hooks.find();
});

Meteor.startup(function(){
  Hooks.allow({
    insert: function(userId, doc) {
      return true;
    },
    update: function(userId, docs, fieldNames, modifier) {
      return true;
    },
    remove: function(userId, docs) {
      return true;
    }
  });
});

Meteor.publish('modules', function() {
  return Modules.find();
});

Meteor.startup(function(){
  Modules.allow({
    insert: function(userId, doc) {
      return true;
    },
    update: function(userId, docs, fieldNames, modifier) {
      return true;
    },
    remove: function(userId, docs) {
      return true;
    }
  });
});

Meteor.publish('settings', function() {
  if (is_staff_by_id(this.userId)) {
    return Settings.find();
  }
});

Meteor.startup(function(){
  Settings.allow({
    insert: function(userId, doc) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    },
    update: function(userId, docs, fieldNames, modifier) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    },
    remove: function(userId, docs) {
      if (is_staff_by_id(userId)) {
        return true;
      } else {
        return false;
      }
    }
  });
});
