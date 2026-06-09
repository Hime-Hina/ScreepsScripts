import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/main.ts',
  output: {
    exports: 'named',
    file: 'dist/main.js',
    format: 'cjs',
    sourcemap: false,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.build.json',
    }),
  ],
  treeshake: {
    moduleSideEffects: false,
  },
};
