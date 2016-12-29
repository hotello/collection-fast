import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { assert } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Tracker } from 'meteor/tracker';

import { CollectionFast } from 'meteor/hotello:collection-fast';

const Documents = new CollectionFast('documents', {
  schema: {field1: {type: Boolean, optional: true}},
  pickForMethods: ['field1']
});

Factory.define('document', Documents, {
  field1: () => true
});

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
    Documents.hooks.add('documents.insert.before', function(doc) {
      assert.property(doc, 'field1');
      return doc;
    });
    Documents.hooks.add('documents.insert.after', function({ result, doc }) {
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
    Documents.hooks.add('documents.update.before', function({ selector, modifier, options }) {
      assert.isDefined(selector);
      assert.isDefined(modifier.$set);
      return { selector, modifier, options };
    });
    Documents.hooks.add('documents.update.after', function({ result, selector, modifier, options }) {
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
    Documents.hooks.add('documents.upsert.before', function({ selector, modifier, options }) {
      assert.isDefined(selector);
      assert.deepEqual(modifier.$set, document);
      return { selector, modifier, options };
    });
    Documents.hooks.add('documents.upsert.after', function({ result, selector, modifier, options }) {
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
    Documents.hooks.add('documents.remove.before', function(selector) {
      assert.isDefined(selector);
      return selector;
    });
    Documents.hooks.add('documents.remove.after', function({ result, selector}) {
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
    Documents.hooks.add('documents.methods.insert', function({ context, doc }) {
      assert.property(context, 'userId');
      assert.deepEqual(doc, document);
      return { context, doc };
    });
    const result = Documents.methods.insert._execute(methodInvocation, document);
    assert.isString(result);
  });

  it('should update documents', function() {
    const documentId = Factory.create('document')._id;
    const document = Factory.tree('document');
    Documents.hooks.add('documents.methods.update', function({ context, params }) {
      assert.property(context, 'userId');
      assert.property(params, '_id');
      assert.property(params, 'modifier');
      assert.deepEqual(params.modifier.$set, document);
      return { context, params };
    });
    const result = Documents.methods.update._execute(methodInvocation, {_id: documentId, modifier: {$set: document}});
    assert.equal(result, 1);
  });

  it('should remove documents', function() {
    const documentId = Factory.create('document')._id;
    Documents.hooks.add('documents.methods.remove', function({ context, _id }) {
      assert.property(context, 'userId');
      assert.equal(_id, documentId);
      return { context, _id };
    });
    const result = Documents.methods.remove._execute(methodInvocation, documentId);
    assert.equal(result, 1);
  });
});

describe('publications', function() {
  if (Meteor.isServer) {
    it('should send documents by query', function (done) {
      const collector = new PublicationCollector();
      const documentOne = Factory.create('document');
      const documentTwo = Factory.create('document');
      // set the query function
      Documents.queries.set({'documents.testQuery': function(params) {
        return {selector: params.selector, options: {skip: params.skip}};
      }});
      Documents.hooks.add('documents.publish.byQuery', function({ context, name, params }) {
        assert.isDefined(context);
        assert.equal(name, 'documents.testQuery');
        assert.property(params, 'selector');
        assert.property(params, 'skip');
        return { context, name, params };
      });
      // collect publication result
      collector.collect('documents.byQuery', 'documents.testQuery', {selector: {}, skip: 1}, (collections) => {
        assert.equal(collections.documents.length, 1);
        done();
      });
    });

    it('should send a single document', function (done) {
      const collector = new PublicationCollector();
      const document = Factory.create('document');
      const documentTwo = Factory.create('document');
      Documents.hooks.add('documents.publish.single', function({ context, _id }) {
        assert.isDefined(context);
        assert.equal(_id, document._id);
        return { context, _id };
      });
      collector.collect('documents.single', document._id, (collections) => {
        assert.equal(collections.documents.length, 1);
        assert.equal(collections.documents[0]._id, document._id);
        done();
      });
    });
  }
});
