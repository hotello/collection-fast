import { Meteor } from 'meteor/meteor';
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
});

describe('insert/update/upsert/delete', function() {
  before(function() {
    if (Meteor.isServer) Documents.remove({});
  });

  it('should insert doc with hooks', function() {
    assert.isString(Documents.insert({}));
  });

  it('should update doc with hooks', function() {
    const docId = Documents.insert({});
    assert.equal(Documents.update(docId, {$set: {field1: true}}), 1);
  });

  it('should upsert doc with hooks', function() {
    assert.isString(Documents.upsert('document_id', {$set: {field1: true}}).insertedId);
  });

  it('should remove doc with hooks', function() {
    const docId = Documents.insert({});
    assert.equal(Documents.remove(docId), 1);
  });
});

describe('methods', function() {
  let methodInvocation = {userId: 'random_id'};

  beforeEach(function() {
    if (Meteor.isServer) {
      Documents.remove({});
    }
  });

  it('should insert documents', function() {
    const document = Factory.tree('document');
    const result = Documents.methods.insert._execute(methodInvocation, document);

    assert.isString(result);
  });

  it('should update documents', function() {
    const documentId = Factory.create('document')._id;
    const document = Factory.tree('document');
    const result = Documents.methods.update._execute(methodInvocation, {_id: documentId, modifier: {$set: document}});

    assert.equal(result, 1);
  });

  it('should remove documents', function() {
    const docId = Factory.create('document')._id;
    const result = Documents.methods.remove._execute(methodInvocation, { docId });

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
      // collect publication result
      collector.collect('documents.byQuery', 'documents.testQuery', {selector: {}, skip: 1}, (collections) => {
        assert.equal(collections.documents.length, 1);
        done();
      });
    });
  }
});
