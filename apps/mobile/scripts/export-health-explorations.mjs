#!/usr/bin node
/**
 * Export health exploration content from prototype.html to Excel for editing.
 * Run: node scripts/export-health-explorations.mjs
 * Output: content-export/health-explorations-content.xlsx
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const prototypePath = path.join(mobileRoot, 'prototype.html');
const outDir = path.join(mobileRoot, 'content-export');
const outFile = path.join(outDir, 'health-explorations-content.xlsx');

function extractConst(name, html) {
  const marker = `const ${name} = `;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${name} in prototype.html`);
  let i = start + marker.length;
  let depth = 0;
  let end = i;
  for (; end < html.length; end++) {
    const c = html[end];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
    if (c === '[' && depth === 0) {
      // array const
    }
  }
  // handle array RESEARCHERS
  if (html[start + marker.length] === '[') {
    end = html.indexOf('];', start) + 2;
    return eval(html.slice(start + marker.length, end));
  }
  return eval(`(${html.slice(i, end)})`);
}

function extractResearchers(html) {
  const marker = 'const RESEARCHERS = ';
  const start = html.indexOf(marker);
  const end = html.indexOf('];', start) + 2;
  return eval(html.slice(start + marker.length, end));
}

function rowsExplorations(EXPLORATIONS, LIST_CARDS) {
  const headers = [
    'exploration_id',
    'title',
    'category',
    'icon',
    'background_color',
    'text_color',
    'active',
    'duration',
    'participants',
    'is_new',
    'status_badge',
    'progress_percent',
    'streak_days',
    'description_detail',
    'description_list_card',
    'list_badges',
    'explorers_active_label',
    'chart_label'
  ];
  const rows = [headers];
  for (const [id, e] of Object.entries(EXPLORATIONS)) {
    const list = LIST_CARDS[id] || {};
    rows.push([
      id,
      e.title,
      e.category || list.category || '',
      e.icon,
      e.bg,
      e.text || '',
      e.active ? 'yes' : 'no',
      e.duration || '',
      e.participants ?? '',
      e.isNew ? 'yes' : 'no',
      e.statusBadge || '',
      e.progress ?? '',
      e.streak ?? '',
      e.desc || '',
      list.list_desc || e.desc || '',
      list.badges || '',
      list.explorers_label || (e.participants ? `${e.participants} explorers active` : ''),
      e.chartLabel || ''
    ]);
  }
  return rows;
}

function rowsPhases(EXPLORATIONS) {
  const rows = [['exploration_id', 'phase_order', 'phase_name', 'phase_description', 'phase_status']];
  for (const [id, e] of Object.entries(EXPLORATIONS)) {
    (e.phases || []).forEach((p, i) => {
      rows.push([id, i + 1, p.name, p.desc, p.status]);
    });
  }
  return rows;
}

function rowsOutcomes(EXPLORATIONS) {
  const rows = [['exploration_id', 'outcome_order', 'icon', 'outcome_text']];
  for (const [id, e] of Object.entries(EXPLORATIONS)) {
    (e.outcomes || []).forEach((o, i) => {
      rows.push([id, i + 1, o.icon, o.label]);
    });
  }
  return rows;
}

function rowsKpis(EXPLORATIONS) {
  const rows = [['exploration_id', 'kpi_order', 'label', 'value', 'unit', 'change', 'change_positive']];
  for (const [id, e] of Object.entries(EXPLORATIONS)) {
    (e.kpis || []).forEach((k, i) => {
      rows.push([id, i + 1, k.label, k.val, k.unit, k.change, k.up ? 'yes' : 'no']);
    });
  }
  return rows;
}

function rowsChart(EXPLORATIONS) {
  const rows = [['exploration_id', 'day_order', 'day_label', 'bar_height_percent', 'value_label', 'highlighted', 'empty']];
  for (const [id, e] of Object.entries(EXPLORATIONS)) {
    (e.chart || []).forEach((d, i) => {
      rows.push([id, i + 1, d.day, d.h, d.v, d.hi ? 'yes' : 'no', d.empty ? 'yes' : 'no']);
    });
  }
  return rows;
}

function rowsLogFields(EXPLORATIONS) {
  const rows = [
    [
      'exploration_id',
      'field_order',
      'field_id',
      'field_type',
      'label',
      'min',
      'max',
      'step',
      'default_value',
      'unit',
      'hint_low',
      'hint_high',
      'placeholder',
      'field_hint',
      'options',
      'default_selected_index',
      'multi_select'
    ]
  ];
  for (const [id, e] of Object.entries(EXPLORATIONS)) {
    (e.fields || []).forEach((f, i) => {
      rows.push([
        id,
        i + 1,
        f.id,
        f.type,
        f.label,
        f.min ?? '',
        f.max ?? '',
        f.step ?? '',
        f.val ?? '',
        f.unit || '',
        f.hints?.[0] || '',
        f.hints?.[1] || '',
        f.placeholder || '',
        f.hint || '',
        f.opts ? f.opts.join(' | ') : '',
        f.sel ?? '',
        f.multi ? 'yes' : 'no'
      ]);
    });
  }
  return rows;
}

function rowsComingSoon() {
  return [
    ['exploration_id', 'status', 'label', 'title', 'description', 'notes'],
    [
      'treatment',
      'coming_soon',
      'Coming soon',
      'Treatment exploration',
      'Focus on an existing or new treatment or prescription and explore how well it works for you.',
      'Shown on Exploration tab; not in EXPLORATIONS object yet'
    ]
  ];
}

function rowsResearcherLinks(RESEARCHERS) {
  const rows = [['researcher_id', 'researcher_name', 'organisation', 'exploration_id', 'exploration_note']];
  for (const r of RESEARCHERS) {
    for (const ex of r.explorations || []) {
      rows.push([r.id, r.name, r.org, ex.expId, ex.note]);
    }
  }
  return rows;
}

function rowsReadme() {
  return [
    ['Sheet', 'Purpose', 'Maps to in app'],
    ['Explorations', 'One row per exploration — core metadata and copy', 'EXPLORATIONS in prototype.html'],
    ['List_cards', 'Short copy shown on Exploration tab cards', 'explore-area rows in prototype.html'],
    ['Protocol_phases', 'Timeline / protocol steps', 'phases[] per exploration'],
    ['Expected_outcomes', 'Bullets for non-active explorations', 'outcomes[]'],
    ['KPIs', 'Active exploration dashboard metrics (morning-rules)', 'kpis[]'],
    ['Chart_data', 'Chart bars (morning-rules)', 'chart[]'],
    ['Log_fields', 'Daily log form fields', 'fields[]'],
    ['Coming_soon', 'Planned explorations not yet in app data', 'coming-soon-box HTML'],
    ['Researcher_explorations', 'Researcher profiles linked to explorations', 'RESEARCHERS[].explorations'],
    ['', '', ''],
    ['How to use', 'Edit cells in Excel, save, and share the file back for import into the web app', '']
  ];
}

const LIST_CARDS = {
  'morning-rules': {
    category: 'Energy & Focus',
    list_desc: '8-week morning routine protocol · Week 3 of 8',
    badges: 'Active; 9-day streak',
    explorers_label: '78 explorers active'
  },
  eating: {
    category: 'Metabolic Health',
    list_desc: '6-week eating window exploration, energy and mood tracked daily',
    explorers_label: '64 explorers active'
  },
  'screen-sleep': {
    category: 'Rest & Sleep',
    list_desc: '6-week evening screen reduction protocol, sleep quality tracked nightly',
    explorers_label: '51 explorers active'
  },
  relaxation: {
    category: 'Mental Health',
    list_desc: '6-week relaxation protocol — practices, stress, anxiety, and composure tracked daily',
    explorers_label: '58 explorers active'
  },
  'upf-mood': {
    category: 'Diet & Nutrition',
    list_desc: '6-week UPF reduction protocol — daily UPF %, mood, and energy tracked',
    explorers_label: '22 explorers active'
  }
};

function main() {
  const html = fs.readFileSync(prototypePath, 'utf8');
  const EXPLORATIONS = extractConst('EXPLORATIONS', html);
  const RESEARCHERS = extractResearchers(html);

  fs.mkdirSync(outDir, { recursive: true });

  const wb = XLSX.utils.book_new();
  const add = (name, rows) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };

  add('README', rowsReadme());
  add('Explorations', rowsExplorations(EXPLORATIONS, LIST_CARDS));
  add('List_cards', [
    ['exploration_id', 'list_title', 'list_description', 'badges', 'explorers_label'],
    ...Object.entries(LIST_CARDS).map(([id]) => {
      const e = EXPLORATIONS[id];
      const l = LIST_CARDS[id];
      return [id, e?.title || '', l.list_desc, l.badges || '', l.explorers_label || ''];
    })
  ]);
  add('Protocol_phases', rowsPhases(EXPLORATIONS));
  add('Expected_outcomes', rowsOutcomes(EXPLORATIONS));
  add('KPIs', rowsKpis(EXPLORATIONS));
  add('Chart_data', rowsChart(EXPLORATIONS));
  add('Log_fields', rowsLogFields(EXPLORATIONS));
  add('Coming_soon', rowsComingSoon());
  add('Researcher_explorations', rowsResearcherLinks(RESEARCHERS));

  XLSX.writeFile(wb, outFile);
  console.log(`Wrote ${outFile}`);
}

main();
