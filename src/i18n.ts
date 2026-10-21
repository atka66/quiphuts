import type { Lang } from './types'

export const en = {
  'app.name': 'quiphuts',
  'app.tagline': 'Quiplash 1 content pack builder',
  'app.language': 'Language',
  'app.langEn': 'EN',
  'app.langHu': 'HU',
  'app.footer': 'Fan-made tool. No game assets included. Not affiliated with Jackbox Games.',

  'paste.title': 'Paste prompts',
  'paste.description':
    'One prompt per line. <BLANK> and formatting tags are kept exactly as written.',
  'paste.placeholder': 'Paste your prompt list here, one prompt per line…',
  'paste.append': 'Append',
  'paste.import': 'Import content.zip',
  'paste.importing': 'Reading ZIP…',
  'paste.importConfirm': 'Importing will replace the current prompts. Continue?',
  'paste.hint': 'Blank lines are ignored. Leading and trailing whitespace is trimmed.',
  'paste.empty': 'Paste at least one prompt first.',

  'prompts.title': 'Prompts',
  'prompts.count': '{count} total',
  'prompts.add': 'Add prompt',
  'prompts.clear': 'Clear draft',
  'prompts.clearConfirm': 'Clear the whole draft? This cannot be undone.',
  'prompts.emptyTitle': 'No prompts yet',
  'prompts.emptyBody': 'Paste a list above, or add a prompt manually.',
  'prompts.charCount': '{count} chars',
  'prompts.blankCount': '{count} <BLANK>',
  'prompts.duration': 'Duration',
  'prompts.seconds': 's',
  'prompts.remove': 'Remove',
  'prompts.warning': 'Warning',
  'prompts.error': 'Error',

  'settings.title': 'Pack settings',
  'settings.packName': 'Pack name',
  'settings.packNamePlaceholder': 'My Quiplash Pack',
  'settings.durationTitle': 'Prompt duration',
  'settings.speed': 'Automatic reading speed',
  'settings.speedRelaxed': 'Relaxed — 14 chars/s',
  'settings.speedNormal': 'Normal — 18 chars/s',
  'settings.speedFast': 'Fast — 22 chars/s',
  'settings.speedHint':
    'Used for automatic durations. The longest original prompt is 121 characters.',
  'settings.advanced': 'Advanced',
  'settings.episode': 'Episode ID',
  'settings.episodeHint': 'Preserved from imported packs. 1234 for new packs. Usually not important.',

  'issues.title': 'Checks',
  'issues.none': 'No issues found.',
  'issues.errors': 'Errors: {count}',
  'issues.warnings': 'Warnings: {count}',
  'issues.exportBlocked': 'Fix the errors before exporting.',
  'issues.exportAllowed': 'Warnings do not block export.',
  'issues.prompt': 'Prompt {number}',
  'issues.general': 'Pack',
  'issues.more': 'and {count} more…',

  'export.title': 'Export',
  'export.description':
    'Exports a Quiplash 1 content folder with manifest.jet, Question.jet, data.jet and silent OGG prompt audio.',
  'export.button': 'Export content.zip',
  'export.busy': 'Building ZIP…',
  'export.ready': 'Ready to export.',
  'export.noPrompts': 'Add prompts before exporting.',
  'export.summary': 'Prompts: {prompts}',
  'export.installTitle': 'Install',
  'export.install':
    'Back up the game’s content folder, then extract content.zip into the Quiplash folder so its content/ replaces the old one.',
  'export.installNote': 'Close the game before replacing files.',

  'import.title': 'Import summary',
  'import.prompts': 'Prompts imported: {count}.',
  'import.packName': 'Pack name: {name}',
  'import.mp3':
    '{count} MP3 file(s) were ignored. Quiplash 1 uses OGG; silent OGG audio will be generated.',
  'import.custom': 'FX-style Custom fields were removed.',
  'import.mismatch':
    '{count} data.jet prompt text(s) differed from Question.jet; Question.jet was used.',
  'import.fakeJoke': '{count} orphaned keyword-response audio reference(s) were removed.',
  'import.manifestMissing': 'No manifest.jet found; using the default pack name.',
  'import.assignedIds': '{count} prompt(s) had missing or invalid IDs and were assigned new ones.',
  'import.duplicateIds': '{count} duplicate prompt ID(s) were replaced.',
  'import.skipped': '{count} invalid prompt(s) were skipped.',
  'import.audioIgnored': 'Audio from the ZIP was ignored; silent OGG will be generated.',
  'import.close': 'Dismiss',

  'status.listAppended': 'Added prompts: {count}.',
  'status.noPaste': 'Paste at least one prompt first.',
  'status.cleared': 'Draft cleared.',
  'status.exporting': 'Building content.zip…',
  'status.exportSuccess': 'content.zip is ready.',
  'status.exportFailed': 'Export failed: {message}',
  'status.importing': 'Reading ZIP…',
  'status.importSuccess': 'Imported prompts: {count}.',
  'status.importFailed': 'Import failed: {message}',
  'status.invalidZip': 'That file is not a readable ZIP.',
  'status.noQuestionJet': 'No Question.jet found in the ZIP.',
  'status.badQuestionJet': 'Question.jet is not valid Quiplash content.',
  'status.noPromptsInZip': 'The ZIP contains no prompts.',
  'status.fileReadError': 'Could not read the file.',

  'issue.noPrompts': 'Add at least one prompt.',
  'issue.emptyPrompt': 'Prompt is empty.',
  'issue.duplicateId': 'Duplicate prompt ID.',
  'issue.longPrompt':
    'Prompt is {length} characters; the longest original prompt is {max} characters.',
  'issue.duplicatePrompt': 'This prompt is duplicated.',
  'issue.unknownTag':
    'Unknown tag(s): {tags}. Only <BLANK>, <i>, <b>, <u> and <br> are known to work.',
  'issue.unsupportedChars': 'These characters may not render in Quiplash 1: {chars}',
  'issue.hungarianChars':
    'Hungarian characters may not be in the game font: {chars}. Test in-game, or use ö/ü if needed.',
  'issue.lowercaseBlank': '{tag} is not recognized. Use uppercase <BLANK>.',
  'issue.looksLikeBlank': 'This looks like a blank, but the game only substitutes <BLANK>.',
  'issue.rawAngle': 'A bare < or > may be parsed as HTML. Escape it or use a supported tag.',
  'issue.newlinePrompt': 'Prompt contains a line break. Keep each prompt on a single line.',
  'issue.packNameEmpty': 'Pack name is empty; the default name will be used.',
} as const

