// Returns the createApplication function in express.js
const express = require('express'); // NOTE: "express" here is NOT a relative direcoty! It's a module name!
									// REF: How does Node.js and require() look for modules? 
									// https://www.bennadel.com/blog/2169-where-does-node-js-and-require-look-for-modules.htm

const app = express();				// Instantiate an Express application.
// const api_helper = require('./api_helper');
const axios = require('axios');


// Information to reach API
const url = 'https://secondhandsongs.com/search/performance?';
// Look for the song 'Lucky', sung by 'Jason Mraz'
const songTitle =  'lucky';
const artistName = 'jason%20mraz';
const queryString = 'op_title=contains&' + `title=${songTitle}&` + 
'op_performer=contains&' +  `performer=${artistName}`; 
const endpoint = url + queryString;



// Functions to call API
async function requestDataWriteToCsv() {
  const coverUriSequence = await getCoverUriSequence();
  console.log(typeof(coverUriSequence));

  for (let coverUri of coverUriSequence) {
    const youtubeUri = await getSingleCoverYoutubeUri(coverUri);
    console.log("**** Youtube Uri:", youtubeUri);
    // TODO: write each youtubeUri into CSV. (CSV table/Database Table to be designed(i.e. What columns does the DB table contain? 

  }
}


async function getCoverUriSequence() {
  let trackUri;
  try {
    const queryResponse = await axios.get(endpoint, {headers: {'Accept': 'application/json'}});
    const queryResponseData = queryResponse.data;
    console.log("**** Query response Data:", queryResponseData);
   
    trackUri = (queryResponseData.resultPage)[0].uri;
    console.log("**** Track uri", trackUri);
  
  } catch(err) {
    console.log(err);
  }

  let coverUriSequence;
  try {
    const trackResponse = await axios.get(trackUri, {headers: {'Accept': 'application/json'}});
    const trackResponseData = trackResponse.data;
    // console.log("**** Track response Data:", trackResponseData);
    
    coverUriSequence = trackResponseData.covers.map(coverObj => coverObj.uri);
    
    console.log("**** Cover Uri List:", coverUriSequence);
  } catch(err) {
    console.log(err);
  }
  
  
  return coverUriSequence;
}


async function getSingleCoverYoutubeUri(coverUri) {
  let youtubeUri;
  try {
    const coverResponse = await axios.get(coverUri, {headers: {'Accept': 'application/json'}});
    const coverResponseData = coverResponse.data;
    // console.log("**** Cover response Data:", coverResponseData);
    
    youtubeUri = (coverResponseData.external_uri).map(obj=>obj.uri);
    // console.log("**** Youtube Uri:", youtubeUri);
    // console.log(youtubeUri[0] !== undefined);

  } catch(err) {
    console.log(err);
  }
  if (youtubeUri[0] !== undefined) {return youtubeUri[0];}
  return null;
}



requestDataWriteToCsv();


// coverUriList.forEach((coverUri) => getSingleCoverExternalUri(coverUri));



// axios.get(endpoint, {headers: {'Accept': 'application/json'}})
//   .then(response => console.log(response.data))
//   .catch(error => console.log(error));




//Create a new route in express called /getAPIResponse. 
// This route will make a REST API call and return the response as JSON.


// async function getAPIResponseHandler(req, res) {
//   let result;
//   try {
//     result = await api_helper.make_API_call(endpoint);
//   } catch(error) {
//     console.log("1st API call:", error);
//     return;
//   }
//   console.log("1st API call succeeded!");
  
  

  // res.json(result);
  // let jsonResult;
  // try {
  //   jsonResult = await res.json(result);
  //   console.log("jsonResult:", jsonResult);
  // } catch(error) {
  //   console.log("Jsonfy 1st call's result:", error);
  //   return;
  // }

  // const trackUrl = jsonResult.resultPage;
  // console.log("trackUrl: ", trackUrl);
  // let trackResult;
  // try {
  //   trackResult = await api_helper.make_API_call(trackUrl);
  // } catch(error) {
  //   console.log("2nd API call:", error);
  //   return;
  // }

  // let jsonTrackResult;
  // try{
  //   jsonTrackResult = await res.json(trackResult);
  // } catch(error) {
  //   console.log("Jsonfy 2nd call's result:", error);
  //   return;
  // }

// }

// app.get('/getAPIResponse', getAPIResponseHandler);
// app.get('/getAPIResponse', (req, res) => {
//   // API code will be here
//   api_helper.make_API_call(endpoint)
//   .then(response => {
//     return new Promise((resolve, reject)=>{resolve(res.json(response))});
    
//     // const trackUrl = jsonResult.resultPage[0].uri;
//     // res.send('jsonResult: ',jsonResult);
//     // return new Promise((resolve,reject) => {
//     //   resolve(trackData);
//     // })       
//   })
//   .then(response => {
//     res.send(response);
//     // console.log(response);
//   })
//   .catch(error => {
//     res.send(error)
//   })
// })


app.listen(3000, ()=>{console.log('App started on port 3000');});