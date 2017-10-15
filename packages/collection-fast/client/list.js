import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Mongo } from 'meteor/mongo';
import { Counts } from 'meteor/tmeasday:publish-counts';

import './list.html';

/**
 * List
 */
Template.List.onCreated(function() {
  // get data from template
  this.getCollection = () => Template.currentData().collection;
  this.getQuery = () => Template.currentData().query;
  this.getCountId = () => {
    const collectionName = this.getCollection()._name;
    const name = this.getQuery().name;
    const params = this.getQuery().params;
    return `${collectionName}.byQuery.${name}.${JSON.stringify(params)}`;
  }
  this.getPerPage = (query) => {
    return _.has(query.params, 'perPage') ? query.params.perPage : 10;
  }
  // get cursor results
  this.getCursor = (queryInput) => {
    const userId = Meteor.userId ? Meteor.userId() : null;
    const queryFn = this.getCollection().queries.get(queryInput.name);
    const query = queryFn(queryInput.params, userId);
    const collection = this.getCollection();
    return collection.find(query.selector, query.options);
  };
  // set state
  this.state = new ReactiveDict();
  this.state.setDefault({
    requestedDocuments: this.getPerPage(this.getQuery())
  });
  // autorun
  this.autorun(() => {
    new SimpleSchema({
      collection: {type: Mongo.Collection},
      query: {type: Object},
      'query.name': {type: String},
      'query.params': {type: Object, blackbox: true}
    }).validate(Template.currentData());
    // set variables
    const collection = this.getCollection();
    const name = this.getQuery().name;
    const params = this.getQuery().params;
    // set the limit from the state for pagination
    params.limit = this.state.get('requestedDocuments');
    // subscribe to posts passing the query name
    this.subscribe(`${collection._name}.byQuery`, name, params);
  });
});
Template.List.helpers({
  listArgs(query) {
    const instance = Template.instance();
    return {
      documents: instance.getCursor(query),
      noResults: instance.subscriptionsReady() && instance.getCursor(query).count() === 0,
      loading: !instance.subscriptionsReady(),
      hasMore: instance.getCursor(query).count() < Counts.get(instance.getCountId()),
      loadMore() {
        const current = instance.state.get('requestedDocuments');
        instance.state.set('requestedDocuments', current + instance.getPerPage(query));
      }
    };
  }
});
