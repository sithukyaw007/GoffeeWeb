var firebase = require('firebase');

var return_url = process.env.APP_BASE_URL + process.env.APP_PAYPAL_SUCCESS_CALLBACK;
var cancel_url = process.env.APP_BASE_URL + process.env.APP_PAYPAL_CANCEL_CALLBACK;

//create a firebase connection
var firebaseRef = new firebase(process.env.FIREBASE_URL);

//authenticate with firebase server
firebaseRef.authWithCustomToken(process.env.FIREBASE_TOKEN, function(error, authData){
    if(error){
        throw "Firebase Auth Failed for server!";
    }
});

//model object
module.exports = {
    'firebase': firebaseRef,
    'plans': {
        //defines the plans that are available
        "3000": {
            "description": "Regular Plan",
            "merchant_preferences": {
                "auto_bill_amount": "yes",
                "cancel_url": cancel_url,
                "initial_fail_amount_action": "continue",
                "max_fail_attempts": "1",
                "return_url": return_url,
                "setup_fee": {
                    "currency": "SGD",
                    "value": "0"
                }
            },
            "name": "Regular Plan",
            "payment_definitions": [
                {
                    "amount": {
                        "currency": "SGD",
                        "value": "29.99"
                    },
                    "cycles": "0",
                    "frequency": "MONTH",
                    "frequency_interval": "1",
                    "name": "Regular 1",
                    "type": "REGULAR"
                },
                {
                    "amount": {
                        "currency": "SGD",
                        "value": "30.00"
                    },
                    "cycles": "1",
                    "frequency": "MONTH",
                    "frequency_interval": "1",
                    "name": "Trial 1",
                    "type": "TRIAL"
                }
            ],
            "type": "INFINITE"
        },
        '6500': {
            "description": "Premium Plan",
            "merchant_preferences": {
                "auto_bill_amount": "yes",
                "cancel_url": cancel_url,
                "initial_fail_amount_action": "continue",
                "max_fail_attempts": "1",
                "return_url": return_url,
                "setup_fee": {
                    "currency": "SGD",
                    "value": "0"
                }
            },
            "name": "Premium Plan",
            "payment_definitions": [
                {
                    "amount": {
                        "currency": "SGD",
                        "value": "59.99"
                    },
                    "cycles": "0",
                    "frequency": "MONTH",
                    "frequency_interval": "1",
                    "name": "Premium 1",
                    "type": "REGULAR"
                },
                {
                    "amount": {
                        "currency": "SGD",
                        "value": "65.00"
                    },
                    "cycles": "1",
                    "frequency": "MONTH",
                    "frequency_interval": "1",
                    "name": "Trial 2",
                    "type": "TRIAL"
                }
            ],
            "type": "INFINITE"
        }  
    },
    //defines the data required to activate the plan
    'activatePlan':[{
        "op": "replace",
        "path": '/',
        "value": {
            "state": "ACTIVE"
        }
    }],
    //creates billing agreement data based on the tier and address
    'createAgreementData': function(tier, planId, address){
        return {
            "name": tier == '3000'? "Regular Plan": "Premium Plan",
            "description": tier == '3000'? "Regular Plan": "Premium Plan",
            "start_date": getStartDate(),
            "plan":{
                "id": planId
            },
            "payer": {
                "payment_method": "paypal"
            },
            "shipping_address":{
                "line1": address["line1"] ? address["line1"]:"",
                "line2": address["line2"] ? address["line2"]:"",
                "city": address["city"] ? address["city"]:"",
                "state": address["state"] ? address["state"]:"",
                "postal_code": address["postal_code"] ? address["postal_code"]:"",
                "country_code": address["country_code"] ? address["country_code"]:"",
            }
        }
    },
    //sample address
    'address':{
        'line1': '',
        'line2': '',
        'city': '',
        'state': '',
        'postal_code': '',
        'country_code': ''
     }
}

//utlity functions to make generating the start date above easier
function PadZeros(value, desiredStringLength){
    var num = value + "";
    while (num.length < desiredStringLength){
        num = "0" + num;
    }
    return num;
}

function toIsoString(d){
    return d.getUTCFullYear() + '-' + PadZeros(d.getUTCMonth() + 1, 2) + '-' + PadZeros(d.getUTCDate(), 2) + 'T' + PadZeros(d.getUTCHours(), 2) + ':' + PadZeros(d.getUTCMinutes(), 2) + ':' + PadZeros(d.getUTCSeconds(), 2) + 'Z';
}

function getStartDate(){
    var start_date = new Date();
    start_date.setMinutes(start_date.getMinutes() + 5);
    return toIsoString(start_date);
}