# Audio Preview Similarity & Fidelity Report

- Instrument tones: 32
- Behavior/instrument pairs: 146
- Grooves: 64
- Total MP3 previews: 242
- Instrument-tone PCM comparisons: 496
- Instrument-tone near-audio pairs: 35
- Instrument tones with indistinguishable decoded timbre signatures: 1
- Distinct FluidR3 presets represented: 26
- Documented TIMBRE_APPROXIMATION entries: 5
- Exact spec duplicate groups: 24
- Near spec duplicate groups: 3
- Near-audio similarity groups (score ≥ 0.9): 24
- ACCEPTED_EQUIVALENT groups: 28
- EXPECTED_VARIANT groups: 18
- INVALID_COLLISION groups: 0
- Percussion kit families validated: 8/8

## PCM feature method

MP3 files are decoded by FFmpeg to mono float PCM at 11,025 Hz. The audit compares a 48-bin RMS envelope, 25 ms onset/transient density, zero-crossing rate, duration, low/mid/high energy ratios, and eight one-pole spectral bands split at 80, 160, 315, 630, 1,250, 2,500 and 5,000 Hz. Band energy and per-time-bin band envelopes supply the timbre and spectral-shape measures; scores are deterministic, explainable feature distances, not an ML or perceptual model. MP3 hashes are not used as similarity evidence.

## Instrument-tone audit

All 496 instrument-tone pairs are compared using decoded PCM features. The catalog uses 26 distinct FluidR3 bank/program selections; 12 pairs intentionally share a bank/program, with their note-range or documented approximation recorded below.
- Near-audio pairs (score ≥ 0.9): 35
- Near-identical decoded timbre signatures (overall ≥ 0.99 and timbre ≥ 0.995): 1
- **TIMBRE_APPROXIMATION · Manouche / Selmer-style Acoustic Guitar** — Electric Guitar (jazz): GM program 26 is the generic jazz electric-guitar patch, not an acoustic Selmer/Manouche sample set.
- **TIMBRE_APPROXIMATION · Flugelhorn** — Trumpet: GM program 56 is the trumpet patch; FluidR3 has no dedicated flugelhorn patch.
- **TIMBRE_APPROXIMATION · Upright Bass** — Acoustic Bass: GM program 32 is the general acoustic-bass patch and does not model a specific upright instrument.
- **TIMBRE_APPROXIMATION · Soft Shaker** — Standard: MIDI percussion pitch 70 uses FluidR3 maracas samples as a restrained shaker approximation.
- **TIMBRE_APPROXIMATION · Light Brazilian Percussion** — Standard: The standard kit pitches for surdo, caixa, agogo and maracas approximate pandeiro/tamborim ensemble colors.

## Percussion identity

| Instrument | FluidR3 bank/program | Preset | MIDI articulation / pitch mapping | QC |
|---|---:|---|---|---|
| Acoustic Drum Kit | 128/32 | Jazz | acoustic-kit-articulations | PASS |
| Brush Drums | 128/40 | Brush | brush-sweep-swirl | PASS |
| Heavy Rock Drum Kit | 128/16 | Power | power-kick-snare-cymbal | PASS |
| Congas | 128/0 | Standard | open-muted-low-conga | PASS |
| Bongos | 128/0 | Standard | high-low-bongo | PASS |
| Timbales | 128/0 | Standard | high-low-timbales | PASS |
| Soft Shaker | 128/0 | Standard | maracas-shaker-approximation | PASS |
| Light Brazilian Percussion | 128/0 | Standard | surdo-caixa-chocalho-approximation | PASS |

## Key regression comparisons

- **Acoustic vs Brush: PASS** — feature similarity 0.54294; Jazz bank 128/program 32 vs Brush bank 128/program 40; Brush Swirl event pitch 40 and brush snares differ from the standard kit phrase.
- **Acoustic vs Heavy Rock: PASS** — feature similarity 0.89112; Jazz bank 128/program 32 vs Power bank 128/program 16 with distinct kick/snare/crash articulation.
- **Brush vs Heavy Rock: PASS** — feature similarity 0.57344; Brush bank 128/program 40 and Brush Swirl event pitch 40 vs Power bank 128/program 16 and strong kick/snare events.

## Collision groups

### spec-exact-001 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- interlocking conga patterns with a clave-informed pulse (congas) · latin-hand-clave / latin-hand-clave · conga
- an interlocking conga pattern that articulates the 2-3 clave (congas) · latin-hand-clave / latin-hand-clave · conga

