# 🌿 Gardian – Dein digitaler Gartenbegleiter

> Gardian ist eine persönliche Web-Anwendung zur Verwaltung deines Gartens. Du planst, dokumentierst und behältst den Überblick – interaktiv, visuell und immer auf dem neuesten Stand.

---

## Inhaltsverzeichnis

1. [Was ist Gardian?](#was-ist-gardian)
2. [Features im Überblick](#features-im-überblick)
3. [Die interaktive Gartenkarte](#die-interaktive-gartenkarte)
4. [Pflanzen & Gruppen verwalten](#pflanzen--gruppen-verwalten)
5. [Blütezeit & Beobachtungen](#blütezeit--beobachtungen)
6. [Gartenkalender & Pflegeaufgaben](#gartenkalender--pflegeaufgaben)
7. [Tabelle](#tabelle)
8. [Galerie](#galerie)
9. [Themes & Personalisierung](#themes--personalisierung)
10. [Administration](#administration)
11. [Datenbankkonzept](#datenbankkonzept)
12. [Technische Abhängigkeiten](#technische-abhängigkeiten)
13. [Systemvoraussetzungen & Betrieb](#systemvoraussetzungen--betrieb)

---

## Was ist Gardian?

Gardian ist mehr als eine einfache Pflanzendatenbank. Es ist ein interaktiver, visueller Gartenplaner, der direkt im Browser läuft. Du lädst deinen eigenen Gartenplan als Foto hoch — und setzt dann digitale Pins genau dort, wo deine Pflanzen wirklich stehen. Kein Tippen von Koordinaten, kein Tabellenchaos. Einfach klicken und los.

Was Gardian besonders macht: Es denkt in Zusammenhängen. Pflanzen gehören zu Gruppen, Gruppen haben Eigenschaften – und jede individuelle Pflanze kann diese Eigenschaften überschreiben oder einfach erben. Das spart Zeit und hält deine Daten konsistent, ohne dass du alles doppelt eingeben musst.

---

## Features im Überblick

| Bereich | Feature |
|---|---|
| 🗺️ Karte | Eigenen Gartenplan hochladen & interaktiv navigieren |
| 📍 Marker | Pflanzen per Klick auf der Karte platzieren & verschieben |
| 🌸 Blütezeit | Blühzeitenanimation pro Monat oder Jahr |
| 🌿 Pflanzen | Gruppen & Einzelpflanzen mit vollständigem Steckbrief |
| 🔧 Pflege | Aufgaben pro Pflanze & Pflegekalender mit Badges auf der Karte |
| 📅 Kalender | Pflegeaufgaben in Monats- oder Jahresansicht verwalten & abhaken |
| 📊 Tabelle | Alle Pflanzen in einer editierbaren Tabellenübersicht |
| 📸 Galerie | Fotos pro Pflanze & Gruppe, mit Lightbox & Hover-Galerie |
| 🎨 Design | Hell-, Dunkel- & Unicorn-Theme, komplett anpassbar |
| 👤 Profil | Profilbild, E-Mail & Passwort verwalten |
| 🛡️ Admin | Benutzer, Pflanzengruppen, Icons & Aufgabentypen verwalten |

---

## Die interaktive Gartenkarte

Das Herzstück von Gardian ist die Gartenkarte. Du lädst ein Foto deines Gartens (z.B. ein Grundriss oder ein Drohnenbild) hoch — danach wird es zur Grundlage deines digitalen Gartenplans.

**Navigation:**
- **Zoomen** mit dem Mausrad oder den Anpassen-Buttons (↔ Breite / ↕ Höhe)
- **Verschieben** durch Klicken und Ziehen auf der Karte
- Die Zoom-Position und -Ausrichtung werden automatisch gespeichert — beim nächsten Besuch siehst du die Karte exakt so, wie du sie verlassen hast.

**Pflanzen platzieren:**
- Einfacher Klick auf die Karte öffnet den Dialog zum Hinzufügen einer Pflanze.
- Der neue Marker erscheint sofort an der geklickten Stelle.
- Marker können per Drag & Drop verschoben werden — die neue Position wird automatisch gespeichert.

**Marker-Darstellung:**
- Jede Pflanze erscheint als farbiger Kreis mit einem Icon (Emoji, SVG aus der Bibliothek oder eigenes SVG).
- Farbe, Größe und Icon sind pro Pflanze individuell konfigurierbar.
- Beim Hovern über einen Marker erscheint eine kleine Foto-Vorschau (Hover-Galerie).
- Die Hover-Galerie kann deaktiviert oder gesperrt werden.
- Es gibt drei Größenstufen für die Hover-Galerie (S / M / L).

**Sidebar-Filter:**
- Filter nach Pflanzentyp (Baum, Strauch, Blume, Blümchen)
- Filter nach Pflanzengruppe
- Filter nach Pflegemonat — zeigt nur Pflanzen, die im gewählten Monat Aufgaben haben
- Option: „Pflanzen ohne Aufgaben ausblenden"

Der Filter wirkt sich gleichzeitig auf die Karte, die Pflanzenliste und die Galerie aus.

---

## Pflanzen & Gruppen verwalten

Gardian arbeitet nach einem klaren Vererbungsprinzip:

```
Admin-Gruppe (Pflanzensteckbrief)
  └── Eigene Gruppe (Anpassungen)
        └── Einzelpflanze (weitere Anpassungen)
```

Das bedeutet: Ein Admin pflegt zentrale Pflanzengruppen mit allen Steckbrief-Details. Du als Nutzer kannst diese Gruppen für deinen Garten übernehmen, eigene Gruppen anlegen und jede einzelne Pflanze bei Bedarf noch individuell anpassen.

**Mögliche Eigenschaften pro Pflanze / Gruppe:**

- Typ (Baum, Strauch, Blume, Blümchen)
- Blütezeit (Standard sowie jahresspezifische Beobachtungen)
- Marker (Farbe, Größe, Icon)
- Höhe, Standort, Pflanzabstand
- Pflege- und Wasserbedarf
- Winterhart, Duftend, Schnittblume, Immergrün, Lebenszeit
- Besonderheiten (Freitext)
- Datum geplant / gepflanzt / verschwunden (inkl. Grund)

**In der Pflanzen-Ansicht:**
- Alle deine Pflanzengruppen werden übersichtlich als aufklappbare Liste angezeigt.
- Pflanzen können direkt umbenannt werden (Doppelklick auf den Namen).
- Fotos können direkt per Klick hochgeladen werden.
- Aufklappbare Blütezeit-Beobachtungen und Datumsfelder sind direkt integriert.
- Gruppen lassen sich über einen Bearbeiten-Dialog anpassen.

---

## Blütezeit & Beobachtungen

Gardian unterscheidet zwischen **Standard-Blütezeiten** (auf Gruppenebene, vom Admin gepflegt) und **persönlichen Beobachtungen** (auf Jahresbasis, von dir erfasst).

**Auf der Karte:**
- Wenn du einen Zeitraum (Jahr + Monat) aktivierst, verblassen alle Marker, deren Pflanzen zu diesem Zeitpunkt **nicht** blühen.
- Immergrüne Pflanzen bleiben immer sichtbar (werden grün dargestellt, auch außerhalb der Blütezeit).
- Mit dem **Autoplay**-Button kannst du die Monate automatisch durchlaufen lassen — du siehst als Animation, welche Pflanzen wann blühen.
- Die Abspielgeschwindigkeit ist einstellbar (langsam / normal / schnell).

**Pro Pflanze & Gruppe:**
- Du kannst für jedes Jahr separat erfassen, wann eine Pflanze geblüht hat — per 12 klickbaren Monats-Buttons.
- Tab-Ansicht mit Standard-Blütezeit + allen Jahren, für die du Beobachtungen gespeichert hast.
- Neue Jahre lassen sich mit einem Klick hinzufügen.

---

## Gartenkalender & Pflegeaufgaben

Über den **Gartenkalender** (eigene Seite) kannst du Pflegeaufgaben für deinen Garten planen und verfolgen.

**Ansichten:**
- **Monatsansicht** — alle Aufgaben des gewählten Monats als Karten, mit Abhak-Funktion (✓ erledigt / offen).
- **Jahresansicht** — eine Tabelle aller Aufgaben mit Überblick über alle 12 Monate: ✓ = erledigt, ○ = offen, — = im jeweiligen Monat nicht vorgesehen.

**Aufgaben anlegen:**
- Aufgaben können einem Aufgabentyp (definiert vom Admin) oder einem eigenen Namen zugewiesen werden.
- Zuordnung möglich zu: Gesamter Garten, einer Pflanzengruppe oder einer einzelnen Pflanze.
- Fälligkeitsmonate werden per Klick ausgewählt (Bitmask, mehrere Monate möglich).
- Optional: Notizfeld für zusätzliche Hinweise.

**Pflege-Badges auf der Karte:**
- Mit dem Toggle „Pflege-Badges" erscheinen direkt auf der Karte kleine farbige Badges bei jeder Pflanze:
  - 🟠 Orange: Es gibt noch offene Aufgaben in diesem Monat.
  - 🟢 Grün: Alle Aufgaben erledigt.
- Die Badges zeigen Icons der zugehörigen Aufgabentypen.

---

## Tabelle

Die **Tabellen-Ansicht** ist eine eigene Seite, die alle deine Pflanzen und Gruppen in einer scrollbaren, editierbaren Tabelle darstellt.

- Alle Felder (Höhe, Standort, Pflege, Blütezeit, Marker usw.) sind direkt in der Tabelle per Klick bearbeitbar — kein eigenes Modal nötig.
- Gruppen sind aufklappbar; die enthaltenen Pflanzen erscheinen als Unterzeilen.
- Felder, die von der Gruppe vererbt werden (und nicht überschrieben sind), erscheinen kursiv und grau — so erkennst du sofort, welche Werte eigene Einstellungen sind.
- Änderungen werden sofort gespeichert, eine Status-Anzeige bestätigt den Speichervorgang.

---

## Galerie

Die Galerie gibt dir einen vollständigen Überblick über alle Fotos in deinem Garten.

- Fotos können pro Pflanze und pro Gruppe hochgeladen werden.
- In der Galerie-Ansicht werden alle Bilder in einem Masonry-Layout angezeigt.
- Sortierung nach Name oder Kategorie möglich.
- Der aktive Sidebar-Filter (Typ / Gruppe) gilt auch in der Galerie.
- Klick auf ein Bild öffnet es in einer Vollbild-Lightbox.
- **Hover-Galerie auf der Karte:** Fährst du mit der Maus über einen Marker, erscheint eine kleine Fotogalerie dieser Pflanze direkt auf der Karte.

---

## Themes & Personalisierung

Gardian kommt mit drei Themes, die du jederzeit in den Einstellungen wechseln kannst:

| Theme | Beschreibung |
|---|---|
| ☀️ Hell | Klassisch, hell und freundlich |
| 🌙 Dunkel | Augenschonendes Dunkeldesign |
| 🦄 Unicorn | Farbenfroher Pastellgradient für gute Laune |

Das gewählte Theme wird pro Benutzer gespeichert — auch nach dem Ausloggen.

Zusätzlich kannst du in deinem **Profil**:
- Ein Profilbild hochladen (erscheint im Header und in den Einstellungen)
- E-Mail-Adresse ändern
- Passwort ändern

---

## Administration

Nutzer mit der Rolle **Admin** haben Zugang zum Admin-Bereich. Dort lassen sich verwalten:

- **Benutzer**: Alle registrierten Accounts einsehen und verwalten.
- **Pflanzengruppen**: Zentrale Pflanzensteckbriefe anlegen und bearbeiten — werden für alle Nutzer als Basis sichtbar.
- **Aufgaben-Typen**: Kategorien für Pflegeaufgaben mit eigenem Icon definieren (z.B. Gießen, Düngen, Schneiden).
- **Icon-Bibliothek**: SVG-Icons hochladen, die alle Nutzer für ihre Marker verwenden können.

---

## Datenbankkonzept

Die Datenbank folgt einem durchdachten **Dreischichten-Vererbungsmodell**, das Redundanz vermeidet und gleichzeitig maximale Flexibilität bietet.

### Die drei Ebenen

**Ebene 1 – Admin-Pflanzengruppen**  
Zentral gepflegte Steckbriefe (z.B. „Rose", „Apfelbaum"). Enthalten alle Standardwerte wie Blütezeit, Standort, Pflegehinweise etc. Diese Ebene ist die Basis für alle Nutzer.

**Ebene 2 – Nutzer-Gruppen**  
Jeder Nutzer kann eine Admin-Gruppe in seinen Garten übernehmen oder eine völlig eigene Gruppe erstellen. Felder, die hier leer gelassen werden, werden automatisch von der Admin-Gruppe übernommen (Vererbung). So lassen sich nur die Abweichungen erfassen, nicht alles neu eingeben.

**Ebene 3 – Einzelpflanzen**  
Jede konkrete Pflanze im Garten ist eine Instanz einer Gruppe. Sie hat eine Position auf der Karte und kann einzelne Felder nochmals individuell überschreiben.

### Datenbank-Tabellen im Überblick

| Tabelle | Inhalt |
|---|---|
| `gd_users` | Benutzerkonten (Name, E-Mail, Passwort, Rolle, Avatar) |
| `gd_default_groups` | Admin-Pflanzengruppen mit Steckbrief |
| `gd_user_groups` | Nutzer-spezifische Gruppen & Overrides |
| `gd_user_plants` | Einzelne Pflanzen-Instanzen mit Kartenposition |
| `gd_images` | Fotos (zugeordnet zu Admin-Gruppe, Nutzer-Gruppe oder Einzelpflanze) |
| `gd_icon_library` | SVG-Icons vom Admin, für alle Nutzer verfügbar |
| `gd_user_icons` | Eigene SVG-Icons des jeweiligen Nutzers |
| `gd_user_garden_config` | Kartenansicht, Theme, Hover-Einstellungen (pro Nutzer) |

> [!NOTE]
> Blütezeit-Beobachtungen und Pflegeaufgaben werden in separaten Tabellen gespeichert, die im laufenden Betrieb über die API angelegt werden.

### Warum Bitmask für Blütezeiten?

Die Blützeitdaten werden als **Bitmask** gespeichert — eine einzelne Zahl, die für jeden der 12 Monate angibt, ob die Pflanze blüht oder nicht. Das ermöglicht extrem schnelle Abfragen und Animationen, ohne für jeden Monat eine eigene Zeile in der Datenbank zu benötigen.

---

## Technische Abhängigkeiten

Gardian ist bewusst schlank gehalten und kommt mit sehr wenigen externen Abhängigkeiten aus:

| Technologie | Einsatz | Warum |
|---|---|---|
| **HTML5** | Struktur der Oberfläche | Webstandard, keine Frameworks nötig |
| **Vanilla CSS** | Gestaltung, Themes, Animationen | Maximale Kontrolle, keine Build-Tools für CSS |
| **Vanilla JavaScript** | Gesamte App-Logik | Leichtgewichtig, keine Framework-Abhängigkeit |
| **PHP 8+** | Backend-API | Einfaches Deployment auf MAMP/XAMPP/Shared Hosting |
| **MySQL 8+** | Datenbank | Robustes, weitverbreitetes RDBMS |
| **Google Fonts (Outfit)** | Typografie | Modernes, lesbares Schriftbild |
| **npm** | Build-Workflow | Kein echter Build-Prozess – nur ein simples Deploy-Script |

**Keine externen JavaScript-Bibliotheken.** Kein React, kein Vue, kein jQuery. Die gesamte Anwendungslogik – Karte, Drag & Drop, Animationen, Galerie, Filter – ist in purem JavaScript geschrieben.

---

## Systemvoraussetzungen & Betrieb

### Entwicklung (lokal)

- **macOS** mit [MAMP](https://www.mamp.info/)
- PHP-Server auf Port `8888`
- MySQL auf Port `8889`
- Node.js & npm (nur für das Build-Script)

### Build & Deployment

Das Projekt wird durch ein einziges Kommando aus dem Projektordner `Gardian/` gebaut:

```
npm run build
```

Dieses Script kopiert alle relevanten Dateien (HTML, CSS, JS, PHP, Assets) in den Ordner `../Gardian-runtime/`, der dann vom Webserver ausgeliefert wird. Entwicklungs- und Laufzeit-Dateien sind damit sauber getrennt.

### Verzeichnisstruktur

```
Gardian/              ← Quellcode (Entwicklung)
Gardian-runtime/      ← Laufzeitversion (vom Build erzeugt)
```

### Hosting

Da Gardian auf PHP und MySQL basiert, kann es auf jedem Standard-Webhosting betrieben werden, das PHP 8+ und MySQL unterstützt — ohne teure Server-Infrastruktur.

---

*Gardian – gepflegt wie dein Garten.*
