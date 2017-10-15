import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { CollectionFast } from 'meteor/hotello:collection-fast';

const Posts = new CollectionFast('posts', {
  schema: {
    title: {type: String},
    body: {type: String}
  },
  pickForMethods: ['title', 'body']
});

const Comments = new CollectionFast('comments', {
  schema: {
    body: {type: String},
    postId: {type: String}
  },
  pickForMethods: ['body']
});

Posts.helpers({
  comments() {
    return Comments.find({postId: this._id});
  }
});

Posts.queries.set({
  'posts.all': function(params, userId) {
    return {selector: {}, options: {limit: params.limit}};
  }
});

if (Meteor.isServer) {
  Posts.setPubsChildren([{
    find(post) {
      return Comments.find({ postId: post._id });
    }
  }]);

  if (!Posts.findOne()) {
    _.times(20, () => {
      const postId = Posts.insert({title: 'Hello World!', body: 'I\'m a post.'});
      _.times(2, () => {
        Comments.insert({body: 'I\'m a comment!', postId: postId});
      })
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

  Template.body.onCreated(function() {
    this.subscribe('posts.random');
  });
  Template.body.helpers({
    randomPostId: () => Posts.findOne()._id
  });

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

  Template.Posts_item_container.helpers({
    posts: () => Posts,
    randomPostId: () => Posts.findOne()._id
  });

  Template.Posts_item.helpers({
    posts: () => Posts
  });
}
