window.CSMRules = (function() {
  const SEGMENT_MIN = 290; // 4h50 max limit
  const BREAK_MIN = 30;    // 30 min required break
  const WARN_MIN = 270;    // 4h30 warning
  const CRIT_MIN = 290;
  const FULL_NOBREAK_MIN = 610; // 10h10 max day

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function minToHM(min) {
    if (min == null || isNaN(min)) return null;
    let m = Math.round(min) % 1440;
    if (m < 0) m += 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }
  
  function hmToMin(hm) {
    if (!hm) return null;
    const parts = hm.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function fmtHrs(min) {
    if (min == null || isNaN(min)) return '';
    let m = Math.round(min);
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function nameTokens(name) {
    if (!name) return [];
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean);
  }

  function sameName(a, b) {
    const tA = nameTokens(a);
    const tB = nameTokens(b);
    if (!tA.length || !tB.length) return false;
    const shorter = tA.length < tB.length ? tA : tB;
    const longer = tA.length < tB.length ? tB : tA;
    let matches = 0;
    for (const s of shorter) {
      if (longer.some(l => l === s || (s.length >= 4 && l.length >= 4 && (l.startsWith(s) || s.startsWith(l))))) {
        matches++;
      }
    }
    return matches === shorter.length && (shorter.length >= 2 || longer.length === 1);
  }

  function shiftState(shift, todayIso) {
    todayIso = todayIso || todayKey();
    const isStale = (!shift.clockOut && shift.date !== todayIso);
    const now = nowMinutes();
    let { clockIn, breakStart, breakReturn, clockOut } = shift;

    if (breakReturn != null && breakReturn < clockIn) breakReturn += 1440;
    if (breakStart != null && breakStart < clockIn && breakReturn != null && breakReturn >= 1440) breakStart += 1440;
    if (clockOut != null && clockOut < clockIn) clockOut += 1440;

    let endMin = clockOut != null ? clockOut : (isStale ? Math.max(breakReturn || 0, breakStart || 0, clockIn || 0) : now);
    if (endMin < clockIn) endMin += 1440; 

    let pre = 0, post = 0, continuousMinutes = 0, elapsedBreakMinutes = 0;
    let status = 'ok', statusLabel = 'En poste';

    if (clockIn == null) {
      return { ...shift, workedMinutes: 0, continuousMinutes: 0, elapsedBreakMinutes: 0, status: 'notpunched', statusLabel: 'Non pointé' };
    }

    if (clockOut != null || isStale) {
      pre = (breakStart != null) ? (breakStart - clockIn) : (endMin - clockIn);
      post = (breakReturn != null) ? (endMin - breakReturn) : 0;
      return { ...shift, workedMinutes: Math.max(0, pre + post), continuousMinutes: 0, elapsedBreakMinutes: 0, status: 'done', statusLabel: isStale ? 'Sortie non pointée' : 'Journée terminée' };
    }

    if (breakStart != null && breakReturn == null) {
      pre = breakStart - clockIn;
      elapsedBreakMinutes = now - breakStart;
      if (elapsedBreakMinutes < 0) elapsedBreakMinutes += 1440;
      if (elapsedBreakMinutes > BREAK_MIN) {
        status = 'breakover'; statusLabel = 'Pause dépassée';
      } else {
        status = 'break'; statusLabel = 'En pause';
      }
      return { ...shift, workedMinutes: pre, continuousMinutes: pre, elapsedBreakMinutes, status, statusLabel };
    }

    pre = (breakStart != null) ? (breakStart - clockIn) : (now - clockIn);
    post = (breakReturn != null) ? (now - breakReturn) : 0;
    if (pre < 0) pre += 1440;
    if (post < 0) post += 1440;
    
    continuousMinutes = (breakReturn != null) ? (now - breakReturn) : (now - clockIn);
    if (continuousMinutes < 0) continuousMinutes += 1440;

    if (continuousMinutes >= CRIT_MIN) {
      status = 'crit'; statusLabel = 'Limite 4h50 atteinte';
    } else if (continuousMinutes >= WARN_MIN) {
      status = 'warn'; statusLabel = 'Limite bientôt atteinte';
    } else {
      statusLabel = breakReturn != null ? 'En poste (post-pause)' : 'En poste';
    }

    return { ...shift, workedMinutes: pre + post, continuousMinutes, elapsedBreakMinutes, status, statusLabel };
  }

  return { SEGMENT_MIN, BREAK_MIN, WARN_MIN, CRIT_MIN, FULL_NOBREAK_MIN, nowMinutes, minToHM, hmToMin, fmtHrs, todayKey, nameTokens, sameName, shiftState };
})();