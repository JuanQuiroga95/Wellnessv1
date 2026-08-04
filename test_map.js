const METRIC_COL_MAP = [
  ['hsr (m/min)', 'hsr_per_min'], ['hsr per min', 'hsr_per_min'],
  ['hsr/min', 'hsr_per_min'], ['hsr m/min', 'hsr_per_min'],
  ['dist sprint/min', 'sprint_dist_per_min'], ['sprint dist per minute', 'sprint_dist_per_min'],
  ['sprint/min', 'sprint_dist_per_min'], ['sprint m/min', 'sprint_dist_per_min'],
  ['acc int/min', 'acc_int_per_min'],
  ['acc/min (n/min)', 'acc_per_min'], ['acc/min(n/min)', 'acc_per_min'],
  ['acc/min', 'acc_per_min'], ['aceleraciones/min', 'acc_per_min'], ['accel/min', 'acc_per_min'],
  ['dec/min (n/min)', 'dec_per_min'], ['dec/min(n/min)', 'dec_per_min'],
  ['dec/min', 'dec_per_min'], ['desaceleraciones/min', 'dec_per_min'], ['decel/min', 'dec_per_min'],
  ['max acc', 'max_acc'], ['maxima aceleracion', 'max_acc'],
  ['max dec', 'max_dec'], ['maxima desaceleracion', 'max_dec']
];

function mapHeaderToMetric(header) {
  const h = (header || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (!h) return null

  for (const [pattern, key] of METRIC_COL_MAP) {
    if (h === pattern) return key
  }

  for (const [pattern, key] of METRIC_COL_MAP) {
    if (h.includes(pattern)) {
      if (pattern.length <= 4) {
        const re = new RegExp(`(?:^|[^a-z])${pattern.replace(/[.*+?^${}()|[\\]\\\\\\/]/g, '\\\\$&')}(?:$|[^a-z])`)
        if (re.test(h)) return key
      } else {
        return key
      }
    }
  }
  return null
}

console.log('ACC/MIN ->', mapHeaderToMetric('ACC/MIN'));
console.log('DEC/MIN ->', mapHeaderToMetric('DEC/MIN'));
