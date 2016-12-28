import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import './document.html';

Template.Document.onCreated(function() {
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
Template.Document.helpers({
  document() {
    const instance = Template.instance();
    return instance.getCollection().findOne(instance.getDocumentId());
  }
});
