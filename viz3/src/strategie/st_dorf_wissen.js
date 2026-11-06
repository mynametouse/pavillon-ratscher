// ===================== feat/strategie-dorf: the village's discoveries in the Entdeckerbuch (feat/wissen) – STDWISSEN =====================
// What one learns in the village from above goes into the discovery book (wissen/wissen.js) by its public API (docs/features/wissen.md
// „API für alle Features“): a few entries of its own – how a village project goes, land, the meadow orchard, funding, a fire brigade's
// mission – and the book's own entries found when one does the thing (the Ortsteilrat, the fire brigade, LEADER, the Mitfahrbank …).
// Without the book (a build without feat/wissen) nothing happens. The book loads after this module: registered once all modules ran.
// Its rules for 'strategie:entdeckt' also keep the village's discoveries (people met, the attic of the old school, the notice board, the
// basic training) from becoming generic entries in the chapter „Natur“.
import { KERN } from '../core/kern.js';

export const STDWISSEN = (() => {
  const W = () => (window.WISSEN && typeof window.WISSEN.add === 'function' ? window.WISSEN : null);
  const VILLAGE_KINDS = d =>
    !!d &&
    (d.kind === 'kontakt' ||
      d.kind === 'dorf' ||
      (d.kind === 'geschichte' && d.id === 'alte_schule') ||
      (d.kind === 'ausbau' && d.id === 'feuerwehr'));
  const ENTRIES = [
    {
      id: 'stdorf:projekt',
      ch: 'politik',
      icon: '🗳',
      title: 'Vom Wunsch zum Dorfprojekt',
      text: 'Fast jedes Dorfprojekt beginnt mit einem Gespräch: Wer braucht was, wer hilft mit, wer kennt wen? Über kleine Dinge – eine Bank, einen Zuschuss zur Kirmes, Geld für die Ortsfeuerwehr – entscheidet der Ortsteilrat aus dem Geld des Ortsteils (rund 5 € je Einwohner im Jahr). Was mehr kostet oder Sache der Stadt ist – Wege, Laternen, Haltestellen –, schlägt er dem Stadtrat vor, und der muss sich damit befassen. Für Größeres gibt es Fördergeld, aber nur mit Eigenanteil, zu Fristen und nie vor dem Bescheid.',
      here: 'Von oben: Leute kennenlernen (ihre Wünsche stehen dann am Anger), ein Projekt angehen, Ortsteilrat am Freitag- oder Samstagabend in der alten Schule, Stadtrat donnerstags in Schleusingen – wer dabei ist und gut vorbereitet, überzeugt mehr. Wer hilft, Wort hält, sonntags Ruhe gibt und fair handelt, dem trauen die Leute mehr.',
      src: [
        ['§ 45 Thüringer Kommunalordnung (Ortsteilverfassung)', null],
        ['§ 39 Thüringer Kommunalordnung (Beschlüsse; Stimmengleichheit lehnt ab)', null],
      ],
      hint: 'Im Modus „Ratscher von oben“ mit jemandem im Dorf reden.',
      find: { ev: [['strategie:entdeckt', VILLAGE_KINDS]] },
    },
    {
      id: 'stdorf:land',
      ch: 'politik',
      icon: '📜',
      title: 'Land pachten oder kaufen',
      text: 'Wer Land braucht, pachtet meist. Ein Landpachtvertrag über mehr als zwei Jahre muss schriftlich sein – sonst gilt er als auf unbestimmte Zeit geschlossen – und wird der Landwirtschaftsbehörde angezeigt. Thüringen hat mit die niedrigsten Pachtpreise Deutschlands: neu gepachtetes Ackerland kostete 2023 im Mittel 257 € je Hektar im Jahr. Ein Kauf geht nur über den Notar; dazu kommen 5 % Grunderwerbsteuer (Thüringen seit 2024), Notar und Grundbuch und die Genehmigung nach dem Grundstückverkehrsgesetz. Wird Wald verkauft, haben erst die Gemeinde, dann das Land zwei Monate lang ein Vorkaufsrecht.',
      here: 'Um Ratscher: Uwes Hangwiese, ein Ackerstreifen am Feldweg, ein Waldstück an der Klinge. Der Eigentümer stimmt nur zu, wenn er dir traut, und die Nachbarn reden mit; wer knapp bietet, verärgert ihn. Die Pacht ist zu Martini fällig, am 11. November – seit Jahrhunderten der Zahltag auf dem Land.',
      src: [
        ['§§ 585, 585a BGB (Landpacht)', 'https://www.gesetze-im-internet.de/bgb/__585a.html'],
        ['Landpachtverkehrsgesetz', 'https://www.gesetze-im-internet.de/lpachtvg/'],
        ['Grundstückverkehrsgesetz', 'https://www.gesetze-im-internet.de/grdstvg/'],
        ['§ 17 Thüringer Waldgesetz (Vorkaufsrecht)', 'https://faolex.fao.org/docs/pdf/ger075400original.pdf'],
      ],
      hint: 'Von oben ein Stück Land pachten oder kaufen.',
      find: { ev: [['strategie:dorfprojekt', d => !!d && d.state === 'fertig' && /^(pacht|kauf)_/.test(d.id || '')]] },
    },
    {
      id: 'stdorf:streuobst',
      ch: 'natur',
      icon: '🍏',
      title: 'Die Streuobstwiese',
      text: 'Hochstämmige Obstbäume, locker über eine Wiese verstreut, die gemäht oder beweidet wird: Streuobstwiesen gehören zu den artenreichsten Lebensräumen Mitteleuropas. In den Höhlen alter Bäume brüten Gartenrotschwanz und Steinkauz, im Gras und in den Blüten leben Wildbienen und Schmetterlinge. Seit 2022 sind Streuobstwiesen bundesweit als Biotop geschützt. Alte Sorten wie Kaiser Wilhelm, Schöner von Boskoop oder die Hauszwetschge sind robust und kommen mit wenig Spritzmittel aus.',
      here: 'Auf der Hangwiese bei Ratscher: zwölf junge Hochstämme aus der Baumschule Kammbach, gepflanzt zwischen Oktober und März, mit Pfahl auf der Wetterseite, Wühlmauskorb und Drahthose gegen Rehe. Bis sie richtig tragen, vergehen fünf bis zehn Jahre.',
      src: [
        ['§ 30 Abs. 2 Nr. 7 Bundesnaturschutzgesetz', 'https://www.gesetze-im-internet.de/bnatschg_2009/__30.html'],
      ],
      hint: 'Von oben eine Streuobstwiese pflanzen.',
      find: { ev: [['strategie:dorfprojekt', d => !!d && d.id === 'streuobst' && d.state === 'fertig']] },
    },
    {
      id: 'stdorf:foerder',
      ch: 'politik',
      icon: '💶',
      title: 'Fördergeld: Eigenanteil, Frist, Bescheid',
      text: 'Förderprogramme zahlen nie alles – den Rest, den Eigenanteil, trägt der Antragsteller, bei Projekten im Dorf meist die Stadt. LEADER (Geld der EU) fördert, was eine Region in ihrer Entwicklungsstrategie festgelegt hat; die Aktionsgruppe wählt zu Stichtagen nach Punkten aus. Die Dorferneuerung des Landes geht vor allem an anerkannte Förderschwerpunkte (für Gemeinden 65 %, Antrag bis 15. Januar). Die Kommunalrichtlinie des Bundes fördert Klimaschutz wie LED-Straßenlampen, Anträge das ganze Jahr. Überall gilt: nicht anfangen, bevor der Bescheid da ist; ausgezahlt wird nach dem Verwendungsnachweis.',
      here: 'Der Treffpunkt am Anger über LEADER, die LED-Lampen über die Kommunalrichtlinie – beide erst mit dem Eigenanteil der Stadt, dann der Antrag, dann warten.',
      src: [
        [
          'Dorferneuerung und -entwicklung in Thüringen (Leistungsbeschreibung)',
          'https://fimportal.de/api/v0/xzufi-services/L100038/354608/de/pdf',
        ],
        ['Verwaltungsvorschriften zu § 44 Thüringer Landeshaushaltsordnung', null],
        ['Kommunalrichtlinie der Nationalen Klimaschutzinitiative 2022–2027', null],
      ],
      hint: 'Von oben ein Projekt mit Fördergeld durch den Stadtrat bringen.',
      find: {
        ev: [['strategie:dorfprojekt', d => !!d && (d.id === 'treffpunkt' || d.id === 'led') && d.state === 'stadt']],
      },
    },
    {
      id: 'stdorf:einsatz',
      ch: 'politik',
      icon: '🚒',
      title: 'Ein Einsatz: vom Alarm bis zur Freigabe',
      text: 'Bei Alarm heulen die Sirene und die Funkmeldeempfänger; wer kann, fährt zum Gerätehaus. In Thüringen soll die Feuerwehr in der Regel zehn Minuten nach der Alarmierung am Einsatzort wirksam helfen können. Tagsüber ist das auf dem Dorf schwer: Viele arbeiten auswärts – die Tagesalarmsicherheit ist die große Sorge der Freiwilligen Feuerwehren. Am Einsatzort wird erst erkundet und abgesichert, dann gearbeitet, am Ende gibt der Einsatzleiter frei.',
      here: 'Von oben: Sturm wirft Fichten über den Weg zur Klinge, Starkregen lässt den Bach am Garten steigen, nach Wochen ohne Regen brennt der Waldboden. Werktags kommen tagsüber nur drei – wer hilft, entscheidet, ob es reicht.',
      src: [
        ['Thüringer Feuerwehr-Organisationsverordnung (Einsatzgrundzeit)', null],
        ['Feuerwehr-Dienstvorschrift FwDV 3 (Einheiten im Lösch- und Hilfeleistungseinsatz)', null],
      ],
      hint: 'Von oben bei einem Einsatz der Feuerwehr dabei sein.',
      find: { ev: [['strategie:krise', d => !!d && d.state === 'alarm']] },
    },
  ];
  let done = false;
  function register() {
    const B = W();
    if (done || !B) return done;
    try {
      for (const e of ENTRIES) if (!B.get || !B.get(e.id)) B.add(e);
      done = true;
    } catch (e) {}
    return done;
  }
  // the book's own entries, found when one does the thing in the village from above
  const find = (id, how) => {
    const B = W();
    if (!B) return false;
    try {
      return !!(B.get && B.get(id) && B.found(id, how));
    } catch (e) {
      return false;
    }
  };
  KERN.on('strategie:entdeckt', d => {
    if (!d) return;
    if (d.kind === 'kontakt') find('p_verein', 'erkundet:' + (d.title || 'Leute im Dorf'));
    else if (d.kind === 'geschichte' && d.id === 'alte_schule')
      find('g_schule', 'erkundet:' + (d.title || 'die alte Schule'));
    else if (d.kind === 'ausbau' && d.id === 'feuerwehr')
      find('p_feuerwehr', 'tun:die Grundausbildung bei der Feuerwehr');
    else if (d.kind === 'dorf' && d.id === 'aushang') find('p_ortsteilrat', 'gesehen:den Aushang an der alten Schule');
  });
  KERN.on('strategie:dorfprojekt', d => {
    if (!d) return;
    if (d.state === 'beschlossen') find('p_ortsteilrat', 'tun:ein Projekt durch den Ortsteilrat gebracht');
    if (d.state === 'stadt') find('p_stadtrat', 'tun:ein Projekt durch den Stadtrat gebracht');
    if (d.state === 'stadt' && d.id === 'treffpunkt') find('p_leader', 'tun:einen LEADER-Antrag vorbereitet');
    if (d.state !== 'fertig') return;
    if (d.id === 'mitfahrbank') find('p_mitfahren', 'tun:die Mitfahrbank aufgestellt');
    if (d.id === 'bushaus') find('p_bus', 'tun:das Bushäuschen gerichtet');
    if (d.id === 'streuobst') find('h_pflanzen', 'tun:Hochstämme gepflanzt');
  });
  KERN.on('strategie:krise', d => {
    if (!d || d.state !== 'alarm') return;
    find('p_feuerwehr', 'gesehen:einen Einsatz der Feuerwehr Ratscher');
    if (d.id === 'baum') find('n_sturm', 'gesehen:Sturmholz über dem Weg zur Klinge');
  });
  // the book is defined after this module (modules.txt): register once every module ran, again when the mode starts if it was late
  setTimeout(register, 0);
  KERN.on('strategie:modus', d => d && d.on && register());
  return { register, state: () => ({ done, n: ENTRIES.length }), ENTRIES };
})();
window.STDWISSEN = STDWISSEN;
