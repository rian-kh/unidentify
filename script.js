// Code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile


// Div constants
const user = "user";
const artistDiv = document.getElementById('artists');
const artistGenreDiv = document.getElementById('artistsByGenre');
const searchDiv = document.getElementById('search');
const userId = "userId"
let playlistLink;

// Button function redirects
document.getElementById("searchButton").onclick = test;
document.getElementById('playlist').onchange = updateLink;
//document.getElementById("hideButton").onclick = toggleRight;
//document.getElementById("timeframe").onchange = updateRight;


// Definition of global variables
let accessToken;
let profile;
var genreDict = {};



function updateLink() {
    playlistLink = document.getElementById('playlist').value;
}

async function test() {

    let playlistId = playlistLink.match(/(?<=\/playlist\/).*(?=[\?])|(?<=\/playlist\/).*/)

    if (playlistId == null) {
        console.log("Invalid link")
        return;
    }
    
    const result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?market=CA`, {
        method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
    });

    let value = await result.json();

    if (value.error) {
        console.log("Invalid playlist")
        return;
    }

    console.log(value)
}


// Code ran on page load

// Store access token in cookies to reduce API requests
if (document.cookie.split('accessToken=').length == 2) {
    accessToken = document.cookie.split('accessToken=')[1]
} else {
    accessToken = await getAccessToken();
    document.cookie = `accessToken=${accessToken}; max-age=3600;`
}



// Redirects to original site if reloaded, adapted from https://stackoverflow.com/a/53307588/21809626
const pageAccessedByReload = (
    (window.performance.navigation && window.performance.navigation.type === 1) ||
    window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload')
);

if (pageAccessedByReload)
    document.location = "http://localhost:5173/"





// Code to run after playlist is given (Artist finding, etc)
if (genreDict) {

    // Make profile/search visible
    document.getElementById('search').style.display = "inline";
    document.getElementById('artists').style.display = "inline";
    document.getElementById('artistsByGenre').style.display = "inline";

    // Initial artist/genre output, with long_term as default timeframe
    //updateRight();
}













// Ran on "Timeframe" dropdown change
async function updateRight() {

    

    // Reset genre dictionary and top artist/genre text
    genreDict = {};
    artistDiv.innerHTML = "";
    artistGenreDiv.innerHTML = ""

    // Hide top artists until updated (this doesnt work????)
    document.getElementById("rightSide").style.display = "none";

    // Update header for top artists
    if (timeframe == "long_term")
        document.getElementById("topArtist").innerHTML = "Top 50 Artists (All-time)";
    else if (timeframe == "medium_term")
        document.getElementById("topArtist").innerHTML = "Top 50 Artists (Last 6 months)";
    else if (timeframe == "short_term")
        document.getElementById("topArtist").innerHTML = "Top 50 Artists (Last 1 month)";

    // Show top artists if the option was already pressed
    if (document.getElementById("hideButton").value == "Hide top artists")
        document.getElementById("rightSide").style.display = "inline";


    // Show your top 50 artists with their genres
    let topInfo = await fetchTop(accessToken);
    let listString = "";

    for (let i = 0; i < topInfo.items.length; i++) {
        let genres = topInfo.items[i].genres;
        let artist = topInfo.items[i].name;


        // Adding genres/artists to genreDict
        for (var j = 0; j < genres.length; j++) {

            // Create new key for unique genres
            if (!(genres[j] in genreDict))
                genreDict[genres[j]] = [artist]

            // Add to existing genre key if the artist is not found in it
            // (Artists can have multiple genres? This might not be necessary)
            else if (!(artist in genreDict[genres[j]]))
                genreDict[genres[j]].push(artist)

        }

        // Add to artistDiv's HTML a list of each artist/genre
        if (genres.length == 0)
            genres = "N/A"

        listString += `<li><b>${artist}</b>, Genres: ${genres.slice(0, 5)}</li>\n`

    }

    artistDiv.innerHTML += "<ol type=\"1\">\n" + listString + "</ol>\n"

    // Output artists by each genre
    for (var key in genreDict) {
        artistGenreDiv.innerHTML += `<p>${key}:<p>\n<ul>`

        // Print list of artists for that genre
        for (var i = 0; i < genreDict[key].length; i++) {
            artistGenreDiv.innerHTML += `<li>${genreDict[key][i]}</li>`
        }

        // Add to artistGenreDiv's HTML a list of each artist/genre
        artistGenreDiv.innerHTML += "</ul>\n<p>&nbsp;</p>";
    }

}


// Ran on "Show/Hide top artists" press
function toggleRight() {

    if (document.getElementById("hideButton").value == "Show top artists") {
        document.getElementById("rightSide").style.display = "inline";
        document.getElementById("hideButton").value = "Hide top artists";
    } else {
        document.getElementById("rightSide").style.display = "none";
        document.getElementById("hideButton").value = "Show top artists";
    }
}


// Outputs 5 songs matching the genre specified
async function outputSongs() {

    // Random genre from dictionary, adapted from https://stackoverflow.com/questions/61042479/how-to-get-a-random-key-value-from-a-javascript-object
    // Separating keys from genreInput is just for readability
    let keys = Object.keys(genreDict);
    let genreInput = keys[Math.floor(Math.random() * keys.length)]

    let artistsOfGenre = genreDict[genreInput]
    let matchingArtist = artistsOfGenre[Math.floor(Math.random() * artistsOfGenre.length)]

    // Convert genre to URL-usable text
    genreInput = genreInput.replace(/\s/g, "+")

    // Get 20 songs matching genre, and pick a random one to show
    const songInfo = await fetchSong(accessToken, `https://api.spotify.com/v1/search?q=tag%3Ahipster+genre%3A"${genreInput}"&type=track&market=US&limit=20&include_external=audio&market=${profile.country}`);
    let randomSongID = songInfo.tracks.items[Math.floor(Math.random() * songInfo.tracks.items.length)].id

    // Display found song w/ details+ embed
    searchDiv.innerHTML = `<h1>Found a song:</h1>\n<p>Genre: <b>${genreInput.replace(/\+/g, " ")}</b>, matching your top artist: <b>${matchingArtist}</b></p>`;
    searchDiv.innerHTML += `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${randomSongID}?utm_source=generator" height="10%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>                <p>&nbsp;</p>`

}


// Searches for a song given genre
async function fetchSong(token, request) {
    const result = await fetch(request, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}




// From Spotify Web API Template:
// Verifies POST request, returns access token
export async function getAccessToken() {
    

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { 'Authorization': 'Basic ' + btoa(user + ':' + userId), "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();

    return access_token;
}





