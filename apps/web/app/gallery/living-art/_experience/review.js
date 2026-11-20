"use strict";
(() => {
  const db = window.ART_CATALOG;
  const art = db.assets,
    at = new Map(art.map((a) => [a.id, a]));
  const main = document.querySelector("main"),
    dialog = document.querySelector("#viewer");
  const $ = (s) => document.querySelector(s);
  const e = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const slug = (s) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const getRoute = () => {
    try {
      return decodeURIComponent(location.hash.slice(1)) || "/gallery";
    } catch {
      return "/gallery";
    }
  };
  const url = (kind, id) => "#/" + kind + "/" + encodeURIComponent(id);
  const hrefArt = (id) => url("art", id);
  const chr = (n) => url("characters", slug(n));
  const coll = (n) => url("collections", slug(n));
  const links = (u, t) =>
    '<a class="textlink" href="' +
    e(u) +
    '" target="_blank" rel="noopener noreferrer">' +
    e(t) +
    " ↗︎</a>";
  const btn = (u, t, cl = "") =>
    '<a class="btn ' + cl + '" href="' + e(u) + '">' + e(t) + "</a>";
  const unique = (vs) => [...new Set(vs.filter(Boolean))];
  const image = (a, opts = "") =>
    '<img src="' +
    e(a.img) +
    '" alt="' +
    e(a.alt || a.title) +
    '" ' +
    (opts || 'loading="lazy" decoding="async"') +
    ">";
  const crumbs = (items) =>
    '<div class="crumb"><a href="#/gallery">Gallery</a>' +
    items
      .map(
        ([txt, u]) =>
          " / " + (u ? '<a href="' + e(u) + '">' + e(txt) + "</a>" : e(txt)),
      )
      .join("") +
    "</div>";
  const head = (k, t, aside = "") =>
    '<div class="headingrow"><div><p class="eyebrow">' +
    e(k) +
    "</p><h2>" +
    e(t) +
    "</h2></div>" +
    aside +
    "</div>";
  const specs = (rows) =>
    '<dl class="spec">' +
    rows
      .filter((x) => x[1] !== undefined && x[1] !== null && x[1] !== "")
      .map(([k, v]) => "<dt>" + e(k) + "</dt><dd>" + e(v) + "</dd>")
      .join("") +
    "</dl>";
  const announce = (s) => {
    $("#status").textContent = s;
  };
  function card(a) {
    const plate = a.collection === "Mythic Commons";
    return (
      '<article class="card ' +
      (plate ? "plate" : "") +
      '"><a href="' +
      hrefArt(a.id) +
      '"><div class="media">' +
      image(a) +
      '</div><p class="kicker">' +
      e(a.folio ? "Field plate " + a.folio : a.collection) +
      "</p><h3>" +
      e(a.title) +
      '</h3><p class="small">' +
      e(a.subtitle || a.canon) +
      "</p></a></article>"
    );
  }
  function grid(arr) {
    return '<div class="grid">' + arr.map(card).join("") + "</div>";
  }
  const exhibitionNotes = {
    "Mythic Commons":
      "Ten annotated field plates move between observed form and folklore reconstruction. Read from the central silhouette out to habitat, tracks and the smaller anatomical studies. The published sequence runs from 08 to 17.",
    "The Weight of Wonders":
      "Follow a river through a storm-bird’s orchard, an inhabited dam and a sanctuary that keeps the names of its refugees. Each place survives by passing a cost downstream.",
    "Firstlight II":
      "Each subject appears twice, once through a character sheet and once through an action. The paired views let a reviewer test whether a gesture, an item of equipment or a silhouette survives the change of camera.",
    "Arcanea Records":
      "Listen on the source platform. Cover design, master audio and distribution permissions each have their own review record.",
  };
  function exhibitionCard(id, name, copy, u) {
    const a = at.get(id);
    if (!a) return "";
    return (
      '<a class="feature ' +
      (a.folio ? "print" : "") +
      '" href="' +
      e(u) +
      '">' +
      image(a) +
      '<p class="eyebrow">' +
      e(copy) +
      "</p><h3>" +
      e(name) +
      "</h3></a>"
    );
  }
  function gallery() {
    const hero = at.get("glassroot-sepulchre");
    return (
      '<section class="hero">' +
      image(hero, 'fetchpriority="high" decoding="async"') +
      '<div class="veil"></div><div><p class="eyebrow">Arcanea &nbsp; / &nbsp; Curatorial review</p><h1>The Living<br>Art Collection</h1><p class="byline">' +
      e(
        "A nursery grows inside a forest sepulchre. Follow its roots from the landscape into the creature study.",
      ) +
      '</p><div class="action">' +
      btn(hrefArt(hero.id), "View the artwork ↗︎", "light") +
      '</div></div><a class="caption" href="' +
      hrefArt(hero.id) +
      '">' +
      e(hero.title) +
      " · " +
      e(hero.canon) +
      '</a></section><div class="strip"><span class="eyebrow">The exhibition index</span><a href="#/inventory">' +
      art.length +
      ' visual records &nbsp; / &nbsp; Open master contact sheet ↗︎</a></div><section class="wrap">' +
      head(
        "On view",
        "Selected exhibitions",
        btn("#/inventory", "Browse all artwork"),
      ) +
      '<div class="featuregrid">' +
      exhibitionCard(
        "storm-orchard",
        "The Weight of Wonders",
        "Worlds & environments",
        coll("The Weight of Wonders"),
      ) +
      exhibitionCard(
        "kelpie",
        "Mythic Commons",
        "Natural history · 10 plates",
        coll("Mythic Commons"),
      ) +
      exhibitionCard(
        "fl02-seli-hero",
        "Seli",
        "Living characters · Firstlight II",
        chr("Seli"),
      ) +
      '</div></section><section class="wrap">' +
      head("From the collection", "Place and creature") +
      grid(
        [
          "glassroot-sepulchre",
          "glassroot-hunger",
          "spawning-stair",
          "tharvoss",
        ].map((v) => at.get(v)),
      ) +
      "</section>"
    );
  }
  let filters = {},
    expanded = false;
  const dims = (a) =>
    Math.max(a.width, a.height) >= 2000
      ? "2000 px and above"
      : Math.max(a.width, a.height) >= 1500
        ? "1500–1999 px"
        : "Below 1500 px";
  const grade = (a) =>
    a.score == null
      ? "Unscored"
      : a.score / (a.scoreMax || 20) >= 0.9
        ? "90% and above"
        : "Below 90%";
  const fields = [
    ["group", "Subject group", (a) => a.group],
    ["provider", "Source", (a) => a.provider],
    ["collection", "Collection", (a) => a.collection],
    ["characters", "Character", (a) => a.characters],
    ["world", "World or setting", (a) => a.world],
    ["rights", "Rights", (a) => a.rights],
    ["canon", "Canon status", (a) => a.canon],
    ["resolution", "Resolution · long edge", dims],
    ["quality", "Artistic quality", grade],
    ["readiness", "Commercial readiness", (a) => a.readiness],
  ];
  function inventory() {
    const widget = ([key, label, get]) => {
      const vals = unique(art.flatMap((a) => get(a) || [])).sort();
      return (
        "<label>" +
        e(label) +
        '<select aria-label="' +
        e(label) +
        '" data-filter="' +
        key +
        '"><option value="">All</option>' +
        vals
          .map(
            (v) =>
              "<option " +
              (v === filters[key] ? "selected" : "") +
              ">" +
              e(v) +
              "</option>",
          )
          .join("") +
        "</select></label>"
      );
    };
    return (
      '<section class="wrap"><div class="intro"><p class="eyebrow">Collection index</p><h1>Master contact sheet</h1><p class="lede">Browse the recovered artwork by subject, source and review state. Open a work for its original record, lineage and use permissions.</p></div><div class="tools"><label class="searchfield">Search the inventory<input type="search" id="search" placeholder="Title, subject, collection…" value="' +
      e(filters.search || "") +
      '"></label>' +
      widget(fields[0]) +
      '<button id="morefilters" aria-controls="filters" aria-expanded="' +
      expanded +
      '">' +
      (expanded ? "Hide filters" : "More filters") +
      '</button><button id="clear">Reset</button></div><div class="filters" id="filters" ' +
      (expanded ? "" : "hidden") +
      ">" +
      fields.slice(1).map(widget).join("") +
      '</div><div id="inventory-results"></div></section>'
    );
  }
  function results() {
    const filtered = art.filter((a) => {
      if (
        filters.search &&
        ![a.title, a.subtitle, a.desc, a.collection, ...a.entities]
          .join(" ")
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;
      return fields.every(
        ([k, , get]) =>
          !filters[k] || [].concat(get(a) || []).includes(filters[k]),
      );
    });
    const groups = db.groups
      .map((g, i) => {
        const aa = filtered.filter((a) => a.group === g);
        return aa.length
          ? '<section class="inventory-section"><div class="sectionhead"><h2>' +
              e(db.shortNames[i]) +
              "</h2><span>" +
              aa.length +
              " " +
              (aa.length === 1 ? "work" : "works") +
              "</span></div>" +
              grid(aa) +
              "</section>"
          : "";
      })
      .join("");
    $("#inventory-results").innerHTML =
      '<p class="summary" aria-live="polite">' +
      filtered.length +
      " of " +
      art.length +
      " records · " +
      unique(filtered.map((a) => a.group)).length +
      " subject groups</p>" +
      (groups ||
        '<div class="empty"><h3>No matching works</h3><p class="muted">Clear a filter or search for another title.</p><button data-action="reset">Clear filters</button></div>');
  }
  function collection(id) {
    const works = art.filter((a) => slug(a.collection) === id);
    if (!works.length) return missing();
    const n = works[0].collection,
      lead = at.get(
        n === "Mythic Commons"
          ? "kelpie"
          : n === "The Weight of Wonders"
            ? "storm-orchard"
            : n === "Firstlight II"
              ? "fl02-seli-hero"
              : works[0].id,
      );
    return (
      '<section class="wrap">' +
      crumbs([[n]]) +
      '<div class="exlead"><div><p class="eyebrow">' +
      (n === "Mythic Commons"
        ? "Field archive &nbsp; / &nbsp; Volume 01"
        : "Collection exhibition") +
      "</p><h1>" +
      e(n) +
      '</h1><p class="lede">' +
      e(
        exhibitionNotes[n] ||
          "Source-backed works from the collection, presented with their recorded review state.",
      ) +
      "</p>" +
      btn(hrefArt(lead.id), "Open featured work ↗︎", "light") +
      '<div class="meta-grid"><div><small>Works</small><b>' +
      works.length +
      '</b></div><div><small>Access</small><b>Review exhibition</b></div><div><small>Editions</small><b>On hold</b></div></div></div><figure class="plinth">' +
      image(lead, 'fetchpriority="high"') +
      '</figure></div></section><section class="wrap">' +
      head(
        n === "Mythic Commons" ? "Plates 08–17" : "Exhibition checklist",
        n === "Mythic Commons" ? "The illustrated bestiary" : "All works",
      ) +
      grid(works) +
      '</section><section class="wrap"><div class="editionbox"><div><p class="eyebrow">Collector edition</p><h2>' +
      e(
        n === "Mythic Commons" ? "The founding field folio" : "Edition review",
      ) +
      '</h2></div><div><p class="muted">' +
      e(
        n === "Mythic Commons"
          ? "Proposed as a digital field folio with ten annotated plates, mobile layouts and a personal-use license. Art-specific rights, printed copy and the final customer package await sign-off."
          : "This exhibition has no verified saleable edition in the review projection.",
      ) +
      '</p><p class="section-note">Checkout locked · No editions issued</p></div></div></section>'
    );
  }
  function artwork(id) {
    const a = at.get(id);
    if (!a) return missing();
    const others = a.related?.length
      ? a.related.map((x) => at.get(x)).filter(Boolean)
      : art
          .filter((b) => b.id !== a.id && b.collection === a.collection)
          .slice(0, 4);
    const charlinks = a.characters
      .filter(canProfile)
      .map((v) => btn(chr(v), v + " ↗︎"))
      .join("");
    const isTrack = a.provider === "Suno";
    return (
      '<section class="wrap">' +
      crumbs([[a.collection, coll(a.collection)], [a.title]]) +
      '<div class="detail"><div><figure class="artstage">' +
      image(a, 'fetchpriority="high"') +
      '</figure><div class="artcap"><span>' +
      e(
        (a.folio ? "Plate " + a.folio + " / " : "") +
          a.width +
          " × " +
          a.height +
          " · " +
          a.format,
      ) +
      '</span><button data-action="zoom" data-id="' +
      e(a.id) +
      '">Enlarge artwork ⤢</button></div>' +
      (a.video
        ? '<div class="block"><p class="eyebrow">Motion study · 4 seconds · silent</p><video preload="none" playsinline controls poster="' +
          e(a.img) +
          '" src="' +
          e(a.video) +
          '" aria-label="Four-second cinematic instrument hall study"></video></div>'
        : "") +
      '</div><article><p class="eyebrow">' +
      e(a.collection) +
      (a.folio ? " &nbsp; / &nbsp; Plate " + e(a.folio) : "") +
      "</p><h1>" +
      e(a.title) +
      '</h1><p class="lede">' +
      e(a.subtitle || a.desc) +
      "</p>" +
      (!a.subtitle ? "" : '<p class="small muted">' + e(a.desc) + "</p>") +
      '<div class="slab"><span class="badge">' +
      e(a.canon) +
      "</span>" +
      specs([
        ["Source", a.provider],
        ["Use permission", a.rights],
        ["Edition", "On hold"],
        [
          "Credit",
          a.credit ||
            (isTrack ? "@frankx · recording" : "Individual credit unverified"),
        ],
        [
          "Collection fit",
          a.score != null
            ? a.score + " / " + (a.scoreMax || 20) + " · curatorial review"
            : null,
        ],
      ]) +
      links(
        a.source,
        isTrack ? "Listen on Suno" : a.sourceLabel || "Open source record",
      ) +
      "</div>" +
      (charlinks
        ? '<div class="slab"><p class="label">Connected characters</p><div class="actions">' +
          charlinks +
          "</div></div>"
        : "") +
      '</article></div></section><section class="wrap"><div class="subsection">' +
      head("Reading the work", "Curator’s file") +
      '<p class="lede">' +
      e(
        a.review ||
          a.reading ||
          a.story ||
          "The source records the work at its current stage. Art direction and edition clearance are reviewed independently.",
      ) +
      "</p>" +
      (a.story ? '<p class="muted">' + e(a.story) + "</p>" : "") +
      (a.lore
        ? '<div class="panel block"><p class="eyebrow">Folklore reading card</p><h3>' +
          e(a.lore.heading) +
          '</h3><p class="lede">' +
          e(a.lore.text) +
          "</p>" +
          links(a.lore.source, a.lore.sourceLabel) +
          "</div>"
        : "") +
      "<details><summary>Provenance &amp; rights</summary>" +
      specs([
        ["Source ID", a.assetId || a.id],
        ["Version", a.version || "Not recorded"],
        ["Generator", a.generator || "Not recorded"],
        ["Image model", a.model || "Not recorded"],
        ["Observed SHA-256", a.sha],
        [
          "Parent references",
          (a.parentIds || []).join(" · ") || "Not recorded",
        ],
        [
          "Rights evidence",
          a.evidence ||
            "Source item available. A license permitting commercial use has not been verified.",
        ],
        ["Audio model", a.trackModel],
        ["Entities", (a.entities || []).join(", ")],
      ]) +
      '</details><details><summary>Production prompt</summary><p class="prompt">' +
      e(a.prompt || "No verified image prompt accompanies this record.") +
      "</p></details></div></section>" +
      (others.length
        ? '<section class="wrap">' +
          head("In context", "Related works") +
          grid(others.slice(0, 4)) +
          "</section>"
        : "")
    );
  }
  function canProfile(n) {
    return !!db.people[slug(n)] || art.some((a) => a.characters.includes(n));
  }
  function profile(id) {
    const fc = db.people[id];
    const items = art.filter((a) => a.characters.some((n) => slug(n) === id));
    if (!items.length) return missing();
    const lead =
      items.find((a) => a.id === id + "-v2") ||
      items.find((a) => a.id === id) ||
      items.find((a) => a.id.endsWith("-hero")) ||
      items[0];
    const name = fc?.title || lead.characters.find((n) => slug(n) === id);
    const relationships = fc
      ? fc.relationships.map((r) => [
          r.target_character_id.split(":").pop(),
          r.relation,
        ])
      : unique(
          items.flatMap((a) => a.characters.filter((n) => n !== name)),
        ).map((n) => [
          n,
          "Appears together in " +
            items.find((a) => a.characters.includes(n)).title +
            ".",
        ]);
    return (
      '<section class="wrap">' +
      crumbs([["Living characters"], [name]]) +
      '<div class="exlead"><div><p class="eyebrow">Living character &nbsp; / &nbsp; ' +
      e(fc?.canon || "World Bible staging") +
      "</p><h1>" +
      e(name) +
      '</h1><p class="lede">' +
      e(fc?.bio || lead.desc) +
      "</p>" +
      btn(hrefArt(lead.id), "Inspect identity reference ↗︎", "light") +
      '<div class="slab">' +
      specs([
        ["Source entity", fc?.entity || lead.assetId],
        ["Work or role", fc?.place || lead.world],
        ["Visual state", lead.canon],
      ]) +
      '</div></div><figure class="plinth">' +
      image(lead, 'fetchpriority="high"') +
      '</figure></div></section><section class="wrap">' +
      head("Character dossier", "Relationships & presence") +
      '<div class="editionbox"><div><p class="eyebrow">Disposition</p><p class="lede">' +
      e(fc?.persona || lead.review || lead.desc) +
      '</p></div><div><p class="eyebrow">Recorded connections</p>' +
      (relationships.length
        ? relationships
            .map(
              ([n, r]) =>
                '<p class="small">' +
                (canProfile(n)
                  ? '<a class="textlink" href="' + chr(n) + '">' + e(n) + "</a>"
                  : e(n)) +
                " · " +
                e(r) +
                "</p>",
            )
            .join("")
        : '<p class="muted">No relationship edge was supplied with this plate.</p>') +
      '</div></div></section><section class="wrap">' +
      head("Visual continuity", "Reference & appearances") +
      grid(items) +
      '</section><section class="wrap"><details><summary>Voice, chat &amp; owned editions</summary><p class="section-note">This projection carries no voice release, runtime grant or customer entitlement for ' +
      e(name) +
      ". Profile actions remain limited to the recorded artwork.</p></details></section>"
    );
  }
  function missing() {
    return (
      '<section class="wrap"><p class="eyebrow">Collection index</p><h1>Work unavailable</h1><p class="lede">This record is outside the current review projection.</p>' +
      btn("#/inventory", "Return to the contact sheet") +
      "</section>"
    );
  }
  let atlasZoom = 1,
    atlasFocus = "glassroot-sepulchre",
    atlasSet = "wonders",
    atlasX = 0,
    atlasY = 0;
  function graph() {
    const nodes = [],
      edges = [];
    const pairs = [
      ["glassroot-sepulchre", "glassroot-hunger"],
      ["spawning-stair", "tharvoss"],
      ["brine-tribunal", "othrek"],
    ];
    pairs.forEach(([place, who], i) => {
      nodes.push(
        [place, at.get(place).title, "Location", 136, 50 + i * 105, place],
        [who, at.get(who).title, "Subject", 500, 50 + i * 105, who],
      );
      edges.push([place, who, "paired encounter"]);
    });
    return { nodes, edges };
  }
  function atlas() {
    const { nodes, edges } = graph(),
      focus = nodes.find((n) => n[0] === atlasFocus) || nodes[0];
    atlasFocus = focus[0];
    const byId = Object.fromEntries(nodes.map((n) => [n[0], n]));
    const edgesMarkup = edges
      .map(
        ([a, b]) =>
          '<line x1="' +
          byId[a][3] +
          '" y1="' +
          byId[a][4] +
          '" x2="' +
          byId[b][3] +
          '" y2="' +
          byId[b][4] +
          '"/>',
      )
      .join("");
    const nodesMarkup = nodes
      .map(
        ([id, name, type, x, y]) =>
          '<g transform="translate(' +
          x +
          " " +
          y +
          ')" role="button" tabindex="0" aria-label="' +
          e(name + " · " + type) +
          '" data-node="' +
          id +
          '" class="' +
          (id === focus[0] ? "selected" : "") +
          '"><circle r="9"/><text y="-16" class="nodemark" text-anchor="middle">' +
          e(type.toUpperCase()) +
          '</text><text y="28" text-anchor="middle">' +
          e(name) +
          "</text></g>",
      )
      .join("");
    const a = at.get(focus[5]);
    const rows = edges
      .filter((x) => x[0] === focus[0] || x[1] === focus[0])
      .map(
        ([x, y, r]) =>
          "<li>" + e(byId[x][1] + " → " + r + " → " + byId[y][1]) + "</li>",
      )
      .join("");
    const width = 680 / atlasZoom,
      height = 360 / atlasZoom;
    const vb = [
      (680 - width) / 2 + atlasX,
      (360 - height) / 2 + atlasY,
      width,
      height,
    ].join(" ");
    return (
      '<section class="wrap"><div class="intro"><p class="eyebrow">Living world atlas</p><h1>Places & connections</h1><p class="lede">Select a place, subject or work to see the source relationship that joins them.</p></div><div class="tools"><label>Exhibition<select id="atlas-set">' +
      "" +
      '<option value="wonders" ' +
      (atlasSet === "wonders" ? "selected" : "") +
      '>The Weight of Wonders</option></select></label></div><div class="atlaslayout"><div><div class="atlas-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="fit">Fit all</button><button data-pan="-60,0" aria-label="Pan left">←</button><button data-pan="60,0" aria-label="Pan right">→</button><button data-pan="0,-40" aria-label="Pan up">↑</button><button data-pan="0,40" aria-label="Pan down">↓</button></div><svg class="map" viewBox="' +
      vb +
      '" role="group" aria-label="Navigable source relationships. A text list follows.">' +
      edgesMarkup +
      nodesMarkup +
      '</svg><details open><summary>Browse as a list</summary><div class="node-list">' +
      nodes
        .map(
          (n) =>
            '<button data-node="' +
            n[0] +
            '" aria-pressed="' +
            (n[0] === focus[0]) +
            '">' +
            e(n[1]) +
            "</button>",
        )
        .join("") +
      '</div></details></div><div class="panel atlas-info">' +
      (a
        ? '<img class="node-preview" src="' +
          e(a.img) +
          '" alt="' +
          e(a.alt) +
          '">'
        : "") +
      '<p class="eyebrow">' +
      e(focus[2]) +
      "</p><h3>" +
      e(focus[1]) +
      '</h3><ul class="small">' +
      rows +
      "</ul>" +
      (a
        ? btn(hrefArt(a.id), "Inspect artwork ↗︎")
        : '<p class="small muted">Location named in the scene record. A standalone approved map is pending.</p>') +
      "</div></div></section>"
    );
  }
  const STORE = "arcanea.living-art.briefs.v1";
  let queue = [];
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "[]");
    if (Array.isArray(v))
      queue = v.filter(
        (x) =>
          x &&
          typeof x.id === "string" &&
          typeof x.prompt === "string" &&
          at.has(x.subject) &&
          at.has(x.partner) &&
          ["Draft", "Recommended for review"].includes(x.state),
      );
  } catch {}
  let selected = "kelpie",
    comparison = "phoenix",
    buffer = "",
    studioMessage = "";
  function choose(id, target) {
    return (
      '<label class="field">' +
      e(target === "subject" ? "Source artwork" : "Comparison artwork") +
      '<select id="studio-' +
      target +
      '">' +
      art
        .map(
          (a) =>
            '<option value="' +
            e(a.id) +
            '" ' +
            (a.id === id ? "selected" : "") +
            ">" +
            e(a.title + " · " + a.collection) +
            "</option>",
        )
        .join("") +
      "</select></label>"
    );
  }
  function studio() {
    const a = at.get(selected),
      b = at.get(comparison);
    return (
      '<section class="wrap"><div class="intro"><p class="eyebrow">Creator visual studio</p><h1>Reference desk</h1><p class="lede">Compare source images and prepare a generation brief. Saved briefs stay in this browser until you export them.</p></div><div class="workgrid block"><section class="panel"><p class="eyebrow">Work order</p><h3>Prepare a brief</h3>' +
      choose(selected, "subject") +
      choose(comparison, "partner") +
      '<label class="field">Creative direction<textarea id="brief" maxlength="12000" placeholder="Describe the decision in the scene, the identity anchors and the intended use.">' +
      e(buffer) +
      '</textarea></label><div class="actions"><button data-action="queue">Save draft</button><button data-action="sourceprompt" ' +
      (!a.prompt ? "disabled" : "") +
      '>Use source prompt</button></div><p class="section-note" role="status">' +
      e(studioMessage) +
      '</p></section><section><div class="compare">' +
      [a, b]
        .map(
          (x) =>
            "<figure>" +
            image(x) +
            "<figcaption>" +
            e(x.title) +
            "<br>" +
            e(x.canon) +
            "</figcaption></figure>",
        )
        .join("") +
      '</div><div class="slab">' +
      specs([
        ["Reference", a.assetId || a.id],
        ["Rights", a.rights],
        ["Related entities", a.entities.join(", ") || "No linked entity"],
        ["Context", a.review || a.desc],
      ]) +
      links(a.source, "Inspect production source") +
      '</div><details><summary>Review &amp; publishing</summary><p class="small muted">A recommendation travels with the reference IDs, digests and creation brief. Generation, canon approval, commercial release and publishing require the owning production systems.</p></details></section></div><section class="block">' +
      head(
        "Local review queue",
        queue.length + " saved " + (queue.length === 1 ? "brief" : "briefs"),
        '<button data-action="export" ' +
          (!queue.length ? "disabled" : "") +
          ">Export queue JSON</button>",
      ) +
      (queue.length
        ? queue
            .map(
              (q) =>
                '<div class="queue-row"><p class="eyebrow">' +
                e(q.state) +
                "</p><h3>" +
                e(at.get(q.subject).title) +
                '</h3><p class="small">' +
                e(q.prompt) +
                '</p><div class="actions">' +
                (q.state === "Draft"
                  ? '<button data-recommend="' +
                    e(q.id) +
                    '">Recommend for review</button>'
                  : "") +
                '<button data-remove="' +
                e(q.id) +
                '">Remove local draft</button></div></div>',
            )
            .join("")
        : '<p class="section-note">No saved briefs yet. Choose an artwork and describe the intended change.</p>') +
      "</section></section>"
    );
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(queue));
      return true;
    } catch {
      studioMessage =
        "Browser storage is unavailable. Export the queue before closing this page.";
      return false;
    }
  }
  function refresh() {
    render(false);
  }
  function render(move = true) {
    const [section = "gallery", id = ""] = getRoute()
      .replace(/^\//, "")
      .split("/");
    let html;
    switch (section) {
      case "gallery":
        html = gallery();
        break;
      case "inventory":
        html = inventory();
        break;
      case "collections":
        html = collection(id);
        break;
      case "art":
        html = artwork(id);
        break;
      case "characters":
        html = profile(id);
        break;
      case "atlas":
        html = atlas();
        break;
      case "studio":
        html = id === "visual" ? studio() : missing();
        break;
      default:
        html = missing();
    }
    main.innerHTML = html;
    if (section === "inventory") results();
    document.querySelectorAll(".top a").forEach((l) => {
      l.removeAttribute("aria-current");
      if (l.getAttribute("href").split("/")[1] === section)
        l.setAttribute("aria-current", "page");
    });
    document.title =
      (main.querySelector("h1")?.textContent || "Collection") + " · Arcanea";
    if (move) {
      if (dialog.open) dialog.close();
      window.scrollTo({ top: 0, behavior: "instant" });
      main.focus({ preventScroll: true });
    }
  }
  function rerenderFocus(selector) {
    refresh();
    const target = selector && document.querySelector(selector);
    if (target) target.focus({ preventScroll: true });
  }
  function resetFilters() {
    filters = {};
    expanded = false;
    rerenderFocus("#search");
  }
  function zoom(id) {
    const a = at.get(id);
    if (!a) return;
    $("#zoom-title").textContent = a.title;
    $(".zoomstage").classList.remove("enlarged");
    $(".zoomstage").innerHTML = image(a, 'decoding="async"');
    $("#zoom-toggle").textContent = "Zoom in";
    dialog.showModal();
  }
  document.addEventListener(
    "error",
    (ev) => {
      const el = ev.target;
      if (el.tagName === "IMG") {
        const fallback = document.createElement("span");
        fallback.className = "imgfail";
        fallback.textContent = "Image unavailable · " + el.alt;
        el.replaceWith(fallback);
      }
    },
    true,
  );
  document.addEventListener("click", (ev) => {
    if (ev.target.closest("a.skip")) {
      ev.preventDefault();
      main.focus();
      return;
    }
    const b = ev.target.closest("button,[data-node]");
    if (!b) return;
    if (b.id === "morefilters") {
      expanded = !expanded;
      $("#filters").hidden = !expanded;
      b.setAttribute("aria-expanded", String(expanded));
      b.textContent = expanded ? "Hide filters" : "More filters";
      return;
    }
    if (b.id === "clear" || b.dataset.action === "reset") {
      resetFilters();
      return;
    }
    if (b.id === "close-viewer") {
      dialog.close();
      return;
    }
    if (b.id === "full-view") {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (dialog.requestFullscreen) {
        dialog
          .requestFullscreen()
          .catch(() => announce("Fullscreen unavailable in this browser."));
      }
      return;
    }
    if (b.id === "zoom-toggle") {
      const enlarged = $(".zoomstage").classList.toggle("enlarged");
      b.textContent = enlarged ? "Fit to screen" : "Zoom in";
      return;
    }
    if (b.dataset.node) {
      atlasFocus = b.dataset.node;
      rerenderFocus('button[data-node="' + atlasFocus + '"]');
      return;
    }
    if (b.dataset.pan) {
      const [x, y] = b.dataset.pan.split(",").map(Number);
      atlasX = Math.max(-240, Math.min(240, atlasX + x));
      atlasY = Math.max(-140, Math.min(140, atlasY + y));
      rerenderFocus('button[data-pan="' + b.dataset.pan + '"]');
      return;
    }
    if (b.dataset.recommend || b.dataset.remove) {
      const id = b.dataset.recommend || b.dataset.remove;
      if (b.dataset.recommend) {
        const item = queue.find((q) => q.id === id);
        if (item) item.state = "Recommended for review";
      } else {
        queue = queue.filter((q) => q.id !== id);
      }
      save();
      refresh();
      return;
    }
    switch (b.dataset.action) {
      case "zoom":
        zoom(b.dataset.id);
        break;
      case "zoom-in":
      case "zoom-out":
        atlasZoom = Math.max(
          0.75,
          Math.min(
            2,
            atlasZoom + (b.dataset.action === "zoom-in" ? 0.25 : -0.25),
          ),
        );
        rerenderFocus('[data-action="' + b.dataset.action + '"]');
        break;
      case "fit":
        atlasZoom = 1;
        atlasX = 0;
        atlasY = 0;
        rerenderFocus("[data-action=fit]");
        break;
      case "sourceprompt":
        buffer = at.get(selected).prompt || "";
        $("#brief").value = buffer;
        $("#brief").focus();
        break;
      case "queue":
        if (!buffer.trim()) {
          studioMessage = "Add creative direction to save this brief.";
          rerenderFocus("#brief");
          return;
        }
        queue.unshift({
          id:
            globalThis.crypto?.randomUUID?.() ||
            String(Date.now()) + Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
          subject: selected,
          partner: comparison,
          sourceId: at.get(selected).assetId,
          sourceSha256: at.get(selected).sha,
          comparisonSha256: at.get(comparison).sha,
          prompt: buffer.trim(),
          state: "Draft",
          canonApproval: null,
          commercialGrant: null,
        });
        buffer = "";
        studioMessage = "Draft saved to the local queue.";
        save();
        refresh();
        break;
      case "export": {
        const link = document.createElement("a");
        const uri = URL.createObjectURL(
          new Blob(
            [
              JSON.stringify(
                { schema: "arcanea.visual-review-briefs/1", queue },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
        );
        link.href = uri;
        link.download = "Arcanea-Visual-Review-Briefs.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(uri), 3000);
        announce("Review queue exported.");
        break;
      }
    }
  });
  document.addEventListener("keydown", (ev) => {
    const n = ev.target.closest("svg [data-node]");
    if (n && (ev.key === "Enter" || ev.key === " ")) {
      ev.preventDefault();
      atlasFocus = n.dataset.node;
      rerenderFocus('button[data-node="' + atlasFocus + '"]');
    }
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "search") {
      filters.search = ev.target.value;
      results();
    }
    if (ev.target.id === "brief") buffer = ev.target.value;
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.filter) {
      filters[el.dataset.filter] = el.value;
      results();
    }
    if (el.id === "atlas-set") {
      atlasSet = el.value;
      atlasFocus = "glassroot-sepulchre";
      atlasZoom = 1;
      atlasX = atlasY = 0;
      rerenderFocus("#atlas-set");
    }
    if (el.id === "studio-subject" || el.id === "studio-partner") {
      if (el.id.endsWith("subject")) selected = el.value;
      else comparison = el.value;
      rerenderFocus("#" + el.id);
    }
  });
  window.addEventListener("hashchange", () => render());
  render(false);
})();
