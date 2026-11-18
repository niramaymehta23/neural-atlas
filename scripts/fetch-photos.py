"""
Rebuilds public/models/photos-v1/: public-domain and CC0 photos from Wikimedia Commons (sources and
photographers in that folder's README), each cut to its middle square and made 224 x 224, the size
the picture model reads. Uses the tools in scripts/requirements-train.txt.

  .venv/bin/python scripts/fetch-photos.py
"""

import io
import time
import urllib.request
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "photos-v1"
# A plain client name: Commons asks scripts to say what they are, and nothing else is sent.
HEADERS = {"User-Agent": "sample-fetch/1.0 (educational build script)"}
PHOTOS = [
    ("cat", "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Cat_-_Flickr_-_davispuh_%284%29_%282013_photo%3B_cropped_2022%29.jpg/330px-Cat_-_Flickr_-_davispuh_%284%29_%282013_photo%3B_cropped_2022%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dog", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/A_pure_and_female_Boxer_dog_in_Iran_11.jpg/330px-A_pure_and_female_Boxer_dog_in_Iran_11.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("bananas", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/HK_food_%E6%B5%B7%E5%8D%97%E6%9C%AC%E5%9C%B0%E9%A6%99%E8%95%89_Hainan_local_yellow_banana_fruit_October_2026_N13P_01.jpg/330px-HK_food_%E6%B5%B7%E5%8D%97%E6%9C%AC%E5%9C%B0%E9%A6%99%E8%95%89_Hainan_local_yellow_banana_fruit_October_2026_N13P_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("teapot", "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Teapot_MET_DP-12307-034.jpg/330px-Teapot_MET_DP-12307-034.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("bicycle", "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Building-vintage-bike-monument_%2824325493685%29.jpg/330px-Building-vintage-bike-monument_%2824325493685%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-1", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/%27Radhe%27_the_biggest_cat_in_Worli_Fish_Market_in_Mumbai..jpg/330px-%27Radhe%27_the_biggest_cat_in_Worli_Fish_Market_in_Mumbai..jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-2", "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/A_Cheshire_Cat_-_Flickr_-_Wildlife_Terry.jpg/330px-A_Cheshire_Cat_-_Flickr_-_Wildlife_Terry.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-3", "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/A_domestic_shorthair_tortie-tabby_cat.jpg/330px-A_domestic_shorthair_tortie-tabby_cat.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-4", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/A_photograph_of_a_cat_lying_down_0002.jpg/330px-A_photograph_of_a_cat_lying_down_0002.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-5", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Black_cat_over_the_fence_2025-06-22.jpg/330px-Black_cat_over_the_fence_2025-06-22.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-6", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Cat_Queen_of_Horniman_Circle_in_Mumbai..JPG/330px-Cat_Queen_of_Horniman_Circle_in_Mumbai..JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-7", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Cat_at_Bukhansan_2015_%28cropped_2023%29.jpg/330px-Cat_at_Bukhansan_2015_%28cropped_2023%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("cats-8", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Cat_got_flash_bang.png/330px-Cat_got_flash_bang.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-1", "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/A_female_boxer_dog_in_Iran_%D9%80_Mostafa_Meraji_Canon_Photography_02.jpg/330px-A_female_boxer_dog_in_Iran_%D9%80_Mostafa_Meraji_Canon_Photography_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-2", "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/A_female_boxer_dog_in_Iran_%D9%80_Mostafa_Meraji_Canon_Photography_08.jpg/330px-A_female_boxer_dog_in_Iran_%D9%80_Mostafa_Meraji_Canon_Photography_08.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-3", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/African_wild_dog_%28portrait%29.jpg/330px-African_wild_dog_%28portrait%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-4", "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Boxer_%28dog%29_In_Iran%2C_Mostafa_Meraji_03.jpg/330px-Boxer_%28dog%29_In_Iran%2C_Mostafa_Meraji_03.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-5", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Boxer_%28dog%29_In_Iran%2C_Mostafa_Meraji_08.jpg/330px-Boxer_%28dog%29_In_Iran%2C_Mostafa_Meraji_08.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-6", "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Boxer_%28dog%29_In_Iran%2C_Mostafa_Meraji_13.jpg/330px-Boxer_%28dog%29_In_Iran%2C_Mostafa_Meraji_13.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-7", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Boxer_dog_In_Iran-_Mashhad_City-_Canon_Photography_-_Mostafa_Meraji_06.jpg/330px-Boxer_dog_In_Iran-_Mashhad_City-_Canon_Photography_-_Mostafa_Meraji_06.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("dogs-8", "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Boxer_dog_temperature_regulation%2C_Iran%2C_Mostafa_Meraji_02.jpg/330px-Boxer_dog_temperature_regulation%2C_Iran%2C_Mostafa_Meraji_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-1", "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/-365_crab_apple_blossom_%2825715755253%29.jpg/330px--365_crab_apple_blossom_%2825715755253%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-2", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Apple_blossom_08.JPG/330px-Apple_blossom_08.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-3", "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_blossoms_on_a_low_branch.jpg/330px-Apple_blossoms_on_a_low_branch.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-4", "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Blossom_%28204759447%29.jpeg/330px-Blossom_%28204759447%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-5", "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Bunches-blossom-spring_%28Unsplash%29.jpg/330px-Bunches-blossom-spring_%28Unsplash%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-6", "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Peach_Blossom%2C_Tulpa%2C_foto3.JPG/330px-Peach_Blossom%2C_Tulpa%2C_foto3.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-7", "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Copper_flower-Tongass-SS-010_%2852502640490%29.jpg/330px-Copper_flower-Tongass-SS-010_%2852502640490%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
    ("flowers-8", "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Flower_Purple_%28162060187%29.jpeg/330px-Flower_Purple_%28162060187%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail"),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, url in PHOTOS:
        body = urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60).read()
        picture = Image.open(io.BytesIO(body)).convert("RGB")
        width, height = picture.size
        side = min(width, height)
        left, top = (width - side) // 2, (height - side) // 2
        square = picture.crop((left, top, left + side, top + side)).resize((224, 224), Image.LANCZOS)
        square.save(OUT / f"{name}.jpg", quality=85, optimize=True)
        print(name)
        time.sleep(1)  # Commons limits how fast a script may ask.


if __name__ == "__main__":
    main()
