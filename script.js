// Code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile


const params = new URLSearchParams(window.location.search);

// Div constants
const code = params.get("code");
const user = "user"; 
const artistDiv = document.getElementById('artists');
const artistGenreDiv = document.getElementById('artistsByGenre');
const searchDiv = document.getElementById('search');
let timeframe = document.getElementById("timeframe").value

// Button function redirects
document.getElementById("apiButton").onclick = callAPI;
document.getElementById("searchButton").onclick = outputSongs;
document.getElementById("hideButton").onclick = hideRight;
document.getElementById("timeframe").onchange = updateTimeframe;

const accessToken = await getAccessToken(user, code);
const profile = await fetchProfile(accessToken);
var genreDict = {};

// Code to run after authorization (Artist finding, etc)
if (code) {
    // Make profile/search visible
    populateUI(profile);
    document.getElementById('apiButton').style.display = "none";
    document.getElementById('profile').style.display = "inline";
    document.getElementById('searchBox').style.display = "inline";
    document.getElementById('artists').style.display = "inline";
    document.getElementById('artistsByGenre').style.display = "inline";

    updateTimeframe();
}

    


async function updateTimeframe() {

    // This if might be redundant to be honest
    if (code) {

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
        
        for (let i = 0; i < topInfo.items.length; i++){
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
    
            if (genres.length == 0)
                genres = "N/A"
            
            listString += `<li><b>${artist}</b>, Genres: ${genres.slice(0,5)}</li>\n`  
    
        }
    
        artistDiv.innerHTML += "<ol type=\"1\">\n" + listString + "</ol>\n"

        // Output artists by each genre
        for (var key in genreDict) {
            artistGenreDiv.innerHTML += `<p>${key}:<p>\n<ul>`
    
            // Print list of artists for that genre
            for (var i = 0; i < genreDict[key].length; i++) {
                artistGenreDiv.innerHTML += `<li>${genreDict[key][i]}</li>`
            }
    
            artistGenreDiv.innerHTML += "</ul>\n<p>&nbsp;</p>";
        }

    }
}
  


    


// For initial access token request
function callAPI() {
    if (!code) {
        redirectToAuthCodeFlow(user); 
    } 
}


function hideRight() {

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

    genreInput = genreInput.replace(/\s/g, "+")

    if(!code)
        return;

    // Get 20 songs matching genre, and pick a random one to show
    const songInfo = await fetchSong(accessToken, `https://api.spotify.com/v1/search?q=tag%3Ahipster+genre%3A"${genreInput}"&type=track&market=US&limit=20&include_external=audio&market=${profile.country}`);
    let randomSong = songInfo.tracks.items[Math.floor(Math.random() * songInfo.tracks.items.length)]

    searchDiv.innerHTML = `<h1>Searched songs:</h1>\n<p>Genre: ${genreInput.replace(/\+/g, " ")}, matching artist: ${matchingArtist}, lowest 10% popularity:</p>`;

    let trackid = randomSong.id
    let string = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${trackid}?utm_source=generator" height="10%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>                <p>&nbsp;</p>`

    searchDiv.innerHTML += string
    
    
}

async function findGen(id) {
    var result = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
        method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
    });

    return await result.json()
}


// Redirects to Spotify authorization 
export async function redirectToAuthCodeFlow(user) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    
    const params = new URLSearchParams();
    params.append("client_id", user);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    
    // Parameters of permissions we want from the user
    params.append("scope", "user-top-read user-read-recently-played user-read-private");

    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Used for authentication
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Used for authentication
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Verifies POST request, returns access token
export async function getAccessToken(user, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", user);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

// Gets profile information
async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
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

// Updates UI with profile data
function populateUI(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
}