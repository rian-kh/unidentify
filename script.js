// Code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile


const params = new URLSearchParams(window.location.search);

// Checks if code was found in callback
const code = params.get("code");
const user = "user"; 
const songDiv = document.getElementById('songs');
const searchDiv = document.getElementById('search');
const profileDiv = document.getElementById('profile');

// Button function redirects
document.getElementById("apiButton").onclick = callAPI;
document.getElementById("searchButton").onclick = outputSongs;

const accessToken = await getAccessToken(user, code);
const profile = await fetchProfile(accessToken);


// Code to run after authorization (Artist finding, etc)
if (code) {

    // Write out top artist w/ genre
    const topInfo = await fetchTop(accessToken);

    // Make profile/search visible
    document.getElementById('profile').style.display = "inline";
    document.getElementById('searchBox').style.display = "inline";
    songDiv.innerHTML = "<h1>Your Artists and Genres:</h1>"

    // Show your top 50 artists with their genres
    for (let i = 0; i < topInfo.items.length; i++){
        let string = `<p>${i+1}. ${topInfo.items[i].name}, Genres: ${topInfo.items[i].genres}</p>`
        songDiv.innerHTML += string
        songDiv.innerHTML += "</p><p>&nbsp;</p>";
        
    }

  
  


    populateUI(profile);
}

// For initial access token request
function callAPI() {
    if (!code) {
        redirectToAuthCodeFlow(user); 
    } 
}

// Outputs 5 songs matching the genre specified
async function outputSongs() {
    var genreInput = document.getElementById("input").value;
    genreInput = genreInput.replace(/\s/g, "+")

    if(!code)
        return;

    const songInfo = await fetchSong(accessToken, `https://api.spotify.com/v1/search?q=tag%3Ahipster+genre%3A"${genreInput}"&type=track&market=US&limit=10`);
    console.log(songInfo)


    searchDiv.innerHTML = `<h1>Searched songs:</h1>\n<p>Genre: ${genreInput}, lowest 10% popularity:</p>`;

    for (let i = 0; i < songInfo.tracks.items.length; i++){

        let trackid = songInfo.tracks.items[i].id
        let string = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${trackid}?utm_source=generator" height="10%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>                <p>&nbsp;</p>`

        searchDiv.innerHTML += string
        searchDiv.innerHTML += "</p><p>&nbsp;</p>";
    }
    
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
    params.append("scope", "user-top-read user-read-recently-played");

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
    const result = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=50", {
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
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
}