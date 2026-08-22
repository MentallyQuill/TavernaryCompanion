# TavernKeeper and the catalog

Companion can look a lot like Tavernary.org because it uses the same public catalog information. The important difference is how it works.

## Companion is not an iframe

Companion is a native SillyTavern extension. Its Projects, Kits, and Installed screens are rendered by Companion inside SillyTavern.

It does not put Tavernary.org inside an HTML iframe, show a hidden Tavernary.org page, or run Tavernary.org's website as its user interface. That is why Companion can also read your local Installed extensions, manage your Kits, and use SillyTavern for install and update actions.

## What TavernKeeper is

TavernKeeper is a separate checking service. It examines a particular version of a project and publishes evidence about that version.

The evidence can tell you which version was checked, when it was checked, and where to read the report. It is useful information, but it is not a guarantee that a project is safe or that you will like it.

Companion shows two separate facts. **Low concern observed** describes what TavernKeeper found in the code it analyzed. **Scan incomplete** means parts of the JavaScript or TypeScript analysis did not finish, so the result does not cover everything. An incomplete low-concern result stays informational rather than blocking an install, but Companion does not present it as a complete check.

Companion does not run the TavernKeeper check itself. It shows the TavernKeeper information that Tavernary publishes with the project.

## What Tavernary.org publishes

Tavernary.org publishes a public catalog as JSON at:

[`https://tavernary.org/catalog/tavernary-catalog-v8.json`](https://tavernary.org/catalog/tavernary-catalog-v8.json)

That JSON contains the catalog information Companion needs for its Projects view, including project descriptions, install information, version information, and available TavernKeeper summaries or report links.

## What Companion does

When Companion refreshes the catalog, it requests that JSON file and reads it. Companion then turns the catalog data into its own SillyTavern screens and actions:

- search and filter Projects;
- show project details and links;
- show TavernKeeper evidence and version choices;
- offer install or update actions when the project and host allow them.

Companion uses SillyTavern to learn what is installed and to carry out actions. The catalog tells Companion what has been published; SillyTavern tells Companion what is present in your profile.

In one sentence: **Tavernary.org publishes the catalog JSON, TavernKeeper supplies version-check evidence that appears in that catalog, and Companion reads the JSON to provide a native SillyTavern experience.**
