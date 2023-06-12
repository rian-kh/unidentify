// Code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile



// Div constants
const params = new URLSearchParams(window.location.search);
let code = params.get("code");
const user = atob("YzNjNjQ4MDNiZTNiNGVkNWE4NGQ1MGIxODgxMjAxOTg=");
const artistDiv = document.getElementById('artists');
const artistGenreDiv = document.getElementById('artistsByGenre');
const searchDiv = document.getElementById('search');
let timeframe = document.getElementById("timeframe").value

// Button function redirects
document.getElementById("apiButton").onclick = callAPI;
document.getElementById("searchButton").onclick = outputSongs;
document.getElementById("hideButton").onclick = toggleRight;
document.getElementById("timeframe").onchange = updateTimeframe;
document.getElementById("logOutButton").onclick = logOut;

// Definition of global variables
let accessToken;
let profile;
var genreDict = {};





// Code ran on page load


// Redirects to original site if reloaded, adapted from https://stackoverflow.com/a/53307588/21809626
const pageAccessedByReload = (
    (window.performance.navigation && window.performance.navigation.type === 1) ||
    window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload')
);

if (pageAccessedByReload)
    document.location = "https://rian-kh.github.io/unidentify"


// Check if cookie containing previous access token exists,
// and auth wasn't ran
// Code is set to "a" to satisfy authorization condition
if ((document.cookie.split('accessToken=').length == 2) && !(code)) {

    accessToken = document.cookie.split('accessToken=')[1]
    code = "a"

}


// Code to run after authorization (Artist finding, etc)
if (code) {

    // Only get access token w/ auth if there is no cookie
    if (!(document.cookie.split('accessToken=').length == 2))
        accessToken = await getAccessToken(user, code);

    profile = await fetchProfile(accessToken);

    // Create cookie containing the access token for future uses
    document.cookie = `accessToken=${accessToken}; max-age=34560000;`;

    // Make profile/search visible
    populateUI(profile);
    document.getElementById('apiButton').style.display = "none";
    document.getElementById('logOutButton').style.display = "inline";
    document.getElementById('profile').style.display = "inline";
    document.getElementById('searchBox').style.display = "inline";
    document.getElementById('artists').style.display = "inline";
    document.getElementById('artistsByGenre').style.display = "inline";

    // Initial artist/genre output, with long_term as default timeframe
    updateTimeframe();
}










// Functions

// Ran on "Log out" press
// Sets the access token cookie to expire, and refreshes
function logOut() {
    document.cookie = "accessToken=; max-age=0;";
    document.location = "https://rian-kh.github.io/unidentify"
}



// Ran on "Timeframe" dropdown change
async function updateTimeframe() {

    timeframe = document.getElementById("timeframe").value;

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



// Ran on "Get spotify data" press
// Would've just put this in the .onclick redirect but you can't include parameters?
function callAPI() {
    redirectToAuthCodeFlow(user);
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



// Gets top song information
async function fetchTop(token) {
    const result = await fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeframe}&limit=50`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

// Searches for a song given genre
async function fetchSong(token, request) {
    const result = await fetch(request, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}





// From Spotify Web API Template:
// Redirects to Spotify authorization 
export async function redirectToAuthCodeFlow(user) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);


    const params = new URLSearchParams();
    params.append("client_id", user);
    params.append("response_type", "code");
    params.append("redirect_uri", "https://rian-kh.github.io/unidentify");

    // Parameters of permissions we want from the user
    params.append("scope", "user-top-read user-read-recently-played user-read-private");

    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}



// From Spotify Web API Template:
// Used for authentication
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}



// From Spotify Web API Template:
// Used for authentication
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}



// From Spotify Web API Template:
// Verifies POST request, returns access token
export async function getAccessToken(user, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", user);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "https://rian-kh.github.io/unidentify");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}



// From Spotify Web API Template:
// Gets profile information
async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}



// From Spotify Web API Template:
// Updates UI with profile data
function populateUI(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
}