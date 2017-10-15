import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Counts } from 'meteor/tmeasday:publish-counts';

import {
  HooksDict,
  FunctionsDict
} from 'meteor/hotello:useful-dicts';

export class CollectionFast extends Mongo.Collection {
  constructor(name, options) {
    const superResult = super(name, options);
    // must provide options
    if(!options) throw new Meteor.Error('collectionFast',
      'Must provide an options object.');
    // create hooks
    this.hooks = new HooksDict({});
    // deny everything
    this._deny();
    // setup schema
    this._setupSchema(options.schema);
    // setup methods
    this._setupMethods(options.pickForMethods);
    // setup publications
    this._setupQueries(options.queries);
    if (Meteor.isServer) this._setupPublications();
    // return the result of parent class
    return superResult;
  }

  /**
   * Collection hooks
   */

  insert(doc, callback) {
    let result;
    // run before hooks
    doc = this.hooks.run('insert.before', doc);
    // run insert
    result = super.insert(doc, callback);
    // extend doc with _id
    if (result) doc._id = result;
    // run after hooks
    this.hooks.run('insert.after', { result, doc });
    // return
    return result;
  }
  update(selector, modifier, options, callback) {
    let result;
    let hookResult;
    // run before hooks
    hookResult = this.hooks.run('update.before', { selector, modifier, options });
    // override
    selector = hookResult.selector;
    modifier = hookResult.modifier;
    options = hookResult.options;
    // run insert
    result = super.update(selector, modifier, options, callback);
    // run after hooks
    this.hooks.run('update.after', { result, selector, modifier, options });
    // return
    return result;
  }
  upsert(selector, modifier, options, callback) {
    let result;
    let hookResult;
    // run before hooks
    hookResult = this.hooks.run('upsert.before', { selector, modifier, options });
    // override
    selector = hookResult.selector;
    modifier = hookResult.modifier;
    options = hookResult.options;
    // run insert
    result = super.upsert(selector, modifier, options, callback);
    // run after hooks
    this.hooks.run('upsert.after', { result, selector, modifier, options });
    // return
    return result;
  }
  remove(selector, callback) {
    let result;
    // run before hooks
    selector = this.hooks.run('remove.before', selector);
    // run insert
    result = super.remove(selector, callback);
    // run after hooks
    this.hooks.run('remove.after', { result, selector });
    // return
    return result;
  }

  /**
   * Extend the collection schema with an object
   * @param {Object} fields
   */
  extendSchema(fields) {
    this.attachSchema(
      _.extend(this.schema._schema, fields),
      {replace: true}
    );
  }

  // deny everything, use only methods
  _deny() {
    // deny everything
    this.deny({
      insert() { return true; },
      update() { return true; },
      remove() { return true; }
    });
  }

  // set up the collection schema
  _setupSchema(schema) {
    if (!schema) {
      throw new Meteor.Error('collectionFast._setupSchema',
        'Must provide a schema in options.');
    }
    this.schema = new SimpleSchema(schema);
    this.attachSchema(this.schema);
  }

  /**
   * Methods
   */

  _setupMethods(pickForMethods) {
    if (!pickForMethods || !_.isArray(pickForMethods)) {
      throw new Meteor.Error('collectionFast._setupMethods',
        'Must provide an array of fields for methods in options');
    }
    this.pickForMethods = pickForMethods;
    // setup methods object
    this.methods = {};
    // name of the collection
    const name = this._name;
    // accept only ids
    const ID_ONLY = new SimpleSchema({
      _id: {type: String, regEx: SimpleSchema.RegEx.Id}
    });
    // pick some field of the schema for methods
    this.methodsSchema = function() {
      return this.simpleSchema().pick(this.pickForMethods);
    }
    // set this as local
    const self = this;

    this.methods.insert = new ValidatedMethod({
      name: `${name}.insert`,
      validate(doc) {
        self.methodsSchema().validate(doc)
      },
      run(doc) {
        const context = this;
        // run hooks on insert
        const result = self.hooks.run('methods.insert', { context, doc });
        // insert and return
        return self.insert(result.doc);
      }
    });

    this.methods.update = new ValidatedMethod({
      name: `${name}.update`,
      validate({ _id, modifier }) {
        ID_ONLY.validate({_id: _id});
        self.methodsSchema().validate(modifier, {modifier: true});
      },
      run({ _id, modifier }) {
        const context = this;
        // run hooks on update
        const result = self.hooks.run('methods.update', { context, _id, modifier });
        // update and return
        return self.update(result._id, result.modifier);
      }
    });

    this.methods.remove = new ValidatedMethod({
      name: `${name}.remove`,
      validate(_id) {
        ID_ONLY.validate({ _id });
      },
      run(_id) {
        const context = this;
        // run hooks on remove
        const result = self.hooks.run('methods.remove', { context, _id });
        // remove and return
        return self.remove(result._id);
      }
    });
  }

  /**
   * Publications
   */

  // setup publications children
  setPubsChildren(pubsChildren) {
    if (Meteor.isServer) {
      this.pubsChildren = pubsChildren;
    } else {
      throw new Meteor.Error('collectionFast.setPubsChildren',
        'You must set publications children on server.');
    }
  }
   // setup queries for publications
   _setupQueries(queries = {}) {
     this.queries = new FunctionsDict(queries);
   }
   // get current publications children
   _getPubsChildren() {
     return this.pubsChildren;
   }
   // setup publications
  _setupPublications() {
    const self = this;
    const collectionName = self._name;
    // set publication children default
    this.pubsChildren = [];

    Meteor.publishComposite(`${collectionName}.byQuery`, function(name, params) {
      const context = this;
      let queryFn;
      let query;
      let result;
      let countId;
      // check arguments passed by the client
      new SimpleSchema({
        name: {type: String},
        params: {type: Object, blackbox: true}
      }).validate({ name, params });
      // run hooks
      result = self.hooks.run('publish.byQuery', { context, name, params });
      // prevent to go on if result is not right
      if (!result || !_.has(result, 'params')) return this.ready();
      // get the query from the queries dict; if we define the query on the server
      // we can exclude malicious queries, we use a function to integrate dynamic data
      // from the publication.
      queryFn = self.queries.get(name);
      // run query function to get the actual query with params got from result
      query = queryFn(result.params, this.userId);
      // publish counts
      countId = `${collectionName}.byQuery.${name}.${JSON.stringify(params)}`;
      Counts.publish(
        this,
        countId,
        self.find(
          query.selector,
          // omit unnecessary fields, fields option interferes with publish-counts
          _.pick(query.options, 'skip', 'limit')
        ),
        { noReady: true }
      );
      // return the constructor for publish composite
      return {
        find() {
          return self.find(query.selector, query.options);
        },
        children: self._getPubsChildren()
      };
    });

    Meteor.publishComposite(`${collectionName}.single`, function(_id) {
      const context = this;
      // check arguments passed by the client
      new SimpleSchema({
        _id: {type: String, regEx: SimpleSchema.RegEx.Id}
      }).validate({ _id });
      // run hooks
      const result = self.hooks.run('publish.single', { context, _id });
      // prevent to go on if result is not right
      if (!result || !_.has(result, '_id')) return this.ready();
      // return the found cursor
      return {
        find() {
          return self.find(result._id);
        },
        children: self._getPubsChildren()
      };
    });
  }
}
