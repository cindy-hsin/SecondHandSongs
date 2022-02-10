// information to reach API
const url = 'https://secondhandsongs.com/search/performance?';
// Look for the song 'Lucky', sung by 'Jason Mraz'
const songTitle =  'lucky';
const artistName = 'jason%20mraz';
const queryString = 'op_title=contains&' + `title=${songTitle}&` + 
'op_performer=contains&' +  `performer=${artistName}`; 

// op_title and op_performer are types of relations that defines the search
// op_title has 3 values: contains, starts with, equals;
// op_performer has 4 values: contains, equals, is set, is not set; 
// See example: https://secondhandsongs.com/search/performance?display=title.performer&op_title=contains&title=lucky&op_performer=contains&performer=jason%20mraz&sort=simplifiedTitle


// Selecting the submit buttom on the page
const submit = document.querySelector('#submit');

// AJAX function
const getSuggestions = async () => {
  const endpoint = url + queryString;
  console.log("Query Endpoint:", endpoint); 
  const option = {
    method: 'GET',
    // mode: 'no-cors',   // try comment this out! 
    headers: {
      'Accept': 'application/json'
    }
  };

  try{
    console.log("before fetch");
    const response =  await fetch(endpoint, option);
    console.log("after fetch")
    console.log("Print response.ok:", response.ok);
    if(response.ok){
      let jsonResponse = await response.json();
      console.log(jsonResponse);
    }
  }
  catch(error){
    console.log(error);
  }
}

// display results to console
const displaySuggestions = (event) => {
  event.preventDefault();
  getSuggestions();
}

submit.addEventListener('click', displaySuggestions);

