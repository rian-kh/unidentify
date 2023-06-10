// Code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile


const clientId = "client-id"; 
const params = new URLSearchParams(window.location.search);

// Checks if code was found in callback
const code = params.get("code");
let authorized = false;
var div = document.getElementById('songs');

document.getElementById("apiButton").onclick = callAPI;

// Check if the access code was found on site load
if (code) {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const topInfo = await fetchTop(accessToken);



    

    for (let i = 0; i < topInfo.items.length; i++){
        console.log(i);
        console.log(topInfo.items[i].name);
        console.log(topInfo.items[i].genres);

        let string = `<p>${i+1}. ${topInfo.items[i].name}, Genres: ${topInfo.items[i].genres}</p>`
        div.innerHTML += string
        div.innerHTML += "</p><p>&nbsp;</p>";
        
    }

    populateUI(profile);
}


function callAPI() {
    if (!code) {
        redirectToAuthCodeFlow(clientId); 
    } 
}




// Redirects to Spotify authorization 
export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    
    const params = new URLSearchParams();
    params.append("client_id", clientId);
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
export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
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
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
}