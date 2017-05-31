(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.index = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
	PAYMENTSETTINGID : "PayWithAffirm",
	ENVIRONMENT: "environment",
	PUBLIC_API_KEY: "publicapikey",
    API_KEY_PAIR_BASE64: "apikeypair",
	CAPTUREONSUBMIT: "AuthAndCaptureOnOrderPlacement",
	CAPTUREONSHIPMENT: "AuthOnOrderPlacementAndCaptureOnOrderShipment",
	ORDERPROCESSING: "orderProcessing",
	FAILED: "Failed",
	NEW: "New",
	DECLINED: "Declined",
	AUTHORIZED: "Authorized",
	CAPTURED: "Captured",
	CREDITED: "Credited",
	CREDITPENDING: "CreditPending",
};

},{}],2:[function(require,module,exports){

var getAppInfo = require('mozu-action-helpers/get-app-info');
var url = require("url");
var qs = require("querystring");
var _ = require("underscore");
var constants = require("mozu-node-sdk/constants");
var paymentConstants = require("./constants");
var GeneralSettings = require('mozu-node-sdk/clients/commerce/settings/generalSettings');

var Order = require("mozu-node-sdk/clients/commerce/order");
var Guid = require('guid');


var helper = module.exports = {
    createClientFromContext: function (client, context, removeClaims) {
        var c = client(context);
        if (removeClaims)
            c.context[constants.headers.USERCLAIMS] = null;
        return c;
    },
	validateUserSession : function(context) {
		console.log('validateUserSession');
		var user = context.items.pageContext.user;
		if ( !user.isAnonymous && !user.IsAuthenticated )
		{
      console.log(context.configuration);
      var allowWarmCheckout = (context.configuration && context.configuration.allowWarmCheckout);
      var redirectUrl = '/user/login?returnUrl=' + encodeURIComponent(context.request.url);
      if (!allowWarmCheckout)
        redirectUrl = '/logout?returnUrl=' + encodeURIComponent(context.request.url)+"&saveUserId=true";
			context.response.redirect(redirectUrl);
			return context.response.end();
		}
	},
  getUserEmail : function(context) {
		console.log('getUserEmail');
    if (!context.items || !context.items.pageContext || !context.items.pageContext.user) return null;
    var user = context.items.pageContext.user;
    console.log("user", user);
    if ( !user.isAnonymous && user.IsAuthenticated ) {
      console.log(user);
      return user.email;
    }
    return null;
  },
	getPaymentFQN: function(context) {
		console.log('getPaymentFQN');
		var appInfo = getAppInfo(context);
		console.log("App Info", appInfo);
		return appInfo.namespace+"~"+paymentConstants.PAYMENTSETTINGID;
	},
	isAffirmCheckout: function (context) {
		console.log('0. isAffirmCheckout');
	  var params = this.parseUrlParams(context);
	  var hasAffirmParams = _.has(params, 'access_token') && _.has(params, "isAffirmCheckout");
	  console.log("1. isAffirmCheckout?", hasAffirmParams);
	  return hasAffirmParams;
	},
	parseUrlParams: function(context) {
		//console.log('parseUrlParams');
		var request = context.request;
		var urlParseResult = url.parse(request.url);
		//console.log("parsedUrl", urlParseResult);
		queryStringParams = qs.parse(urlParseResult.query);
		return queryStringParams;
	},
	isCartPage: function(context) {
		console.log('isCartPage');
		return context.request.url.indexOf("/cart") > -1;
	},
	isCheckoutPage: function(context) {
		console.log('isCheckoutPage');
		return context.request.url.indexOf("/checkout") > -1;
	},
	getOrderDetails: function(context, orderId) {
		console.log('getOrderDetails');
		var orderClient = this.createClientFromContext(Order,context);
		var generalSettingsClient = this.createClientFromContext(GeneralSettings, context, true);

	  	return generalSettingsClient.getGeneralSettings()
	  		.then(function(settings){
			    return orderClient.getOrder({orderId: orderId})
			    .then(function(order) {
			      return {orderNumber: order.orderNumber, websiteName: settings.websiteName, payments: order.payments};
			    });
	  		});
	},
	getUniqueId: function () {
		console.log('getUniqueId');
	  var guid = Guid.create();
	  return guid.value.replace(/\-/g, "");
	},
	getValue: function(paymentSetting, key) {
		//console.log('getValue', paymentSetting, key);
	  var value = _.findWhere(paymentSetting.credentials, {"apiName" : key}) || _.findWhere(paymentSetting.Credentials, {"APIName" : key});

	    if (!value) {
	      console.log(key+" not found");
	      return;
	    }
	    //console.log("return Key: "+key, value.value );
	    return value.value || value.Value;
	},
	addErrorToModel: function(context, callback, err) {
		console.log('addErrorToModel');
	    console.error("Adding error to viewData", err);
	    var message = err;
	    if (err.statusText)
	      message = err.statusText;
      else if (err.originalError) {
          console.error("originalError", err.originalError);
          if (err.originalError.items && err.originalError.items.length > 0)
            message = err.originalError.items[0].message;
          else
           message = err.originalError.message;
      }
	    else if (err.message){
	      message = err.message;
	      if (message.errorMessage)
	        message = message.errorMessage;
	    }
	    else if (err.errorMessage)
	      message = err.errorMessage;
	    context.response.viewData.model.messages =  [
	      {"message": message}
	    ];
	    callback();
	}

};

},{"./constants":1,"guid":5,"mozu-action-helpers/get-app-info":8,"mozu-node-sdk/clients/commerce/order":40,"mozu-node-sdk/clients/commerce/settings/generalSettings":42,"mozu-node-sdk/constants":45,"querystring":undefined,"underscore":64,"url":undefined}],3:[function(require,module,exports){
/*
 * This custom function was generated by the Actions Generator
 * in order to enable the other custom functions in this app
 * upon installation into a tenant.
 */

var ActionInstaller = require('mozu-action-helpers/installers/actions');
var tennatClient = require("mozu-node-sdk/clients/platform/tenant")();
var constants = require('mozu-node-sdk/constants');
var paymentConstants = require("../../affirm/constants");
var helper =  require("../../affirm/helper");
var _ = require("underscore");

function AppInstall(context, callback) {
	var self = this;
	self.ctx = context;
	self.cb = callback;

	self.initialize = function() {
		var tenant = context.get.tenant();
		enableAffirmPaymentWorkflow(tenant);
	};

	function enableAffirmPaymentWorkflow(tenant) {

        try {
            var tasks = tenant.sites.map(function(site) {
                return addUpdatePaymentSettings(context, site);
            });

            Promise.all(tasks).then(function(result) {
                    console.log("Affirm payment definition installed");
                    addCustomRoutes(context, tenant);
                }, function(error) {
                    self.cb(error);
            });
        } catch(e) {
            self.cb(e);
        }
	}


	function addUpdatePaymentSettings(context, site) {
        var paymentSettingsClient = require("mozu-node-sdk/clients/commerce/settings/checkout/paymentSettings")();
        paymentSettingsClient.context[constants.headers.SITE] = site.id;
        //GetExisting
        var paymentDef = getPaymentDef();
        return paymentSettingsClient.getThirdPartyPaymentWorkflowWithValues({fullyQualifiedName :  paymentDef.namespace+"~"+paymentDef.name })
            .then(function(paymentSettings){
                return updateThirdPartyPaymentWorkflow(paymentSettingsClient, paymentSettings);
            },function(err) {
                return paymentSettingsClient.addThirdPartyPaymentWorkflow(paymentDef);
        });
    }

	function updateThirdPartyPaymentWorkflow(paymentSettingsClient, existingSettings) {
        var paymentDef = getPaymentDef(existingSettings);
        paymentDef.isEnabled = existingSettings.isEnabled;
        return paymentSettingsClient.deleteThirdPartyPaymentWorkflow({ "fullyQualifiedName" : paymentDef.namespace+"~"+paymentDef.name})
        .then(function(result) {
            return paymentSettingsClient.addThirdPartyPaymentWorkflow(paymentDef);
        });
    }

	function enableActions() {
		var installer = new ActionInstaller({ context: self.ctx.apiContext });
		installer.enableActions(self.ctx, null, {
            "embedded.commerce.payments.action.performPaymentInteraction" : function(settings) {
              settings = settings || {};
              settings.timeoutMilliseconds =settings.timeoutMilliseconds ||  30000;
              return settings;
            },"affirmProcessor" : function(settings) {
				settings = settings || {};
				settings.timeoutMilliseconds = settings.timeoutMilliseconds || 30000;
				return settings;
			}
		} ).then(self.cb.bind(null, null), self.cb);
	}

	function addCustomRoutes(context, tenant) {
		var tasks = tenant.sites.map(
			function(site) {
				var customRoutesApi = require("mozu-node-sdk/clients/commerce/settings/general/customRouteSettings")();
				customRoutesApi.context[constants.headers.SITE] = site.id;
				return customRoutesApi.getCustomRouteSettings().then(
					function(customRoutes) {
						return appUpdateCustomRoutes(customRoutesApi, customRoutes);
					},
					function(err) {
						console.log("custom routes get error", err);
						return appUpdateCustomRoutes(customRoutesApi, {routes: []});
					}
				);
			}
		);

		Promise.all(tasks).then(function(result) {
			console.log("Affirm custom route installed");
			enableActions(context, tenant);
		}, function(error) {
			self.cb(error);
		});

	}

	function appUpdateCustomRoutes(customRoutesApi, customRoutes) {
		 console.log(customRoutes);
			console.log("route array size", _.size(customRoutes.routes));
			//Add / Update custom routes for paypal
			customRoutes = getRoutes(customRoutes, "affirm/processor","affirmProcessor");
			return customRoutesApi.updateCustomRouteSettings(customRoutes);

	}

	function getRoutes(customRoutes, template,action) {
		 var route =  {
			"template": template,
			"internalRoute": "Arcjs",
			"functionId": action,
		 };

		 var index = _.findIndex(customRoutes.routes, function(route) {return route.functionId == action; } );
		 console.log("Action index "+action, index );
			if (index <= -1)
				customRoutes.routes[_.size(customRoutes.routes)] = route;
			else
				customRoutes.routes[index] = route;

			return customRoutes;

		}

function getPaymentDef(existingSettings) {
    //existingSettings = false; // TODO: review it
    console.log('installing payment on: ', context.get.nameSpace());
    return  {
        "name": paymentConstants.PAYMENTSETTINGID,
        "namespace": context.get.nameSpace(),
        "isEnabled": "false",
        "description" : "<div style='font-size:13px;font-style:italic'>Please review our <a style='color:blue;' target='mozupwahelp' href='https://docs.affirm.com/'>Help</a> documentation to configure Pay With Affirm</div>",
        "credentials":  [
                        getPaymentActionFieldDef("Environment", paymentConstants.ENVIRONMENT, "RadioButton", false,getEnvironmentVocabularyValues(), existingSettings),
                        getPaymentActionFieldDef("Public API key", paymentConstants.PUBLIC_API_KEY, "TextBox", false,null,existingSettings),
                        getPaymentActionFieldDef("API key Pair (Base 64)", paymentConstants.API_KEY_PAIR_BASE64, "TextBox", false,null,existingSettings),
                        getPaymentActionFieldDef("Order Processing", paymentConstants.ORDERPROCESSING, "RadioButton", false,getOrderProcessingVocabularyValues(),existingSettings)
            ]
        };
}

	function getEnvironmentVocabularyValues() {
		return [
			getVocabularyContent("production", "en-US", "Production"),
			getVocabularyContent("sandbox", "en-US", "Sandbox")
		];
	}

	function getOrderProcessingVocabularyValues() {
		return [
			getVocabularyContent(paymentConstants.CAPTUREONSUBMIT, "en-US", "Authorize and Capture on Order Placement"),
			getVocabularyContent(paymentConstants.CAPTUREONSHIPMENT, "en-US", "Authorize on Order Placement and Capture on Order Shipment")
		];
	}

    function getPublicapikeyVocabularyValues() {
        return [
            getVocabularyContent(paymentConstants.PUBLIC_API_KEY, "en-US", "Public API KEY"),
        ];
    }

    function getApikeypairVocabularyValues() {
        return [
            getVocabularyContent(paymentConstants.API_KEY_PAIR_BASE64, "en-US", "API key Pair (Base 64)"),
        ];
    }

	function getVocabularyContent(key, localeCode, value) {
		return {
			"key" : key,
			"contents" : [{
				"localeCode" : localeCode,
				"value" : value
			}]
		};
	}

	function getPaymentActionFieldDef(displayName, key, type, isSensitive, vocabularyValues, existingSettings) {
		value = "";
		if (existingSettings)
			value = helper.getValue(existingSettings, key);

		return {
	          "displayName": displayName,
	          "apiName": key,
	          "value" : value,
	          "inputType": type,
	          "isSensitive": isSensitive,
	          "vocabularyValues" : vocabularyValues
		};
	}
}


module.exports = function(context, callback) {

  	try {
  		var appInstall = new AppInstall(context, callback);
  		appInstall.initialize();
  	} catch(e) {
  		callback(e);
  	}

};

},{"../../affirm/constants":1,"../../affirm/helper":2,"mozu-action-helpers/installers/actions":9,"mozu-node-sdk/clients/commerce/settings/checkout/paymentSettings":41,"mozu-node-sdk/clients/commerce/settings/general/customRouteSettings":43,"mozu-node-sdk/clients/platform/tenant":44,"mozu-node-sdk/constants":45,"underscore":64}],4:[function(require,module,exports){
module.exports = {
  'affirmInstall': {
      actionName: 'embedded.platform.applications.install',
      customFunction: require('./domains/platform.applications/affirmInstall')
  }
};

},{"./domains/platform.applications/affirmInstall":3}],5:[function(require,module,exports){
(function () {
  var validator = new RegExp("^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$", "i");

  function gen(count) {
    var out = "";
    for (var i=0; i<count; i++) {
      out += (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return out;
  }

  function Guid(guid) {
    if (!guid) throw new TypeError("Invalid argument; `value` has no value.");
      
    this.value = Guid.EMPTY;
    
    if (guid && guid instanceof Guid) {
      this.value = guid.toString();

    } else if (guid && Object.prototype.toString.call(guid) === "[object String]" && Guid.isGuid(guid)) {
      this.value = guid;
    }
    
    this.equals = function(other) {
      // Comparing string `value` against provided `guid` will auto-call
      // toString on `guid` for comparison
      return Guid.isGuid(other) && this.value == other;
    };

    this.isEmpty = function() {
      return this.value === Guid.EMPTY;
    };
    
    this.toString = function() {
      return this.value;
    };
    
    this.toJSON = function() {
      return this.value;
    };
  };

  Guid.EMPTY = "00000000-0000-0000-0000-000000000000";

  Guid.isGuid = function(value) {
    return value && (value instanceof Guid || validator.test(value.toString()));
  };

  Guid.create = function() {
    return new Guid([gen(2), gen(1), gen(1), gen(1), gen(3)].join("-"));
  };

  Guid.raw = function() {
    return [gen(2), gen(1), gen(1), gen(1), gen(3)].join("-");
  };

  if(typeof module != 'undefined' && module.exports) {
    module.exports = Guid;
  }
  else if (typeof window != 'undefined') {
    window.Guid = Guid;
  }
})();

},{}],6:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],7:[function(require,module,exports){
// absurdly tiny lodash dropin, to avoid large amounts of repetitive dependency

var slice = [].slice;
function assign(source) {
  slice.call(arguments, 1).forEach(function(target) {
    for (var p in target) {
      if (target.hasOwnProperty(p)) {
        source[p] = target[p];
      }
    }
  });
  return source;
}
function find(coll, pred) {
  for (var i = 0; i < coll.length; i++) {
    if (pred(coll[i])) return coll[i];
  }
}
function findWhere(coll, props) {
  return find(coll, function(item) {
    for (var p in props) {
      if (props[p] !== item[p]) {
        return false;
      }
    }
    return true;
  })
}

module.exports = {
  assign: assign,
  find: find,
  findWhere: findWhere
};

},{}],8:[function(require,module,exports){
/**
 * So far all this does is parse app key and return it, 
 * but one day it might do more.
 */

var parseAppKey = require('./parse-app-key');

module.exports = function(context) {
  return parseAppKey(context.apiContext.appKey);
};
},{"./parse-app-key":37}],9:[function(require,module,exports){
var _ = require('../endash');
var tenantExtensionsClientFactory = require(
  'mozu-node-sdk/clients/platform/tenantExtensions');

function ActionInstaller(config) {
  if (!(this instanceof ActionInstaller)) {
    return new ActionInstaller(config);
  }
  this.client = new tenantExtensionsClientFactory(config);
  this.client.context["user-claims"] = null;
}

module.exports = ActionInstaller;

ActionInstaller.prototype.enableActions =
  function(context, globalConfigurator, configurators) {
  var me = this,
    extExports = context.get.exports(),
    applicationKey = context.get.applicationKey();

  return me.client.getExtensions().then(function(enabledActions) {

    enabledActions = _.assign({
      configurations: []
    }, enabledActions);

    //add all your actions... 
    extExports.forEach(function(extExport) {
      //dont add installers.. not really actions
      if (extExport.actionId.indexOf('embedded.platform.applications') !== 0) {
        me.addCustomFunction(
          enabledActions, 
          extExport.actionId, 
          extExport.id, 
          applicationKey,
          configurators && configurators[extExport.id]
        );
      }
    });

    var appConfiguration;
    if (globalConfigurator) {
      // add custom configurations at app level
      appConfiguration = _.findWhere(enabledActions.configurations, 
                                   { applicationKey: applicationKey });
      if (!appConfiguration) {
        appConfiguration = {
          applicationKey: applicationKey,
          configuration: globalConfigurator({})
        };
        enabledActions.configurations.push(appConfiguration);
      } else {
        appConfiguration.configuration = 
          globalConfigurator(appConfiguration.configuration);
      }
    }

    return me.save(enabledActions);
  });


};

ActionInstaller.prototype.addCustomFunction =
  function(enabledActions, actionId, functionId, applicationKey, configurator) {

  var customFunctions,
    action;

  enabledActions = enabledActions || {};
  //if empty doc add actions node
  if (!enabledActions.actions) {
    enabledActions.actions = [];
  }
  //check for missing action
  
  action = _.findWhere(enabledActions.actions, { actionId: actionId });
  if (!action) {
    action = {
      'actionId': actionId,
      'contexts': []
    };
    enabledActions.actions.push(action);
  }
  action.contexts = action.contexts || [];
  if (action.contexts.length === 0) {
    action.contexts.push({
      customFunctions: []
    });
  }
  //todo allow more contexts...
  customFunctions = action.contexts[0].customFunctions;


 // var matchingFunc = findWhere(customFunctions, idProps);
  var matchingFunc = _.find( customFunctions, function(def){
      if ( def.functionId === functionId){
        //match version and package independent variations of an app key
        return (def.applicationKey||'').split('.').splice(0,2).join('.') === ( applicationKey ||'').split('.').splice(0,2).join('.') ;
      }
      return false;
  });
  

  if (!matchingFunc) {
    matchingFunc = {
      functionId: functionId,
      applicationKey: applicationKey
    };
    customFunctions.push(matchingFunc);
  }else{
    //replace the applicationKey incase of switching pacakges or upgrading version
    matchingFunc.applicationKey = applicationKey;
  }

  if (configurator) {
    _.assign(matchingFunc, configurator(matchingFunc));
  }

};

ActionInstaller.prototype.save = function(enabledActions) {
  return this.client.updateExtensions(enabledActions);
};

},{"../endash":7,"mozu-node-sdk/clients/platform/tenantExtensions":12}],10:[function(require,module,exports){
(function (process){
'use strict';

var extend = require('./utils/tiny-extend'),
    _sub = require('./utils/sub'),
    constants = require('./constants'),
    makeMethod = require('./utils/make-method'),
    getConfig = require('./utils/get-config'),
    normalizeContext = require('./utils/normalize-context'),
    inMemoryAuthCache = require('./plugins/in-memory-auth-cache'),
    serverSidePrerequisites = require('./plugins/server-side-prerequisites'),
    expandUriTemplateFromContext = require('./plugins/expand-uritemplate-from-context'),
    versionKey = constants.headers.VERSION,
    version = constants.version;

var NodeDefaultPlugins = {
  authenticationStorage: inMemoryAuthCache,
  prerequisiteTasks: serverSidePrerequisites,
  urlResolver: expandUriTemplateFromContext
};

function applyDefaultPlugins(client, plugins) {
  Object.keys(plugins).forEach(function (n) {
    return client[n] = plugins[n](client);
  });
}

function makeClient(clientCls) {
  return function (cfg) {
    return new clientCls(extend({}, this, cfg));
  };
}

function cloneContext(ctx) {
  var newCtx;
  if (!ctx) return {};
  try {
    newCtx = JSON.parse(JSON.stringify(ctx));
  } catch (e) {
    throw new Error('Could not serialize context when creating Client. ' + 'Do not assign non-serializable objects to the client.context.');
  }
  newCtx[versionKey] = newCtx[versionKey] || version;
  return newCtx;
}

function isContextSufficient(context) {
  return context && context.baseUrl;
}

function Client(cfg) {
  cfg = cfg || {};
  var context = normalizeContext(cfg.apiContext || cfg.context || {});
  if (!isContextSufficient(context)) {
    context = context ? extend(getConfig(), context) : getConfig();
  }
  this.context = cloneContext(context);
  this.defaultRequestOptions = extend({}, Client.defaultRequestOptions, cfg.defaultRequestOptions);
  // apply the right default plugin config for a server-side environment
  // (that is, Node, ArcJS, or perhaps Rhino/Nashorn/WinJS)
  if (typeof process !== "undefined") {
    applyDefaultPlugins(this, NodeDefaultPlugins);
  }
  if (cfg.plugins) {
    // override plugins if necessary
    this.plugins = cfg.plugins.slice();
    this.plugins.forEach(function (p) {
      p(this);
    }.bind(this));
  }
}

// statics
extend(Client, {
  defaultRequestOptions: {},
  method: makeMethod,
  sub: function sub(methods) {
    return makeClient(_sub(Client, methods));
  },
  constants: constants
});

module.exports = Client;
}).call(this,require('_process'))
},{"./constants":13,"./plugins/expand-uritemplate-from-context":14,"./plugins/in-memory-auth-cache":15,"./plugins/server-side-prerequisites":21,"./utils/get-config":25,"./utils/make-method":27,"./utils/normalize-context":28,"./utils/sub":32,"./utils/tiny-extend":34,"_process":undefined}],11:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../client'), constants = Client.constants;

module.exports = Client.sub({
	getTenant: Client.method({
		method: constants.verbs.GET,
		url: '{+homePod}api/platform/tenants/{tenantId}?responseFields={responseFields}'
	})
});

},{"../../client":10}],12:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../client'), constants = Client.constants;

