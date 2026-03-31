# Gardian

**Gardian** ist eine Web-App zur Verwaltung und Pflege von Pflanzensammlungen – gebaut ohne Frameworks, ohne Overhead, ohne Kompromisse.

## Philosophie

Gardian setzt bewusst auf **Vanilla JS, PHP und MySQL** – kein React, kein Vue, kein Webpack. Das ist keine Einschraenkung, sondern eine Entscheidung: Die App laedt sofort, hat minimale Abhaengigkeiten und laeuft auf jedem Standard-Hoster. Der gesamte Build-Prozess ist ein einziges `cp`-Kommando.

## Die cleveren Details

### Drei-Stufen-Vererbung

Das Herzsstueck der Datenarchitektur: Pflanzendaten vererben sich ueber drei Ebenen.

- **Admin-Gruppe** definiert Standardwerte (Bluetezeitraum, Pflege, Hoehe...)
- **User-Gruppe** ueberschreibt nur das, was abweicht
- **Einzelne Pflanze** kann nochmal individuell angepasst werden

In der Datenbank wird das mit `COALESCE(pflanze, user_gruppe, admin_gruppe)` aufgeloest – kein Kopieren, keine Redundanz. Aendert der Admin eine Standardgruppe, profitieren alle User sofort – es sei denn, sie haben bewusst ueberschrieben.

### Bitmask fuer Monate

Bluetemonate und Pflegemonate werden nicht als 12 Spalten gespeichert, sondern als **einzelne Zahl**. Jedes Bit steht fuer einen Monat:

- Maerz + September = Bit 3 + Bit 9 = `2052`
- Abfrage "blueht im Mai?" = ein einziger Bitvergleich

Das macht Filterung blitzschnell und die Bluete-Animation auf der Karte moeglich, bei der Monat fuer Monat durchgespielt wird.

### Duale Bildverwaltung

Jedes hochgeladene Bild erzeugt automatisch zwei Versionen:

- **Thumbnail** (96x72) fuer die Hover-Galerie
- **Gallery** (volle Aufloesung) fuer die Lightbox

Dazu kommt die Bild-Hierarchie: User-Fotos haben Vorrang vor Admin-Fotos. So sieht jeder seine eigenen Aufnahmen, hat aber immer die Referenzbilder als Fallback.

### Icon-Kolorierung

SVG-Icons werden nicht in festen Farben gespeichert, sondern zur Laufzeit eingefaerbt – ueber CSS-Masking. Ein einzelnes Icon kann so in jeder beliebigen Farbe als Marker auf der Karte erscheinen, ohne dass mehrere Dateien noetig sind.

### Optimistic UI

Wenn eine Pflanze verschoben wird, bewegt sich der Marker **sofort** – die Serverantwort kommt im Hintergrund. Neue Pflanzen bekommen eine temporaere ID und erscheinen direkt auf der Karte, bevor der Server antwortet. Das Ergebnis: Die App fuehlt sich schneller an, als sie technisch ist.

## Karten-Engine

Die Karte ist kein einfacher Bild-Viewer, sondern eine vollwertige raeumliche Oberflaeche:

- **Zoom zum Mauszeiger** – nicht nur Skalierung, sondern echte Punkt-basierte Transformation
- **Drag-Erkennung** – ein Schwellwert von 5px unterscheidet Klick von Verschieben
- **Positionen als Prozent** – Pflanzen werden relativ gespeichert und skalieren mit jedem Gartenplan

## Effekt-System

Gardian hat ein **Theme-abhaengiges Effekt-System**. Je nach aktivem Theme reagiert die App unterschiedlich:

- **Unicorn:** Konfetti beim Sidebar-Klick, Seifenblasen beim Speichern, Sprout-Animation beim Platzieren
- **Weitere Themes** koennen jederzeit eigene Effekt-Sets bekommen

Alle Effekte sind prozedural generiert (keine GIFs oder Videos) und nutzen CSS-Keyframes mit zufaelligen Parametern fuer natuerliche Variation.

## Splash Screen

Der Ladebildschirm wird **komplett prozedural erzeugt**: 45 kleine Partikel, 10 leuchtende Gluehwuermchen, 20 funkelnde Sterne und 3 Nebel-Schichten – jedes Element mit zufaelliger Position, Geschwindigkeit und Timing. Kein einziges Bild, nur DOM-Elemente und CSS-Animationen.

## Design-System

Drei vollstaendige Themes (Light, Dark, Unicorn) basierend auf CSS Custom Properties. Theme-Wechsel ist ein einziges Attribut auf dem Root-Element – alles andere folgt automatisch. BEM-artige Klassen (`c-btn`, `c-card`, `l-sidebar`) halten das CSS modular und vorhersagbar.

## Migrations-System

Datenbankschema-Aenderungen werden ueber nummerierte SQL-Dateien verwaltet und koennen direkt ueber die Admin-Oberflaeche ausgefuehrt werden. Jede Migration wird mit Status, Zeitpunkt und ausfuehrendem User protokolliert – Schema-Evolution ohne Terminal-Zugang.

## Zahlen

| Was | Wert |
|-----|------|
| Frontend | ~4.500 Zeilen Vanilla JS |
| Backend | ~1.800 Zeilen PHP (8 Module) |
| CSS | ~1.500 Zeilen (Token-basiert) |
| Datenbank | 11 Tabellen + Migration-Tracker |
| Externe Abhaengigkeiten | Leaflet, Google Fonts, CropperJS |
| Build-Zeit | Unter 1 Sekunde |
