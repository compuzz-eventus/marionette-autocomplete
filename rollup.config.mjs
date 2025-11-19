import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/autocomplete.js',
  output: [
    { file: 'dist/autocomplete.esm.js', format: 'esm', sourcemap: true, exports: 'named' },
    { file: 'dist/autocomplete.cjs', format: 'cjs', sourcemap: true, exports: 'named' },
    {
      file: 'dist/autocomplete.umd.js',
      format: 'umd',
      name: 'AutoComplete',
      sourcemap: true,
      exports: 'named',
      globals: {
        underscore: '_',
        jquery: '$',
        backbone: 'Backbone',
        'backbone.marionette': 'Marionette'
      }
    }
  ],
  external: ['underscore', 'jquery', 'backbone', 'backbone.marionette'],
  plugins: [resolve(), commonjs()]
};
