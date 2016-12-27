import { _ } from 'meteor/underscore';

import { Dict } from './dict.js';

export class Hooks extends Dict {
  /**
   * Add a function to a group of hooks
   * @param {String} key a valid key string for a group of hooks
   * @param {Function} fn a function to add to the group of hooks
   */
  add(key, fn) {
    // check arguments
    if (!_.isString(key)) throw Error('hooks.add: first argument must be a String.');
    if (!_.isFunction(fn)) throw Error('hooks.add: second argument must be a Function.');
    // if the group of hooks does not exist, setup it
    if (!_.isArray(this.pairs[key])) this._setup(key);
    // add the function to the group
    this.pairs[key].push(fn);
  }
  // runs a group of hooks
  run(key, data) {
    // if key is not found return data
    if(!this.pairs[key]) return data;
    // if key exists get the array of functions
    const hooks = this.get(key);
    // iterate with all functions
    return hooks.reduce(function(result, hook) {
      if (_.isUndefined(result)) throw new Error('hooks.run: all functions must return something!');
      return hook(result);
    }, data);
  }
  // setup a group of hooks
  _setup(key) {
    this.pairs[key] = [];
  }
  // check if a value is a function
  _checkValue(value) {
    if (!_.isArray(value)) {
      throw new Error('hooks._checkValue: must provide only arrays as values.');
    }
    _.each(value, (el) => {
      if (!_.isFunction(el)) {
        throw new Error('hooks._checkValue: must provide only functions as array elements.');
      }
    });
  }
}
