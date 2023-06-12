
# Unidentify

A website that finds obscure songs matching the genre of your **top 50 artists on Spotify.**

![image](https://github.com/rian-kh/unidentify/assets/128095876/633cdc75-3f01-4784-b16e-0e4a7cd5344c)


# FAQ

### What are obscure songs?

Obscure songs are the songs returned from searching using **Spotify Web API**'s *tag:hipster* parameter.

Note that some songs in **popular** genres (ex. pop, rap) might not be obscure at all...


&nbsp;
&nbsp;

### Why do some of my artists not have genres?

Some artists (especially less-popular/new ones) have not had their genre tags set on Spotify. 

# Limits of the Spotify Web API
- Only the top 50 artists can be returned, nothing more.
- No way to see the amount of plays on your top artists.
- Genres are tied to the **artist**, not the specific song itself.
