const path = require('path');
module.exports = {
  entry: './src/nql_inc.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: 'nql',
    filename: 'nql.js'
  },
  mode: 'development', // production Or 'development' for unminified output
};
