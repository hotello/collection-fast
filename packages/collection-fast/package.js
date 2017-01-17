Package.describe({
  name: 'hotello:collection-fast',
  version: '1.4.0',
  // Brief, one-line summary of the package.
  summary: 'Methods, publications, forms and smart components in seconds.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/hotello/collection-fast.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.2.3');
  api.use([
    'meteor-base@1.0.4',
    'mongo@1.1.14',
    'blaze-html-templates@1.0.5',
    'reactive-var@1.0.11',
    'reactive-dict@1.1.8',
    'jquery@1.11.10',
    'tracker@1.1.1',
    'es5-shim@4.6.15',
    'ecmascript@0.6.1',

    'aldeed:simple-schema@1.5.3',
    'aldeed:collection2@2.10.0',
    'aldeed:autoform@5.8.1',
    'mdg:validated-method@1.1.0',
    'reywood:publish-composite@1.4.2',
    'tmeasday:publish-counts@0.8.0',

    'hotello:useful-dicts@1.0.1'
  ]);
  api.mainModule('collection-fast.js');
  api.addFiles('client/index.js', 'client');
});

Package.onTest(function(api) {
  api.use([
    'ecmascript@0.6.1',
    'practicalmeteor:mocha@2.4.5_6',
    'dburles:factory@1.1.0',
    'johanbrook:publication-collector@1.0.5'
  ]);
  api.use('hotello:collection-fast');
  api.mainModule('collection-fast-tests.js');
});
