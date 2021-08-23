#!/usr/bin/env node
'use strict';

exports.handler = (event, context, callback) => {
    // Grab Viewer Request from the event
    const request = event.Records[0].cf.request;
    // Output the request to CloudWatch
    console.log('Lambda@Edge Request: %j', request);
    const headers = request.headers;
    const groupBUri = '/blue/'

    // Name of cookie to check for. Application will be decided randomly when not present.
    const cookieExperimentA = 'X-Experiment-Name=A';
    const cookieExperimentB = 'X-Experiment-Name=B';
    let response = {
        status: '302',
        statusDescription: 'Found'
    };

    // Check for a cookie to determine if experimental group has been previously selected
    let selectedExperiment = cookieExperimentA;
    let cookiePresent = false;
    if (headers.cookie) {
        // Check for the experimental cookie and select the appropriate experiment when present.
        for (let i = 0; i < headers.cookie.length; i++) {
            if (headers.cookie[i].value.indexOf(cookieExperimentA) >= 0) {
                console.log('Experiment A cookie found');
                selectedExperiment = cookieExperimentA;
                cookiePresent = true;
                break;
            } else if (headers.cookie[i].value.indexOf(cookieExperimentB) >= 0) {
                console.log('Experiment B cookie found');
                selectedExperiment = cookieExperimentB;
                cookiePresent = true;
                break;
            }
        }
    }

    // When the cookie is not present then it needs to be set.
    if (!cookiePresent) {
        // When there is no cookie, then randomly decide which app version will be used.
        console.log('Experiment cookie has not been found. Throwing dice...');
        if (Math.random() < 0.75) {
            console.log('Experiment A chosen');
            selectedExperiment = cookieExperimentA;
        } else {
            console.log('Experiment B chosen');
            selectedExperiment = cookieExperimentB;
        }
        // Set header to appropriate experiment.
        response.headers = {
            'location': [{
                key: 'Location',
                value: selectedExperiment === cookieExperimentB ? groupBUri : '/'
            }],
            'set-cookie': [{
                key: 'Set-Cookie',
                value: selectedExperiment
            }]
        };
    } else {
        //Generate HTTP redirect response to experimental group B.
        console.log('Experiment cookie has been found. Experimental group selected: %s', selectedExperiment);
        response = request;
    }

    // Display final response in logs
    console.log("Final response: %j", response);
    callback(null, response);
};