### spec-exact-002 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- restrained interlocking hand percussion under a repeating modal motif (congas) · latin-hand-interlock / latin-hand-interlock · conga
- light, interlocking hand percussion (congas) · latin-hand-interlock / latin-hand-interlock · conga

### spec-exact-003 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- a syncopated electric-bass line locked to straight 16th-note accents (electric-bass) · funk-groove-family / straight-16-funk · acoustic-jazz
- a syncopated electric-bass groove supporting a straight funk-rock pulse (electric-bass) · funk-groove-family / straight-16-funk · acoustic-jazz

### spec-exact-004 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- a warm electric-bass line sitting slightly behind the beat (electric-bass) · laid-back-bass-pocket / laid-back-bass-pocket · electric-bass
- a deep syncopated pocket sitting slightly behind the beat (electric-bass) · laid-back-bass-pocket / laid-back-bass-pocket · electric-bass

### spec-exact-005 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- a warm, restrained bass foundation (electric-bass) · bass-foundation / bass-foundation · electric-bass
- a soft, steady groove (electric-bass) · bass-foundation / bass-foundation · electric-bass

### spec-exact-006 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- soft electric-piano chords (rhodes) · keyboard-comping / spacious-comping · rhodes
- warm Rhodes voicings with maj9, min9 and slash chords linked by smooth chromatic voice leading (rhodes) · keyboard-comping / spacious-comping · rhodes

### spec-exact-007 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- a clear main line anchoring lively collective front-line improvisation (trumpet) · melodic-line / lyrical-phrase · trumpet
- measured melodic improvisation (trumpet) · melodic-line / lyrical-phrase · trumpet

### spec-exact-008 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- a soft, even walking pulse (upright-bass) · walking-bass / walking-bass · upright-bass
- a clear four-beat walking bass line (upright-bass) · walking-bass / walking-bass · upright-bass

### spec-exact-009 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- delicate, widely spaced notes (vibraphone) · keyboard-comping / spacious-comping · vibraphone
- soft shimmering chord colours (vibraphone) · keyboard-comping / spacious-comping · vibraphone

### spec-exact-010 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Tight straight-16th funk-soul pocket with syncopated bass, crisp backbeat and clipped keyboard-guitar accents (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Driving funk-rock pulse (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Precise straight funk-rock fusion drive (groove) · funk-groove-family / straight-16-funk · acoustic-jazz

### spec-exact-011 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Relaxed straight funk-soul pocket with concise horn responses (groove) · funk-groove-family / funk · acoustic-jazz
- Lightly syncopated funk pulse (groove) · funk-groove-family / funk · acoustic-jazz

### spec-exact-012 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Driving 2-3 clave Afro-Cuban groove (groove) · latin-hand-clave / latin-hand-clave · acoustic-jazz
- Syncopated, clave-informed Latin groove (groove) · latin-hand-clave / latin-hand-clave · acoustic-jazz

### spec-exact-013 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Fast, propulsive bebop swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Buoyant medium swing with sectional call-and-response (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Brisk, buoyant swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Open medium swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Brisk traditional swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Up-tempo swing with walking bass (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz

### spec-exact-014 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Strong four-beat swing with walking upright bass, clear ride-cymbal time and arranged ensemble punches (groove) · hard-bop-ride / hard-bop-ride · acoustic-jazz
- Driving hard-bop swing (groove) · hard-bop-ride / hard-bop-ride · acoustic-jazz

### spec-exact-015 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Brisk, lightly syncopated straight feel (groove) · straight-eighth / straight-eighth · acoustic-jazz
- Smooth, steady straight-eighth groove (groove) · straight-eighth / straight-eighth · acoustic-jazz

### spec-exact-016 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Subtle broken-beat rhythm (groove) · broken-beat / broken-beat · acoustic-jazz
- Relaxed downtempo broken-beat pulse (groove) · broken-beat / broken-beat · acoustic-jazz

### spec-exact-017 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Very soft straight pulse beneath sparse piano phrases (groove) · straight-eighth / soft-straight · acoustic-jazz
- Soft straight-eighth chill beat beneath relaxed jazz phrasing (groove) · straight-eighth / soft-straight · acoustic-jazz
- Relaxed straight-eighth groove (groove) · straight-eighth / soft-straight · acoustic-jazz

### spec-exact-018 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Gentle understated swing with the rhythm section secondary to piano phrasing (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Light swing feel (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Gentle, relaxed swing (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Gentle, polished swing feel (groove) · swing-timekeeping / swing-light · acoustic-jazz

