
/**
 *  Call Forward Template
 * 
 *  This Function will forward a call to another phone number. If the call isn't answered or the line is busy, 
 *  the call is optionally forwarded to a specified URL. You can optionally restrict which calling phones 
 *  will be forwarded.
 */

exports.handler = function (context, event, callback) {
  // set-up the variables that this Function will use to forward a phone call using TwiML

  // REQUIRED - you must set this
  let phoneNumber = event.PhoneNumber || "+PUT YOUR REGULAR PHONE NUMBER HERE"; // add your phone here to receive call at    
  // OPTIONAL
  let callerId = event.CallerId || null;
  // OPTIONAL
  let timeout = event.Timeout || null;
  // OPTIONAL
  let allowedCallers = event.allowedCallers || [];

  // generate the TwiML to tell Twilio how to forward this call
  let twiml = new Twilio.twiml.VoiceResponse();

  let allowedThrough = true
  if (allowedCallers.length > 0) {
    if (allowedCallers.indexOf(event.From) === -1) {
      allowedThrough = false;
    }
  }

  let dialParams = {};
  if (callerId) {
    dialParams.callerId = callerId
  }
  if (timeout) {
    dialParams.timeout = timeout
  }

  if (allowedThrough) {
    twiml.dial(dialParams, phoneNumber);
  }
  else {
    twiml.say('Sorry, you are calling from a restricted number. Good bye.');
  }

  // return the TwiML
  callback(null, twiml);
};
