# App Store listing and ASO (v1)

Everything for the App Store Connect product page of v1: Tap to Color and Trace and Color (docs/ROADMAP.md "v1 scope"). Paste the text fields as they are; every limit was counted. Last updated 2026-11-23, after the first submission was rejected under guideline 4.3 (see "Notes for App Review").

**Rule for everything below:** describe only what v1 does. Free Drawing, My Creations, Stickers and New Pictures are not in v1, so they appear nowhere in the listing (App Review guideline 2.3.1 rejects metadata that shows features the app does not have).

## Positioning
The toddler colouring space is crowded with free apps that earn from ads, subscriptions or in-app purchases. Parents search for the activity ("coloring", "toddler", "painting games"), then choose on trust and on how lovely the pictures look. So:
- **Search:** put the strongest activity words in the name and subtitle, which weigh most in App Store search, and spend the keyword field on audience and theme words.
- **Conversion:** screenshots lead with big, colourful finished pictures, then Trace and Color (the learning side parents look for, and what sets this app apart from tap-to-fill colouring books), then the paints (glitter, patterns, rainbows), and the last one closes on the parent promise: no ads, no in-app purchases, no tracking, works offline.

## English (U.S.): primary language

| Field | Text | Length |
|---|---|---|
| Name | `Little Color World: Coloring` | 28/30 |
| Subtitle | `Toddler ABC Tracing & Painting` | 30/30 |
| Keywords | `preschool,kids,alphabet,letter,number,123,learn,drawing,glitter,unicorn,dinosaur,book,pages,2,3,4,5` | 99/100 |
| Promotional text | `500 pictures to color and 72 letters, numbers and shapes to trace. Glitter, patterns and rainbow paints. No ads, no in-app purchases, no tracking.` | 146/170 |

Keyword field rules followed: commas without spaces; no word repeated from the name or subtitle (Apple already indexes those and combines words across all three fields, so "toddler" + "coloring" + "pages" also covers "toddler coloring pages"); singular forms only; no competitor or brand names (guideline 2.3.7); no "app" or "free". "Tracing", "ABC", "toddler" and "painting" are in the subtitle, so the keywords add "alphabet", "letter", "number" and "123" for the tracing searches ("alphabet tracing", "number tracing for kids"). The digits catch "2 year old games" and similar searches ("year" and "old" made way for the tracing words).

**Name:** "Little Color World" alone carries no search term. Adding ": Coloring" puts the main search word in the strongest field. If the owner prefers the bare brand, move "coloring" to the start of the subtitle ("Coloring for Toddlers & Kids", 28) and add "games,painting" to the keywords.

### Description
```
Little Color World is a calm, joyful coloring book for little hands, made for ages 2 to 5.

Tap a part of the picture and it fills with color. No lines to stay inside, no mess and no way to get it wrong, so even the youngest artists feel proud of every picture.

TRACE AND COLOR
Trace big letters, numbers and shapes with a finger: A to Z, a to z, 0 to 9, and ten shapes from circle to star. A friendly green dot shows where to start and leads the way, stroke by stroke, in the order children learn at school. There is no wrong move: off the line, the crayon simply waits. Every finished letter earns a shower of stars, then becomes a chunky picture to color in.

500 PICTURES IN 12 THEMES
Animals, Dinosaurs, Unicorns, Insects, Sea Animals, Space, Christmas, Monsters, Vehicles, Food, Flowers and Buildings. Big, friendly drawings with chunky outlines that are easy to tap.

MAGICAL PAINTS
• 69 bright colors
• Sparkly glitter
• Fun patterns: hearts, stars, stripes, dots and more
• 12 dreamy rainbow blends

TOOLS FOR LITTLE FINGERS
• Paint bucket: one tap fills a whole part
• Brush in three sizes, with paint that stays inside the lines
• Pencil for small details
• Eraser, plus undo and redo

A CHEER FOR EVERY PICTURE
Happy stars pop with every tap, and a shower of stars celebrates each finished picture.

SAVE THEIR MASTERPIECES
Tap the camera to save a picture to Photos. Unfinished pictures are saved automatically, so they can carry on later.

MADE FOR LITTLE ONES, TRUSTED BY PARENTS
• No ads
• No in-app purchases or subscriptions
• No accounts, no tracking, no data collected
• Works fully offline: perfect for car trips and flights
• Links out of the app sit behind a grown-up gate
• No reading needed

Designed for iPad.
```
(about 1,300 characters of the 4,000 allowed. The description does not affect search ranking; it is written for parents deciding to buy.)

