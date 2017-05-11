module.exports = {
  
  'embedded.platform.applications.install': {
      actionName: 'embedded.platform.applications.install',
      customFunction: require('./domains/platform.applications/embedded.platform.applications.install')
  },
  
  'embedded.platform.applications.uninstall': {
      actionName: 'embedded.platform.applications.uninstall',
      customFunction: require('./domains/platform.applications/embedded.platform.applications.uninstall')
  }
};
