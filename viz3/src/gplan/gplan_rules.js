// ===================== garden planner 3: the adviser – warnings and tips with their reasons (GPRULES) =====================
// Pure (tested in node: viz3/test/unit/gplan_rules.test.mjs). check(plan, db, site, opts) looks at the planned plants and says what does
// not fit, each with a level ('warn' = Warnung, 'hint' = Hinweis), the plan items it concerns, a short German text and the reason:
// boundary distance after the Thuringian neighbour law (regeln.json), grown crowns at buildings and over paths, wet ground at the brook,
// late frost in the valley, neighbours that do not get on, a missing pollinator, crowns that grow into each other, too little sun,
// protection at planting (voles, goats), soil. tips(p, db) gives the adviser's lines for one plant (growth, soil, partners, harvest).
// site: { boundary: [[x, y]…], buildings: [{ key, name, g: 'm'|'n'|'f', foot: [[x, y]…], h }], paths: [[[x, y]…]…], pathW, bridge: [[x, y]…] | null,
//         brook(x, y) → distance from the brook's centre line (m) | null, ditch, wet, trees: [[x, y, r, h]…] (standing trees) }
import { GPMODEL as M } from './gplan_model.js';
import { GPSUN } from './gplan_sun.js';
export const GPRULES = (() => {
  const de = M.de;
  // ---- geometry ----
  function segDist(px, py, a, b) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      L2 = dx * dx + dy * dy || 1e-9,
      t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2));
    return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
  }
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  // distance to the outline of a closed polygon
  function edgeDist(x, y, poly) {
    let d = Infinity;
    for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(x, y, poly[i], poly[(i + 1) % poly.length]));
    return d;
  }
  function lineDist(x, y, line) {
    let d = Infinity;
    for (let i = 0; i + 1 < line.length; i++) d = Math.min(d, segDist(x, y, line[i], line[i + 1]));
    return d;
  }
  // a fact of regeln.json whose id matches (the reason in the data's own words), else the fallback; several patterns: in this order
  const fact = (db, res, fb) => {
    for (const re of [].concat(res)) {
      const f = (db.facts || []).find(x => x && re.test(x.id || ''));
      if (f) return f.text;
    }
    return fb;
  };
  const name = p => M.fullName(p);
  // German phrases for a building of gender g ('m', 'n', 'f'): 'im Pavillon', 'in der Werkstatt', 'am …', 'den/das/die …'
  const ART = { m: ['im', 'am', 'den'], n: ['im', 'am', 'das'], f: ['in der', 'an der', 'die'] };
  const bIn = b => (ART[b.g] || ART.m)[0] + ' ' + b.name,
    bAt = b => (ART[b.g] || ART.m)[1] + ' ' + b.name,
    bAcc = b => (ART[b.g] || ART.m)[2] + ' ' + b.name;
  const SOIL = 'Auenlehm am Bach, frisch bis feucht, pH etwa 6 (geschätzt – eine Bodenprobe ersetzt das später)';
  // the plan's items with their plants, sizes at the view age and when grown
  function prep(plan, db, opts) {
    const year = opts.year || 2026,
      view = year + (opts.age || 0);
    return plan.items.map((it, i) => {
      const p = db.byId.get(it.id);
      if (!p) return { i, it, p: null };
      const seed = M.seedOf(it),
        age = M.ageOf(it, view),
        now = M.sizeAt(p, age === null ? 0 : age, seed),
        grown = M.sizeAt(p, 999, seed);
      return { i, it, p, age, now, grown, R: grown.w / 2, c: M.crown(p, now), cg: M.crown(p, grown) };
    });
  }
  // ---- the checks ----
  function check(plan, db, site, opts = {}) {
    const W = [],
      add = (level, items, text, why, key) => W.push({ level, items, text, why: why || '', key });
    const A = prep(plan, db, opts).filter(a => a.p);
    const S = site || {};
    // 1 boundary distance (ThürNRG): from the middle of the trunk at the ground to the boundary
    if (S.boundary && S.boundary.length > 2)
      for (const a of A) {
        const inside = inPoly(a.it.x, a.it.y, S.boundary),
          d = edgeDist(a.it.x, a.it.y, S.boundary),
          g = db.legal.get(a.p.nachbarrecht);
        if (!inside)
          add(
            'warn',
            [a.i],
            name(a.p) + ' steht außerhalb des Grundstücks.',
            'Gepflanzt wird auf dem eigenen Grundstück; die Grenze ist gestrichelt gezeichnet.',
            'grenze'
          );
        else if (g && g.abstand_m > 0 && d < g.abstand_m - 0.005)
          add(
            'warn',
            [a.i],
            name(a.p) +
              ': ' +
              de(d, 2) +
              ' m bis zur Grenze – nach Thüringer Nachbarrecht mindestens ' +
              de(g.abstand_m) +
              ' m.',
            g.text +
              ' (' +
              g.paragraf +
              '). ' +
              (db.messung || '') +
              // towards the brook the boundary may be the water's own parcel (then no distance applies)
              (S.brook && S.brook(a.it.x, a.it.y) < 10 ? ' ' + fact(db, [/gewaesser/, /bach/], '') : ''),
            'grenze'
          );
      }
    // 2 buildings: the trunk not in or at a wall, the grown crown not over the roof
    for (const a of A) {
      const woody = M.isTree(a.p) || a.p.schicht === 'strauch';
      for (const b of S.buildings || []) {
        const inB = inPoly(a.it.x, a.it.y, b.foot),
          d = inB ? 0 : edgeDist(a.it.x, a.it.y, b.foot);
        // a climber belongs at a wall (not in the building); everything else keeps a little room
        const climber = a.p.schicht === 'kletter' || (a.p.darstellung && a.p.darstellung.typ === 'kletter');
        if (inB || (d < 0.25 && !climber)) {
          add(
            'warn',
            [a.i],
            name(a.p) + ' steht ' + (inB ? bIn(b) : 'direkt ' + bAt(b)) + '.',
            inB
              ? 'Dort ist kein Boden zum Pflanzen.'
              : 'Unmittelbar an der Wand: kein Platz für Wurzeln und Krone, Spritzwasser, Traufe.',
            'bau'
          );
          continue;
        }
        if (!woody || climber) continue;
        const over = a.R - d;
        if (over > 0.5 && M.isTree(a.p))
          add(
            'warn',
            [a.i],
            name(a.p) + ': die Krone reicht ausgewachsen ' + de(over) + ' m über ' + bAcc(b) + '.',
            'Ausgewachsen etwa ' +
              de(a.grown.w) +
              ' m breit (' +
              de(d) +
              ' m vom Stamm bis zur Wand): Äste am Dach, Laub in der Rinne, Schatten.',
            'bau'
          );
        else if (over > 0)
          add(
            'hint',
            [a.i],
            name(a.p) + ': die Krone reicht ausgewachsen bis an ' + bAcc(b) + ' (' + de(d) + ' m Abstand).',
            'Ausgewachsen etwa ' + de(a.grown.w) + ' m breit – etwas weiter weg pflanzen oder regelmäßig schneiden.',
            'bau'
          );
      }
    }
    // 3 paths and the bridge
    const pw = S.pathW || 0.6;
    for (const a of A) {
      if (S.bridge && (inPoly(a.it.x, a.it.y, S.bridge) || edgeDist(a.it.x, a.it.y, S.bridge) < 0.6)) {
        add(
          'warn',
          [a.i],
          name(a.p) + ' steht auf der Brücke oder ihrer Zufahrt.',
          'Dort fahren Auto und Traktor.',
          'weg'
        );
        continue;
      }
      let d = Infinity;
      for (const L of S.paths || []) d = Math.min(d, lineDist(a.it.x, a.it.y, L));
      if (d < pw + 0.15)
        add('warn', [a.i], name(a.p) + ' steht auf dem Weg.', 'Der Kiesweg ist etwa 1,2 m breit.', 'weg');
      else if (M.isTree(a.p) && a.R > d - pw && a.cg.zb < 2.1)
        add(
          'hint',
          [a.i],
          name(a.p) + ': die Krone hängt ausgewachsen in den Weg.',
          'Unter der Krone bleiben nur etwa ' +
            de(a.cg.zb) +
            ' m – für den Durchgang braucht es gut 2 m (höherer Stamm oder Abstand).',
          'weg'
        );
    }
    // 4 wet ground at the brook
    if (S.brook)
      for (const a of A) {
        const d = S.brook(a.it.x, a.it.y);
        if (d === null || d === undefined) continue;
        const b = a.p.boden || {},
          wetOk = (b.feuchte || []).some(f => f === 'feucht' || f === 'nass');
        if (d < (S.ditch || 2.25))
          add(
            'warn',
            [a.i],
            name(a.p) + ' steht im Bachgraben.',
            'Die Böschung fällt dort 1,5 m zum Wasser ab.',
            'nass'
          );
        else if (d < (S.wet || 6) && b.staunaesse === 'nein')
          add(
            'warn',
            [a.i],
            name(a.p) + ' verträgt keine Staunässe – ' + de(d) + ' m vom Bach ist der Boden nass.',
            fact(
              db,
              /^Prunus/.test(a.p.art) ? [/staunaess/, /auenlehm|grundwasser/] : [/auenlehm|grundwasser/],
              'Am Bach steht das Grundwasser hoch; im Auenlehm staut sich nach Regen das Wasser, die Wurzeln faulen.'
            ),
            'nass'
          );
        else if (d < (S.wet || 6) && !wetOk)
          add(
            'hint',
            [a.i],
            name(a.p) + ' mag es eher frisch als feucht – nah am Bach (' + de(d) + ' m) ist der Boden feucht.',
            'Etwas weiter vom Bach weg oder auf einen flachen Hügel pflanzen.',
            'nass'
          );
      }
    // per plant (all its items together): late frost, protection, soil
    const byPlant = new Map();
    for (const a of A) {
      if (!byPlant.has(a.p.id)) byPlant.set(a.p.id, { p: a.p, items: [] });
      byPlant.get(a.p.id).items.push(a.i);
    }
    const frostWhy = fact(
      db,
      /spaetfrost|frost|kaltluft/,
      'Im Tal am Bach sammelt sich in klaren Nächten kalte Luft – Spätfröste bis in den Mai sind wahrscheinlich.'
    );
    for (const { p, items } of byPlant.values()) {
      const bl = p.bluete;
      if (bl && bl.monate && bl.monate[0] <= 4 && bl.monate[0] >= 2) {
        if (bl.spaetfrost === 'hoch')
          add(
            'warn',
            items,
            name(p) + ' blüht früh (ab ' + M.monthName(bl.monate[0]) + ') und ist spätfrostgefährdet.',
            frostWhy + ' Nur an einer geschützten, warmen Stelle (Südwand) oder eine spät blühende Art wählen.',
            'frost'
          );
        else if (bl.spaetfrost === 'mittel')
          add(
            'hint',
            items,
            name(p) + ' blüht ab ' + M.monthName(bl.monate[0]) + ' – in manchen Jahren erfriert die Blüte.',
            frostWhy,
            'frost'
          );
      }
      // soil (estimated): kind, pH, moisture
      const b = p.boden || {},
        miss = [];
      if (b.art && !b.art.some(k => k === 'lehm' || k === 'tonlehm' || k === 'lehmsand'))
        miss.push('leichten, sandigen Boden');
      if (b.ph && (b.ph[0] > 6.4 || b.ph[1] < 5.6)) miss.push('pH ' + de(b.ph[0]) + '–' + de(b.ph[1]));
      if (b.feuchte && b.feuchte.length === 1 && b.feuchte[0] === 'trocken') miss.push('trockenen Boden');
      if (miss.length)
        add(
          'hint',
          items,
          name(p) + ' mag ' + miss.join(', ') + ' – passt nicht ganz zum Garten.',
          'Boden im Garten: ' + SOIL + '.',
          'boden'
        );
    }
    // protection at planting, one note per kind of protection
    const prot = new Map();
    for (const { p, items } of byPlant.values())
      for (const s of p.schutz || []) {
        if (!prot.has(s)) prot.set(s, { names: [], items: [] });
        prot.get(s).names.push(p.name);
        prot.get(s).items.push(...items);
      }
    const PROT = {
      wuehlmauskorb: [
        'Beim Pflanzen einen Wühlmauskorb um den Ballen',
        fact(
          db,
          /wuehlmaus|maus/,
          'Wühlmäuse sind auf Wiesen mit Lehmboden häufig und fressen die Wurzeln junger Gehölze.'
        ),
      ],
      verbissschutz: [
        'Verbissschutz anbringen',
        fact(
          db,
          /ziege|verbiss/,
          'Die Ziegen beim Nachbarn und Rehe oder Hasen schälen Rinde und fressen junge Triebe.'
        ),
      ],
      pfahl: ['Mit Pfahl pflanzen und anbinden', 'Ein junger Baum braucht die ersten Jahre Halt gegen den Wind.'],
      stammschutz: ['Stammschutz anbringen', 'Wintersonne und Frost lassen die Rinde junger Bäume reißen.'],
      frostschutz: ['Bei Spätfrost mit Vlies schützen', frostWhy],
    };
    for (const [s, v] of prot)
      add(
        'hint',
        [...new Set(v.items)],
        (PROT[s] ? PROT[s][0] : s) + ': ' + [...new Set(v.names)].join(', ') + '.',
        PROT[s] ? PROT[s][1] : '',
        'schutz'
      );
    // 5 neighbours that do not get on (plant id, a whole layer or everything within a radius; null radius = its grown crown)
    const seen = new Set();
    for (const a of A)
      for (const u of a.p.unvertraeglich || []) {
        const r = u.radius_m !== undefined && u.radius_m !== null ? u.radius_m : a.R;
        for (const b of A) {
          if (b === a) continue;
          const hit = u.mit === '*' || u.mit === b.p.id || u.mit === 'schicht:' + b.p.schicht;
          if (!hit) continue;
          const d = Math.hypot(a.it.x - b.it.x, a.it.y - b.it.y);
          if (d >= r) continue;
          const k = Math.min(a.i, b.i) + ':' + Math.max(a.i, b.i);
          if (seen.has(k)) continue;
          seen.add(k);
          add(
            'warn',
            [a.i, b.i],
            name(a.p) + ' und ' + name(b.p) + ' vertragen sich nicht (' + de(d) + ' m, besser ab ' + de(r) + ' m).',
            u.grund,
            'nachbar'
          );
        }
      }
    // 6 pollination: a self-sterile cultivar needs another cultivar of the same species within ~30 m (a species without a cultivar
    // name – seedlings – or one that names itself as pollinator is pollinated by another plant of its own kind); one note per plant
    const POLL = opts.pollinatorM || 30;
    const lonely = new Map();
    for (const a of A) {
      const bf = a.p.befruchtung;
      if (!bf || (bf.selbstfruchtbar !== 'nein' && bf.selbstfruchtbar !== 'teilweise')) continue;
      const self = !a.p.sorte || (bf.befruchter || []).includes(a.p.id);
      const partner = A.some(
        b =>
          b !== a &&
          b.p.art === a.p.art &&
          (b.p.id !== a.p.id || self) &&
          Math.hypot(a.it.x - b.it.x, a.it.y - b.it.y) <= POLL
      );
      if (partner) continue;
      if (!lonely.has(a.p.id)) lonely.set(a.p.id, { p: a.p, items: [] });
      lonely.get(a.p.id).items.push(a.i);
    }
    for (const { p, items } of lonely.values()) {
      const bf = p.befruchtung,
        fits = (bf.befruchter || []).map(x => (db.byId.get(x) ? name(db.byId.get(x)) : x));
      // the fact about this kind of fruit (befruchtung-apfel for apples …), if the rules have one
      const f = (db.facts || []).find(
        x => x && /^befrucht/.test(x.id) && p.id.startsWith(x.id.replace(/^befruchtung-|^befrucht\w*-/, ''))
      );
      add(
        bf.selbstfruchtbar === 'nein' ? 'warn' : 'hint',
        items,
        name(p) +
          (items.length > 1 ? ' (' + items.length + '×)' : '') +
          (bf.selbstfruchtbar === 'nein'
            ? ' braucht ' + (p.sorte ? 'eine zweite Sorte' : 'eine zweite Pflanze')
            : ' trägt besser mit ' + (p.sorte ? 'einer zweiten Sorte' : 'einer zweiten Pflanze')) +
          ' als Befruchter in höchstens ' +
          POLL +
          ' m' +
          (fits.length ? ' – passend: ' + fits.join(', ') : '') +
          '.',
        (bf.selbstfruchtbar === 'nein' ? 'Selbstunfruchtbar' : 'Nur teilweise selbstfruchtbar') +
          ': Bienen bringen den Pollen einer anderen, gleichzeitig blühenden ' +
          (p.sorte ? 'Sorte' : 'Pflanze derselben Art') +
          '; ein passender Baum oder Strauch im Nachbargarten hilft auch.' +
          (p.sorte ? '' : ' Beim Kauf zwei verschiedene Sorten nehmen.') +
          (f ? ' ' + f.text : ''),
        'befruchter'
      );
    }
    // 7 crowns that grow into each other (trees with trees, shrubs with shrubs – a shrub under a tree is a guild)
    const big = A.filter(a => M.isTree(a.p) || a.p.schicht === 'strauch'),
      crowdFact = fact(db, /waldgarten-abstand|abstand-waldgarten/, '');
    for (let i = 0; i < big.length; i++)
      for (let j = i + 1; j < big.length; j++) {
        const a = big[i],
          b = big[j];
        if (M.isTree(a.p) !== M.isTree(b.p)) continue;
        const d = Math.hypot(a.it.x - b.it.x, a.it.y - b.it.y),
          need = a.R + b.R;
        if (d >= need * 0.8) continue;
        add(
          d < need * 0.45 ? 'warn' : 'hint',
          [a.i, b.i],
          name(a.p) +
            ' und ' +
            name(b.p) +
            ': die Kronen wachsen ineinander (' +
            de(d) +
            ' m Abstand, Platz braucht es für ' +
            de(need) +
            ' m).',
          'Ausgewachsen ' +
            de(a.grown.w) +
            ' und ' +
            de(b.grown.w) +
            ' m breit – gedrängt tragen sie weniger und werden anfälliger.' +
            (crowdFact ? ' ' + crowdFact : ''),
          'krone'
        );
      }
    // 8 light: plants that need full sun, in the shade of the planned plants (and buildings, standing trees) on a June day
    if (opts.light !== false) {
      const casters = [];
      for (const b of A) casters.push({ x: b.it.x, y: b.it.y, c: b.c, ref: b });
      for (const b of S.buildings || []) if (b.h) casters.push({ foot: b.foot, h: b.h });
      for (const t of S.trees || [])
        casters.push({ x: t[0], y: t[1], c: { zb: t[3] * 0.35, zc: t[3] * 0.65, a: t[3] * 0.32, r: t[2] } });
      const [y, m, d] = opts.june || [2026, 6, 21];
      // one note per plant (all its items in too much shade together); a tree or shrub that needs sun is a warning, a herb a hint
      const dark = new Map();
      for (const a of A) {
        const L = a.p.licht || [];
        const sunOnly = L.length === 1 && L[0] === 'sonne',
          noShade = !L.includes('schatten');
        if (!sunOnly && !noShade) continue;
        if (a.age === null) continue;
        const z = a.now.h * 0.5,
          cs = casters.filter(k => k.ref !== a && (!k.c || k.c.zc + k.c.a > z + 0.05));
        if (!cs.length) continue;
        const sh = GPSUN.shadeShare(a.it.x, a.it.y, z, cs, y, m, d, 40).share;
        if ((sunOnly && sh > 0.5) || (!sunOnly && sh > 0.8)) {
          const k = a.p.id + (sunOnly ? ':s' : ':h');
          if (!dark.has(k)) dark.set(k, { p: a.p, sunOnly, items: [], sh: [] });
          dark.get(k).items.push(a.i);
          dark.get(k).sh.push(sh);
        }
      }
      const when = 'Gerechnet für den 21. Juni ' + (opts.age ? 'in ' + opts.age + ' Jahren' : 'beim Pflanzen');
      for (const g of dark.values()) {
        const lo = Math.round(Math.min(...g.sh) * 100),
          hi = Math.round(Math.max(...g.sh) * 100),
          pct = lo === hi ? lo + ' %' : lo + '–' + hi + ' %',
          n = g.items.length > 1 ? ' (' + g.items.length + '×)' : '',
          woody = M.isTree(g.p) || g.p.schicht === 'strauch';
        if (g.sunOnly)
          add(
            woody ? 'warn' : 'hint',
            g.items,
            name(g.p) + n + ' braucht volle Sonne, steht aber im Juni ' + pct + ' des Tages im Schatten.',
            when +
              ' mit den geplanten Pflanzen, den Gebäuden und den Bäumen im Garten' +
              (woody ? ' – im Schatten trägt sie kaum.' : '.'),
            'licht'
          );
        else
          add(
            'hint',
            g.items,
            name(g.p) + n + ' steht im Juni ' + pct + ' des Tages im Schatten – für Halbschatten zu dunkel.',
            when + '.',
            'licht'
          );
      }
    }
    // warnings first, then by the order of the items
    W.sort((a, b) => (a.level === b.level ? 0 : a.level === 'warn' ? -1 : 1) || a.items[0] - b.items[0]);
    return W;
  }
  // ---- the adviser for one plant: how big, how fast, soil, partners, harvest, care ----
  function tips(p, db) {
    const F = M.finalSize(p),
      T = p.jahre_bis_endgroesse,
      s5 = M.sizeAt(p, 5),
      out = [];
    out.push(
      'Wuchs: gepflanzt etwa ' +
        de(p.pflanzhoehe_m) +
        ' m, nach 5 Jahren etwa ' +
        de(s5.h) +
        ' m, ausgewachsen nach etwa ' +
        T +
        ' Jahren ' +
        de(F.h) +
        ' m hoch und ' +
        de(F.w) +
        ' m breit' +
        (T <= 5 ? ' – wächst schnell' : T >= 25 ? ' – wächst langsam' : '') +
        '.'
    );
    const b = p.boden || {},
      okSoil = (b.art || []).some(k => k === 'lehm' || k === 'tonlehm' || k === 'lehmsand'),
      okPh = !b.ph || (b.ph[0] <= 6.4 && b.ph[1] >= 5.6);
    out.push(
      'Boden: ' +
        (okSoil && okPh ? 'passt zum Auenlehm des Gartens' : 'passt nur bedingt zum Auenlehm des Gartens') +
        ' (mag ' +
        (b.art || []).join(', ') +
        ', pH ' +
        (b.ph ? de(b.ph[0]) + '–' + de(b.ph[1]) : '?') +
        ', ' +
        (b.feuchte || []).join(' bis ') +
        (b.staunaesse === 'nein' ? ', keine Staunässe' : '') +
        ').'
    );
    const L = { sonne: 'Sonne', halbschatten: 'Halbschatten', schatten: 'Schatten' };
    out.push('Licht: ' + (p.licht || []).map(l => L[l] || l).join(' oder ') + '.');
    if (p.partner && p.partner.length)
      out.push(
        'Verträgt sich gut mit: ' +
          p.partner
            .map(
              n =>
                (db.byId.get(n.mit) ? name(db.byId.get(n.mit)) : n.mit.replace('schicht:', 'Schicht ')) +
                ' (' +
                n.grund +
                ')'
            )
            .join('; ') +
          '.'
      );
    if (p.unvertraeglich && p.unvertraeglich.length)
      out.push(
        'Nicht neben: ' +
          p.unvertraeglich
            .map(
              n =>
                (n.mit === '*' ? 'anderen Pflanzen' : db.byId.get(n.mit) ? name(db.byId.get(n.mit)) : n.mit) +
                ' (' +
                n.grund +
                ')'
            )
            .join('; ') +
          '.'
      );
    if (p.befruchtung && p.befruchtung.selbstfruchtbar !== 'ja')
      out.push(
        'Befruchtung: ' +
          (p.befruchtung.selbstfruchtbar === 'nein' ? 'selbstunfruchtbar' : 'teilweise selbstfruchtbar') +
          (p.befruchtung.befruchter.length
            ? ' – Befruchter: ' +
              p.befruchtung.befruchter.map(x => (db.byId.get(x) ? name(db.byId.get(x)) : x)).join(', ')
            : '') +
          '.'
      );
    if (p.bluete)
      out.push('Blüte: ' + M.monthRange(p.bluete.monate) + ' (Spätfrost-Risiko ' + p.bluete.spaetfrost + ').');
    if (p.ernte)
      out.push(
        'Ernte: ' +
          M.monthRange(p.ernte.monate) +
          (p.ernte.kg_jahr ? ', etwa ' + p.ernte.kg_jahr[0] + '–' + p.ernte.kg_jahr[1] + ' kg im Jahr' : '') +
          (p.ernte.text ? ' – ' + p.ernte.text : '') +
          '.'
      );
    out.push('Pflege: ' + p.pflege);
    out.push('Pflanzzeit: ' + M.monthRange(p.pflanzzeit) + '. ' + M.kammbach(p) + '.');
    return out;
  }
  return { check, tips, segDist, inPoly, edgeDist, lineDist };
})();
