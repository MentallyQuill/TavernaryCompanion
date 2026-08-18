const marker = document.createElement("span");
marker.dataset.tavernaryHarmlessFixture = "";
marker.textContent = "Harmless Tavernary acceptance fixture loaded";
document.querySelector("#extensionsMenu")?.append(marker);
console.info("[tavernary-harmless-fixture] initialized");
