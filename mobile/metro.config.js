// expo-router v6 requires EXPO_ROUTER_APP_ROOT to be set before Metro
// loads so the transform worker can replace it with a string literal.
process.env.EXPO_ROUTER_APP_ROOT = './app'

const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

module.exports = config