### What's New (version 1.0)
```
Welcome to Little Color World! Trace letters, numbers and shapes, then color them in, plus 500 pictures to color in 12 themes, with glitter, patterns and rainbow paints.
```

## Spanish (Mexico): second language, also searched in the U.S.
Third-party ASO guides consistently report that the U.S. App Store also indexes the Spanish (Mexico) localization, which adds a second name, subtitle and keyword field for U.S. searches, and reaches Spanish-speaking parents. Apple does not publish this list, so treat it as likely rather than certain. Add Spanish (Mexico) as a localization in App Store Connect and fill in:

| Field | Text | Length |
|---|---|---|
| Name | `Little Color World: Colorear` | 28/30 |
| Subtitle | `Dibujos para pintar para niños` | 30/30 |
| Keywords | `pintar,dibujos,niños,niñas,bebés,juegos,infantil,libro,colores,dinosaurios,unicornio,animales,arte` | 98/100 |

The app itself is in English, so end the Spanish description with "La app está en inglés y no necesita leer." (the app needs no reading). Screenshots can stay the English ones. **Owner:** have a Spanish speaker check the wording before publishing.

## Support and privacy URLs
Both pages are in `site/` (support page `index.html`, `privacy.html`, Sunny Meadow style, no scripts or trackers). This repo is private, and GitHub Pages on a private repo needs a paid plan, so they are published from a separate **public** repo that holds only these files:

| App Store Connect field | URL (live since 2026-11-03) |
|---|---|
| Support URL | `https://shekharskamble.github.io/littlecolorworld/` |
| Privacy Policy URL | `https://shekharskamble.github.io/littlecolorworld/privacy.html` |
| Marketing URL (optional) | same as the Support URL |

To publish: on github.com create a public, empty repo named `littlecolorworld`; copy the contents of `site/` into it and push to `main`; then in that repo's Settings → Pages choose "Deploy from a branch", `main`, `/ (root)`. The pages go live within a few minutes. Edit pages here in `site/` and copy them over again, so this repo stays the source of truth. The privacy policy must change before any version that uses the network (New Pictures, Phase 5).

## Category, age rating and privacy
- **Kids:** not a category choice. In the age rating section, choose **Made for Kids**, age band **5 and under**. That puts the app in the App Store's Kids section, which is itself a trust signal for parents. The app already meets the Kids rules: no ads, no third-party analytics, and a parental gate before the one link out of the app.
- **Primary category: Education.** Parents of toddlers browse and search here, and Education's Top Paid chart is far smaller than its Top Free one, so a $0.99 app has a real chance to chart. Colouring is an accepted early-learning activity (colours, fine motor skills), so no extra claims are needed; the description stays as it is.
- **Secondary category: Entertainment.** It is honest for a creative play app and gives the app a second chart to appear in.
- **Not Games:** the Games charts are much harder to rank in, and the app has no goals or levels.
- **Age rating:** answer "None" to every content question, which gives 4+.
- **App Privacy:** "Data Not Collected". The only permission is add-only access to Photos for saving pictures, which collects nothing.
- **Price:** US$0.99 (docs/PRODUCT.md). Paid apps convert less often than free ones, so the screenshots and promotional text carry the "no ads, no purchases" promise that justifies the price.

