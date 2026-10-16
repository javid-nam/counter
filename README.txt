COUNTER ARENA — desert arena update

Files:
- index.html : game menu and HUD
- style.css  : responsive desktop/mobile layout
- game.js    : offline game logic and Canvas rendering

Update notes:
- Reworked the arena into clearer long lanes and connected courtyards inspired by classic desert tactical maps (original layout, not an exact recreation of a commercial map).
- Reworked enemy sprites to read more like human-shaped tactical game characters, with articulated limbs, layered clothing, headgear, walking motion, and ground shadows.
- Improved desert sky, sand-tone walls, and wall shading.
- Repositioned the first-person held device toward the center/reticle and changed it to a fictional stylized sci-fi device rather than a realistic firearm model.
- Existing mobile HUD and offline gameplay remain in place.

Run:
Open index.html in a modern browser. Desktop mouse-look works best with a browser that supports Pointer Lock. On mobile, use the on-screen joystick and buttons.

Limitations:
This remains a lightweight 2.5D Canvas raycaster, not a true 3D engine. Character silhouettes and the environment are drawn sprites, not 3D scanned models. No complete browser playtest is claimed; JavaScript syntax and ZIP integrity are checked.
