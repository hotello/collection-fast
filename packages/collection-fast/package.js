Package.describe({
  name: 'hotello:collection-fast',
  version: '1.5.1',
  // Brief, one-line summary of the package.
  summary: 'Methods, publications, forms and smart components in seconds.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/hotello/collection-fast.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4');
  api.use([
    'meteor-base@1.0.0',
    'mongo@1.0.0',
    'blaze-html-templates@1.0.0',
    'reactive-dict@1.0.0',
    'ecmascript@0.8.0',

    'aldeed:simple-schema@1.0.0',
    'aldeed:collection2@2.0.0',
    'aldeed:autoform@5.0.0',
    'mdg:validated-method@1.0.0',
    'reywood:publish-composite@1.0.0',
    'tmeasday:publish-counts@0.8.0',

    'hotello:useful-dicts@1.0.0'
  ]);
  api.mainModule('collection-fast.js');
  api.addFiles('client/index.js', 'client');
});

Package.onTest(function(api) {
  api.use([
    'ecmascript@0.8.0',
    'practicalmeteor:mocha@2.0.0',
    'dburles:factory@1.0.0',
    'johanbrook:publication-collector@1.0.0'
  ]);
  api.use('hotello:collection-fast');
  api.mainModule('collection-fast-tests.js');
});