## Screenshots: iPad 13" (2752 × 2064, landscape)
In `store/ios/ipad-13/`, in upload order. App Store Connect scales them for smaller iPads. They are real screens from the app on the iPad Pro 13-inch (M4) simulator (no mock-ups), with a headline above each, on the app's Sunny Meadow yellow. The first two or three matter most: they show in search results.

Only use pictures whose licence covers marketing (art/PROVENANCE.md). **Never show Vegetables** in screenshots or the preview video (owner decision, 2026-11-23), including the theme catalog.

| # | File | Headline | Line under it | Shows |
|---|---|---|---|---|
| 1 | 01-tap-to-color.png | Tap to color! | Big, happy pictures made for little hands | Sail Dino, coloured |
| 2 | 02-trace.png | Trace letters and numbers | ABC, abc, 123 and shapes, with a guide to follow | B half traced: dotted guide, crayon ink, the green dot leading |
| 3 | 03-themes.png | 500 pictures to color | Dinosaurs, unicorns, sea animals, space and more | Theme catalog, every cover coloured |
| 4 | 04-glitter.png | Sparkly glitter paint | Make every picture shine | Flying Unicorn, glitter paints picked |
| 5 | 05-patterns.png | Fun patterns | Hearts, stars, stripes, dots and more | Spotty Hugger, pattern paints picked |
| 6 | 06-rainbows.png | Rainbow magic | Dreamy rainbow colors in one tap | Butterfly, rainbow paints picked |
| 7 | 07-trace-color.png | Then color them in! | Every letter, number and shape becomes a picture | ABC grid, traced letters coloured with check stickers |
| 8 | 08-brush.png | Paint stays inside the lines | Brush, pencil and eraser for little fingers | Orca, brush and its sizes |
| 9 | 09-save.png | Save to Photos | Keep every masterpiece | Camera preview with ✓ |
| 10 | 10-for-parents.png | Made for ages 2 to 5 | No ads · No in-app purchases · No tracking · Works offline | Home screen with both buttons |

**2026-11-23:** 02, 07 and 10 were made new and 03 re-shot (its headline said 425); the others were renumbered. The old 07-celebrate and 09-dinosaurs are kept in `store/ios/retired/` (Apple allows 10).

Apple may read the text in screenshots for search; the headlines repeat the main search words (color, trace, letters, numbers, glitter, patterns, rainbow) for that reason too.

