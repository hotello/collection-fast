import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';

import './form-insert.html';

Template.Form_insert.onCreated(function() {
  this.getCollection = () => Template.currentData().collection;
  this.autorun(function() {
    new SimpleSchema({
      collection: {type: Mongo.Collection },
      doc: {type: Object, blackbox: true, optional: true}
    }).validate(Template.currentData());
  });
});
Template.Form_insert.helpers({
  schema() {
    const instance = Template.instance();
    return instance.getCollection().methodsSchema();
  },
  id() {
    const instance = Template.instance();
    return instance.getCollection()._name + '.forms.insert';
  },
  meteormethod() {
    const instance = Template.instance();
    return instance.getCollection()._name + '.insert';
  }
});
