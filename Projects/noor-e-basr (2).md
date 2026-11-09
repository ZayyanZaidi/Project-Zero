# Project: Noor-e-Basr (نُورِ بَصَر)

*Architecture, Technical Evaluation & System Audit*

---

## 🏛 System Architecture & Stack

### 1. Platform & Framework
* **Target Platforms:** Cross-Platform Mobile (Android standalone APK / EAS, iOS) and Progressive Web Application (PWA).
* **Framework:** React Native `0.88.1`, React `19.3.0`, Expo SDK `58.0.23` with file-based routing via `expo-router` v58.
* **Language & Typing:** TypeScript `6.0.3` with strict typing across optotype calculations, plate loaders, and clinical state trees.

### 2. Dual-AI Diagnostic Engine Partition
* **YOLO Vision Computer Vision Path:**
  * High-throughput local/edge neural evaluation for Cataract Pupillary Retro-Illumination reflex analysis.
  * Amsler Grid distortion detection (Age-Related Macular Degeneration triage).
  * Real-time Tumbling-E optotype gaze/orientation detection.
  * Payloads formatted via direct `base64` image streams (preventing local file URI permission degradation).
* **Clinical Decision & Logic Path:**
  * Algorithmic triage for Diplopia (monocular vs. binocular cranial nerve palsy screening).
  * 12-Spoke Radial Clock Fan Dial evaluation for astigmatic corneal asymmetry.
  * Ishihara-style Color Vision triage across red-green, blue-yellow, and purple-teal axes.

### 3. Distance Calibration & Optometric Precision Engine
* **Focal Distance Standards:** Real-time distance enforcement (40 cm for near-vision optotypes, 200 cm for distance vision charts).
* **Calibration Pipeline:** Front-facing optical reticle tracking Interpupillary Distance (IPD) to compute millimeter-to-screen-pixel ratios dynamically based on device DPI.

### 4. Color Vision Screening Engine (`noor-plates-v1`)
* **Procedural Plate Generation:** Custom Python generator (`tools/plates/generate_plates.py`) utilizing circle-packing algorithms (`Pillow`, `numpy`) producing 24 original plates across demo, red-green, blue-yellow, and purple-teal families under CC BY 4.0 license.
* **Runtime Plate Loader:** Seeded per-session randomization, typed plate metadata (`plates.json`), and dynamic 4-choice distractor generation.

### 5. Backend, Persistence & Offline Resilience
* **Cloud Infrastructure:** Supabase PostgreSQL database, Supabase Auth with persistent AsyncStorage session token caching, and Supabase Storage.
* **Offline-First Guarantee:** Full local cache fallback via `@react-native-async-storage/async-storage` ensuring all 6 screening modules operate seamlessly in low-connectivity rural health clinics.
* **Localization:** Full tri-lingual support (English, Urdu, Roman Urdu) via `i18next` with high-contrast optotype accessibility themes.

---

## 📈 Recent Technical Commits & Audit Trail
* `2b07365`: Expo SDK 58 alignment, package dependency harmonization, and `app.json` splash schema validation.
* `8c6f886`: Fixed AI model inference by guaranteeing direct base64 image data payload transmission rather than ephemeral file URIs.
* `7a1aefa`: Streamlined clinical report summary modal, scrubbed proprietary model strings, and enforced right-eye-first clinical testing protocol.
* `b747ecb`: Direct embedded PDF clinical report generation, condition checklist widget, and hands-free voice input integration.
