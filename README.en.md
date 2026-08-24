# webfly — browser-based air combat simulator

[Русский](README.md) · **English**

**[▶ Play online](https://a477aa.github.io/webfly/)** · [self-hosted mirror](http://193.233.216.107/)

An arcade 3D flight simulator built around the **Su-27 Flanker**: flight dynamics,
dogfighting AI, five types of guided missiles, bombing with a ballistic sight, ground
targets and air defences. Written in plain JavaScript and [three.js](https://threejs.org/) —
no build step, no frameworks and no external assets: every texture, sound and model is
generated in code.

---

## Features

**Flight.** Rigid-body force model: thrust, lift from the `CL(α)` coefficient, parasitic
and induced drag, gravity, weathervane stability and stall past the critical angle of
attack. Banking generates the turn, a vertical zoom honestly bleeds speed, and flaps
improve lift at the cost of drag.

**Controls.** Two schemes — *Simple* (the cursor walks the nose onto target while the
instructor banks into turns, levels the wings and prevents stalls) and *Advanced* (the
mouse acts as a control stick, no assistance). The keyboard always takes priority and
gives full authority.

**Armament.** A GSh-30-1 cannon with real ballistics (860 m/s), mounted in the starboard
wing root with gun harmonisation, a lead-computing sight and a traverse sector. Five
missile types with distinct seekers: R-73 (infrared), R-27 (semi-active radar), R-77
(active radar), Kh-31P (anti-radiation) and Kh-29 (air-to-ground). Free-fall bombs with
a sight that shows the true impact point. Countermeasure flares.

**Helmet-mounted sight.** The cursor represents where the pilot looks, so lock-on follows
it and missiles can be launched well off the aircraft's axis, the way the Shchel-3UM
system allows.

**Opposition.** Fighters with four distinct combat styles (aggressor, energy fighter,
turn fighter, sniper), heavy bombers, ground-based anti-aircraft guns and an enemy ace.
The AI holds standoff range, breaks away when closing in and only rams when mortally
damaged. Friendly fighters fight alongside you.

**World.** Procedural terrain, shader water with waves and sun glint, volumetric clouds,
atmospheric sky, shadows and reflections. Points of interest include an enemy airbase
and a naval group with a carrier.

**Interface.** Heading tape, radar with three ranges, target selection, enemy and ally
markers, incoming-missile warning, and an instrument panel with live telemetry in the
cockpit view. Localised in Russian and English.

---

## Controls

| Keys | Action |
|---|---|
| **Mouse** | manoeuvre and aim · **LMB** gun · **RMB** missile |
| `W` `S` / `A` `D` / `Q` `E` | pitch / roll / yaw (or `Z` `C`) |
| `Shift` `Ctrl` | throttle |
| `1`…`5` · `F` | select and launch missile |
| `B` · `X` | bombing mode · flares |
| `T` · `Y` · `N` | select target · look at target · radar range |
| `G` · `H` | flaps · repair kit |
| `V` · `O` | camera (chase / cockpit / far) · look back |
| `Esc` · `R` · `U` | pause · restart · developer mode |

---

## Running locally

```bash
git clone https://github.com/A477aA/webfly.git
cd webfly
```

Then simply open `index.html` in a browser — the modules load as classic `<script>` tags
and work from `file://`. Or serve it statically:

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

---

## Project layout

```
index.html            markup and module loading
css/style.css         HUD and menu styling
js/
  data.js             single config: performance, balance, controls
  i18n.js             RU/EN localisation
  sound.js            procedural audio (WebAudio)
  config.js           game state
  util.js             resource disposal, DOM cache, scratch buffers
  mathutil.js         terrain noise, geometry, target lead
  textures.js         procedural textures (canvas)
  build.js            3D models: Su-27, F-16, bomber, cockpit, missiles
  world.js            scene, terrain, water, sky, points of interest
  effects.js          explosions, fire, smoke, debris
  weapons.js          gun, bombs, missiles, lock-on, flares
  entities.js         spawning, AI, damage, mission, combat loop
  physics.js          flight integrator and control laws
  hud.js              instruments and overlay layers
  main.js             camera, main loop, input, menus
```

### Tuning

Every adjustable value lives in **`js/data.js`** — edit that file alone:

| Section | Governs |
|---|---|
| `DATA_FLIGHT` | thrust, lift, drag, control authority |
| `DATA_FLAPS` | flap effectiveness and auto-deployment |
| `DATA_CONTROL` | control feel: sensitivity, assist strength, safeguards |
| `DATA_GUNS` / `DATA_MISSILES` | weapons: range, velocity, damage, seeker type |
| `DATA_UNITS` | hull strength and speed of every aircraft |
| `DATA_PILOT_STYLES` | enemy combat styles |
| `DATA_AI` | engagement ranges, ramming, reinforcements, ace arrival |
| `DATA_DIFFICULTY` | difficulty: rate of fire, accuracy, numbers |
| `DATA_WORLD` | map size, combat area bounds, target placement |

---

## Flight model

The aircraft is modelled as a rigid body: position and velocity in world space,
orientation as a quaternion, angular rates in body axes.

**Forces:**

```
Thrust    T = maxThrust · throttle       along the nose vector
Lift      L = min(g, k·q) + k·q·CL(α)    perpendicular to the velocity vector
Drag      D = q · (Cd0 + K·CL²)          opposing the velocity vector
Gravity   G = −g                         downward
```

where `q = V²` is dynamic pressure and `CL(α) = clAlpha · α`. The trim component of lift
is capped at weight — otherwise the aircraft balloons upward at speed. The manoeuvring
component is limited by maximum load factor.

Past the critical angle of attack lift collapses and the aircraft stalls. Flaps raise the
critical angle and increase lift while adding drag.

**Moments** in pitch, roll and yaw are proportional to control deflection and to authority
that scales with dynamic pressure, with angular damping applied. Weathervane stability
turns the nose toward the velocity vector.

**Axis convention:** nose is local `−Z`, up is `+Y`, starboard wing is `+X`.

**Computed performance:** top speed 780 km/h, cruise 650 km/h, stall speed 125 km/h,
thrust-to-weight 0.85, sustained turns up to 8G without stalling.

---

## Roadmap

- [ ] Weather: clear / overcast / rain / night affecting visibility and performance
- [ ] Altitude-hold autopilot and waypoint navigation
- [ ] Helicopters and cruise missiles as distinct target types
- [ ] Campaign of several missions with briefings and progression
- [ ] Aircraft selection: MiG-29, Su-25
- [ ] Tabulated `CL(α)` / `CD(α)` aerodynamics instead of the linear model
- [ ] Persistent high scores and settings

---

## Technical notes

- **Zero external assets.** Textures are drawn on canvas, audio is synthesised through
  WebAudio, and models are assembled from primitives in code.
- **Resource disposal.** Every removed bullet, missile and particle releases its geometry
  and materials — without this, video memory leaks steadily.
- **Frame-rate independence.** Flight physics and bomb ballistics integrate at a fixed
  step, so behaviour is identical at 30 and 144 FPS.
- **Resource reuse.** Shared geometry and materials for tracers and debris, a cached DOM
  lookup table, and scratch vectors instead of per-frame allocations.

---

An educational and portfolio project. Built on three.js r128.
