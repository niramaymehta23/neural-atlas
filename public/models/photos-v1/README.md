# photos-v1

The sample photos of the World 4 picture lessons, used whenever the camera is not (the learner says
no, the browser blocks it, or there is none). They are public-domain or CC0 photos from Wikimedia
Commons, so they need no credit, but the photographers are named here with thanks.
`scripts/fetch-photos.py` (with `scripts/requirements-train.txt`) fetches each one, cuts it to its
middle square and makes it 224 × 224, reproducing these files byte for byte.

| File | Photographer | Licence | Source |
|---|---|---|---|
| cat.jpg | Dāvis Mosāns from Salaspils, Latvia | CC0 | https://commons.wikimedia.org/wiki/File:Cat_-_Flickr_-_davispuh_(4)_(2013_photo;_cropped_2022).jpg |
| dog.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:A_pure_and_female_Boxer_dog_in_Iran_11.jpg |
| bananas.jpg | KingHill Mount Z | CC0 | https://commons.wikimedia.org/wiki/File:HK_food_%E6%B5%B7%E5%8D%97%E6%9C%AC%E5%9C%B0%E9%A6%99%E8%95%89_Hainan_local_yellow_banana_fruit_October_2026_N13P_01.jpg |
| teapot.jpg | Chelsea porcelain factory | CC0 | https://commons.wikimedia.org/wiki/File:Teapot_MET_DP-12307-034.jpg |
| bicycle.jpg | www.Pixel.la Free Stock Photos | CC0 | https://commons.wikimedia.org/wiki/File:Building-vintage-bike-monument_(24325493685).jpg |
| cats-1.jpg | Rudolph.A.Furtado | CC0 | https://commons.wikimedia.org/wiki/File:%27Radhe%27_the_biggest_cat_in_Worli_Fish_Market_in_Mumbai..jpg |
| cats-2.jpg | Wildlife Terry | CC0 | https://commons.wikimedia.org/wiki/File:A_Cheshire_Cat_-_Flickr_-_Wildlife_Terry.jpg |
| cats-3.jpg | Leveetated | CC0 | https://commons.wikimedia.org/wiki/File:A_domestic_shorthair_tortie-tabby_cat.jpg |
| cats-4.jpg | Asabae2752 | CC0 | https://commons.wikimedia.org/wiki/File:A_photograph_of_a_cat_lying_down_0002.jpg |
| cats-5.jpg | Andy Li | CC0 | https://commons.wikimedia.org/wiki/File:Black_cat_over_the_fence_2025-06-22.jpg |
| cats-6.jpg | Rudolph.A.furtado | CC0 | https://commons.wikimedia.org/wiki/File:Cat_Queen_of_Horniman_Circle_in_Mumbai..JPG |
| cats-7.jpg | HeungSoon | CC0 | https://commons.wikimedia.org/wiki/File:Cat_at_Bukhansan_2015_(cropped_2023).jpg |
| cats-8.jpg | Tranhoangnam4320 | CC0 | https://commons.wikimedia.org/wiki/File:Cat_got_flash_bang.png |
| dogs-1.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:A_female_boxer_dog_in_Iran_%D9%80_Mostafa_Meraji_Canon_Photography_02.jpg |
| dogs-2.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:A_female_boxer_dog_in_Iran_%D9%80_Mostafa_Meraji_Canon_Photography_08.jpg |
| dogs-3.jpg | Mathias Appel | CC0 | https://commons.wikimedia.org/wiki/File:African_wild_dog_(portrait).jpg |
| dogs-4.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:Boxer_(dog)_In_Iran,_Mostafa_Meraji_03.jpg |
| dogs-5.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:Boxer_(dog)_In_Iran,_Mostafa_Meraji_08.jpg |
| dogs-6.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:Boxer_(dog)_In_Iran,_Mostafa_Meraji_13.jpg |
| dogs-7.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:Boxer_dog_In_Iran-_Mashhad_City-_Canon_Photography_-_Mostafa_Meraji_06.jpg |
| dogs-8.jpg | Mostafameraji | CC0 | https://commons.wikimedia.org/wiki/File:Boxer_dog_temperature_regulation,_Iran,_Mostafa_Meraji_02.jpg |
| flowers-1.jpg | terri_bateman | CC0 | https://commons.wikimedia.org/wiki/File:-365_crab_apple_blossom_(25715755253).jpg |
| flowers-2.jpg | Bernt Fransson | CC0 | https://commons.wikimedia.org/wiki/File:Apple_blossom_08.JPG |
| flowers-3.jpg | W.carter | CC0 | https://commons.wikimedia.org/wiki/File:Apple_blossoms_on_a_low_branch.jpg |
| flowers-4.jpg | 3ddy | CC0 | https://commons.wikimedia.org/wiki/File:Blossom_(204759447).jpeg |
| flowers-5.jpg | Joshua Reddekopp joshuaryanphoto | CC0 | https://commons.wikimedia.org/wiki/File:Bunches-blossom-spring_(Unsplash).jpg |
| flowers-6.jpg | Alf van Beem | CC0 | https://commons.wikimedia.org/wiki/File:Peach_Blossom,_Tulpa,_foto3.JPG |
| flowers-7.jpg | Forest Service Alaska Region, USDA | Public domain | https://commons.wikimedia.org/wiki/File:Copper_flower-Tongass-SS-010_(52502640490).jpg |
| flowers-8.jpg | Jason Flanagan | CC0 | https://commons.wikimedia.org/wiki/File:Flower_Purple_(162060187).jpeg |

