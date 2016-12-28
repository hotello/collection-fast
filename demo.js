import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { CollectionFast } from 'meteor/hotello:collection-fast';

export const Posts = new CollectionFast('posts', {
  schema: {
    title: {type: String},
    body: {type: String}
  },
  pickForMethods: ['title', 'body']
});

Posts.queries.set({
  'posts.all': function(params) {
    return {selector: {}, options: {limit: params.limit}};
  }
});

if (Meteor.isServer) {
  if (!Posts.findOne()) {
    _.times(20, () => {
      Posts.insert({title: 'Hello World!', body: 'I\'m a post.'});
    });
  }

  // Publication for demo purpose
  Meteor.publish('posts.random', function() {
    return Posts.find({}, {limit: 1});
  });
}

if (Meteor.isClient) {
  import { Template } from 'meteor/templating';
  import './demo.html';

  Template.Posts_list_container.helpers({
    posts: () => Posts,
    query() {
      return {name: 'posts.all', params: {perPage: 5}};
    }
  });

  Template.Posts_list.events({
    'click .js-load-more': function() {
      this.loadMore();
    }
  });

  Template.Posts_form_insert.helpers({
    posts: () => Posts
  });

  Template.Posts_item_container.onCreated(function() {
    this.autorun(() => {
      this.subscribe('posts.random');
    });
  });
  Template.Posts_item_container.helpers({
    posts: () => Posts,
    randomPostId: () => Posts.findOne()._id
  });

  Template.Posts_item.helpers({
    posts: () => Posts
  });
}
