import path from 'path';
import { fileURLToPath } from 'url';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  entry: './src/main/main.mjs',
  target: 'web', // Adjusted target for renderer process
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            // Your Babel configuration
          },
        },
      },
      // Other loaders...
    ],
  },
  plugins: [
    new NodePolyfillPlugin(), // Ensure Node.js core modules are polyfilled
  ],
  // Additional configuration...
};