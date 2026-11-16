# Neural Atlas — Product Spec

2026-10-29 · @Niramay Mehta

Neural Atlas is an interactive world where non-coders build intuition for all of AI, from a single neuron to GPT and RL agents, by touching it rather than reading about it.

## At a glance

[embedded content: the six worlds · 74 modules]

Foundations unlock everything; your own network carries through Worlds 3 and 4 into transformers, while RL joins them through RLHF.

## Vision and audience

The reader is a non-coder who wants to *feel* why AI works: no code, no notation walls, maths shown only as moving pictures. Every concept is something you can grab, drag, break and replay.

**What it must feel like**

- **Alive.** Nothing on screen is static. Idle scenes breathe gently; nothing flashes or loops just for show.

- **Instant.** Every slider, drag and click changes the model in under 16 ms. Training runs live in the browser, never behind a loading spinner.

- **Beautiful but calm****.** Soft colour, gentle motion and paper-like layers, where every effect means something: a thicker line is a stronger connection, a warmer colour is a bigger mistake.

- **One world.** The same little network and dataset grow from a single neuron into a CNN, a transformer and an RL agent, so the learner never starts over.

**Headline**** features** (the first six of many; the full feature library and every module's own interactions follow below)

1. **Loss landscape you walk on.** A 3D terrain with SGD, momentum and Adam as racing balls; push the learning rate and watch one launch off the map.
2. **Break-it mode.** Each module ships a working model plus a mission ("make it overfit", "kill the gradients", "make the agent cheat").
3. **Draw-your-own-data.** Paint points onto a canvas and the decision boundary morphs live as the network trains.
4. **Attention as threads.** Type a sentence; glowing threads link tokens by attention weight. Drag a token and the threads re-route.
5. **RL gridworld with a visible brain.** The agent explores while a value heatmap fills in beneath it; paint walls and rewards mid-training and it re-plans.
6. **Concept map as navigation.** Home is a living constellation of concepts that light up as you master them; the map *is* the progress system.

## Design language

The look is warm, calm and friendly, inspired by Claude's design language: soft paper tones, a single warm clay accent, an elegant serif for headlines and gentle, hand-made feeling illustrations. It should feel like a beautifully designed book that moves, not a dashboard.

| Element | Direction |
| --- | --- |
| Background | Warm ivory #FAF9F5 by default; a soft charcoal #1F1E1D night mode |
| Ink | Deep warm black #141413 for text; warm grey #87867F for secondary text |
| Accent | One clay orange #D97757 for whatever you can touch or should look at next. Used sparingly so it always means "here" |
| Meaning colours | Muted, never neon: sage #7A9E7E = good / going up, rose #C4646B = bad / going down, sky #6A9BCC = information flowing, sand #E3DACC = surfaces and cards |
| Type | Headlines in a warm serif (Fraunces or Source Serif 4, free stand-ins for Claude's serif); body in a clean sans (Inter or Geist); numbers rarely shown, and in a friendly rounded weight when they are |
| Surfaces | Flat paper cards with 16px rounded corners and a hairline warm border; soft, low shadows only on things being dragged |
| Illustration | Soft 2D shapes with slightly organic edges, like cut paper: dots, blobs, threads and little characters (a robot learner, a dog for RL). No stock icons, no sci-fi glow |
| Motion | Gentle springs; things settle rather than snap. Ideas build step by step like a storyteller drawing on a page. Nothing loops just to look busy |
| Sound (optional, off by default) | Soft wooden clicks and a warm chime when something is learned |

**2D or 3D?** Mostly 2D, with depth only where depth *is* the idea. 3D you have to rotate confuses beginners, breaks on phones and makes text harder to read; flat, layered 2D ("2.5D" with subtle shadows and parallax) keeps everything clear.

| Use 3D | Keep 2D |
| --- | --- |
| The home map of ideas (gently floating, never needs rotating) | Every lesson's main canvas |
| "Rolling downhill" landscape for learning | Networks, boundaries, charts, text and tokens |
| Flying through "idea space" (latent spaces, word galaxy) | RL worlds (drawn as a cosy board game, not a 3D level) |

**Plain-language rules** (the most important rules in this doc)

1. **Story first, name last.** Every lesson starts with an everyday situation (sorting fruit, a dog learning tricks, guessing the next word in a text). The real term appears only at the end, as a small tag: "You just did *gradient descent*".
2. **No jargon in titles, buttons or missions.** "How big a step" not "learning rate"; "How curious" not "epsilon".
3. **No formulas by default.** The maths view exists only as a hidden "peek under the hood" drawer for the curious.
4. **No raw numbers unless they mean something to a person.** Show "98 out of 100 right" not "0.98 accuracy".
5. **One idea per screen.** If a screen needs two captions, it is two screens.
6. **The 12-year-old test.** Every caption is checked with Gemini against "would a smart 12-year-old follow this?" before shipping.

**Rule of thumb:** if an effect does not explain something or confirm an action, cut it. Calm beats flashy.

## Interaction system

Every module is built from the same eight mechanics, so once a learner knows them they can explore anything.

1. **Touch first, read second.** A module opens on a live, manipulable object. A one-line caption appears only after the first interaction, explaining what they just felt.
2. **Predict, then reveal.** Before key moments the learner sketches or picks what they expect (draw the loss curve, guess which token gets attention). Their guess is overlaid on the real result.
3. **Every ****setting**** is a handle.** Settings are friendly dials and sliders with plain names ("how big a step", "how curious"), sitting right next to the thing they change. No settings forms.
4. **Time scrubber.** Training is recorded. A timeline at the bottom lets you rewind, pause at any epoch and step frame by frame, like a video editor.
5. **Semantic zoom.** Pinch or scroll to move between levels: the whole model → a layer → one neuron → the multiply-and-add inside it. Same canvas, smooth camera.
6. **Inspect on hover.** Hovering anything shows a small paper card saying, in one plain sentence, what it is and what it is doing right now.
7. **Compare split.** Drag a divider to run two settings side by side (ReLU vs sigmoid, with vs without dropout), synced to the same timeline.
8. **Break-it missions.** A mission card in the corner sets a goal; success triggers a short replay showing *why* it broke.

**Navigation**

- **Home = the constellation.** Concepts are stars, grouped into six galaxies (worlds). Edges show prerequisites. Mastered stars glow mint; the next suggested star pulses softly.

- **Flying between modules** is a camera move across the constellation, keeping the shared model visible during the transition.

- **Command palette** (Cmd/Ctrl+K) to jump to any concept by name.

- **P****eek under the hood** (a drawer, closed by default) per module: *Intuition* (default, pictures only) → *Mechanics* (labelled numbers) → *Maths* (formulas animating in sync with the visual).

**Responsiveness**

- Desktop is the hero experience; tablet is fully supported with touch gestures; phone gets a vertical, card-by-card version of each module with the same live models.

- Respect reduced-motion settings: particles become static gradients, camera moves become cross-fades.

## Feature library

Beyond the six headline features, these are the experiences that make the site feel endless. Each is a reusable component that several modules plug into.

**Building and training**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Model LEGO | Snap layers together like bricks (dense, conv, attention, dropout); the model trains live as you build | Architecture is just composable blocks |
| Weights on strings | Each weight is a glowing string you can pluck and pull; the output shifts as you tug | A neuron is a weighted vote |
| Gradient rain | Gradients fall backward through the net as particles; in deep sigmoid nets the rain dries up before reaching the first layer | Backprop and vanishing gradients |
| Ghost runs | Your previous training run replays as a translucent ghost beside the current one | Effect of each hyperparameter change |
| Learning-rate finder | Sweep the rate on a dial and watch loss explode, crawl or glide | The goldilocks zone |
| Batch-size blender | Change batch size and see the descent path go from jittery to smooth | Noise vs stability in SGD |
| Init roulette | Re-roll starting weights and watch the same net land in different minima | Randomness and local minima |
| Normalisation flatten | Toggle batch/layer norm and watch activation histograms snap into shape | Why normalisation stabilises training |

**Seeing inside models**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Webcam CNN | Point your camera at objects; every feature map lights up in real time | What each conv layer detects |
| Neuron dreams | Each neuron shows the image that excites it most, generated live | Feature visualisation |
| Doodle journey | Draw a digit; watch it get warped layer by layer until classes separate | Representations become linearly separable |
| Data lens | Drag a magnifier over the dataset to see confidence halos round each point | Uncertainty and decision confidence |
| Saliency spotlight | Click a prediction to see which pixels or words it relied on | Attribution and explainability |
| Confusion sorting machine | Predictions drop through a sorting machine into a live confusion matrix | Precision, recall and error types |
| Activation histogram strip | A live strip of every layer's activation distribution | Dead ReLUs, saturation, healthy nets |
| Adversarial nudge | Add tiny invisible noise to a cat image until the model says "toaster" | Brittleness of neural nets |

**Generative**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Latent space flight | Fly through a 3D map of faces or digits; glide between points and watch them morph | Latent spaces and interpolation |
| Latent sliders | Find directions like "smile" or "age" and drag along them | Disentangled features |
| Diffusion scrubber | Scrub from pure noise to image step by step; paint a mask to steer it | How diffusion denoises |
| GAN duel arena | Forger vs detective in a split arena with a live scoreboard | Adversarial training and mode collapse |
| Autoencoder squeeze | Shrink the bottleneck and watch reconstructions blur | Compression and representation |

**Language models**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Tokeniser microscope | Type anything and see it split into tokens, coloured and counted; compare English, Gujarati, emoji and code | Tokens are not words |
| Embedding galaxy | Words are stars; drag vectors to do king − man + woman and land on queen | Meaning as geometry |
| Next-token slot machine | Probability bars for the next token spin and settle; pull the lever to sample | How GPT generates text |
| Temperature and top-k dials | Turn the dials and watch the distribution sharpen or flatten, with live sampled text | Creativity vs coherence |
| Build-a-baby-GPT | Paste your own text; a tiny GPT trains in the browser and goes from gibberish to your style | Pretraining in miniature |
| Attention head gallery | Every head is a card showing its pattern; label what each specialises in | Multi-head attention |
| Residual stream river | The transformer as a river; each block adds a tributary of information | Residual connections |
| Positional wave lab | See sine-wave position codes and break word order by turning them off | Why position matters |
| Context window tunnel | Fly through a long prompt; tokens fall out of view as the window fills | Context limits |
| Preference ranker | Rank two answers; a reward model updates and the policy visibly shifts | RLHF |
| RAG library | Watch a question fetch the right pages from a bookshelf before answering | Retrieval-augmented generation |
| Agent loop theatre | A tiny agent thinks, calls a tool, reads the result and loops, shown as a stage play | How AI agents work |
| Scaling dials | Grow parameters, data and compute; see predicted loss curves bend | Scaling laws |
| Image–text matcher | Drag captions onto images; see CLIP-style similarity scores light up | Multimodal embeddings |

**Reinforcement learning**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Bandit casino | Play hidden-payout slot machines yourself, then race epsilon-greedy and UCB bots | Explore vs exploit |
| Policy arrow field | A flow field of arrows over the grid shows what the agent would do everywhere | Policies |
| Q-table heat tiles | Every tile splits into four arrow-triangles coloured by Q-value | Q-learning |
| Draw-a-track racers | Draw a racetrack; a population of cars evolves to drive it | Neuroevolution and rewards |
| Reward hacking sandbox | Design a reward and watch the agent find the loophole | Specification gaming |
| MCTS tree bloom | A search tree blooms outward as the AI plans a game move | Planning and AlphaZero-style search |
| Discount telescope | Slide gamma and watch the agent's foresight horizon shrink or stretch | Discounting future reward |
| Self-play arena | Two agents train against each other in a simple game; watch strategies emerge | Self-play |

**Classic ML**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Tree carving | Each split of a decision tree is a knife cut through the data plane | Decision trees |
| Forest vote | Dozens of tiny trees vote; see the crowd beat any single tree | Ensembles |
| Boosting relay | Each new tree focuses on the glowing mistakes of the last | Gradient boosting |
| Margin street | The SVM boundary is a street; widen it and see support vectors hold it | Max-margin classifiers |
| Kernel lift | Points lift into 3D until a flat plane can separate them | The kernel trick |
| Centroid magnets | k-means centroids are magnets pulling points each step | Clustering |
| Shadow finder (PCA) | Rotate a 3D cloud to find the shadow that keeps the most shape | Dimensionality reduction |
| Neighbour ripple | Click a point and ripples reach its k nearest neighbours | k-NN |

**Exploration, motivation and sharing**

| Feature | What you do | What it teaches |
| --- | --- | --- |
| Sandbox lab | Free-play canvas combining any dataset, model and environment | Open exploration |
| Daily puzzle | One short challenge a day ("get this net under 0.1 loss with 8 neurons") | Habit and mastery |
| Story journeys | Guided cinematic tours ("How ChatGPT works in 12 minutes") through existing modules | Big-picture narratives |
| AI history museum | Scroll a timeline from the 1958 perceptron to modern LLMs; each exhibit is playable | Context and history |
| Compute meter | A counter shows how many multiplications your action took, compared to one GPT reply | Scale intuition |
| Snapshot links | Share a link that reopens your exact model, settings and timeline position | Showing and teaching others |
| Achievements as stars | Missions and modules add stars to your personal constellation | Progress without dashboards |
| Two-player modes | Race to train, or one breaks a model while the other repairs it | Learning together |
| Theatre mode | Full-screen ambient visual of a model thinking, for screensavers and talks | Wonder |
| Sonified training | Loss and accuracy become sound so training can be heard | Accessibility and intuition |
| Glossary cards | Every term is a living card with a mini interactive, opened from anywhere | Quick recall |

## Curriculum

Six worlds, 74 lessons, one continuous story. Every lesson is named the way a non-technical person would say it; the real term appears only as a small tag once the idea has clicked.

**World 1: Learning from examples**

| Lesson | Real term (small tag) | The everyday idea | You play with | Mission |
| --- | --- | --- | --- | --- |
| Teach by showing | Machine learning | Show lots of examples instead of writing rules, and it spots the pattern | Sort fruit yourself; a little robot copies you | Give it wrongly labelled fruit |
| What the machine sees | Features | It only knows what you describe to it | Pick which facts describe a house and watch the price guess change | Hide the one fact that matters |
| Drawing the best line | Linear regression | Find the line closest to all the dots | Drag a line; little "miss" bars shrink and grow | Add one crazy dot |
| Splitting into groups | Classification | Put a fence between two kinds of things | Paint two colours of dots; a fence appears | Mix them so no straight fence works |
| Keeping score of mistakes | Loss function | One score for "how wrong" | Compare a gentle and a strict mistake-scorer | Pick a scorer that ignores the rare group |
| Rolling downhill | Gradient descent | Learning is walking downhill in a valley of mistakes | Balls racing down the valley | Take steps so big the ball flies off |
| Memorising vs understanding | Overfitting | Learning answers by heart fails on new questions | A student who crammed past papers sits a new exam | Ace the practice, fail the real test |
| The surprise test | Train / test split | Hide some examples to check it really learned | Slide how much to hide; see the honest score | Peek at the answers and watch the score lie |
| Stubborn vs jumpy | Bias and variance | Some learners never change, some change at every example | A darts board of slightly different robots | Make the darts scatter everywhere |
| How sure is it? | Confidence and probability | Machines give guesses with a confidence, not facts | Confidence bars above each guess | Make it 100% sure and wrong |

**World 2: Classic tricks**

| Lesson | Real term (small tag) | The everyday idea | You play with | Mission |
| --- | --- | --- | --- | --- |
| Ask the neighbours | k-nearest neighbours | You're probably like the people near you | Click a dot; ripples reach the neighbours who vote | Ask so few neighbours one weirdo decides |
| Twenty questions | Decision tree | Ask yes/no questions until you know | Each question slices the map smaller | Ask so many it memorises every dot |
| Wisdom of the crowd | Random forest | Many small guessers beat one clever one | A forest of little trees votes | Make every tree think the same |
| The mistake relay | Gradient boosting | Each helper fixes what the last got wrong | Mistakes glow; the next runner chases them | Add runners until it chases noise |
| The widest road | Support vector machine | Separate groups with the widest road; lift tangled dots into the air to split them | Widen a road held up by a few "lamp-post" dots | Remove a lamp post |
| The spam detective | Naive Bayes | Add up clues to judge a message | Words light up as spam or not-spam clues | Fool it with a spammy word salad |
| Finding natural groups | Clustering (k-means) | Group things that sit close, with no labels | Magnets pull dots into groups | Ask for the wrong number of groups |
| The best shadow | PCA | Simplify while keeping the shape | Turn a 3D cloud to find the most useful shadow | Pick the shadow that hides everything |
| A map of everything | t-SNE / UMAP | Draw a map where similar things sit together | A messy cloud settles into islands | Make islands appear from pure noise |
| Is 99% actually good? | Evaluation metrics | A score can lie | A sorting machine drops guesses into right and wrong boxes | Score 99% while being useless |

**World 3: Brains made of numbers**

| Lesson | Real term (small tag) | The everyday idea | You play with | Mission |
| --- | --- | --- | --- | --- |
| One tiny brain cell | Neuron | Listens to a few voices, trusts some more, then decides | Pluck strings for how much it trusts each voice | Make it never say yes |
| The decision curve | Activation function | The bend that lets it learn more than straight lines | Swap the bend and see what it can draw | Make cells go silent forever |
| Stacking cells | Neural network | Layers of cells combine simple bends into any shape | Draw your own dots and add layers | Draw a spiral with one cell |
| Thinking forwards | Forward pass | Information flows through the layers | Watch dots flow left to right | Feed it nonsense |
| Passing back the blame | Backpropagation | After a mistake, each cell learns its share of blame | Blame rain falls back through the network | Make the rain dry up before the start |
| Smarter ways downhill | Optimisers | Some walkers keep momentum, some adapt their stride | Three walkers race down the valley | Make the clever walker lose |
| Big steps, then small | Learning-rate schedule | Start bold, finish careful | Draw a step-size plan | A plan that stops before arriving |
| Where you start | Initialisation | The start changes where you end up | Re-roll the start and compare | Start every cell the same |
| Don't cram | Regularisation and dropout | Make studying harder so it can't just memorise | Randomly switch cells off while it learns | Switch off so many it learns nothing |
| Keeping things steady | Normalisation | Keep signals calm so learning doesn't wobble | Wild vs calm signals side by side | Train a very deep network without it |
| It can draw anything | Universal approximation | With enough cells it can copy any squiggle | Draw a squiggle; add cells until it matches | Too few cells for your doodle |

**World 4: Seeing, remembering and imagining**

| Lesson | Real term (small tag) | The everyday idea | You play with | Mission |
| --- | --- | --- | --- | --- |
| The pattern torch | Convolution | Shine a small torch over a picture, looking for one pattern | Design a torch and sweep it over a photo | Build a torch that finds nothing |
| How machines see | CNN | Edges become shapes become objects | Your webcam, seen layer by layer | Fool it with a near-invisible smudge |
| Zooming out | Pooling | Keep the gist, drop the detail | Shrink a picture tile by tile | Zoom out until the answer vanishes |
| Standing on giants | Transfer learning | Reuse a big model's know-how for your own task | Teach it your own objects with the webcam in seconds | Retrain everything from 5 photos |
| Reading one word at a time | RNN | Carry a memory along a sentence | A memory bead travels along the words | Make it forget the start of a long sentence |
| Choosing what to remember | LSTM / GRU | Little gates decide what to keep and forget | Open and close the memory gates | Lock every gate shut |
| Meaning as places | Embeddings | Similar things live close together on a map | Similar words drift together on a map | Squash every word into one spot |
| Squeeze and rebuild | Autoencoder | Shrink a picture to a tiny code, then rebuild it | Tighten the squeeze; watch the rebuild blur | Squeeze down to one number |
| Smooth imagination | VAE | A map where every spot is a believable picture | Glide across a map of faces as they morph | Tear the map so gaps make nonsense |
| Forger vs detective | GAN | One fakes, one catches, both improve | The duel arena with live scores | Make the forger draw only one face |
| Painting from fog | Diffusion | Start with fuzz and clean it step by step into a picture | Scrub from fog to image; paint where to steer it | Skip most steps and get mush |
| Learning from friends | Graph neural network | Everyone learns a little from their friends | Pulses spread through a friendship network | Pass messages until everyone is identical |

**World 5: How ChatGPT-style AI works**

| Lesson | Real term (small tag) | The everyday idea | You play with | Mission |
| --- | --- | --- | --- | --- |
| Chopping text into pieces | Tokenisation | AI reads in chunks, not words | Type anything and see the pieces | Find the sentence that costs the most pieces |
| Words as places | Word embeddings | Words with similar meaning sit near each other | King minus man plus woman lands near queen | Break the analogy trick |
| Who is looking at whom | Attention | Each word checks which other words matter to it | Glowing threads between words | Make one word hog all the attention |
| Many readers at once | Multi-head attention | Different readers look for different things | A gallery of readers, each with its own threads | Remove readers until it stops making sense |
| Knowing the order | Positional encoding | Without order, "dog bites man" = "man bites dog" | Switch word order on and off | Shuffle words without it noticing |
| The thinking block | Transformer block | Look around, think, pass it on, with a shortcut | A river where each block adds a stream | Remove the shortcut |
| Guess the next word | Next-token prediction | ChatGPT just keeps guessing the next word | The next-word slot machine | Trap it repeating itself |
| Safe vs adventurous | Sampling and temperature | Pick the likely word, or take risks | A "boring ↔ wild" dial with live text | Turn it to wild and get gibberish |
| Reading the internet | Pretraining | Learns language by guessing next words in mountains of text | Train a tiny writer on your own text | Train it on one sentence only |
| Bigger and bigger | Scaling | More brain, more reading, more computing | Grow three dials and see what helps | Spend everything on the wrong dial |
| Short-term memory | Context window | It can only hold so much of a conversation | A tunnel where old words fall out of view | Push the key fact out of its memory |
| Specialising | Fine-tuning | Teach a general writer a special style | Retrain the tiny writer on pirate talk | Make it forget everything else |
| Learning from thumbs-up | RLHF | People pick better answers and it learns to prefer them | Choose between two answers and watch it change | Reward flattery and get a yes-man |
| Looking things up | RAG | Find the right pages before answering | A librarian fetching books | Hand it the wrong book |
| AI that takes actions | Agents | Think, use a tool, check, repeat | A little stage play of an agent at work | Trap it in an endless loop |
| Pictures and words together | Multimodal AI | Images and text share one map of meaning | Drag captions onto pictures | Swap captions to confuse it |
| Confident but wrong | Hallucination | Sounding right is not being right | Confidence vs truth side by side | Make it invent a fake source |

**World 6: Learning by trying**

| Lesson | Real term (small tag) | The everyday idea | You play with | Mission |
| --- | --- | --- | --- | --- |
| Treats and tricks | Reinforcement learning | Learn by trying things and getting rewards | Train a puppy with treats | Reward the wrong trick |
| New or favourite? | Explore vs exploit | Try a new restaurant or go back to your favourite? | A casino of mystery slot machines | Never try anything new |
| The game board | MDP | A world of places, moves and rewards | Build your own little board | Make a trap square |
| Now vs later | Discounting | How much to care about future rewards | A telescope dial from "right now" to "long term" | Make it care only about this second |
| Good places to be | Value function | Some spots are closer to reward than others | A warm glow spreads across the board | Hide the reward entirely |
| Scoring every move | Q-learning | Learn how good each move is from each spot | Arrows on each tile grow as it learns | Make it learn too fast to settle |
| A brain for the game | Deep Q-network | A neural network replaces the score table | Watch it learn a simple arcade game | Take away its memory of past games |
| Nudging habits | Policy gradients | Do more of what worked | A field of arrows bending over time | Nudge so hard it goes wild |
| Player and coach | Actor-critic / PPO | One plays, one judges, changes stay small | Player and coach side by side | Remove the "small changes" safety rail |
| Survival of the fittest | Evolution strategies | Breed the best performers | Draw a racetrack; cars evolve to drive it | Mutate so much nothing improves |
| Thinking ahead | Planning (MCTS) | Imagine moves before making them | A tree of possible futures in Connect Four | Let it look one move ahead |
| Practising against yourself | Self-play | Improve by playing a copy of yourself | Two agents trading wins | Freeze one so the other learns a cheap trick |
| Loopholes | Reward hacking | It does what you rewarded, not what you meant | Design a reward; watch it cheat | Find three loopholes |
| Back to chatbots | RL + LLMs | How thumbs-up training shapes ChatGPT | Links back to "Learning from thumbs-up" | Over-train it until it only flatters |

## Tech stack and architecture

Everything runs in the browser: models train and infer client-side, so interactions stay instant and hosting stays cheap.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Routing per module, static export, fast loads |
| 3D and scenes | React Three Fiber + drei (soft lighting, no bloom or glow) | Only the few 3D scenes: the home map, the downhill landscape and idea-space flights |
| 2D data viz | D3 (scales, shapes) rendered to Canvas or SVG | Decision boundaries, charts, heatmaps |
| Motion | Motion (Framer Motion) for UI; GSAP for camera timelines | Spring physics and choreographed flights |
| UI primitives | Radix + Tailwind with design tokens | Accessible sliders, dialogs, tooltips with custom skin |
| Transparent nets | A small custom autodiff engine in TypeScript (micrograd-style) | Every weight, activation and gradient is inspectable |
| Bigger models | TensorFlow.js on WebGPU (WebGL fallback) | CNNs, baby GPT and DQN trained live |
| Pretrained models | ONNX Runtime Web / Transformers.js (tokenisers, small GPT, CLIP, small embedding model) | Real-model demos with no server |
| Off-main-thread | Web Workers + SharedArrayBuffer for training loops | 60 fps UI while models train |
| State | Zustand stores per module + one global progress store | Simple, fast, serialisable for snapshot links |
| Persistence | IndexedDB for progress and saved runs; URL-encoded state for snapshot links | Works without accounts |
| Sound | Tone.js | Optional sonification and UI audio |
| Hosting | Vercel or Cloudflare Pages | Static, global CDN |

**Architecture**

- **Module contract.** Every module is a folder exporting `scene`, `controls`, `captions`, `missions` and `predictions`. A registry builds the constellation from these, so adding a module never touches the shell.

- **Shared engines.** `ModelEngine` (worker-based training for any model type), `Timeline` (ring buffer of snapshots for scrubbing and ghost runs), `SceneKit` (shared 3D components: neuron, edge, particle stream, landscape), `DataKit` (datasets plus the paint-your-own canvas).

- **One evolving model.** A global "companion model" object persists across Worlds 1–4 and is upgraded by modules (add a layer, add convolution), so the learner's own network travels with them.

- **Performance budget.** First paint under 1.5 s; each module lazy-loads its own models; heavy pretrained weights stream in behind an animated intro.

## Build prompts

Paste these into Claude Code in order. Each builds on the last; prompt 9 is a reusable template for every remaining module.

**1. Project shell and design system**

```text
Create a Next.js (App Router) + TypeScript project called neural-atlas with Tailwind, Radix UI, Motion (Framer Motion), React Three Fiber, drei, Zustand and D3.

Build a design system first, inspired by Claude's warm, calm design language (no dark neon, no glow, no sci-fi):
- Tokens in CSS variables. Light (default): background ivory #FAF9F5, text #141413, secondary text #87867F, card sand #E3DACC, hairline border #E8E6DC. Night mode: background #1F1E1D, text #FAF9F5.
- One accent, clay orange #D97757, used only for what you can touch or should look at next. Muted meaning colours: sage #7A9E7E (good / up), rose #C4646B (bad / down), sky #6A9BCC (information flowing).
- Type: Fraunces (or Source Serif 4) for headlines, Inter for body. Numbers are rare and shown in plain words where possible.
- Paper card component: flat, 16px radius, hairline warm border; a soft low shadow only while dragging.
- Components: PaperCard, Dial (plain-language label, e.g. "How big a step"), Slider, Toggle, SegmentedControl, HoverNote (one plain sentence), MissionCard, StoryCaption (appears after the first interaction), TermTag (small tag showing the real term), UnderTheHoodDrawer (closed by default), CommandPalette (Cmd/Ctrl+K).
- Illustrations: soft 2D cut-paper shapes with slightly organic edges; a small friendly robot learner as a recurring character.
- Motion: gentle springs that settle, 200-400 ms; ideas build step by step; honour prefers-reduced-motion.
- A /styleguide page showing every token and component live.
It must feel calm, premium and readable by anyone: generous whitespace, one idea per screen, nothing flashing.
```

**2. Constellation home**

```text
Build the home page as a 3D constellation in React Three Fiber.
- Load modules from a registry (src/modules/registry.ts). Each module has id, title, world (1-6), prerequisites[] and a one-line hook.
- Render each world as a galaxy cluster with its own hue tint; modules are stars; prerequisites are thin warm lines.
- Ideas fill with clay colour when learned (from a Zustand progress store persisted to IndexedDB); the next suggested star pulses softly.
- Hover: star scales up and a glass label shows the title and hook. Click: GSAP camera flight into that star, then route to /learn/[moduleId].
- Idle: slow drift and parallax on pointer move; soft paper shadows, no bloom or glow.
- Include a world filter bar and wire the command palette to jump to any module.
Seed the registry with all 74 modules from the curriculum (I'll paste the list).
```

**3. Shared engines**

```text
Create the shared engines every module will use:
1. engine/autodiff: a tiny TypeScript autodiff library (Value, Neuron, Layer, MLP) exposing every weight, activation and gradient for visualisation.
2. engine/ModelEngine: runs training in a Web Worker; supports the autodiff MLP and TensorFlow.js models (WebGPU backend, WebGL fallback); posts snapshots at a configurable rate.
3. engine/Timeline: ring buffer of model snapshots; API for play, pause, scrub(epoch), stepForward, stepBack, and "ghost" playback of a previous run.
4. ui/TimelineScrubber: video-editor-style bottom bar bound to Timeline, with loss sparkline painted along it.
5. scene/SceneKit: reusable R3F components: NeuronNode (glow = activation), Edge (thickness = |weight|, colour = sign), ParticleStream (speed = gradient magnitude), LossLandscape (heightfield mesh from a function).
6. data/DataKit: built-in toy datasets (blobs, moons, spiral, XOR, circles) plus a PaintCanvas where users click/drag to add points of a chosen class.
Write unit tests for autodiff gradients against numerical gradients.
```

**4. Module contract and first module: gradient descent**

```text
Define the module contract: each module folder exports scene, controls, captions, missions and predictions, plus metadata for the registry. Build a ModuleShell layout: full-bleed scene, glass control dock on the right, caption strip, mission card top-left, timeline scrubber bottom, depth toggle (Intuition / Mechanics / Maths).

Then build the Gradient Descent module:
- A 3D loss landscape the user can orbit, with three balls (SGD, Momentum, Adam) racing downhill, each leaving a soft trail.
- Controls: ScrubbableNumber for learning rate, momentum, betas; landscape picker (bowl, ravine, saddle, many-minima).
- Predict-then-reveal: before starting, user taps where they think each ball will end; show their guesses as ghost markers.
- Mission: "Make a ball diverge" - success when a ball leaves the map, then play a slow-motion replay with a caption explaining why.
- Maths depth shows the update rules animating in sync with each ball's step.
```

**5. Neural network playground (draw-your-own-data)**

```text
Build the Multi-layer Perceptron module using engine/autodiff and DataKit.
- Left: PaintCanvas with a live decision boundary rendered as a smooth colour field that morphs every training step.
- Right: the network drawn with SceneKit (neurons glow by activation, edges by weight, gradient particles flow backward during training).
- Users add/remove layers and neurons with + / - buttons that animate in; swap activation functions per layer.
- Hovering a hidden neuron shows the mini decision field that neuron alone carves.
- Compare split: drag a divider to train two architectures side by side on the same data, synced to one timeline.
- Missions: fit the spiral with the fewest neurons; make every ReLU die; overfit with 5 points.
```

**6. Attention as threads**

```text
Build the Attention module using Transformers.js with a small pretrained model (load GPT-2 small or a distilled equivalent).
- User types a sentence; tokens appear as glass chips in an arc.
- Draw soft curved threads between tokens; thickness and brightness = attention weight; amber for the selected query token.
- Layer and head selectors; an "all heads" mode lays heads out as a gallery of mini thread diagrams.
- Dragging a token to a new position re-runs the model and threads re-route with spring animation.
- Predict-then-reveal: user clicks which word they think "it" attends to before revealing.
- Mission: make one token absorb most of the attention.
```

**7. RL gridworld with a visible brain**

```text
Build the Q-learning module.
- A flat, cosy board-game style gridworld with an agent, goal, walls, lava and coins. Users paint tiles with a brush palette at any time, even mid-training.
- Underneath each tile, show Q-values as four coloured triangles and a policy arrow; a value heatmap fades in as learning progresses.
- Controls: epsilon, alpha, gamma (discount telescope visual), speed (1x to 1000x).
- Timeline scrubber replays episodes; a reward-per-episode chart sits above it.
- Missions: design a reward the agent exploits (reward hacking); make the agent never explore; build a maze it cannot solve.
```

**8. Break-it missions, progress and snapshots**

```text
Build the cross-cutting systems:
- Mission engine: missions declare a condition (a predicate over model/timeline state) and a replay window; on success play a cinematic replay, award a star and update the constellation.
- Progress store in IndexedDB; mastery = module visited + at least one mission + one prediction made.
- Snapshot links: serialise module state (settings, data points, timeline position) into a compressed URL; opening it restores the exact view.
- Daily puzzle: one rotating mission across modules, seeded by date.
```

**9. Template for every other module**

```text
Build the [MODULE NAME] module in World [N] using the module contract, ModuleShell and shared engines.
Big idea: [ONE LINE FROM THE CURRICULUM].
Primary interaction: ["YOU PLAY WITH" COLUMN], built as a live, manipulable scene that opens before any text.
Reuse these library features: [LIST FROM THE FEATURE LIBRARY].
Include: predict-then-reveal moment; at least two ScrubbableNumbers; timeline scrubbing if anything trains; compare split if a setting has a clear alternative; Intuition / Mechanics / Maths depth levels.
Mission: [BREAK-IT MISSION] with a success replay and caption.
Plain-language rules: everyday lesson name, the real term only as a small tag at the end, no formulas or raw numbers on the main screen, every caption passes the "smart 12-year-old" test. Visual rules: follow the warm design tokens, 2D unless depth is the idea; every colour, speed or thickness must mean something; spring motion; 60 fps while training (work in a Web Worker).
Finally register the module with its prerequisites so it appears in the constellation.
```

## Build sequence

The full scope ships; this is only the order that makes each step reuse the last.

1. **Shell and design system** (prompt 1). Everything after inherits the look.
2. **Shared engines** (prompt 3). Autodiff, ModelEngine, Timeline, SceneKit and DataKit unlock most modules.
3. **Constellation home** (prompt 2), seeded with all 74 modules as locked stars.
4. **Headline modules** (prompts 4–7): gradient descent, MLP playground, attention, gridworld. These prove every interaction mechanic.
5. **Mission, progress and snapshot systems** (prompt 8).
6. **World 1 and World 3** in full via prompt 9; they share the autodiff engine.
7. **World 2**, reusing DataKit and the 2D boundary renderer.
8. **World 4**, adding TensorFlow.js models, webcam CNN and generative scenes.
9. **World 5**, adding Transformers.js models and baby GPT.
10. **World 6**, adding environments, MCTS and self-play.
11. **Story journeys, history museum, theatre mode, two-player modes and sonification**, built on top of the finished worlds.
12. **Phone layouts and accessibility pass** across every module.