export type TKey = keyof typeof en

export const hu: Record<TKey, string> = {
  'app.name': 'quiphuts',
  'app.tagline': 'Quiplash 1 tartalomcsomag-készítő',
  'app.language': 'Nyelv',
  'app.langEn': 'EN',
  'app.langHu': 'HU',
  'app.footer':
    'Rajongói eszköz. Nem tartalmaz játékfájlokat. Nem áll kapcsolatban a Jackbox Games-szel.',

  'paste.title': 'Promptok beillesztése',
  'paste.description':
    'Soronként egy prompt. A <BLANK> és a formázó tagek pontosan úgy maradnak, ahogy beírtad.',
  'paste.placeholder': 'Illeszd be a promptlistát, soronként egy promptot…',
  'paste.append': 'Hozzáadás',
  'paste.import': 'content.zip importálása',
  'paste.importing': 'ZIP olvasása…',
  'paste.importConfirm': 'Az importálás lecseréli a jelenlegi promptokat. Folytatod?',
  'paste.hint': 'Az üres sorok kimaradnak. A sorok elejéről és végéről a szóközök lekerülnek.',
  'paste.empty': 'Előbb illessz be legalább egy promptot.',

  'prompts.title': 'Promptok',
  'prompts.count': '{count} összesen',
  'prompts.add': 'Prompt hozzáadása',
  'prompts.clear': 'Piszkozat törlése',
  'prompts.clearConfirm': 'Törlöd az egész piszkozatot? Ez nem vonható vissza.',
  'prompts.emptyTitle': 'Még nincs prompt',
  'prompts.emptyBody': 'Illessz be egy listát fent, vagy adj hozzá egy promptot.',
  'prompts.charCount': '{count} karakter',
  'prompts.blankCount': '{count} <BLANK>',
  'prompts.duration': 'Hossz',
  'prompts.seconds': 'mp',
  'prompts.remove': 'Törlés',
  'prompts.warning': 'Figyelmeztetés',
  'prompts.error': 'Hiba',

  'settings.title': 'Csomagbeállítások',
  'settings.packName': 'Csomag neve',
  'settings.packNamePlaceholder': 'Saját Quiplash csomag',
  'settings.durationTitle': 'Prompt hossza',
  'settings.speed': 'Automatikus olvasási sebesség',
  'settings.speedRelaxed': 'Lassú — 14 karakter/mp',
  'settings.speedNormal': 'Normál — 18 karakter/mp',
  'settings.speedFast': 'Gyors — 22 karakter/mp',
  'settings.speedHint':
    'Az automatikus hosszhoz használjuk. A leghosszabb eredeti prompt 121 karakter.',
  'settings.advanced': 'Speciális',
  'settings.episode': 'Epizód ID',
  'settings.episodeHint':
    'Importált csomagokból megőrizzük. Új csomagnál 1234. Általában nem fontos.',

  'issues.title': 'Ellenőrzések',
  'issues.none': 'Nincs probléma.',
  'issues.errors': 'Hibák: {count}',
  'issues.warnings': 'Figyelmeztetések: {count}',
  'issues.exportBlocked': 'Az exportálás előtt javítsd a hibákat.',
  'issues.exportAllowed': 'A figyelmeztetések nem akadályozzák az exportot.',
  'issues.prompt': '{number}. prompt',
  'issues.general': 'Csomag',
  'issues.more': 'és még {count}…',

  'export.title': 'Exportálás',
  'export.description':
    'Quiplash 1 tartalommappát exportál: manifest.jet, Question.jet, data.jet és néma OGG prompt-hang.',
  'export.button': 'content.zip exportálása',
  'export.busy': 'ZIP készítése…',
  'export.ready': 'Készen áll az exportra.',
  'export.noPrompts': 'Exportálás előtt adj hozzá promptokat.',
  'export.summary': 'Promptok: {prompts}',
  'export.installTitle': 'Telepítés',
  'export.install':
    'Készíts biztonsági másolatot a játék content mappájáról, majd bontsd ki a content.zip-et a Quiplash mappába úgy, hogy a benne lévő content/ lecserélje a régit.',
  'export.installNote': 'Fájlok cseréje előtt zárd be a játékot.',

  'import.title': 'Import összefoglaló',
  'import.prompts': 'Importált promptok: {count}.',
  'import.packName': 'Csomag neve: {name}',
  'import.mp3':
    '{count} MP3 fájl kimaradt. A Quiplash 1 OGG-t használ; néma OGG hangot generálunk.',
  'import.custom': 'Az FX-es Custom mezők eltávolítva.',
  'import.mismatch':
    '{count} data.jet prompt szöveg eltért a Question.jettől; a Question.jet szövegét használjuk.',
  'import.fakeJoke': '{count} árva keyword-response hanghivatkozás eltávolítva.',
  'import.manifestMissing': 'Nem találtunk manifest.jet fájlt; az alapértelmezett csomagnevet használjuk.',
  'import.assignedIds': '{count} prompt hiányzó vagy érvénytelen ID-t kapott; új ID-t rendeltünk hozzá.',
  'import.duplicateIds': '{count} duplikált prompt ID-t cseréltünk ki.',
  'import.skipped': '{count} érvénytelen prompt kimaradt.',
  'import.audioIgnored': 'A ZIP-ben lévő hangot figyelmen kívül hagytuk; néma OGG készül.',
  'import.close': 'Bezárás',

  'status.listAppended': 'Hozzáadott promptok: {count}.',
  'status.noPaste': 'Előbb illessz be legalább egy promptot.',
  'status.cleared': 'Piszkozat törölve.',
  'status.exporting': 'content.zip készítése…',
  'status.exportSuccess': 'A content.zip elkészült.',
  'status.exportFailed': 'Az export nem sikerült: {message}',
  'status.importing': 'ZIP olvasása…',
  'status.importSuccess': 'Importált promptok: {count}.',
  'status.importFailed': 'Az import nem sikerült: {message}',
  'status.invalidZip': 'Ez a fájl nem olvasható ZIP.',
  'status.noQuestionJet': 'A ZIP-ben nincs Question.jet.',
  'status.badQuestionJet': 'A Question.jet nem érvényes Quiplash-tartalom.',
  'status.noPromptsInZip': 'A ZIP nem tartalmaz promptot.',
  'status.fileReadError': 'A fájl beolvasása nem sikerült.',

  'issue.noPrompts': 'Adj hozzá legalább egy promptot.',
  'issue.emptyPrompt': 'A prompt üres.',
  'issue.duplicateId': 'Duplikált prompt ID.',
  'issue.longPrompt':
    'A prompt {length} karakter; a leghosszabb eredeti prompt {max} karakter.',
  'issue.duplicatePrompt': 'Ez a prompt duplikált.',
  'issue.unknownTag':
    'Ismeretlen tag(ek): {tags}. Csak a <BLANK>, <i>, <b>, <u> és <br> működése ismert.',
  'issue.unsupportedChars':
    'Ezek a karakterek valószínűleg nem jelennek meg a Quiplash 1-ben: {chars}',
  'issue.hungarianChars':
    'A magyar karakterek lehet, hogy nincsenek benne a játék betűkészletében: {chars}. Teszteld a játékban, vagy használj ö/ü betűt, ha kell.',
  'issue.lowercaseBlank': 'A(z) {tag} nincs felismerve. Használj nagybetűs <BLANK>-et.',
  'issue.looksLikeBlank':
    'Ez üres helynek tűnik, de a játék csak a <BLANK>-et helyettesíti.',
  'issue.rawAngle':
    'A magában álló < vagy > HTML-ként értelmeződhet. Escapeld, vagy használj támogatott taget.',
  'issue.newlinePrompt':
    'A prompt sortörést tartalmaz. Minden prompt egy sorban legyen.',
  'issue.packNameEmpty': 'A csomag neve üres; az alapértelmezett nevet használjuk.',
}

export type T = (key: TKey, params?: Record<string, string | number>) => string

export function getTranslator(lang: Lang): T {
  const dictionary = lang === 'hu' ? hu : en
  return (key, params) => {
    let value = dictionary[key] ?? String(key)
    if (params) {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.split(`{${param}}`).join(String(replacement))
      }
    }
    return value
  }
}
