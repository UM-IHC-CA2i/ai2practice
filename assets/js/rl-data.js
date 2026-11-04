/*
 * rl-data.js - Research Lab practice data and report-back answers.
 *
 * Same generator as notebooks/rl_data.py: the same username gives the same
 * rows in Python (Colab) and here, so the lab page can check the numbers a
 * learner reports back. Keep the two files in sync; the parity test is
 * planning/scripts/test_rl_parity.py.
 *
 *   RLData.dataset(lab, username)      -> array of row objects (labs 1, 2, 3, 5)
 *   RLData.answers(lab, username)      -> [{id, label, value, tol, unit, hint, explain, ...}]
 *   RLData.check(lab, username, id, x) -> true | false
 *
 * Plain browser script, no modules or dependencies. Also works in Node
 * (module.exports) for testing.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- PRNG --
  function normalizeUsername(username) {
    var u = String(username == null ? '' : username).trim().toLowerCase();
    return u || 'demo';
  }

  function utf8Bytes(s) {
    var bin = unescape(encodeURIComponent(s));
    var out = [];
    for (var i = 0; i < bin.length; i++) out.push(bin.charCodeAt(i));
    return out;
  }

  function seedFor(lab, username) {
    var h = 0x811c9dc5;
    var bytes = utf8Bytes(lab + ':' + normalizeUsername(username));
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function Rng(seed) { this.a = seed >>> 0; }
  Rng.prototype.u = function () {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    var a = this.a;
    var t = Math.imul(a ^ (a >>> 15), a | 1) >>> 0;
    t = (((t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0)) >>> 0) ^ t) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.int = function (n) { return Math.floor(this.u() * n); };
  Rng.prototype.pick = function (items) { return items[this.int(items.length)]; };
  Rng.prototype.weighted = function (items, weights) {
    var x = this.u(), acc = 0;
    for (var i = 0; i < items.length; i++) {
      acc += weights[i];
      if (x < acc) return items[i];
    }
    return items[items.length - 1];
  };
  Rng.prototype.normal = function () {
    var s = 0;
    for (var i = 0; i < 12; i++) s += this.u();
    return s - 6;
  };

  function round(x, d) { var p = Math.pow(10, d); return Math.floor(x * p + 0.5) / p; }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

  // --------------------------------------------------------------- Lab 1 --
  var REGIONS = ['Head', 'Chest', 'Abdomen/Pelvis', 'Spine', 'Extremity'];
  var REGION_W = [0.29, 0.25, 0.28, 0.10, 0.08];
  var DEPTS = ['ED', 'Inpatient', 'Outpatient'];
  var DEPT_W = [0.45, 0.25, 0.30];

  function lab1(r) {
    var rows = [];
    for (var day = 1; day <= 31; day++) {
      var weekday = (3 + day - 1) % 7;
      var n = weekday >= 5 ? 6 + r.int(5) : 12 + r.int(8);
      for (var k = 0; k < n; k++) {
        var region = r.weighted(REGIONS, REGION_W);
        var dept = r.weighted(DEPTS, DEPT_W);
        var mean = (region === 'Chest' || region === 'Abdomen/Pelvis') ? 58 : 50;
        var age = Math.floor(clamp(mean + 19 * r.normal(), 18, 97));
        rows.push({
          study_id: 'CT' + pad(rows.length + 1, 4),
          date: '2026-10-' + pad(day, 2),
          body_region: region,
          age: age,
          ordering_dept: dept
        });
      }
    }
    return rows;
  }

  // --------------------------------------------------------------- Lab 2 --
  var MALE_CODES = ['M', 'M', 'M', 'male', 'Male', 'm'];
  var FEMALE_CODES = ['F', 'F', 'F', 'female', 'Female', 'f'];

  function lab2(r) {
    var n = 200 + r.int(41);
    var rows = [];
    for (var i = 0; i < n; i++) {
      var modality = r.u() < 0.55 ? 'CT' : 'MRI';
      var mean = modality === 'CT' ? 61 : 53;
      var age = Math.floor(clamp(mean + 16 * r.normal(), 18, 96));
      var sex = r.u() < 0.5 ? r.pick(MALE_CODES) : r.pick(FEMALE_CODES);
      var x = r.u();
      if (x < 0.05) age = null;
      else if (x < 0.065) age = 999;
      rows.push({ patient_id: 'P' + pad(i + 1, 4), modality: modality, age: age, sex: sex });
    }
    var nDup = 5 + r.int(5);
    for (var d = 0; d < nDup; d++) {
      var src = r.int(rows.length);
      var dst = r.int(rows.length + 1);
      var copy = {};
      for (var key in rows[src]) copy[key] = rows[src][key];
      rows.splice(dst, 0, copy);
    }
    return rows;
  }

  // --------------------------------------------------------------- Lab 3 --
  function lab3(r) {
    var n = 380 + r.int(61);
    var rows = [];
    for (var i = 0; i < n; i++) {
      var site = r.u() < 0.55 ? 'A' : 'B';
      var truth = r.u() < 0.30 ? 1 : 0;
      var z = r.normal();
      var score;
      if (site === 'A') score = truth ? 0.72 + 0.14 * z : 0.25 + 0.14 * z;
      else score = truth ? 0.58 + 0.17 * z : 0.33 + 0.16 * z;
      score = round(clamp(score, 0.001, 0.999), 3);
      rows.push({ case_id: 'PTX' + pad(i + 1, 4), site: site, truth: truth, score: score });
    }
    return rows;
  }

  // --------------------------------------------------------------- Lab 5 --
  var TECHNIQUE = [
    'CT chest with contrast.',
    'CT chest without contrast.',
    'CT chest, pulmonary embolism protocol.',
    'Low-dose CT chest.'
  ];
  var INDICATION = [
    'Indication: shortness of breath.',
    'Indication: chest pain.',
    'Indication: cough for three weeks.',
    'Indication: trauma, motor vehicle collision.',
    'Indication: fever, rule out pneumonia.',
    'Indication: staging, colon cancer.'
  ];
  var LUNG_POS = [
    ['A 6 mm solid nodule in the right upper lobe.', 'pos'],
    ['There is a 5 mm pulmonary nodule in the left lower lobe.', 'pos'],
    ['Small 4 mm nodule in the lingula.', 'pos'],
    ['New 8 mm part-solid nodule in the right lower lobe.', 'pos'],
    ['A 7 mm ground-glass nodule in the left upper lobe.', 'pos']
  ];
  var LUNG_SYN = [
    ['An 8 mm rounded opacity in the right middle lobe, indeterminate.', 'syn'],
    ['A 6 mm lesion in the left upper lobe.', 'syn'],
    ['A 9 mm spiculated density in the right upper lobe.', 'syn']
  ];
  var LUNG_NEG = [
    ['No pulmonary nodule.', 'neg'],
    ['No suspicious pulmonary nodules or masses.', 'neg'],
    ['The previously described nodule has resolved.', 'neg'],
    ['Lungs are clear without nodule or consolidation.', 'neg']
  ];
  var LUNG_CLEAR = [
    ['Lungs are clear.', 'clear'],
    ['Mild dependent atelectasis at both lung bases.', 'clear'],
    ['Mild emphysematous changes in the upper lobes.', 'clear'],
    ['Patchy consolidation in the right lower lobe, consistent with pneumonia.', 'clear'],
    ['Small bilateral pleural effusions.', 'clear']
  ];
  var OTHER = [
    'Heart size is normal.',
    'Mild coronary artery calcification.',
    'No pericardial effusion.',
    'No enlarged mediastinal or hilar lymph nodes.',
    'No acute fracture.',
    'Degenerative changes of the thoracic spine.',
    'The visualized upper abdomen is unremarkable.',
    'Small hiatal hernia.'
  ];
  var IMPRESSION_POS = [
    'Impression: pulmonary finding as above; follow-up CT recommended per Fleischner Society guidelines.',
    'Impression: indeterminate small lung finding; recommend follow-up chest CT.'
  ];
  var IMPRESSION_NEG = [
    'Impression: no acute cardiopulmonary abnormality.',
    'Impression: findings as above. No follow-up imaging needed for the lungs.'
  ];
  var LLM_ERROR_P = { pos: 0.02, syn: 0.18, neg: 0.15, clear: 0.01 };

  function lab5(r) {
    var n = 115 + r.int(11);
    var rows = [];
    for (var i = 0; i < n; i++) {
      var x = r.u(), choice;
      if (x < 0.18) choice = r.pick(LUNG_POS);
      else if (x < 0.27) choice = r.pick(LUNG_SYN);
      else if (x < 0.47) choice = r.pick(LUNG_NEG);
      else choice = r.pick(LUNG_CLEAR);
      var sentence = choice[0], kind = choice[1];
      var truth = (kind === 'pos' || kind === 'syn') ? 1 : 0;
      var o1 = r.pick(OTHER);
      var o2 = r.pick(OTHER);
      var parts = [r.pick(TECHNIQUE), r.pick(INDICATION), sentence, o1];
      if (o2 !== o1) parts.push(o2);
      parts.push(truth ? r.pick(IMPRESSION_POS) : r.pick(IMPRESSION_NEG));
      var llm = truth;
      if (r.u() < LLM_ERROR_P[kind]) llm = 1 - truth;
      rows.push({ report_id: 'R' + pad(i + 1, 3), text: parts.join(' '), truth_nodule: truth, llm_nodule: llm });
    }
    return rows;
  }

  var GEN = { 1: lab1, 2: lab2, 3: lab3, 5: lab5 };

  function dataset(lab, username) {
    var g = GEN[Number(lab)];
    if (!g) throw new Error('Labs with generated data: 1, 2, 3, 5');
    return g(new Rng(seedFor(Number(lab), username)));
  }

  // ------------------------------------------------------------- Answers --
  function count(rows, fn) { var n = 0; for (var i = 0; i < rows.length; i++) if (fn(rows[i])) n++; return n; }
  function pct1(num, den) { return den ? round(100 * num / den, 1) : 0; }

  function clean2(rows) {
    // Notebook rules: 1 drop exact duplicate rows; 2 standardize sex to M/F;
    // 3 ages outside 0-120 become missing; 4 drop rows with missing age.
    var seen = {}, out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var key = JSON.stringify([r.patient_id, r.modality, r.age, r.sex]);
      if (seen[key]) continue;
      seen[key] = true;
      var age = r.age;
      if (age !== null && (age < 0 || age > 120)) age = null;
      if (age === null) continue;
      out.push({ patient_id: r.patient_id, modality: r.modality, age: age, sex: r.sex.charAt(0).toUpperCase() });
    }
    return out;
  }

  function meanAge(rows, modality) {
    var s = 0, n = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].modality === modality) { s += rows[i].age; n++; }
    return n ? round(s / n, 1) : 0;
  }

  function sensSpec(rows, threshold) {
    var tp = 0, fp = 0, fn = 0, tn = 0;
    for (var i = 0; i < rows.length; i++) {
      var pred = rows[i].score >= threshold ? 1 : 0, t = rows[i].truth;
      if (pred && t) tp++; else if (pred && !t) fp++; else if (!pred && t) fn++; else tn++;
    }
    return { tp: tp, fp: fp, fn: fn, tn: tn, sens: pct1(tp, tp + fn), spec: pct1(tn, tn + fp) };
  }

  function item(id, label, value, tol, unit, hint, explain, extra) {
    var o = { id: id, label: label, value: value, tol: tol, unit: unit, hint: hint, explain: explain, type: 'number' };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  function answers(lab, username) {
    lab = Number(lab);
    var rows, i;
    if (lab === 1) {
      rows = dataset(1, username);
      var counts = {};
      for (i = 0; i < rows.length; i++) counts[rows[i].body_region] = (counts[rows[i].body_region] || 0) + 1;
      var top = 0;
      for (var k in counts) if (counts[k] > top) top = counts[k];
      return [
        item('total', 'Total CT studies in the month', rows.length, 0, 'studies',
          'Each row is one study. len(df) or df.shape[0] counts the rows.',
          'The table has one row per CT study, so the number of rows is the number of studies: len(df).'),
        item('chest', 'Number of Chest CTs', counts.Chest || 0, 0, 'studies',
          'Use value_counts() on the body_region column and read the Chest line.',
          "df['body_region'].value_counts() counts how many rows have each body region. The Chest line is the answer."),
        item('top_count', 'Studies in the most common body region', top, 0, 'studies',
          'value_counts() sorts from most to least common; the first number is the one you need.',
          "value_counts() lists the most common body region first. Enter its count (df['body_region'].value_counts().iloc[0]), not its name.")
      ];
    }
    if (lab === 2) {
      var c = clean2(dataset(2, username));
      return [
        item('rows_clean', 'Rows after cleaning', c.length, 0, 'patients',
          'Apply all four cleaning rules in order: duplicates, sex codes, impossible ages, missing ages. Then count rows.',
          'Dropping duplicate rows, turning impossible ages (like 999) into missing values and then dropping rows with a missing age leaves this many patients. Standardizing sex codes changes values, not the number of rows.'),
        item('mean_ct', 'Mean age, CT group (1 decimal)', meanAge(c, 'CT'), 0.1, 'years',
          "Use the cleaned table. df.groupby('modality')['age'].mean() gives both groups at once.",
          'The mean is the sum of ages divided by the number of patients, computed on the cleaned table only. If you got a much higher number, an age of 999 is probably still in the data.'),
        item('mean_mri', 'Mean age, MRI group (1 decimal)', meanAge(c, 'MRI'), 0.1, 'years',
          'Same groupby as for CT; read the MRI line and round to 1 decimal.',
          'Same calculation as the CT group, on the MRI rows of the cleaned table.')
      ];
    }
    if (lab === 3) {
      rows = dataset(3, username);
      var all = sensSpec(rows, 0.5);
      var siteB = sensSpec(rows.filter(function (r) { return r.site === 'B'; }), 0.5);
      return [
        item('sens', 'Sensitivity at threshold 0.5 (%)', all.sens, 0.1, '%',
          'Call a case positive when score >= 0.5. Sensitivity = TP / (TP + FN), the share of real pneumothoraces the tool caught.',
          'With the threshold at 0.5, sensitivity is true positives divided by all cases that truly have a pneumothorax (TP + FN), times 100.'),
        item('spec', 'Specificity at threshold 0.5 (%)', all.spec, 0.1, '%',
          'Specificity = TN / (TN + FP), the share of cases without pneumothorax that the tool called negative.',
          'Specificity is true negatives divided by all cases without a pneumothorax (TN + FP), times 100. A common mistake is dividing by the number the tool called negative instead; that gives NPV.'),
        item('sens_b', 'Sensitivity at site B (%)', siteB.sens, 0.1, '%',
          "Filter to site B first (df[df['site'] == 'B']), then compute sensitivity the same way.",
          'Subgroup analysis means repeating the calculation inside one group. At site B the tool misses more pneumothoraces than at site A, which an overall number hides.')
      ];
    }
    if (lab === 4) {
      return [
        item('test_n', 'Images in the PneumoniaMNIST test set', 624, 0, 'images',
          'Print len(test_dataset) or the shape of the test images array.',
          'PneumoniaMNIST comes already split; the test split has 624 chest X-rays.'),
        item('test_pneumonia', 'Pneumonia images in the test set', 390, 0, 'images',
          'Count the test labels equal to 1 (pneumonia).',
          'Of the 624 test images, 390 are labeled pneumonia and 234 normal, so a model that always says "pneumonia" would already be 62.5% accurate.'),
        item('test_acc', 'Your model\'s test accuracy (%)', 75, 25, '%',
          'Use the accuracy printed by the evaluation cell, as a percentage (for example 84.3).',
          'Any accuracy from 50 to 100 is accepted, because training starts from random weights and results vary from run to run. Compare yours with 62.5%, the score of always guessing pneumonia.',
          { min: 50, max: 100 })
      ];
    }
    if (lab === 5) {
      rows = dataset(5, username);
      var truthN = count(rows, function (r) { return r.truth_nodule === 1; });
      var kw = count(rows, function (r) { return r.text.indexOf('nodule') >= 0; });
      var errs = count(rows, function (r) { return r.llm_nodule !== r.truth_nodule; });
      return [
        item('truth_n', 'Reports with a true incidental nodule', truthN, 0, 'reports',
          "Sum the truth_nodule column: df['truth_nodule'].sum().",
          'truth_nodule is 1 when a radiologist marked the report as describing a lung nodule, whatever word the report used. Adding up the 1s counts those reports.'),
        item('keyword_n', 'Reports flagged by the rule "nodule" in text', kw, 0, 'reports',
          "Make a column with df['text'].str.contains('nodule') and sum it.",
          'The keyword rule flags every report containing the letters "nodule", including "No pulmonary nodule", and misses nodules called an opacity, lesion or density. That is why its count differs from the true count.'),
        item('llm_errors', 'LLM errors (false positives + false negatives)', errs, 0, 'reports',
          'Count rows where llm_nodule is not equal to truth_nodule.',
          'An error is any report where the saved LLM answer disagrees with the truth: false positives (LLM says nodule, none present) plus false negatives (LLM misses one).')
      ];
    }
    if (lab === 6) {
      return [
        { id: 'repo', type: 'url', label: 'Your public GitHub project repository', value: null, tol: null, unit: '',
          hint: 'Copy the address from your browser on the repository page. It looks like https://github.com/your-username/your-repo.',
          explain: 'The link should point to a public repository on github.com, with your username and the repository name and nothing after them.' },
        { id: 'abstract', type: 'text', label: 'Your structured abstract', value: null, tol: null, unit: '',
          hint: 'Paste the whole abstract, with Background, Methods, Results and Conclusion sections, about 150-300 words.',
          explain: 'A structured abstract has four short labeled sections. Any abstract of at least 50 words is accepted; it is saved, not scored.' }
      ];
    }
    return [];
  }

  var REPO_RE = /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]+\/?$/;

  function check(lab, username, id, input) {
    var list = answers(lab, username), a = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) a = list[i];
    if (!a) return false;
    var s = String(input == null ? '' : input).trim();
    if (a.type === 'url') return REPO_RE.test(s);
    if (a.type === 'text') return s.split(/\s+/).filter(Boolean).length >= 50;
    s = s.replace(/%$/, '').replace(/,/g, '').trim();
    if (s === '' || isNaN(Number(s))) return false;
    var x = Number(s);
    if (typeof a.min === 'number' && typeof a.max === 'number') return x >= a.min && x <= a.max;
    return Math.abs(x - a.value) <= a.tol + 1e-9;
  }

  var api = {
    version: 1,
    labs: [1, 2, 3, 5],
    normalizeUsername: normalizeUsername,
    seedFor: seedFor,
    dataset: dataset,
    answers: answers,
    check: check
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RLData = api;
})(typeof window !== 'undefined' ? window : this);
