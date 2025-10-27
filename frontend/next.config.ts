// import path from 'path'
// import type { NextConfig } from 'next'

// const nextConfig: NextConfig = {
//   webpack: (config) => {
//     config.resolve.alias = {
//       ...(config.resolve.alias || {}),
//       '@data': path.resolve(__dirname, 'data'),
//     }
//     return config
//   },
// }

// export default nextConfig




//Updated code for Particle simulation

import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'raw-loader',
        },
        {
          loader: 'glslify-loader',
        },
      ],
    });

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@data': path.resolve(__dirname, 'data'),
    };

    return config;
  },
};

export default nextConfig;