module.exports = Client.sub({
	getExtensions: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/platform/extensions/?responseFields={responseFields}'
	}),
	updateExtensions: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/platform/extensions/?responseFields={responseFields}'
	})
});

},{"../../client":10}],13:[function(require,module,exports){
'use strict';

var version = require('./version'),
    DEVELOPER = 1,
    ADMINUSER = 2,
    SHOPPER = 4,
    TENANT = 8,
    SITE = 16,
    MASTERCATALOG = 32,
    CATALOG = 64,
    APP_ONLY = 128,
    NONE = 256,
    APP_REQUIRED = 512;

// scopes are not yet in use, but when the services can reflect
// their required scope, here will be all the bitmask constants

// some contexts are always additive

TENANT |= ADMINUSER;
SITE |= TENANT;
MASTERCATALOG |= TENANT;
CATALOG |= MASTERCATALOG;
SHOPPER |= SITE | CATALOG;

module.exports = {
  scopes: {
    APP_REQUIRED: APP_REQUIRED,
    DEVELOPER: DEVELOPER,
    ADMINUSER: ADMINUSER,
    SHOPPER: SHOPPER,
    TENANT: TENANT,
    SITE: SITE,
    MASTERCATALOG: MASTERCATALOG,
    CATALOG: CATALOG,
    APP_ONLY: APP_ONLY,
    NONE: NONE
  },
  verbs: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
  },
  headerPrefix: 'x-vol-',
  headers: {
    APPCLAIMS: 'app-claims',
    USERCLAIMS: 'user-claims',
    TENANT: 'tenant',
    SITE: 'site',
    MASTERCATALOG: 'master-catalog',
    CATALOG: 'catalog',
    DATAVIEWMODE: 'dataview-mode',
    VERSION: 'version',
    SHA256: 'hmac-sha256'
  },
  dataViewModes: {
    LIVE: 'Live',
    PENDING: 'Pending'
  },
  capabilityTimeoutInSeconds: 180,
  version: version.current
};
},{"./version":36}],14:[function(require,module,exports){
'use strict';

var getUrlTemplate = require('../utils/get-url-template');
var extend = require('../utils/tiny-extend');

function ensureTrailingSlash(url) {
  return url.charAt(url.length - 1) === '/' ? url : url + '/';
}

/**
 * Creates, evaluates based on context, and returns a string URL for a Mozu API request.
 * @param  {Object} context The context of a client. Should have a `baseUrl` property at minimum.
 * @param  {string} tpt     A string to be compiled into a UriTemplate. Should be a valid UriTemplate.
 * @param  {Object} body      An object consisting of the JSON body of the request, to be used to interpolate URL paramters.
 * @return {string}         A fully qualified URL.
 */
module.exports = function () {
  return function (client, tpt, body) {
    var context = client.context;
    var template = getUrlTemplate(tpt);
    var fullTptEvalCtx = extend(
    // aliases for pod URLs and IDs first
    {
      homePod: context.baseUrl,
      pciPod: context.basePciUrl,
      tenantId: context.tenant,
      siteId: context.site,
      catalogId: context.catalog,
      masterCatalogId: context['master-catalog']
    },
    // all context values override those base values if provided
    context,
    // any matching values in the body override last.
    body);

    // ensure all base URLs have trailing slashes.
    ['homePod', 'pciPod', 'tenantPod'].forEach(function (x) {
      if (fullTptEvalCtx[x]) fullTptEvalCtx[x] = ensureTrailingSlash(fullTptEvalCtx[x]);
    });

    // don't pass the API version!
    if (!body || !body.hasOwnProperty("version")) delete fullTptEvalCtx.version;

    return template.render(fullTptEvalCtx);
  };
};
},{"../utils/get-url-template":26,"../utils/tiny-extend":34}],15:[function(require,module,exports){
(function (process){
'use strict';

var assert = require('assert');

function isExpired(ticket) {
  var ungraceperiod = 60000;
  var compareDate = new Date();
  compareDate.setTime(compareDate.getTime() + ungraceperiod);
  return new Date(ticket.refreshTokenExpiration) < compareDate;
}

function generateCacheKey(claimtype, context) {
  var cmps;
  if (!process.env.mozuHosted) {
    assert(context.appKey, "No application key in context!");
    cmps = [context.appKey];
  } else {
    cmps = ['mozuHosted'];
  }
  switch (claimtype) {
    case "developer":
      assert(context.developerAccount && context.developerAccount.emailAddress, "No developer account email address in context!");
      cmps.push(context.developerAccount.emailAddress, context.developerAccountId);
      break;
    case "admin-user":
      assert(context.tenant, "No tenant in context!");
      assert(context.adminUser && context.adminUser.emailAddress, "No admin user email address in context!");
      cmps.push(context.tenant, context.adminUser.emailAddress);
      break;
    default:
      break;
  }
  return cmps.join();
}

module.exports = function InMemoryAuthCache() {
  var claimsCaches = {
    application: {},
    developer: {},
    'admin-user': {}
  };

  return {
    get: function get(claimtype, context, callback) {
      var ticket = claimsCaches[claimtype][generateCacheKey(claimtype, context)];
      setImmediate(function () {
        callback(null, ticket && !isExpired(ticket) && ticket || undefined);
      });
    },
    set: function set(claimtype, context, ticket, callback) {
      claimsCaches[claimtype][generateCacheKey(claimtype, context)] = ticket;
      setImmediate(callback);
    },
    constructor: InMemoryAuthCache
  };
};
}).call(this,require('_process'))
},{"_process":undefined,"assert":undefined}],16:[function(require,module,exports){
'use strict';

var AuthProvider = require('../../security/auth-provider');
var scopes = require('../../constants').scopes;
var getScopeFromState = require('./get-scope-from-state');

/**
 * If necessary, add application claims to a client context before
 * placing a request. Relies on a `scope` parameter to specify.
 * Uses AuthProvider.
 */

module.exports = function (state) {
  var client = state.client;

  var scope = getScopeFromState(state);

  if (scope & scopes.APP_REQUIRED || !(scope & scopes.NONE || scope & scopes.DEVELOPER)) {
    return AuthProvider.addPlatformAppClaims(client).then(function () {
      return state;
    });
  } else {
    return state;
  }
};
},{"../../constants":13,"../../security/auth-provider":22,"./get-scope-from-state":20}],17:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var TenantCache = require('../../utils/tenant-cache');
var EnvUrls = require('mozu-metadata/data/environments.json');
var getUrlTemplate = require('../../utils/get-url-template');
var getScopeFromState = require('./get-scope-from-state');

/**
 * If necessary, transforms a promise for a prepared client into a promise
 * for a client that has a `basePciUrl` in its context.
 * Reads from the TenantCache if necessary, and consumes mozu-metadata.
 */

var PCIUrlsByBaseUrl = Object.keys(EnvUrls).reduce(function (o, c) {
  o[EnvUrls[c].homeDomain] = EnvUrls[c];
  return o;
}, {});

