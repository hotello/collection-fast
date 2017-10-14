import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';
import { assert } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';

import { CollectionFast } from 'meteor/hotello:collection-fast';

const Documents = new CollectionFast('documents', {
  schema: {field1: {type: Boolean, optional: true}},
  pickForMethods: ['field1']
});
const Tests = new Mongo.Collection('tests');

Factory.define('document', Documents, {
  field1: () => true
});
Factory.define('test', Tests);

describe('schema', function() {
  it('should have set the schema', function() {
    assert.instanceOf(Documents.schema, SimpleSchema);
    assert.instanceOf(Documents.simpleSchema(), SimpleSchema);
    assert.deepEqual(Documents.simpleSchema().schema(), Documents.schema._schema);
  });

  it('should extend the schema of a collection', function() {
    Documents.extendSchema({field2: {type: String, optional: true}});
    assert.property(Documents.simpleSchema().schema(), 'field2');
  });

  it('should extend the schema for methods', function() {
    Documents.pickForMethods.push('field2');
    assert.property(Documents.methodsSchema().schema(), 'field2');
  });
});

describe('insert/update/upsert/delete', function() {
  before(function() {
    if (Meteor.isServer) Documents.remove({});
  });

  it('should insert doc with hooks', function() {
    const document = Factory.tree('document');
    Documents.hooks.add('insert.before', function(doc) {
      assert.isObject(doc);
      return doc;
    });
    Documents.hooks.add('insert.after', function({ result, doc }) {
      assert.isString(result);
      assert.isObject(doc);
      assert.property(doc, '_id');
      return { result, doc };
    });
    assert.isString(Documents.insert(document));
  });

  it('should update doc with hooks', function() {
    const document = Factory.tree('document');
    const docId = Documents.insert(document);
    Documents.hooks.add('update.before', function({ selector, modifier, options }) {
      assert.isDefined(selector);
      assert.isDefined(modifier.$set);
      return { selector, modifier, options };
    });
    Documents.hooks.add('update.after', function({ result, selector, modifier, options }) {
      assert.isDefined(result);
      assert.isDefined(selector);
      assert.deepEqual(modifier.$set, document);
      return { result, selector, modifier, options };
    });
    assert.equal(Documents.update(docId, {$set: document}), 1);
  });

  it('should upsert doc with hooks', function() {
    const document = Factory.tree('document');
    const docId = Documents.insert(document);
    Documents.hooks.add('upsert.before', function({ selector, modifier, options }) {
      assert.isDefined(selector);
      assert.isDefined(modifier);
      return { selector, modifier, options };
    });
    Documents.hooks.add('upsert.after', function({ result, selector, modifier, options }) {
      assert.property(result, 'numberAffected');
      assert.isDefined(selector);
      assert.deepEqual(modifier.$set, document);
      return { result, selector, modifier, options };
    });
    assert.isNumber(Documents.upsert(docId, {$set: document}).numberAffected);
  });

  it('should remove doc with hooks', function() {
    const document = Factory.tree('document');
    const docId = Documents.insert(document);
    Documents.hooks.add('remove.before', function(selector) {
      assert.isDefined(selector);
      return selector;
    });
    Documents.hooks.add('remove.after', function({ result, selector}) {
      assert.isNumber(result);
      assert.isDefined(selector);
      return { result, selector };
    });
    assert.equal(Documents.remove(docId), 1);
  });
});

describe('methods', function() {
  let methodInvocation = {userId: Random.id()};

  beforeEach(function() {
    if (Meteor.isServer) {
      Documents.remove({});
    }
  });

  it('should insert documents with hooks', function() {
    const document = Factory.tree('document');
    Documents.hooks.add('methods.insert', function({ context, doc }) {
      assert.property(context, 'userId');
      assert.isDefined(doc);
      return { context, doc };
    });
    const result = Documents.methods.insert._execute(methodInvocation, document);
    assert.isString(result);
  });

  it('should update documents', function() {
    const documentId = Factory.create('document')._id;
    const document = Factory.tree('document');
    Documents.hooks.add('methods.update', function({ context, _id, modifier }) {
      assert.property(context, 'userId');
      assert.isDefined(_id);
      assert.isDefined(modifier);
      assert.deepEqual(modifier.$set, document);
      return { context, _id, modifier };
    });
    const result = Documents.methods.update._execute(methodInvocation, {_id: documentId, modifier: {$set: document}});
    assert.equal(result, 1);
  });

  it('should remove documents', function() {
    const documentId = Factory.create('document')._id;
    Documents.hooks.add('methods.remove', function({ context, _id }) {
      assert.property(context, 'userId');
      assert.isDefined(_id);
      return { context, _id };
    });
    const result = Documents.methods.remove._execute(methodInvocation, documentId);
    assert.equal(result, 1);
  });
});

describe('publications', function() {
  if (Meteor.isServer) {
    Documents.setPubsChildren([{
      find(doc) {
        return Tests.find({ documentId: doc._id });
      }
    }]);

    it('should send documents by query with related data', function (done) {
      const collector = new PublicationCollector();
      const documentOne = Factory.create('document');
      const test = Factory.create('test', {documentId: documentOne._id});
      const params = {_id: documentOne._id};
      // a query with related data and fields option (interferes with publish-counts)
      Documents.queries.set({'testQuery': function(params) {
        return {selector: {_id: params._id}, options: {limit: 1, fields: {field1: 1}}};
      }});
      // collect publication result with related data
      collector.collect('documents.byQuery', 'testQuery', params, (collections) => {
        assert.equal(collections.documents.length, 1);
        assert.equal(collections.tests.length, 1);
        done();
      });
    });

    it('should send a single document', function (done) {
      const collector = new PublicationCollector();
      const documentOne = Factory.create('document');
      const documentTwo = Factory.create('document');
      const test = Factory.create('test', {documentId: documentOne._id});

      collector.collect('documents.single', documentOne._id, (collections) => {
        assert.equal(collections.documents.length, 1);
        assert.equal(collections.documents[0]._id, documentOne._id);
        assert.equal(collections.tests.length, 1);
        done();
      });
    });

    it('checks if hooks on publish.byQuery are working', function(done) {
      const collector = new PublicationCollector();
      Documents.hooks.add('publish.byQuery', function({ context, name, params }) {
        assert.isDefined(context);
        assert.isString(name);
        assert.isDefined(params);
        return false;
      });
      // collect publication result with related data
      collector.collect('documents.byQuery', 'empty', {empty: true}, (collections) => {
        assert.deepEqual(collections, {});
        done();
      });
    });

    it('checks if hooks on publish.single are working', function(done) {
      const collector = new PublicationCollector();
      Documents.hooks.add('publish.single', function({ context, _id }) {
        assert.isDefined(context);
        assert.isString(_id);
        return false;
      });
      // collect publication result with related data
      collector.collect('documents.single', Random.id(), (collections) => {
        assert.deepEqual(collections, {});
        done();
      });
    });
  }
});
