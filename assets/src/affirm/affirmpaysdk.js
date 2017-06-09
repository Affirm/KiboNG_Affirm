var _ 		= require("underscore");
var needle 	= require('needle');
var helper = require("./helper");

// TODO: shold we handle Payament Capture? Payment Void?

    var buildParamString = function(params, uriEncodeValues) {
        var keys = _.keys(params).sort();
        var paramStr = "";
        _.each(keys, function(key) {
            if (paramStr !== "")
                paramStr += "&";
            paramStr += key+"=";
            if (uriEncodeValues)
                paramStr += encodeURIComponent(params[key]);
            else
                paramStr += params[key];
        });
        return paramStr;
    };

module.exports = function() {
    var self = this;

    // Parse response params to get the token sent by Affirm
    self.getToken = function( context ) {
        var params = [];
        if( context.request && context.request.url ){
            params = helper.parseUrlParams( context );
        }
        return params;
    };

    self.closeOrder = function( mzOrder, affirmToken ) {
        console.log('Affirm Need closeOrder?');
    };

    // call affirm charges to capture the payment
    self.capturePayment = function( params, config ) {
        var options = {
                json: true,
                headers: { 'Authorization':'Basic ' + config.apikeypair }
        };

        var promise = new Promise( function(resolve, reject) {
			needle.post( 'https://sandbox.affirm.com/api/v2/charges',
                params, options,
				function(err, response, body){
					if (response.statusCode != 200)
						reject(response.body);
					else {
						resolve( body );
					}
				}
			);
		});
		return promise;
	};

    self.executeRequest = function( action, params ) {
        console.log('executeRequest');

        return true;


        /*
        params = sortParams(params);
        //sign the request
        var stringToSign = "POST";
        stringToSign += "\n";
        stringToSign += self.config.server;
        stringToSign += "\n";
        stringToSign += self.config.path;
        stringToSign += "\n";
        stringToSign += buildParamString(params, true);
        console.log("AWS Params to Sign", stringToSign);
        var signature = crypto.createHmac("sha256", self.config.mwsSecret).update(stringToSign).digest("base64");
        console.log("Aws Signature",signature);
        params.Signature = encodeURIComponent(signature);


        var promise = new Promise(function(resolve, reject) {
            needle.post( "https://"+self.config.server+self.config.path,
            buildParamString(params, false),
            {json: false, parse: true, open_timeout: 60000},
            function(err, response, body) {
                if (response.statusCode != 200)
                    reject(parseErrorToJson(response.body));
                else {
                    resolve(body);
                }
            });
        });
        return promise;
        */
    };


    self.configure = function(config) {
		console.log('Affirm Need Config?');
        /*
        self.config = config;
		self.config.profileEnvt = config.isSandbox ? "api.sandbox" : "api";
		path = config.isSandbox ? '/OffAmazonPayments_Sandbox' : '/OffAmazonPayments';
		self.config.path = path + "/" + version;
		self.config.server = mwsServiceUrls[regionMappings[config.region]];
		self.captureOnAuthorize = config.captureOnAuthorize;
        */
	};

	self.executeRequest = function(action, params) {
		console.log('executeRequest');
		//add timestamp
		/*var utcTime = moment.utc();

		params = _.extendOwn(params, getBaseParams(action, self.config));
		params.Timestamp = utcTime.format('YYYY-MM-DDTHH:mm:ss')+"Z";

		params = sortParams(params);
		//sign the request
		var stringToSign = "POST";
		stringToSign += "\n";
		stringToSign += self.config.server;
		stringToSign += "\n";
		stringToSign += self.config.path;
		stringToSign += "\n";
		stringToSign += buildParamString(params, true);
		console.log("AWS Params to Sign", stringToSign);
		var signature = crypto.createHmac("sha256", self.config.mwsSecret).update(stringToSign).digest("base64");
		console.log("Aws Signature",signature);
		params.Signature = encodeURIComponent(signature);


		var promise = new Promise(function(resolve, reject) {
			needle.post("https://"+self.config.server+self.config.path,
			buildParamString(params, false),
			{json: false, parse: true, open_timeout: 60000},
			function(err, response, body) {
				if (response.statusCode != 200)
					reject(parseErrorToJson(response.body));
				else {
					resolve(body);
				}
			});
		});
		return promise;
        */
	};

/*
	self.validateToken = function(access_token) {
		console.log('validateToken', access_token);
		var promise = new Promise(function(resolve, reject){
			self.getProfile(access_token).then(function(data) {
					resolve(true);
				}, function(err) {
					console.error("Validate token error", err);
					resolve(false);
				}
			);
		});
		return promise;
	};

	self.getProfile = function(access_token) {
		//access_token = encodeURIComponent(access_token);
		var promise = new Promise(function(resolve, reject) {
      console.log('get profile to validate access token');

			needle.get("https://"+self.config.profileEnvt+"."+profileEndpointUrls[self.config.region]+"/user/profile",{ headers: {'Authorization':'bearer '+access_token}},
				function(err, response, body){
					if (response.statusCode != 200)
						reject(response.body);
					else {
						resolve(body);
					}
				}
			);
		});
		return promise;
	};

	self.getOrderDetails = function(orderReferenceId, addressConsentToken) {
		var params = {};
		params.AmazonOrderReferenceId = orderReferenceId;
		if (addressConsentToken)
			params.AddressConsentToken = addressConsentToken;

		return executeRequest("GetOrderReferenceDetails", params);
	};

	self.setOrderDetails = function(orderReferenceId, orderDetails) {
		var params = {};
		params.AmazonOrderReferenceId = orderReferenceId;

		params['OrderReferenceAttributes.OrderTotal.Amount']=orderDetails.amount;
		params['OrderReferenceAttributes.OrderTotal.CurrencyCode']= orderDetails.currencyCode;
		params['OrderReferenceAttributes.SellerOrderAttributes.SellerOrderId']=orderDetails.orderNumber;
		params['OrderReferenceAttributes.SellerOrderAttributes.StoreName']=orderDetails.websiteName;
		console.log("Setting AWS order orderDetails", params);
		return executeRequest("SetOrderReferenceDetails", params);
	};
*/
	self.confirmOrder = function(orderReferenceId) {
		var params = {};
		params.AffirmOrderReferenceId = orderReferenceId;
		console.log("Confirming Affirm Order", params);
		return executeRequest("ConfirmOrderReference", params);
	};
/*
	self.requestAuthorzation = function(orderReferenceId, amount, currencyCode, authorizationReferenceId,captureOnAuthorize, declineAuth) {
		var params = {};
		params.AmazonOrderReferenceId = orderReferenceId;
		params['AuthorizationAmount.Amount'] = amount;
		params['AuthorizationAmount.CurrencyCode'] = currencyCode;
		params.AuthorizationReferenceId = authorizationReferenceId;
		if (captureOnAuthorize)
			params.CaptureNow = true;
		params.TransactionTimeout = 0;

		if (declineAuth)
			params.SellerAuthorizationNote = '{"SandboxSimulation": {"State":"Declined", "ReasonCode":"InvalidPaymentMethod", "PaymentMethodUpdateTimeInMins":5}}';

		console.log("Requesting AWS Authorization", params);
		return executeRequest("Authorize", params);
	};

	self.captureAmount = function(amazonAuthorizationId, orderDetails, authorizationReferenceId,declineCapture) {
		var params = {};
		params.AmazonAuthorizationId = amazonAuthorizationId;
		params['CaptureAmount.Amount']= orderDetails.captureAmount;
		params['CaptureAmount.CurrencyCode']=orderDetails.currencyCode;
		params.CaptureReferenceId=authorizationReferenceId;
		if (orderDetails.SellerCaptureNote)
			params.SellerCaptureNote=orderDetails.sellerCaptureNote;
		params['OrderReferenceAttributes.OrderTotal.Amount']=orderDetails.requestedAmount;
		params['OrderReferenceAttributes.OrderTotal.CurrencyCode']=orderDetails.currencyCode;
		params['OrderReferenceAttributes.SellerOrderAttributes.SellerOrderId']=orderDetails.orderNumber;
		params['OrderReferenceAttributes.SellerOrderAttributes.StoreName']=orderDetails.websiteName;
		params.TransactionTimeout = 0;

		if (declineCapture)
			params.SellerCaptureNote = '{"SandboxSimulation": {"State":"Declined", "ReasonCode":"AmazonRejected"}}';

		console.log("Requesting AWS Capture", params);
		return executeRequest("Capture", params);
	};

	self.cancelOrder = function(orderReferenceId) {
		var params = {};
		params.AmazonOrderReferenceId = orderReferenceId;
		return executeRequest("CancelOrderReference", params);
	};

	self.closeOrder = function(orderReferenceId) {
		var params = {};
		params.AmazonOrderReferenceId = orderReferenceId;
		return executeRequest("CloseOrderReference", params);
	};

	self.refund = function(captureId, refund, websiteName) {
		var params = {};
		params.AmazonCaptureId = captureId;
		params['RefundAmount.Amount'] = refund.amount;
		params['RefundAmount.CurrencyCode'] = refund.currencyCode;
		params.RefundReferenceId = refund.id;
		params['OrderReferenceAttributes.SellerOrderAttributes.StoreName'] = websiteName;
		params['OrderReferenceAttributes.SellerOrderAttributes.SellerOrderId'] = refund.orderNumber;
		if (refund.note)
			params.SellerRefundNote = refund.note;
		console.log("AWS refund params", params);
		return executeRequest("Refund", params);
	};
    */
	return self;
};
