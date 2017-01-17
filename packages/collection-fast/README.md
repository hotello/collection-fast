# Collection Fast

> Give me a collection, fast!!!

Generate a collection with *methods*, flexible *publications*, *forms* and *smart Blaze components*, for people that have no time to loose.

Under the hood everything is done following the [Meteor guide](https://guide.meteor.com/). Look at the source code, isn't it familiar?

To see it in action have a look at [gyroscope](https://github.com/hotello/gyroscope).

## Define the collection
```js
import { CollectionFast } from 'meteor/hotello:collection-fast';

const Posts = new CollectionFast('posts', {
  schema: {
    title: {type: String},
    body: {type: String}
  },
  pickForMethods: ['title', 'body']
});
```
Note that the **schema** is a *SimpleSchema*, use exactly any SimpleSchema schema you like.

For methods we usually use only some fields of the schema, **pickForMethods** defines which fields we want to allow from the client.
Under the hood the *.pick()* method of SimpleSchema instance is used, refer to its documentation for more.
## What did I get for free?
### Hooks on insert, update, upsert and delete
Now on:
```js
Posts.insert({title: 'Hello World!'});
```
you can set an unlimited amount of functions to alter that data and to prepare your documents to be inserted or updated in the database. You can set those hooks everywhere you want. Refer to [useful-dicts](https://github.com/hotello/useful-dicts) docs for more.
```js
// executed before insert
Posts.hooks.add('insert.before', function(post) {
  // do what you want with that post
  post.body = 'It\'s nice to be a post!';
  // remember to always return the same thing you received
  return post;
}
```
Many hooks are available:
```js
Posts.hooks.add('insert.after', function({ result, doc }) {
  // now your post will have an _id property
  return { result, doc };
});

Posts.hooks.add('update.before', function({ selector, modifier, options }) {
  // some es6 sintax is used to make clear what is passed to the function
  return { selector, modifier, options };
});
Posts.hooks.add('update.after', function({ result, selector, modifier, options }) {
  // some es6 sintax is used to make clear what is passed to the function
  return { result, selector, modifier, options };
});

// NOTE: upsert has the same behaviour as update.

Posts.hooks.add('remove.before', function(selector) {
  // do something before removing your document
  return selector;
});
Posts.hooks.add('remove.after', function({ result, selector }) {
  return { result, selector };
});
```
### Extendable schema, even for methods
You can alter the schema of your collection later in the application. Override and extending are allowed.
```js
Posts.extendSchema({
  title: {type: String, max: 500},
  createdAt: {type: Date}
});
```
To extend the schema used to validate data in methods:
```js
Posts.pickForMethods.push('createdAt');
```
### Insert, update and remove methods
Call these methods as usual.
```js
Meteor.call('posts.insert', post, callback);

Meteor.call('posts.update', { _id, modifier }, callback);

Meteor.call('posts.remove', post._id, callback);
```
You can set callback also on methods.
```js
Posts.hooks.add('methods.insert', function({ context, doc }) {
  // 'context' is the usual 'this' you use in methods
  return { context, doc };
});

Posts.hooks.add('methods.update', function({ context, _id, modifier }) {
  return { context, _id, modifier };
});

Posts.hooks.add('methods.remove', function({ context, _id }) {
  return { context, _id};
});
```
### Publications
You get two publications, you can subscribe to them as shown here:
```js
Meteor.subscribe('posts.single', post._id);

Meteor.subscribe('posts.byQuery', 'all', params);
```
To use the latter you must define one ore more queries, both on client and server. Queries are a nice way of putting the Mongo query code both on client and server, so the publication will use a query defined on the server, in a safe way. At the same time the client will get exactly what it asked for. You could even *validate* those *params* with SimpleSchema.
```js
Posts.queries.set({
  'all': function(params) {
    return {selector: {}, options: {limit: params.limit}};
  }
});
```
That **params** is used to pass your custom data into the query. Remember to **always define a limit param**, as it is used for pagination in the Blaze components provided.

```js
Posts.setPubsChildren([{
  find(post) {
    return Comments.find({ postId: post._id });
  }
}]);

// if you are exceedingly cool you can even push or pull related data later in code execution
Posts.pubsChildren.push({
  find(post) {
    return Votes.find({postId: post._id});
  }
});
```
You can set related data for publications. The Array passed to *.setPubsChildren* is the same array you would return with [reywood:publish-composite](https://atmospherejs.com/reywood/publish-composite) as *children* property.

Two hooks are available in publications:
```js
Posts.hooks.add('publish.byQuery', function({ context, name, params }) {
  return { context, name, params };
});

Posts.hooks.add('publish.single', function({ context, _id }) {
  return { context, _id };
});
```
### Blaze components
You get *List*, *Document*, *Form_insert*, *Form_update* components. You must define only some helpers. **Subscriptions** and **pagination** are taken care for you. The components need only some ids and queries.

Forms will automatically generate via AutoForm. You can access AutoForm instances via id. The id is automatically generated by CollectionFast like *posts.forms.insert* and *posts.forms.update*.
#### List
```html
<!-- posts-list.html -->

<template name="Posts_list_container">
  {{#List collection=posts query=query}}
    {{> Posts_list listArgs}}
  {{/List}}
</template>

<template name="Posts_list">
  {{#each document in documents}}
    <p>{{document.title}}</p>
  {{/each}}
  {{#if noResults}}
    <p>No posts.</p>
  {{/if}}
  {{#if loading}}
    <p>Loading...</p>
  {{/if}}
  {{#if hasMore}}
    <button class="js-load-more">Load more...</button>
  {{/if}}
</template>
```
```js
// posts-list.js

Template.Posts_list_container.helpers({
  posts: () => Posts,
  query() {
    // perPage defines the number of elements per page on pagination.
    // It defaults to 10, but you can choose.
    return {name: 'all', params: {perPage: 5}};
  }
});

Template.Posts_list.events({
  'click .js-load-more': function() {
    // function that loads more documents for pagination
    this.loadMore();
  }
});
```
#### Document
```html
<!-- posts-item.html -->

<template name="Posts_item_container">
  {{#Document collection=posts documentId=postId}}
    {{> Posts_item documentArgs}}
  {{/Document}}
</template>

<template name="Posts_item">
  {{#if document}}
    <h4>{{document.title}}</h4>
    <p>{{document.body}}</p>
  {{/if}}
  {{#if loading}}
    <p>Loading the post...</p>
  {{/if}}
  {{#if noResults}}
    <p>Post not found :(</p>
  {{/if}}
</template>
```
#### Forms
Remember to *define helpers* (as shown above) for the collection and the document to update.
Use **doc** to fill with an object the insert form (optional).
```html
{{> Form_insert collection=posts doc=doc}}

{{> Form_update collection=posts documentId=post._id}}
```
