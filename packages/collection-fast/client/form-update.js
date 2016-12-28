import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';

import './form-update.html';

Template.Form_update.onCreated(function() {
  this.getCollection = () => Template.currentData().collection;
  this.getDocumentId = () => Template.currentData().documentId;
  this.autorun(() => {
    new SimpleSchema({
      collection: {type: Meteor.Collection},
      documentId: {type: String, regEx: SimpleSchema.RegEx.Id}
    }).validate(Template.currentData());
    const collection = this.getCollection();
    // subscribe by post id
    this.subscribe(`${collection._name}.single`, this.getDocumentId());
  });
});
Template.Form_update.helpers({
  schema() {
    const instance = Template.instance();
    return instance.getCollection().methodsSchema();
  },
  id() {
    const instance = Template.instance();
    return instance.getCollection()._name + '.forms.update';
  },
  getDoc(documentId) {
    const instance = Template.instance();
    return instance.getCollection().findOne(documentId);
  },
  meteormethod() {
    const instance = Template.instance();
    return instance.getCollection()._name + '.update';
  }
});
