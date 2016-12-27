import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Template.Document.onCreated(function() {
  this.getCollection = () => Template.currentData().collection;
  this.getDocumentId = () => Template.currentData().documentId;
  this.autorun(() => {
    new SimpleSchema({
      documentId: {type: String, regEx: SimpleSchema.regEx.Id},
      collection: {type: Meteor.Collection}
    }).validate(Template.currentData());
    const collection = this.getCollection();
    // subscribe by post id
    this.subscribe(`${collection._name}.byQuery`,
      `${collection._name}.single`, this.getDocumentId());
  });
});
Template.Posts_item.helpers({
  document(documentId) {
    const instance = Template.instance();
    return instance.getCollection().findOne(postId);
  }
});
