var express = require('express');
var app = express();
var model = require('./model.js');
var paypal = require('paypal-rest-sdk');
var bodyParser = require('body-parser');
var uid;

paypal.configure({
    'mode': process.env.PAYPAL_MODE, //sandbox or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_CLIENT_SECRET
});

app.use(bodyParser.json());

//tells the server to look into the /public folder for the static content
app.use(express.static(__dirname + '/public'));

//Creates the plans based on what is defined in model.js. 
app.get('/payment/create-plan', function (req, res) {
    var plans = Object.keys(model.plans);
    for(var i = 0; i < plans.length; i++){
        //goes through each of the plans defined in model.js
        var plan = model.plans[plans[i]];
        
        paypal.billingPlan.create(plan, function(error, billingPlan){

            //creates the plan
            if(error){
                res.json({'status':'error1'});
                throw error;
            }
            //activates the plan
            paypal.billingPlan.update(billingPlan.id, model.activatePlan, function(error, response){
                
                if(error){
                    res.json({'status':'error2'});
                    throw error;
                }
                var plan = "";
                
                //sets the plan id based on the plan name sent to PayPal
                if(billingPlan.name == "Regular Plan"){
                    plan = "3000";
                }
                else{
                    plan = "6500";
                }
                
                //stores the PayPal Plan ID to your plan id mapping in Firebase
                model.firebase.child('/plans').child('/' + plan).set({'id': billingPlan.id});
                res.json({'status':'plansuccess'});
            });
        });
    }
    res.json({'status':'success'});
})

//initiate payment for a plan id
app.get('/payment/initiate/:planId', function (req, res) {
    // TODO: initiate a session with the users, with an id to identify the user
    var planId = req.params.planId;
    model.firebase.child('/plans').on('value', function(plans){
        //gets all the plans from Firebase
        plans = plans.val();
        var data; 
            //if the plan exists, create a BillingAgreement payload using the planid that is passed in
        model.firebase.child("users").child(uid).on("value", function(snapData) {
            data = snapData.val();
            model.address.line1 = data.Address1;
            model.address.line2 = data.Address2;
            model.address.city = data.City;
            model.address.state = data.State;
            model.address.postal_code = data.Postal;
            model.address.country_code = data.CountryCode;

        //checks if the plan exists in Firebase
        if(plans[planId]){
            //if the plan exists, create a BillingAgreement payload using the planid that is passed in
            var billingAgreement = model.createAgreementData(planId, plans[planId].id, model.address);
            paypal.billingAgreement.create(billingAgreement, function(error, agreement){
                //creates the billing agreement
                if(error){
                    throw error;
                }
                //if creating the billing agreement is successful, find the approval url and redirect the user to it
                for(var i = 0; i < agreement.links.length; i++){
                    if(agreement.links[i].rel == 'approval_url'){
                        res.redirect(agreement.links[i].href);
                        return;
                    }
                }
                //if approval_url is not found, throw an error
                res.json({'status': 'failed'});
                throw "approval_url not found";
            });
        }
        else{
            //return failed if plan is not found
            res.json({'status': 'failed', 'desc': 'plan not found'});
        }
        });
    });
});

//execute payment for plan. this endpoint is called when the user has paided via PayPal
app.get('/payment/execute/', function (req, res) {
    // TODO: using information in the session, and agreement ID, store the information in Firebase
    //checks if there is a token
    if(req.query.token){
        //starts the billingAgreement and collects the money
        paypal.billingAgreement.execute(req.query.token, {}, function(error, agreement){
            if(error){
                throw error;
            }
            else{
                res.json({'status':'success', 'data': agreement});
            }
        });
    }
    else{
        res.json({'status':'failed'})
    }
})

app.post('/login', function(req, res) {
    uid = req.body.uid;
    res.set('Content-Type', 'application/json'); // tell Angular that this is JSON
    res.send(JSON.stringify({success: 'success'}));
})

//cancels a specific agreement
app.get('/payment/cancel/:agreementId', function(req, res){
    var cancel_note = {'note':'cancel'};
    //does the actual cancel but returns only a http response code 204 if successful
    paypal.billingAgreement.cancel(req.params.agreementId, cancel_note, function (error, response) {
        if (error) {
            throw error;
        } 
        else {
            //check to see if it is really cancelled
            paypal.billingAgreement.get(req.params.agreementId, function(error, agreement){
                if(error){
                    throw error;
                }
                //if cancelled, agreement.state == "Cancelled"
                res.json({'status':'success', 'data': agreement});
            });
        }
    });
})

var server = app.listen(process.env.PORT || 3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('app listening at %s:%s', host, port);
})