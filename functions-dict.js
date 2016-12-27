import { _ } from 'meteor/underscore';

import { Dict } from './dict.js';

export class FunctionsDict extends Dict {
  // check if a value is a function
  _checkValue(value) {
    if (!_.isFunction(value)) {
      throw new Error('functionsDict._checkValue: must provide only functions as values.');
    }
  }
}