module.exports = function (state) {
  var client = state.client;
  var requestConfig = state.requestConfig;
  var url = requestConfig.url;

  if (~getUrlTemplate(url).keysUsed.indexOf('pciPod') && !client.context.basePciUrl && !client.context.pciPod) {
    var _ret = function () {
      var tenantId = client.context.tenantId || client.context.tenant;
      var pciUrls = PCIUrlsByBaseUrl[client.context.baseUrl];
      if (!tenantId) {
        throw new Error('Could not place request to ' + url + ' because it requires a tenant ' + 'ID to be set in the client context.');
      } else if (!pciUrls) {
        throw new Error('Could not place request to ' + url + ' because it is making a call to ' + 'Payment Service, but there is no known payment service domain ' + ('matching the environment whose base URL is ' + client.context.baseUrl + '.'));
      } else {
        return {
          v: TenantCache.get(tenantId, client, getScopeFromState(state)).then(function (t) {
            if (t.isDevTenant) {
              client.context.basePciUrl = pciUrls.paymentServiceSandboxDomain;
            } else {
              client.context.basePciUrl = pciUrls.paymentServiceTenantPodDomain;
            }
            return state;
          })
        };
      }
    }();

    if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
  } else {
    return state;
  }
};
},{"../../utils/get-url-template":26,"../../utils/tenant-cache":33,"./get-scope-from-state":20,"mozu-metadata/data/environments.json":38}],18:[function(require,module,exports){
'use strict';

var TenantCache = require('../../utils/tenant-cache');
var getUrlTemplate = require('../../utils/get-url-template');
var getScopeFromState = require('./get-scope-from-state');

/**
 * If necessary, transforms a promise for a prepared client into a promise
 * for a client that has a `tenantPod` in its context.
 * Reads from the TenantCache if necessary.
 */

module.exports = function (state) {
  var client = state.client;
  var requestConfig = state.requestConfig;
  var url = requestConfig.url;

  if (~getUrlTemplate(url).keysUsed.indexOf('tenantPod') && !client.context.tenantPod) {
    var tenantId = client.context.tenantId || client.context.tenant;
    if (!tenantId) {
      throw new Error('Could not place request to ' + url + ' because it requires a tenant ' + 'ID to be set in the client context.');
    } else {
      return TenantCache.get(tenantId, client, getScopeFromState(state)).then(function (tenant) {
        client.context.tenantPod = 'https://' + tenant.domain + '/';
        return state;
      });
    }
  } else {
    return state;
  }
};
},{"../../utils/get-url-template":26,"../../utils/tenant-cache":33,"./get-scope-from-state":20}],19:[function(require,module,exports){
'use strict';

var AuthProvider = require('../../security/auth-provider');
var scopes = require('../../constants').scopes;
var getScopeFromState = require('./get-scope-from-state');

/**
 * If necessary, add developer user claims to a client context before
 * placing a request. Relies on a `scope` parameter to specify.
 * Uses AuthProvider.
 */

module.exports = function (state) {
  var client = state.client;
  var scope = getScopeFromState(state);

  if (scope & scopes.DEVELOPER) {
    return AuthProvider.addDeveloperUserClaims(client).then(function () {
      return state;
    });
  } else if (scope & scopes.ADMINUSER) {
    return AuthProvider.addAdminUserClaims(client).then(function () {
      return state;
    });
  } else if (!scope && AuthProvider.addMostRecentUserClaims) {
    return AuthProvider.addMostRecentUserClaims(client).then(function () {
      return state;
    });
  } else {
    return state;
  }
};
},{"../../constants":13,"../../security/auth-provider":22,"./get-scope-from-state":20}],20:[function(require,module,exports){
'use strict';

var scopes = require('../../constants').scopes;

/**
 * From a given prerequisite state object (config, options, requestConfig)
 * return scope.
 */

module.exports = function (state) {
  var requestConfig = state.requestConfig;
  var options = state.options;

  if (options && options.scope) {
    if (scopes[options.scope]) {
      return scopes[options.scope];
    } else {
      return options.scope;
    }
  } else {
    return requestConfig.scope;
  }
};
},{"../../constants":13}],21:[function(require,module,exports){
'use strict';
/**
 * Sensible default configuration for a NodeJS, ArcJS, or other server env.
 * Includes assumptions that you'll have access to Tenant Service, etc.
 * Not appropriate for shopper or storefront use.
 */

module.exports = function () {
  return [require('./ensure-tenant-pod-url'), require('./ensure-pci-pod-url'), require('./ensure-user-claims'), require('./ensure-app-claims')];
};
},{"./ensure-app-claims":16,"./ensure-pci-pod-url":17,"./ensure-tenant-pod-url":18,"./ensure-user-claims":19}],22:[function(require,module,exports){
/* eslint handle-callback-err: 0 */
/* global Promise */
'use strict';

var constants = require('../constants'),
    AuthTicket = require('./auth-ticket'),
    scopes = constants.scopes;

var TenantCache = require('../utils/tenant-cache');

// if (typeof Promise !== "function") require('when/es6-shim/Promise.browserify-es6');

function createMemoizedClientFactory(clientPath) {
  var c;
  return function () {
    return (c || (c = require(clientPath))).apply(this, arguments);
  };
}

var makeAppAuthClient = createMemoizedClientFactory('../clients/platform/applications/authTicket');
var makeDeveloperAuthClient = createMemoizedClientFactory('../clients/platform/developer/developerAdminUserAuthTicket');
var makeAdminUserAuthClient = createMemoizedClientFactory('../clients/platform/adminuser/tenantAdminUserAuthTicket');

function cacheDataAndCreateAuthTicket(res) {
  var tenants = res.availableTenants;
  if (tenants) {
    for (var i = 0; i < tenants.length; i++) {
      TenantCache.add(tenants[i]);
    }
  }
  return new AuthTicket(res);
}

function getPlatformAuthTicket(client) {
  return makeAppAuthClient(client).authenticateApp({
    applicationId: client.context.appKey,
    sharedSecret: client.context.sharedSecret
  }, {
    scope: scopes.NONE
  }).then(cacheDataAndCreateAuthTicket);
}

function refreshPlatformAuthTicket(client, ticket) {
  return makeAppAuthClient(client).refreshAppAuthTicket({
    refreshToken: ticket.refreshToken
  }, {
    scope: scopes.NONE
  }).then(cacheDataAndCreateAuthTicket);
}

function getDeveloperAuthTicket(client) {
  return makeDeveloperAuthClient(client).createDeveloperUserAuthTicket(client.context.developerAccount, {
    scope: scopes.NONE
  }).then(cacheDataAndCreateAuthTicket);
}

function refreshDeveloperAuthTicket(client, ticket) {
  return makeDeveloperAuthClient(client).refreshDeveloperAuthTicket(ticket, {
    scope: scopes.NONE
  }).then(cacheDataAndCreateAuthTicket);
}

function getAdminUserAuthTicket(client) {
  return makeAdminUserAuthClient(client).createUserAuthTicket({ tenantId: client.context.tenant }, {
    body: client.context.adminUser,
    scope: constants.scopes.APP_ONLY
  }).then(function (json) {
    client.context.user = json.user;
    return cacheDataAndCreateAuthTicket(json);
  });
}

function refreshAdminUserAuthTicket(client, ticket) {
  return makeAdminUserAuthClient(client).refreshAuthTicket(ticket, {
    scope: constants.scopes.APP_ONLY
  }).then(cacheDataAndCreateAuthTicket);
}

var calleeToClaimType = {
  'addPlatformAppClaims': 'application',
  'addDeveloperUserClaims': 'developer',
  'addAdminUserClaims': 'admin-user'
};

function makeClaimMemoizer(calleeName, requester, refresher, claimHeader) {
  return function (client) {
    var cacheAndUpdateClient = function cacheAndUpdateClient(ticket) {
      return new Promise(function (resolve) {
        client.authenticationStorage.set(calleeToClaimType[calleeName], client.context, ticket, function () {
          client.context[claimHeader] = ticket.accessToken;
          resolve(client);
        });
      });
    };
    var op = new Promise(function (resolve) {
      client.authenticationStorage.get(calleeToClaimType[calleeName], client.context, function (err, ticket) {
        resolve(ticket);
      });
    }).then(function (ticket) {
      if (!ticket) {
        return requester(client).then(cacheAndUpdateClient);
      }
      if (new Date(ticket.accessTokenExpiration) < new Date()) {
        return refresher(client, ticket).then(cacheAndUpdateClient);
      }
      client.context[claimHeader] = ticket.accessToken;
      return client;
    });
    function setRecent() {
      AuthProvider.addMostRecentUserClaims = AuthProvider[calleeName];
    }
    op.then(setRecent, setRecent);
    return op;
  };
}

var AuthProvider = {

  addPlatformAppClaims: makeClaimMemoizer('addPlatformAppClaims', getPlatformAuthTicket, refreshPlatformAuthTicket, constants.headers.APPCLAIMS),
  addDeveloperUserClaims: makeClaimMemoizer('addDeveloperUserClaims', getDeveloperAuthTicket, refreshDeveloperAuthTicket, constants.headers.USERCLAIMS),
  addAdminUserClaims: makeClaimMemoizer('addAdminUserClaims', getAdminUserAuthTicket, refreshAdminUserAuthTicket, constants.headers.USERCLAIMS),
  addMostRecentUserClaims: false
};

module.exports = AuthProvider;
},{"../constants":13,"../utils/tenant-cache":33,"./auth-ticket":23}],23:[function(require,module,exports){
'use strict';

/**
 * The authentication ticket used to authenticate anything.
 * @class AuthTicket
 * @property {string} accessToken The token that stores an encrypted list of the application's configured behaviors and authenticates the application.
 * @property {Date} accessTokenExpiration Date and time the access token expires. After the access token expires, refresh the authentication ticket using the refresh token.
 * @property {string} refreshToken The token that refreshes the application's authentication ticket.
 * @property {Date} refreshTokenExpiration Date and time the refresh token expires. After the refresh token expires, generate a new authentication ticket.
 */

function AuthTicket(json) {
  var self = this;
  if (!(this instanceof AuthTicket)) return new AuthTicket(json);
  for (var p in json) {
    if (json.hasOwnProperty(p)) {
      self[p] = p.indexOf('Expiration') !== -1 ? new Date(json[p]) : json[p]; // dateify the dates, this'll break if the prop name changes
    }
  }
}

module.exports = AuthTicket;
},{}],24:[function(require,module,exports){
(function (Buffer){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var extend = require('./tiny-extend');
var util = require('util');
module.exports = function errorify(res, additions) {
  try {
    if (typeof res === "string") {
      return new Error(res);
    }
    var err;
    var message = ensureMessage(res);
    var stringBody = ensureString(res.body);
    var details = _typeof(res.body) === "object" ? res.body : (typeof res === 'undefined' ? 'undefined' : _typeof(res)) === "object" ? res : {};

    if (!message && stringBody) {
      try {
        details = JSON.parse(stringBody);
        message = details.message || stringBody;
      } catch (e) {
        message = stringBody;
      }
    }

    if (additions) {
      extend(details, additions);
    }

    message = (message || "Unknown error!") + formatDetails(details);

    err = new Error(message);
    err.originalError = details;
    return err;
  } catch (e) {
    return e;
  }
};

function formatDetails(deets) {
  return "\n\nDetails:\n" + Object.keys(deets).map(function (label) {
    var deet = deets[label];
    if ((typeof deet === 'undefined' ? 'undefined' : _typeof(deet)) === "object") deet = util.inspect(deet);
    return " " + label + ": " + deet;
  }).join('\n') + '\n';
}

function ensureString(something) {
  if (!something) return String(something);
  if (typeof something === "string") {
    return something;
  }
  if (Buffer.isBuffer(something)) {
    return something.toString('utf-8');
  }
  if (typeof something.toString === "function") {
    return something.toString();
  }
  return String(something);
}

function ensureMessage(res) {
  return res.message || res.body && res.body.message;
}
}).call(this,{"isBuffer":require("../../../../is-buffer/index.js")})
},{"../../../../is-buffer/index.js":6,"./tiny-extend":34,"util":undefined}],25:[function(require,module,exports){
(function (process){
'use strict';
// BEGIN INIT

var fs = require('fs');
var findup = require('./tiny-findup');

var legalConfigNames = ['mozu.config', 'mozu.config.json'];

module.exports = function getConfig() {
  var conf;
  if (process.env.mozuHosted) {
    try {
      conf = JSON.parse(process.env.mozuHosted).sdkConfig;
    } catch (e) {
      throw new Error("Mozu hosted configuration was unreadable: " + e.message);
    }
  } else {
    for (var i = legalConfigNames.length - 1; i >= 0; i--) {
      try {
        var filename = findup(legalConfigNames[i]);
        if (filename) conf = fs.readFileSync(filename, 'utf-8');
      } catch (e) {
        continue;
      }
      if (conf) break;
    }
    if (!conf) {
      throw new Error("No configuration file found. Either create a 'mozu.config' or 'mozu.config.json' file, or supply full config to the .client() method.");
    }
    try {
      conf = JSON.parse(conf);
    } catch (e) {
      throw new Error("Configuration file was unreadable: " + e.message);
    }
  }
  return conf;
};
}).call(this,require('_process'))
},{"./tiny-findup":35,"_process":undefined,"fs":undefined}],26:[function(require,module,exports){
'use strict';
/**
 * Memoized function to turn URI Template text strings into Template objects.
 *
 * Assumes that unescaped URI Template variables are required,
 * since they're always base URLs in the current codegen.
 *
 * @param {String} templateText The URI template string.
 * @returns {Template} Object with a `render` method and a `keysUsed` object.
 */

var expRe = /\{.+?\}/g;
var varnameRe = /[\w_-]+/;
function findKeys(rawTpt) {
  var matches = rawTpt.match(expRe);
  if (!matches) return [];
  return matches.map(function (x) {
    return x.match(varnameRe)[0];
  });
}

var uritemplate = require('uri-template');
var cache = {};
module.exports = function (templateText) {
  if (cache[templateText]) {
    return cache[templateText];
  }
  var tpt = uritemplate.parse(templateText);
  return cache[templateText] = {
    render: function render(x) {
      return tpt.expand(x);
    },
    keysUsed: findKeys(templateText)
  };
};
},{"uri-template":65}],27:[function(require,module,exports){
(function (process){
'use strict';

var extend = require('./tiny-extend');
var request = require('./request');

module.exports = function (config) {

  function doRequest(body, options) {
    options = options || {};
    var finalRequestConfig = extend({}, config, this.defaultRequestOptions, {
      url: this.urlResolver(this, config.url, body),
      context: this.context,
      body: body
    }, options);
    var finalMethod = finalRequestConfig.method && finalRequestConfig.method.toUpperCase();

    // this is magic and was never a good idea.
    // the way the SDK was designed, the first argument to a method will get
    // used both as the request payload and as an object to expand the URI
    // template. this resulted in collisions, and in unexpected behavior with
    // services that didn't expect strongly typed payloads. the below code
    // tried to fix it magically, but under certain circumstances it would be
    // very hard to debug.
    //
    // remove any properties from the body that were used to expand the url
    // if (body && 
    //     typeof body === "object" &&
    //     !Array.isArray(body) &&
    //     !options.body && 
    //     !options.includeUrlVariablesInPostBody && 
    //     (finalMethod === "POST" || finalMethod === "PUT")) {
    //   finalRequestConfig.body = Object.keys(body).reduce(function(m, k) {
    //     if (!urlSpec.keysUsed[k]) {
    //       m[k] = body[k];
    //     }
    //     return m;
    //   }, {});
    //   if (Object.keys(finalRequestConfig.body).length === 0) {
    //     delete finalRequestConfig.body;
    //   }
    // }


    if (finalMethod === "GET" || finalMethod === "DELETE" && !options.body) {
      delete finalRequestConfig.body;
      // it's outlived its usefulness, we've already made a url with it
    }
    return request(finalRequestConfig, this.requestTransform);
  }

  return function (body, options) {
    var doThisRequest = doRequest.bind(this, body, options);
    if (process.env.mozuHosted) {
      return doThisRequest();
    } else if (!this.prerequisiteTasks || !Array.isArray(this.prerequisiteTasks)) {
      return Promise.reject(new Error('Could not place request. No `prerequisiteTasks` array found on ' + 'the client object. To require no auth or URL prerequisites, set ' + '`this.prerequisiteTasks = [];` on the client object.'));
    } else {
      return this.prerequisiteTasks.reduce(function (p, t) {
        return p.then(t);
      }, Promise.resolve({
        client: this,
        options: options,
        requestConfig: config
      })).then(doThisRequest);
    }
  };
};
}).call(this,require('_process'))
},{"./request":30,"./tiny-extend":34,"_process":undefined}],28:[function(require,module,exports){
'use strict';

var extend = require('./tiny-extend');

var priorities = {
  'app-claims': ['appClaims'],
  'user-claims': ['userClaims'],
  'tenant': ['tenantId'],
  'site': ['siteId'],
  'master-catalog': ['masterCatalog', 'masterCatalogId'],
  'catalog': ['catalogId'],
  'dataview-mode': ['dataViewMode']
};

var prioritiesKeys = Object.keys(priorities);

module.exports = function (context) {
  var newContext = extend({}, context);
  return prioritiesKeys.reduce(function (ctx, dashKey) {
    return priorities[dashKey].reduce(function (ctx, k) {
      if (k in ctx) {
        ctx[dashKey] = ctx[k];
        delete ctx[k];
      }
      return ctx;
    }, ctx);
  }, newContext);
};
},{"./tiny-extend":34}],29:[function(require,module,exports){
'use strict';

var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
module.exports = function parseDate(key, value) {
  return typeof value === 'string' && reISO.exec(value) ? new Date(value) : value;
};
},{}],30:[function(require,module,exports){
(function (process,Buffer){
'use strict';
/* global Promise */

var constants = require('../constants');
var extend = require('./tiny-extend');
var url = require('url');
var protocolHandlers = {
  'http:': require('http'),
  'https:': require('https')
};
var streamToCallback = require('./stream-to-callback');
var parseJsonDates = require('./parse-json-dates');
var errorify = require('./errorify');

var USER_AGENT = 'Mozu Node SDK v' + constants.version + ' (Node.js ' + process.version + '; ' + process.platform + ' ' + process.arch + ')';

/**
 * Handle headers
 */
function makeHeaders(conf, payload) {
  var headers;
  function iterateHeaders(memo, key) {
    if (conf.context[constants.headers[key]]) {
      memo[constants.headerPrefix + constants.headers[key]] = conf.context[constants.headers[key]];
    }
    return memo;
  }
  if (conf.scope && conf.scope & constants.scopes.NONE) {
    headers = {};
  } else if (conf.scope && conf.scope & constants.scopes.APP_ONLY) {
    headers = ['APPCLAIMS'].reduce(iterateHeaders, {});
  } else {
    headers = Object.keys(constants.headers).reduce(iterateHeaders, {});
  }

  if (payload) {
    headers['Content-Length'] = payload.length.toString();
  }

  return extend({
    'Accept': 'application/json',
    'Connection': 'close',
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': USER_AGENT
  }, headers, conf.headers || {});
}

/**
 * Make an HTTP request to the Mozu API. This method populates headers based on the scope of the supplied context.
 * @param  {Object} options The request options, to be passed to the `request` module. Look up on NPM for details.
 * @return {Promise<ApiResponse,ApiError>}         A Promise that will fulfill as the JSON response from the API, or reject with an error as JSON from the API.
 */

module.exports = function (options, transform) {
  var conf = extend({}, options);
  conf.method = (conf.method || 'get').toUpperCase();
  var payload;
  if (conf.body) {
    payload = conf.body;
    if (typeof payload !== "string" && !Buffer.isBuffer(payload)) {
      payload = JSON.stringify(payload);
    }
    if (typeof payload === "string") {
      payload = new Buffer(payload);
    }
  }
  conf.headers = makeHeaders(conf, payload);
  var uri = url.parse(conf.url);
  var protocolHandler = protocolHandlers[uri.protocol];
  if (!protocolHandler) {
    throw new Error('Protocol ' + uri.protocol + ' not supported.');
  }
  return new Promise(function (resolve, reject) {
    options = extend({}, options);
    delete options.headers;
    var requestOptions = extend({
      hostname: uri.hostname,
      port: uri.port || (uri.protocol === 'https:' ? 443 : 80),
      method: conf.method,
      path: uri.path,
      headers: conf.headers,
      agent: conf.agent
    }, options);
    if (typeof transform === "function") {
      requestOptions = transform(requestOptions);
    }
    var complete = false;
    var request = protocolHandler.request(requestOptions, function (response) {
      streamToCallback(response, function (err, body) {
        complete = true;
        if (err) return reject(errorify(err, extend({ statusCode: response.statusCode, url: response.req.path }, response.headers)));
        if (body) {
          try {
            if (response.headers["content-type"].indexOf('json') > -1 || response.headers["content-type"].indexOf('text/plain') > -1) body = JSON.parse(body, conf.parseDates !== false && parseJsonDates);
          } catch (e) {
            return reject(new Error('Response was not valid JSON: ' + e.message + '\n\n-----\n' + body));
          }
        }
        if (response && response.statusCode >= 400 && response.statusCode < 600) {
          return reject(errorify(body || response, extend({ statusCode: response.statusCode, url: response.req ? response.req.path : "" }, response.headers)));
        }
        return resolve(body);
      });
    });
    var timeout = options.timeout || 20000;
    request.setTimeout(timeout, function () {
      if (!complete) {
        request.abort();
        reject(errorify("Timeout occurred: request to " + conf.url + " took more than " + timeout / 1000 + " seconds to complete."));
      }
    });
    request.on('error', function (err) {
      reject(errorify(err, request));
    });
    if (payload) request.write(payload);
    request.end();
  });
};
}).call(this,require('_process'),require("buffer").Buffer)
},{"../constants":13,"./errorify":24,"./parse-json-dates":29,"./stream-to-callback":31,"./tiny-extend":34,"_process":undefined,"buffer":undefined,"http":undefined,"https":undefined,"url":undefined}],31:[function(require,module,exports){
'use strict';

var Stream = require('stream').Transform;

module.exports = function streamToCallback(stream, cb) {
  var buf = new Stream();
  //stream.setEncoding('utf8');
  stream.on('data', function (chunk) {
    buf.push(chunk);
  });
  stream.on('error', cb);
  stream.on('end', function () {
    cb(null, buf.read());
  });
};
},{"stream":undefined}],32:[function(require,module,exports){
'use strict';

var util = require('util'),
    extend = require('./tiny-extend');

/**
 * Subclass a constructor. Like Node's `util.inherits` but lets you pass additions to the prototype, and composes constructors.
 * @param  {Function} cons  The constructor to subclass.
 * @param  {Object} proto Methods to add to the prototype.
 * @return {Function}       The new subclass.
 */
module.exports = function sub(cons, proto) {
    var child = function child() {
        cons.apply(this, arguments);
    };
    util.inherits(child, cons);
    if (proto) extend(child.prototype, proto);
    return child;
};
},{"./tiny-extend":34,"util":undefined}],33:[function(require,module,exports){
'use strict';

var TenantClient = void 0;
var TenantsOrPromisesById = {};

module.exports = {
  add: function add(tenant) {
    TenantsOrPromisesById[tenant.id] = tenant;
  },
  get: function get(tenantId, client, scope) {
    TenantClient = TenantClient || require('../clients/platform/tenant');
    var tenant = TenantsOrPromisesById[tenantId];
    if (tenant) {
      // may not be a promise if it was set en masse by AuthProvider.
      // AuthProvider may set hundreds of tenants at once, so we let it
      // set them directly for performance reasons.
      if (typeof tenant.then !== "function") {
        // and turn them into promises as needed.
        tenant = TenantsOrPromisesById[tenantId] = Promise.resolve(tenant);
      }
      return tenant;
    } else {
      return TenantsOrPromisesById[tenantId] = new TenantClient(client).getTenant(null, { scope: scope });
    }
  }
};
},{"../clients/platform/tenant":11}],34:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function extend(target) {
  return Array.prototype.slice.call(arguments, 1).reduce(function (out, next) {
    if (next && (typeof next === "undefined" ? "undefined" : _typeof(next)) === "object") {
      Object.keys(next).forEach(function (k) {
        out[k] = next[k];
      });
    }
    return out;
  }, target);
};
},{}],35:[function(require,module,exports){
(function (process){
'use strict';

var path = require('path');
var fs = require('fs');

module.exports = function findup(filename) {
  var maybeFile = path.resolve(filename),
      dir = process.cwd(),
      last,
      exists;
  while (!(exists = fs.existsSync(maybeFile)) && dir !== last) {
    maybeFile = path.resolve(dir, '..', filename);
    last = dir;
    dir = path.resolve(dir, '..');
  }
  return exists && maybeFile;
};
}).call(this,require('_process'))
},{"_process":undefined,"fs":undefined,"path":undefined}],36:[function(require,module,exports){
'use strict';

module.exports = {
  current: "1.1705.17038.0"
};
},{}],37:[function(require,module,exports){
/**
 * This is a pretty naive implementation for now,
 * but since AppDev validates this pretty stringently,
 * it'll always work in the current environment (1.18).
 */

module.exports = function(key) {
  var parts = key.split('.')
  return {
    namespace: parts[0],
    id: parts[1],
    version: [parts[2],parts[3],parts[4]].join('.')
  };
}
},{}],38:[function(require,module,exports){
module.exports={
  "Production/Sandbox": {
    "homeDomain": "https://home.mozu.com",
    "paymentServiceTenantPodDomain": "https://pmts.mozu.com",
    "paymentServiceSandboxDomain": "https://payments-sb.mozu.com"
  },
  "Staging": {
    "homeDomain": "https://home.staging.mozu.com",
    "paymentServiceTenantPodDomain": "http://services.staging-hp.prod.mozu.com",
    "paymentServiceSandboxDomain": "http://services.staging-hp.prod.mozu.com"
  },
  "QA": {
    "homeDomain": "https://home.mozu-qa.com",
    "paymentServiceTenantPodDomain": "https://payments-qa.dev.volusion.com",
    "paymentServiceSandboxDomain": "https://services-sandbox-mozu-qa.dev.volusion.com"
  },
  "SI": {
    "homeDomain": "https://home.mozu-si.com",
    "paymentServiceTenantPodDomain": "https://payments.mozu-si.com",
    "paymentServiceSandboxDomain": "https://payments.mozu-si.com"
  },
  "CI": {
    "homeDomain": "http://aus02ncrprx001.dev.volusion.com",
    "paymentServiceTenantPodDomain": "http://AUS02NCSERV001.dev.volusion.com",
    "paymentServiceSandboxDomain": "http://AUS02NCSERV001.dev.volusion.com"
  }
}

},{}],39:[function(require,module,exports){
var extend = require('./utils/tiny-extend'),
    sub = require('./utils/sub'),
    constants = require('./constants'),
    makeMethod = require('./utils/make-method'),
    getConfig = require('./utils/get-config'),
    normalizeContext = require('./utils/normalize-context'),
    inMemoryAuthCache = require('./plugins/in-memory-auth-cache'),
    versionKey = constants.headers.VERSION,
    version = constants.version;


function makeClient(clientCls) {
  return function(cfg) {
    return new clientCls(extend({}, this, cfg));
  };
}

function cloneContext(ctx) {
  var newCtx;
  if (!ctx) return {};
  try {
    newCtx = JSON.parse(JSON.stringify(ctx));
  } catch(e) {
    throw new Error('Could not serialize context when creating Client. Do not assign non-serializable objects to the client.context.');
  }
  newCtx[versionKey] = newCtx[versionKey] || version;
  return newCtx;
}

function isContextSufficient(context) {
  return context && context.baseUrl;
}

function Client(cfg) {
  cfg = cfg || {};
  var context = normalizeContext(cfg.apiContext || cfg.context || {});
  if (!isContextSufficient(context)) {
    context = context ? extend(getConfig(), context) : getConfig();
  }
  this.context = cloneContext(context);
  this.defaultRequestOptions = extend({}, Client.defaultRequestOptions, cfg.defaultRequestOptions);
  if (cfg.plugins) {
    this.plugins = cfg.plugins.slice();
    this.plugins.forEach(function(p) {
      p(this);
    }.bind(this));
  }
  this.authenticationStorage = this.authenticationStorage || inMemoryAuthCache(this);
}

// statics
extend(Client, {
  defaultRequestOptions: {},
  method: makeMethod,
  sub: function(methods) {
    return makeClient(sub(Client, methods));
  },
  constants: constants
});

module.exports = Client;

},{"./constants":45,"./plugins/in-memory-auth-cache":46,"./utils/get-config":50,"./utils/make-method":51,"./utils/normalize-context":53,"./utils/sub":59,"./utils/tiny-extend":60}],40:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../client'), constants = Client.constants;