## App preview video: iPad 13" (1600 × 1200)
`store/ios/app-preview/app-preview-1600x1200.mp4`: 24.1 s, H.264 at a steady 30 fps, with stereo AAC audio at about 252 kbps, 48 kHz (Apple's spec: 15–30 s, at most 30 fps, stereo AAC). It is one take of real use: home → Let's Color → the coloured catalog → Dinosaurs → Baby Dino coloured part by part with rainbow paints → the last tap fills the background and the star shower plays. It shows colouring only, which is still accurate (it shows nothing the app lacks); a take that also traces a letter would show the new feature and needs taps sent to the Simulator, so it is left to the owner. Set the **poster frame** in App Store Connect to near the end (about 23 s), the finished dino in the star shower; the poster shows like a first screenshot.

**Music:** an original music-box lullaby composed in code for this video (`tools/store/music.py`): a waltz in C major at 90 bpm with a soft chord pad and a light reverb, quiet (peaks at −6 dB), fading in and out. It was written here, so there is no licence to clear. Its WAV is kept as `store/ios/app-preview/lullaby.wav`. Most people see previews muted; the music is for those who unmute.

**One edit in the video:** while recording, the iOS simulator sometimes stops redrawing in the middle of a screen fade and only finishes it at the next touch. In this take the fade from Home to the catalog stuck for 2 s. The app itself was not busy (a JavaScript heartbeat ran throughout, and each cover draws in 5–15 ms), and the same fade completes in under a second when the simulator is screenshotted instead of recorded. So those 2 s (3.3–5.3 s of the raw take) show the real, finished catalog screen (the 02-themes capture of the same state), faded in over 0.3 s. **Owner:** check that Let's Color → catalog is smooth on the iPad too.

## More ways to be seen
- **Product Page Optimization** (App Store Connect): A/B test up to three other screenshot orders or icons. First test: screenshot 1 as the hero dino against the colourful catalog.
- **Custom product pages:** for example a "Dinosaurs" page that leads with the dinosaur screenshots, for any links or Apple Search Ads.
- **Apple Search Ads:** its keyword tool shows real search popularity. Use it to check the keyword choices above, which are based on competitor listings and ASO practice, not on measured search volume.
- **Ratings:** ratings drive ranking. A Kids-category app may not show a rating prompt to children (guideline 1.3), so ask for a rating only behind the parental gate, once a Parents area exists (Phase 4 onward).
- **Updates:** each new theme is a reason to update the promotional text (no new review needed) and the What's New text.

## Notes for App Review (resubmission after the 4.3 rejection)
Paste into App Review Information → Notes, and use it to answer the reviewer's questions in Resolution Center. The parts marked **Owner** are facts only the owner can give.
```
Little Color World is a paid, offline creative-learning app for children aged 2 to 5, with no ads, accounts, purchases or data collection.

Since the last review we added Trace and Color, built from scratch for this app: children trace 72 letters (A-Z, a-z), numbers (0-9) and shapes with a finger, following school stroke order and direction, guided by a moving start dot. Our own tracing engine accepts only forward progress along the current stroke, so it teaches the motion without any failure state. Each traced item then becomes a coloring picture. All letters, numbers and shapes are generated in code by us.

The coloring engine (region fills drawn with shaders, glitter, pattern and rainbow paints, a brush that stays inside the lines, undo/redo, autosave) is also our own code, not a template or app generator.

[Owner: who you are, and that you made the app yourself, not for a client.]
[Owner: other apps on this developer account, if any.]
[Owner: beta testing done, and one or two things testers said that changed the app.]
```

## Before submitting
- [ ] **Owner:** confirm the clipart licences allow use in a paid app *and* in its marketing (art/PROVENANCE.md). The screenshots and video show this art.
- [ ] **Owner:** check that the name "Little Color World: Coloring" is free in App Store Connect (decision D9).
- [ ] Re-shoot screenshots and the video if the coloring screen changes visibly before release.

## How the screenshots and video were made
Scripts are in `tools/store/`:
1. `colors.json` lists the pictures and the colour of each part. `npx tsx tools/store/colorize.ts <out dir> tools/store/colors.json` renders a preview of each and writes `seed.json`: coloured artwork rows in the app's own save format. Small parts (spots, toes) take a darker shade of the part under them. Part names come from `npm run lcw -- page preview <id>` (the `.debug.png` labels each part).
2. The rows go into the simulator app's database (`Documents/SQLite/little-color-world.db` in the app's data container, app not running). The app then shows them as the child's unfinished pictures: covers in the catalog and theme grids, and on the coloring screen.
3. Screens are captured with `xcrun simctl io <device> screenshot` on the iPad Pro 13-inch (M4) simulator, which is natively 2752 × 2064; pictures open with the deep link `littlecolorworld://color/<pageId>`.
4. `python3 tools/store/compose.py <raw dir> <out dir>` adds the headlines and the iPad frame (captions are in the script).
5. The video is recorded with `xcrun simctl io <device> recordVideo --codec=h264` while taps are sent to the Simulator window (tap points per part from `npx tsx tools/store/points.ts <pageId>`). Check it for stuck fades: the recording only gets a frame when the screen changes, so look at still frames, not just gaps.
6. Music: `python3 tools/store/music.py <out.wav> <seconds>` (match the video's length).
7. Convert with `swiftc -O tools/store/preview.swift -o /tmp/preview && /tmp/preview make <in.mp4> <out.mp4> <start s> <end s> <music.wav> [still.png <from s> <to s>]` (no ffmpeg needed). The optional still covers a stuck fade.
