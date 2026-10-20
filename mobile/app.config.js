/**
 * Complète app.json avec la configuration propre à chaque environnement.
 *
 * Le plugin Google Sign-In exige, pour iOS, le « schéma d'URL inversé » du client iOS
 * (com.googleusercontent.apps.XXXX). Il est lu dans GOOGLE_IOS_URL_SCHEME ; sans cette
 * variable, le plugin n'est pas ajouté et l'application reste compilable (Google y est
 * alors indisponible, et l'écran l'indique).
 */
module.exports = ({ config }) => {
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins || [])];
  if (iosUrlScheme) {
    plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme }]);
  }
  return { ...config, plugins };
};