module.exports = Client.sub({
	getOrders: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/orders/?startIndex={startIndex}&pageSize={pageSize}&sortBy={sortBy}&filter={filter}&q={q}&qLimit={qLimit}&responseFields={responseFields}'
	}),
	getAvailableActions: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/orders/{orderId}/actions'
	}),
	getTaxableOrders: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/orders/{orderId}/taxableorders'
	}),
	getOrder: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/orders/{orderId}?draft={draft}&responseFields={responseFields}'
	}),
	createOrderFromCart: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/orders/?cartId={cartId}&responseFields={responseFields}'
	}),
	createOrder: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/orders/?responseFields={responseFields}'
	}),
	performOrderAction: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/orders/{orderId}/actions?responseFields={responseFields}'
	}),
	processDigitalWallet: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/orders/{orderId}/digitalWallet/{digitalWalletType}?responseFields={responseFields}'
	}),
	updateOrderDiscount: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/orders/{orderId}/discounts/{discountId}?updatemode={updateMode}&version={version}&responseFields={responseFields}'
	}),
	deleteOrderDraft: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/orders/{orderId}/draft?version={version}'
	}),
	resendOrderConfirmationEmail: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/orders/{orderId}/email/resend'
	}),
	changeOrderUserId: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/orders/{orderId}/users?responseFields={responseFields}'
	}),
	updateOrder: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/orders/{orderId}?updatemode={updateMode}&version={version}&responseFields={responseFields}'
	})
});

},{"../../client":39}],41:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../../client'), constants = Client.constants;

module.exports = Client.sub({
	getThirdPartyPaymentWorkflowWithValues: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/settings/checkout/paymentsettings/thirdpartyworkflow/{fullyQualifiedName}?responseFields={responseFields}'
	}),
	getThirdPartyPaymentWorkflows: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/settings/checkout/paymentsettings/thirdpartyworkflows'
	}),
	addThirdPartyPaymentWorkflow: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/settings/checkout/paymentsettings/thirdpartyworkflows'
	}),
	deleteThirdPartyPaymentWorkflow: Client.method({
		method: constants.verbs.DELETE,
		url: '{+tenantPod}api/commerce/settings/checkout/paymentsettings/thirdpartyworkflows/{fullyQualifiedName}'
	})
});

},{"../../../../client":39}],42:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../client'), constants = Client.constants;

module.exports = Client.sub({
	getGeneralSettings: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/settings/general/?responseFields={responseFields}'
	}),
	updateGeneralSettings: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/settings/general/?responseFields={responseFields}'
	})
});

},{"../../../client":39}],43:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../../client'), constants = Client.constants;

module.exports = Client.sub({
	getCustomRouteSettings: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/settings/general/customroutes?responseFields={responseFields}'
	}),
	createCustomRouteSettings: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/settings/general/customroutes?responseFields={responseFields}'
	}),
	updateCustomRouteSettings: Client.method({
		method: constants.verbs.PUT,
		url: '{+tenantPod}api/commerce/settings/general/customroutes?responseFields={responseFields}'
	}),
	deleteCustomRouteSettings: Client.method({
		method: constants.verbs.DELETE,
		url: '{+tenantPod}api/commerce/settings/general/customroutes'
	})
});

},{"../../../../client":39}],44:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../client'), constants = Client.constants;