### spec-exact-019 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Free, spacious phrasing (groove) · free-improvisation / free-time · acoustic-jazz
- Free and variable time with an occasional loose 4/4 reference pulse and no fixed backbeat (groove) · free-improvisation / free-time · acoustic-jazz
- Flexible acoustic pulse that can appear and dissolve during collective improvisation (groove) · free-improvisation / free-time · acoustic-jazz

### spec-exact-020 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Flowing jazz swing phrasing in three with ride or brushes and bass moving naturally across all three beats (groove) · jazz-waltz / jazz-waltz · acoustic-jazz
- Gentle, syncopated jazz waltz pulse with spacious phrasing (groove) · jazz-waltz / jazz-waltz · acoustic-jazz
- Gentle chamber waltz (groove) · jazz-waltz / jazz-waltz · acoustic-jazz

### spec-exact-021 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Restrained near-free pulse with occasional soft brush time (groove) · noir-sparse-brushes / noir-brushes · brush
- Very slow sparse brushed pulse with long stretches of negative space (groove) · noir-sparse-brushes / noir-brushes · brush

### spec-exact-022 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Lively samba pulse (groove) · samba / samba · acoustic-jazz
- Lively samba-derived jazz pulse with buoyant syncopated comping (groove) · samba / samba · acoustic-jazz

### spec-exact-023 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Blues-inflected shuffle (groove) · soul-shuffle / soul-shuffle · acoustic-jazz
- Deep, relaxed soul-jazz pocket with a blues shuffle (groove) · soul-shuffle / soul-shuffle · acoustic-jazz

### spec-exact-024 · ACCEPTED_EQUIVALENT

These entries use the same canonical pattern and semantic family; reuse is intentional.

- Very relaxed straight-eighth bossa groove, gently behind the beat (groove) · bossa / soft-bossa · acoustic-jazz
- Soft, lightly syncopated bossa pulse (groove) · bossa / soft-bossa · acoustic-jazz

### spec-near-001 · EXPECTED_VARIANT

The previews share a semantic family but use separate canonical patterns; this is an expected family-level variation.

