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
                return addThirdPartyPaymentWorkflow(paymentSettingsClient, paymentDef);
        });
    }

    function addThirdPartyPaymentWorkflow( paymentSettingsClient, paymentDef ) {
        paymentSettingsClient.addThirdPartyPaymentWorkflow(paymentDef)
        .then(function(result) {
            return result;
        },function(err) {
            console.log("Affirm install error", err);
        });
    }

	function updateThirdPartyPaymentWorkflow(paymentSettingsClient, existingSettings) {
        var paymentDef = getPaymentDef(existingSettings);
        paymentDef.isEnabled = existingSettings.isEnabled;
        return paymentSettingsClient.deleteThirdPartyPaymentWorkflow({ "fullyQualifiedName" : paymentDef.namespace+"~"+paymentDef.name})
        .then(function(result) {
            return addThirdPartyPaymentWorkflow(paymentSettingsClient, paymentDef);
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
			},
            affirmCartAfter : function(settings) {
                settings = settings || {};
                settings.timeoutMilliseconds = settings.timeoutMilliseconds ||  30000;
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
        //console.log("route array size", _.size(customRoutes.routes));
        //Add / Update custom routes for paypal
        customRoutes = getRoutes(customRoutes, 'affirm/processor', 'affirmProcessor' );
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
    console.log('installing payment: ', context.get.nameSpace());
    return  {
        "name": paymentConstants.PAYMENTSETTINGID,
        "namespace": context.get.nameSpace(),
        "isEnabled": "false",
        "description" : "<div style='font-size:13px;font-style:italic'>Please review our <a style='color:blue;' target='mozupwahelp' href='https://docs.affirm.com/'>Help</a> documentation to configure Pay With Affirm</div>",
        "credentials":  [
                        getPaymentActionFieldDef("Environment", paymentConstants.ENVIRONMENT, "RadioButton", false,getEnvironmentVocabularyValues(), existingSettings),
                        getPaymentActionFieldDef("Public API key", paymentConstants.PUBLIC_API_KEY, "TextBox", false,null,existingSettings),
                        getPaymentActionFieldDef("Private API key", paymentConstants.PRIVATE_API_KEY, "TextBox", false,null,existingSettings),
                        getPaymentActionFieldDef("Affirm Amount Threshold", paymentConstants.THRESHOLD, "TextBox", false,null,existingSettings),
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

    function getPrivateapikeyVocabularyValues() {
        return [
            getVocabularyContent(paymentConstants.PRIVATE_API_KEY, "en-US", "Private API key"),
        ];
    }

    function getThresholdVocabularyValues() {
        return [
            getVocabularyContent(paymentConstants.THRESHOLD, "en-US", "Affirm Amount Threshold"),
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