module.exports = Client.sub({
	getTenant: Client.method({
		method: constants.verbs.GET,
		url: '{+homePod}api/platform/tenants/{tenantId}?responseFields={responseFields}'
	})
});

},{"../../client":39}],45:[function(require,module,exports){
var version = require('./version'),
    DEVELOPER = 1,
    ADMINUSER = 2,
    SHOPPER = 4,
    TENANT = 8,
    SITE = 16,
    MASTERCATALOG = 32,
    CATALOG = 64,
    APP_ONLY = 128,
    NONE = 256;

// scopes are not yet in use, but when the services can reflect
// their required scope, here will be all the bitmask constants

// some contexts are always additive

TENANT |= ADMINUSER;
SITE |= TENANT;
MASTERCATALOG |= TENANT;
CATALOG |= MASTERCATALOG;
SHOPPER |= SITE | CATALOG;

module.exports = {
  scopes: {
    DEVELOPER: DEVELOPER,
    ADMINUSER: ADMINUSER,
    SHOPPER: SHOPPER,
    TENANT: TENANT,
    SITE: SITE,
    MASTERCATALOG: MASTERCATALOG,
    CATALOG: CATALOG,
    APP_ONLY: APP_ONLY,
    NONE: NONE
  },
  verbs: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
  },
  headerPrefix: 'x-vol-',
  headers: {
    APPCLAIMS: 'app-claims',
    USERCLAIMS: 'user-claims',
    TENANT: 'tenant',
    SITE: 'site',
    MASTERCATALOG: 'master-catalog',
    CATALOG: 'catalog',
    DATAVIEWMODE: 'dataview-mode',
    VERSION: 'version'
  },
  dataViewModes: {
    LIVE: 'Live',
    PENDING: 'Pending'
  },
  capabilityTimeoutInSeconds: 180,
  version: version.current
};

},{"./version":62}],46:[function(require,module,exports){
(function (process){
var assert = require('assert');

function isExpired(ticket) {
  var ungraceperiod = 60000;
  var compareDate = new Date();
  compareDate.setTime(compareDate.getTime() + ungraceperiod);
  return (new Date(ticket.refreshTokenExpiration)) < compareDate;
}

function generateCacheKey(claimtype, context) {
  var cmps;
  if (!process.env.mozuHosted) {
    assert(context.appKey, "No application key in context!");
    cmps = [context.appKey];
  } else {
    cmps = ['mozuHosted'];
  }
  switch(claimtype) {
    case "developer":
      assert(context.developerAccount && context.developerAccount.emailAddress, "No developer account email address in context!");
      cmps.push(context.developerAccount.emailAddress, context.developerAccountId);
      break;
    case "admin-user":
      assert(context.tenant, "No tenant in context!");
      assert(context.adminUser && context.adminUser.emailAddress, "No admin user email address in context!");
      cmps.push(context.tenant, context.adminUser.emailAddress);
      break;
    default:
      break;
  }
  return cmps.join();
}

var InMemoryAuthCache = module.exports = function InMemoryAuthCache() {
  var claimsCaches = {
    application: {},
    developer: {},
    'admin-user': {}
  };

  return {
    get: function(claimtype, context, callback) {
      var ticket = claimsCaches[claimtype][generateCacheKey(claimtype, context)];
      setImmediate(function() {
        callback(null, ticket && !isExpired(ticket) && ticket || undefined);
      });
    },
    set: function(claimtype, context, ticket, callback) {
      claimsCaches[claimtype][generateCacheKey(claimtype, context)] = ticket;
      setImmediate(callback);
    },
    constructor: InMemoryAuthCache
  };
};
}).call(this,require('_process'))
},{"_process":undefined,"assert":undefined}],47:[function(require,module,exports){
/* global Promise */
'use strict';
var constants = require('../constants'),
    AuthTicket = require('./auth-ticket'),
    scopes = constants.scopes;

if (typeof Promise !== "function") require('when/es6-shim/Promise.browserify-es6');

function createMemoizedClientFactory(clientPath) {
  var c;
  return function() {
    return (c || (c = require(clientPath))).apply(this, arguments);
  };
}

var makeAppAuthClient = createMemoizedClientFactory('../clients/platform/applications/authTicket');
var makeDeveloperAuthClient = createMemoizedClientFactory('../clients/platform/developer/developerAdminUserAuthTicket');
var makeAdminUserAuthClient = createMemoizedClientFactory('../clients/platform/adminuser/tenantAdminUserAuthTicket');

function getPlatformAuthTicket(client) {
  return makeAppAuthClient(client).authenticateApp({
    applicationId: client.context.appKey,
    sharedSecret: client.context.sharedSecret
  }, {
    scope: scopes.NONE
  }).then(AuthTicket);
}

function refreshPlatformAuthTicket(client, ticket) {
  return makeAppAuthClient(client).refreshAppAuthTicket({
    refreshToken: ticket.refreshToken
  }, {
    scope: scopes.NONE
  }).then(AuthTicket);
}

function getDeveloperAuthTicket(client) {
  return makeDeveloperAuthClient(client)
    .createDeveloperUserAuthTicket(
      client.context.developerAccount,
      {
        scope: scopes.NONE
      }).then(function(json) {
    return new AuthTicket(json);
  });
}

function refreshDeveloperAuthTicket(client, ticket) {
  return makeDeveloperAuthClient(client).refreshDeveloperAuthTicket(
    ticket,
    {
      scope: scopes.NONE
    }).then(AuthTicket);
}

function getAdminUserAuthTicket(client) {
  return makeAdminUserAuthClient(client).createUserAuthTicket({ tenantId: client.context.tenant }, { 
    body: client.context.adminUser,
    scope: constants.scopes.APP_ONLY
  }).then(function(json) {
    client.context.user = json.user;
    return new AuthTicket(json);
  });
}

function refreshAdminUserAuthTicket(client, ticket) {
  return makeAdminUserAuthClient(client).refreshAuthTicket(ticket, {
    scope: constants.scopes.APP_ONLY
  }).then(AuthTicket);
}

var calleeToClaimType = {
  'addPlatformAppClaims': 'application',
  'addDeveloperUserClaims': 'developer',
  'addAdminUserClaims': 'admin-user'
};

function makeClaimMemoizer(calleeName, requester, refresher, claimHeader) {
  return function(client) {
    var cacheAndUpdateClient = function(ticket) {
      return new Promise(function(resolve) {
        client.authenticationStorage.set(calleeToClaimType[calleeName], client.context, ticket, function() {
          client.context[claimHeader] = ticket.accessToken;
          resolve(client);
        });
      });
    };
    var op = new Promise(function(resolve) {
      client.authenticationStorage.get(calleeToClaimType[calleeName], client.context, function(err, ticket) {
        resolve(ticket);
      });
    }).then(function(ticket) {
      if (!ticket) {
        return requester(client).then(cacheAndUpdateClient);
      }
      if ((new Date(ticket.accessTokenExpiration)) < new Date()) {
        return refresher(client, ticket).then(cacheAndUpdateClient);
      }
      client.context[claimHeader] = ticket.accessToken;
      return client;
    });
    function setRecent() {
      AuthProvider.addMostRecentUserClaims = AuthProvider[calleeName];
    }
    op.then(setRecent, setRecent);
    return op;
  };
}


var AuthProvider = {

  addPlatformAppClaims: makeClaimMemoizer('addPlatformAppClaims', getPlatformAuthTicket, refreshPlatformAuthTicket, constants.headers.APPCLAIMS),
  addDeveloperUserClaims: makeClaimMemoizer('addDeveloperUserClaims', getDeveloperAuthTicket, refreshDeveloperAuthTicket, constants.headers.USERCLAIMS),
  addAdminUserClaims: makeClaimMemoizer('addAdminUserClaims', getAdminUserAuthTicket, refreshAdminUserAuthTicket, constants.headers.USERCLAIMS),
  addMostRecentUserClaims: false
};

module.exports = AuthProvider;

},{"../constants":45,"./auth-ticket":48,"when/es6-shim/Promise.browserify-es6":69}],48:[function(require,module,exports){

/**
 * The authentication ticket used to authenticate anything.
 * @class AuthTicket
 * @property {string} accessToken The token that stores an encrypted list of the application's configured behaviors and authenticates the application.
 * @property {Date} accessTokenExpiration Date and time the access token expires. After the access token expires, refresh the authentication ticket using the refresh token.
 * @property {string} refreshToken The token that refreshes the application's authentication ticket.
 * @property {Date} refreshTokenExpiration Date and time the refresh token expires. After the refresh token expires, generate a new authentication ticket.
 */
function AuthTicket(json) {
  var self = this;
  if (!(this instanceof AuthTicket)) return new AuthTicket(json);
  for (var p in json) {
    if (json.hasOwnProperty(p)) {
      self[p] = p.indexOf('Expiration') !== -1 ? new Date(json[p]) : json[p]; // dateify the dates, this'll break if the prop name changes
    }
  }
}

module.exports = AuthTicket;
},{}],49:[function(require,module,exports){
(function (Buffer){
var extend = require('./tiny-extend');
var util = require('util');
module.exports = function errorify(res, additions) {
  "use strict";
  try {
    if (typeof res === "string") {
      return new Error(res);
    }
    
    var err;
    var message = res.message || res.body && res.body.message;
    var stringBody = typeof res.body === "string" ? res.body : (Buffer.isBuffer(res.body) ? res.body.toString() : null);
    var details = typeof res.body === "object" ? res.body : (typeof res === "object" ? res : {});

    if (!message && stringBody) {
      try {
        details = JSON.parse(stringBody);
        message = details.message || stringBody;
      } catch(e) {
        message = stringBody;
      }
    }

    if (additions) {
      extend(details, additions);
    }

    message = (message || "Unknown error!") + formatDetails(details);

    err = new Error(message);
    err.originalError = details;
    return err;
  } catch(e) {
    return e;
  }
};

function formatDetails(deets) {
  return "\n\nDetails:\n" + Object.keys(deets).map(function(label) {
    var deet = deets[label];
    if (typeof deet === "object") deet = util.inspect(deet);
    return " " + label + ": " + deet;
  }).join('\n') + '\n';
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":6,"./tiny-extend":60,"util":undefined}],50:[function(require,module,exports){
(function (process){
// BEGIN INIT
var fs = require('fs');
var findup = require('./tiny-findup');

var legalConfigNames = ['mozu.config','mozu.config.json'];

module.exports = function getConfig() {
  var conf;
  if (process.env.mozuHosted) {
    try {
      conf = JSON.parse(process.env.mozuHosted).sdkConfig;
    } catch(e) {
      throw new Error("Mozu hosted configuration was unreadable: " + e.message);
    }
  } else {
    for (var i = legalConfigNames.length - 1; i >= 0; i--) {
      try {
        var filename = findup(legalConfigNames[i]);
        if (filename) conf = fs.readFileSync(filename, 'utf-8');
      } catch(e) {}
      if (conf) break;
    }
    if (!conf) {
      throw new Error("No configuration file found. Either create a 'mozu.config' or 'mozu.config.json' file, or supply full config to the .client() method.");
    }
    try {
      conf = JSON.parse(conf);
    } catch(e) {
      throw new Error("Configuration file was unreadable: " + e.message);
    }
  }
  return conf;
};

}).call(this,require('_process'))
},{"./tiny-findup":61,"_process":undefined,"fs":undefined}],51:[function(require,module,exports){
(function (process){
'use strict';
var extend = require('./tiny-extend'),
    request = require('./request'),
    makeUrl = require('./make-url'),
    PrerequisiteManager = require('./prerequisite-manager'),
    pipeline = require('./promise-pipeline');

/**
 * Create an API method that runs a request based on a configuration and a body. The method handles and caches authentication automatically based on a provided scope, by delegating to AuthProvider where necessary.
 * @param {Object} config The configuration object used to create the method. Should include a URITemplate at `url`, optionally an HTTP verb at `method`, and optionally a scope from `constants.scopes` at `scope`.
 * @return {Function} A function that takes two parameters, a `body` object to be used as JSON payload, and optionally an `options` object to be sent to `request` to override default options. Expects to be run in the context of a Client.
 */
module.exports = function(config) {

  function doRequest(body, options) {
    options = options || {};
    var urlSpec = makeUrl(this, config.url, body);
    var finalRequestConfig = extend({}, config, this.defaultRequestOptions, {
      url: urlSpec.url,
      context: this.context,
      body: body
    }, options);
    var finalMethod = finalRequestConfig.method && finalRequestConfig.method.toUpperCase();
    var finalBody;
    if (body && 
        typeof body === "object" &&
        !Array.isArray(body) &&
        !options.body && 
        !options.includeUrlVariablesInPostBody && 
        (finalMethod === "POST" || finalMethod === "PUT")) {
      finalRequestConfig.body = Object.keys(body).reduce(function(m, k) {
        if (!urlSpec.keysUsed[k]) {
          m[k] = body[k];
        }
        return m;
      }, {});
      if (Object.keys(finalRequestConfig.body).length === 0) {
        delete finalRequestConfig.body;
      }
    }
    if (finalMethod === "GET" || finalMethod === "DELETE" && !options.body) {
      delete finalRequestConfig.body;
      // it's outlived its usefulness, we've already made a url with it
    }
    return request(finalRequestConfig, this.requestTransform);
  }

  return function(body, options) {
    var tasks;
    var doThisRequest = doRequest.bind(this, body, options);
    if (process.env.mozuHosted) {
      return doThisRequest();
    } else {
      tasks = PrerequisiteManager.getTasks(this, options, config) || [];
      tasks.push(doThisRequest);
      return pipeline(tasks);
      // this is more readable than the below, earlier version:
      // return pipeline((PrerequisiteManager.getTasks(this, options, config) || []).concat([doRequest.bind(this, body, options)]));
      // and no slower really
    }
  };

};


}).call(this,require('_process'))
},{"./make-url":52,"./prerequisite-manager":55,"./promise-pipeline":56,"./request":57,"./tiny-extend":60,"_process":undefined}],52:[function(require,module,exports){
'use strict';
var uritemplate = require('uritemplate'),
extend = require('./tiny-extend');

var templateCache = {};

function toKeysUsed(memo, expr) {
  if (expr.templateText) memo[expr.templateText] = true;
  return memo;
}

function ensureTrailingSlash(url) {
  return (url.charAt(url.length-1) === '/') ? url : (url + '/');
}

/**
 * Creates, evaluates based on context, and returns a string URL for a Mozu API request.
 * @param  {Object} context The context of a client. Should have a `baseUrl` property at minimum.
 * @param  {string} tpt     A string to be compiled into a UriTemplate. Should be a valid UriTemplate.
 * @param  {Object} body      An object consisting of the JSON body of the request, to be used to interpolate URL paramters.
 * @return {string}         A fully qualified URL.
 */
module.exports = function makeUrl(client, tpt, body) {
  var context = client.context,
    template = templateCache[tpt] && templateCache[tpt].template;
    if (!template) {
      template = uritemplate.parse(tpt);
      templateCache[tpt] = {
        template: template,
        keysUsed: template.expressions.reduce(toKeysUsed, {})
      };
    }
    var ctx = extend({
      homePod: context.baseUrl && ensureTrailingSlash(context.baseUrl),
      tenantId: context.tenant, // URI templates expect tenantId
      pciPod: context.basePciUrl && ensureTrailingSlash(context.basePciUrl)
    }, context, body || {});

  if (ctx.tenantPod) ctx.tenantPod = ensureTrailingSlash(ctx.tenantPod);

  if (!body || !body.hasOwnProperty("version")) delete ctx.version; // don't pass the API version!

  // ensure the correct base url is present
  var baseVar = template.expressions[0];
  if (baseVar.operator && baseVar.operator.symbol === '+' && baseVar.varspecs && !ctx[baseVar.varspecs[0].varname]) {
    throw new Error('Could not make URL from template ' + tpt + '. Your context is missing a ' + baseVar.varspecs[0].varname + '.');
  } 

  return {
    url: template.expand(ctx),
    keysUsed: templateCache[tpt].keysUsed
  };
};

},{"./tiny-extend":60,"uritemplate":68}],53:[function(require,module,exports){
var extend = require('./tiny-extend');

var priorities = {
  'app-claims': ['appClaims'],
  'user-claims': ['userClaims'],
  'tenant': ['tenantId'],
  'site': ['siteId'],
  'master-catalog': ['masterCatalog','masterCatalogId'],
  'catalog': ['catalogId'],
  'dataview-mode': ['dataViewMode']
};

var prioritiesKeys = Object.keys(priorities);

module.exports = function(context) {
  var newContext = extend({}, context);
  return prioritiesKeys.reduce(function(ctx, dashKey) {
    return priorities[dashKey].reduce(function(ctx, k) {
      if (k in ctx) {
        ctx[dashKey] = ctx[k];
        delete ctx[k];
      }
      return ctx;
    }, ctx);
  }, newContext);
};

// var dashedProps = Object.keys(constants.headers).map(function(k) {
//   return constants.headers[k];
// });

// var camelToDash = dashedProps.reduce(function(t, dashed) {
//   t[camelCase(dashed)] = dashed;
//   return t;
// }, {});

// var camelToDashKeys = Object.keys(camelToDash);

// var specialProps =  {
//   tenantId: 'tenant',
//   siteId: 'site',
//   catalogId: 'catalog',
//   masterCatalogId: 'master-catalog'
// }

// var specialPropsKeys = Object.keys(specialProps);

// module.exports = function normalizeContext(context) {

//   return  addSpecialProps(
//             addCamelProps(
//               addDashedProps([extend({}, context), {}])
//             )
//           );
// }

// function addDashedProps(contextPair) {
//   return dashedProps.reduce(function(pair, k) {
//     var older = pair[0],
//         newer = pair[1];
//     if (k in older) {
//       newer[k] = older[k];
//       delete older[k];
//     }
//     return [older, newer];
//   }, contextPair);
// }
},{"./tiny-extend":60}],54:[function(require,module,exports){
'use strict';
var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
module.exports = function parseDate(key, value) {
  return (typeof value === 'string' && reISO.exec(value)) ? new Date(value) : value;
};

},{}],55:[function(require,module,exports){
var AuthProvider = require('../security/auth-provider'),
    scopes = require('../constants').scopes;

var tenantsCache = {};

var makeTenantClient = (function() {
  var c;
  return function() {
    return (c || (c = require('../clients/platform/tenant'))).apply(this, arguments);
  };
}());

function urlRequiresTenantPod(template) {
  return template.indexOf('{+tenantPod}') !== -1;
}

function urlRequiresPciPod(template) {
  return template.indexOf('{+pciPod}') !== -1;
}

function cacheTenantsFromTicket(ticket) {
  var tenants = ticket.availableTenants;
  if (tenants) {
    for (var i = 0; i < tenants.length; i++) {
      tenantsCache[tenants[i].id] = tenants[i];
    }
  }
  delete ticket.availableTenants;
  return ticket;
}

function getTenantInfo(id) {
  return tenantsCache[id];
}

  /**
 * Return an array of tasks (functions returning Promises) that performs, in sequence, all necessary authentication tasks for the given scope.
 * @param  {Client} client The client in whose context to run the tasks. AuthProvider will cache the claims per client.
 * @param  {Scope} scope  A scope (bitmask). If the scope is not NONE, then app claims will be added. If the scope is DEVELOPER xor ADMINUSER, user claims will be added.
 * @return {Array}        A list of tasks. If no auth is required, the list will be empty.
 */
 function getTasks(client, options, requestConfig) {

  var scope;
  // support a named scope, or a reference to a scope bitmask
  if (options && options.scope) {
    if (scopes[options.scope]) {
      scope = scopes[options.scope];
    } else {
      scope = options.scope;
    }
  } else {
    scope = requestConfig.scope;
  }

  var tasks = [];

  if (scope & scopes.DEVELOPER) {
    tasks.push(function() {
      return AuthProvider.addDeveloperUserClaims(client).then(cacheTenantsFromTicket);
    });
  } else if (scope & scopes.ADMINUSER) {
    tasks.push(function() {
      return AuthProvider.addAdminUserClaims(client).then(cacheTenantsFromTicket);
    });
  }
  if (!scope && AuthProvider.addMostRecentUserClaims) {
    tasks.push(function() {
      return AuthProvider.addMostRecentUserClaims(client);
    });
  }

  //if url requires a PCI pod but context is not set throw error
  if (urlRequiresPciPod(requestConfig.url)) {
    if (!client.context.tenant) {
      throw new Error("Could not perform request to PCI service '" + requestConfig.url + "'; no tenant ID was set.");
    }
  }

  // if url requires a tenant pod but we don't have one...
  var currentTenant;
  if (urlRequiresTenantPod(requestConfig.url) && !client.context.tenantPod) {
    if (!client.context.tenant) {
      throw new Error("Could not perform request to tenant-scoped service '" + requestConfig.url + "'; no tenant ID was set.");
    }
    currentTenant = getTenantInfo(client.context.tenant);
    if (currentTenant) {
      client.context.tenantPod = 'https://' + currentTenant.domain + '/';
    } else {
      tasks.push(function() {
        return makeTenantClient(client).getTenant().then(function(tenant) {
          tenantsCache[tenant.id] = tenant;
          client.context.tenantPod = 'https://' + tenant.domain + '/';
        });
      });
    }
  } 

  if (!((scope & scopes.NONE) || (scope & scopes.DEVELOPER))) {
    tasks.push(function() {
      return AuthProvider.addPlatformAppClaims(client);
    });
  }

  return tasks;
}

module.exports = {
  getTasks: getTasks
};

},{"../clients/platform/tenant":44,"../constants":45,"../security/auth-provider":47}],56:[function(require,module,exports){
/* global Promise */
require('when/es6-shim/Promise.browserify-es6');


module.exports = function promisePipeline(tasks) {
  return tasks.reduce(function(p, task) {
    return p.then(task);
  }, Promise.resolve());
};
},{"when/es6-shim/Promise.browserify-es6":69}],57:[function(require,module,exports){
(function (Buffer,process){
/* global Promise */
var constants = require('../constants');
var extend = require('./tiny-extend');
var path = require('path');
var url = require('url');
var protocolHandlers = {
  'http:': require('http'),
  'https:': require('https')
};
var streamToCallback = require('./stream-to-callback');
var parseJsonDates = require('./parse-json-dates');
var errorify = require('./errorify');

require('when/es6-shim/Promise.browserify-es6');

var USER_AGENT = 'Mozu Node SDK v' + constants.version + ' (Node.js ' + process.version + '; ' + process.platform + ' ' + process.arch + ')';

/**
 * Handle headers
 */ 
function makeHeaders(conf, payload) {
  var headers;
  function iterateHeaders(memo, key) {
    if (conf.context[constants.headers[key]]) {
      memo[constants.headerPrefix + constants.headers[key]] = conf.context[constants.headers[key]];
    }
    return memo;
  }
  if (conf.scope && conf.scope & constants.scopes.NONE) {
    headers = {};
  } else if (conf.scope && conf.scope & constants.scopes.APP_ONLY) {
    headers = ['APPCLAIMS'].reduce(iterateHeaders, {});
  } else {
    headers = Object.keys(constants.headers).reduce(iterateHeaders, {});
  }

  if (payload) {
    headers['Content-Length'] = payload.length.toString();
  }

  return extend({
    'Accept': 'application/json',
    'Connection': 'close',
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': USER_AGENT,
  }, headers, conf.headers || {});
}

/**
 * Make an HTTP request to the Mozu API. This method populates headers based on the scope of the supplied context.
 * @param  {Object} options The request options, to be passed to the `request` module. Look up on NPM for details.
 * @return {Promise<ApiResponse,ApiError>}         A Promise that will fulfill as the JSON response from the API, or reject with an error as JSON from the API.
 */

module.exports = function(options, transform) {
  var conf = extend({}, options);
  conf.method = (conf.method || 'get').toUpperCase();
  var payload;
  if (conf.body) {
    payload = conf.body;
    if (typeof payload !== "string" && !Buffer.isBuffer(payload)) {
      payload = JSON.stringify(payload);
    }
  }
  conf.headers = makeHeaders(conf, payload);
  var uri = url.parse(conf.url);
  var protocolHandler = protocolHandlers[uri.protocol];
  if (!protocolHandler) {
    throw new Error('Protocol ' + uri.protocol + ' not supported.');
  }
  return new Promise(function(resolve, reject) {
    var requestOptions = extend({
      hostname: uri.hostname,
      port: uri.port || (uri.protocol === 'https:' ? 443 : 80),
      method: conf.method,
      path: uri.path,
      headers: conf.headers,
      agent: conf.agent
    }, options);
    if (typeof transform === "function") {
      requestOptions = transform(requestOptions); 
    }
    var complete = false;
    var request = protocolHandler.request(requestOptions, function(response) {
      streamToCallback(response, function(err, body) {
        complete = true;
        if (err) return reject(errorify(err, extend({ statusCode: response.statusCode}, response.headers)));
        if (body) {
          try {
            body = JSON.parse(body, (conf.parseDates !== false) && parseJsonDates);
          } catch(e) { 
            return reject(new Error('Response was not valid JSON: ' + e.message + '\n\n-----\n' + body));
          }
        }
        if (response && response.statusCode >= 400 && response.statusCode < 600) {
          return reject(errorify(body || response, extend({ statusCode: response.statusCode}, response.headers)));
        }
        return resolve(body);
      });
    });
    var timeout = options.timeout || 20000;
    request.setTimeout(timeout, function() {
      if (!complete) {
        request.abort();
        reject(errorify("Timeout occurred: request to " + conf.url + " took more than " + timeout / 1000 + " seconds to complete."));
      }
    });
    request.on('error', function(err) {
      reject(errorify(err, request));
    });
    if (payload) request.write(payload);
    request.end();
  });
};

}).call(this,{"isBuffer":require("../../is-buffer/index.js")},require('_process'))
},{"../../is-buffer/index.js":6,"../constants":45,"./errorify":49,"./parse-json-dates":54,"./stream-to-callback":58,"./tiny-extend":60,"_process":undefined,"http":undefined,"https":undefined,"path":undefined,"url":undefined,"when/es6-shim/Promise.browserify-es6":69}],58:[function(require,module,exports){
module.exports = function streamToCallback(stream, cb) {
  var buf = '';
  stream.setEncoding('utf8');
  stream.on('data', function(chunk) {
    buf += chunk;
  });
  stream.on('error', cb);
  stream.on('end', function() {
    cb(null, buf);
  });
};
},{}],59:[function(require,module,exports){
var util = require('util'),
    extend = require('./tiny-extend');

/**
 * Subclass a constructor. Like Node's `util.inherits` but lets you pass additions to the prototype, and composes constructors.
 * @param  {Function} cons  The constructor to subclass.
 * @param  {Object} proto Methods to add to the prototype.
 * @return {Function}       The new subclass.
 */
module.exports = function sub(cons, proto) {
  var child = function() {
      cons.apply(this, arguments);
  };
  util.inherits(child, cons);
  if (proto) extend(child.prototype, proto);
  return child;
};
},{"./tiny-extend":60,"util":undefined}],60:[function(require,module,exports){
module.exports = function extend(target) {
  return Array.prototype.slice.call(arguments,1).reduce(function(out, next) {
    if (next && typeof next === "object") {
      Object.keys(next).forEach(function(k) {
        out[k] = next[k];
      });
    }
    return out;
  }, target);
};
},{}],61:[function(require,module,exports){
(function (process){
var path = require('path');
var fs = require('fs');

module.exports = function findup(filename) {
  var maybeFile = path.resolve(filename),
      dir = process.cwd(),
      last,
      exists;
  while (!(exists = fs.existsSync(maybeFile)) && dir !== last) {
    maybeFile = path.resolve(dir, '..', filename);
    last = dir;
    dir = path.resolve(dir, '..');
  }
  return exists && maybeFile;
};
}).call(this,require('_process'))
},{"_process":undefined,"fs":undefined,"path":undefined}],62:[function(require,module,exports){
module.exports = {
  current: "1.18.15236.0"
};
},{}],63:[function(require,module,exports){
module.exports = function pctEncode(regexp) {
  regexp = regexp || /\W/g;
  return function encode(string) {
    string = String(string);
    return string.replace(regexp, function (m) {
      var c = m[0].charCodeAt(0)
        , encoded = [];
      if (c < 128) {
        encoded.push(c);
      } else if ((128 <= c && c < 2048)) {
        encoded.push((c >> 6) | 192);
        encoded.push((c & 63) | 128);
      } else {
        encoded.push((c >> 12) | 224);
        encoded.push(((c >> 6) & 63) | 128);
        encoded.push((c & 63) | 128);
      }
      return encoded.map(function (c) {
        return '%' + c.toString(16).toUpperCase();
      }).join('');
    })
  }
}

},{}],64:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],65:[function(require,module,exports){
module.exports = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "uriTemplate": parse_uriTemplate,
        "expression": parse_expression,
        "op": parse_op,
        "pathExpression": parse_pathExpression,
        "paramList": parse_paramList,
        "param": parse_param,
        "cut": parse_cut,
        "listMarker": parse_listMarker,
        "substr": parse_substr,
        "nonexpression": parse_nonexpression,
        "extension": parse_extension
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "uriTemplate";
      }
      
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_uriTemplate() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_nonexpression();
        if (result1 === null) {
          result1 = parse_expression();
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_nonexpression();
          if (result1 === null) {
            result1 = parse_expression();
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, pieces) { return new Template(pieces) })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_expression() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 123) {
          result0 = "{";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"{\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_op();
          if (result1 !== null) {
            result2 = parse_paramList();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 125) {
                result3 = "}";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"}\"");
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, op, params) { return expression(op, params) })(pos0, result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_op() {
        var result0;
        
        if (/^[\/;:.?&+#]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\/;:.?&+#]");
          }
        }
        if (result0 === null) {
          result0 = "";
        }
        return result0;
      }
      
      function parse_pathExpression() {
        var result0;
        
        if (input.substr(pos, 2) === "{/") {
          result0 = "{/";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"{/\"");
          }
        }
        return result0;
      }
      
      function parse_paramList() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2, pos3;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_param();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          pos3 = pos;
          if (input.charCodeAt(pos) === 44) {
            result2 = ",";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\",\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos3;
            }
          } else {
            result2 = null;
            pos = pos3;
          }
          if (result2 !== null) {
            result2 = (function(offset, p) { return p; })(pos2, result2[1]);
          }
          if (result2 === null) {
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            pos3 = pos;
            if (input.charCodeAt(pos) === 44) {
              result2 = ",";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\",\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos3;
              }
            } else {
              result2 = null;
              pos = pos3;
            }
            if (result2 !== null) {
              result2 = (function(offset, p) { return p; })(pos2, result2[1]);
            }
            if (result2 === null) {
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, hd, rst) { rst.unshift(hd); return rst; })(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_param() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        if (/^[a-zA-Z0-9_.%]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z0-9_.%]");
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          if (/^[a-zA-Z0-9_.%]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[a-zA-Z0-9_.%]");
            }
          }
        }
        if (result0 !== null) {
          result1 = parse_cut();
          if (result1 === null) {
            result1 = parse_listMarker();
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_extension();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars, clm, e) { clm = clm || {};
              return {
              name: chars.join(''),
              explode: clm.listMarker,
              cut: clm.cut,
              extended: e
            } })(pos0, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_cut() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_substr();
        if (result0 !== null) {
          result0 = (function(offset, cut) { return {cut: cut}; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_listMarker() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 42) {
          result0 = "*";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"*\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, listMarker) { return {listMarker: listMarker}; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_substr() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 58) {
          result0 = ":";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\":\"");
          }
        }
        if (result0 !== null) {
          if (/^[0-9]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[0-9]");
            }
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              if (/^[0-9]/.test(input.charAt(pos))) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("[0-9]");
                }
              }
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, digits) { return parseInt(digits.join('')) })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_nonexpression() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (/^[^{]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[^{]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[^{]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[^{]");
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) { return chars.join(''); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_extension() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 !== null) {
          if (/^[^)]/.test(input.charAt(pos))) {
            result2 = input.charAt(pos);
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[^)]");
            }
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              if (/^[^)]/.test(input.charAt(pos))) {
                result2 = input.charAt(pos);
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("[^)]");
                }
              }
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 41) {
              result2 = ")";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\")\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, chars) { return chars.join('') })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        
        var line = 1;
        var column = 1;
        var seenCR = false;
        
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        
        return { line: line, column: column };
      }
      
      
          var cls = require('./lib/classes')
          var Template = cls.Template
          var expression = cls.expression
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();

},{"./lib/classes":66}],66:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var FormContinuationExpression, FormStartExpression, FragmentExpression, LabelExpression, NamedExpression, PathParamExpression, PathSegmentExpression, ReservedExpression, SimpleExpression, Template, encoders, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  encoders = require('./encoders');

  Template = Template = (function() {
    function Template(pieces) {
      /*
      :param pieces: An array of strings and expressions in the order they appear in the template.
      */

      var i,
        _this = this;
      this.expressions = [];
      this.prefix = 'string' === typeof pieces[0] ? pieces.shift() : '';
      i = 0;
      pieces.forEach(function(p) {
        switch (typeof p) {
          case 'object':
            return _this.expressions[i++] = p;
          case 'string':
            return _this.expressions[i - 1].suffix = p;
        }
      });
    }

    Template.prototype.expand = function(vars) {
      return this.prefix + this.expressions.map(function(expr) {
        return expr.expand(vars);
      }).join('');
    };

    Template.prototype.toString = function() {
      return this.prefix + this.expressions.join('');
    };

    Template.prototype.toJSON = function() {
      return this.toString();
    };

    return Template;

  })();

  SimpleExpression = (function() {
    var definedPairs;

    SimpleExpression.prototype.first = "";

    SimpleExpression.prototype.sep = ",";

    SimpleExpression.prototype.named = false;

    SimpleExpression.prototype.empty = "";

    SimpleExpression.prototype.allow = "U";

    function SimpleExpression(params) {
      this.params = params;
      this.explodeObject = __bind(this.explodeObject, this);
      this.explodeArray = __bind(this.explodeArray, this);
      this._expandPair = __bind(this._expandPair, this);
      this.stringifySingle = __bind(this.stringifySingle, this);
      this.encode = __bind(this.encode, this);
      if (this.params == null) {
        this.params = [];
      }
      this.suffix = '';
    }

    SimpleExpression.prototype.encode = function(string) {
      /*
      Encode a string value for the URI
      */

      return encoders[this.allow](string);
    };

    SimpleExpression.prototype.stringifySingle = function(param, value) {
      /*
      Encode a single value as a string
      */

      var k, type, v;
      type = typeof value;
      if (type === 'string' || type === 'boolean' || type === 'number') {
        value = value.toString();
        return this.encode(value.substring(0, param.cut || value.length));
      } else if (Array.isArray(value)) {
        if (param.cut) {
          throw new Error("Prefixed Values do not support lists. Check " + param.name);
        }
        return value.map(this.encode).join(',');
      } else {
        if (param.cut) {
          throw new Error("Prefixed Values do not support maps. Check " + param.name);
        }
        return ((function() {
          var _results;
          _results = [];
          for (k in value) {
            v = value[k];
            _results.push([k, v].map(this.encode).join(','));
          }
          return _results;
        }).call(this)).join(',');
      }
    };

    SimpleExpression.prototype.expand = function(vars) {
      var defined, expanded,
        _this = this;
      defined = definedPairs(this.params, vars);
      expanded = defined.map(function(pair) {
        return _this._expandPair.apply(_this, pair);
      }).join(this.sep);
      if (expanded) {
        return this.first + expanded + this.suffix;
      } else {
        if (this.empty && defined.length) {
          return this.empty + this.suffix;
        } else {
          return this.suffix;
        }
      }
    };

    definedPairs = function(params, vars) {
      /*
      Return an array of [key, value] arrays where ``key`` is a parameter name
      from ``@params`` and ``value`` is the value from vars, when ``value`` is
      neither undefined nor an empty collection.
      */

      var _this = this;
      return params.map(function(p) {
        return [p, vars[p.name]];
      }).filter(function(pair) {
        var k, v, vv;
        v = pair[1];
        switch (typeof v) {
          case "undefined":
            return false;
          case "object":
            if (Array.isArray(v)) {
              v.length > 0;
            }
            for (k in v) {
              vv = v[k];
              if (vv) {
                return true;
              }
            }
            return false;
          default:
            return true;
        }
      });
    };

    SimpleExpression.prototype._expandPair = function(param, value) {
      /*
      Return the expanded string form of ``pair``.
      
      :param pair: A ``[param, value]`` tuple.
      */

      var name;
      name = param.name;
      if (param.explode) {
        if (Array.isArray(value)) {
          return this.explodeArray(param, value);
        } else if (typeof value === 'string') {
          return this.stringifySingle(param, value);
        } else {
          return this.explodeObject(value);
        }
      } else {
        return this.stringifySingle(param, value);
      }
    };

    SimpleExpression.prototype.explodeArray = function(param, array) {
      return array.map(this.encode).join(this.sep);
    };

    SimpleExpression.prototype.explodeObject = function(object) {
      var k, pairs, v, vv, _i, _len;
      pairs = [];
      for (k in object) {
        v = object[k];
        k = this.encode(k);
        if (Array.isArray(v)) {
          for (_i = 0, _len = v.length; _i < _len; _i++) {
            vv = v[_i];
            pairs.push([k, this.encode(vv)]);
          }
        } else {
          pairs.push([k, this.encode(v)]);
        }
      }
      return pairs.map(function(pair) {
        return pair.join('=');
      }).join(this.sep);
    };

    SimpleExpression.prototype.toString = function() {
      var params;
      params = this.params.map(function(p) {
        return p.name + p.explode;
      }).join(',');
      return "{" + this.first + params + "}" + this.suffix;
    };

    SimpleExpression.prototype.toJSON = function() {
      return this.toString();
    };

    return SimpleExpression;

  })();

  NamedExpression = (function(_super) {
    __extends(NamedExpression, _super);

    function NamedExpression() {
      this.explodeArray = __bind(this.explodeArray, this);
      this.stringifySingle = __bind(this.stringifySingle, this);
      _ref = NamedExpression.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    /*
    A NamedExpression uses name=value expansions in most cases
    */


    NamedExpression.prototype.stringifySingle = function(param, value) {
      value = (value = NamedExpression.__super__.stringifySingle.apply(this, arguments)) ? "=" + value : this.empty;
      return "" + param.name + value;
    };

    NamedExpression.prototype.explodeArray = function(param, array) {
      var _this = this;
      return array.map(function(v) {
        return "" + param.name + "=" + (_this.encode(v));
      }).join(this.sep);
    };

    return NamedExpression;

  })(SimpleExpression);

  ReservedExpression = (function(_super) {
    __extends(ReservedExpression, _super);

    function ReservedExpression() {
      _ref1 = ReservedExpression.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    ReservedExpression.prototype.encode = function(string) {
      return encoders['U+R'](string);
    };

    ReservedExpression.prototype.toString = function() {
      return '{+' + (ReservedExpression.__super__.toString.apply(this, arguments)).substring(1);
    };

    return ReservedExpression;

  })(SimpleExpression);

  FragmentExpression = (function(_super) {
    __extends(FragmentExpression, _super);

    function FragmentExpression() {
      _ref2 = FragmentExpression.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    FragmentExpression.prototype.first = '#';

    FragmentExpression.prototype.empty = '#';

    FragmentExpression.prototype.encode = function(string) {
      return encoders['U+R'](string);
    };

    return FragmentExpression;

  })(SimpleExpression);

  LabelExpression = (function(_super) {
    __extends(LabelExpression, _super);

    function LabelExpression() {
      _ref3 = LabelExpression.__super__.constructor.apply(this, arguments);
      return _ref3;
    }

    LabelExpression.prototype.first = '.';

    LabelExpression.prototype.sep = '.';

    LabelExpression.prototype.empty = '.';

    return LabelExpression;

  })(SimpleExpression);

  PathSegmentExpression = (function(_super) {
    __extends(PathSegmentExpression, _super);

    function PathSegmentExpression() {
      _ref4 = PathSegmentExpression.__super__.constructor.apply(this, arguments);
      return _ref4;
    }

    PathSegmentExpression.prototype.first = '/';

    PathSegmentExpression.prototype.sep = '/';

    return PathSegmentExpression;

  })(SimpleExpression);

  PathParamExpression = (function(_super) {
    __extends(PathParamExpression, _super);

    function PathParamExpression() {
      _ref5 = PathParamExpression.__super__.constructor.apply(this, arguments);
      return _ref5;
    }

    PathParamExpression.prototype.first = ';';

    PathParamExpression.prototype.sep = ';';

    return PathParamExpression;

  })(NamedExpression);

  FormStartExpression = (function(_super) {
    __extends(FormStartExpression, _super);

    function FormStartExpression() {
      _ref6 = FormStartExpression.__super__.constructor.apply(this, arguments);
      return _ref6;
    }

    FormStartExpression.prototype.first = '?';

    FormStartExpression.prototype.sep = '&';

    FormStartExpression.prototype.empty = '=';

    return FormStartExpression;

  })(NamedExpression);

  FormContinuationExpression = (function(_super) {
    __extends(FormContinuationExpression, _super);

    function FormContinuationExpression() {
      _ref7 = FormContinuationExpression.__super__.constructor.apply(this, arguments);
      return _ref7;
    }

    FormContinuationExpression.prototype.first = '&';

    return FormContinuationExpression;

  })(FormStartExpression);

  module.exports = {
    Template: Template,
    SimpleExpression: SimpleExpression,
    NamedExpression: NamedExpression,
    ReservedExpression: ReservedExpression,
    FragmentExpression: FragmentExpression,
    LabelExpression: LabelExpression,
    PathSegmentExpression: PathSegmentExpression,
    PathParamExpression: PathParamExpression,
    FormStartExpression: FormStartExpression,
    FormContinuationExpression: FormContinuationExpression,
    expression: function(op, params) {
      var cls;
      cls = (function() {
        switch (op) {
          case '':
            return SimpleExpression;
          case '+':
            return ReservedExpression;
          case '#':
            return FragmentExpression;
          case '.':
            return LabelExpression;
          case '/':
            return PathSegmentExpression;
          case ';':
            return PathParamExpression;
          case '?':
            return FormStartExpression;
          case '&':
            return FormContinuationExpression;
        }
      })();
      return new cls(params);
    }
  };

}).call(this);

},{"./encoders":67}],67:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var pctEncode;

  pctEncode = require('pct-encode');

  exports["U"] = pctEncode(/[^\w~.-]/g);

  exports["U+R"] = pctEncode(/[^\w.~:\/\?#\[\]@!\$&'()*+,;=%-]|%(?!\d\d)/g);

}).call(this);

},{"pct-encode":63}],68:[function(require,module,exports){
(function (global){
/*global unescape, module, define, window, global*/

/*
 UriTemplate Copyright (c) 2012-2013 Franz Antesberger. All Rights Reserved.
 Available via the MIT license.
*/

(function (exportCallback) {
    "use strict";

var UriTemplateError = (function () {

    function UriTemplateError (options) {
        this.options = options;
    }

    UriTemplateError.prototype.toString = function () {
        if (JSON && JSON.stringify) {
            return JSON.stringify(this.options);
        }
        else {
            return this.options;
        }
    };

    return UriTemplateError;
}());

var objectHelper = (function () {
    function isArray (value) {
        return Object.prototype.toString.apply(value) === '[object Array]';
    }

    function isString (value) {
        return Object.prototype.toString.apply(value) === '[object String]';
    }
    
    function isNumber (value) {
        return Object.prototype.toString.apply(value) === '[object Number]';
    }
    
    function isBoolean (value) {
        return Object.prototype.toString.apply(value) === '[object Boolean]';
    }
    
    function join (arr, separator) {
        var
            result = '',
            first = true,
            index;
        for (index = 0; index < arr.length; index += 1) {
            if (first) {
                first = false;
            }
            else {
                result += separator;
            }
            result += arr[index];
        }
        return result;
    }

    function map (arr, mapper) {
        var
            result = [],
            index = 0;
        for (; index < arr.length; index += 1) {
            result.push(mapper(arr[index]));
        }
        return result;
    }

    function filter (arr, predicate) {
        var
            result = [],
            index = 0;
        for (; index < arr.length; index += 1) {
            if (predicate(arr[index])) {
                result.push(arr[index]);
            }
        }
        return result;
    }

    function deepFreezeUsingObjectFreeze (object) {
        if (typeof object !== "object" || object === null) {
            return object;
        }
        Object.freeze(object);
        var property, propertyName;
        for (propertyName in object) {
            if (object.hasOwnProperty(propertyName)) {
                property = object[propertyName];
                // be aware, arrays are 'object', too
                if (typeof property === "object") {
                    deepFreeze(property);
                }
            }
        }
        return object;
    }

    function deepFreeze (object) {
        if (typeof Object.freeze === 'function') {
            return deepFreezeUsingObjectFreeze(object);
        }
        return object;
    }


    return {
        isArray: isArray,
        isString: isString,
        isNumber: isNumber,
        isBoolean: isBoolean,
        join: join,
        map: map,
        filter: filter,
        deepFreeze: deepFreeze
    };
}());

var charHelper = (function () {

    function isAlpha (chr) {
        return (chr >= 'a' && chr <= 'z') || ((chr >= 'A' && chr <= 'Z'));
    }

    function isDigit (chr) {
        return chr >= '0' && chr <= '9';
    }

    function isHexDigit (chr) {
        return isDigit(chr) || (chr >= 'a' && chr <= 'f') || (chr >= 'A' && chr <= 'F');
    }

    return {
        isAlpha: isAlpha,
        isDigit: isDigit,
        isHexDigit: isHexDigit
    };
}());

var pctEncoder = (function () {
    var utf8 = {
        encode: function (chr) {
            // see http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
            return unescape(encodeURIComponent(chr));
        },
        numBytes: function (firstCharCode) {
            if (firstCharCode <= 0x7F) {
                return 1;
            }
            else if (0xC2 <= firstCharCode && firstCharCode <= 0xDF) {
                return 2;
            }
            else if (0xE0 <= firstCharCode && firstCharCode <= 0xEF) {
                return 3;
            }
            else if (0xF0 <= firstCharCode && firstCharCode <= 0xF4) {
                return 4;
            }
            // no valid first octet
            return 0;
        },
        isValidFollowingCharCode: function (charCode) {
            return 0x80 <= charCode && charCode <= 0xBF;
        }
    };

    /**
     * encodes a character, if needed or not.
     * @param chr
     * @return pct-encoded character
     */
    function encodeCharacter (chr) {
        var
            result = '',
            octets = utf8.encode(chr),
            octet,
            index;
        for (index = 0; index < octets.length; index += 1) {
            octet = octets.charCodeAt(index);
            result += '%' + (octet < 0x10 ? '0' : '') + octet.toString(16).toUpperCase();
        }
        return result;
    }

    /**
     * Returns, whether the given text at start is in the form 'percent hex-digit hex-digit', like '%3F'
     * @param text
     * @param start
     * @return {boolean|*|*}
     */
    function isPercentDigitDigit (text, start) {
        return text.charAt(start) === '%' && charHelper.isHexDigit(text.charAt(start + 1)) && charHelper.isHexDigit(text.charAt(start + 2));
    }

    /**
     * Parses a hex number from start with length 2.
     * @param text a string
     * @param start the start index of the 2-digit hex number
     * @return {Number}
     */
    function parseHex2 (text, start) {
        return parseInt(text.substr(start, 2), 16);
    }

    /**
     * Returns whether or not the given char sequence is a correctly pct-encoded sequence.
     * @param chr
     * @return {boolean}
     */
    function isPctEncoded (chr) {
        if (!isPercentDigitDigit(chr, 0)) {
            return false;
        }
        var firstCharCode = parseHex2(chr, 1);
        var numBytes = utf8.numBytes(firstCharCode);
        if (numBytes === 0) {
            return false;
        }
        for (var byteNumber = 1; byteNumber < numBytes; byteNumber += 1) {
            if (!isPercentDigitDigit(chr, 3*byteNumber) || !utf8.isValidFollowingCharCode(parseHex2(chr, 3*byteNumber + 1))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Reads as much as needed from the text, e.g. '%20' or '%C3%B6'. It does not decode!
     * @param text
     * @param startIndex
     * @return the character or pct-string of the text at startIndex
     */
    function pctCharAt(text, startIndex) {
        var chr = text.charAt(startIndex);
        if (!isPercentDigitDigit(text, startIndex)) {
            return chr;
        }
        var utf8CharCode = parseHex2(text, startIndex + 1);
        var numBytes = utf8.numBytes(utf8CharCode);
        if (numBytes === 0) {
            return chr;
        }
        for (var byteNumber = 1; byteNumber < numBytes; byteNumber += 1) {
            if (!isPercentDigitDigit(text, startIndex + 3 * byteNumber) || !utf8.isValidFollowingCharCode(parseHex2(text, startIndex + 3 * byteNumber + 1))) {
                return chr;
            }
        }
        return text.substr(startIndex, 3 * numBytes);
    }

    return {
        encodeCharacter: encodeCharacter,
        isPctEncoded: isPctEncoded,
        pctCharAt: pctCharAt
    };
}());

var rfcCharHelper = (function () {

    /**
     * Returns if an character is an varchar character according 2.3 of rfc 6570
     * @param chr
     * @return (Boolean)
     */
    function isVarchar (chr) {
        return charHelper.isAlpha(chr) || charHelper.isDigit(chr) || chr === '_' || pctEncoder.isPctEncoded(chr);
    }

    /**
     * Returns if chr is an unreserved character according 1.5 of rfc 6570
     * @param chr
     * @return {Boolean}
     */
    function isUnreserved (chr) {
        return charHelper.isAlpha(chr) || charHelper.isDigit(chr) || chr === '-' || chr === '.' || chr === '_' || chr === '~';
    }

    /**
     * Returns if chr is an reserved character according 1.5 of rfc 6570
     * or the percent character mentioned in 3.2.1.
     * @param chr
     * @return {Boolean}
     */
    function isReserved (chr) {
        return chr === ':' || chr === '/' || chr === '?' || chr === '#' || chr === '[' || chr === ']' || chr === '@' || chr === '!' || chr === '$' || chr === '&' || chr === '(' ||
            chr === ')' || chr === '*' || chr === '+' || chr === ',' || chr === ';' || chr === '=' || chr === "'";
    }

    return {
        isVarchar: isVarchar,
        isUnreserved: isUnreserved,
        isReserved: isReserved
    };

}());

/**
 * encoding of rfc 6570
 */
var encodingHelper = (function () {

    function encode (text, passReserved) {
        var
            result = '',
            index,
            chr = '';
        if (typeof text === "number" || typeof text === "boolean") {
            text = text.toString();
        }
        for (index = 0; index < text.length; index += chr.length) {
            chr = text.charAt(index);
            result += rfcCharHelper.isUnreserved(chr) || (passReserved && rfcCharHelper.isReserved(chr)) ? chr : pctEncoder.encodeCharacter(chr);
        }
        return result;
    }

    function encodePassReserved (text) {
        return encode(text, true);
    }

    function encodeLiteralCharacter (literal, index) {
        var chr = pctEncoder.pctCharAt(literal, index);
        if (chr.length > 1) {
            return chr;
        }
        else {
            return rfcCharHelper.isReserved(chr) || rfcCharHelper.isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
        }
    }

    function encodeLiteral (literal) {
        var
            result = '',
            index,
            chr = '';
        for (index = 0; index < literal.length; index += chr.length) {
            chr = pctEncoder.pctCharAt(literal, index);
            if (chr.length > 1) {
                result += chr;
            }
            else {
                result += rfcCharHelper.isReserved(chr) || rfcCharHelper.isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
            }
        }
        return result;
    }

    return {
        encode: encode,
        encodePassReserved: encodePassReserved,
        encodeLiteral: encodeLiteral,
        encodeLiteralCharacter: encodeLiteralCharacter
    };

}());


// the operators defined by rfc 6570
var operators = (function () {

    var
        bySymbol = {};

    function create (symbol) {
        bySymbol[symbol] = {
            symbol: symbol,
            separator: (symbol === '?') ? '&' : (symbol === '' || symbol === '+' || symbol === '#') ? ',' : symbol,
            named: symbol === ';' || symbol === '&' || symbol === '?',
            ifEmpty: (symbol === '&' || symbol === '?') ? '=' : '',
            first: (symbol === '+' ) ? '' : symbol,
            encode: (symbol === '+' || symbol === '#') ? encodingHelper.encodePassReserved : encodingHelper.encode,
            toString: function () {
                return this.symbol;
            }
        };
    }

    create('');
    create('+');
    create('#');
    create('.');
    create('/');
    create(';');
    create('?');
    create('&');
    return {
        valueOf: function (chr) {
            if (bySymbol[chr]) {
                return bySymbol[chr];
            }
            if ("=,!@|".indexOf(chr) >= 0) {
                return null;
            }
            return bySymbol[''];
        }
    };
}());


/**
 * Detects, whether a given element is defined in the sense of rfc 6570
 * Section 2.3 of the RFC makes clear defintions:
 * * undefined and null are not defined.
 * * the empty string is defined
 * * an array ("list") is defined, if it is not empty (even if all elements are not defined)
 * * an object ("map") is defined, if it contains at least one property with defined value
 * @param object
 * @return {Boolean}
 */
function isDefined (object) {
    var
        propertyName;
    if (object === null || object === undefined) {
        return false;
    }
    if (objectHelper.isArray(object)) {
        // Section 2.3: A variable defined as a list value is considered undefined if the list contains zero members
        return object.length > 0;
    }
    if (typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
        // falsy values like empty strings, false or 0 are "defined"
        return true;
    }
    // else Object
    for (propertyName in object) {
        if (object.hasOwnProperty(propertyName) && isDefined(object[propertyName])) {
            return true;
        }
    }
    return false;
}

var LiteralExpression = (function () {
    function LiteralExpression (literal) {
        this.literal = encodingHelper.encodeLiteral(literal);
    }

    LiteralExpression.prototype.expand = function () {
        return this.literal;
    };

    LiteralExpression.prototype.toString = LiteralExpression.prototype.expand;

    return LiteralExpression;
}());

var parse = (function () {

    function parseExpression (expressionText) {
        var
            operator,
            varspecs = [],
            varspec = null,
            varnameStart = null,
            maxLengthStart = null,
            index,
            chr = '';

        function closeVarname () {
            var varname = expressionText.substring(varnameStart, index);
            if (varname.length === 0) {
                throw new UriTemplateError({expressionText: expressionText, message: "a varname must be specified", position: index});
            }
            varspec = {varname: varname, exploded: false, maxLength: null};
            varnameStart = null;
        }

        function closeMaxLength () {
            if (maxLengthStart === index) {
                throw new UriTemplateError({expressionText: expressionText, message: "after a ':' you have to specify the length", position: index});
            }
            varspec.maxLength = parseInt(expressionText.substring(maxLengthStart, index), 10);
            maxLengthStart = null;
        }

        operator = (function (operatorText) {
            var op = operators.valueOf(operatorText);
            if (op === null) {
                throw new UriTemplateError({expressionText: expressionText, message: "illegal use of reserved operator", position: index, operator: operatorText});
            }
            return op;
        }(expressionText.charAt(0)));
        index = operator.symbol.length;

        varnameStart = index;

        for (; index < expressionText.length; index += chr.length) {
            chr = pctEncoder.pctCharAt(expressionText, index);

            if (varnameStart !== null) {
                // the spec says: varname =  varchar *( ["."] varchar )
                // so a dot is allowed except for the first char
                if (chr === '.') {
                    if (varnameStart === index) {
                        throw new UriTemplateError({expressionText: expressionText, message: "a varname MUST NOT start with a dot", position: index});
                    }
                    continue;
                }
                if (rfcCharHelper.isVarchar(chr)) {
                    continue;
                }
                closeVarname();
            }
            if (maxLengthStart !== null) {
                if (index === maxLengthStart && chr === '0') {
                    throw new UriTemplateError({expressionText: expressionText, message: "A :prefix must not start with digit 0", position: index});
                }
                if (charHelper.isDigit(chr)) {
                    if (index - maxLengthStart >= 4) {
                        throw new UriTemplateError({expressionText: expressionText, message: "A :prefix must have max 4 digits", position: index});
                    }
                    continue;
                }
                closeMaxLength();
            }
            if (chr === ':') {
                if (varspec.maxLength !== null) {
                    throw new UriTemplateError({expressionText: expressionText, message: "only one :maxLength is allowed per varspec", position: index});
                }
                if (varspec.exploded) {
                    throw new UriTemplateError({expressionText: expressionText, message: "an exploeded varspec MUST NOT be varspeced", position: index});
                }
                maxLengthStart = index + 1;
                continue;
            }
            if (chr === '*') {
                if (varspec === null) {
                    throw new UriTemplateError({expressionText: expressionText, message: "exploded without varspec", position: index});
                }
                if (varspec.exploded) {
                    throw new UriTemplateError({expressionText: expressionText, message: "exploded twice", position: index});
                }
                if (varspec.maxLength) {
                    throw new UriTemplateError({expressionText: expressionText, message: "an explode (*) MUST NOT follow to a prefix", position: index});
                }
                varspec.exploded = true;
                continue;
            }
            // the only legal character now is the comma
            if (chr === ',') {
                varspecs.push(varspec);
                varspec = null;
                varnameStart = index + 1;
                continue;
            }
            throw new UriTemplateError({expressionText: expressionText, message: "illegal character", character: chr, position: index});
        } // for chr
        if (varnameStart !== null) {
            closeVarname();
        }
        if (maxLengthStart !== null) {
            closeMaxLength();
        }
        varspecs.push(varspec);
        return new VariableExpression(expressionText, operator, varspecs);
    }

    function parse (uriTemplateText) {
        // assert filled string
        var
            index,
            chr,
            expressions = [],
            braceOpenIndex = null,
            literalStart = 0;
        for (index = 0; index < uriTemplateText.length; index += 1) {
            chr = uriTemplateText.charAt(index);
            if (literalStart !== null) {
                if (chr === '}') {
                    throw new UriTemplateError({templateText: uriTemplateText, message: "unopened brace closed", position: index});
                }
                if (chr === '{') {
                    if (literalStart < index) {
                        expressions.push(new LiteralExpression(uriTemplateText.substring(literalStart, index)));
                    }
                    literalStart = null;
                    braceOpenIndex = index;
                }
                continue;
            }

            if (braceOpenIndex !== null) {
                // here just { is forbidden
                if (chr === '{') {
                    throw new UriTemplateError({templateText: uriTemplateText, message: "brace already opened", position: index});
                }
                if (chr === '}') {
                    if (braceOpenIndex + 1 === index) {
                        throw new UriTemplateError({templateText: uriTemplateText, message: "empty braces", position: braceOpenIndex});
                    }
                    try {
                        expressions.push(parseExpression(uriTemplateText.substring(braceOpenIndex + 1, index)));
                    }
                    catch (error) {
                        if (error.prototype === UriTemplateError.prototype) {
                            throw new UriTemplateError({templateText: uriTemplateText, message: error.options.message, position: braceOpenIndex + error.options.position, details: error.options});
                        }
                        throw error;
                    }
                    braceOpenIndex = null;
                    literalStart = index + 1;
                }
                continue;
            }
            throw new Error('reached unreachable code');
        }
        if (braceOpenIndex !== null) {
            throw new UriTemplateError({templateText: uriTemplateText, message: "unclosed brace", position: braceOpenIndex});
        }
        if (literalStart < uriTemplateText.length) {
            expressions.push(new LiteralExpression(uriTemplateText.substr(literalStart)));
        }
        return new UriTemplate(uriTemplateText, expressions);
    }

    return parse;
}());

var VariableExpression = (function () {
    // helper function if JSON is not available
    function prettyPrint (value) {
        return (JSON && JSON.stringify) ? JSON.stringify(value) : value;
    }

    function isEmpty (value) {
        if (!isDefined(value)) {
            return true;
        }
        if (objectHelper.isString(value)) {
            return value === '';
        }
        if (objectHelper.isNumber(value) || objectHelper.isBoolean(value)) {
            return false;
        }
        if (objectHelper.isArray(value)) {
            return value.length === 0;
        }
        for (var propertyName in value) {
            if (value.hasOwnProperty(propertyName)) {
                return false;
            }
        }
        return true;
    }

    function propertyArray (object) {
        var
            result = [],
            propertyName;
        for (propertyName in object) {
            if (object.hasOwnProperty(propertyName)) {
                result.push({name: propertyName, value: object[propertyName]});
            }
        }
        return result;
    }

    function VariableExpression (templateText, operator, varspecs) {
        this.templateText = templateText;
        this.operator = operator;
        this.varspecs = varspecs;
    }

    VariableExpression.prototype.toString = function () {
        return this.templateText;
    };

    function expandSimpleValue(varspec, operator, value) {
        var result = '';
        value = value.toString();
        if (operator.named) {
            result += encodingHelper.encodeLiteral(varspec.varname);
            if (value === '') {
                result += operator.ifEmpty;
                return result;
            }
            result += '=';
        }
        if (varspec.maxLength !== null) {
            value = value.substr(0, varspec.maxLength);
        }
        result += operator.encode(value);
        return result;
    }

    function valueDefined (nameValue) {
        return isDefined(nameValue.value);
    }

    function expandNotExploded(varspec, operator, value) {
        var
            arr = [],
            result = '';
        if (operator.named) {
            result += encodingHelper.encodeLiteral(varspec.varname);
            if (isEmpty(value)) {
                result += operator.ifEmpty;
                return result;
            }
            result += '=';
        }
        if (objectHelper.isArray(value)) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, operator.encode);
            result += objectHelper.join(arr, ',');
        }
        else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, valueDefined);
            arr = objectHelper.map(arr, function (nameValue) {
                return operator.encode(nameValue.name) + ',' + operator.encode(nameValue.value);
            });
            result += objectHelper.join(arr, ',');
        }
        return result;
    }

    function expandExplodedNamed (varspec, operator, value) {
        var
            isArray = objectHelper.isArray(value),
            arr = [];
        if (isArray) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, function (listElement) {
                var tmp = encodingHelper.encodeLiteral(varspec.varname);
                if (isEmpty(listElement)) {
                    tmp += operator.ifEmpty;
                }
                else {
                    tmp += '=' + operator.encode(listElement);
                }
                return tmp;
            });
        }
        else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, valueDefined);
            arr = objectHelper.map(arr, function (nameValue) {
                var tmp = encodingHelper.encodeLiteral(nameValue.name);
                if (isEmpty(nameValue.value)) {
                    tmp += operator.ifEmpty;
                }
                else {
                    tmp += '=' + operator.encode(nameValue.value);
                }
                return tmp;
            });
        }
        return objectHelper.join(arr, operator.separator);
    }

    function expandExplodedUnnamed (operator, value) {
        var
            arr = [],
            result = '';
        if (objectHelper.isArray(value)) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, operator.encode);
            result += objectHelper.join(arr, operator.separator);
        }
        else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, function (nameValue) {
                return isDefined(nameValue.value);
            });
            arr = objectHelper.map(arr, function (nameValue) {
                return operator.encode(nameValue.name) + '=' + operator.encode(nameValue.value);
            });
            result += objectHelper.join(arr, operator.separator);
        }
        return result;
    }


    VariableExpression.prototype.expand = function (variables) {
        var
            expanded = [],
            index,
            varspec,
            value,
            valueIsArr,
            oneExploded = false,
            operator = this.operator;

        // expand each varspec and join with operator's separator
        for (index = 0; index < this.varspecs.length; index += 1) {
            varspec = this.varspecs[index];
            value = variables[varspec.varname];
            // if (!isDefined(value)) {
            // if (variables.hasOwnProperty(varspec.name)) {
            if (value === null || value === undefined) {
                continue;
            }
            if (varspec.exploded) {
                oneExploded = true;
            }
            valueIsArr = objectHelper.isArray(value);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                expanded.push(expandSimpleValue(varspec, operator, value));
            }
            else if (varspec.maxLength && isDefined(value)) {
                // 2.4.1 of the spec says: "Prefix modifiers are not applicable to variables that have composite values."
                throw new Error('Prefix modifiers are not applicable to variables that have composite values. You tried to expand ' + this + " with " + prettyPrint(value));
            }
            else if (!varspec.exploded) {
                if (operator.named || !isEmpty(value)) {
                    expanded.push(expandNotExploded(varspec, operator, value));
                }
            }
            else if (isDefined(value)) {
                if (operator.named) {
                    expanded.push(expandExplodedNamed(varspec, operator, value));
                }
                else {
                    expanded.push(expandExplodedUnnamed(operator, value));
                }
            }
        }

        if (expanded.length === 0) {
            return "";
        }
        else {
            return operator.first + objectHelper.join(expanded, operator.separator);
        }
    };

    return VariableExpression;
}());