- Tight straight-16th funk-soul pocket with syncopated bass, crisp backbeat and clipped keyboard-guitar accents (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Relaxed straight funk-soul pocket with concise horn responses (groove) · funk-groove-family / funk · acoustic-jazz
- Driving funk-rock pulse (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Precise straight funk-rock fusion drive (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Lightly syncopated funk pulse (groove) · funk-groove-family / funk · acoustic-jazz

### spec-near-002 · EXPECTED_VARIANT

The previews share a semantic family but use separate canonical patterns; this is an expected family-level variation.

- Fast, propulsive bebop swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Buoyant medium swing with sectional call-and-response (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Brisk, buoyant swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Open medium swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Brisk traditional swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Up-tempo swing with walking bass (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Walking swing with steady ride-cymbal time (groove) · swing-timekeeping / swing-restrained-ride · acoustic-jazz

### spec-near-003 · EXPECTED_VARIANT

The previews share a semantic family but use separate canonical patterns; this is an expected family-level variation.

- Light bossa-influenced rhythm (groove) · bossa / bossa · acoustic-jazz
- Very relaxed straight-eighth bossa groove, gently behind the beat (groove) · bossa / soft-bossa · acoustic-jazz
- Soft, lightly syncopated bossa pulse (groove) · bossa / soft-bossa · acoustic-jazz

### audio-near-001 · ACCEPTED_EQUIVALENT

Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.

- a feather-light jazz brush pulse with minimal fills and no strong backbeat (acoustic-drums) · brush-light-pulse / brush-light-pulse · brush
- a feather-light brushed pulse (brush-drums) · brush-light-pulse / brush-light-pulse · brush

### audio-near-002 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- a tight straight-16th funk pocket with a crisp, restrained backbeat (acoustic-drums) · funk-groove-family / straight-16-funk · acoustic-jazz
- a relaxed soul-jazz shuffle with a restrained, soulful backbeat (acoustic-drums) · soul-shuffle / soul-shuffle · acoustic-jazz
- a soft, deep 16th-note pocket with restrained ghost notes (acoustic-drums) · neo-soul-pocket / neo-soul · acoustic-jazz

### audio-near-003 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- powerful, controlled straight funk-rock drive with asymmetrical accents (acoustic-drums) · asymmetrical-meter / odd-meter · acoustic-jazz
- a hybrid electronic/live broken-beat drum texture with subtle programming and light acoustic percussion, without an EDM-style drop (acoustic-drums) · broken-beat / broken-beat · acoustic-jazz

### audio-near-004 · EXPECTED_VARIANT

The previews share a semantic family but use separate canonical patterns; this is an expected family-level variation. The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- light, controlled swing time (acoustic-drums) · swing-timekeeping / swing-light · acoustic-jazz
- restrained ride-cymbal timekeeping (acoustic-drums) · swing-timekeeping / swing-restrained-ride · acoustic-jazz
- restrained acoustic time with light hand-percussion interplay (acoustic-drums) · acoustic-hand-interplay / acoustic-hand-interplay · acoustic-jazz
- ride-cymbal swing with clear swing eighths (acoustic-drums) · swing-timekeeping / swing-clear-eighth · acoustic-jazz

### audio-near-005 · EXPECTED_VARIANT

These instrument tones use different SoundFont presets and have a different decoded spectral timbre signature; the common neutral phrase raises the full-track similarity score. The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision. The catalog labels differ but FluidR3 resolves both to the same GM patch; TIMBRE_APPROXIMATION is recorded (Trumpet). Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.

- a restrained melodic line (acoustic-guitar) · melodic-line / lyrical-phrase · acoustic-guitar
- steady la pompe rhythm-guitar chords (acoustic-guitar) · la-pompe / la-pompe · acoustic-guitar
- warm fingerstyle phrases (acoustic-guitar) · fingerstyle / fingerstyle · acoustic-guitar
- soft, spacious chordal support (acoustic-guitar) · spacious-guitar-comping / spacious-guitar-comping · acoustic-guitar
- lyrical, measured improvisation (alto-sax) · melodic-line / lyrical-phrase · alto-sax
- a concise featured solo framed by arranged big-band passages (alto-sax) · arranged-solo / arranged-solo · alto-sax
- nimble but controlled melodic phrases (alto-sax) · melodic-line / lyrical-phrase · alto-sax
- a coordinated saxophone-section line in tight arranged voicings (alto-sax) · ensemble-section-line / ensemble-section-line · alto-sax
- rounded low-register support (bari-sax) · low-register-support / low-register-support · bari-sax
- restrained ensemble voicings (bari-sax) · keyboard-comping / spacious-comping · bari-sax
- subtle timekeeping with soft brush strokes (brush-drums) · brush-restrained-pulse / brush-subtle-time · brush
- light, nimble melodic phrases (clarinet) · melodic-line / lyrical-phrase · clarinet
- an active upper counterline that overlaps coherently with the trumpet or cornet main line (clarinet) · ensemble-counterline / ensemble-counterline · clarinet
- driving electric lead phrases (distorted-guitar) · melodic-line / lyrical-phrase · distorted-guitar
- warm, lyrical phrases (flugelhorn) · melodic-line / lyrical-phrase · flugelhorn
- occasional soft melodic replies (flugelhorn) · melodic-line / lyrical-phrase · flugelhorn
- subtle, lyrical improvisation (jazz-electric-guitar) · melodic-line / lyrical-phrase · jazz-electric-guitar
- intimate, soft-edged phrases (muted-trumpet) · melodic-line / lyrical-phrase · muted-trumpet
- soft chordal support with a light touch (nylon-guitar) · guitar-comping / guitar-comping · nylon-guitar
- sparse, gentle phrases with generous pauses (nylon-guitar) · melodic-line / lyrical-phrase · nylon-guitar
- a relaxed, gently syncopated melody (nylon-guitar) · melodic-line / lyrical-phrase · nylon-guitar
- rhythmic two-beat comping beneath a collective front line (piano) · two-beat-comping / two-beat-comping · piano
- light melodic comping (piano) · light-melodic-comping / light-melodic-comping · piano
- composed contrapuntal voicings with extended jazz harmony (piano) · third-stream-chamber-jazz / third-stream · piano
- soft, spacious chord voicings (piano) · keyboard-comping / spacious-comping · piano
- punchy blues- and gospel-inflected comping (piano) · gospel-blues-comping / gospel-blues-comping · piano
- understated melodic phrases (piano) · melodic-line / lyrical-phrase · piano
- restrained jazz improvisation within a composed chamber texture (piano) · third-stream-chamber-jazz / third-stream · piano
- soft electric-piano chords (rhodes) · keyboard-comping / spacious-comping · rhodes
- warm Rhodes voicings with maj9, min9 and slash chords linked by smooth chromatic voice leading (rhodes) · keyboard-comping / spacious-comping · rhodes
- a restrained, singing line (soprano-sax) · melodic-line / lyrical-phrase · soprano-sax
- clear, airy melodic phrases (soprano-sax) · melodic-line / lyrical-phrase · soprano-sax
- warm, breathy phrases (tenor-sax) · melodic-line / lyrical-phrase · tenor-sax
- warm, soulful blues-inflected jazz improvisation (tenor-sax) · blues-improvisation / blues-improvisation · tenor-sax
- a concise featured solo framed by arranged big-band passages (tenor-sax) · arranged-solo / arranged-solo · tenor-sax
- measured melodic improvisation (tenor-sax) · melodic-line / lyrical-phrase · tenor-sax
- measured jazz improvisation over the 2-3 clave (tenor-sax) · clave-improvisation / clave-improvisation · acoustic-jazz
- measured jazz improvisation with syncopated Latin phrasing (tenor-sax) · latin-improvisation / latin-improvisation · tenor-sax
- a coordinated saxophone-section line in tight arranged voicings (tenor-sax) · ensemble-section-line / ensemble-section-line · tenor-sax
- crisp, syncopated Latin accents (timbales) · latin-percussion-accents / latin-percussion-accents · timbales
- crisp interlocking timbales accents over a syncopated Latin groove (timbales) · latin-hand-interlock / latin-hand-interlock · timbales
- rounded sustained harmony (trombone) · sustained-texture / sustained-texture · trombone
- low trombone-section answers with arranged ensemble punches (trombone) · ensemble-section-line / ensemble-section-line · trombone
- measured, warm phrases (trombone) · melodic-line / lyrical-phrase · trombone
- a clear main line anchoring lively collective front-line improvisation (trumpet) · melodic-line / lyrical-phrase · trumpet
- a syncopated Latin-jazz improvisation (trumpet) · latin-improvisation / latin-improvisation · trumpet
- a concise featured solo framed by arranged big-band passages (trumpet) · arranged-solo / arranged-solo · trumpet
- measured melodic improvisation (trumpet) · melodic-line / lyrical-phrase · trumpet
- lively Jazz improvisation over a clear 2-3 clave (trumpet) · clave-improvisation / clave-improvisation · acoustic-jazz
- clear, lyrical phrases (trumpet) · melodic-line / lyrical-phrase · trumpet
- short trumpet-section stabs with tight arranged voicings and ensemble punches (trumpet) · ensemble-section-line / ensemble-section-line · trumpet
- bold blues-inflected jazz improvisation (trumpet) · blues-improvisation / blues-improvisation · trumpet
- soft sustained harmonic texture (violin) · sustained-texture / sustained-texture · violin
- a composed chamber counterline with restrained jazz phrasing (violin) · third-stream-chamber-jazz / third-stream · violin
- lyrical, lightly ornamented phrases (violin) · melodic-line / lyrical-phrase · violin
- Light acoustic jazz pulse alternating with chamber-like phrasing (groove) · third-stream-chamber-jazz / third-stream · acoustic-jazz
- Subtle jazz pulse beneath composed chamber passages with room for written rubato (groove) · third-stream-chamber-jazz / third-stream · acoustic-jazz
- Acoustic Guitar (acoustic-guitar) · instrument-tone / lyrical-phrase · acoustic-guitar
- Alto Saxophone (alto-sax) · instrument-tone / lyrical-phrase · alto-sax
- Baritone Saxophone (bari-sax) · instrument-tone / lyrical-phrase · bari-sax
- Clarinet (clarinet) · instrument-tone / lyrical-phrase · clarinet
- Flugelhorn (flugelhorn) · instrument-tone / lyrical-phrase · flugelhorn
- Manouche / Selmer-style Acoustic Guitar (manouche-guitar) · instrument-tone / lyrical-phrase · manouche-guitar
- Muted Trumpet (muted-trumpet) · instrument-tone / lyrical-phrase · muted-trumpet
- Nylon-string Guitar (nylon-guitar) · instrument-tone / lyrical-phrase · nylon-guitar
- Soprano Saxophone (soprano-sax) · instrument-tone / lyrical-phrase · soprano-sax
- Tenor Saxophone (tenor-sax) · instrument-tone / lyrical-phrase · tenor-sax
- Trombone (trombone) · instrument-tone / lyrical-phrase · trombone
- Trumpet (trumpet) · instrument-tone / lyrical-phrase · trumpet
- Violin (violin) · instrument-tone / lyrical-phrase · violin

### audio-near-006 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- a very quiet sustained background texture (ambient-pads) · sustained-texture / sustained-texture · ambient-pads
- Ambient Pads (ambient-pads) · instrument-tone / lyrical-phrase · ambient-pads

### audio-near-007 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision. Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional. The previews share a semantic family but use separate canonical patterns; this is an expected family-level variation.

- a driving samba pulse with pandeiro-like shake and crisp tamborim-style accents (brazilian-percussion) · samba / samba-drive · brazilian-section
- a syncopated electric-bass line locked to straight 16th-note accents (electric-bass) · funk-groove-family / straight-16-funk · acoustic-jazz
- a warm electric-bass line supporting the downtempo broken-beat pulse (electric-bass) · broken-beat / broken-beat · acoustic-jazz
- a warm electric-bass line sitting slightly behind the beat (electric-bass) · laid-back-bass-pocket / laid-back-bass-pocket · electric-bass
- an active syncopated line driving the Brazilian samba pulse (electric-bass) · samba / samba · acoustic-jazz
- a syncopated electric-bass groove supporting a straight funk-rock pulse (electric-bass) · funk-groove-family / straight-16-funk · acoustic-jazz
- a bass line reinforcing a clear boom-bap pocket (electric-bass) · hip-hop-boom-bap / boom-bap · acoustic-jazz
- deep, warm bass support in a relaxed soul-jazz pocket (electric-bass) · bass-ostinato / bass-ostinato · electric-bass
- a deep syncopated pocket sitting slightly behind the beat (electric-bass) · laid-back-bass-pocket / laid-back-bass-pocket · electric-bass
- blues- and gospel-inflected comping (hammond-organ) · gospel-blues-comping / gospel-blues-comping · hammond-organ
- forceful backbeat with heavy fills (heavy-rock-drums) · power-rock-backbeat / power-rock-drive · power-rock
- a soft, even walking pulse (upright-bass) · walking-bass / walking-bass · upright-bass
- a repeating modal ostinato (upright-bass) · modal-bass-ostinato / modal-ostinato · upright-bass
- gentle two-feel support (upright-bass) · two-feel / two-feel · upright-bass
- a clear four-beat walking bass line (upright-bass) · walking-bass / walking-bass · upright-bass
- a flowing upright-bass pulse articulated naturally across three beats (upright-bass) · jazz-waltz / jazz-waltz · upright-bass
- Tight straight-16th funk-soul pocket with syncopated bass, crisp backbeat and clipped keyboard-guitar accents (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Relaxed straight funk-soul pocket with concise horn responses (groove) · funk-groove-family / funk · acoustic-jazz
- Driving 2-3 clave Afro-Cuban groove (groove) · latin-hand-clave / latin-hand-clave · acoustic-jazz
- Fast, propulsive bebop swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Buoyant medium swing with sectional call-and-response (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Strong four-beat swing with walking upright bass, clear ride-cymbal time and arranged ensemble punches (groove) · hard-bop-ride / hard-bop-ride · acoustic-jazz
- Light bossa-influenced rhythm (groove) · bossa / bossa · acoustic-jazz
- Brisk, lightly syncopated straight feel (groove) · straight-eighth / straight-eighth · acoustic-jazz
- Brisk, buoyant swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Subtle broken-beat rhythm (groove) · broken-beat / broken-beat · acoustic-jazz
- Very soft straight pulse beneath sparse piano phrases (groove) · straight-eighth / soft-straight · acoustic-jazz
- Gentle understated swing with the rhythm section secondary to piano phrasing (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Flexible straight-eighth pulse with occasional asymmetrical accents and responsive ensemble phrasing (groove) · contemporary-flexible-eighths / contemporary-flex · acoustic-jazz
- Light swing blended with open modern rhythmic accents (groove) · swing-timekeeping / swing-open-modern · acoustic-jazz
- Relaxed downtempo broken-beat pulse (groove) · broken-beat / broken-beat · acoustic-jazz
- Driving funk-rock pulse (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Precise straight funk-rock fusion drive (groove) · funk-groove-family / straight-16-funk · acoustic-jazz
- Driving hard-bop swing (groove) · hard-bop-ride / hard-bop-ride · acoustic-jazz
- Laid-back boom-bap pocket with a clear kick-snare relationship, lightly humanized hats and loop-like continuity (groove) · hip-hop-boom-bap / boom-bap · acoustic-jazz
- Relaxed hip-hop beat with a steady head-nodding pocket and lightly swung hats (groove) · hip-hop-half-time / boom-bap-half-time · acoustic-jazz
- Flowing jazz swing phrasing in three with ride or brushes and bass moving naturally across all three beats (groove) · jazz-waltz / jazz-waltz · acoustic-jazz
- Steady la pompe rhythm-guitar pulse (groove) · la-pompe / la-pompe · acoustic-jazz
- Syncopated, clave-informed Latin groove (groove) · latin-hand-clave / latin-hand-clave · acoustic-jazz
- Lightly syncopated funk pulse (groove) · funk-groove-family / funk · acoustic-jazz
- Light swing feel (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Relaxed, slightly behind-the-beat hip-hop-influenced pocket with soft kick and snare and restrained hi-hats (groove) · hip-hop-boom-bap / boom-bap-soft · acoustic-jazz
- Soft straight-eighth chill beat beneath relaxed jazz phrasing (groove) · straight-eighth / soft-straight · acoustic-jazz
- Energetic mambo pulse (groove) · mambo-bell-groove / mambo-bell · acoustic-jazz
- Driving acoustic manouche swing (groove) · manouche-swing / manouche-swing · acoustic-jazz
- Lively, lightly marching pulse (groove) · march / march · acoustic-jazz
- Open medium swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Repeating modal groove (groove) · modal-pulse / modal-pulse · acoustic-jazz
- Soft syncopated pocket with loose subdivisions and restrained ghost notes (groove) · neo-soul-pocket / neo-soul-loose · acoustic-jazz
- Deep laid-back 16th-note pocket slightly behind the beat with subtle displacement (groove) · neo-soul-pocket / neo-soul · acoustic-jazz
- Precise, asymmetrical groove (groove) · asymmetrical-meter / odd-meter · acoustic-jazz
- Open, user-defined groove (groove) · open / open · acoustic-jazz
- Flexible post-bop pulse (groove) · flexible-post-bop / post-bop-flex · acoustic-jazz
- Gentle, relaxed swing (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Lively samba pulse (groove) · samba / samba · acoustic-jazz
- Lively samba-derived jazz pulse with buoyant syncopated comping (groove) · samba / samba · acoustic-jazz
- Driving Brazilian samba pulse with syncopated percussion, active bass and clear forward motion (groove) · samba / samba-drive · acoustic-jazz
- Light samba-influenced pulse (groove) · samba / samba-soft · acoustic-jazz
- Blues-inflected shuffle (groove) · soul-shuffle / soul-shuffle · acoustic-jazz
- Slow, spacious ballad pulse (groove) · ballad / ballad · acoustic-jazz
- Very relaxed straight-eighth bossa groove, gently behind the beat (groove) · bossa / soft-bossa · acoustic-jazz
- Smooth, steady straight-eighth groove (groove) · straight-eighth / straight-eighth · acoustic-jazz
- Soft, lightly syncopated bossa pulse (groove) · bossa / soft-bossa · acoustic-jazz
- Gentle, syncopated jazz waltz pulse with spacious phrasing (groove) · jazz-waltz / jazz-waltz · acoustic-jazz
- Relaxed straight-eighth groove (groove) · straight-eighth / soft-straight · acoustic-jazz
- Gentle, polished swing feel (groove) · swing-timekeeping / swing-light · acoustic-jazz
- Buoyant son-inspired groove (groove) · son-clave-groove / son-clave · acoustic-jazz
- Deep, relaxed soul-jazz pocket with a blues shuffle (groove) · soul-shuffle / soul-shuffle · acoustic-jazz
- Brisk traditional swing (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Buoyant two-beat pulse (groove) · early-swing-two-beat / two-beat-early-swing · acoustic-jazz
- Up-tempo swing with walking bass (groove) · swing-timekeeping / swing-clear-eighth · acoustic-jazz
- Walking swing with steady ride-cymbal time (groove) · swing-timekeeping / swing-restrained-ride · acoustic-jazz
- Gentle chamber waltz (groove) · jazz-waltz / jazz-waltz · acoustic-jazz
- Electric Bass (electric-bass) · instrument-tone / bass-foundation · electric-bass

### audio-near-008 · ACCEPTED_EQUIVALENT

Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.

- warm, lyrical responses (clarinet) · conversational-response / conversational-response · clarinet
- long, gentle sustained responses (flugelhorn) · conversational-response / conversational-response · flugelhorn
- subtle, conversational responses (muted-trumpet) · conversational-response / conversational-response · muted-trumpet
- a strong, soulful front-line response (tenor-sax) · conversational-response / conversational-response · tenor-sax
- short conversational replies (tenor-sax) · conversational-response / conversational-response · tenor-sax
- short, warm responses (trumpet) · conversational-response / conversational-response · trumpet

### audio-near-012 · ACCEPTED_EQUIVALENT

Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.

- expressive electric-jazz improvisation with rounded single-note phrases (jazz-electric-guitar) · single-note-response / single-note-response · jazz-electric-guitar
- soft electric-guitar responses with compact extended voicings (jazz-electric-guitar) · single-note-response / single-note-response · jazz-electric-guitar
- rounded single-note phrases (jazz-electric-guitar) · single-note-response / single-note-response · jazz-electric-guitar

### audio-near-013 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- tight offbeat funk comping with clean, clipped chord accents (jazz-electric-guitar) · funk-comping / funk-comping · jazz-electric-guitar
- soft chord voicings (jazz-electric-guitar) · guitar-comping / guitar-comping · jazz-electric-guitar

### audio-near-014 · ACCEPTED_EQUIVALENT

Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.

- bright, dry single-note phrases with a crisp pick attack (manouche-guitar) · single-note-response / single-note-response · manouche-guitar
- short, nimble melodic responses (manouche-guitar) · single-note-response / single-note-response · manouche-guitar

### audio-near-015 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- open quartal voicings held across long modal harmonies (piano) · quartal-harmony / quartal-voicing · piano
- subtle sustained harmonic colour (rhodes) · sustained-texture / sustained-texture · rhodes

### audio-near-016 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- crisp syncopated comping (piano) · syncopated-comping / syncopated-comping · piano
- montuno-style syncopated comping where appropriate to the Latin sub-style (piano) · montuno / montuno · piano

### audio-near-017 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision.

- a soft, even rhythmic texture (soft-shaker) · straight-eighth / straight-eighth · soft-shaker
- subtle live percussion over the programmed broken-beat pulse (soft-shaker) · broken-beat / broken-beat · soft-shaker

### audio-near-018 · EXPECTED_VARIANT

The decoded PCM feature summary crosses the review threshold, while the generated MIDI event signatures remain structurally distinct; the PCM warning is retained for review without labeling different patterns as a semantic collision. Decoded PCM is similar for entries using the same canonical semantic family and pattern; reuse is intentional.

- free arco and pizzicato responses around a shifting pedal field (upright-bass) · free-improvisation / free-time · upright-bass
- deep low-register notes with long spaces between sparse changes (upright-bass) · sparse-bass-foundation / sparse-bass-foundation · upright-bass
- a simple, warm and restrained foundation (upright-bass) · bass-foundation / bass-foundation · upright-bass
- Restrained near-free pulse with occasional soft brush time (groove) · noir-sparse-brushes / noir-brushes · brush
- Very slow sparse brushed pulse with long stretches of negative space (groove) · noir-sparse-brushes / noir-brushes · brush

### audio-near-021 · EXPECTED_VARIANT

These instrument tones use different SoundFont presets and have a different decoded spectral timbre signature; the common neutral phrase raises the full-track similarity score.

- Acoustic Drum Kit (acoustic-drums) · instrument-tone / acoustic-kit-demo · acoustic-jazz
- Light Brazilian Percussion (brazilian-percussion) · instrument-tone / brazilian-section-demo · brazilian-section

### audio-near-022 · EXPECTED_VARIANT

These instrument tones use different SoundFont presets and have a different decoded spectral timbre signature; the common neutral phrase raises the full-track similarity score.

- Brush Drums (brush-drums) · instrument-tone / brush-sweep-demo · brush
- Timbales (timbales) · instrument-tone / timbales-tone-demo · timbales

### audio-near-023 · EXPECTED_VARIANT

These instrument tones use different SoundFont presets and have a different decoded spectral timbre signature; the common neutral phrase raises the full-track similarity score.

- Distorted Electric Guitar (distorted-guitar) · instrument-tone / lyrical-phrase · distorted-guitar
- Jazz Electric Guitar (jazz-electric-guitar) · instrument-tone / lyrical-phrase · jazz-electric-guitar

### audio-near-024 · EXPECTED_VARIANT

These instrument tones use different SoundFont presets and have a different decoded spectral timbre signature; the common neutral phrase raises the full-track similarity score.

- Piano (piano) · instrument-tone / lyrical-phrase · piano
- Rhodes (rhodes) · instrument-tone / lyrical-phrase · rhodes
- Tuba (tuba) · instrument-tone / lyrical-phrase · tuba
- Vibraphone (vibraphone) · instrument-tone / lyrical-phrase · vibraphone


The JSON report includes per-asset PCM feature signatures, exact/near spec comparisons, pair-level decoded-audio metrics, classifications, and source metadata for the development review filters.
