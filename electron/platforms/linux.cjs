module.exports = {
  keyboard: require('./control-keyboard.cjs'),
  install(app) { app.setDesktopName('io.github.yceachan.emd.desktop'); },
  createMenu() { return null; },
};