var UriTemplate = (function () {
    function UriTemplate (templateText, expressions) {
        this.templateText = templateText;
        this.expressions = expressions;
        objectHelper.deepFreeze(this);
    }

    UriTemplate.prototype.toString = function () {
        return this.templateText;
    };

    UriTemplate.prototype.expand = function (variables) {
        // this.expressions.map(function (expression) {return expression.expand(variables);}).join('');
        var
            index,
            result = '';
        for (index = 0; index < this.expressions.length; index += 1) {
            result += this.expressions[index].expand(variables);
        }
        return result;
    };

    UriTemplate.parse = parse;
    UriTemplate.UriTemplateError = UriTemplateError;
    return UriTemplate;
}());

    exportCallback(UriTemplate);

}(function (UriTemplate) {
        "use strict";
        // export UriTemplate, when module is present, or pass it to window or global
        if (typeof module !== "undefined") {
            module.exports = UriTemplate;
        }
        else if (typeof define === "function") {
            define([],function() {
                return UriTemplate;
            });
        }
        else if (typeof window !== "undefined") {
            window.UriTemplate = UriTemplate;
        }
        else {
            global.UriTemplate = UriTemplate;
        }
    }
));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],69:[function(require,module,exports){
(function (global){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * ES6 global Promise shim
 */
var unhandledRejections = require('../lib/decorators/unhandledRejection');
var PromiseConstructor = unhandledRejections(require('../lib/Promise'));

module.exports = typeof global != 'undefined' ? (global.Promise = PromiseConstructor)
	           : typeof self   != 'undefined' ? (self.Promise   = PromiseConstructor)
	           : PromiseConstructor;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/Promise":70,"../lib/decorators/unhandledRejection":72}],70:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./Scheduler');
	var async = require('./env').asap;

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./Scheduler":71,"./env":73,"./makePromise":75}],71:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	/**
	 * Async task scheduler
	 * @param {function} async function to schedule a single async function
	 * @constructor
	 */
	function Scheduler(async) {
		this._async = async;
		this._running = false;

		this._queue = this;
		this._queueLen = 0;
		this._afterQueue = {};
		this._afterQueueLen = 0;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._queue[this._queueLen++] = task;
		this.run();
	};

	/**
	 * Enqueue a task to run after the main task queue
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.afterQueue = function(task) {
		this._afterQueue[this._afterQueueLen++] = task;
		this.run();
	};

	Scheduler.prototype.run = function() {
		if (!this._running) {
			this._running = true;
			this._async(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, and then the after queue
	 */
	Scheduler.prototype._drain = function() {
		var i = 0;
		for (; i < this._queueLen; ++i) {
			this._queue[i].run();
			this._queue[i] = void 0;
		}

		this._queueLen = 0;
		this._running = false;

		for (i = 0; i < this._afterQueueLen; ++i) {
			this._afterQueue[i].run();
			this._afterQueue[i] = void 0;
		}

		this._afterQueueLen = 0;
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],72:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var setTimer = require('../env').setTimer;
	var format = require('../format');

	return function unhandledRejection(Promise) {

		var logError = noop;
		var logInfo = noop;
		var localConsole;

		if(typeof console !== 'undefined') {
			// Alias console to prevent things like uglify's drop_console option from
			// removing console.log/error. Unhandled rejections fall into the same
			// category as uncaught exceptions, and build tools shouldn't silence them.
			localConsole = console;
			logError = typeof localConsole.error !== 'undefined'
				? function (e) { localConsole.error(e); }
				: function (e) { localConsole.log(e); };

			logInfo = typeof localConsole.info !== 'undefined'
				? function (e) { localConsole.info(e); }
				: function (e) { localConsole.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = null;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + format.formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + format.formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(running === null) {
				running = setTimer(flush, 0);
			}
		}

		function flush() {
			running = null;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../env":73,"../format":74}],73:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global process,document,setTimeout,clearTimeout,MutationObserver,WebKitMutationObserver*/
(function(define) { 'use strict';
define(function(require) {
	/*jshint maxcomplexity:6*/

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// setTimeout, and finally vertx, since its the only env that doesn't
	// have setTimeout

	var MutationObs;
	var capturedSetTimeout = typeof setTimeout !== 'undefined' && setTimeout;

	// Default env
	var setTimer = function(f, ms) { return setTimeout(f, ms); };
	var clearTimer = function(t) { return clearTimeout(t); };
	var asap = function (f) { return capturedSetTimeout(f, 0); };

	// Detect specific env
	if (isNode()) { // Node
		asap = function (f) { return process.nextTick(f); };

	} else if (MutationObs = hasMutationObserver()) { // Modern browser
		asap = initMutationObserver(MutationObs);

	} else if (!capturedSetTimeout) { // vert.x
		var vertxRequire = require;
		var vertx = vertxRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
		asap = vertx.runOnLoop || vertx.runOnContext;
	}

	return {
		setTimer: setTimer,
		clearTimer: clearTimer,
		asap: asap
	};

	function isNode () {
		return typeof process !== 'undefined' &&
			Object.prototype.toString.call(process) === '[object process]';
	}

	function hasMutationObserver () {
	    return (typeof MutationObserver !== 'undefined' && MutationObserver) ||
			(typeof WebKitMutationObserver !== 'undefined' && WebKitMutationObserver);
	}

	function initMutationObserver(MutationObserver) {
		var scheduled;
		var node = document.createTextNode('');
		var o = new MutationObserver(run);
		o.observe(node, { characterData: true });

		function run() {
			var f = scheduled;
			scheduled = void 0;
			f();
		}

		var i = 0;
		return function (f) {
			scheduled = f;
			node.data = (i ^= 1);
		};
	}
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

}).call(this,require('_process'))
},{"_process":undefined}],74:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		formatError: formatError,
		formatObject: formatObject,
		tryStringify: tryStringify
	};

	/**
	 * Format an error into a string.  If e is an Error and has a stack property,
	 * it's returned.  Otherwise, e is formatted using formatObject, with a
	 * warning added about e not being a proper Error.
	 * @param {*} e
	 * @returns {String} formatted string, suitable for output to developers
	 */
	function formatError(e) {
		var s = typeof e === 'object' && e !== null && (e.stack || e.message) ? e.stack || e.message : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	/**
	 * Format an object, detecting "plain" objects and running them through
	 * JSON.stringify if possible.
	 * @param {Object} o
	 * @returns {string}
	 */
	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	/**
	 * Try to return the result of JSON.stringify(x).  If that fails, return
	 * defaultValue
	 * @param {*} x
	 * @param {*} defaultValue
	 * @returns {String|*} JSON.stringify(x) or defaultValue
	 */
	function tryStringify(x, defaultValue) {
		try {
			return JSON.stringify(x);
		} catch(e) {
			return defaultValue;
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],75:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;
		var emitRejection = initEmitRejection();

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {Pending}
		 */
		function init(resolver) {
			var handler = new Pending();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * @deprecated
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;
		Promise._handler = getHandler;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new Async(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new Async(new Rejected(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new Pending());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @param {function=} onProgress @deprecated progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
			var parent = this._handler;
			var state = parent.join().state();

			if ((typeof onFulfilled !== 'function' && state > 0) ||
				(typeof onRejected !== 'function' && state < 0)) {
				// Short circuit: value will not change, simply share handler
				return new this.constructor(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.chain(child, parent.receiver, onFulfilled, onRejected, onProgress);

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			return begetFrom(this._handler, this.constructor);
		};

		function begetFrom(parent, Promise) {
			var child = new Pending(parent.receiver, parent.join().context);
			return new Promise(Handler, child);
		}

		// Array combinators

		Promise.all = all;
		Promise.race = race;
		Promise._traverse = traverse;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			return traverseWith(snd, null, promises);
		}

		/**
		 * Array<Promise<X>> -> Promise<Array<f(X)>>
		 * @private
		 * @param {function} f function to apply to each promise's value
		 * @param {Array} promises array of promises
		 * @returns {Promise} promise for transformed values
		 */
		function traverse(f, promises) {
			return traverseWith(tryCatch2, f, promises);
		}

		function traverseWith(tryMap, f, promises) {
			var handler = typeof f === 'function' ? mapAt : settleAt;

			var resolver = new Pending();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			for (var i = 0, x; i < promises.length && !resolver.resolved; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				traverseAt(promises, handler, i, x, resolver);
			}

			if(pending === 0) {
				resolver.become(new Fulfilled(results));
			}

			return new Promise(Handler, resolver);

			function mapAt(i, x, resolver) {
				if(!resolver.resolved) {
					traverseAt(promises, settleAt, i, tryMap(f, x, i), resolver);
				}
			}

			function settleAt(i, x, resolver) {
				results[i] = x;
				if(--pending === 0) {
					resolver.become(new Fulfilled(results));
				}
			}
		}

		function traverseAt(promises, handler, i, x, resolver) {
			if (maybeThenable(x)) {
				var h = getHandlerMaybeThenable(x);
				var s = h.state();

				if (s === 0) {
					h.fold(handler, i, void 0, resolver);
				} else if (s > 0) {
					handler(i, h.value, resolver);
				} else {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
				}
			} else {
				handler(i, x, resolver);
			}
		}

		Promise._visitRemaining = visitRemaining;
		function visitRemaining(promises, start, handler) {
			for(var i=start; i<promises.length; ++i) {
				markAsHandled(getHandler(promises[i]), handler);
			}
		}

		function markAsHandled(h, handler) {
			if(h === handler) {
				return;
			}

			var s = h.state();
			if(s === 0) {
				h.visit(h, void 0, h._unreport);
			} else if(s < 0) {
				h._unreport();
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			if(typeof promises !== 'object' || promises === null) {
				return reject(new TypeError('non-iterable passed to race()'));
			}

			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			return promises.length === 0 ? never()
				 : promises.length === 1 ? resolve(promises[0])
				 : runRace(promises);
		}

		function runRace(promises) {
			var resolver = new Pending();
			var i, x, h;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x === void 0 && !(i in promises)) {
					continue;
				}

				h = getHandler(x);
				if(h.state() !== 0) {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
					break;
				} else {
					h.visit(resolver, resolver.resolve, resolver.reject);
				}
			}
			return new Promise(Handler, resolver);
		}

		// Promise internals
		// Below this, everything is @private

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
		}

		/**
		 * Get a handler for thenable x.
		 * NOTE: You must only call this if maybeThenable(x) == true
		 * @param {object|function|Promise} x
		 * @returns {object} handler
		 */
		function getHandlerMaybeThenable(x) {
			return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new Thenable(untrustedThen, x)
					: new Fulfilled(x);
			} catch(e) {
				return new Rejected(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.become
			= Handler.prototype.notify // deprecated
			= Handler.prototype.fail
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
			this.when({
				resolver: to,
				receiver: receiver,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
			this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
		};

		Handler.prototype.fold = function(f, z, c, to) {
			this.when(new Fold(f, z, c, to));
		};

		/**
		 * Handler that invokes fail() on any handler it becomes
		 * @constructor
		 */
		function FailIfRejected() {}

		inherit(Handler, FailIfRejected);

		FailIfRejected.prototype.become = function(h) {
			h.fail();
		};

		var failIfRejected = new FailIfRejected();

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @constructor
		 */
		function Pending(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, Pending);

		Pending.prototype._state = 0;

		Pending.prototype.resolve = function(x) {
			this.become(getHandler(x));
		};

		Pending.prototype.reject = function(x) {
			if(this.resolved) {
				return;
			}

			this.become(new Rejected(x));
		};

		Pending.prototype.join = function() {
			if (!this.resolved) {
				return this;
			}

			var h = this;

			while (h.handler !== void 0) {
				h = h.handler;
				if (h === this) {
					return this.handler = cycle();
				}
			}

			return h;
		};

		Pending.prototype.run = function() {
			var q = this.consumers;
			var handler = this.handler;
			this.handler = this.handler.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		Pending.prototype.become = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		Pending.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		/**
		 * @deprecated
		 */
		Pending.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(x, this));
			}
		};

		Pending.prototype.fail = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join().fail(c);
		};

		Pending.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		Pending.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @param {object} handler
		 * @constructor
		 */
		function Async(handler) {
			this.handler = handler;
		}

		inherit(Handler, Async);

		Async.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this));
		};

		Async.prototype._report = function(context) {
			this.join()._report(context);
		};

		Async.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function Thenable(then, thenable) {
			Pending.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(Pending, Thenable);

		/**
		 * Handler for a fulfilled promise
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function Fulfilled(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, Fulfilled);

		Fulfilled.prototype._state = 1;

		Fulfilled.prototype.fold = function(f, z, c, to) {
			runContinuation3(f, z, this, c, to);
		};

		Fulfilled.prototype.when = function(cont) {
			runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
		};

		var errorId = 0;

		/**
		 * Handler for a rejected promise
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function Rejected(x) {
			Promise.createContext(this);

			this.id = ++errorId;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, Rejected);

		Rejected.prototype._state = -1;

		Rejected.prototype.fold = function(f, z, c, to) {
			to.become(this);
		};

		Rejected.prototype.when = function(cont) {
			if(typeof cont.rejected === 'function') {
				this._unreport();
			}
			runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
		};

		Rejected.prototype._report = function(context) {
			tasks.afterQueue(new ReportTask(this, context));
		};

		Rejected.prototype._unreport = function() {
			if(this.handled) {
				return;
			}
			this.handled = true;
			tasks.afterQueue(new UnreportTask(this));
		};

		Rejected.prototype.fail = function(context) {
			this.reported = true;
			emitRejection('unhandledRejection', this);
			Promise.onFatalRejection(this, context === void 0 ? this.context : context);
		};

		function ReportTask(rejection, context) {
			this.rejection = rejection;
			this.context = context;
		}

		ReportTask.prototype.run = function() {
			if(!this.rejection.handled && !this.rejection.reported) {
				this.rejection.reported = true;
				emitRejection('unhandledRejection', this.rejection) ||
					Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
			}
		};

		function UnreportTask(rejection) {
			this.rejection = rejection;
		}

		UnreportTask.prototype.run = function() {
			if(this.rejection.reported) {
				emitRejection('rejectionHandled', this.rejection) ||
					Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
			}
		};

		// Unhandled rejection hooks
		// By default, everything is a noop

		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function cycle() {
			return new Rejected(new TypeError('Promise cycle'));
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @constructor
		 */
		function ProgressTask(value, handler) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}

			for (var c, i = 0; i < q.length; ++i) {
				c = q[i];
				runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
			}
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		/**
		 * Fold a handler value with z
		 * @constructor
		 */
		function Fold(f, z, c, to) {
			this.f = f; this.z = z; this.c = c; this.to = to;
			this.resolver = failIfRejected;
			this.receiver = this;
		}

		Fold.prototype.fulfilled = function(x) {
			this.f.call(this.c, this.z, x, this.to);
		};

		Fold.prototype.rejected = function(x) {
			this.to.reject(x);
		};

		Fold.prototype.progress = function(x) {
			this.to.notify(x);
		};

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} true iff x is a trusted Promise
		 */
		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Test just enough to rule out primitives, in order to take faster
		 * paths in some code
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function runContinuation1(f, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject(f, h.value, receiver, next);
			Promise.exitContext();
		}

		function runContinuation3(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject3(f, x, h.value, receiver, next);
			Promise.exitContext();
		}

		/**
		 * @deprecated
		 */
		function runNotify(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.notify(x);
			}

			Promise.enterContext(h);
			tryCatchReturn(f, x, receiver, next);
			Promise.exitContext();
		}

		function tryCatch2(f, a, b) {
			try {
				return f(a, b);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 */
		function tryCatchReject(f, x, thisArg, next) {
			try {
				next.become(getHandler(f.call(thisArg, x)));
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 */
		function tryCatchReject3(f, x, y, thisArg, next) {
			try {
				f.call(thisArg, x, y, next);
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * @deprecated
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 */
		function tryCatchReturn(f, x, thisArg, next) {
			try {
				next.notify(f.call(thisArg, x));
			} catch(e) {
				next.notify(e);
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function snd(x, y) {
			return y;
		}

		function noop() {}

		function hasCustomEvent() {
			if(typeof CustomEvent === 'function') {
				try {
					var ev = new CustomEvent('unhandledRejection');
					return ev instanceof CustomEvent;
				} catch (ignoredException) {}
			}
			return false;
		}

		function hasInternetExplorerCustomEvent() {
			if(typeof document !== 'undefined' && typeof document.createEvent === 'function') {
				try {
					// Try to create one event to make sure it's supported
					var ev = document.createEvent('CustomEvent');
					ev.initCustomEvent('eventType', false, true, {});
					return true;
				} catch (ignoredException) {}
			}
			return false;
		}

		function initEmitRejection() {
			/*global process, self, CustomEvent*/
			if(typeof process !== 'undefined' && process !== null
				&& typeof process.emit === 'function') {
				// Returning falsy here means to call the default
				// onPotentiallyUnhandledRejection API.  This is safe even in
				// browserify since process.emit always returns falsy in browserify:
				// https://github.com/defunctzombie/node-process/blob/master/browser.js#L40-L46
				return function(type, rejection) {
					return type === 'unhandledRejection'
						? process.emit(type, rejection.value, rejection)
						: process.emit(type, rejection);
				};
			} else if(typeof self !== 'undefined' && hasCustomEvent()) {
				return (function (self, CustomEvent) {
					return function (type, rejection) {
						var ev = new CustomEvent(type, {
							detail: {
								reason: rejection.value,
								key: rejection
							},
							bubbles: false,
							cancelable: true
						});

						return !self.dispatchEvent(ev);
					};
				}(self, CustomEvent));
			} else if(typeof self !== 'undefined' && hasInternetExplorerCustomEvent()) {
				return (function(self, document) {
					return function(type, rejection) {
						var ev = document.createEvent('CustomEvent');
						ev.initCustomEvent(type, false, true, {
							reason: rejection.value,
							key: rejection
						});

						return !self.dispatchEvent(ev);
					};
				}(self, document));
			}

			return noop;
		}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

}).call(this,require('_process'))
},{"_process":undefined}]},{},[4])(4)
});