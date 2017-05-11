/**
 * Implementation for embedded.platform.applications.uninstall

 * This custom function will receive the following context object:
{
  "exec": {
    "saveInstallationState": {
      "parameters": [
        {
          "type": "object"
        }
      ]
    }
  },
  "get": {
    "applicationKey": {
      "parameters": [],
      "return": {
        "type": "string"
      }
    },
    "exports": {
      "parameters": [],
      "return": {
        "type": "object"
      }
    },
    "tenant": {
      "parameters": [],
      "return": {
        "type": "object"
      }
    },
    "installationState": {
      "parameters": [],
      "return": {
        "type": "object"
      }
    },
    "nameSpace": {
      "parameters": [],
      "return": {
        "type": "string"
      }
    }
  }
}


 */

module.exports = function(context, callback) {
  callback();
};