## Checksums

CI runs `pnpm check-model`, which fails unless every file matches its SHA-256 here.

```text
51fb3d2c1a3c2bb9c8f4adf982d21229d6cc24b52d7ba04e0f3cfa9d56fee02a  bananas.jpg
689fd76c7bf65a2f77c7a2f1c56a6ba3b55035951af245b3c7d4c113a82fd19a  bicycle.jpg
b23ac075da9b25cbe4cf14a4cf3dd7ef87019ec6743fa58e0cc648dc3826951d  cat.jpg
6c999b84077fdd130c76f0233a7cbee6cad3e8fe12ac2bf2552f45fc43e40d59  cats-1.jpg
8f167a7dc63bdc8f7484e4d1fac0141474f6824571781461622503a09598dfe3  cats-2.jpg
7e9ffc7954d8681b3d01b690b57a53cd338797d38a514ac1797fcd3eb40c268d  cats-3.jpg
bf362428538aeca9489f40a6cf1b7b0833292b79f4c455120e6e0d1aec91c72b  cats-4.jpg
f85afd0f7fd6f14f715a11b50fc533fe66a7b41ebd92ebfb794ef34a7407494b  cats-5.jpg
cb254f168cb720e7e087cf9a5675d075caeadca7afe611852385e51789d49030  cats-6.jpg
eb653418503541d8263a29b9872826dcb2201cb91a9df2d70442c315b32c47f9  cats-7.jpg
6040e6b7a595375de8d162812cd120716f7aef0929f3480ba07aa87927971244  cats-8.jpg
92610a8a40875f94de0a574773c0051c83db03ac5baea669f1ff016209aa56a6  dog.jpg
b933adcc641c7ffe985c059e6c72dbd78ea5f9e72e17af42589fd09730ee547e  dogs-1.jpg
9c9b8e2f92340fcc1e20f7b267d8a4e9160b28a300f45c64c383bb65c1fb92fe  dogs-2.jpg
f3b8d861452d6641fb176ccc1e78e2fd918bf898f5f8b1a5c933270f106f750c  dogs-3.jpg
e7355d4149fd5466d0d448ea64d6b7e9010989c13189738a4fda16b62138b01f  dogs-4.jpg
eabe1fab7ae79173745443ab1072b480e1be07dd5f48d33c3ec3e19984c2045c  dogs-5.jpg
c59cc2d4e84d65a0d94a6d08efc906fd8fdbdbfdca5b840c4a923f004cfe792c  dogs-6.jpg
17fb3e1257c70d3b7fe8b072dbbcf2e2a6e2e316e093530f685c61dfe22ce234  dogs-7.jpg
49544417527af878c5d4655ff7c4f6c970acff87c755cd9c8c0277678af1a240  dogs-8.jpg
f5df801b714bb915c595d1a060e391fedd6163e37dc9737204de804efc25eeb1  flowers-1.jpg
97031ca5ee3d9743a86e6fea4eae7dbe53645ff27d7670d20d393bedc666b1d6  flowers-2.jpg
94b39a8613fcdd0cbd6f556f10ef0dea413d99e28b83d97b0066c6fc34ff6520  flowers-3.jpg
8a19f3cce72c5180daac1c1de23722f8522d8349bf90dc65d4c344be69b59ce3  flowers-4.jpg
b34f72ad39b71e85092d8b36929de4fcf870090618fb2bc18c7cce1f3e8889a3  flowers-5.jpg
30ae13fa1cd4606af9b03b803e086fd7b399a051085c18356293ec35ba9f4d8d  flowers-6.jpg
772e6470b70e3a978e580ccf949165e87c5c0645166fd403e3b2034f6ff6187e  flowers-7.jpg
9c88caa754705f8a01c4cc10eb3df12bbcb23f12ace02b4a84a7802784fb24b6  flowers-8.jpg
f67e58c78f0a5664aed972f06dbcd89e98ecd6fd594c0d08ff1172bafeac4a99  teapot.jpg
```
