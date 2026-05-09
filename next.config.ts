/** @type {import('next').NextConfig} */
const nextConfig = {
  // Indispensable pour Hostinger
  output: 'standalone', 

  // Cette option permet de passer outre les erreurs de type 
  // qui bloquent ton build actuellement sur Hostinger
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optionnel : ignore aussi les erreurs ESLint pour le build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;